import { test, expect } from '../support/fixtures'
import { storageStatePath } from '../support/users'

// L'enseignant crée un devoir Hifz pour sa classe → le parent le voit dans « Devoirs ».
// La classe est déjà épinglée par le seed.

test('devoir créé par l\'enseignant, visible par le parent', async ({ browser }) => {
  const teacher = await browser.newPage({ storageState: storageStatePath('teacher') })
  const parent = await browser.newPage({ storageState: storageStatePath('parent') })
  // Pages créées à la main → la fixture auto `pageErrors` ne les voit pas, on écoute nous-mêmes
  const pageErrors: Error[] = []
  for (const p of [teacher, parent]) p.on('pageerror', e => pageErrors.push(new Error(`${p.url()} : ${e.message.slice(0, 40)}`)))

  // Note unique : un retry ne doit pas confondre ce devoir avec celui d'une tentative précédente
  const note = `Réciter 3 fois avant la classe (E2E ${Date.now()})`

  // 1. Enseignant : un devoir sans Hifz ni Révision est refusé, puis un devoir Hifz complet est créé
  await teacher.goto('/teacher-portal/homework')
  await teacher.getByRole('button', { name: 'Ajouter un devoir' }).first().click()
  const sheet = teacher.getByRole('dialog').filter({ hasText: 'Notes supplémentaires' })
  const submit = sheet.getByRole('button', { name: 'Ajouter un devoir' })

  await submit.click()
  await expect(teacher.getByText('Activez au moins un type de devoir (Hifz ou Révision)')).toBeVisible()
  await expect(sheet).toBeVisible()

  // Le toggle Hifz n'a pas de nom accessible : c'est le seul bouton de la ligne « Hifz »
  const hifzRow = sheet.locator('div')
    .filter({ has: teacher.getByText('Hifz', { exact: true }) })
    .filter({ has: teacher.getByRole('button') })
    .last()
  await hifzRow.getByRole('button').click()
  await sheet.getByRole('combobox').click()
  await teacher.getByRole('option', { name: /^Al-Ikhlas/ }).click()
  await sheet.getByPlaceholder('Toute instruction ou note supplémentaire...').fill(note)
  await submit.click()

  await expect(teacher.getByText('Devoir ajouté')).toBeVisible()
  await expect(sheet).toBeHidden()
  await expect(teacher.getByText(note)).toBeVisible()

  // 2. Parent : le devoir apparaît pour son enfant, avec la sourate et la note
  await parent.goto('/parent-portal/homework')
  const card = parent.locator('div.rounded-2xl').filter({ hasText: note })
  await expect(card).toHaveCount(1)
  await expect(card).toContainText('Classe Coran E2E')
  await expect(card).toContainText('Al-Ikhlas - الإخلاص')
  await expect(card).toContainText('Sourate complète')

  expect(pageErrors).toEqual([])
  await Promise.all([teacher.close(), parent.close()])
})
