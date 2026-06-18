// ── Field & Block types ────────────────────────────────────────────────────────

export type FormType = 'new_student' | 'reenrollment'
export type InfoBlockStyle = 'info' | 'warning' | 'success' | 'error'
export type FieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'rating' | 'date'

export type SystemFieldKey =
  | 'firstName' | 'lastName' | 'birthDate' | 'gender'
  | 'fatherName' | 'motherName'
  | 'primaryEmail' | 'secondaryEmail'
  | 'primaryPhone' | 'secondaryPhone'
  | 'schoolGrade' | 'regularSchool'
  | 'paymentFrequency' | 'financialAid' | 'sponsorship'

export type SystemField = {
  kind: 'system_field'
  id: string
  fieldKey: SystemFieldKey
  label: string
  type: FieldType
  required: boolean
  placeholder?: string
  note?: string
  options?: string[]
}

export type CustomField = {
  kind: 'custom_field'
  id: string
  label: string
  type: FieldType
  required: boolean
  placeholder?: string
  note?: string
  options?: string[]
}

export type InfoBlock = {
  kind: 'info_block'
  id: string
  style: InfoBlockStyle
  title?: string
  content: string // HTML
  isSystem?: boolean
}

export type FormField = SystemField | CustomField

export type FormSection = {
  kind: 'section'
  id: string
  title: string
  description?: string
  isSystem: boolean
  systemKey?: 'student_info' | 'class_selection' | 'payment'
  fields: FormField[]
}

export type FormItem = FormSection | InfoBlock

// ── DB entity types ────────────────────────────────────────────────────────────

export type RegistrationForm = {
  id: string
  schoolId: string
  formType: FormType
  formSchema: FormItem[]
  isActive: boolean
  version: number
  createdAt: Date
  updatedAt: Date
}

export type RegistrationStatus = 'pending' | 'approved' | 'rejected'

export type Registration = {
  id: string
  schoolId: string
  formId: string | null
  formData: Record<string, unknown>
  status: RegistrationStatus
  submittedAt: Date
  reviewedBy: string | null
  reviewedAt: Date | null
  notes: string | null
}

// ── Default form schemas ───────────────────────────────────────────────────────

