export type NotificationType =
  | 'role_granted'
  | 'role_revoked'
  | 'account_activated'
  | 'registration_approved'
  | 'registration_rejected'
  | 'teacher_invitation'
  | 'exam_signature_reset'
  | 'registration_submitted'
  | 'exam_grades_submitted'

export type Notification = {
  id: string
  schoolId: string
  recipientMemberId: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  readAt: Date | null
  createdAt: Date
}

export type CreateNotificationInput = {
  schoolId: string
  recipientMemberId: string
  type: NotificationType
  title: string
  body?: string
  link?: string
}
