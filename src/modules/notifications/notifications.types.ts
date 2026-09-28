export type NotificationType =
  | 'role_granted'
  | 'role_revoked'
  | 'account_activated'
  | 'registration_approved'
  | 'registration_rejected'
  | 'teacher_invitation'

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
