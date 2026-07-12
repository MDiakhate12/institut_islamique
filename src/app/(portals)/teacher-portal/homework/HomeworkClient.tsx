'use client'

import { useState } from 'react'
import {
  BookOpen, Plus, Trash2, Pencil, Star, Video, Copy, Check,
  Radio, Users, Paperclip, ExternalLink, ClipboardList, MoreVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  usePinnedClasses, useHomework, useDeleteHomework,
  useRemovePinnedClass, useCreateVirtualSession, useEndVirtualSession, useActiveSession,
} from '@/modules/homework/homework.hooks'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { PinnedClass, ClassOption, HomeworkItem } from '@/modules/homework/homework.types'
import AddClassDialog from './AddClassDialog'
import HomeworkDialog from './HomeworkDialog'
import GradeDialog from './GradeDialog'

type Props = {
  initialPinnedClasses: PinnedClass[]
  initialClassOptions: ClassOption[]
  schoolId: string
  memberId: string
}

const SUBJECT_COLORS: Record<string, string> = {
  QRN: 'bg-emerald-100 text-emerald-800',
  NUR: 'bg-blue-100 text-blue-800',
  ARA: 'bg-purple-100 text-purple-800',
  ISL: 'bg-amber-100 text-amber-800',
}

export default function HomeworkClient({ initialPinnedClasses }: Props) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    initialPinnedClasses[0]?.classId ?? null
  )
  const [addClassOpen, setAddClassOpen] = useState(false)
  const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false)
  const [editingHomework, setEditingHomework] = useState<HomeworkItem | null>(null)
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false)
  const [gradingHomework, setGradingHomework] = useState<HomeworkItem | null>(null)
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null)

  const { data: pinnedClasses = initialPinnedClasses } = usePinnedClasses()
  const { data: homeworkItems = [], isLoading: loadingHw } = useHomework(selectedClassId ?? '')
  const { data: activeSession } = useActiveSession(selectedClassId ?? '')

  const deleteHw = useDeleteHomework(selectedClassId ?? '')
  const removePinned = useRemovePinnedClass()
  const createSession = useCreateVirtualSession(selectedClassId ?? '')
  const endSession = useEndVirtualSession(selectedClassId ?? '')

  const selectedPinned = pinnedClasses.find(c => c.classId === selectedClassId)

  async function handleDeleteHomework(id: string) {
    if (!confirm('Supprimer ce devoir ? Cette action est irréversible.')) return
    const result = await deleteHw.mutateAsync(id)
    if (!result.success) { toast.error(result.error); return }
    toast.success('Devoir supprimé')
  }

  async function handleRemoveClass(pinnedId: string, classId: string) {
    if (!confirm('Retirer cette classe de votre liste ?')) return
    const result = await removePinned.mutateAsync(pinnedId)
    if (!result.success) { toast.error(result.error); return }
    if (selectedClassId === classId) {
      setSelectedClassId(pinnedClasses.filter(c => c.pinnedId !== pinnedId)[0]?.classId ?? null)
    }
    toast.success('Classe retirée')
  }

  async function handleStartSession() {
    if (!selectedClassId) return
    const result = await createSession.mutateAsync()
    if (!result.success) { toast.error(result.error); return }
    toast.success('Session virtuelle créée !')
  }

  async function handleEndSession(sessionId: string) {
    if (!confirm('Terminer la session virtuelle ? Cette action est irréversible.')) return
    const result = await endSession.mutateAsync(sessionId)
    if (!result.success) { toast.error(result.error); return }
    toast.success('Session terminée')
  }

  async function handleCopyLink(sessionId: string, jitsiRoom: string) {
    const link = `https://meet.jit.si/${jitsiRoom}`
    await navigator.clipboard.writeText(link)
    setCopiedSessionId(sessionId)
    setTimeout(() => setCopiedSessionId(null), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-[#fdf6f0] min-h-screen">
      {/* Page header */}
      <div className="px-8 pt-8 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des devoirs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérer les devoirs pour vos classes</p>
        </div>
        <Button
          onClick={() => setAddClassOpen(true)}
          className="gap-2"
          style={{ backgroundColor: '#7a4f30' }}
        >
          <Plus className="w-4 h-4" />
          Ajouter une classe
        </Button>
      </div>

      <div className="flex flex-1 gap-6 px-8 pb-8">
        {/* ── Left: Class list ── */}
        <div className="w-72 flex-shrink-0">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Sélectionner une classe
          </h2>
          <div className="space-y-2">
            {pinnedClasses.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-3">Aucune classe ajoutée</p>
                <Button
                  size="sm"
                  onClick={() => setAddClassOpen(true)}
                  className="gap-1"
                  style={{ backgroundColor: '#7a4f30' }}
                >
                  <Plus className="w-3 h-3" />
                  Ajouter
                </Button>
              </div>
            ) : (
              pinnedClasses.map(cls => (
                <button
                  key={cls.pinnedId}
                  onClick={() => setSelectedClassId(cls.classId)}
                  className={cn(
                    'w-full text-left rounded-xl border p-3 transition-all group',
                    selectedClassId === cls.classId
                      ? 'border-orange-300 bg-white shadow-sm'
                      : 'border-gray-200 bg-white hover:border-orange-200 hover:shadow-sm',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className={cn(
                        'text-xs font-semibold px-1.5 py-0.5 rounded',
                        SUBJECT_COLORS[cls.subjectCode] ?? 'bg-gray-100 text-gray-700',
                      )}>
                        {cls.subjectCode}
                      </span>
                      <p className="text-sm font-semibold text-gray-900 mt-1 truncate">
                        {cls.catalogCode}
                      </p>
                      {cls.section && (
                        <p className="text-xs text-gray-500">Section {cls.section}</p>
                      )}
                      {cls.teacherName && (
                        <p className="text-xs text-gray-400 mt-0.5">Prof: {cls.teacherName}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                        {cls.homeworkCount} devoir{cls.homeworkCount !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveClass(cls.pinnedId, cls.classId) }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-0.5 rounded"
                        title="Retirer la classe"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Right: Content ── */}
        <div className="flex-1 min-w-0">
          {!selectedClassId ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Sélectionnez une classe</p>
              <p className="text-sm text-gray-400 mt-1">
                Choisissez une classe dans le panneau de gauche pour voir ses devoirs.
              </p>
            </div>
          ) : (
            <>
              {/* Class header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-gray-900">
                    {selectedPinned?.catalogCode ?? '—'}
                    {selectedPinned?.section ? ` — Section ${selectedPinned.section}` : ''}
                  </h2>
                  <span className="text-sm text-gray-400">|</span>
                  <span className="text-sm text-gray-500">
                    {homeworkItems.length} devoir{homeworkItems.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!activeSession && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStartSession}
                      disabled={createSession.isPending}
                      className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Démarrer un cours virtuel
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => { setEditingHomework(null); setHomeworkDialogOpen(true) }}
                    className="gap-1.5"
                    style={{ backgroundColor: '#c2440f' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter un devoir
                  </Button>
                </div>
              </div>

              {/* Virtual session card */}
              {activeSession && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-red-500 rounded-full p-1.5 mt-0.5">
                        <Radio className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                            En direct
                          </span>
                          <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            Hôte
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedPinned?.catalogCode ?? '—'} / Cours en ligne
                          {activeSession.createdByName ? ` / Par: ${activeSession.createdByName}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => window.open(`https://meet.jit.si/${activeSession.jitsiRoom}`, '_blank')}
                        className="gap-1.5 bg-red-600 hover:bg-red-700"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Démarrer la session
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyLink(activeSession.id, activeSession.jitsiRoom)}
                        className={cn(
                          'gap-1.5',
                          copiedSessionId === activeSession.id && 'text-green-600 border-green-300',
                        )}
                      >
                        {copiedSessionId === activeSession.id ? (
                          <><Check className="w-3.5 h-3.5" />Copié ✓</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5" />Copier le lien</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEndSession(activeSession.id)}
                        disabled={endSession.isPending}
                        className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Terminer
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Homework list */}
              {loadingHw ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-28" />
                  ))}
                </div>
              ) : homeworkItems.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium mb-1">Aucun devoir pour cette classe</p>
                  <p className="text-sm text-gray-400 mb-4">
                    Ajoutez le premier devoir de la classe.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => { setEditingHomework(null); setHomeworkDialogOpen(true) }}
                    className="gap-1.5"
                    style={{ backgroundColor: '#c2440f' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter un devoir
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {homeworkItems.map((hw, idx) => (
                    <HomeworkCard
                      key={hw.id}
                      number={homeworkItems.length - idx}
                      isNewest={idx === 0}
                      homework={hw}
                      onEdit={() => { setEditingHomework(hw); setHomeworkDialogOpen(true) }}
                      onDelete={() => handleDeleteHomework(hw.id)}
                      onGrade={() => { setGradingHomework(hw); setGradeDialogOpen(true) }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AddClassDialog open={addClassOpen} onClose={() => setAddClassOpen(false)} />

      <HomeworkDialog
        open={homeworkDialogOpen}
        onClose={() => { setHomeworkDialogOpen(false); setEditingHomework(null) }}
        classId={selectedClassId ?? ''}
        homework={editingHomework}
      />

      <GradeDialog
        open={gradeDialogOpen}
        onClose={() => { setGradeDialogOpen(false); setGradingHomework(null) }}
        homework={gradingHomework}
      />
    </div>
  )
}

// ── Homework card component ────────────────────────────────────────────────────

type CardProps = {
  number: number
  isNewest: boolean
  homework: HomeworkItem
  onEdit: () => void
  onDelete: () => void
  onGrade: () => void
}

function HomeworkCard({ number, isNewest, homework: hw, onEdit, onDelete, onGrade }: CardProps) {
  const hasNewSurah = !!hw.surahName
  const hasRevision = (hw.revisionSurahs?.length ?? 0) > 0
  const surahLabel = hw.surahName
    ? `${hw.surahName} - ${hw.surahArabic ?? ''}`
    : null

  const dateLabel = hw.assignedDate
    ? format(new Date(hw.assignedDate), 'EEEE, MMMM d, yyyy')
    : ''

  const fileSizeLabel = hw.fileSize
    ? hw.fileSize >= 1024 * 1024
      ? `${(hw.fileSize / (1024 * 1024)).toFixed(1)} MB`
      : `${(hw.fileSize / 1024).toFixed(0)} KB`
    : null

  const isPdf = hw.fileName?.toLowerCase().endsWith('.pdf')

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-500">#{number}</span>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span>📅</span>
            Assigned: {dateLabel}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={onGrade}
            className={cn(
              'gap-1.5 h-7 px-3 text-xs',
              isNewest
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-0'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-0',
            )}
          >
            <Star className="w-3 h-3" />
            {isNewest ? 'Grade' : 'View'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors focus:outline-none">
              <MoreVertical className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="w-36">
              <DropdownMenuItem onClick={onEdit} className="cursor-pointer gap-2">
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete} className="cursor-pointer gap-2">
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        {hasNewSurah && surahLabel && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
            {surahLabel}
          </span>
        )}
        {hasNewSurah && (
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
            New
          </span>
        )}
        {hasRevision && (
          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
            Révision
          </span>
        )}
      </div>

      <p className="text-sm font-medium text-gray-800 mb-1">{hw.title}</p>

      {hasRevision && (hw.revisionSurahs?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {(hw.revisionSurahs as Array<{ name: string; arabic: string }>).map(s => (
            <span key={s.name} className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
              {s.name}
            </span>
          ))}
        </div>
      )}

      {hw.description && (
        <p className="text-sm text-gray-500 mb-2">
          <span className="font-medium">Additional Notes: </span>{hw.description}
        </p>
      )}

      {hw.createdByName && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Users className="w-3 h-3" />
          By: {hw.createdByName}
        </div>
      )}

      {hw.fileUrl && hw.fileName && (
        <div className="mt-2 flex items-center gap-3 bg-blue-50 rounded-lg p-2.5 border border-blue-100">
          {isPdf ? (
            <span className="text-blue-500 font-bold text-[10px] bg-blue-100 rounded px-1 py-0.5 flex-shrink-0">PDF</span>
          ) : (
            <Paperclip className="w-4 h-4 text-blue-400 flex-shrink-0" />
          )}
          <span className="text-xs text-gray-700 flex-1 truncate font-medium">
            {hw.fileName}{fileSizeLabel ? ` (${fileSizeLabel})` : ''}
          </span>
          <a
            href={hw.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            View
          </a>
        </div>
      )}
    </div>
  )
}
