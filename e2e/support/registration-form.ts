import type { Page } from './fixtures'

/**
 * Champ de PublicRegistrationForm par son libellé. Les <label> du formulaire n'ont pas de
 * htmlFor → getByLabel ne marche pas ; on prend le champ du même bloc que le label.
 * Formulaire partagé par /portal/register/[schoolSlug] et /parent-portal/enrollment (§7.4).
 */
export function field(page: Page, label: string) {
  return page
    .locator('div')
    .filter({ has: page.locator(':scope > label', { hasText: label }) })
    .locator('input, select, textarea')
    .first()
}

/** Suffixe aléatoire en lettres : les noms d'élève doivent être uniques (détection des doublons). */
export const uniqueSuffix = () =>
  Array.from({ length: 5 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('')

/** Remplit le formulaire « nouvel élève » (champs obligatoires du formulaire par défaut). */
export async function fillNewStudentForm(page: Page, child: {
  firstName: string; lastName: string; birthDate?: string; gender?: 'Masculin' | 'Féminin'
  father?: string; mother?: string; email?: string; phone?: string; grade?: string; className?: string
}) {
  await field(page, "Prénom de l'étudiant").fill(child.firstName)
  await field(page, "Nom de famille de l'étudiant").fill(child.lastName)
  await field(page, 'Date de naissance').fill(child.birthDate ?? '2017-05-04')
  await page.getByRole('button', { name: child.gender ?? 'Masculin', exact: true }).click()
  if (child.father !== undefined) await field(page, 'Nom du père ou du tuteur').fill(child.father)
  if (child.mother !== undefined) await field(page, 'Nom de la mère ou du tuteur').fill(child.mother)
  if (child.email !== undefined) await field(page, 'E-mail principal').fill(child.email)
  await field(page, 'Téléphone principal').fill(child.phone ?? '0699887766')
  await field(page, 'Niveau scolaire actuel').selectOption(child.grade ?? 'CM1')
  if (child.className) await page.getByRole('button', { name: new RegExp(child.className) }).first().click()
  await page.getByRole('button', { name: 'Annuellement' }).click()
  await page.getByRole('checkbox', { name: /J'ai lu et accepte les politiques/ }).check()
  await page.getByRole('checkbox', { name: /J'ai lu et j'accepte le règlement intérieur/ }).check()
}
