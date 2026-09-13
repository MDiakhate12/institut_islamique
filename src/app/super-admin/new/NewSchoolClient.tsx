'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createSchoolSchema, type CreateSchoolInput } from '@/modules/super-admin/super-admin.schema'
import { createSchoolAction } from '@/modules/super-admin/super-admin.actions'
import { toast } from 'sonner'
import { School, Mail, Hash, CheckCircle, ArrowLeft, Copy } from 'lucide-react'
import Link from 'next/link'

export function NewSchoolClient() {
  const [isPending, startTransition] = useTransition()
  const [created, setCreated] = useState<{ schoolId: string; schoolName: string; inviteUrl: string; emailSent: boolean } | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateSchoolInput>({
    resolver: zodResolver(createSchoolSchema),
    defaultValues: { schoolName: '', schoolSlug: '', adminEmail: '' },
  })

  const schoolName = watch('schoolName')

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function onNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue('schoolName', e.target.value)
    setValue('schoolSlug', autoSlug(e.target.value))
  }

  function onSubmit(data: CreateSchoolInput) {
    startTransition(async () => {
      const result = await createSchoolAction(data)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setCreated(result.data)
      toast.success(
        result.data.emailSent
          ? 'École créée — email d\'invitation envoyé !'
          : 'École créée — copiez le lien d\'invitation ci-dessous.'
      )
    })
  }

  if (created) {
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-5">
          <div className="text-center space-y-2">
            <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">École créée !</h2>
            <p className="text-sm text-gray-500">
              {created.emailSent
                ? 'Un email d\'invitation a été envoyé à l\'administrateur.'
                : 'L\'email n\'a pas pu être envoyé (domaine non vérifié sur Resend). Partagez le lien ci-dessous manuellement.'}
            </p>
          </div>

          {/* Invite URL — toujours visible */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Lien d'invitation</p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
              <span className="text-xs text-gray-600 flex-1 break-all font-mono">{created.inviteUrl}</span>
              <button
                onClick={() => navigator.clipboard.writeText(created.inviteUrl).then(() => toast.success('Lien copié !'))}
                className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-[#c2440f] hover:text-[#a33a0d] transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                Copier
              </button>
            </div>
            <p className="text-xs text-gray-400">L'admin clique ce lien → crée son compte → accède au wizard de configuration.</p>
          </div>

          <div className="flex gap-3 pt-1">
            <Link
              href="/super-admin"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Liste des écoles
            </Link>
            <button
              onClick={() => setCreated(null)}
              className="flex-1 px-4 py-2.5 bg-[#c2440f] text-white rounded-lg text-sm font-medium hover:bg-[#a33a0d] transition-colors"
            >
              Créer une autre école
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/super-admin" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nouvelle école</h1>
          <p className="text-sm text-gray-500">Créer une école et inviter le premier administrateur</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">

        {/* Section école */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <School className="h-3.5 w-3.5" /> École
          </p>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Nom de l'école *</label>
            <input
              {...register('schoolName')}
              onChange={onNameChange}
              placeholder="Association Islamique Al-Bayan"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]"
            />
            {errors.schoolName && <p className="text-xs text-red-500">{errors.schoolName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-gray-400" />
              Slug (identifiant URL) *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 shrink-0">qafschool.com/</span>
              <input
                {...register('schoolSlug')}
                placeholder="al-bayan"
                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]"
              />
            </div>
            {errors.schoolSlug && <p className="text-xs text-red-500">{errors.schoolSlug.message}</p>}
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Section admin */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Mail className="h-3.5 w-3.5" /> Informations du premier administrateur
          </p>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              Email *
            </label>
            <input
              {...register('adminEmail')}
              type="email"
              placeholder="admin@ecole.fr"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]"
            />
            {errors.adminEmail && <p className="text-xs text-red-500">{errors.adminEmail.message}</p>}
            <p className="text-xs text-gray-400">L'admin renseignera son nom lors de la création de son compte.</p>
          </div>
        </div>

        <div className="bg-[#fdf6f0] border border-[#f0dcc8] rounded-lg px-4 py-3 text-sm text-[#7a4f30]">
          Un email d'invitation sera envoyé automatiquement à l'administrateur avec un lien pour créer son compte.
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 bg-[#c2440f] text-white py-3 rounded-lg font-semibold hover:bg-[#a33a0d] transition-colors disabled:opacity-60"
        >
          {isPending ? (
            'Création en cours…'
          ) : (
            <>
              <School className="h-4 w-4" />
              Créer l'école et envoyer l'invitation
            </>
          )}
        </button>
      </form>
    </div>
  )
}
