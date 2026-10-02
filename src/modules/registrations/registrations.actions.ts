'use server'

import { revalidatePath } from 'next/cache'
import { requireSession, getSession } from '@/lib/auth/session'
import { canAccess } from '@/lib/auth/permissions'
import { ok, err, unauthorized } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { registrationsService, buildKeyToIdMap } from './registrations.service'
import { getMissingRequiredFields, reviewRegistrationSchema, registrationGuardiansSchema, getGuardianErrors } from './registrations.schema'
import { studentsService } from '@/modules/students/students.service'
import { scheduledClassesService } from '@/modules/classes/classes.service'
import { parentsService } from '@/modules/parents/parents.service'
import type { FormType, FormItem, RegistrationForm, SystemFieldKey, RegistrationClassItem, RegistrationWithDetails, RegistrationGuardianInput } from './registrations.types'
import { GUARDIAN_FIELD_KEYS } from './registrations.types'
import { db } from '@/db'
import { schools, guardians } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { SchoolSettings } from '@/db/schema/schools'
import { sendEmail, getAppUrl, getSchoolName, getEmailsForMembers } from '@/lib/email'
import { notifyAdmins } from '@/modules/notifications/notify-admins'
import { createNotificationInternal } from '@/modules/notifications/notifications.actions'

const PATH = '/admin-portal/registration-forms'

// ── Admin actions ──────────────────────────────────────────────────────────────

export async function getRegistrationFormAction(
  formType: FormType
): Promise<ActionResult<RegistrationForm>> {
  const session = await requireSession()
  try {
    const form = await registrationsService.getOrCreateForm(session.schoolId, formType)
    return ok(form)
  } catch (e) {
    console.error('[getRegistrationFormAction]', e)
    return err('Impossible de charger le formulaire')
  }
}

export async function updateRegistrationFormAction(
  formType: FormType,
  schema: FormItem[]
): Promise<ActionResult<RegistrationForm>> {
  const session = await requireSession()
  if (!canAccess(session, 'registration-forms')) return unauthorized()

  try {
    const form = await registrationsService.updateFormSchema(session.schoolId, formType, schema)
    revalidatePath(PATH)
    return ok(form)
  } catch (e) {
    console.error('[updateRegistrationFormAction]', e)
    return err('Impossible de sauvegarder le formulaire')
  }
}

export async function resetRegistrationFormAction(
  formType: FormType
): Promise<ActionResult<RegistrationForm>> {
  const session = await requireSession()
  if (!canAccess(session, 'registration-forms')) return unauthorized()

  try {
    const form = await registrationsService.resetForm(session.schoolId, formType)
    revalidatePath(PATH)
    return ok(form)
  } catch (e) {
    console.error('[resetRegistrationFormAction]', e)
    return err('Impossible de réinitialiser le formulaire')
  }
}

// ── Public submission action (no auth) ────────────────────────────────────────

