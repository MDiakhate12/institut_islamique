---
name: app-launcher
description: Start the Next.js dev server and open it in the browser for end-to-end checks, screenshots, console and network inspection. Use whenever a task needs the running app or a browser check.
---
# App launcher

1. Start the app: `npm run dev` from the repo root. Healthy output includes
   `Local: http://localhost:3000` and `Ready in <time>`. If port 3000 is
   busy, stop the previous instance first — never start a second one.
2. Open `http://localhost:3000` in the browser (via a configured
   chrome-devtools MCP server if present, otherwise Claude in Chrome / the
   available browser tool).
3. Report: the URL opened, any console errors (must be none), and a
   screenshot.
4. When done, leave the dev server running unless the user asks otherwise.
