export type ConnectedParent = {
  userId: string
  fullName: string | null
}

export type StudentParentInfo = {
  id: string
  firstName: string
  lastName: string
  parentName1: string | null
  parentEmail1: string | null
  parentName2: string | null
  parentEmail2: string | null
  parentPhone: string | null
  connectedParents: ConnectedParent[]
}
