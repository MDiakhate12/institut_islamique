import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User } from 'lucide-react'
import { signOutAction } from '@/app/auth/actions'
import type { Session } from '@/lib/auth/session'
import Link from 'next/link'

const ROLE_LABELS: Record<string, string> = {
  admin: 'School Admin',
  teacher: 'Enseignant',
  parent: 'Parent',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-gray-200 text-gray-700',
  teacher: 'bg-green-100 text-green-700',
  parent: 'bg-blue-100 text-blue-700',
}

interface TopBarProps {
  session: Session
  schoolName?: string
}

export function TopBar({ session, schoolName }: TopBarProps) {
  const initials = session.email.slice(0, 2).toUpperCase()

  return (
    <header className="h-14 bg-white border-b border-border flex items-center justify-between px-6 shrink-0">
      {/* Titre app */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Application Scolaire Qaf</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
          Connecté
        </span>
      </div>

      {/* Droite : école + rôles + profil */}
      <div className="flex items-center gap-3">
        {schoolName && (
          <Badge variant="outline" className="text-xs font-medium">
            {schoolName}
          </Badge>
        )}

        {/* Badges rôles */}
        <div className="flex gap-1.5">
          {session.roles.map(role => (
            <span
              key={role}
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {ROLE_LABELS[role] ?? role}
            </span>
          ))}
        </div>

        {/* Menu profil — Base UI n'a pas asChild, on utilise render */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="focus:outline-none focus:ring-2 focus:ring-ring rounded-full"
          >
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="bg-[#9c6b47] text-white text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal truncate">
              {session.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <Link href="/admin-portal/school-settings" className="flex-1">
                Mon profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" className="cursor-pointer p-0">
              <form action={signOutAction} className="flex items-center w-full px-1.5 py-1">
                <LogOut className="mr-2 h-4 w-4" />
                <button type="submit" className="flex-1 text-left text-sm">
                  Se déconnecter
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
