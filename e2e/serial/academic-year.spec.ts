import { test, expect } from '../support/fixtures'
import { storageStatePath } from '../support/users'

// Année scolaire (§7.24) : le statut T1/T2/T3 vu par le parent ne lit que l'année en cours. Passer à
// l'année suivante dans les Paramètres remet « Non payé », alors que le paiement reste dans le Budget
// (la liste couvre toutes les années). Projet « serial » : on change l'année de l'école partagée.
// Sami (enfant du compte « family ») au Trimestre 2 : les autres tests ne paient que le T1.

test('paiement du T2 : « Payé » cette année, « Non payé » l\'année suivante, toujours dans le Budget', async ({ browser }) => {
  const family = await browser.newPage({ storageState: storageStatePath('family') })
  const admin = await browser.newPage({ storageState: storageStatePath('admin') })
  const parentName = `Parent Année ${Date.now()}`
  const budgetRow = admin.getByRole('row').filter({ hasText: parentName })
  const yearInput = admin.getByPlaceholder('2025-2026')
  const save = admin.getByRole('button', { name: 'Enregistrer les modifications' })
  const t2 = family.locator('div.bg-white').filter({ hasText: 'Sami ENFANT' }).getByText('Trimestre 2').locator('..')
  let originalYear = ''

  try {
    // 1. Le T2 de Sami est impayé
    await family.goto('/parent-portal/payments')
    await expect(t2).toContainText('Non payé')

    // 2. L'admin enregistre un paiement du T2 pour Sami (vérifié d'office)
    await admin.goto('/admin-portal/finance/budget')
    await admin.getByRole('button', { name: 'Enregistrer un revenu' }).click()
    const create = admin.getByRole('dialog', { name: 'Ajouter un nouveau paiement' })
    await create.getByRole('button', { name: 'Sélectionner des étudiants...' }).click()
    await admin.getByRole('button', { name: 'Sami ENFANT' }).click()
    await admin.keyboard.press('Escape') // ferme le popover de sélection, pas le dialogue
    await create.getByPlaceholder('Nom du parent').fill(parentName)
    await create.locator('input[name="amount"]').fill('76.54')
    await create.getByRole('combobox').filter({ hasText: 'Trimestre 1' }).click()
    await admin.getByRole('option', { name: 'Trimestre 2' }).click()
    await create.getByRole('button', { name: 'Ajouter le paiement' }).click()
    await expect(admin.getByText('Paiement enregistré avec succès !')).toBeVisible()
    await expect(budgetRow).toContainText('76,54')

    // 3. Le parent voit le T2 payé
    await family.reload()
    await expect(t2).toContainText('Payé')
    await expect(t2).not.toContainText('Non payé')

    // 4. L'admin passe à l'année scolaire suivante
    await admin.goto('/admin-portal/school-settings')
    originalYear = await yearInput.inputValue()
    await admin.getByRole('button', { name: '›', exact: true }).click()
    const [start, end] = originalYear.split('-').map(Number)
    const nextYear = `${start + 1}-${end + 1}`
    await expect(yearInput).toHaveValue(nextYear)
    await save.click()
    await expect(admin.getByText('Paramètres sauvegardés')).toBeVisible()

    // 5. Le parent repart de zéro, l'historique reste dans le Budget
    await family.reload()
    await expect(family.getByText(`Année scolaire : ${nextYear}`)).toBeVisible()
    await expect(t2).toContainText('Non payé')
    await admin.goto('/admin-portal/finance/budget')
    await expect(budgetRow).toContainText('76,54')
  } finally {
    // Remet l'année d'origine pour les autres projets
    await admin.goto('/admin-portal/school-settings')
    if (originalYear && (await yearInput.inputValue()) !== originalYear) {
      await yearInput.fill(originalYear)
      await save.click()
      await expect(admin.getByText('Paramètres sauvegardés')).toBeVisible()
    }
    await Promise.all([family.close(), admin.close()])
  }
})
