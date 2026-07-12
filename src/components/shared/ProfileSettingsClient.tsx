'use client'

import { useState } from 'react'
import {
  User, Phone, Building2, Globe, Mail, KeyRound, IdCard, Smile, ShieldAlert,
  Trash2, Eye, EyeOff, Plus, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { PortalRole } from '@/lib/constants'
import { PORTAL_ROLES } from '@/lib/constants'
import {
  useProfile, useUpdateProfile, useUpdateLanguage,
  useChangeEmail, useChangePassword, useDeleteAccount,
} from '@/modules/profile/profile.hooks'
import { APP_LANGUAGES } from '@/modules/profile/profile.types'
import { useChildren, useUnlinkChild } from '@/modules/parents/parents.hooks'
import { LinkChildModal } from '@/app/(portals)/parent-portal/children/LinkChildModal'
import type { ProfileData } from '@/modules/profile/profile.types'

const ROLE_LABELS: Record<PortalRole, string> = {
  admin: 'Administrateur',
  parent: 'Parent',
  teacher: 'Enseignant',
}

const LANGUAGE_LABELS: Record<string, string> = {
  default: "Utiliser le paramètre par défaut de l'école",
  ...Object.fromEntries(APP_LANGUAGES.map(l => [l.value, l.label])),
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function PasswordField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-9"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export function ProfileSettingsClient() {
  const { data: profile, isLoading } = useProfile()

  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement du profil...
      </div>
    )
  }

  return <ProfileForm profile={profile} />
}

