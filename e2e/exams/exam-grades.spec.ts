import { test, expect, type Page } from '../support/fixtures'
import { storageStatePath, E2E_USERS } from '../support/users'

// Bulletin d'examen de bout en bout (§7.20) : l'admin ouvre la période du trimestre et retient la
// publication → l'enseignant note → le parent ne voit rien → l'admin publie → le parent consulte
// et signe → l'admin referme la période : formulaire de notation inaccessible (même par URL),
// bulletin toujours visible par le parent mais en lecture seule.
// Un seul test (il bascule des réglages d'école) : rien d'autre dans la suite n'en dépend.

const CLASS_NAME = 'Classe Coran E2E'
const STUDENT = 'Yassine TESTEUR'

/** Réglages du Trimestre 1 dans Paramètres de l'école (seuls ceux passés sont modifiés). */
async function setExamSettings(admin: Page, settings: { open?: boolean; published?: boolean }) {
  await admin.goto('/admin-portal/school-settings')
  if (settings.open !== undefined) {
    await admin.getByRole('checkbox', { name: /Ouvrir les examens pour Trimestre 1/ }).setChecked(settings.open)
  }
  if (settings.published !== undefined) {
    await admin.getByRole('checkbox', { name: /Bulletins publiés pour Trimestre 1/ }).setChecked(settings.published)
  }
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

test('bulletin : saisie ouverte, publication, signature du parent, lecture seule après fermeture', async ({ browser }) => {
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

  // … et le parent n'a encore aucun bulletin (publiés par défaut, mais rien n'est noté)
  await parent.goto('/parent-portal/exams')
  await expect(parent.getByText('Aucune note disponible')).toBeVisible()

  // 2. L'admin ouvre la saisie du Trimestre 1 et retient la publication jusqu'à la fin
  await setExamSettings(admin, { open: true, published: false })

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
  await star(teacher, 'Apporter les livres :', 2).click()
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

  // 5. Parent : bulletins non publiés → rien, même si la note existe
  await parent.reload()
  await expect(parent.getByText('Bulletins pas encore publiés')).toBeVisible()
  await expect(parent.getByText('85/100')).toHaveCount(0)

  // 6. L'admin publie : le parent consulte le bulletin et le signe
  await setExamSettings(admin, { published: true })
  await parent.reload()
  const bulletin = parent.locator('div.rounded-xl').filter({ hasText: CLASS_NAME }).filter({ hasText: 'Signature du parent' })
  await expect(bulletin).toContainText('85/100')
  await expect(bulletin).toContainText('Élève appliqué, bonne mémorisation.')
  await expect(bulletin).toContainText(`Enseignant : ${E2E_USERS.teacher.fullName}`)
  // Mêmes libellés que le formulaire enseignant (exams.labels.ts)
  await expect(bulletin).toContainText('Apporter les livres')
  await expect(bulletin).not.toContainText('Performance académique')
  await bulletin.getByRole('button', { name: 'Signer avec mon nom' }).click()
  await expect(bulletin).toContainText(E2E_USERS.parent.fullName)
  await expect(bulletin.getByRole('button', { name: 'Signer avec mon nom' })).toHaveCount(0)

  await parent.reload() // persisté
  await expect(bulletin).toContainText(E2E_USERS.parent.fullName)

  // 7. Admin : le bulletin apparaît signé
  await admin.goto('/admin-portal/track-exams')
  await classCard.getByRole('button', { name: 'Voir les détails' }).click()
  await expect(classCard.locator('div').filter({ hasText: STUDENT }).last()).toContainText('Signé')
  await expect(classCard.locator('div').filter({ hasText: STUDENT }).last()).not.toContainText('Non signé')

  // 8. L'enseignant corrige le bulletin signé : avertissement, puis la signature est annulée
  await teacher.goto(gradeUrl!)
  await expect(teacher.getByText(/Bulletin déjà signé par .* toute modification annulera la signature/)).toBeVisible()
  await teacher.locator('input[type="number"]').fill('90')
  await teacher.getByRole('button', { name: 'Mettre à jour la note' }).click()
  await expect(teacher).toHaveURL('/teacher-portal/exams')

  await parent.reload()
  await expect(bulletin).toContainText('90/100')
  await bulletin.getByRole('button', { name: 'Signer avec mon nom' }).click() // nouvelle signature requise
  await expect(bulletin).toContainText(E2E_USERS.parent.fullName)

  // 9. L'admin referme la saisie : le formulaire n'est plus accessible, même par son URL
  await setExamSettings(admin, { open: false })
  await teacher.goto(gradeUrl!)
  await expect(teacher).toHaveURL('/teacher-portal/exams')
  await expect(teacher.getByText("Période d'examens fermée")).toBeVisible()

  // … le parent garde son bulletin signé, en lecture seule
  await parent.reload()
  await expect(parent.getByText("Période d'examens fermée — signature indisponible")).toBeVisible()
  await expect(bulletin).toContainText('90/100')
  await expect(bulletin).toContainText(E2E_USERS.parent.fullName)

  expect(errors).toEqual([])
  await Promise.all([admin.close(), teacher.close(), parent.close()])
})
