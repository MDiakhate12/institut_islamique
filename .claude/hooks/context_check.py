"""Claude Code PostToolUse hook: check a context file right after it's written.

Standalone (no pytest, no external deps) so it works the same on any OS.
Adapted for institut_islamique, which treats CLAUDE.md (not AGENTS.md) as the
canonical instruction file. Runs four checks against the file that was just
written/edited:

  1. Strict UTF-8 (catches a stray cp1252 dash etc.)
  2. Every markdown link / backtick path it cites actually resolves
  3. .claude/rules/*.md: uses `paths:` not `applyTo:`; the always-on safety
     rules (shared-remote-db.md, secrets-handling.md) never get a paths: scope
  4. A secret scan: DB connection strings with embedded passwords, common
     API-key/token prefixes (sbp_, ghp_, gho_, sk-, AKIA...), bearer tokens,
     hardcoded password/secret assignments

Exit 0 = silent pass. Exit 2 + stderr = shown to the agent as feedback it
must act on before continuing (Claude Code PostToolUse convention).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

CONTEXT_FILE = re.compile(
    r"(AGENTS\.md|CLAUDE\.md)$|[/\\]\.claude[/\\]|[/\\]docs[/\\]"
)

ALWAYS_ON_RULES = {"shared-remote-db.md", "secrets-handling.md"}

LINK = re.compile(r"\[[^\]]*\]\(\s*([^)\s<>]+?)\s*\)")
BACKTICK_PATH = re.compile(
    r"`((?:\.{1,2}/)*(?:\.claude|docs|src|_tests)/[A-Za-z0-9_./-]+)`"
)
SKIP = ("http://", "https://", "mailto:", "#")

SECRET_PATTERNS = [
    (re.compile(r"postgres(?:ql)?://[^:\s]+:[^@\s]+@"), "a DB connection string with an embedded password"),
    (re.compile(r"\b(sbp_|ghp_|gho_|sk-[A-Za-z0-9]|AKIA[0-9A-Z]{16})[A-Za-z0-9_\-]{10,}"), "a live-looking API key/token"),
    (re.compile(r"\bBearer\s+[A-Za-z0-9._\-]{20,}"), "a bearer token"),
    (re.compile(r"\b(password|secret|api[_-]?key)\s*[:=]\s*['\"][^'\"]{6,}['\"]", re.I), "a hardcoded credential"),
]


def check(path: Path) -> list[str]:
    problems = []
    try:
        raw = path.read_bytes()
        text = raw.decode("utf-8")
    except UnicodeDecodeError as e:
        return [f"{path.name}: not valid UTF-8 ({e})"]
    except FileNotFoundError:
        return []

    for pattern, label in SECRET_PATTERNS:
        if pattern.search(text):
            problems.append(
                f"{path.name}: looks like it contains {label}. "
                "Never hardcode credentials in a tracked file -- reference the "
                "env var name instead (see .claude/rules/secrets-handling.md)."
            )

    refs = LINK.findall(text) + BACKTICK_PATH.findall(text)
    for ref in refs:
        if ref.startswith(SKIP) or "<" in ref or ">" in ref:
            continue
        target = ref.split("#")[0]
        if not target:
            continue
        candidates = [path.parent / target, ROOT / target]
        if not any(c.exists() for c in candidates):
            problems.append(f"{path.name}: cites a path that doesn't exist -> {ref}")

    if path.parent.name == "rules" and path.parent.parent.name == ".claude":
        if "applyTo:" in text:
            problems.append(f"{path.name}: use `paths:` in frontmatter, not `applyTo:`.")
        has_scope = text.startswith("---") and "paths:" in text.split("---", 2)[1]
        if path.name in ALWAYS_ON_RULES and has_scope:
            problems.append(f"{path.name}: this is a safety rule, it must stay always-on (no paths: scope).")

    return problems


def main() -> int:
    try:
        event = json.load(sys.stdin)
    except Exception:
        return 0

    file_path = str(event.get("tool_input", {}).get("file_path", ""))
    if not file_path or not CONTEXT_FILE.search(file_path):
        return 0

    p = Path(file_path)
    if not p.is_absolute():
        p = ROOT / p

    problems = check(p)
    if problems:
        try:
            rel = p.relative_to(ROOT)
        except ValueError:
            rel = p
        sys.stderr.write(
            "agent context checks failed after writing "
            + str(rel) + "\n- " + "\n- ".join(problems) + "\n"
        )
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
