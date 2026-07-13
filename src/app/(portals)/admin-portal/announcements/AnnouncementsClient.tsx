'use client'

import { useState } from 'react'
import { Megaphone, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useAnnouncements, useDeleteAnnouncement } from '@/modules/announcements/announcements.hooks'
import { AnnouncementFeed } from '@/components/shared/AnnouncementFeed'
import { AnnouncementDialog } from './AnnouncementDialog'
import type { Announcement } from '@/modules/announcements/announcements.types'

interface Props {
  schoolName: string
}

export function AnnouncementsClient({ schoolName }: Props) {
  const { data: announcements = [], isLoading } = useAnnouncements('admin')
  const deleteMutation = useDeleteAnnouncement()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Announcement | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)

  function openCreate() {
    setEditTarget(undefined)
    setDialogOpen(true)
  }

  function openEdit(a: Announcement) {
    setEditTarget(a)
    setDialogOpen(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const result = await deleteMutation.mutateAsync(deleteTarget.id)
    if (!result.success) { toast.error(result.error); return }
    toast.success('Annonce supprimée')
    setDeleteTarget(null)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Megaphone className="h-7 w-7 text-[#c2440f]" />
            <h1 className="text-2xl font-bold text-[#7a4f30]">Annonces</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <span>🔔</span>
            Publier une annonce envoie une notification push instantanée au public sélectionné.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#c2440f] hover:bg-[#a33a0d] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Créer une annonce
        </button>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-40 rounded-xl border border-border bg-white animate-pulse" />
          ))}
        </div>
      ) : (
        <AnnouncementFeed
          announcements={announcements}
          onEdit={openEdit}
          onDelete={a => setDeleteTarget(a)}
        />
      )}

      {/* Create/Edit dialog */}
      {dialogOpen && (
        <AnnouncementDialog
          schoolName={schoolName}
          announcement={editTarget}
          onClose={() => setDialogOpen(false)}
          onSaved={() => setDialogOpen(false)}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Supprimer l&apos;annonce ?</h2>
            <p className="text-sm text-muted-foreground">
              Cette action est irréversible. L&apos;annonce &quot;{deleteTarget.title}&quot; sera définitivement supprimée.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                Annuler
              </button>
              <button onClick={confirmDelete} disabled={deleteMutation.isPending}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
