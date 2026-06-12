import { Sidebar } from '@/components/layouts/Sidebar/Sidebar'
import { TopBar } from '@/components/layouts/TopBar/TopBar'
import type { Session } from '@/lib/auth/session'

interface PortalLayoutProps {
  children: React.ReactNode
  session: Session
  schoolName?: string
}

export function PortalLayout({ children, session, schoolName }: PortalLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar session={session} schoolName={schoolName} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
