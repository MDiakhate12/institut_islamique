'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useRegistrationForm, useUpdateRegistrationForm, useResetRegistrationForm } from '@/modules/registrations/registrations.hooks'
import type { FormItem, FormType, InfoBlock, FormSection, RegistrationClassItem } from '@/modules/registrations/registrations.types'
import { Button } from '@/components/ui/button'
import { FormBuilder } from './FormBuilder'
import { AddInfoBlockDialog } from './AddInfoBlockDialog'
import { AddSectionDialog } from './AddSectionDialog'
import { Link, RefreshCw, ExternalLink, Plus, RotateCcw, RotateCw, Undo2, Redo2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { nanoid } from 'nanoid'

const TABS: { key: FormType; label: string }[] = [
  { key: 'new_student',  label: 'Nouvel élève' },
  { key: 'reenrollment', label: 'Réinscription' },
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

function TabContent({ formType, schoolSlug, classes }: { formType: FormType; schoolSlug: string; classes: RegistrationClassItem[] }) {
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
    if (!confirm('Réinitialiser le formulaire aux valeurs par défaut ?')) return
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
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Chargement du formulaire…
      </div>
    )
  }

  const itemCount = hist.current.length

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 pb-4 flex-wrap">
        {/* Tabs + count */}
        <div className="flex items-center gap-1">
          {TABS.map(tab => (
            <span key={tab.key} className="text-sm text-muted-foreground">
              {/* Tabs are at parent level, this is just the count indicator */}
            </span>
          ))}
          <span className="ml-2 text-xs text-muted-foreground bg-muted/60 border border-border rounded-full px-2 py-0.5 font-medium">
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
            Ajouter un bloc d'info
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setShowAddSection(true)}
            className="gap-1.5 text-xs h-8 bg-[#7a4f30] hover:bg-[#5c3820] text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter une section
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={reset.isPending}
            className="gap-1.5 text-xs h-8 text-[#c2440f] border-[#c2440f]/30 hover:bg-[#c2440f]/5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>

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
          Ce formulaire est conçu pour l'inscription d'<strong>un seul étudiant</strong>. Si vous avez plus d'un étudiant à inscrire, veuillez soumettre des formulaires séparés pour chacun d'eux.
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
    <div className="p-6 space-y-0">
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Créateur de formulaires d'inscription</h1>
        <p className="text-sm text-muted-foreground mt-1">Faites glisser pour réorganiser, cliquez pour modifier</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-[#c2440f] text-[#c2440f]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — key forces remount on tab change */}
      <TabContent key={activeTab} formType={activeTab} schoolSlug={schoolSlug} classes={classes} />
    </div>
  )
}
