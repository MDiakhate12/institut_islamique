'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { signOutAction } from '@/app/auth/actions'
import { hardNavigate } from '@/lib/auth/hard-navigate'
import { cn } from '@/lib/utils'
import { User, PenSquare, LogOut } from 'lucide-react'
import type { Session } from '@/lib/auth/session'

interface Props {
  session: Session
  userFullName?: string | null
  schoolName?: string | null
  profileHref?: string
  children: React.ReactElement // the trigger (user block in sidebar)
}

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  admin:   { label: 'Administrateur', bg: 'bg-amber-100',   text: 'text-amber-800',  icon: '⚙️' },
  teacher: { label: 'Enseignant',      bg: 'bg-blue-100',    text: 'text-blue-800',   icon: '🎓' },
  parent:  { label: 'Parent',       bg: 'bg-emerald-100', text: 'text-emerald-800', icon: '👤' },
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

export function UserProfileDialog({ session, userFullName, schoolName, profileHref = '/admin-portal/profile', children }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const displayName = userFullName || session.email.split('@')[0]
  const initials    = getInitials(displayName)

  function handleSignOut() {
    startTransition(async () => {
      await signOutAction()
      hardNavigate('/auth/login')
    })
  }

  return (
    <>
      {/* Trigger — clone the child and add onClick */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left"
      >
        {children}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="w-[calc(100%-2rem)] max-w-sm p-0 overflow-hidden"
          showCloseButton={false}
        >
          {/* ── Header gradient ── */}
          <div className="relative bg-gradient-to-br from-[#9ecf94] to-[#163828] px-6 pt-6 pb-8">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30
                         flex items-center justify-center text-white/80 hover:text-white transition-colors text-lg leading-none"
            >
              ×
            </button>

            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 border-2 border-white/40
                              flex items-center justify-center shrink-0">
                {initials
                  ? <span className="text-white text-xl font-bold">{initials}</span>
                  : <User className="h-8 w-8 text-white/80" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-lg leading-tight truncate">{displayName}</p>
                {schoolName && (
                  <p className="text-white/70 text-sm mt-0.5">{schoolName}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="px-5 py-4 space-y-4">

            {/* Roles */}
            {session.roles.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full border border-muted-foreground/50" />
                  Rôles et Permissions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {session.roles.map(role => {
                    const cfg = ROLE_CONFIG[role]
                    if (!cfg) return null
                    return (
                      <span
                        key={role}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                          cfg.bg, cfg.text
                        )}
                      >
                        <span>{cfg.icon}</span>
                        {cfg.label}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Account info */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Informations du compte
              </p>
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                {/* Email */}
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <a
                    href={`mailto:${session.email}`}
                    className="text-sm text-[#2d6a4f] font-medium truncate max-w-[180px] hover:underline"
                  >
                    {session.email}
                  </a>
                </div>

                {/* School */}
                {schoolName && (
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm text-muted-foreground">École</span>
                    <span className="text-sm font-medium text-foreground">{schoolName}</span>
                  </div>
                )}

                {/* Status */}
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-sm text-muted-foreground">Statut</span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    En ligne
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <Link
                href={profileHref}
                onClick={() => setOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                           bg-gradient-to-r from-[#2d6a4f] to-[#1b4332] text-white font-medium text-sm
                           hover:opacity-90 transition-opacity"
              >
                <PenSquare className="h-4 w-4" />
                Modifier mon profil
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                           border border-red-200 bg-red-50 text-red-600 font-medium text-sm
                           hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {isPending ? 'Déconnexion...' : 'Se déconnecter'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
