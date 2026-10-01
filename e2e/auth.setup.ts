import { test as setup, expect } from '@playwright/test'
import { E2E_ROLES, E2E_USERS, storageStatePath } from './support/users'

// Une connexion réelle par rôle via le formulaire de login, sauvegardée dans e2e/.auth/<role>.json.
// Les autres tests démarrent directement connectés avec test.use({ storageState }).
const HOME = {
  admin: '/admin-portal',
  treasurer: '/admin-portal',
  manager: '/admin-portal',
  teacher: '/teacher-portal',
  parent: '/parent-portal',
} as const

for (const role of E2E_ROLES) {
  setup(`connexion ${role}`, async ({ page }) => {
    await page.goto('/auth/login')
    // getByLabel ne marche pas : FormControl (components/ui/form.tsx) pose l'id sur un <div>
    // wrapper, pas sur l'<input> — le <label htmlFor> ne cible donc aucun champ.
    await page.getByPlaceholder('votre@email.com').fill(E2E_USERS[role].email)
    await page.locator('input[name="password"]').fill(process.env.E2E_PASSWORD!)
    await page.getByRole('button', { name: 'Se connecter' }).click()

    await expect(page).toHaveURL(new RegExp(`${HOME[role]}(/|$|\\?)`))
    await page.context().storageState({ path: storageStatePath(role) })
  })
}