export const DEFAULT_NEW_STUDENT_SCHEMA: FormItem[] = [
  {
    kind: 'section',
    id: 'section-student-info',
    title: "Informations de l'étudiant",
    isSystem: true,
    systemKey: 'student_info',
    fields: [
      { kind: 'system_field', id: 'sf-first-name',      fieldKey: 'firstName',      label: "Prénom de l'étudiant",          type: 'text',  required: true,  placeholder: 'Entrez le prénom' },
      { kind: 'system_field', id: 'sf-last-name',       fieldKey: 'lastName',       label: "Nom de famille de l'étudiant",  type: 'text',  required: true,  placeholder: 'Entrez le nom de famille' },
      { kind: 'system_field', id: 'sf-birth-date',      fieldKey: 'birthDate',      label: 'Date de naissance',             type: 'date',  required: true },
      { kind: 'system_field', id: 'sf-gender',          fieldKey: 'gender',         label: 'Genre',                         type: 'radio', required: true,  options: ['Masculin', 'Féminin'] },
      { kind: 'system_field', id: 'sf-father-name',     fieldKey: 'fatherName',     label: 'Nom du père ou du tuteur',      type: 'text',  required: true },
      { kind: 'system_field', id: 'sf-mother-name',     fieldKey: 'motherName',     label: 'Nom de la mère ou du tuteur',   type: 'text',  required: true },
      { kind: 'system_field', id: 'sf-primary-email',   fieldKey: 'primaryEmail',   label: 'E-mail principal',              type: 'email', required: true,  placeholder: 'votre.email@example.com' },
      { kind: 'system_field', id: 'sf-secondary-email', fieldKey: 'secondaryEmail', label: 'E-mail secondaire (Optionnel)', type: 'email', required: false },
      { kind: 'system_field', id: 'sf-primary-phone',   fieldKey: 'primaryPhone',   label: 'Téléphone principal',           type: 'tel',   required: true,  note: "Ce numéro sera utilisé pour accéder au portail de votre étudiant(e) sur l'application de l'école !" },
      { kind: 'system_field', id: 'sf-secondary-phone', fieldKey: 'secondaryPhone', label: 'Téléphone secondaire (Optionnel)', type: 'tel', required: false },
      { kind: 'system_field', id: 'sf-school-grade',    fieldKey: 'schoolGrade',    label: 'Niveau scolaire actuel',        type: 'select', required: true },
      { kind: 'system_field', id: 'sf-regular-school',  fieldKey: 'regularSchool',  label: "Nom de l'école régulière actuelle", type: 'text', required: true },
    ],
  },
  {
    kind: 'info_block',
    id: 'ib-class-warning',
    style: 'warning',
    isSystem: true,
    content: '<p>Veuillez vérifier les prérequis du cours avant de choisir une classe !</p><p>Le parent est entièrement responsable du choix de la classe appropriée pour son étudiant.</p><p>Une demande de changement ultérieure devra être discutée avec la direction de l\'école.</p>',
  },
  {
    kind: 'section',
    id: 'section-class-selection',
    title: 'Sélection de la classe',
    isSystem: true,
    systemKey: 'class_selection',
    fields: [],
  },
  {
    kind: 'info_block',
    id: 'ib-fees-info',
    style: 'info',
    title: 'Informations sur les frais (Exemple)',
    content: '<p>Les frais d\'admission de l\'école sont composés de frais de fournitures + frais de scolarité.</p><ol><li>Les frais de fournitures sont de X€/an par étudiant (frais uniques).</li><li>Les frais de scolarité peuvent être payés semestriellement OU annuellement :<br><br><strong>Semestriellement :</strong><ul><li>X€ pour un étudiant</li><li>X€ pour deux étudiants</li><li>X€ pour trois étudiants ou plus</li></ul><strong>Annuellement :</strong><ul><li>X€ pour un étudiant</li><li>X€ pour deux étudiants</li><li>X€ pour trois étudiants ou plus</li></ul></li></ol><p>Si vous avez des questions, veuillez nous contacter à <a href="mailto:school@example.com">school@example.com</a></p>',
  },
  {
    kind: 'info_block',
    id: 'ib-policy-warning',
    style: 'warning',
    title: 'Reconnaissance de la Politique',
    content: '<p>Avant d\'envoyer le formulaire, veuillez vous assurer que vous avez examiné et accepté les règlements énoncés sur <a href="https://example.com">https://example.com</a></p><ul><li>Politique de l\'école</li><li>Libération de responsabilité</li><li>Règles de la classe</li></ul>',
  },
  {
    kind: 'section',
    id: 'section-payment',
    title: 'Paiement, Parrainage et Accord de Politique',
    isSystem: true,
    systemKey: 'payment',
    fields: [
      { kind: 'system_field', id: 'sf-payment-freq',  fieldKey: 'paymentFrequency', label: 'Préférez-vous payer les frais semestriellement ou annuellement ?', type: 'radio',    required: true,  options: ['Annuellement', 'Semestriellement'] },
      { kind: 'system_field', id: 'sf-financial-aid', fieldKey: 'financialAid',     label: "Si vous avez besoin d'une aide financière, quelle est la meilleure option pour vous ?", type: 'select', required: false },
      { kind: 'system_field', id: 'sf-sponsorship',   fieldKey: 'sponsorship',      label: 'Aimeriez-vous parrainer les frais de scolarité et/ou de fournitures d\'un étudiant ?', type: 'radio', required: false, options: ['Non, merci.', 'Oui, bien sûr. Nous vous contacterons pour l\'organiser.'], note: "Parrainage : certains de nos étudiants bénéficient d'une exemption de leurs frais de scolarité et/ou de fournitures. Par conséquent, parrainer un étudiant serait très utile." },
      { kind: 'custom_field', id: 'cf-photo-consent', label: 'Le personnel de [école] peut prendre et utiliser les photographies et vidéos de mon enfant publiquement dans les publications imprimées, les publications en ligne, les présentations, le site web de [école] et les réseaux sociaux, sur le bulletin d\'information (entre les enseignants et les parents). Je comprends également qu\'aucun droit d\'auteur, frais ou autre rémunération ne m\'est dû en raison de cet usage.', type: 'checkbox', required: false },
      { kind: 'custom_field', id: 'cf-comments',      label: 'Questions ou Commentaires', type: 'textarea', required: false, placeholder: 'Entrez toute question ou commentaire que vous avez…' },
      { kind: 'custom_field', id: 'cf-acknowledge',   label: "J'acknowledge que j'ai lu et accepte les politiques et les directives ci-dessus", type: 'checkbox', required: true,  note: "Avant d'envoyer le formulaire, veuillez vous assurer que vous avez examiné et accepté les règlements énoncés sur le site web de l'école." },
    ],
  },
]

