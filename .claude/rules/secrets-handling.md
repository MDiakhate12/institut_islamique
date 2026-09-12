Credentials (DB passwords, API keys, service-role keys, MCP bearer tokens) must
never be hardcoded in any tracked file — not in CLAUDE.md, AGENTS.md, docs/,
code comments, or committed JSON. Reference them by env var name only
(e.g. `process.env.DATABASE_URL`), never paste the value.

`.mcp.json` and `.claude/settings.local.json` hold live secrets for this
project and are gitignored — never re-add them to git, and never paste their
contents into a markdown file. If a secret is ever found in tracked history,
flag it and suggest rotating it; do not attempt to rewrite git history without
explicit approval.
