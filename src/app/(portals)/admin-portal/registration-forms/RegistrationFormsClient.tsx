'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useRegistrationForm, useUpdateRegistrationForm, useResetRegistrationForm } from '@/modules/registrations/registrations.hooks'
import type { FormItem, FormType, InfoBlock, FormSection, RegistrationClassItem } from '@/modules/registrations/registrations.types'
import { Button } from '@/components/ui/button'
import { FormBuilder } from './FormBuilder'
import { AddInfoBlockDialog } from './AddInfoBlockDialog'
import { AddSectionDialog } from './AddSectionDialog'
import { Link, RefreshCw, ExternalLink, Plus, RotateCcw, Undo2, Redo2, Info, Users, AlertTriangle } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { nanoid } from 'nanoid'
import { PageLoader } from '@/components/shared/Loader/PageLoader'

const TABS: { key: FormType; label: string; icon: typeof Users }[] = [
  { key: 'new_student',  label: 'Nouvel élève',  icon: Users },
  { key: 'reenrollment', label: 'Réinscription', icon: RefreshCw },
]

// ── History hook ───────────────────────────────────────────────────────────────

function useHistory(initial: FormItem[]) {
  const [history, setHistory] = useState<FormItem[][]>([initial])
  const [cursor, setCursor]   = useState(0)
  const current = history[cursor]

  function push(items: FormItem[]) {
    const next = history.slice(0, cursor + 1)
    next.push(items)
    setHistory(next)
    setCursor(next.length - 1)
  }
  function undo() { if (cursor > 0) setCursor(c => c - 1) }
  function redo() { if (cursor < history.length - 1) setCursor(c => c + 1) }
  const canUndo = cursor > 0
  const canRedo = cursor < history.length - 1

  // Reset when initial changes (new tab load)
  function reset(items: FormItem[]) {
    setHistory([items])
    setCursor(0)
  }

  return { current, push, undo, redo, canUndo, canRedo, reset }
}

// ── Tab content ────────────────────────────────────────────────────────────────

