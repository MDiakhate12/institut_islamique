import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Charge `.env.test` (généré par `npm run e2e:env`) et refuse de continuer si
 * la base ou l'API Supabase ne sont pas locales.
 *
 * La base partagée (`.env.local`) sert aussi à la prod — voir
 * `.claude/rules/shared-remote-db.md`. Aucun test E2E ne doit jamais la toucher.
 */
export function loadE2EEnv(): NodeJS.ProcessEnv {
  const path = resolve(process.cwd(), '.env.test')
  if (!existsSync(path)) {
    throw new Error('.env.test introuvable — lancer `npm run e2e:db:start` puis `npm run e2e:env`.')
  }
  // override: true → les valeurs de .env.test priment sur un éventuel export shell
  config({ path, override: true, quiet: true })
  assertLocal('DATABASE_URL', process.env.DATABASE_URL)
  assertLocal('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
  return process.env
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

function assertLocal(name: string, value: string | undefined) {
  if (!value) throw new Error(`${name} manquant dans .env.test`)
  const host = new URL(value).hostname
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`${name} pointe vers « ${host} » — les tests E2E ne tournent que sur Supabase local.`)
  }
}
