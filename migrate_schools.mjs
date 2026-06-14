import postgres from 'postgres'
const sql = postgres('postgresql://postgres:2qZWrDUaQrHYzZRL@db.nlsltdzoqustykrldaxh.supabase.co:5432/postgres', { ssl: 'require' })

// Add new columns to schools table
await sql`ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "contact_email" text`
await sql`ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "phone" text`
await sql`ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "address" text`
await sql`ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "website" text`
await sql`ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "facebook" text`
await sql`ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "instagram" text`
await sql`ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "default_language" text DEFAULT 'fr'`
await sql`ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "timezone" text DEFAULT 'UTC'`

// Verify
const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'schools' ORDER BY ordinal_position`
console.log('Schools columns:', cols.map(c => c.column_name).join(', '))

await sql.end()
console.log('Migration complete!')
