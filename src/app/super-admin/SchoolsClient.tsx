'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Plus, School, Users, CheckCircle, Clock,
  Copy, Mail, Pencil, Trash2, Eye, X,
  Hash, Calendar, AlertTriangle, ExternalLink,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { resendInviteAction, deleteSchoolAction, updateSchoolAction } from '@/modules/super-admin/super-admin.actions'

type SchoolRow = {
  id: string
  name: string
  slug: string
  settings: Record<string, unknown> | null
  createdAt: Date
  memberCount: number
  pendingAdminEmail: string | null
  pendingAdminMemberId: string | null
}

interface Props {
  initialSchools: SchoolRow[]
}

function buildInviteUrl(schoolId: string, pendingEmail: string) {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/auth/signup?invite=admin&schoolId=${schoolId}&email=${encodeURIComponent(pendingEmail)}`
}

function autoSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function SchoolsClient({ initialSchools }: Props) {
  const [schools, setSchools] = useState(initialSchools)
  const [isPending, startTransition] = useTransition()

  // Dialog state
  const [detailsTarget, setDetailsTarget] = useState<SchoolRow | null>(null)
  const [editTarget, setEditTarget]       = useState<SchoolRow | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<SchoolRow | null>(null)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')

  function openEdit(school: SchoolRow) {
    setEditName(school.name)
    setEditSlug(school.slug)
    setEditTarget(school)
  }

  function handleCopyInvite(school: SchoolRow) {
    if (!school.pendingAdminEmail) return
    const url = buildInviteUrl(school.id, school.pendingAdminEmail)
    navigator.clipboard.writeText(url).then(() => toast.success('Lien d\'invitation copié !'))
  }

  function handleResend(school: SchoolRow) {
    startTransition(async () => {
      const result = await resendInviteAction(school.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      if (result.data.emailSent) {
        toast.success('Email d\'invitation renvoyé !')
      } else {
        toast.warning('Email non envoyé (domaine non vérifié). Copiez le lien manuellement.')
      }
    })
  }

  function confirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    startTransition(async () => {
      const result = await deleteSchoolAction(target.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setSchools(prev => prev.filter(s => s.id !== target.id))
      toast.success(`École "${target.name}" supprimée.`)
    })
  }

  function confirmEdit() {
    if (!editTarget) return
    const target = editTarget
    setEditTarget(null)
    startTransition(async () => {
      const result = await updateSchoolAction(target.id, { name: editName.trim(), slug: editSlug.trim() })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setSchools(prev => prev.map(s =>
        s.id === target.id ? { ...s, name: editName.trim(), slug: editSlug.trim() } : s
      ))
      toast.success('École mise à jour.')
    })
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Écoles</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {schools.length} école{schools.length !== 1 ? 's' : ''} enregistrée{schools.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/super-admin/new"
          className="flex items-center gap-2 bg-[#c2440f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#a33a0d] transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nouvelle école
        </Link>
      </div>

      {/* List */}
      {schools.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <School className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">Aucune école créée</p>
          <p className="text-sm text-gray-400 mt-1">Commencez par créer la première école.</p>
          <Link
            href="/super-admin/new"
            className="inline-flex items-center gap-2 mt-4 bg-[#c2440f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#a33a0d] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Créer une école
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
          {schools.map(school => {
            const onboarded = school.settings?.onboardingCompleted as boolean | undefined
            const isPendingSchool = !onboarded && !!school.pendingAdminEmail
            return (
              <div key={school.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors gap-4">

                {/* Left: icon + name */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-[#fdf6f0] border border-[#f0dcc8] flex items-center justify-center shrink-0">
                    <School className="h-5 w-5 text-[#c2440f]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{school.name}</p>
                    <p className="text-xs text-gray-400 font-mono">/{school.slug}</p>
                  </div>
                </div>

                {/* Right: meta + actions */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Member count */}
                  <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    <span>{school.memberCount}</span>
                  </div>

                  {/* Status badge */}
                  <div className={`hidden md:flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                    onboarded
                      ? 'bg-green-50 text-green-700 border border-green-100'
                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {onboarded
                      ? <><CheckCircle className="h-3 w-3" /> Configurée</>
                      : <><Clock className="h-3 w-3" /> En attente</>
                    }
                  </div>

                  {/* Pending: copy link + resend */}
                  {isPendingSchool && (
                    <>
                      <button
                        onClick={() => handleCopyInvite(school)}
                        title="Copier le lien d'invitation"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#c2440f] hover:bg-[#fdf6f0] transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleResend(school)}
                        disabled={isPending}
                        title="Renvoyer l'email d'invitation"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  {/* View details */}
                  <button
                    onClick={() => setDetailsTarget(school)}
                    title="Voir les détails"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-[#7a4f30] hover:bg-[#fdf6f0] transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEdit(school)}
                    title="Modifier l'école"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-[#c2440f] hover:bg-[#fdf6f0] transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteTarget(school)}
                    title="Supprimer l'école"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Details Dialog ──────────────────────────────────────────── */}
      <Dialog open={!!detailsTarget} onOpenChange={open => { if (!open) setDetailsTarget(null) }}>
        <DialogContent className="max-w-lg">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#fdf6f0] border border-[#f0dcc8] flex items-center justify-center">
                <School className="h-5 w-5 text-[#c2440f]" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  {detailsTarget?.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-400 font-mono">/{detailsTarget?.slug}</DialogDescription>
              </div>
            </div>
          </div>

          {detailsTarget && (
            <div className="space-y-4">
              {/* Status */}
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                detailsTarget.settings?.onboardingCompleted
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                {detailsTarget.settings?.onboardingCompleted
                  ? <><CheckCircle className="h-4 w-4" /> Configuration wizard complétée</>
                  : <><Clock className="h-4 w-4" /> En attente — wizard non complété</>
                }
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-gray-400 mb-0.5">Membres</p>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                    <Users className="h-3.5 w-3.5 text-gray-500" />
                    {detailsTarget.memberCount}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-gray-400 mb-0.5">Créée le</p>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                    <Calendar className="h-3.5 w-3.5 text-gray-500" />
                    {new Date(detailsTarget.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-gray-400 mb-0.5">Année académique</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {(detailsTarget.settings?.academicYear as string | undefined) ?? '—'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-gray-400 mb-0.5">Trimestre actuel</p>
                  <p className="text-sm font-semibold text-gray-900">
                    T{(detailsTarget.settings?.currentTrimester as number | undefined) ?? '—'}
                  </p>
                </div>
              </div>

              {/* School ID */}
              <div className="space-y-1">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">ID École</p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <Hash className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-xs font-mono text-gray-600 flex-1 break-all">{detailsTarget.id}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(detailsTarget.id).then(() => toast.success('ID copié !'))}
                    className="shrink-0 text-xs font-medium text-[#c2440f] hover:text-[#a33a0d]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Pending admin */}
              {detailsTarget.pendingAdminEmail && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Lien d'invitation (admin en attente)</p>
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    Admin attendu : <strong>{detailsTarget.pendingAdminEmail}</strong>
                  </p>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <ExternalLink className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="text-xs font-mono text-gray-600 flex-1 break-all line-clamp-2">
                      {buildInviteUrl(detailsTarget.id, detailsTarget.pendingAdminEmail)}
                    </span>
                    <button
                      onClick={() => handleCopyInvite(detailsTarget)}
                      className="shrink-0 text-xs font-medium text-[#c2440f] hover:text-[#a33a0d]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setDetailsTarget(null); openEdit(detailsTarget) }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier
                </button>
                {detailsTarget.pendingAdminEmail && (
                  <button
                    onClick={() => { handleResend(detailsTarget); setDetailsTarget(null) }}
                    disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Renvoyer l'email
                  </button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-lg font-bold text-gray-900 mb-4">
            Modifier l'école
          </DialogTitle>
          <DialogDescription className="sr-only">
            Modifier le nom et le slug de l'école
          </DialogDescription>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Nom de l'école *</label>
              <input
                value={editName}
                onChange={e => {
                  setEditName(e.target.value)
                  if (editTarget && editSlug === autoSlug(editTarget.name)) {
                    setEditSlug(autoSlug(e.target.value))
                  }
                }}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Slug (identifiant URL) *</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 shrink-0">qafschool.com/</span>
                <input
                  value={editSlug}
                  onChange={e => setEditSlug(e.target.value)}
                  className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f] font-mono"
                />
              </div>
              <p className="text-xs text-amber-600">
                Modifier le slug change l'URL d'inscription publique.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmEdit}
                disabled={isPending || !editName.trim() || !editSlug.trim()}
                className="flex-1 px-4 py-2.5 bg-[#c2440f] text-white rounded-lg text-sm font-medium hover:bg-[#a33a0d] transition-colors disabled:opacity-60"
              >
                {isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ───────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-md">
          <div className="flex items-start gap-4 mb-5">
            <div className="h-10 w-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                Supprimer l'école ?
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-1">
                Cette action est irréversible. Tous les élèves, enseignants, classes et données associés seront définitivement supprimés.
              </DialogDescription>
            </div>
          </div>

          {deleteTarget && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-5 text-sm">
              <p className="font-semibold text-red-800">{deleteTarget.name}</p>
              <p className="text-red-600 font-mono text-xs mt-0.5">/{deleteTarget.slug}</p>
              {deleteTarget.memberCount > 0 && (
                <p className="text-red-600 text-xs mt-1">
                  {deleteTarget.memberCount} membre{deleteTarget.memberCount > 1 ? 's' : ''} seront supprimés.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={confirmDelete}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              {isPending ? 'Suppression…' : 'Supprimer définitivement'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
