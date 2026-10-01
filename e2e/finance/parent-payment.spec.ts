import { test, expect } from '../support/fixtures'
import { storageStatePath } from '../support/users'

// §7.13 — un parent déclare un paiement (source='parent', status='pending'),
// l'admin le vérifie depuis Budget, le parent le voit alors « Payé ».
// Régression couverte : la liste Budget vide sans erreur dès qu'un paiement parent existe (bug ANY(array)).

test('paiement déclaré par le parent puis vérifié par l\'admin', async ({ browser }) => {
  const parent = await browser.newPage({ storageState: storageStatePath('parent') })
  const admin = await browser.newPage({ storageState: storageStatePath('admin') })
  // Pages créées à la main → la fixture auto `pageErrors` ne les voit pas, on écoute nous-mêmes
  const pageErrors: Error[] = []
  for (const p of [parent, admin]) p.on('pageerror', e => pageErrors.push(e))

  // 1. Parent : le trimestre 1 est impayé, il le déclare
  await parent.goto('/parent-portal/payments')
  const t1 = parent.getByText('Trimestre 1').locator('..')
  await expect(t1).toContainText('Non payé')

  await parent.getByRole('button', { name: 'Marquer comme payé' }).click()
  const dialog = parent.getByRole('dialog', { name: 'Marquer comme payé' })
  await dialog.getByRole('button', { name: 'Sélectionner les élèves...' }).click()
  await parent.getByRole('button', { name: 'Yassine TESTEUR' }).click()
  await parent.keyboard.press('Escape') // ferme le popover de sélection, pas le dialog
  await dialog.getByPlaceholder('Entrer le montant').fill('87.50')
  await dialog.getByRole('button', { name: 'Marquer comme payé' }).click()

  await expect(dialog).toBeHidden()
  await expect(t1).toContainText('En attente de vérification')

  // 2. Admin : la déclaration apparaît en attente dans Budget, il la vérifie
  await admin.goto('/admin-portal/finance/budget')
  const row = admin.getByRole('row').filter({ hasText: 'Yassine TESTEUR' }).filter({ hasText: '87,50' })
  await expect(row).toContainText('Réclamation parent')
  await row.getByTitle('Vérifier le paiement').click()

  await expect(admin.getByText('Paiement vérifié')).toBeVisible()
  await expect(row).toContainText('Vérifié')
  await expect(row).not.toContainText('Réclamation parent')

  // 3. Parent : le trimestre 1 est désormais payé
  await parent.reload()
  await expect(t1).toContainText('Payé')
  await expect(t1).not.toContainText('Non payé')

  expect(pageErrors).toEqual([])
  await parent.close()
  await admin.close()
})
