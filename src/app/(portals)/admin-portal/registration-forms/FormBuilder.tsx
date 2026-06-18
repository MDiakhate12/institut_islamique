'use client'

import { useState, useCallback } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = Record<string, any>
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown, ChevronRight, GripVertical, Pencil, Trash2, Lock,
  Plus, Info, AlertTriangle, CheckCircle, XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AddInfoBlockDialog } from './AddInfoBlockDialog'
import { AddSectionDialog } from './AddSectionDialog'
import { AddFieldDialog } from './AddFieldDialog'
import type {
  FormItem, FormSection, InfoBlock, FormField, CustomField, FormType,
  InfoBlockStyle,
} from '@/modules/registrations/registrations.types'

// ── Style config ───────────────────────────────────────────────────────────────

const INFO_BLOCK_STYLES: Record<InfoBlockStyle, {
  bg: string; border: string; icon: React.ReactNode; titleColor: string
}> = {
  info:    { bg: 'bg-blue-50',    border: 'border-blue-200',   icon: <Info         className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />, titleColor: 'text-blue-700' },
  warning: { bg: 'bg-amber-50',   border: 'border-amber-200',  icon: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />, titleColor: 'text-amber-700' },
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle  className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />, titleColor: 'text-emerald-700' },
  error:   { bg: 'bg-red-50',     border: 'border-red-200',    icon: <XCircle      className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />,    titleColor: 'text-red-700' },
}

// ── Field row ──────────────────────────────────────────────────────────────────

