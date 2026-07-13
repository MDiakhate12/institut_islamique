'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Bold, Italic, Strikethrough, List, ListOrdered, Link, Undo, Redo, ImageIcon, Users, Baby, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateAnnouncement, useUpdateAnnouncement } from '@/modules/announcements/announcements.hooks'
import { createClient } from '@/lib/supabase/client'
import type { Announcement } from '@/modules/announcements/announcements.types'
import { toast } from 'sonner'

// ── Rich text editor ──────────────────────────────────────────────────────────

interface EditorProps {
  value: string
  onChange: (html: string) => void
}

function AnnouncementEditor({ value, onChange }: EditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const lastValue = useRef(value)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exec = useCallback((cmd: string, val?: string) => {
    ref.current?.focus()
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand(cmd, false, val)
    const html = ref.current?.innerHTML ?? ''
    lastValue.current = html
    onChange(html)
  }, [onChange])

  const handleInput = useCallback(() => {
    const html = ref.current?.innerHTML ?? ''
    if (html !== lastValue.current) {
      lastValue.current = html
      onChange(html)
    }
  }, [onChange])

  const insertAtCursor = useCallback((html: string) => {
    ref.current?.focus()
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand('insertHTML', false, html)
    const newHtml = ref.current?.innerHTML ?? ''
    lastValue.current = newHtml
    onChange(newHtml)
  }, [onChange])

  const applyHighlight = useCallback(() => {
    ref.current?.focus()
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand('hiliteColor', false, '#fef08a')
    }
    const html = ref.current?.innerHTML ?? ''
    lastValue.current = html
    onChange(html)
  }, [onChange])

  const now = new Date()
  const monthYear = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const PRESETS = [
    { label: 'Surligner', action: applyHighlight },
    { label: 'Important', action: () => insertAtCursor('<p><span style="color:#c2440f"><strong>⚠️ Important:</strong></span></p>') },
    { label: 'Rappel', action: () => insertAtCursor('<p><span style="color:#c2440f"><strong>🔔 Reminder:</strong></span></p>') },
    { label: 'Action requise', action: () => insertAtCursor('<p><span style="color:#16a34a"><strong>✅ Action Required:</strong></span></p>') },
    { label: 'Date et heure', action: () => insertAtCursor(`<p><span style="color:#c2440f">📅 Date: <em>${monthYear.charAt(0).toUpperCase() + monthYear.slice(1)}</em> ⏰ Time: <em>12h 00</em></span></p>`) },
    { label: 'Séparateur', action: () => insertAtCursor('<hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0"/>') },
  ]

  return (
    <div className="border border-border rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
        <button type="button" title="Titre 1" onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'h1') }}
          className="h-7 px-1.5 rounded text-xs font-bold hover:bg-muted text-muted-foreground hover:text-foreground">H1</button>
        <button type="button" title="Titre 2" onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'h2') }}
          className="h-7 px-1.5 rounded text-xs font-bold hover:bg-muted text-muted-foreground hover:text-foreground">H2</button>
        <div className="w-px h-4 bg-border mx-0.5" />
        {[
          { icon: Bold,          cmd: 'bold',          title: 'Gras' },
          { icon: Italic,        cmd: 'italic',        title: 'Italique' },
          { icon: Strikethrough, cmd: 'strikeThrough', title: 'Barré' },
        ].map(({ icon: Icon, cmd, title }) => (
          <button key={cmd} type="button" title={title}
            onMouseDown={e => { e.preventDefault(); exec(cmd) }}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground">
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
        <div className="w-px h-4 bg-border mx-0.5" />
        <button type="button" title="Liste" onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList') }}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground">
          <List className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Liste numérotée" onMouseDown={e => { e.preventDefault(); exec('insertOrderedList') }}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground">
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Lien" onMouseDown={e => { e.preventDefault(); const url = window.prompt('URL :'); if (url) exec('createLink', url) }}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground">
          <Link className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button type="button" title="Annuler" onMouseDown={e => { e.preventDefault(); exec('undo') }}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground">
          <Undo className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Rétablir" onMouseDown={e => { e.preventDefault(); exec('redo') }}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground">
          <Redo className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Preset buttons */}
      <div className="flex items-center flex-wrap gap-1 px-2 py-1.5 border-b border-border bg-muted/10">
        {PRESETS.map(p => (
          <button key={p.label} type="button"
            onMouseDown={e => { e.preventDefault(); p.action() }}
            className="text-xs px-2 py-0.5 rounded border border-border hover:border-[#c2440f] hover:text-[#c2440f] text-muted-foreground transition-colors">
            {p.label}
          </button>
        ))}
      </div>

      {/* Editable area */}
      <div className="relative">
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          style={{ minHeight: '200px' }}
          className={cn(
            'px-3 py-2.5 text-sm focus:outline-none',
            '[&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4',
            '[&_a]:text-[#c2440f] [&_a]:underline',
            '[&_strong]:font-semibold',
            '[&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold',
            '[&_hr]:border-t [&_hr]:border-gray-200 [&_hr]:my-2',
          )}
        />
        {!value && (
          <p className="absolute top-2.5 left-3 text-sm text-muted-foreground pointer-events-none select-none">
            Rédigez votre message...
          </p>
        )}
      </div>
    </div>
  )
}

