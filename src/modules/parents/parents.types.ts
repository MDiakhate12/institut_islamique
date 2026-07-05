export type Guardian = {
  id: string
  relationship: string
  firstName: string
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