function FieldRow({
  field, onDelete, onEdit, listeners, attributes, style: dragStyle, isOver,
}: {
  field: FormField
  onDelete?: () => void
  onEdit?: () => void
  listeners?: AnyProps
  attributes?: AnyProps
  style?: React.CSSProperties
  isOver?: boolean
}) {
  const isSystem = field.kind === 'system_field'

  return (
    <div
      style={dragStyle}
      className={cn(
        'group relative flex items-start gap-3 px-4 py-3',
        'border-b border-border/50 last:border-b-0',
        isOver && 'bg-[#c2440f]/5',
      )}
    >
      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        type="button"
        className="mt-1 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-foreground">{field.label}</span>
          {field.required && <span className="text-[#c2440f] text-sm font-medium">*</span>}
          {isSystem && <Lock className="h-3 w-3 text-amber-500 shrink-0" />}
        </div>
        {!isSystem && field.kind === 'custom_field' && field.placeholder && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Espace réservé : {field.placeholder}
          </p>
        )}
        {isSystem && 'placeholder' in field && field.placeholder && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Espace réservé : {field.placeholder}
          </p>
        )}
        {field.note && (
          <p className="text-xs text-muted-foreground/70 italic mt-1">{field.note}</p>
        )}
        {field.options && field.type === 'radio' && (
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {field.options.map(opt => (
              <span key={opt} className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground border border-border">
                {opt}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right badges/actions */}
      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
        {isSystem
          ? <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">Système</span>
          : (
            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
              <button type="button" onClick={onEdit} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {onDelete && (
                <button type="button" onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )
        }
      </div>
    </div>
  )
}

// ── Sortable field row ─────────────────────────────────────────────────────────

function SortableFieldRow({ field, onDelete, onEdit }: { field: FormField; onDelete?: () => void; onEdit?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isOver } = useSortable({ id: field.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <FieldRow
        field={field}
        onDelete={onDelete}
        onEdit={onEdit}
        listeners={listeners}
        attributes={attributes}
        isOver={isOver}
      />
    </div>
  )
}

// ── Class selection preview (system section) ───────────────────────────────────

function ClassSelectionPreview({ formType }: { formType: FormType }) {
  if (formType === 'reenrollment') {
    return (
      <div className="px-4 py-4 flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Le placement en classe est géré automatiquement par le système.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Nous vous déplacerons automatiquement ou enregistrerons les classes en fonction de vos antécédents académiques précédents. Aucune sélection manuelle n'est requise.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-5 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center">
          <span className="text-[9px] font-bold text-emerald-600">✓</span>
        </div>
        <span className="text-xs text-muted-foreground italic">Class Selection (Preview From Catalog)</span>
      </div>
      <div className="space-y-2">
        {(['QRN', 'ARA', 'NUR'] as const).map(code => (
          <div key={code} className="flex items-center gap-2">
            <div className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded',
              code === 'QRN' ? 'bg-emerald-100 text-emerald-700' :
              code === 'ARA' ? 'bg-purple-100 text-purple-700' :
              'bg-orange-100 text-orange-700'
            )}>{code}</div>
            <span className="text-xs text-muted-foreground">Select {code} Class</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Section block ──────────────────────────────────────────────────────────────

function SectionBlock({
  section, formType, onUpdateFields, onEdit, onDelete,
  listeners, attributes, style: dragStyle,
}: {
  section: FormSection
  formType: FormType
  onUpdateFields: (fields: FormField[]) => void
  onEdit: () => void
  onDelete?: () => void
  listeners?: AnyProps
  attributes?: AnyProps
  style?: React.CSSProperties
}) {
  const [expanded, setExpanded] = useState(true)
  const sensors = useSensors(useSensor(PointerSensor))
  const [addingField,  setAddingField]  = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)

  const fieldCount = section.fields.length
  const isClassSection = section.systemKey === 'class_selection'
  const totalCount = isClassSection ? '— Automatique' : `${fieldCount} champ${fieldCount > 1 ? 's' : ''}`

  function handleFieldDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = section.fields.findIndex(f => f.id === active.id)
      const newIndex = section.fields.findIndex(f => f.id === over.id)
      onUpdateFields(arrayMove(section.fields, oldIndex, newIndex))
    }
  }

  function deleteField(fieldId: string) {
    onUpdateFields(section.fields.filter(f => f.id !== fieldId))
  }

  function addField(field: CustomField) {
    onUpdateFields([...section.fields, field])
  }

  function updateField(field: CustomField) {
    onUpdateFields(section.fields.map(f => f.id === field.id ? field : f))
  }

  return (
    <div style={dragStyle} className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
      {/* Section header */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-3',
        section.isSystem ? 'bg-amber-50/60' : 'bg-muted/20'
      )}>
        {/* Drag handle */}
        <button {...listeners} {...attributes} type="button"
          className="text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Collapse toggle */}
        {!isClassSection && (
          <button type="button" onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground/60 hover:text-muted-foreground">
            {expanded
              ? <ChevronDown  className="h-4 w-4" />
              : <ChevronRight className="h-4 w-4" />
            }
          </button>
        )}

        {/* Lock icon for system */}
        {section.isSystem && (
          <div className="h-6 w-6 rounded bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
            <Lock className="h-3.5 w-3.5 text-amber-600" />
          </div>
        )}

        {/* Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm text-foreground truncate">{section.title}</span>
            {section.isSystem && <Lock className="h-3 w-3 text-amber-500 shrink-0" />}
          </div>
          {section.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
          )}
          {!section.description && (
            <p className="text-xs text-muted-foreground">{totalCount}</p>
          )}
        </div>

        {/* Right: badge + edit */}
        <div className="flex items-center gap-2 shrink-0">
          {section.isSystem && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              Système
            </span>
          )}
          <button type="button" onClick={onEdit}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {!section.isSystem && onDelete && (
            <button type="button" onClick={onDelete}
              className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Section body */}
      {(expanded || isClassSection) && (
        <div className="border-t border-border/50">
          {/* Auto-populated notice for reenrollment student info */}
          {section.systemKey === 'student_info' && formType === 'reenrollment' && (
            <div className="px-4 py-2.5 bg-muted/10 border-b border-border/50">
              <p className="text-xs text-muted-foreground font-medium">
                ℹ️ Auto-populated Fields (Read-only)
              </p>
              <div className="mt-1.5 space-y-0.5">
                {['Student Name', 'Student ID', 'Gender', 'Date of Birth', "Father's Name", "Mother's Name", 'Email', 'Phone'].map(f => (
                  <div key={f} className="flex items-center justify-between py-0.5">
                    <span className="text-xs text-foreground">{f}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">Auto-filled</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Class section preview */}
          {isClassSection && <ClassSelectionPreview formType={formType} />}

          {/* Fields */}
          {!isClassSection && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFieldDragEnd}>
              <SortableContext items={section.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                {section.fields.map(field => (
                  <SortableFieldRow
                    key={field.id}
                    field={field}
                    onDelete={field.kind === 'custom_field' ? () => deleteField(field.id) : undefined}
                    onEdit={field.kind === 'custom_field' ? () => setEditingField(field) : undefined}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}

          {/* Add question button */}
          {!isClassSection && (
            <div className="px-4 py-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setAddingField(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#c2440f] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une question à la section
              </button>
            </div>
          )}

          {/* Add field dialog */}
          <AddFieldDialog
            open={addingField}
            onOpenChange={setAddingField}
            onAdd={addField}
          />

          {/* Edit field dialog */}
          {editingField && (
            <AddFieldDialog
              open={!!editingField}
              onOpenChange={v => !v && setEditingField(null)}
              existing={editingField}
              onAdd={updateField}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Sortable section wrapper ───────────────────────────────────────────────────

function SortableSectionBlock(props: Parameters<typeof SectionBlock>[0]) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.section.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <SectionBlock
        {...props}
        listeners={listeners}
        attributes={attributes}
      />
    </div>
  )
}

// ── Info block row ─────────────────────────────────────────────────────────────

function InfoBlockRow({
  block, onEdit, onDelete,
  listeners, attributes, style: dragStyle,
}: {
  block: InfoBlock
  onEdit: () => void
  onDelete?: () => void
  listeners?: AnyProps
  attributes?: AnyProps
  style?: React.CSSProperties
}) {
  const cfg = INFO_BLOCK_STYLES[block.style]

  return (
    <div style={dragStyle} className={cn('group rounded-xl border p-4 relative', cfg.bg, cfg.border)}>
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button {...listeners} {...attributes} type="button"
          className="text-muted-foreground/30 hover:text-muted-foreground cursor-grab mt-0.5 shrink-0">
          <GripVertical className="h-4 w-4" />
        </button>

        {cfg.icon}

        <div className="flex-1 min-w-0">
          {block.title && (
            <p className={cn('text-sm font-semibold mb-1', cfg.titleColor)}>{block.title}</p>
          )}
          <div
            className="text-sm text-foreground/80 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:underline [&_p]:mb-1 [&_p:last-child]:mb-0"
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
        </div>

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity shrink-0">
          <button type="button" onClick={onEdit}
            className="p-1 rounded hover:bg-white/60 text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {!block.isSystem && onDelete && (
            <button type="button" onClick={onDelete}
              className="p-1 rounded hover:bg-white/60 text-muted-foreground hover:text-red-600 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SortableInfoBlockRow(props: Parameters<typeof InfoBlockRow>[0]) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.block.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <InfoBlockRow
        {...props}
        listeners={listeners}
        attributes={attributes}
      />
    </div>
  )
}

// ── Main builder ───────────────────────────────────────────────────────────────

interface FormBuilderProps {
  items: FormItem[]
  formType: FormType
  onChange: (items: FormItem[]) => void
}

export function FormBuilder({ items, formType, onChange }: FormBuilderProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [editingInfoBlock, setEditingInfoBlock] = useState<InfoBlock | null>(null)
  const [editingSection,   setEditingSection]   = useState<FormSection | null>(null)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id)
      const newIndex = items.findIndex(i => i.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove(items, oldIndex, newIndex))
      }
    }
  }

  const updateSection = useCallback((sectionId: string, fields: FormField[]) => {
    onChange(items.map(item =>
      item.kind === 'section' && item.id === sectionId
        ? { ...item, fields }
        : item
    ))
  }, [items, onChange])

  const updateSectionMeta = useCallback((sectionId: string, patch: Partial<FormSection>) => {
    onChange(items.map(item =>
      item.kind === 'section' && item.id === sectionId
        ? { ...item, ...patch }
        : item
    ))
  }, [items, onChange])

  const deleteItem = useCallback((id: string) => {
    onChange(items.filter(i => i.id !== id))
  }, [items, onChange])

  const updateInfoBlock = useCallback((id: string, data: Omit<InfoBlock, 'id'>) => {
    onChange(items.map(i => i.id === id ? { ...data, id } : i))
  }, [items, onChange])

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map(item => {
              if (item.kind === 'section') {
                return (
                  <SortableSectionBlock
                    key={item.id}
                    section={item}
                    formType={formType}
                    onUpdateFields={(fields) => updateSection(item.id, fields)}
                    onEdit={() => setEditingSection(item)}
                    onDelete={!item.isSystem ? () => deleteItem(item.id) : undefined}
                  />
                )
              }
              return (
                <SortableInfoBlockRow
                  key={item.id}
                  block={item}
                  onEdit={() => setEditingInfoBlock(item)}
                  onDelete={!item.isSystem ? () => deleteItem(item.id) : undefined}
                />
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Edit info block */}
      {editingInfoBlock && (
        <AddInfoBlockDialog
          open={!!editingInfoBlock}
          onOpenChange={v => !v && setEditingInfoBlock(null)}
          existing={editingInfoBlock}
          onAdd={(data) => updateInfoBlock(editingInfoBlock.id, data as InfoBlock)}
        />
      )}

      {/* Edit section */}
      {editingSection && (
        <AddSectionDialog
          open={!!editingSection}
          onOpenChange={v => !v && setEditingSection(null)}
          existing={editingSection}
          onAdd={(data) => {
            updateSectionMeta(editingSection.id, { title: data.title, description: data.description })
          }}
        />
      )}
    </>
  )
}
