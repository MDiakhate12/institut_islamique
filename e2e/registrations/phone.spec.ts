import { test, expect } from '../support/fixtures'
import { storageStatePath } from '../support/users'
import { fillGuardians, fillNewStudentForm, uniqueSuffix } from '../support/registration-form'

// Numéros de téléphone (§7.26) : un numéro invalide est refusé à la saisie ; un numéro valide saisi
// avec des points est enregistré puis affiché « 06 12 34 56 78 », et la recherche d'Élèves le
// retrouve par ses chiffres bruts.

test('téléphone d\'un tuteur : refusé si invalide, affiché formaté, retrouvé par la recherche', async ({ browser }) => {
  const family = await browser.newPage({ storageState: storageStatePath('family') })
  const admin = await browser.newPage({ storageState: storageStatePath('admin') })
  const first = `Lina${uniqueSuffix()}`
  // 06 + 8 chiffres aléatoires : unique d'un run à l'autre (la recherche ne doit trouver que cet élève)
  const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('')
  const pairs = digits.match(/../g)!
  const typed = `06.${pairs.join('.')}`
  const raw = `06${digits}`
  const national = `06 ${pairs.join(' ')}`

  await family.goto('/parent-portal/enrollment/new')
  await fillNewStudentForm(family, { firstName: first, lastName: 'phone' })

  // Numéro invalide : message sous le champ, rien n'est envoyé
  await fillGuardians(family, { relation: 'Mère', phone: '123' })
  await family.getByRole('button', { name: "Soumettre l'inscription" }).click()
  await expect(family.getByText(/Numéro invalide/).first()).toBeVisible()
  await expect(family).toHaveURL('/parent-portal/enrollment/new')

  // Numéro valide avec des points : accepté
  await family.locator('#guardian-0-phone').fill(typed)
  await family.getByRole('button', { name: "Soumettre l'inscription" }).click()
  await expect(family).toHaveURL('/parent-portal/enrollment/success')

  // Admin : approbation, puis la recherche par chiffres bruts trouve l'élève
  await admin.goto('/admin-portal/registrations')
  // La liste des inscriptions peut se re-rendre juste après son affichage (le clic est alors perdu)
  const approve = admin.locator('section').filter({ hasText: 'Décision' }).getByRole('button', { name: 'Approuver' })
  await expect(async () => {
    await admin.getByRole('row').filter({ hasText: first }).click()
    await expect(approve).toBeVisible({ timeout: 3000 })
  }).toPass()
  await approve.click()
  await expect(admin.getByText('Inscription approuvée')).toBeVisible()

  await admin.goto('/admin-portal/students')
  await admin.getByPlaceholder(/Rechercher des élèves/).fill(raw)
  const row = admin.getByRole('row').filter({ hasText: first })
  await expect(row).toBeVisible()

  // La fiche affiche le numéro au format national, jamais la valeur brute (E.164)
  await row.click()
  const sheet = admin.getByRole('dialog', { name: "Modifier l'élève" })
  await expect(sheet.getByText(national)).toBeVisible()
  await expect(sheet.getByText(`+33${raw.slice(1)}`)).toHaveCount(0)

  await Promise.all([family.close(), admin.close()])
})
