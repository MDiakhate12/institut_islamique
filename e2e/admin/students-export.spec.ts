import * as XLSX from 'xlsx'
import { test, expect } from '../support/fixtures'
import { storageStatePath } from '../support/users'

// Export Excel d'Élèves (§8) : toutes les colonnes (affichées ou non) et seulement les lignes
// filtrées à l'écran. Le fichier est téléchargé puis relu avec la bibliothèque `xlsx` de l'appli.

test.use({ storageState: storageStatePath('admin') })

test('export Excel : toutes les colonnes, seulement les élèves filtrés', async ({ page }) => {
  await page.goto('/admin-portal/students')
  await page.getByPlaceholder(/Rechercher des élèves/).fill('TESTEUR')
  await expect(page.getByRole('row').filter({ hasText: 'Yassine' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Sami' })).toHaveCount(0)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Télécharger en Excel' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^eleves-\d{4}-\d{2}-\d{2}\.xlsx$/)

  const workbook = XLSX.readFile(await download.path())
  expect(workbook.SheetNames).toEqual(['Élèves'])
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(workbook.Sheets['Élèves'])

  // Une seule ligne : la liste filtrée, pas toute l'école
  expect(rows).toHaveLength(1)
  expect(rows[0]['Nom']).toBe('TESTEUR')
  expect(rows[0]['Prénom']).toBe('Yassine')
  expect(rows[0]['Classe(s)']).toContain('Classe Coran E2E')
  expect(rows[0]['Statut']).toBe('Actif')

  // Colonnes absentes du tableau par défaut : tuteurs, paiements, présences
  for (const column of [
    'Nom du père', 'Tél. du père', 'Email du père', 'Nom de la mère', 'Autres tuteurs',
    'Paiement T1', 'Paiement T2', 'Paiement T3', 'Présences', 'Retards', 'Absences', 'Absences excusées',
    "Date d'inscription", 'Notes',
  ]) {
    expect(Object.keys(rows[0]), `colonne « ${column} »`).toContain(column)
  }
  expect(rows[0]['Email du père']).toBe('parent@e2e.qaf.test')
})
