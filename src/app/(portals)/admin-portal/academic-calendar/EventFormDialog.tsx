'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { format } from 'date-fns'
import {
  useCreateEvent, useUpdateEvent, useDeleteEvent, useDuplicateEvent,
} from '@/modules/calendar/calendar.hooks'
import { EVENT_TYPE_CONFIG, EVENT_TYPES } from '@/modules/calendar/calendar.types'
import type { AcademicEvent, EventType } from '@/modules/calendar/calendar.types'
import type { CreateEventInput } from '@/modules/calendar/calendar.schema'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** If provided → edit mode */
  event?: AcademicEvent
  /** Pre-fill date when clicking a day cell */
  defaultDate?: string
}

const EVENT_TYPE_ROWS: EventType[][] = [
  ['exam', 'meeting', 'fun_event', 'holiday'],
  ['open_house', 'ceremony', 'beginning', 'closed'],
  ['lecture', 'other'],
]

export function EventFormDialog({ open, onOpenChange, event, defaultDate }: Props) {
  const isEdit = !!event
  const create = useCreateEvent()
  const update = useUpdateEvent()
  const del    = useDeleteEvent()
  const dup    = useDuplicateEvent()

  const defaultValues: CreateEventInput = {
    title:       event?.title ?? '',
    type:        (event?.type as EventType) ?? 'exam',
    startDate:   event?.startDate ?? defaultDate ?? format(new Date(), 'yyyy-MM-dd'),
    endDate:     event?.endDate ?? undefined,
    startTime:   event?.startTime ?? '09:00',
    endTime:     event?.endTime ?? '10:00',
    isAllDay:    event?.isAllDay ?? false,
    location:    event?.location ?? '',
    description: event?.description ?? '',
    isHidden:    event?.isHidden ?? false,
  }

  const { register, control, watch, handleSubmit, reset, setValue, formState: { errors } } =
    useForm<CreateEventInput>({ defaultValues })

  useEffect(() => {
    if (open) reset(defaultValues)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event?.id])

  const selectedType = watch('type')
  const isAllDay     = watch('isAllDay')

  async function onSubmit(data: CreateEventInput) {
    if (isEdit && event) {
      const result = await update.mutateAsync({ id: event.id, ...data })
      if (result.success) onOpenChange(false)
    } else {
      const result = await create.mutateAsync(data)
      if (result.success) onOpenChange(false)
    }
  }

  async function handleDelete() {
    if (!event) return
    if (!confirm('Supprimer cet événement ?')) return
    const result = await del.mutateAsync(event.id)
    if (result.success) onOpenChange(false)
  }

  async function handleDuplicate() {
    if (!event) return
    const result = await dup.mutateAsync(event.id)
    if (result.success) onOpenChange(false)
  }

  const busy = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Event' : 'Create New Event'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Title */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Event Title</Label>
            <Input
              {...register('title', { required: 'Le titre est requis' })}
              placeholder="Event Title"
              autoFocus
              className={cn('h-9 text-sm', errors.title && 'border-destructive')}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          {/* Date & Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <span>📅</span> Date &amp; Time
            </div>

            {/* Event Date + All day toggle */}
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Event Date</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm">📅</span>
                  <Input
                    {...register('startDate', { required: true })}
                    type="date"
                    className="h-9 text-sm pl-8"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Controller
                  control={control}
                  name="isAllDay"
                  render={({ field }) => (
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                      <div
                        onClick={() => field.onChange(!field.value)}
                        className={cn(
                          'relative w-8 h-4 rounded-full transition-colors cursor-pointer',
                          field.value ? 'bg-[#c2440f]' : 'bg-muted'
                        )}
                      >
                        <div className={cn(
                          'absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform',
                          field.value ? 'translate-x-4' : 'translate-x-0'
                        )} />
                      </div>
                      All day event
                    </label>
                  )}
                />
              </div>
            </div>

            {/* Start + End Time */}
            {!isAllDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>🕐</span> Start Time
                  </Label>
                  <Input
                    {...register('startTime')}
                    type="time"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>🕐</span> End Time
                  </Label>
                  <Input
                    {...register('endTime')}
                    type="time"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <span>🏷️</span> Event Type
            </div>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <div className="space-y-2">
                  {EVENT_TYPE_ROWS.map((row, ri) => (
                    <div key={ri} className="flex gap-2">
                      {row.map(type => {
                        const cfg = EVENT_TYPE_CONFIG[type]
                        const isSelected = field.value === type
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => field.onChange(type)}
                            className={cn(
                              'flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 transition-all flex-1 min-w-0',
                              isSelected
                                ? `border-[#c2440f] ${cfg.bg}`
                                : 'border-border bg-white hover:border-muted-foreground/30'
                            )}
                          >
                            <span className="text-lg leading-none">{cfg.emoji === '···' ? '···' : cfg.emoji}</span>
                            <span className={cn('text-[10px] font-medium leading-none', isSelected ? 'text-[#c2440f]' : 'text-muted-foreground')}>
                              {cfg.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Location */}
          <div className="space-y-1">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <span>📍</span> Location
              <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              {...register('location')}
              placeholder="e.g., Main Hall, Room 101, Masjid..."
              className="h-9 text-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">
              Description
              <span className="text-xs text-muted-foreground font-normal ml-1">(Optional...)</span>
            </Label>
            <textarea
              {...register('description')}
              placeholder="Add any additional details about this event..."
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Hide toggle */}
          <Controller
            control={control}
            name="isHidden"
            render={({ field }) => (
              <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer">
                <div
                  onClick={() => field.onChange(!field.value)}
                  className={cn(
                    'relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0',
                    field.value ? 'bg-[#c2440f]' : 'bg-muted'
                  )}
                >
                  <div className={cn(
                    'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                    field.value ? 'translate-x-4' : 'translate-x-0'
                  )} />
                </div>
                <span className="text-sm text-muted-foreground">🔒 Hide for everyone except Admins</span>
              </label>
            )}
          />

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-border">
            {isEdit ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDuplicate}
                  disabled={dup.isPending}
                  className="gap-1.5 text-muted-foreground"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={del.isPending}
                  className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            ) : <div />}

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={busy}
                className="bg-[#c2440f] hover:bg-[#a33a0d] text-white"
              >
                {busy ? '...' : isEdit ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
