export type Guardian = {
  id: string
  relationship: string
  firstName: string | null
  lastName: string
  email: string | null
  phone: string | null
  isPrimary: boolean
}

export type ConnectedParent = {
  schoolMemberId: string
  fullName: string | null
}

export type StudentParentInfo = {
  id: string
  firstName: string
  lastName: string
  guardians: Guardian[]
  connectedParents: ConnectedParent[]
}

export type EnrolledClass = {
  classId: string
  className: string
  room: string | null
  subjectCode: string | null
  teacherName: string | null
}

export type ChildWithClasses = {
  studentId: string
  firstName: string
  lastName: string
  studentCustomId: string | null
  classes: EnrolledClass[]
}

// ── Annuaire « une ligne par parent » (regroupement des fiches tuteurs) ─────────

export type GuardianRole = 'father' | 'mother' | 'guardian' | 'other'

/** Une fiche `guardians` telle que lue en base, avec le nom de son élève. */
export type GuardianRow = {
  id: string
  studentId: string
  studentName: string
  relationship: GuardianRole
  firstName: string | null
  lastName: string
  email: string | null
  phone: string | null
  emergencyPhone: string | null
  linkedMemberId: string | null
  createdAt: Date
}

/** Compte connecté à l'app (parent_students + profil + e-mail de connexion). */
export type ConnectedAccount = {
  schoolMemberId: string
  fullName: string | null
  email: string | null
  phone: string | null
  studentIds: string[]
}

/** `linked` : la fiche tuteur de cet enfant est liée à un compte parent (non modifiable ici). */
export type DirectoryChild = { id: string; name: string; linked?: boolean }

export type DirectoryParent = {
  key: string
  name: string
  /** Autres graphies du nom rencontrées dans les fiches fusionnées. */
  nameVariants: string[]
  role: GuardianRole
  /** Nombre de fiches par rôle — plus d'un rôle = incohérence. */
  roleCounts: Partial<Record<GuardianRole, number>>
  emails: string[]
  phones: string[]
  emergencyPhones: string[]
  /** Valeurs du champ téléphone qui sont en fait des e-mails (affichées telles quelles, signalées). */
  phoneFieldEmails: string[]
  /** Valeurs du champ téléphone ni valides ni des e-mails. */
  invalidPhones: string[]
  children: DirectoryChild[]
  /** Ids des fiches `guardians` fusionnées — pour retrouver un parent depuis la fiche d'un élève. */
  guardianIds: string[]
  connectedNames: string[]
  isConnected: boolean
  /** Compte connecté sans aucune fiche tuteur correspondante. */
  accountOnly: boolean
  /** Fusion faite sur le seul nom (aucun contact en commun) — à vérifier. */
  maybeSame: boolean
  /** Noms des autres parents qui partagent un e-mail ou un téléphone (couple, famille). */
  sharedWith: string[]
  mergedCount: number
  firstSeen: string
}
