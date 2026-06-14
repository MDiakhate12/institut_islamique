import postgres from 'postgres'
const sql = postgres('postgresql://postgres:2qZWrDUaQrHYzZRL@db.nlsltdzoqustykrldaxh.supabase.co:5432/postgres', { ssl: 'require' })

// 1. Extend event type enum to include all types shown in the UI
// PostgreSQL requires ALTER TYPE to add values
const existingEnumValues = await sql`
  SELECT enumlabel FROM pg_enum
  JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
  WHERE pg_type.typname = 'academic_event_type'
  ORDER BY enumsortorder
`
console.log('Current enum values:', existingEnumValues.map(r => r.enumlabel).join(', '))

// Add missing enum values (safe to add even if they exist in newer PG)
const newValues = ['meeting', 'fun_event', 'open_house', 'ceremony', 'beginning', 'closed', 'lecture']
for (const val of newValues) {
  const exists = existingEnumValues.some(r => r.enumlabel === val)
  if (!exists) {
    await sql.unsafe(`ALTER TYPE academic_event_type ADD VALUE IF NOT EXISTS '${val}'`)
    console.log(`Added enum value: ${val}`)
  }
}

// 2. Add new columns to academic_events
await sql`ALTER TABLE "academic_events" ADD COLUMN IF NOT EXISTS "start_time" text`
await sql`ALTER TABLE "academic_events" ADD COLUMN IF NOT EXISTS "end_time" text`
await sql`ALTER TABLE "academic_events" ADD COLUMN IF NOT EXISTS "location" text`
await sql`ALTER TABLE "academic_events" ADD COLUMN IF NOT EXISTS "is_hidden" boolean NOT NULL DEFAULT false`

// 3. Verify
const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'academic_events' ORDER BY ordinal_position`
console.log('academic_events columns:', cols.map(c => c.column_name).join(', '))

await sql.end()
console.log('Migration complete!')
