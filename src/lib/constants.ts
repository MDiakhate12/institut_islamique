export const PORTAL_ROLES = ['admin', 'teacher', 'parent'] as const
export type PortalRole = (typeof PORTAL_ROLES)[number]

export const ADMIN_SUB_ROLES = ['admin', 'treasurer', 'manager'] as const
export type AdminSubRole = (typeof ADMIN_SUB_ROLES)[number]

export const GENDERS = ['male', 'female'] as const
export type Gender = (typeof GENDERS)[number]

export const TEACHER_TYPES = ['volunteer', 'paid'] as const
export type TeacherType = (typeof TEACHER_TYPES)[number]

export const PAYMENT_STATUSES = ['verified', 'pending', 'rejected'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PAYMENT_METHODS = ['cash', 'check', 'paypal', 'venmo', 'no_fees', 'other'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_CATEGORIES = ['tuition', 'registration', 'donation', 'other'] as const
export type PaymentCategory = (typeof PAYMENT_CATEGORIES)[number]

export const PAYMENT_PERIODS = ['annually', 'trimester_1', 'trimester_2', 'trimester_3'] as const
export type PaymentPeriod = (typeof PAYMENT_PERIODS)[number]

export const EXPENSE_STATUSES = ['pending', 'approved', 'paid', 'rejected'] as const
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number]

export const SUBSTITUTION_STATUSES = ['open', 'active', 'completed'] as const
export type SubstitutionStatus = (typeof SUBSTITUTION_STATUSES)[number]

export const CLASS_TYPES = ['quran', 'nuraniyah'] as const
export type ClassType = (typeof CLASS_TYPES)[number]

export const TRIMESTERS = [1, 2, 3] as const
export type Trimester = (typeof TRIMESTERS)[number]

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const ANNOUNCEMENT_AUDIENCES = ['everyone', 'parents', 'teachers', 'admins'] as const
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number]

export const WEEK_DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
] as const
export type WeekDay = (typeof WEEK_DAYS)[number]

export const ROUTES = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    callback: '/auth/callback',
  },
  admin: {
    root: '/admin-portal',
    students: '/admin-portal/students',
    teachers: '/admin-portal/teachers',
    classes: '/admin-portal/classes',
    trackExams: '/admin-portal/track-exams',
    attendance: '/admin-portal/attendance',
    homework: '/admin-portal/homework',
    trackStars: '/admin-portal/track-stars',
    classCatalog: '/admin-portal/class-catalog',
    calendar: '/admin-portal/academic-calendar',
    reports: '/admin-portal/reports',
    bookTracking: '/admin-portal/book-tracking',
    substitutions: '/admin-portal/substitutions',
    registrations: '/admin-portal/registrations',
    registrationForms: '/admin-portal/registration-forms',
    budget: '/admin-portal/finance/budget',
    expenses: '/admin-portal/finance/expenses',
    sendEmail: '/admin-portal/communication/send-email',
    announcements: '/admin-portal/announcements',
    parents: '/admin-portal/parents',
    stickyNotes: '/admin-portal/sticky-notes',
    birthdays: '/admin-portal/birthdays',
    permissions: '/admin-portal/permissions',
    startNewYear: '/admin-portal/start-new-year',
    roadmap: '/admin-portal/roadmap',
    schoolSettings: '/admin-portal/school-settings',
  },
  teacher: {
    root: '/teacher-portal',
    myClasses: '/teacher-portal/my-classes',
    attendance: '/teacher-portal/attendance',
    homework: '/teacher-portal/homework',
    exams: '/teacher-portal/exams',
  },
  parent: {
    root: '/parent-portal',
    children: '/parent-portal/children',
    attendance: '/parent-portal/attendance',
    homework: '/parent-portal/homework',
    payments: '/parent-portal/payments',
  },
} as const
