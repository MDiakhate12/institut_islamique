import { test, expect, type Page } from '../support/fixtures'
import { storageStatePath, E2E_USERS } from '../support/users'

// Bulletin d'examen de bout en bout : l'admin ouvre la période du trimestre (Paramètres) →
// l'enseignant note → l'admin suit la progression → le parent consulte et signe → l'admin
// referme la période, et le formulaire de notation n'est plus accessible, même par URL directe.
// Un seul test (il bascule un réglage d'école) : rien d'autre dans la suite ne dépend de la période.

const CLASS_NAME = 'Classe Coran E2E'
const STUDENT = 'Yassine TESTEUR'

async function setExamPeriod(admin: Page, open: boolean) {
  await admin.goto('/admin-portal/school-settings')
  const toggle = admin.getByRole('checkbox', { name: /Ouvrir les examens pour Trimestre 1/ })
  await toggle.setChecked(open)
  await admin.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await expect(admin.getByText('Paramètres sauvegardés')).toBeVisible()
}

/** Étoile n (1-5) d'un critère du formulaire de notation (boutons sans libellé). */
function star(page: Page, criterion: string, n: number) {
  return page.locator('div.space-y-1\\.5')
    .filter({ has: page.getByText(criterion) })
    .getByRole('button')
    .nth(n - 1)
}

test('bulletin : période ouverte par l\'admin, note de l\'enseignant, signature du parent', async ({ browser }) => {
  const errors: Error[] = []
  const open = async (role: 'admin' | 'teacher' | 'parent') => {
    const page = await browser.newPage({ storageState: storageStatePath(role) })
    page.on('pageerror', e => errors.push(new Error(`${page.url()} : ${e.message.slice(0, 40)}`)))
    return page
  }
  const [admin, teacher, parent] = await Promise.all([open('admin'), open('teacher'), open('parent')])
  const studentLink = teacher.getByRole('link', { name: new RegExp(STUDENT) })

  // 1. Période fermée (état du seed) : bandeau, et l'élève n'est pas cliquable
  await teacher.goto('/teacher-portal/exams')
  await expect(teacher.getByText("Période d'examens fermée")).toBeVisible()
  await expect(teacher.getByText(STUDENT)).toBeVisible()
  await expect(studentLink).toHaveCount(0)

  // 2. L'admin ouvre la période du Trimestre 1
  await setExamPeriod(admin, true)

  // 3. Enseignant : critères obligatoires, puis notation complète
  await teacher.reload()
  await expect(teacher.getByText("Période d'examens fermée")).toHaveCount(0)
  const gradeUrl = await studentLink.getAttribute('href')
  await studentLink.click()
  await expect(teacher.getByText(`Étudiant: ${STUDENT}`)).toBeVisible()

  await teacher.getByRole('button', { name: 'Soumettre' }).click()
  await expect(teacher.getByText('Veuillez fournir les évaluations pour tous les champs requis')).toBeVisible()

  await star(teacher, 'Présence :', 4).click()
  await star(teacher, 'Respect des enseignants :', 5).click()
  await star(teacher, 'Respect des autres :', 5).click()
  await star(teacher, 'Participation :', 3).click()
  await star(teacher, "Désir d'apprendre :", 4).click()
  await teacher.locator('textarea').first().fill("Sourates Al-Ikhlas à An-Nas")
  await teacher.locator('textarea').last().fill('Élève appliqué, bonne mémorisation.')
  await teacher.locator('input[type="number"]').fill('85')
  await teacher.getByRole('button', { name: 'Soumettre' }).click()

  await expect(teacher.getByText('Note soumise avec succès !')).toBeVisible()
  await expect(teacher).toHaveURL('/teacher-portal/exams')
  await expect(studentLink).toContainText('Noté')

  // 4. Admin : la classe est notée à 100 %, bulletin pas encore signé
  await admin.goto('/admin-portal/track-exams')
  const classCard = admin.locator('div.rounded-xl').filter({ hasText: CLASS_NAME }).filter({ hasText: '% fait' })
  await expect(classCard).toContainText('100% fait')
  await classCard.getByRole('button', { name: 'Voir les détails' }).click()
  await expect(classCard.locator('div').filter({ hasText: STUDENT }).last()).toContainText('Non signé')

  // 5. Parent : consulte le bulletin et le signe
  await parent.goto('/parent-portal/exams')
  const bulletin = parent.locator('div.rounded-xl').filter({ hasText: CLASS_NAME }).filter({ hasText: 'Signature du parent' })
  await expect(bulletin).toContainText('85/100')
  await expect(bulletin).toContainText('Élève appliqué, bonne mémorisation.')
  await expect(bulletin).toContainText(`Enseignant : ${E2E_USERS.teacher.fullName}`)
  await bulletin.getByRole('button', { name: 'Signer avec mon nom' }).click()
  await expect(bulletin).toContainText(E2E_USERS.parent.fullName)
  await expect(bulletin.getByRole('button', { name: 'Signer avec mon nom' })).toHaveCount(0)

  await parent.reload() // persisté
  await expect(bulletin).toContainText(E2E_USERS.parent.fullName)

  // 6. Admin : le bulletin apparaît signé
  await admin.reload()
  await classCard.getByRole('button', { name: 'Voir les détails' }).click()
  await expect(classCard.locator('div').filter({ hasText: STUDENT }).last()).toContainText('Signé')
  await expect(classCard.locator('div').filter({ hasText: STUDENT }).last()).not.toContainText('Non signé')

  // 7. L'admin referme la période : le formulaire n'est plus accessible, même par son URL
  await setExamPeriod(admin, false)
  await teacher.goto(gradeUrl!)
  await expect(teacher).toHaveURL('/teacher-portal/exams')
  await expect(teacher.getByText("Période d'examens fermée")).toBeVisible()

  expect(errors).toEqual([])
  await Promise.all([admin.close(), teacher.close(), parent.close()])
})
