import { test, expect, type Page } from '../support/fixtures'
import { storageStatePath, E2E_SCHOOL } from '../support/users'

// Projet « serial » (playwright.config.ts) : ces tests modifient des réglages de l'école partagée
// (inscriptions ouvertes/fermées…) et tournent seuls, après le projet desktop.
test.describe.configure({ mode: 'serial' })

const SAVED = 'Paramètres sauvegardés'
const regCheckbox = (p: Page) => p.getByRole('checkbox', { name: /Autoriser les nouvelles inscriptions/ })
const save = (p: Page) => p.getByRole('button', { name: 'Enregistrer les modifications' })

test('Paramètres : deux admins n\'écrasent pas les réglages l\'un de l\'autre (§7.14)', async ({ browser }) => {
  const a = await browser.newPage({ storageState: storageStatePath('admin') })
  const b = await browser.newPage({ storageState: storageStatePath('admin') })
  const address = `${Date.now()} rue du Test`
  try {
    // Les deux pages sont ouvertes avec les mêmes valeurs de départ
    await a.goto('/admin-portal/school-settings')
    await b.goto('/admin-portal/school-settings')
    await expect(regCheckbox(a)).toBeChecked()
    await expect(regCheckbox(b)).toBeChecked()

    // A ferme les nouvelles inscriptions et enregistre
    await regCheckbox(a).setChecked(false)
    await save(a).click()
    await expect(a.getByText(SAVED)).toBeVisible()

    // B (page périmée : case encore cochée) ne change que l'adresse
    await b.getByPlaceholder('12 rue des Lilas, 69000 Lyon').fill(address)
    await save(b).click()
    await expect(b.getByText('Informations mises à jour')).toBeVisible()

    // Le réglage de A a survécu, l'adresse de B est bien enregistrée
    await b.reload()
    await expect(regCheckbox(b)).not.toBeChecked()
    await expect(b.getByPlaceholder('12 rue des Lilas, 69000 Lyon')).toHaveValue(address)
  } finally {
    // Remet l'école dans son état initial pour la suite
    await a.goto('/admin-portal/school-settings')
    await regCheckbox(a).setChecked(true)
    await save(a).click()
    await expect(a.getByText(SAVED)).toBeVisible()
    await Promise.all([a.close(), b.close()])
  }
})

test('Inscriptions : fermer puis rouvrir les nouvelles inscriptions depuis la page', async ({ browser }) => {
  const admin = await browser.newPage({ storageState: storageStatePath('admin') })
  const visitor = await browser.newPage()
  const toggle = admin.getByRole('switch', { name: 'Autoriser les nouvelles inscriptions' })
  const closedNotice = visitor.getByRole('heading', { name: 'Inscriptions fermées' })
  const submit = visitor.getByRole('button', { name: "Soumettre l'inscription" })
  try {
    await admin.goto('/admin-portal/registrations')
    await expect(admin.getByText(/Nouvelles inscriptions ouvertes/)).toBeVisible()

    // Fermeture : confirmation, puis le formulaire public affiche l'avis
    await toggle.click()
    await admin.getByRole('button', { name: 'Fermer les inscriptions' }).click()
    await expect(admin.getByText(/Nouvelles inscriptions fermées/)).toBeVisible()
    await visitor.goto(`/portal/register/${E2E_SCHOOL.slug}`)
    await expect(closedNotice).toBeVisible()
    await expect(submit).toHaveCount(0)

    // Le réglage est aussi reflété dans Paramètres de l'école
    await admin.goto('/admin-portal/school-settings')
    await expect(regCheckbox(admin)).not.toBeChecked()

    // Réouverture
    await admin.goto('/admin-portal/registrations')
    await toggle.click()
    await admin.getByRole('button', { name: 'Ouvrir les inscriptions' }).click()
    await expect(admin.getByText(/Nouvelles inscriptions ouvertes/)).toBeVisible()
    await visitor.reload()
    await expect(closedNotice).toHaveCount(0)
    await expect(submit).toBeVisible()
  } finally {
    // Si le test a échoué en cours de route, ne pas laisser l'école fermée
    await admin.goto('/admin-portal/school-settings')
    if (!(await regCheckbox(admin).isChecked())) {
      await regCheckbox(admin).setChecked(true)
      await save(admin).click()
      await expect(admin.getByText(SAVED)).toBeVisible()
    }
    await Promise.all([admin.close(), visitor.close()])
  }
})
