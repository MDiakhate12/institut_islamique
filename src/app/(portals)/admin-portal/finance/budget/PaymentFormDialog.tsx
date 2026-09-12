'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { StudentMultiSelect } from '@/components/shared/StudentMultiSelect/StudentMultiSelect'
import { useStudents } from '@/modules/students/students.hooks'
import { useSchool } from '@/modules/school/school.hooks'
import { useCreatePayment, useUpdatePayment } from '@/modules/payments/payments.hooks'
import { createPaymentSchema, type CreatePaymentInput } from '@/modules/payments/payments.schema'
import type { EditablePayment } from '@/modules/payments/payments.types'
import {
  PAYMENT_CATEGORY_LABELS, PAYMENT_PERIOD_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS,
} from '@/modules/payments/payments.labels'

const DEFAULT_VALUES: CreatePaymentInput = {
  studentIds: [],
  parentName: null,
  amount: 0,
  category: 'tuition',
  period: 'trimester_1',
  method: 'cash',
  financialOption: null,
  status: 'verified',
  paymentDate: new Date().toISOString().slice(0, 10),
  notes: null,
}

interface Props {
  editing?: EditablePayment | null
  onClose?: () => void
}

export function PaymentFormDialog({ editing, onClose }: Props) {
  const [open, setOpen] = useState(false)
  const { data: students = [] } = useStudents()
  const { data: school } = useSchool()
  const createPayment = useCreatePayment()
  const updatePayment = useUpdatePayment()

  const { control, register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CreatePaymentInput>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (editing) {
      reset({
        studentIds: editing.studentId ? [editing.studentId] : [],
        parentName: editing.parentName,
        amount: editing.amount / 100,
        category: editing.category as CreatePaymentInput['category'],
        period: editing.period as CreatePaymentInput['period'],
        method: editing.method as CreatePaymentInput['method'],
        financialOption: editing.financialOption,
        status: editing.status as CreatePaymentInput['status'],
        paymentDate: editing.date,
        notes: editing.notes,
      })
      setOpen(true)
    }
  }, [editing, reset])

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      reset(DEFAULT_VALUES)
      onClose?.()
    }
  }

  async function onSubmit(data: CreatePaymentInput) {
    const payload = { ...data, amount: Math.round(data.amount * 100) }
    const result = editing
      ? await updatePayment.mutateAsync({ id: editing.id, data: payload })
      : await createPayment.mutateAsync(payload)
    if (result.success) handleOpenChange(false)
  }

  const studentOptions = students.map(s => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }))
  const financialOptions = school?.settings?.financialOptions ?? []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!editing && (
        <DialogTrigger render={
          <Button className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5 flex-1">
            <Plus className="h-4 w-4" /> Enregistrer un revenu
          </Button>
        } />
      )}
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Modifier le paiement' : 'Ajouter un nouveau paiement'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Catégorie de paiement *</label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={v => v && field.onChange(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{(v: string) => PAYMENT_CATEGORY_LABELS[v] ?? v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Nom du parent</label>
            <Input placeholder="Nom du parent" {...register('parentName')} />
          </div>

          <Controller
            control={control}
            name="studentIds"
            render={({ field }) => (
              <StudentMultiSelect options={studentOptions} selected={field.value} onChange={field.onChange} />
            )}
          />

          <div>
            <label className="text-sm font-medium mb-1.5 block">Montant</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
              <Input type="number" step="0.01" className="pl-7" {...register('amount', { valueAsNumber: true })} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Période de paiement</label>
            <Controller
              control={control}
              name="period"
              render={({ field }) => (
                <Select value={field.value} onValueChange={v => v && field.onChange(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{(v: string) => PAYMENT_PERIOD_LABELS[v] ?? v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_PERIOD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Méthode de paiement</label>
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <Select value={field.value} onValueChange={v => v && field.onChange(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{(v: string) => PAYMENT_METHOD_LABELS[v] ?? v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).filter(([v]) => v !== 'other').map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Statut du paiement</label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={v => v && field.onChange(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{(v: string) => PAYMENT_STATUS_LABELS[v] ?? v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {financialOptions.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Option financière (facultatif)</label>
              <Controller
                control={control}
                name="financialOption"
                render={({ field }) => (
                  <Select value={field.value ?? '__none__'} onValueChange={v => field.onChange(v === '__none__' ? null : v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v: string) => v === '__none__' ? 'Aucune' : v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Aucune</SelectItem>
                      {financialOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1.5 block">Date de paiement</label>
            <Input type="date" {...register('paymentDate')} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Détails du paiement</label>
            <Textarea placeholder="Détails du paiement..." {...register('notes')} />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#c2440f] hover:bg-[#a33a0d] text-white"
          >
            {editing ? 'Enregistrer les modifications' : 'Ajouter le paiement'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
