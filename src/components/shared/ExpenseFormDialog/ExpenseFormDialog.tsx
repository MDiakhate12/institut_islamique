'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, DollarSign, Paperclip, Clock } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { WageFormFields } from '@/components/shared/WageFormFields/WageFormFields'
import { useSchool } from '@/modules/school/school.hooks'
import {
  useTeacherOptions, useTeacherClassOptions, useMyClassOptions, useLogHours, useLogMyHours,
} from '@/modules/wages/wages.hooks'
import { useCreateExpense } from '@/modules/expenses/expenses.hooks'
import { createExpenseSchema, type CreateExpenseInput } from '@/modules/expenses/expenses.schema'
import { EXPENSE_CATEGORY_LABELS } from '@/lib/constants'

const DEFAULT_VALUES: CreateExpenseInput = {
  date: new Date().toISOString().slice(0, 10),
  amount: 0,
  category: null,
  description: '',
  receipt: null,
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface Props {
  triggerLabel?: string
  teacherSelectable?: boolean
}

export function ExpenseFormDialog({ triggerLabel = 'Nouvelle dépense', teacherSelectable = false }: Props) {
  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [wageTeacherId, setWageTeacherId] = useState<string | null>(null)
  const [wageClassId, setWageClassId] = useState<string | null>(null)
  const [wageHours, setWageHours] = useState('')

  const createExpense = useCreateExpense()
  const logHours = useLogHours()
  const logMyHours = useLogMyHours()

  const { data: school } = useSchool()
  const { data: teachers = [] } = useTeacherOptions(teacherSelectable)
  const { data: adminClasses = [] } = useTeacherClassOptions(teacherSelectable ? wageTeacherId : null)
  const { data: myClasses = [] } = useMyClassOptions(!teacherSelectable)
  const classes = teacherSelectable ? adminClasses : myClasses
  const rate = school?.settings?.teacherHourlyRate ?? 0

  const { control, register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const category = watch('category')
  const date = watch('date')
  const isSalary = category === 'salaries'
  const hoursNum = parseInt(wageHours, 10) || 0

  function resetAll() {
    reset(DEFAULT_VALUES)
    setFileName(null)
    setWageTeacherId(null)
    setWageClassId(null)
    setWageHours('')
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) resetAll()
  }

  async function handleFile(file: File | null) {
    if (!file) { setValue('receipt', null); setFileName(null); return }
    const base64 = await fileToBase64(file)
    setValue('receipt', { base64, mimeType: file.type })
    setFileName(file.name)
  }

  async function onSubmitExpense(data: CreateExpenseInput) {
    const payload = { ...data, amount: Math.round(data.amount * 100) }
    const result = await createExpense.mutateAsync(payload)
    if (result.success) handleOpenChange(false)
  }

  async function onSubmitWage(e: React.FormEvent) {
    e.preventDefault()
    if (!hoursNum) return
    const result = teacherSelectable
      ? (wageTeacherId ? await logHours.mutateAsync({ teacherId: wageTeacherId, classId: wageClassId, date, hoursWorked: hoursNum }) : null)
      : await logMyHours.mutateAsync({ classId: wageClassId, date, hoursWorked: hoursNum })
    if (result?.success) handleOpenChange(false)
  }

  const wageSubmitDisabled = !hoursNum || (teacherSelectable && !wageTeacherId) || logHours.isPending || logMyHours.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        <Button className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5">
          <Plus className="h-4 w-4" /> {triggerLabel}
        </Button>
      } />
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSalary ? <Clock className="h-5 w-5 text-[#c2440f]" /> : <DollarSign className="h-5 w-5 text-[#c2440f]" />}
            {isSalary ? 'Enregistrer les heures' : 'Nouvelle dépense'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isSalary ? "Enregistrez les heures d'enseignement pour la paie" : 'Remplissez les détails de votre dépense.'}
          </p>
        </DialogHeader>

        <form onSubmit={isSalary ? onSubmitWage : handleSubmit(onSubmitExpense)} className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Date</label>
            <Input type="date" {...register('date')} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Catégorie</label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value ?? '__none__'} onValueChange={v => field.onChange(v === '__none__' ? null : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{(v: string) => v === '__none__' ? 'Sélectionner une catégorie' : EXPENSE_CATEGORY_LABELS[v as keyof typeof EXPENSE_CATEGORY_LABELS] ?? v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {isSalary ? (
            <WageFormFields
              showTeacherSelect={teacherSelectable}
              teachers={teachers}
              teacherId={wageTeacherId}
              onTeacherChange={id => { setWageTeacherId(id); setWageClassId(null) }}
              classes={classes}
              classId={wageClassId}
              onClassChange={setWageClassId}
              hours={wageHours}
              onHoursChange={setWageHours}
              rate={rate}
            />
          ) : (
            <>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Montant total</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                  <Input type="number" step="0.01" className="pl-7" {...register('amount', { valueAsNumber: true })} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">À quoi cela servait-il ?</label>
                <Textarea placeholder="ex. : Livres pour la Classe A, fournitures de bureau..." {...register('description')} />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Reçus (Optionnel)</label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-6 cursor-pointer hover:bg-gray-50">
                  <Paperclip className="h-6 w-6 text-[#c2440f]" />
                  <span className="text-sm font-medium">
                    {fileName ?? 'Cliquer pour télécharger ou glisser-déposer'}
                  </span>
                  <span className="text-xs text-muted-foreground">Formats supportés : JPG, PNG, PDF</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="hidden"
                    onChange={e => handleFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Annuler</Button>
            <Button
              type="submit"
              disabled={isSalary ? wageSubmitDisabled : isSubmitting}
              className="bg-[#c2440f] hover:bg-[#a33a0d] text-white"
            >
              {isSalary ? 'Soumettre les heures' : 'Soumettre la demande'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
