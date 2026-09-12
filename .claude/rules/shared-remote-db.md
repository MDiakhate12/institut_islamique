This project has no local database — `DATABASE_URL` in `.env.local` points directly
at the team's shared Supabase Postgres instance (used for both development and
production data). There is no dev/prod split.

Never run a destructive or bulk query (DELETE, TRUNCATE, UPDATE without a WHERE,
a migration that drops or renames a column) against it without stating exactly
what will change and getting explicit confirmation first. Prefer `npm run
db:studio` to inspect data before writing a mutating query. If a task seems to
need a scratch database, stop and ask — don't spin one up silently.
