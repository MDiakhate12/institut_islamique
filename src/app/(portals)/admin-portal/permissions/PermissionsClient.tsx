'use client'

import { useState } from 'react'
import { ShieldCheck, Wallet, Briefcase, Mail, Phone, XCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/modules/permissions/permissions.hooks'
import { AddRoleDialog } from './AddRoleDialog'
import { RevokeDialog } from './RevokeDialog'
import type { AdminSubRole } from '@/lib/constants'
import type { PermissionMember } from '@/modules/permissions/permissions.types'

// ---------- Role badge colors ----------
const PORTAL_ROLE_BADGES: Record<string, string> = {
  admin: 'bg-orange-100 text-orange-700 border-orange-200',
  teacher: 'bg-green-100 text-green-700 border-green-200',
  parent: 'bg-purple-100 text-purple-700 border-purple-200',
}
const PORTAL_ROLE_LABELS: Record<string, string> = {
  admin: 'Admin École',
  teacher: 'Enseignant',
  parent: 'Parent',
}
const ADMIN_SUBROLE_BADGES: Record<AdminSubRole, string> = {
  admin: 'bg-orange-100 text-orange-700 border-orange-200',
  treasurer: 'bg-teal-100 text-teal-700 border-teal-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
}
const ADMIN_SUBROLE_LABELS: Record<AdminSubRole, string> = {
  admin: 'Administrateur',
  treasurer: 'Trésorier',
  manager: 'Gestionnaire',
}

// ---------- Member card ----------
function MemberCard({
  member,
  onRevoke,
}: {
  member: PermissionMember
  onRevoke: (m: PermissionMember) => void
}) {
  return (
    <div className="relative rounded-xl border border-border bg-white p-4 space-y-3 shadow-sm">
      <button
        onClick={() => onRevoke(member)}
        className="absolute top-3 right-3 flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
      >
        <XCircle className="h-3.5 w-3.5" />
        Révoquer
      </button>

      <div className="h-9 w-9 rounded-full bg-[#fdf6f0] border border-[#f0dcc8] flex items-center justify-center">
        <ShieldCheck className="h-4.5 w-4.5 text-[#c2440f]" />
      </div>

      <div className="space-y-1">
        <p className="font-semibold text-gray-900">
          {member.fullName ?? (member.isPending ? 'En attente' : '—')}
        </p>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{member.email}</span>
        </div>
        {member.phone && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{member.phone}</span>
          </div>
        )}
      </div>

      {member.isPending && (
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border-amber-200">
          En attente
        </span>
      )}

      <div className="flex flex-wrap gap-1.5">
        {member.portalRoles.map(r => (
          <span
            key={r}
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${PORTAL_ROLE_BADGES[r] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}
          >
            {PORTAL_ROLE_LABELS[r] ?? r}
          </span>
        ))}
        {member.adminSubRole && (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ADMIN_SUBROLE_BADGES[member.adminSubRole]}`}
          >
            {ADMIN_SUBROLE_LABELS[member.adminSubRole]}
          </span>
        )}
      </div>
    </div>
  )
}

// ---------- Section ----------
interface SectionConfig {
  role: AdminSubRole
  label: string
  description: string
  icon: React.ReactNode
  accentClass: string
  emptyText: string
  buttonClass: string
  buttonLabel: string
}

const SECTIONS: SectionConfig[] = [
  {
    role: 'admin',
    label: 'Administrateurs actuels',
    description: 'Accès complet à toutes les fonctionnalités et paramètres.',
    icon: <ShieldCheck className="h-4.5 w-4.5 text-[#c2440f]" />,
    accentClass: 'text-[#c2440f]',
    emptyText: 'Aucun administrateur assigné pour l\'instant.',
    buttonClass: 'bg-[#c2440f] hover:bg-[#a33a0d] text-white',
    buttonLabel: 'Ajouter un nouvel administrateur',
  },
  {
    role: 'treasurer',
    label: 'Trésoriers actuels',
    description: 'Budget, dépenses, élèves et annonces uniquement.',
    icon: <Wallet className="h-4.5 w-4.5 text-green-600" />,
    accentClass: 'text-green-700',
    emptyText: 'Aucun trésorier assigné pour l\'instant.',
    buttonClass: 'bg-green-600 hover:bg-green-700 text-white',
    buttonLabel: 'Ajouter un nouveau trésorier',
  },
  {
    role: 'manager',
    label: 'Gestionnaires actuels',
    description: 'Accès administrateur complet — sauf Budget & Dépenses.',
    icon: <Briefcase className="h-4.5 w-4.5 text-blue-600" />,
    accentClass: 'text-blue-700',
    emptyText: 'Aucun gestionnaire assigné pour l\'instant.',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    buttonLabel: 'Ajouter un nouveau gestionnaire',
  },
]

// ---------- Section block ----------
function PermissionSection({
  config,
  schoolName,
}: {
  config: SectionConfig
  schoolName: string
}) {
  const { data: members = [], isLoading } = usePermissions(config.role)
  const [addOpen, setAddOpen] = useState(false)
  const [revoke, setRevoke] = useState<PermissionMember | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-2">
          <div className="mt-0.5">{config.icon}</div>
          <div>
            <h2 className={`text-base font-semibold ${config.accentClass}`}>{config.label}</h2>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)} className={`${config.buttonClass} shrink-0`}>
          <Plus className="h-4 w-4 mr-1.5" />
          {config.buttonLabel}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1].map(i => (
            <div key={i} className="h-40 rounded-xl border border-border bg-white animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white px-6 py-8 text-center text-sm text-muted-foreground">
          {config.emptyText}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(m => (
            <MemberCard key={m.memberId} member={m} onRevoke={setRevoke} />
          ))}
        </div>
      )}

      <AddRoleDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        role={config.role}
        schoolName={schoolName}
      />

      {revoke && (
        <RevokeDialog
          open
          onClose={() => setRevoke(null)}
          memberId={revoke.memberId}
          memberName={revoke.fullName ?? revoke.email}
          role={config.role}
        />
      )}
    </div>
  )
}

// ---------- Main client ----------
export function PermissionsClient({ schoolName }: { schoolName: string }) {
  return (
    <div className="p-6 space-y-10 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#7a4f30]">Autorisations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérer les accès administratifs et les rôles
        </p>
      </div>

      {SECTIONS.map(s => (
        <PermissionSection key={s.role} config={s} schoolName={schoolName} />
      ))}
    </div>
  )
}
