import { execFileSync } from 'node:child_process'

// Remet l'école E2E dans son état initial avant chaque run : les tests qui écrivent
// (paiements, inscriptions…) partent toujours de la même base, run après run.
// Le seed appelle loadE2EEnv() → refuse de tourner hors Supabase local.
export default function globalSetup() {
  execFileSync('npx', ['tsx', 'e2e/seed.ts'], { stdio: 'inherit' })
}
