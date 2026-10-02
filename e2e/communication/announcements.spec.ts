import { test, expect, type Page } from '../support/fixtures'
import { storageStatePath } from '../support/users'

// L'admin publie une annonce par public cible ; chaque portail ne voit que les siennes
// (Tous → parents + enseignants, Parents → parents, Personnel → enseignants). Puis suppression.

test('annonces : chaque portail ne voit que son public cible', async ({ browser }) => {
  const admin = await browser.newPage({ storageState: storageStatePath('admin') })
  const teacher = await browser.newPage({ storageState: storageStatePath('teacher') })
  const parent = await browser.newPage({ storageState: storageStatePath('parent') })
  // Pages créées à la main → la fixture auto `pageErrors` ne les voit pas, on écoute nous-mêmes
  const pageErrors: Error[] = []
  for (const p of [admin, teacher, parent]) p.on('pageerror', e => pageErrors.push(new Error(`${p.url()} : ${e.message.slice(0, 40)}`)))

  // Titres uniques : un retry ne doit pas retrouver les annonces d'une tentative précédente
  const run = Date.now()
  const titles = {
    Tous: `Fête de fin d'année ${run}`,
    Parents: `Réunion parents ${run}`,
    Personnel: `Conseil pédagogique ${run}`,
  }

  // 1. Admin : titre et contenu sont obligatoires, puis une annonce par public
  await admin.goto('/admin-portal/announcements')
  const form = admin.locator('form').filter({ has: admin.getByPlaceholder('ex. : Mise à jour importante') })

  await admin.getByRole('button', { name: 'Créer une annonce' }).click()
  await form.getByRole('button', { name: "Envoyer l'annonce" }).click()
  await expect(admin.getByText('Veuillez remplir tous les champs obligatoires')).toBeVisible()
  await form.getByRole('button', { name: 'Annuler', exact: true }).last().click() // .last() : l'éditeur a aussi un « Annuler » (undo)

  for (const [audience, title] of Object.entries(titles)) {
    await admin.getByRole('button', { name: 'Créer une annonce' }).click()
    await form.getByPlaceholder('ex. : Mise à jour importante').fill(title)
    await form.locator('[contenteditable]').fill(`Message pour le public « ${audience} ».`)
    await form.getByRole('button', { name: audience, exact: true }).click()
    await form.getByRole('button', { name: "Envoyer l'annonce" }).click()
    await expect(form).toBeHidden()
    await expect(card(admin, title)).toBeVisible()
  }

  // 2. Enseignant : Tous + Personnel, jamais Parents
  await teacher.goto('/teacher-portal/announcements')
  await expect(card(teacher, titles.Tous)).toBeVisible()
  await expect(card(teacher, titles.Personnel)).toContainText('Message pour le public « Personnel ».')
  await expect(card(teacher, titles.Parents)).toHaveCount(0)

  // 3. Parent : Tous + Parents, jamais Personnel
  await parent.goto('/parent-portal/announcements')
  await expect(card(parent, titles.Tous)).toBeVisible()
  await expect(card(parent, titles.Parents)).toBeVisible()
  await expect(card(parent, titles.Personnel)).toHaveCount(0)

  // 4. Admin supprime l'annonce « Tous » → elle disparaît aussi chez le parent
  await card(admin, titles.Tous).getByRole('button').last().click() // icône corbeille (sans libellé)
  await admin.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(admin.getByText('Annonce supprimée')).toBeVisible()
  await expect(card(admin, titles.Tous)).toHaveCount(0)

  await parent.reload()
  await expect(card(parent, titles.Parents)).toBeVisible()
  await expect(card(parent, titles.Tous)).toHaveCount(0)

  expect(pageErrors).toEqual([])
  await Promise.all([admin.close(), teacher.close(), parent.close()])
})

/** Carte d'annonce du fil (AnnouncementFeed) par son titre. */
function card(page: Page, title: string) {
  return page.locator('div.rounded-xl').filter({ has: page.getByRole('heading', { name: title }) })
}