export const DEFAULT_REENROLLMENT_SCHEMA: FormItem[] = [
  {
    kind: 'section',
    id: 'section-student-info',
    title: "Informations de l'étudiant",
    description: 'Pré-rempli à partir du dossier d\'étudiant existant',
    isSystem: true,
    systemKey: 'student_info',
    fields: [
      { kind: 'system_field', id: 'sf-school-grade',   fieldKey: 'schoolGrade',   label: 'Niveau scolaire actuel',            type: 'select', required: true },
      { kind: 'system_field', id: 'sf-regular-school', fieldKey: 'regularSchool', label: "Nom de l'école régulière actuelle", type: 'text',   required: true },
    ],
  },
  {
    kind: 'section',
    id: 'section-class-selection',
    title: 'Sélection de la classe',
    isSystem: true,
    systemKey: 'class_selection',
    fields: [],
  },
  {
    kind: 'info_block',
    id: 'ib-fees-info',
    style: 'info',
    title: 'Informations sur les frais (Exemple)',
    content: '<p>Les frais d\'admission de l\'école sont composés de frais de fournitures + frais de scolarité.</p><ol><li>Les frais de fournitures sont de X€/an par étudiant (frais uniques).</li><li>Les frais de scolarité peuvent être payés semestriellement OU annuellement.</li></ol>',
  },
  {
    kind: 'info_block',
    id: 'ib-policy-warning',
    style: 'warning',
    title: 'Reconnaissance de la Politique',
    content: '<p>Avant d\'envoyer le formulaire, veuillez vous assurer que vous avez examiné et accepté les règlements.</p><ul><li>Politique de l\'école</li><li>Libération de responsabilité</li><li>Règles de la classe</li></ul>',
  },
  {
    kind: 'section',
    id: 'section-payment',
    title: 'Paiement, Parrainage et Accord de Politique',
    isSystem: true,
    systemKey: 'payment',
    fields: [
      { kind: 'system_field', id: 'sf-payment-freq',  fieldKey: 'paymentFrequency', label: 'Préférez-vous payer les frais semestriellement ou annuellement ?', type: 'radio',    required: true, options: ['Annuellement', 'Semestriellement'] },
      { kind: 'system_field', id: 'sf-financial-aid', fieldKey: 'financialAid',     label: "Si vous avez besoin d'une aide financière, quelle est la meilleure option pour vous ?", type: 'select', required: false },
      { kind: 'system_field', id: 'sf-sponsorship',   fieldKey: 'sponsorship',      label: 'Aimeriez-vous parrainer les frais de scolarité et/ou de fournitures d\'un étudiant ?', type: 'radio', required: false, options: ['Non, merci.', 'Oui, bien sûr. Nous vous contacterons pour l\'organiser.'] },
      { kind: 'custom_field', id: 'cf-rating',        label: "Comment évaluez-vous l'école l'année dernière ?", type: 'rating', required: false },
      { kind: 'custom_field', id: 'cf-photo-consent', label: 'Le personnel de [école] peut prendre et utiliser les photographies et vidéos de mon enfant publiquement.', type: 'checkbox', required: false },
      { kind: 'custom_field', id: 'cf-comments',      label: 'Questions ou Commentaires', type: 'textarea', required: false, placeholder: 'Entrez toute question ou commentaire que vous avez…' },
      { kind: 'custom_field', id: 'cf-acknowledge',   label: "J'acknowledge que j'ai lu et accepte les politiques et les directives ci-dessus", type: 'checkbox', required: true },
    ],
  },
]