export async function submitRegistrationAction(
  schoolSlug: string,
  formType: FormType,
  formData: Record<string, unknown>,
  // Indice du formulaire de réinscription parent : n'est accepté que si l'élève est lié au
  // parent connecté. Le parent soumetteur n'est plus un paramètre : il vient de la session
  // (un appel direct à cette action publique permettait de lier l'élève à n'importe quel compte).
  knownStudentId?: string,
  // Bloc « Tuteurs » (nouvel élève) : portail parent (tuteur 1 = parent connecté) ou formulaire public
  guardiansInput?: RegistrationGuardianInput[],
): Promise<ActionResult<{ id: string; studentId?: string }>> {
  try {
    // 1. Find school by slug
    const [school] = await db
      .select({ id: schools.id, settings: schools.settings })
      .from(schools)
      .where(eq(schools.slug, schoolSlug))
      .limit(1)

    if (!school) return err('École introuvable')
    const settings = school.settings as SchoolSettings | null
    const academicYear = settings?.academicYear ?? ''

    // Parent connecté à cette école (portail parent) — sinon soumission publique anonyme
    const session = await getSession()
    const submitterMemberId = session && session.schoolId === school.id && session.roles.includes('parent')
      ? session.memberId
      : undefined

    // Réglage « Autoriser les nouvelles inscriptions » : la réinscription reste toujours possible
    if (formType === 'new_student' && settings?.allowNewRegistrations === false) {
      return err("Les nouvelles inscriptions sont fermées pour le moment. Contactez l'école pour plus d'informations.")
    }

    // Réinscription : uniquement pour un élève lié au parent connecté (sinon on enregistrait
    // une inscription sans élève, impossible à traiter par l'admin)
    let studentId: string | undefined
    if (formType === 'reenrollment') {
      if (!submitterMemberId || !knownStudentId
        || !await registrationsService.isLinkedToParent(submitterMemberId, knownStudentId, school.id)) {
        return err('Pour réinscrire un élève, connectez-vous au portail parent et choisissez-le dans la liste de vos enfants.')
      }
      studentId = knownStudentId
    }

    // 2. Get the form (to read the field→id mapping)
    const form = await registrationsService.getOrCreateForm(school.id, formType)
    const keyToId = buildKeyToIdMap(form.formSchema)

    // Nouvel élève : les tuteurs viennent du bloc « Tuteurs » (les champs père/mère/contact du
    // formulaire ne sont plus affichés). Sans bloc (ancienne page encore ouverte) : champs historiques.
    const parentGuardians = formType === 'new_student' && guardiansInput !== undefined
    const isAccountHolder = !!(submitterMemberId && session)
    let guardianList: RegistrationGuardianInput[] = []
    if (parentGuardians) {
      const parsedGuardians = registrationGuardiansSchema.safeParse(guardiansInput)
      if (!parsedGuardians.success) return err('Renseignez au moins un tuteur.')
      // Portail parent : le tuteur 1 est le titulaire du compte, son e-mail est celui de la session
      guardianList = parsedGuardians.data.map((g, i) => (i === 0 && isAccountHolder ? { ...g, email: session!.email } : g))
      const guardianErrors = getGuardianErrors(guardianList, { accountHolder: isAccountHolder })
      if (Object.keys(guardianErrors).length > 0) {
        return err(`Tuteurs incomplets : ${Object.values(guardianErrors)[0]}`)
      }
      // Recopie dans les réponses du formulaire : la liste admin, les e-mails de décision et les
      // replis « form_data » du tableau Élèves lisent ces champs (§7.4)
      const father = guardianList.find(g => g.relationship === 'father')
      const mother = guardianList.find(g => g.relationship === 'mother')
      const mirror: Partial<Record<SystemFieldKey, string>> = {
        fatherName: father?.name ?? '', motherName: mother?.name ?? '',
        primaryEmail: guardianList[0].email, primaryPhone: guardianList[0].phone,
        secondaryEmail: guardianList[1]?.email ?? '', secondaryPhone: guardianList[1]?.phone ?? '',
      }
      for (const [key, value] of Object.entries(mirror) as [SystemFieldKey, string][]) {
        const fieldId = keyToId[key]
        if (fieldId) formData[fieldId] = value
      }
    }

    // Garantie serveur : le client valide déjà, mais on ne crée jamais d'élève à partir d'un envoi incomplet
    const missing = getMissingRequiredFields(form.formSchema, formData, {
      gradeOptions:     settings?.gradeLevels,
      financialOptions: settings?.financialOptions,
      skipFieldKeys:    parentGuardians ? GUARDIAN_FIELD_KEYS : undefined,
    })
    if (missing.length > 0) {
      return err(`Champs obligatoires manquants : ${missing.map(f => f.label).join(', ')}`)
    }

    const get = (key: SystemFieldKey): string | undefined => {
      const fieldId = keyToId[key]
      return fieldId ? (formData[fieldId] as string | undefined) : undefined
    }

    // 3. Nouvel élève : refus des doublons, puis création (inactif jusqu'à l'approbation) + tuteurs
    if (formType === 'new_student') {
      const firstName = get('firstName')?.trim()
      const lastName  = get('lastName')?.trim()
      const genderRaw = get('gender')
      const birthDate = get('birthDate') || undefined

      if (firstName && lastName) {
        const duplicate = await registrationsService.findDuplicateStudent(school.id, firstName, lastName, birthDate)
        if (duplicate) {
          if (submitterMemberId && await registrationsService.isLinkedToParent(submitterMemberId, duplicate.id, school.id)) {
            return err('Cet enfant est déjà lié à votre compte : choisissez-le dans la liste pour le réinscrire.')
          }
          return err(submitterMemberId
            ? "Un élève portant ce nom et cette date de naissance est déjà inscrit à l'école. Utilisez « Lier mon élève » pour le rattacher à votre compte, puis réinscrivez-le."
            : "Un élève portant ce nom et cette date de naissance est déjà inscrit à l'école. S'il s'agit de votre enfant, connectez-vous au portail parent pour le réinscrire, ou contactez l'école.")
        }
      }

      if (firstName && lastName && genderRaw) {
        const gender: 'male' | 'female' =
          genderRaw === 'Masculin' || genderRaw === 'male' ? 'male' : 'female'

        // Inactif tant que l'école n'a pas approuvé l'inscription (activé par reviewRegistrationAction)
        const student = await studentsService.create(school.id, {
          firstName,
          lastName,
          gender,
          isActive:  false,
          birthDate,
        })
        studentId = student.id

        // Tuteurs — nom complet dans first_name, last_name vide : même convention que l'éditeur
        // de tuteurs du tableau Élèves (qui n'affiche et ne modifie que first_name)
        if (parentGuardians) {
          for (const [i, g] of guardianList.entries()) {
            await db.insert(guardians).values({
              schoolId: school.id,
              studentId,
              relationship:   g.relationship as Exclude<RegistrationGuardianInput['relationship'], ''>,
              firstName:      g.name.trim(),
              lastName:       '',
              isPrimary:      i === 0,
              email:          g.email.trim() || null,
              phone:          g.phone.trim() || null,
              emergencyPhone: g.emergencyPhone.trim() || null,
              // Portail parent : tuteur 1 = le parent connecté, rattaché à son compte
              linkedMemberId: i === 0 && isAccountHolder ? submitterMemberId : null,
            })
          }
        } else {
          const fatherName = get('fatherName')?.trim()
          const motherName = get('motherName')?.trim()
          if (fatherName) {
            await db.insert(guardians).values({
              schoolId: school.id,
              studentId,
              relationship:   'father',
              firstName:      fatherName,
              isPrimary:      true,
              email:          get('primaryEmail')   || null,
              phone:          get('primaryPhone')   || null,
              emergencyPhone: get('secondaryPhone') || null,
            })
          }
          if (motherName) {
            await db.insert(guardians).values({
              schoolId: school.id,
              studentId,
              relationship: 'mother',
              firstName:    motherName,
              isPrimary:    !fatherName,
              email:        get('secondaryEmail') || (fatherName ? null : get('primaryEmail') || null),
              phone:        fatherName ? null : get('primaryPhone') || null,
            })
          }
        }
      }

      // Parent connecté : l'enfant apparaît tout de suite dans « Mes enfants »
      if (studentId && submitterMemberId) {
        await parentsService.linkStudentsToParent(submitterMemberId, [studentId], school.id)
      }
    }

    // 4. Save registration with proper studentId FK
    const registration = await registrationsService.submit(school.id, form.id, formData, studentId, academicYear, submitterMemberId)

    const studentFirstName = get('firstName')?.trim() ?? ''
    const studentLastName  = get('lastName')?.trim()  ?? ''
    const studentName = [studentFirstName, studentLastName].filter(Boolean).join(' ') || 'un élève'
    const [appUrl, schoolName] = await Promise.all([getAppUrl(), getSchoolName(school.id)])
    // Tous les admins/gestionnaires : notification in-app + e-mail (hors du chemin critique)
    const kind = formType === 'new_student' ? 'nouvel élève' : 'réinscription'
    void notifyAdmins(school.id, {
      type: 'registration_submitted',
      title: `Nouvelle inscription — ${studentName}`,
      body: `Inscription (${kind}) en attente de validation.`,
      link: '/admin-portal/registrations',
    }, {
      fromName: schoolName,
      subject: `Nouvelle inscription — ${studentName}`,
      html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f9f3;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2d6a4f,#2d6a4f);padding:36px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">${schoolName}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Nouvelle inscription reçue</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#1e4535;font-size:16px;margin:0 0 16px;">Assalamo Alykom,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Une nouvelle inscription a été soumise pour <strong>${studentName}</strong> (${kind}). Elle est en attente de validation.
      </p>
      <div style="text-align:center;">
        <a href="${appUrl}/admin-portal/registrations" style="display:inline-block;background:#2d6a4f;color:#ffffff;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Voir les inscriptions →
        </a>
      </div>
    </div>
    <div style="background:#f4f9f3;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">${schoolName} — Jazakum Allahu Khayran</p>
    </div>
  </div>
</body></html>`,
    }, 'submitRegistrationAction')

    return ok({ id: registration.id, studentId })
  } catch (e) {
    console.error('[submitRegistrationAction]', e)
    return err("Impossible de soumettre l'inscription")
  }
}

// ── Get form for public rendering (no auth) ───────────────────────────────────

export async function getPublicRegistrationFormAction(
  schoolSlug: string,
  formType: FormType
): Promise<ActionResult<{ form: RegistrationForm; schoolName: string; gradeOptions: string[]; financialOptions: string[]; academicYear: string; classes: RegistrationClassItem[]; allowNewRegistrations: boolean }>> {
  try {
    const [school] = await db
      .select({ id: schools.id, name: schools.name, settings: schools.settings })
      .from(schools)
      .where(eq(schools.slug, schoolSlug))
      .limit(1)

    if (!school) return err('École introuvable')

    const [form, classes] = await Promise.all([
      registrationsService.getOrCreateForm(school.id, formType),
      scheduledClassesService.getForRegistration(school.id),
    ])
    const settings         = school.settings as { gradeLevels?: string[]; financialOptions?: string[]; academicYear?: string; allowNewRegistrations?: boolean } | null
    const gradeOptions     = settings?.gradeLevels      ?? []
    const financialOptions = settings?.financialOptions ?? []
    const academicYear     = settings?.academicYear     ?? '2025-2026'

    return ok({ form, schoolName: school.name, gradeOptions, financialOptions, academicYear, classes, allowNewRegistrations: settings?.allowNewRegistrations !== false })
  } catch (e) {
    console.error('[getPublicRegistrationFormAction]', e)
    return err('Impossible de charger le formulaire')
  }
}

// ── Admin: get classes for the form builder preview ───────────────────────────

export async function getAdminRegistrationClassesAction(): Promise<ActionResult<RegistrationClassItem[]>> {
  const session = await requireSession()
  try {
    const data = await scheduledClassesService.getForRegistration(session.schoolId)
    return ok(data)
  } catch (e) {
    console.error('[getAdminRegistrationClassesAction]', e)
    return err('Impossible de charger les classes')
  }
}

// ── Admin: list submitted registrations ────────────────────────────────────────

export async function getRegistrationsAction(): Promise<ActionResult<RegistrationWithDetails[]>> {
  const session = await requireSession()
  if (!canAccess(session, 'registrations')) return unauthorized()

  try {
    const data = await registrationsService.getBySchoolWithDetails(session.schoolId)
    return ok(data)
  } catch (e) {
    console.error('[getRegistrationsAction]', e)
    return err('Impossible de charger les inscriptions')
  }
}

// ── Admin : approuver / rejeter une inscription ───────────────────────────────

export async function reviewRegistrationAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!canAccess(session, 'registrations')) return unauthorized()
  const parsed = reviewRegistrationSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues[0].message)
  const { registrationId, status, notes } = parsed.data

  try {
    const result = await registrationsService.review(session.schoolId, registrationId, session.memberId, status, notes || null)
    if (!result) return err('Inscription introuvable')
    // Nouvel élève activé/désactivé selon la décision ; classes choisies inscrites à l'approbation
    if (result.studentId) {
      await registrationsService.applyReviewToStudent(session.schoolId, result.studentId, result.formType, status, result.formData)
    }
    revalidatePath('/admin-portal/students')
    revalidatePath('/admin-portal/registrations')

    // Hors du chemin critique : un échec d'envoi ne doit pas annuler la décision
    const [appUrl, schoolName] = await Promise.all([getAppUrl(), getSchoolName(session.schoolId)])
    notifyFamilyOfReview(session.schoolId, status, notes || null, result, appUrl, schoolName)
      .catch(e => console.warn('[reviewRegistrationAction] notification famille :', e))
    return ok(undefined)
  } catch (e) {
    console.error('[reviewRegistrationAction]', e)
    return err("Impossible d'enregistrer la décision")
  }
}

async function notifyFamilyOfReview(
  schoolId: string,
  status: 'approved' | 'rejected',
  notes: string | null,
  r: NonNullable<Awaited<ReturnType<typeof registrationsService.review>>>,
  appUrl: string,
  schoolName: string,
): Promise<void> {
  const approved = status === 'approved'
  const title = approved ? `Inscription acceptée — ${r.studentName}` : `Inscription refusée — ${r.studentName}`
  const body = approved
    ? `L'inscription de ${r.studentName} a été acceptée par l'école.`
    : `L'inscription de ${r.studentName} n'a pas été retenue.${notes ? ` Motif : ${notes}` : ''}`

  // 1. Notification dans la cloche des parents qui ont un compte
  await Promise.all(r.recipientMemberIds.map(recipientMemberId => createNotificationInternal({
    schoolId, recipientMemberId, type: approved ? 'registration_approved' : 'registration_rejected',
    title, body, link: '/parent-portal/enrollment',
  })))

  // 2. E-mail : adresse saisie dans le formulaire (le formulaire public ne demande pas de compte)
  //    + comptes des parents liés
  const primaryEmailFieldId = buildKeyToIdMap(r.formSchema).primaryEmail
  const formEmail = primaryEmailFieldId ? String(r.formData[primaryEmailFieldId] ?? '').trim() : ''
  const recipients = Array.from(new Set([
    ...(formEmail.includes('@') ? [formEmail.toLowerCase()] : []),
    ...(await getEmailsForMembers(r.recipientMemberIds)).map(e => e.toLowerCase()),
  ]))
  const accent = approved ? '#2d6a4f' : '#b91c1c'
  // Le motif est saisi librement par l'admin et le nom vient du formulaire public : échappés dans le HTML
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const htmlBody = esc(body)

  await Promise.allSettled(recipients.map(to => sendEmail({
    to,
    fromName: schoolName,
    subject: `${schoolName} — ${title}`,
    html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f9f3;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:${accent};padding:36px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">${schoolName}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">${approved ? 'Inscription acceptée' : 'Inscription non retenue'}</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#1e4535;font-size:16px;margin:0 0 16px;">Assalamo Alykom,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${htmlBody}</p>
      ${!approved && !notes ? '<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">N\'hésitez pas à contacter l\'école pour plus d\'informations.</p>' : ''}
      <div style="text-align:center;margin-top:24px;">
        <a href="${appUrl}/parent-portal/enrollment" style="display:inline-block;background:${accent};color:#ffffff;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Voir mes inscriptions →
        </a>
      </div>
    </div>
    <div style="background:#f4f9f3;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">${schoolName} — Jazakum Allahu Khayran</p>
    </div>
  </div>
</body></html>`,
  })))
}
