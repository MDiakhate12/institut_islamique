import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield } from 'lucide-react'

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const email = user?.email?.toLowerCase() ?? ''

  if (!user || !SUPER_ADMIN_EMAILS.includes(email)) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#5c3820] text-white px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-amber-300" />
          <span className="font-bold text-base">Qaf School — Super Admin</span>
          <span className="text-[10px] bg-red-500 px-2 py-0.5 rounded-full font-bold tracking-wide">INTERNE</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/super-admin" className="text-sm text-white/70 hover:text-white transition-colors">
            Écoles
          </Link>
          <Link href="/super-admin/new" className="text-sm text-white/70 hover:text-white transition-colors">
            + Nouvelle école
          </Link>
          <span className="text-xs text-white/50 border-l border-white/20 pl-4">{user.email}</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-8">
        {children}
      </main>
    </div>
  )
}
