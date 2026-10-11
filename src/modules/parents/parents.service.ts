import { db } from '@/db'
import {
  students, parentStudents, guardians, schoolMembers, profiles,
  classEnrollments, classes, otpCodes,
} from '@/db/schema'
import { authUsers } from '@/db/auth-users'
import { and, eq, asc, isNull, inArray, gt, desc, sql } from 'drizzle-orm'
import { toStoredPhone } from '@/lib/phone'
import { MAX_GUARDIANS_PER_STUDENT } from '@/lib/constants'
import { buildParentDirectory } from './parents.grouping'
import type { SaveParentInput, SetStudentGuardianInput } from './parents.schema'
import type { GuardianSummary } from '@/modules/students/students.types'
import type {
  StudentParentInfo, Guardian, ConnectedParent,
  ChildWithClasses, EnrolledClass,
  GuardianRow, ConnectedAccount, DirectoryParent,
} from './parents.types'

/** Erreur de règle métier, dont le message peut être montré à l'admin. */
export class ParentEditError extends Error {}

export const parentsService = {
  /**
   * Change le parent d'UN élève : remplace les coordonnées de sa fiche tuteur (`guardianId`) ou en ajoute une.
   * Ne modifie que la fiche de cet élève — les autres enfants du parent précédent ne sont pas touchés. Choisir un
   * parent existant revient à copier ses coordonnées : le regroupement (parents.grouping) le reconnaît ensuite.
   * Une fiche liée à un compte parent n'est jamais remplacée.
   */
  async setStudentGuardian(schoolId: string, studentId: string, input: SetStudentGuardianInput): Promise<GuardianSummary> {
    const fields = {
      firstName:      input.name?.trim() || null,
      lastName:       '', // convention : nom complet dans first_name (§7.4)
      phone:          toStoredPhone(input.phone),
      email:          input.email?.trim() || null,
      emergencyPhone: toStoredPhone(input.emergencyPhone),
    }

    const [student] = await db.select({ id: students.id }).from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId))).limit(1)
    if (!student) throw new ParentEditError('Élève introuvable')

    const toSummary = (g: typeof guardians.$inferSelect): GuardianSummary => ({
      id: g.id, relationship: g.relationship, firstName: g.firstName, lastName: g.lastName,
      email: g.email, phone: g.phone, emergencyPhone: g.emergencyPhone, isPrimary: g.isPrimary,
      linkedMemberId: g.linkedMemberId, linkedMemberName: null,
    })

    if (input.guardianId) {
      const [row] = await db.select().from(guardians)
        .where(and(eq(guardians.id, input.guardianId), eq(guardians.studentId, studentId), eq(guardians.schoolId, schoolId))).limit(1)
      if (!row) throw new ParentEditError('Tuteur introuvable')
      if (row.linkedMemberId) throw new ParentEditError('Ce tuteur est lié à un compte parent : il ne peut pas être remplacé')
      const [updated] = await db.update(guardians).set({ ...fields, updatedAt: new Date() })
        .where(eq(guardians.id, row.id)).returning()
      return toSummary(updated)
    }

    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(guardians).where(eq(guardians.studentId, studentId))
    if (n >= MAX_GUARDIANS_PER_STUDENT) throw new ParentEditError(`Un élève a au maximum ${MAX_GUARDIANS_PER_STUDENT} tuteurs — utilisez « Changer » ou « Retirer »`)
    if (input.relationship === 'father' || input.relationship === 'mother') {
      const [clash] = await db.select({ id: guardians.id }).from(guardians)
        .where(and(eq(guardians.studentId, studentId), eq(guardians.relationship, input.relationship))).limit(1)
      if (clash) throw new ParentEditError(`Cet élève a déjà ${input.relationship === 'father' ? 'un père' : 'une mère'} — utilisez « Changer »`)
    }
    const [created] = await db.insert(guardians)
      .values({ schoolId, studentId, relationship: input.relationship, ...fields, isPrimary: n === 0 }).returning()
    return toSummary(created)
  },

  /**
   * Crée ou modifie un parent : une fiche `guardians` par enfant, toutes mises à jour ensemble.
   * Les fiches liées à un compte (`linked_member_id`) ne sont jamais modifiées ni supprimées (leurs
   * coordonnées viennent du profil du parent) — voir `students.service.update`.
   */
  /** Retire un tuteur d'UN élève (supprime sa fiche pour cet élève ; les autres enfants du parent ne sont pas touchés). */
  async removeStudentGuardian(schoolId: string, studentId: string, guardianId: string): Promise<void> {
    const [row] = await db.select().from(guardians)
      .where(and(eq(guardians.id, guardianId), eq(guardians.studentId, studentId), eq(guardians.schoolId, schoolId))).limit(1)
    if (!row) throw new ParentEditError('Tuteur introuvable')
    if (row.linkedMemberId) throw new ParentEditError('Ce tuteur est lié à un compte parent : le parent doit délier l\'enfant depuis son portail')
    await db.transaction(async tx => {
      await tx.delete(guardians).where(eq(guardians.id, row.id))
      if (row.isPrimary) { // un tuteur principal reste désigné s'il en reste un
        const [next] = await tx.select({ id: guardians.id }).from(guardians)
          .where(eq(guardians.studentId, studentId)).orderBy(asc(guardians.createdAt)).limit(1)
        if (next) await tx.update(guardians).set({ isPrimary: true }).where(eq(guardians.id, next.id))
      }
    })
  },

  async saveParent(schoolId: string, input: SaveParentInput): Promise<void> {
    const phone = toStoredPhone(input.phone)
    const emergencyPhone = toStoredPhone(input.emergencyPhone)
    const email = input.email?.trim() || null
    const fields = {
      relationship: input.relationship,
      firstName:    input.name.trim(),
      lastName:     '', // convention : nom complet dans first_name (§7.4)
      phone, email, emergencyPhone,
    }

    await db.transaction(async tx => {
      const existing = input.guardianIds.length
        ? await tx.select({ id: guardians.id, studentId: guardians.studentId, linkedMemberId: guardians.linkedMemberId })
            .from(guardians)
            .where(and(eq(guardians.schoolId, schoolId), inArray(guardians.id, input.guardianIds)))
        : []
      if (existing.length !== input.guardianIds.length) throw new ParentEditError('Parent introuvable')

      const kept = new Set(input.studentIds)
      const current = new Set(existing.map(g => g.studentId))

      // Enfants retirés
      for (const g of existing.filter(g => !kept.has(g.studentId))) {
        if (g.linkedMemberId) throw new ParentEditError("Un enfant lié à un compte parent ne peut pas être retiré ici — le parent doit le délier depuis son portail")
        await tx.delete(guardians).where(and(eq(guardians.id, g.id), eq(guardians.schoolId, schoolId)))
      }

      // Enfants conservés : mise à jour des fiches non liées
      for (const g of existing.filter(g => kept.has(g.studentId) && !g.linkedMemberId)) {
        await tx.update(guardians).set({ ...fields, updatedAt: new Date() })
          .where(and(eq(guardians.id, g.id), eq(guardians.schoolId, schoolId)))
      }

      // Enfants ajoutés
      const toAdd = input.studentIds.filter(id => !current.has(id))
      if (toAdd.length > 0) {
        const valid = await tx.select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
          .from(students).where(and(eq(students.schoolId, schoolId), inArray(students.id, toAdd)))
        if (valid.length !== toAdd.length) throw new ParentEditError('Élève introuvable')
        for (const st of valid) {
          if (input.relationship === 'father' || input.relationship === 'mother') {
            const [clash] = await tx.select({ id: guardians.id }).from(guardians)
              .where(and(eq(guardians.studentId, st.id), eq(guardians.relationship, input.relationship)))
              .limit(1)
            if (clash) throw new ParentEditError(`${st.firstName} ${st.lastName} a déjà ${input.relationship === 'father' ? 'un père' : 'une mère'}`)
          }
          const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(guardians).where(eq(guardians.studentId, st.id))
          if (n >= MAX_GUARDIANS_PER_STUDENT) throw new ParentEditError(`${st.firstName} ${st.lastName} a déjà ${MAX_GUARDIANS_PER_STUDENT} tuteurs`)
          await tx.insert(guardians).values({ schoolId, studentId: st.id, ...fields, isPrimary: n === 0 })
        }
      }
    })
  },

  /** Annuaire « une ligne par parent » : fiches tuteurs regroupées (voir parents.grouping.ts) + comptes connectés. */
  async getDirectory(schoolId: string): Promise<DirectoryParent[]> {
    const [guardianRows, linkRows] = await Promise.all([
      db
        .select({
          id:             guardians.id,
          studentId:      guardians.studentId,
          studentFirst:   students.firstName,
          studentLast:    students.lastName,
          relationship:   guardians.relationship,
          firstName:      guardians.firstName,
          lastName:       guardians.lastName,
          email:          guardians.email,
          phone:          guardians.phone,
          emergencyPhone: guardians.emergencyPhone,
          linkedMemberId: guardians.linkedMemberId,
          createdAt:      guardians.createdAt,
        })
        .from(guardians)
        .innerJoin(students, eq(guardians.studentId, students.id))
        .where(and(eq(guardians.schoolId, schoolId), eq(students.isActive, true))),

      db
        .select({
          schoolMemberId: parentStudents.schoolMemberId,
          studentId:      parentStudents.studentId,
          fullName:       profiles.fullName,
          phone:          profiles.phone,
          email:          authUsers.email,
        })
        .from(parentStudents)
        .innerJoin(students, eq(parentStudents.studentId, students.id))
        .leftJoin(schoolMembers, eq(parentStudents.schoolMemberId, schoolMembers.id))
        .leftJoin(profiles, eq(schoolMembers.userId, profiles.userId))
        .leftJoin(authUsers, eq(schoolMembers.userId, authUsers.id))
        .where(and(eq(parentStudents.schoolId, schoolId), eq(students.isActive, true))),
    ])

    const rows: GuardianRow[] = guardianRows.map(g => ({
      id: g.id,
      studentId: g.studentId,
      studentName: `${g.studentFirst} ${g.studentLast}`.trim(),
      relationship: g.relationship,
      firstName: g.firstName,
      lastName: g.lastName,
      email: g.email,
      phone: g.phone,
      emergencyPhone: g.emergencyPhone,
      linkedMemberId: g.linkedMemberId,
      createdAt: g.createdAt,
    }))

    const accounts = new Map<string, ConnectedAccount>()
    for (const l of linkRows) {
      const acc = accounts.get(l.schoolMemberId)
      if (acc) acc.studentIds.push(l.studentId)
      else accounts.set(l.schoolMemberId, {
        schoolMemberId: l.schoolMemberId,
        fullName: l.fullName,
        email: l.email,
        phone: l.phone,
        studentIds: [l.studentId],
      })
    }

    return buildParentDirectory(rows, [...accounts.values()])
  },

  async getAll(schoolId: string): Promise<StudentParentInfo[]> {
    const [studentRows, guardianRows, connectedRows] = await Promise.all([
      db
        .select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
        .from(students)
        .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)))
        .orderBy(asc(students.lastName), asc(students.firstName)),

      db
        .select({
          id:           guardians.id,
          studentId:    guardians.studentId,
          relationship: guardians.relationship,
          firstName:    guardians.firstName,
          lastName:     guardians.lastName,
          email:        guardians.email,
          phone:        guardians.phone,
          isPrimary:    guardians.isPrimary,
        })
        .from(guardians)
        .where(eq(guardians.schoolId, schoolId)),

      db
        .select({
          studentId:      parentStudents.studentId,
          schoolMemberId: parentStudents.schoolMemberId,
          fullName:       profiles.fullName,
        })
        .from(parentStudents)
        .leftJoin(schoolMembers, eq(parentStudents.schoolMemberId, schoolMembers.id))
        .leftJoin(profiles, eq(schoolMembers.userId, profiles.userId))
        .where(eq(parentStudents.schoolId, schoolId)),
    ])

    const guardiansByStudent = guardianRows.reduce<Record<string, Guardian[]>>((acc, g) => {
      if (!acc[g.studentId]) acc[g.studentId] = []
      acc[g.studentId].push(g)
      return acc
    }, {})

    const connectedByStudent = connectedRows.reduce<Record<string, ConnectedParent[]>>((acc, r) => {
      if (!acc[r.studentId]) acc[r.studentId] = []
      acc[r.studentId].push({ schoolMemberId: r.schoolMemberId, fullName: r.fullName })
      return acc
    }, {})

    return studentRows.map(s => ({
      ...s,
      guardians: guardiansByStudent[s.id] ?? [],
      connectedParents: connectedByStudent[s.id] ?? [],
    }))
  },

  async getMemberId(userId: string, schoolId: string): Promise<string | null> {
    const [row] = await db
      .select({ id: schoolMembers.id })
      .from(schoolMembers)
      .where(and(eq(schoolMembers.userId, userId), eq(schoolMembers.schoolId, schoolId)))
      .limit(1)
    return row?.id ?? null
  },

  async generateAndStoreOtp(email: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    await db.insert(otpCodes).values({ email, code, expiresAt })
    return code
  },

  async verifyOtp(email: string, code: string): Promise<boolean> {
    const now = new Date()
    const [row] = await db
      .select({ id: otpCodes.id })
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email),
          eq(otpCodes.code, code),
          isNull(otpCodes.usedAt),
          gt(otpCodes.expiresAt, now),
        )
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1)

    if (!row) return false

    await db.update(otpCodes).set({ usedAt: now }).where(eq(otpCodes.id, row.id))
    return true
  },

  async findStudentsByGuardianEmail(
    email: string,
    schoolId: string,
  ): Promise<{ studentId: string; firstName: string; lastName: string }[]> {
    const normalizedEmail = email.toLowerCase().trim()

    const allGuardians = await db
      .select({ studentId: guardians.studentId, email: guardians.email })
      .from(guardians)
      .where(eq(guardians.schoolId, schoolId))

    const matchingIds = allGuardians
      .filter(g => g.email && g.email.toLowerCase().trim() === normalizedEmail)
      .map(g => g.studentId)

    if (matchingIds.length === 0) return []

    const matched = await db
      .select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
      .from(students)
      .where(inArray(students.id, matchingIds))

    return matched.map(s => ({ studentId: s.id, firstName: s.firstName, lastName: s.lastName }))
  },

  async linkStudentsToParent(
    schoolMemberId: string,
    studentIds: string[],
    schoolId: string,
  ): Promise<void> {
    if (studentIds.length === 0) return

    const existing = await db
      .select({ studentId: parentStudents.studentId })
      .from(parentStudents)
      .where(and(
        eq(parentStudents.schoolMemberId, schoolMemberId),
        eq(parentStudents.schoolId, schoolId),
      ))

    const existingIds = new Set(existing.map(r => r.studentId))
    const toInsert = studentIds.filter(id => !existingIds.has(id))
    if (toInsert.length === 0) return

    // Récupère le téléphone du membre pour matcher les guardians
    const [memberRow] = await db
      .select({ phone: profiles.phone })
      .from(schoolMembers)
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(eq(schoolMembers.id, schoolMemberId))
      .limit(1)

    await db.transaction(async (tx) => {
      // 1. Créer les liens d'accès portail
      await tx.insert(parentStudents).values(
        toInsert.map(studentId => ({ schoolMemberId, studentId, schoolId }))
      )

      // 2. Mettre à jour guardians.linkedMemberId là où le téléphone correspond
      if (memberRow?.phone) {
        const normalize = (p: string) => p.replace(/\D/g, '').slice(-9)
        const normalizedPhone = normalize(memberRow.phone)

        const candidateGuardians = await tx
          .select({ id: guardians.id, phone: guardians.phone })
          .from(guardians)
          .where(and(
            inArray(guardians.studentId, toInsert),
            eq(guardians.schoolId, schoolId),
            isNull(guardians.linkedMemberId),
          ))

        const matchingIds = candidateGuardians
          .filter(g => g.phone && normalize(g.phone) === normalizedPhone)
          .map(g => g.id)

        if (matchingIds.length > 0) {
          await tx.update(guardians)
            .set({ linkedMemberId: schoolMemberId, updatedAt: new Date() })
            .where(inArray(guardians.id, matchingIds))
        }
      }
    })
  },

  async getChildrenWithClasses(
    schoolMemberId: string,
    schoolId: string,
  ): Promise<ChildWithClasses[]> {
    const linked = await db
      .select({ studentId: parentStudents.studentId })
      .from(parentStudents)
      .where(
        and(
          eq(parentStudents.schoolMemberId, schoolMemberId),
          eq(parentStudents.schoolId, schoolId),
        )
      )

    if (linked.length === 0) return []

    const studentIds = linked.map(r => r.studentId)

    const [studentRows, enrollmentRows] = await Promise.all([
      db
        .select({
          id: students.id,
          firstName: students.firstName,
          lastName: students.lastName,
          studentCustomId: students.studentCustomId,
        })
        .from(students)
        .where(inArray(students.id, studentIds))
        .orderBy(asc(students.firstName)),

      db
        .select({
          studentId:   classEnrollments.studentId,
          classId:     classEnrollments.classId,
          className:   classes.name,
          room:        classes.room,
          subjectCode: classes.subject,
          teacherName: profiles.fullName,
        })
        .from(classEnrollments)
        .leftJoin(classes, eq(classEnrollments.classId, classes.id))
        .leftJoin(schoolMembers, eq(classes.teacherId, schoolMembers.id))
        .leftJoin(profiles, eq(schoolMembers.userId, profiles.userId))
        .where(
          and(
            inArray(classEnrollments.studentId, studentIds),
            eq(classEnrollments.schoolId, schoolId),
            isNull(classEnrollments.unenrolledAt),
          )
        ),
    ])

    const classesByStudent = enrollmentRows.reduce<Record<string, EnrolledClass[]>>((acc, r) => {
      if (!acc[r.studentId]) acc[r.studentId] = []
      if (r.classId && r.className) {
        acc[r.studentId].push({
          classId:     r.classId,
          className:   r.className,
          room:        r.room,
          subjectCode: r.subjectCode ?? null,
          teacherName: r.teacherName ?? null,
        })
      }
      return acc
    }, {})

    return studentRows.map(s => ({
      studentId: s.id,
      firstName: s.firstName,
      lastName:  s.lastName,
      studentCustomId: s.studentCustomId,
      classes:   classesByStudent[s.id] ?? [],
    }))
  },

  async unlinkChild(schoolMemberId: string, studentId: string, schoolId: string): Promise<void> {
    await db
      .delete(parentStudents)
      .where(
        and(
          eq(parentStudents.schoolMemberId, schoolMemberId),
          eq(parentStudents.studentId, studentId),
          eq(parentStudents.schoolId, schoolId),
        )
      )
  },
}
