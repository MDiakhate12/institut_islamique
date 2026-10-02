import { test, expect } from '../support/fixtures'
import { storageStatePath, E2E_USERS } from '../support/users'

// L'enseignant fait l'appel de sa classe → l'admin voit la classe « Soumis » → le parent voit le statut
// de son enfant dans sa chronologie. La classe est déjà épinglée par le seed.

const CLASS_NAME = 'Classe Coran E2E'
const STUDENT = 'Yassine TESTEUR'

test('présence saisie par l\'enseignant, visible par l\'admin et le parent', async ({ browser }) => {
  const teacher = await browser.newPage({ storageState: storageStatePath('teacher') })
  const admin = await browser.newPage({ storageState: storageStatePath('admin') })
  const parent = await browser.newPage({ storageState: storageStatePath('parent') })
  // Pages créées à la main → la fixture auto `pageErrors` ne les voit pas, on écoute nous-mêmes
  const pageErrors: Error[] = []
  for (const p of [teacher, admin, parent]) p.on('pageerror', e => pageErrors.push(new Error(`${p.url()} : ${e.message.slice(0, 40)}`)))

  // 1. Enseignant : marque l'élève « En retard » et soumet
  await teacher.goto('/teacher-portal/attendance')
  const studentRow = teacher.locator('div.px-6.py-4').filter({ hasText: STUDENT })
  await studentRow.getByRole('button', { name: 'En retard' }).click()
  await teacher.getByRole('button', { name: 'Soumettre la présence' }).click()

  const confirm = teacher.getByRole('dialog', { name: 'Soumettre la présence' })
  await expect(confirm).toContainText('1 étudiant')
  await confirm.getByRole('button', { name: 'Soumettre', exact: true }).click()

  await expect(teacher.getByText(/Présence soumise avec succès : 0 présent, 1 en retard, 0 absent/)).toBeVisible()
  await expect(confirm).toBeHidden()
  await expect(teacher.getByText('Présence déjà enregistrée pour aujourd\'hui')).toBeVisible()

  // Persisté : après rechargement, le statut est relu depuis la base
  await teacher.reload()
  await expect(teacher.getByRole('button', { name: 'Modifier la présence' })).toBeVisible()

  // 2. Admin : la classe n'est plus « Manquant » pour aujourd'hui
  await admin.goto('/admin-portal/attendance')
  const classCard = admin.getByRole('button').filter({ hasText: CLASS_NAME })
  await expect(classCard).toContainText('Soumis')
  await expect(classCard).not.toContainText('Manquant')

  // 3. Parent : la chronologie de son enfant affiche le statut et l'auteur de la saisie
  await parent.goto('/parent-portal/attendance')
  const entry = parent.locator('div.rounded-xl')
    .filter({ hasText: CLASS_NAME })
    .filter({ hasText: `par ${E2E_USERS.teacher.fullName}` })
  await expect(entry).toHaveCount(1)
  await expect(entry).toContainText('En retard')

  expect(pageErrors).toEqual([])
  await Promise.all([teacher.close(), admin.close(), parent.close()])
})