// ── Audience selector ─────────────────────────────────────────────────────────

const AUDIENCE_OPTIONS = [
  { value: 'everyone',  label: 'Tous',       icon: Users,          desc: 'Parents et Personnel' },
  { value: 'parents',   label: 'Parents',     icon: Baby,           desc: 'Parents uniquement' },
  { value: 'teachers',  label: 'Personnel',   icon: GraduationCap,  desc: 'Enseignants uniquement' },
] as const

// ── Main dialog ───────────────────────────────────────────────────────────────

interface Props {
  schoolName: string
  announcement?: Announcement
  onClose: () => void
  onSaved: () => void
}

export function AnnouncementDialog({ schoolName, announcement, onClose, onSaved }: Props) {
  const isEdit = !!announcement
  const [title, setTitle] = useState(announcement?.title ?? '')
  const [content, setContent] = useState(announcement?.content ?? '')
  const [audience, setAudience] = useState<'everyone' | 'parents' | 'teachers'>(
    (announcement?.audience === 'admins' ? 'everyone' : announcement?.audience) ?? 'everyone'
  )
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(announcement?.imageUrl ?? null)
  const [submitting, setSubmitting] = useState(false)

  const createMutation = useCreateAnnouncement()
  const updateMutation = useUpdateAnnouncement()

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage(file: File, announcementId: string): Promise<string | null> {
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `announcements/${announcementId}.${ext}`
    const { error } = await supabase.storage
      .from('public')
      .upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('public').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    setSubmitting(true)
    try {
      let imageUrl = announcement?.imageUrl ?? null

      if (isEdit) {
        // For edits: upload new image if changed
        if (imageFile) {
          imageUrl = await uploadImage(imageFile, announcement.id)
        }
        const result = await updateMutation.mutateAsync({
          id: announcement.id,
          input: { title, content, audience, imageUrl },
        })
        if (!result.success) { toast.error(result.error); return }
        toast.success("Annonce mise à jour !")
      } else {
        // Create first, then upload image
        const result = await createMutation.mutateAsync({ title, content, audience, imageUrl: null })
        if (!result.success) { toast.error(result.error); return }
        // Upload image and update if provided
        if (imageFile) {
          const url = await uploadImage(imageFile, result.data.id)
          if (url) {
            await updateMutation.mutateAsync({ id: result.data.id, input: { imageUrl: url } })
          }
        }
        toast.success("Annonce créée !")
      }
      onSaved()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3 p-6 border-b border-border">
          <div className="h-10 w-10 rounded-full bg-[#fdf6f0] border border-[#f0dcc8] flex items-center justify-center shrink-0">
            <span className="text-lg">📢</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-[#7a4f30] text-base">
              {isEdit ? "Modifier l'annonce" : `Envoyer une annonce à ${schoolName}`}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Les destinataires reçoivent une notification instantanée et la publication apparaît sur le fil d&apos;actualités.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="ex. : Mise à jour importante"
            className="w-full text-xl font-semibold text-[#c2440f] placeholder:text-[#c2440f]/40 border-none outline-none bg-transparent"
          />

          {/* Content */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
              Contenu
            </label>
            <AnnouncementEditor value={content} onChange={setContent} />
          </div>

          {/* Audience */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
              Public cible
            </label>
            <div className="grid grid-cols-3 gap-2 border border-border rounded-xl p-2">
              {AUDIENCE_OPTIONS.map(opt => {
                const Icon = opt.icon
                const selected = audience === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAudience(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg transition-colors',
                      selected
                        ? 'bg-[#fdf6f0] border border-[#f0dcc8]'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', selected ? 'text-[#c2440f]' : 'text-muted-foreground')} />
                    <span className={cn('text-sm font-medium', selected ? 'text-[#c2440f]' : 'text-muted-foreground')}>
                      {opt.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
              Image (optionnel)
            </label>
            {imagePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="" className="w-full max-h-48 object-cover rounded-lg border border-border" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow border border-border text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg py-4 flex flex-col items-center gap-2 text-muted-foreground hover:border-[#c2440f] hover:text-[#c2440f] transition-colors"
              >
                <ImageIcon className="h-5 w-5" />
                <span className="text-sm">Sélectionner une image</span>
                <span className="text-xs">Cliquez pour sélectionner ou collez une image (Ctrl+V)</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            {imageFile && (
              <p className="text-xs text-muted-foreground mt-1">
                Sélectionné : {imageFile.name} ({(imageFile.size / 1024).toFixed(0)} Ko)
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 bg-[#c2440f] hover:bg-[#a33a0d] disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <span>📢</span>
              {submitting ? 'Envoi...' : isEdit ? "Mettre à jour l'annonce" : "Envoyer l'annonce"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
