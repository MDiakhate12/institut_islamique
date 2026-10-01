import { defineConfig } from 'drizzle-kit'
import { loadE2EEnv } from './support/env'

// Même schéma que drizzle.config.ts, mais branché sur le Supabase local de .env.test.
// loadE2EEnv() lève une erreur si DATABASE_URL n'est pas local.
const env = loadE2EEnv()

export default defineConfig({
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: { url: env.DATABASE_URL! },
  strict: false,
})
