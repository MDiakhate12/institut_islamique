/**
 * Génère `.env.test` à partir de l'instance Supabase locale (`supabase status`).
 * Le fichier est gitignoré (`.env*`) — aucune clé n'est jamais commitée.
 *
 * Usage : npm run e2e:env   (après npm run e2e:db:start)
 */
import { execSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const raw = execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
const status = Object.fromEntries(
  raw.split('\n')
    .map(line => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map(m => [m[1], m[2]]),
)

for (const key of ['API_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY', 'DB_URL']) {
  if (!status[key]) throw new Error(`supabase status n'a pas renvoyé ${key} — la stack locale est-elle démarrée ?`)
}

// Conserve le mot de passe des comptes de test s'il existe déjà (sessions .auth/ réutilisables)
const previous = existsSync('.env.test') ? readFileSync('.env.test', 'utf8') : ''
const password = previous.match(/^E2E_PASSWORD=(.+)$/m)?.[1] ?? `E2e-${randomBytes(12).toString('base64url')}`

writeFileSync('.env.test', `# Généré par e2e/scripts/write-env.mjs — Supabase LOCAL uniquement, ne pas committer
NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}
DATABASE_URL=${status.DB_URL}
E2E_PASSWORD=${password}

# Vidés volontairement : sans eux, Next chargerait les valeurs réelles de .env.local
# et les tests enverraient de vrais e-mails.
SMTP_USER=
SMTP_PASSWORD=
RESEND_API_KEY=
SUPER_ADMIN_EMAILS=
`)

console.log('✅ .env.test écrit (Supabase local :', status.API_URL + ')')
