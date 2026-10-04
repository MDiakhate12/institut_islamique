import { Sidebar } from '@/components/layouts/Sidebar/Sidebar'
import { TopBar } from '@/components/layouts/TopBar/TopBar'
import { MobileNavShell } from '@/components/layouts/MobileNavShell/MobileNavShell'
import { PortalContent } from '@/components/layouts/PortalContent/PortalContent'
import type { Session } from '@/lib/auth/session'

interface PortalLayoutProps {
  children: React.ReactNode
  session: Session
  schoolName?: string
  userFullName?: string | null
  isSuperAdmin?: boolean
}

export function PortalLayout({ children, session, schoolName, userFullName, isSuperAdmin }: PortalLayoutProps) {
  return (
    <MobileNavShell
      title="Portail d'administration"
      subtitle={schoolName}
      sidebar={<Sidebar session={session} userFullName={userFullName} schoolName={schoolName} isSuperAdmin={isSuperAdmin} />}
    >
      <TopBar session={session} schoolName={schoolName} userFullName={userFullName} />
      <PortalContent>{children}</PortalContent>
    </MobileNavShell>
  )
}
