import { defineConfig, devices } from '@playwright/test'
import { loadE2EEnv } from './e2e/support/env'

// Charge .env.test et vérifie que tout pointe sur Supabase local AVANT de lancer quoi que ce soit.
const env = loadE2EEnv()

const PORT = 3100
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Plafonné : au-delà, l'auth Supabase locale sature et des sessions sautent (redirect login)
  workers: process.env.CI ? 2 : 4,
  // 5 s par défaut : trop juste quand plusieurs workers chargent en même temps le serveur
  // Next et le Supabase local (Server Actions qui dépassent 5 s → faux échecs)
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      dependencies: ['setup'],
      // Le mobile ne rejoue que les tests marqués @mobile (layout responsive, §7.18)
      grep: /@mobile/,
    },
  ],
  webServer: {
    // Build de prod dans un distDir séparé : ne touche pas au .next du `npm run dev`
    command: `npm run build && npx next start --port ${PORT}`,
    url: `${baseURL}/auth/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    // Les variables passées ici priment sur .env.local (Next ne les écrase pas)
    env: {
      ...(env as Record<string, string>),
      NEXT_DIST_DIR: '.next-e2e',
      // Serveur en UTC comme Vercel (et la CI), navigateur en Europe/Paris : les écarts
      // de rendu date/heure serveur ↔ client (erreurs d'hydratation) sortent aussi en local.
      TZ: 'UTC',
    },
  },
})