function TabContent({ formType, schoolSlug, classes, activeTab, onTabChange }: {
  formType: FormType
  schoolSlug: string
  classes: RegistrationClassItem[]
  activeTab: FormType
  onTabChange: (tab: FormType) => void
}) {
  const { data: form, isLoading } = useRegistrationForm(formType)
  const update = useUpdateRegistrationForm()
  const reset  = useResetRegistrationForm()
  const hist = useHistory(form?.formSchema ?? [])

  const [showAddInfoBlock, setShowAddInfoBlock] = useState(false)
  const [showAddSection,   setShowAddSection]   = useState(false)

  // When form loads from server, reset history
  const initialized = useRef(false)
  useEffect(() => {
    if (form && !initialized.current) {
      hist.reset(form.formSchema)
      initialized.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id])

  // Auto-save with debounce
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const handleChange = useCallback((items: FormItem[]) => {
    hist.push(items)
    clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      update.mutate({ formType, schema: items }, {
        onSuccess: () => {},
        onError: () => toast.error('Erreur lors de la sauvegarde'),
      })
    }, 1200)
  }, [hist, formType, update])

  function handleReset() {
    reset.mutate(formType, {
      onSuccess: (data) => hist.reset(data.formSchema),
    })
  }

  function handleAddInfoBlock(data: Omit<InfoBlock, 'id'>) {
    const newItem: InfoBlock = { ...data, id: `ib-${nanoid(8)}` }
    handleChange([...hist.current, newItem])
  }

  function handleAddSection(data: Omit<FormSection, 'id'>) {
    const newItem: FormSection = { ...data, id: `section-${nanoid(8)}` }
    handleChange([...hist.current, newItem])
  }

  function copyLink() {
    const suffix = formType === 'reenrollment' ? '/reenroll' : ''
    const url = `${window.location.origin}/portal/register/${schoolSlug}${suffix}`
    navigator.clipboard.writeText(url).then(() => toast.success('Lien copié !'))
  }

  if (isLoading) {
    return <PageLoader />
  }

  const itemCount = hist.current.length

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 pb-4 flex-wrap">
        {/* Tabs + item count */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1 p-1 bg-[#f4f9f3] border border-border/60 rounded-xl">
            {TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  activeTab === tab.key
                    ? 'bg-white text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-muted-foreground bg-muted/60 border border-border rounded-full px-2 py-0.5 font-medium">
            {itemCount} élément{itemCount > 1 ? 's' : ''}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddInfoBlock(true)}
            className="gap-1.5 text-xs h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un bloc d&apos;info
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setShowAddSection(true)}
            className="gap-1.5 text-xs h-8 bg-[#2d6a4f] hover:bg-[#1e4535] text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter une section
          </Button>

          <AlertDialog>
            <AlertDialogTrigger render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={reset.isPending}
                className="gap-1.5 text-xs h-8 text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Réinitialiser
              </Button>
            } />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Réinitialiser le formulaire ?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action supprime <strong>toutes les sections et champs personnalisés</strong> et restaure le formulaire par défaut. Cette opération est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Réinitialiser
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={() => {
              const suffix = formType === 'reenrollment' ? '/reenroll' : ''
              window.open(`/portal/register/${schoolSlug}${suffix}?preview=true`, '_blank')
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Aperçu
          </Button>
        </div>
      </div>

      {/* ── System notice ── */}
      <div className="mb-4 flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Ce formulaire est conçu pour l&apos;inscription d&apos;<strong>un seul étudiant</strong>. Si vous avez plus d&apos;un étudiant à inscrire, veuillez soumettre des formulaires séparés pour chacun d&apos;eux.
        </p>
      </div>

      {/* ── Form builder ── */}
      <div className="flex-1 pb-20">
        <FormBuilder
          items={hist.current}
          formType={formType}
          onChange={handleChange}
          classes={classes}
        />
      </div>

      {/* ── Floating bottom toolbar (undo/redo/copy link) ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 bg-white border border-border rounded-xl shadow-lg px-3 py-2">
          <button
            type="button"
            onClick={hist.undo}
            disabled={!hist.canUndo}
            title="Annuler"
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              hist.canUndo
                ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                : 'text-muted-foreground/30 cursor-not-allowed'
            )}
          >
            <Undo2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={hist.redo}
            disabled={!hist.canRedo}
            title="Rétablir"
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              hist.canRedo
                ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                : 'text-muted-foreground/30 cursor-not-allowed'
            )}
          >
            <Redo2 className="h-4 w-4" />
          </button>

          <div className="w-px h-4 bg-border mx-0.5" />

          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Link className="h-3.5 w-3.5" />
            Copier le lien
          </button>

          {update.isPending && (
            <>
              <div className="w-px h-4 bg-border mx-0.5" />
              <span className="text-xs text-muted-foreground px-1 flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Sauvegarde…
              </span>
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AddInfoBlockDialog
        open={showAddInfoBlock}
        onOpenChange={setShowAddInfoBlock}
        onAdd={handleAddInfoBlock}
      />
      <AddSectionDialog
        open={showAddSection}
        onOpenChange={setShowAddSection}
        onAdd={handleAddSection}
      />
    </div>
  )
}

// ── Root client ────────────────────────────────────────────────────────────────

export function RegistrationFormsClient({ schoolSlug, classes }: { schoolSlug: string; classes: RegistrationClassItem[] }) {
  const [activeTab, setActiveTab] = useState<FormType>('new_student')

  return (
    <div className="p-4 sm:p-6 space-y-0">
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Créateur de formulaires d&apos;inscription</h1>
        <p className="text-sm text-muted-foreground mt-1">Faites glisser pour réorganiser, cliquez pour modifier</p>
      </div>

      {/* Tab content — key forces remount on tab change */}
      <TabContent
        key={activeTab}
        formType={activeTab}
        schoolSlug={schoolSlug}
        classes={classes}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  )
}
