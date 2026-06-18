import { Sidebar } from '@/components/layouts/Sidebar/Sidebar'
import { TopBar } from '@/components/layouts/TopBar/TopBar'
import type { Session } from '@/lib/auth/session'

interface PortalLayoutProps {
  children: React.ReactNode
  session: Session
  schoolName?: string
  userFullName?: string | null
}

export function PortalLayout({ children, session, schoolName, userFullName }: PortalLayoutProps) {
  return (
    // Pas d'overflow-hidden ici → le bouton collapse de la sidebar peut déborder
    <div className="flex h-[100dvh]">
      <Sidebar session={session} userFullName={userFullName} schoolName={schoolName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <TopBar session={session} schoolName={schoolName} userFullName={userFullName} />
        {/* bg-[#FFF8F0] = fond crème warm des pages intérieures */}
        <div className="flex-1 bg-[#FFF8F0] min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  )
}
