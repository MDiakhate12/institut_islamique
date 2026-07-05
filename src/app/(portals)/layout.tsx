import { requireSession } from '@/lib/auth/session'

export default async function PortalsLayout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return <>{children}</>
}
