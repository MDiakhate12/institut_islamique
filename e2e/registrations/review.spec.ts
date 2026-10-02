import type { Browser } from '@playwright/test'
import { test, expect, type Page } from '../support/fixtures'
import { storageStatePath } from '../support/users'
import { field } from '../support/registration-form'

// L'admin approuve ou rejette une inscription ; la famille voit le statut dans son sélecteur
// d'inscription et reçoit une notification (et un e-mail, désactivé en E2E).
// Inscriptions faites par le compte « family » (nouvel élève, lié automatiquement à ce parent).

async function openAs(browser: Browser, role: 'admin' | 'family', errors: Error[]) {
  const page = await browser.newPage({ storageState: storageStatePath(role) })
  page.on('pageerror', e => errors.push(new Error(`${page.url()} : ${e.message.slice(0, 40)}`)))
  return page
}

/** Inscrit un nouvel enfant depuis le portail parent ; renvoie son nom affiché (« Prénom NOM »). */
async function registerChild(family: Page, firstName: string): Promise<string> {
  await family.goto('/parent-portal/enrollment/new')
  await field(family, "Prénom de l'étudiant").fill(firstName)
  await field(family, "Nom de famille de l'étudiant").fill('revue')
  await field(family, 'Date de naissance').fill('2017-05-04')
  await family.getByRole('button', { name: 'Masculin' }).click()
  await field(family, 'Nom du père ou du tuteur').fill('Famille E2E')
  await field(family, 'Nom de la mère ou du tuteur').fill('Maman E2E')
  await field(family, 'Téléphone principal').fill('0699887766')
  await field(family, 'Niveau scolaire actuel').selectOption('CM1')
  await family.getByRole('button', { name: 'Annuellement' }).click()
  await family.getByRole('checkbox', { name: /J'ai lu et accepte les politiques/ }).check()
  await family.getByRole('checkbox', { name: /J'ai lu et j'accepte le règlement intérieur/ }).check()
  await family.getByRole('button', { name: "Soumettre l'inscription" }).click()
  await expect(family).toHaveURL('/parent-portal/enrollment/success')
  return `${firstName} REVUE`
}

/** Ouvre le panneau de détail de l'inscription d'un élève dans la liste admin. */
async function openRegistration(admin: Page, studentName: string) {
  await admin.goto('/admin-portal/registrations')
  const row = admin.getByRole('row').filter({ hasText: studentName })
  await expect(row).toContainText('En attente')
  await row.click()
  return { row, panel: admin.locator('section').filter({ hasText: 'Décision' }) }
}

const childCard = (page: Page, name: string) =>
  page.locator('div.rounded-xl, a.rounded-xl').filter({ hasText: name }).last()

test('inscription approuvée : la famille la voit « Inscrit » et est notifiée', async ({ browser }) => {
  const errors: Error[] = []
  const [admin, family] = await Promise.all([openAs(browser, 'admin', errors), openAs(browser, 'family', errors)])
  const name = await registerChild(family, `Approuve${Date.now()}`)

  await family.goto('/parent-portal/enrollment')
  await expect(childCard(family, name)).toContainText('En attente de validation')

  const { row, panel } = await openRegistration(admin, name)
  await panel.getByRole('button', { name: 'Approuver' }).click()
  await expect(admin.getByText('Inscription approuvée')).toBeVisible()
  await expect(row).toContainText('Approuvée')
  await expect(panel).toContainText(/Approuvée le .* par Admin E2E/)
  await expect(panel.getByRole('button', { name: 'Approuver' })).toHaveCount(0)

  await family.reload()
  await expect(childCard(family, name)).toContainText('Inscrit')
  await expect(childCard(family, name)).not.toContainText('En attente')
  await family.getByRole('button', { name: 'Notifications' }).click()
  await expect(family.getByText(`Inscription acceptée — ${name}`)).toBeVisible()

  expect(errors).toEqual([])
  await Promise.all([admin.close(), family.close()])
})

test('inscription rejetée avec motif : statut, motif et notification', async ({ browser }) => {
  const errors: Error[] = []
  const [admin, family] = await Promise.all([openAs(browser, 'admin', errors), openAs(browser, 'family', errors)])
  const name = await registerChild(family, `Refuse${Date.now()}`)
  const reason = 'Classe complète pour cette année'

  const { row, panel } = await openRegistration(admin, name)
  await panel.getByRole('button', { name: 'Rejeter' }).click()
  const dialog = admin.getByRole('dialog', { name: "Rejeter l'inscription" })
  await dialog.getByPlaceholder('Motif du refus (facultatif)').fill(reason)
  await dialog.getByRole('button', { name: "Rejeter l'inscription" }).click()
  await expect(admin.getByText('Inscription rejetée')).toBeVisible()
  await expect(dialog).toBeHidden()
  await expect(row).toContainText('Rejetée')
  await expect(panel).toContainText(`Motif : ${reason}`)

  await family.goto('/parent-portal/enrollment')
  await expect(childCard(family, name)).toContainText('Inscription refusée')
  await family.getByRole('button', { name: 'Notifications' }).click()
  await expect(family.getByText(`Inscription refusée — ${name}`)).toBeVisible()
  await expect(family.getByText(`Motif : ${reason}`)).toBeVisible()

  expect(errors).toEqual([])
  await Promise.all([admin.close(), family.close()])
})
