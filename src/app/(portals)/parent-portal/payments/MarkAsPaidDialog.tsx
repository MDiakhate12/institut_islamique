'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { useSchool } from '@/modules/school/school.hooks'
import { useCreateParentPayment } from '@/modules/payments/payments.hooks'
import { createParentPaymentSchema, type CreateParentPaymentInput } from '@/modules/payments/payments.schema'
import type { ChildPaymentStatus } from '@/modules/payments/payments.types'
import {
  PAYMENT_CATEGORY_LABELS, PAYMENT_PERIOD_LABELS, PAYMENT_METHOD_LABELS,
} from '@/modules/payments/payments.labels'

const DEFAULT_VALUES: CreateParentPaymentInput = {
  studentIds: [],
  amount: 0,
  category: 'tuition',
  period: 'trimester_1',
  method: 'cash',
  financialOption: null,
  paymentDate: new Date().toISOString().slice(0, 10),
  notes: null,
}

interface Props {
  children: ChildPaymentStatus[]
  academicYear: string
}

export function MarkAsPaidDialog({ children, academicYear }: Props) {
  const [open, setOpen] = useState(false)
  const { data: school } = useSchool()
  const createPayment = useCreateParentPayment()

  const { control, register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CreateParentPaymentInput>({
    resolver: zodResolver(createParentPaymentSchema),
    defaultValues: DEFAULT_VALUES,
  })

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) reset(DEFAULT_VALUES)
  }

  async function onSubmit(data: CreateParentPaymentInput) {
    const payload = { ...data, amount: Math.round(data.amount * 100) }
    const result = await createPayment.mutateAsync(payload)
    if (result.success) handleOpenChange(false)
  }

  const studentOptions = children.map(c => ({ id: c.studentId, name: c.studentName }))
  const financialOptions = school?.settings?.financialOptions ?? []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        <Button className="w-full bg-[#c2440f] hover:bg-[#a33a0d] text-white">Marquer comme payé</Button>
      } />
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Marquer comme payé</DialogTitle>
          <p className="text-sm text-[#c2440f] font-medium">Année scolaire : {academicYear}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <Controller
            control={control}
            name="studentIds"
            render={({ field }) => (
              <StudentMultiSelect
                options={studentOptions}
                selected={field.value}
                onChange={field.onChange}
                placeholder="Sélectionner les élèves..."
              />
            )}
          />

          <div>
            <label className="text-sm font-medium mb-1.5 block">Montant payé *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
              <Input type="number" step="0.01" className="pl-7" placeholder="Entrer le montant" {...register('amount', { valueAsNumber: true })} />
            </div>
          </div>

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
            <label className="text-sm font-medium mb-1.5 block">Période de paiement *</label>
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
            <label className="text-sm font-medium mb-1.5 block">Mode de paiement *</label>
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

          {financialOptions.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Option financière</label>
              <Controller
                control={control}
                name="financialOption"
                render={({ field }) => (
                  <Select value={field.value ?? '__none__'} onValueChange={v => field.onChange(v === '__none__' ? null : v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v: string) => v === '__none__' ? 'Sélectionner une option financière' : v}</SelectValue>
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
            <label className="text-sm font-medium mb-1.5 block">Notes supplémentaires (facultatif)</label>
            <Textarea placeholder="Tous détails supplémentaires..." {...register('notes')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#c2440f] hover:bg-[#a33a0d] text-white">
              Marquer comme payé
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
