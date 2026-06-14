import postgres from 'postgres'
const sql = postgres('postgresql://postgres:2qZWrDUaQrHYzZRL@db.nlsltdzoqustykrldaxh.supabase.co:5432/postgres', { ssl: 'require' })
const schools = await sql`SELECT id, name, slug, settings, contact_email, phone, address, website, facebook, instagram, default_language, timezone FROM schools LIMIT 5`
console.log(JSON.stringify(schools, null, 2))
await sql.end()
