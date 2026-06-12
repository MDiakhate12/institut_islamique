import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

// Singleton pattern — évite de recréer la connexion sur chaque Server Action en dev
const globalForDb = globalThis as unknown as { _pgClient: ReturnType<typeof postgres> | undefined }

const client = globalForDb._pgClient ?? postgres(connectionString)
if (process.env.NODE_ENV !== 'production') globalForDb._pgClient = client

export const db = drizzle(client, { schema })
