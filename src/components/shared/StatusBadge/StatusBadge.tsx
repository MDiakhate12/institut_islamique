import { cn } from '@/lib/utils'

type StatusVariant =
  | 'active' | 'inactive'
  | 'verified' | 'pending' | 'rejected'
  | 'male' | 'female'
  | 'admin' | 'teacher' | 'parent'
  | 'volunteer' | 'paid'
  | 'open' | 'completed'
  | 'approved'

const VARIANTS: Record<StatusVariant, { label: string; className: string }> = {
  active:   { label: 'Actif',       className: 'bg-green-100 text-green-700' },
  inactive: { label: 'Inactif',     className: 'bg-gray-100 text-gray-500' },
  verified: { label: 'Vérifié',     className: 'bg-green-100 text-green-700' },
  pending:  { label: 'En attente',  className: 'bg-orange-100 text-orange-700' },
  rejected: { label: 'Rejeté',      className: 'bg-red-100 text-red-700' },
  male:     { label: 'Garçon',      className: 'bg-blue-100 text-blue-700' },
  female:   { label: 'Fille',       className: 'bg-pink-100 text-pink-700' },
  admin:    { label: 'School Admin',className: 'bg-gray-200 text-gray-700' },
  teacher:  { label: 'Enseignant',  className: 'bg-green-100 text-green-700' },
  parent:   { label: 'Parent',      className: 'bg-blue-100 text-blue-700' },
  volunteer:{ label: 'Bénévole',   className: 'bg-purple-100 text-purple-700' },
  paid:     { label: 'Payé',        className: 'bg-green-100 text-green-700' },
  open:     { label: 'Ouvert',      className: 'bg-blue-100 text-blue-700' },
  completed:{ label: 'Terminé',     className: 'bg-green-100 text-green-700' },
  approved: { label: 'Approuvé',    className: 'bg-blue-100 text-blue-700' },
}

interface StatusBadgeProps {
  status: StatusVariant
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = VARIANTS[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variant.className, className)}>
      {variant.label}
    </span>
  )
}
