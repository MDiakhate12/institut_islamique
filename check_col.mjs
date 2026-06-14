import postgres from 'postgres'
const sql = postgres('postgresql://postgres:2qZWrDUaQrHYzZRL@db.nlsltdzoqustykrldaxh.supabase.co:5432/postgres', { ssl: 'require' })
const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'classes' ORDER BY ordinal_position`
console.log('Classes columns:', cols.map(c => c.column_name).join(', '))
await sql.end()