function ProfileForm({ profile }: { profile: ProfileData }) {
  const updateProfile = useUpdateProfile()
  const updateLanguage = useUpdateLanguage()
  const changeEmail = useChangeEmail()
  const changePassword = useChangePassword()
  const deleteAccount = useDeleteAccount()
  const { data: children } = useChildren()
  const unlinkChild = useUnlinkChild()

  const [fullName, setFullName] = useState(profile.fullName ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [roles, setRoles] = useState<PortalRole[]>(profile.roles)
  const [language, setLanguage] = useState(profile.preferredLanguage ?? 'default')

  const [newEmail, setNewEmail] = useState(profile.email)
  const [emailPassword, setEmailPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [childToUnlink, setChildToUnlink] = useState<{ studentId: string; name: string } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')

  const displayName = fullName || profile.email.split('@')[0]
  const initials = getInitials(displayName)

  const isDirty = fullName !== (profile.fullName ?? '')
    || phone !== (profile.phone ?? '')
    || JSON.stringify([...roles].sort()) !== JSON.stringify([...profile.roles].sort())

  function toggleRole(role: PortalRole) {
    if (role === 'admin') return
    setRoles(r => r.includes(role) ? r.filter(x => x !== role) : [...r, role])
  }

  function handleSaveProfile() {
    updateProfile.mutate({ fullName, phone, roles })
  }

  function handleSaveLanguage() {
    updateLanguage.mutate({ preferredLanguage: language === 'default' ? null : language })
  }

  function handleUpdateEmail() {
    if (!emailPassword) { toast.error('Entrez votre mot de passe actuel'); return }
    changeEmail.mutate({ newEmail, currentPassword: emailPassword }, {
      onSuccess: (result) => { if (result.success) setEmailPassword('') },
    })
  }

  function handleUpdatePassword() {
    changePassword.mutate({ currentPassword, newPassword, confirmPassword }, {
      onSuccess: (result) => {
        if (result.success) { setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }
      },
    })
  }

  function handleUnlinkConfirm() {
    if (!childToUnlink) return
    unlinkChild.mutate(childToUnlink.studentId, {
      onSettled: () => setChildToUnlink(null),
    })
  }

  function handleDeleteAccount() {
    if (!deletePassword) { toast.error('Entrez votre mot de passe actuel'); return }
    deleteAccount.mutate({ currentPassword: deletePassword })
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#7a4f30]">Modifier le profil</h1>
        <p className="text-muted-foreground mt-1">
          Gérez les informations de votre compte et vos préférences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-white overflow-hidden">
            <div className="bg-[#fdf6f0] px-6 py-4 border-b border-border">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[#c2440f]">
                <User className="h-5 w-5" /> Identité &amp; Contact
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Mettez à jour vos informations personnelles et coordonnées
              </p>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4 rounded-xl border border-[#f0dcc8] bg-[#fdf6f0]/60 p-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#DBA571] to-[#8B4429] flex items-center justify-center shrink-0">
                  <span className="text-white text-lg font-bold">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{displayName}</p>
                  <p className="text-sm text-[#c2440f] truncate">{profile.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nom complet</label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} className="pl-8" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Numéro de téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={phone} onChange={e => setPhone(e.target.value)} className="pl-8" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">École</label>
                <div className="relative">
                  <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={profile.schoolName} readOnly className="pl-8 bg-muted/30 text-muted-foreground" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Rôles du compte</label>
                <div className="flex flex-wrap gap-2.5">
                  {PORTAL_ROLES.map(role => {
                    const checked = roles.includes(role)
                    const disabled = role === 'admin'
                    return (
                      <button
                        key={role}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleRole(role)}
                        className={cn(
                          'flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors',
                          checked
                            ? disabled
                              ? 'border-blue-200 bg-blue-50 text-blue-700 cursor-default'
                              : 'border-[#e8c9a3] bg-[#fdf6f0] text-foreground'
                            : 'border-border bg-white text-muted-foreground',
                          !disabled && 'cursor-pointer hover:border-[#c2440f]/40',
                        )}
                      >
                        <span className={cn(
                          'flex items-center justify-center h-4 w-4 rounded border shrink-0',
                          checked
                            ? disabled ? 'bg-blue-600 border-blue-600' : 'bg-[#c2440f] border-[#c2440f]'
                            : 'border-gray-300 bg-white',
                        )}>
                          {checked && <span className="h-2 w-2 rounded-[2px] bg-white" />}
                        </span>
                        {ROLE_LABELS[role]}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                  <Globe className="h-4 w-4 text-muted-foreground" /> Langue de l&apos;application
                </label>
                <div className="flex gap-2">
                  <Select value={language} onValueChange={v => v && setLanguage(v)}>
                    <SelectTrigger className="h-9 text-sm flex-1">
                      <SelectValue>
                        {(v: string) => LANGUAGE_LABELS[v] ?? v}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Utiliser le paramètre par défaut de l&apos;école</SelectItem>
                      {APP_LANGUAGES.map(l => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    disabled={updateLanguage.isPending}
                    onClick={handleSaveLanguage}
                    className="border-[#c2440f]/40 text-[#c2440f] hover:bg-[#fdf6f0]"
                  >
                    {updateLanguage.isPending ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Remplace la langue par défaut de votre école pour l&apos;interface de l&apos;application.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                {isDirty && <span className="text-xs text-[#c2440f]">Modifications non enregistrées</span>}
                <Button
                  disabled={updateProfile.isPending}
                  onClick={handleSaveProfile}
                  className="bg-[#c2440f] hover:bg-[#a33a0d] text-white min-w-36"
                >
                  {updateProfile.isPending ? 'Enregistrement...' : 'Enregistrer le profil'}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-white overflow-hidden">
              <div className="bg-blue-50 px-6 py-4 border-b border-border">
                <h2 className="flex items-center gap-2 text-base font-semibold text-blue-700">
                  <Mail className="h-4.5 w-4.5" /> Changer l&apos;e-mail
                </h2>
                <p className="text-xs text-blue-600/80 mt-0.5">
                  Mettez à jour votre adresse e-mail de connexion
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nouvel e-mail</label>
                  <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Mot de passe actuel</label>
                  <PasswordField value={emailPassword} onChange={setEmailPassword} />
                </div>
              </div>
              <div className="px-6 pb-6">
                <Button
                  disabled={changeEmail.isPending}
                  onClick={handleUpdateEmail}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 text-white"
                >
                  {changeEmail.isPending ? 'Mise à jour...' : "Mettre à jour l'e-mail"}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white overflow-hidden">
              <div className="bg-purple-50 px-6 py-4 border-b border-border">
                <h2 className="flex items-center gap-2 text-base font-semibold text-purple-700">
                  <KeyRound className="h-4.5 w-4.5" /> Changer le mot de passe
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Mot de passe actuel</label>
                  <PasswordField value={currentPassword} onChange={setCurrentPassword} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nouveau mot de passe</label>
                  <PasswordField value={newPassword} onChange={setNewPassword} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Confirmer le mot de passe</label>
                  <PasswordField value={confirmPassword} onChange={setConfirmPassword} />
                </div>
              </div>
              <div className="px-6 pb-6">
                <Button
                  disabled={changePassword.isPending}
                  onClick={handleUpdatePassword}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white"
                >
                  {changePassword.isPending ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Side column ── */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-teal-100 bg-teal-50/40 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-teal-100">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-teal-800">
                <IdCard className="h-4.5 w-4.5" /> Détails du compte
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="rounded-lg border border-teal-100 bg-white px-3.5 py-2.5">
                <p className="text-xs text-muted-foreground">Membre depuis</p>
                <p className="text-sm font-medium">
                  {new Date(profile.memberSince).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              {roles.includes('teacher') && (
                <div className="rounded-lg border border-teal-100 bg-white px-3.5 py-2.5">
                  <p className="text-xs text-muted-foreground">ID Enseignant</p>
                  <p className="text-sm font-medium font-mono">{profile.memberId}</p>
                </div>
              )}
              {roles.includes('parent') && (
                <div className="rounded-lg border border-teal-100 bg-white px-3.5 py-2.5">
                  <p className="text-xs text-muted-foreground">Enfants liés</p>
                  <p className="text-sm font-medium">{children?.length ?? 0}</p>
                </div>
              )}
            </div>
          </div>

          {roles.includes('parent') && (
            <div className="rounded-2xl border border-[#f0dcc8] bg-[#fdf6f0]/50 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#f0dcc8]">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[#7a4f30]">
                  <Smile className="h-4.5 w-4.5" /> Gérer les enfants
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Liez vos enfants à votre compte pour suivre leur progression
                </p>
              </div>
              <div className="p-4 space-y-2.5">
                {children && children.length > 0 ? (
                  children.map(child => (
                    <div
                      key={child.studentId}
                      className="flex items-center justify-between rounded-lg border border-[#f0dcc8] bg-white px-3.5 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium">{child.firstName} {child.lastName}</p>
                        {child.studentCustomId && (
                          <p className="text-xs text-muted-foreground">{child.studentCustomId}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setChildToUnlink({ studentId: child.studentId, name: `${child.firstName} ${child.lastName}` })}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <Smile className="h-8 w-8 text-[#e8c9a3] mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">Aucun enfant lié pour l&apos;instant</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Ajoutez des enfants pour commencer à suivre leur progression</p>
                  </div>
                )}
                <LinkChildModal>
                  <Button className="w-full bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5">
                    <Plus className="h-4 w-4" /> Ajouter un enfant
                  </Button>
                </LinkChildModal>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-red-100 bg-red-50/50 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-red-100">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-red-700">
                <ShieldAlert className="h-4.5 w-4.5" /> Zone dangereuse
              </h3>
              <p className="text-xs text-red-600/80 mt-0.5">Actions irréversibles et destructrices</p>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-red-700 bg-white rounded-lg border border-red-100 p-3">
                Une fois votre compte supprimé, toutes vos données seront définitivement supprimées et ne pourront pas être récupérées.
              </p>
              <Button
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white gap-1.5"
              >
                <Trash2 className="h-4 w-4" /> Supprimer mon compte
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Unlink child confirm */}
      <Dialog open={!!childToUnlink} onOpenChange={o => !o && setChildToUnlink(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Délier l&apos;enfant</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir délier {childToUnlink?.name} de votre compte ? Cela ne supprimera pas le dossier étudiant.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChildToUnlink(null)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={unlinkChild.isPending}
              onClick={handleUnlinkConfirm}
            >
              {unlinkChild.isPending ? 'Suppression...' : 'Délier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete account confirm */}
      <Dialog open={deleteOpen} onOpenChange={o => { setDeleteOpen(o); if (!o) setDeletePassword('') }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer le compte</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Toutes vos données seront définitivement supprimées. Entrez votre mot de passe pour confirmer.
            </DialogDescription>
          </DialogHeader>
          <PasswordField value={deletePassword} onChange={setDeletePassword} placeholder="Mot de passe actuel" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Annuler</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
              disabled={deleteAccount.isPending}
              onClick={handleDeleteAccount}
            >
              <Trash2 className="h-4 w-4" />
              {deleteAccount.isPending ? 'Suppression...' : 'Supprimer le compte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
