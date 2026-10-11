'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { formatPhone, phoneMatches, whatsappNumber } from '@/lib/phone'
import { toast } from 'sonner'
import {
  Search, Mail, Phone, Users, Key, AlertTriangle, CheckCircle2,
  MessageCircle, X, Send, Download, Pencil, Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { sendDownloadReminderAction } from '@/modules/parents/parents.actions'
import Link from 'next/link'
import { Pagination } from '@/components/shared/Pagination/Pagination'
import { usePagination } from '@/components/shared/Pagination/usePagination'
import { revealFocusRow, FOCUS_ROW_CLASS, FOCUS_ROW_FLASH_CLASS } from '@/components/shared/Pagination/focus-row'
import { ROUTES } from '@/lib/constants'
import { normalizeName } from '@/modules/parents/parents.grouping'
import type { DirectoryParent, GuardianRole } from '@/modules/parents/parents.types'
import { ParentFormDialog } from './ParentFormDialog'
import { exportParentsToExcel, ROLE_LABELS, roleConflictLabel } from './parents.excel'

// ── Helpers ────────────────────────────────────────────────────────────────────

function isAtRisk(p: DirectoryParent) {
  return !p.isConnected && p.emails.length > 0
}

function hasIssue(p: DirectoryParent) {
  return (
    p.maybeSame || p.phoneFieldEmails.length > 0 || p.invalidPhones.length > 0 ||
    Object.keys(p.roleCounts).filter(r => r === 'father' || r === 'mother').length > 1
  )
}

const ROLE_STYLES: Record<GuardianRole, string> = {
  father:   'bg-blue-50 text-blue-700 border-blue-200',
  mother:   'bg-pink-50 text-pink-700 border-pink-200',
  guardian: 'bg-muted text-muted-foreground border-border',
  other:    'bg-muted text-muted-foreground border-border',
}

// ── Bulk email dialog ──────────────────────────────────────────────────────────

function BulkEmailDialog({
  recipients,
  onClose,
}: {
  recipients: Array<{ label: string; email: string }>
  onClose: () => void
}) {
  const [subject, setSubject] = useState('Connectez-vous au portail Qaf School')
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    startTransition(async () => {
      const emails = recipients.map(r => r.email)
      const result = await sendDownloadReminderAction(emails, subject)
      if (!result.success) { toast.error(result.error); return }
      toast.success(`E-mail envoyé à ${result.data.sent} destinataire(s)`)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
          <div className="flex items-start gap-2.5">
            <Mail className="h-5 w-5 text-[#2d6a4f] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-base text-foreground">Envoyer à tous les parents à risque</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ceci enverra le rappel de connexion à {recipients.length} adresse{recipients.length > 1 ? 's' : ''} e-mail de parents qui ne se sont pas encore connectés au portail.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Subject */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Objet</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/20 focus:border-[#2d6a4f]/50"
            />
          </div>

          {/* Recipients */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">
              Destinataires ({recipients.length})
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {recipients.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg bg-muted/30 text-sm">
                  <span className="font-medium text-foreground truncate">{r.label}</span>
                  <span className="text-muted-foreground text-xs truncate">{r.email}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fermer
          </Button>
          <Button
            size="sm"
            disabled={isPending || !subject.trim()}
            onClick={handleSend}
            className="gap-1.5 bg-[#2d6a4f] hover:bg-[#1b4332] text-white"
          >
            <Send className="h-3.5 w-3.5" />
            Envoyer à tous ({recipients.length})
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Individual email dialog ────────────────────────────────────────────────────

function IndividualEmailDialog({
  parent,
  schoolName,
  onClose,
}: {
  parent: DirectoryParent
  schoolName: string
  onClose: () => void
}) {
  const emails = parent.emails
  const emailList = emails.join(', ')
  const [subject, setSubject] = useState(`[${schoolName}] – Connectez-vous au portail`)
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    startTransition(async () => {
      const result = await sendDownloadReminderAction(emails, subject)
      if (!result.success) { toast.error(result.error); return }
      toast.success(`E-mail envoyé à ${result.data.sent} destinataire(s)`)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
          <div className="flex items-start gap-2.5">
            <Send className="h-5 w-5 text-[#2d6a4f] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-base text-foreground">Envoyer un rappel de connexion</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Envoyer un rappel à ce parent pour qu&apos;il se connecte au portail Qaf School.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* À */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">À</label>
            <p className="text-sm text-foreground bg-muted/30 rounded-lg px-3 py-2 break-all">{emailList}</p>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Objet</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/20 focus:border-[#2d6a4f]/50"
            />
          </div>

          {/* Email preview */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Aperçu de l&apos;e-mail</p>
            <div className="rounded-xl border border-border overflow-hidden">
              {/* Email header (matches Qaf brand) */}
              <div className="bg-[#2d6a4f] px-6 py-5 flex flex-col items-center gap-1">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Q</span>
                </div>
                <p className="text-white font-semibold text-sm mt-1">Portail Qaf</p>
                <p className="text-white/70 text-xs">{schoolName}</p>
              </div>
              {/* Email body */}
              <div className="px-5 py-4 bg-white text-sm text-foreground space-y-2">
                <p>Assalamu Alaikum,</p>
                <p className="text-muted-foreground">Nous espérons que vous allez bien.</p>
                <p className="text-muted-foreground text-xs">
                  Nous vous invitons à vous connecter au portail Qaf School pour suivre la scolarité de votre enfant.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            disabled={isPending || !subject.trim()}
            onClick={handleSend}
            className="gap-1.5 bg-[#2d6a4f] hover:bg-[#1b4332] text-white"
          >
            <Send className="h-3.5 w-3.5" />
            Envoyer l&apos;e-mail
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Filter chip ────────────────────────────────────────────────────────────────

function FilterChip({
  label, count, active, color, onClick,
}: {
  label: string
  count: number
  active: boolean
  color: 'orange' | 'green' | 'amber'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
        active
          ? color === 'orange'
            ? 'bg-[#2d6a4f] border-[#2d6a4f] text-white'
            : color === 'amber' ? 'bg-amber-500 border-amber-500 text-white'
            : 'bg-emerald-600 border-emerald-600 text-white'
          : 'bg-white border-border text-muted-foreground hover:border-muted-foreground/50',
      )}
    >
      {label}
      <span className={cn(
        'h-5 min-w-5 rounded-full text-[11px] font-bold flex items-center justify-center px-1',
        active
          ? 'bg-white/25 text-white'
          : color === 'orange' ? 'bg-[#2d6a4f]/10 text-[#2d6a4f]'
          : color === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700',
      )}>
        {count}
      </span>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

type Filter = 'all' | 'risk' | 'app' | 'issue'

export function ParentsClient({
  parents,
  schoolName,
  focusGuardianId,
}: {
  parents: DirectoryParent[]
  schoolName: string
  /** Fiche tuteur d'où l'on vient (fiche élève) : la ligne du parent correspondant est mise en évidence. */
  focusGuardianId?: string
}) {
  const focusKey = focusGuardianId ? parents.find(p => p.guardianIds.includes(focusGuardianId))?.key : undefined
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [individualDialog, setIndividualDialog] = useState<DirectoryParent | null>(null)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  // Parent en cours d'édition ; `'new'` = création
  const [editing, setEditing] = useState<DirectoryParent | 'new' | null>(null)

  const atRiskCount = useMemo(() => parents.filter(isAtRisk).length, [parents])
  const connectedCount = useMemo(() => parents.filter(p => p.isConnected).length, [parents])
  const issueCount = useMemo(() => parents.filter(hasIssue).length, [parents])

  const atRiskRecipients = useMemo(() => {
    const seen = new Set<string>()
    return parents.filter(isAtRisk).flatMap(p => p.emails
      .filter(e => !seen.has(e.toLowerCase()) && !!seen.add(e.toLowerCase()))
      .map(email => ({ label: p.name, email })))
  }, [parents])

  const filtered = useMemo(() => {
    let list = parents
    if (filter === 'risk')  list = list.filter(isAtRisk)
    if (filter === 'app')   list = list.filter(p => p.isConnected)
    if (filter === 'issue') list = list.filter(hasIssue)
    const q = search.trim().toLowerCase()
    if (q) {
      const qTokens = normalizeName(q)
      list = list.filter(p =>
        qTokens.every(t => normalizeName(`${p.name} ${p.nameVariants.join(' ')} ${p.children.map(c => c.name).join(' ')}`).some(w => w.includes(t))) ||
        p.phones.some(ph => phoneMatches(ph, q)) ||
        p.emails.some(e => e.toLowerCase().includes(q)),
      )
    }
    return list
  }, [parents, filter, search])

  // Parent sélectionné (mis en évidence et centré) : celui du lien (?guardian=), puis celui sur lequel on clique
  const [selectedKey, setSelectedKey] = useState(focusKey)
  const focusIndex = selectedKey ? filtered.findIndex(p => p.key === selectedKey) : -1
  const pager = usePagination(filtered, { resetKey: `${search}|${filter}`, focusIndex })

  // Arrivée par le lien (?guardian=) : la ligne apparaît dans la page (la bonne page est déjà affichée) ; pas de défilement au clic
  useEffect(() => {
    if (!focusKey) return
    return revealFocusRow()
  }, [focusKey])

  function selectParent(p: DirectoryParent, target: EventTarget) {
    if ((target as HTMLElement).closest('a, button')) return // liens et boutons de la ligne gardent leur action
    setSelectedKey(p.key)
    const query = p.guardianIds[0] ? `?guardian=${p.guardianIds[0]}` : ''
    window.history.replaceState(null, '', `${window.location.pathname}${query}`)
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Une ligne par parent, avec ses enfants — voir qui s&apos;est connecté au portail et qui a besoin d&apos;un rappel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setEditing('new')}
            className="gap-2 bg-[#2d6a4f] hover:bg-[#1b4332] text-white shrink-0"
          >
            <Plus className="h-4 w-4" />
            Ajouter un parent
          </Button>
          <Button
            variant="outline"
            onClick={() => exportParentsToExcel(filtered)}
            disabled={filtered.length === 0}
            className="gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white hover:text-white border-transparent shrink-0"
          >
            <Download className="h-4 w-4" />
            Exporter Excel
          </Button>
          <Button
            onClick={() => setShowBulkDialog(true)}
            disabled={atRiskRecipients.length === 0}
            className="gap-2 bg-[#2d6a4f] hover:bg-[#1b4332] text-white shrink-0"
          >
            <Mail className="h-4 w-4" />
            E-mail à risque ({atRiskRecipients.length})
          </Button>
        </div>
      </div>

      {/* Stats badges */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-xs font-medium text-muted-foreground bg-muted/60 border border-border rounded-full px-2.5 py-1">
          {parents.length} parent{parents.length > 1 ? 's' : ''}
        </span>
        <span className={cn(
          'text-xs font-medium rounded-full px-2.5 py-1 border',
          connectedCount > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-[#2d6a4f]/10 border-[#2d6a4f]/20 text-[#2d6a4f]',
        )}>
          Connectés au portail : {connectedCount}
        </span>
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-4 mb-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Rechercher par nom, enfant, e-mail ou téléphone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/20 focus:border-[#2d6a4f]/50"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <FilterChip label="À risque" count={atRiskCount} active={filter === 'risk'} color="orange"
            onClick={() => setFilter(f => f === 'risk' ? 'all' : 'risk')} />
          <FilterChip label="Connecté au portail" count={connectedCount} active={filter === 'app'} color="green"
            onClick={() => setFilter(f => f === 'app' ? 'all' : 'app')} />
          <FilterChip label="Données à vérifier" count={issueCount} active={filter === 'issue'} color="amber"
            onClick={() => setFilter(f => f === 'issue' ? 'all' : 'issue')} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs whitespace-nowrap">Parent ↑</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs whitespace-nowrap">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Enfants</span>
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs whitespace-nowrap">
                <span className="flex items-center gap-1"><Key className="h-3.5 w-3.5" /> Compte</span>
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs whitespace-nowrap">
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> E-mails</span>
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs whitespace-nowrap">
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Contact</span>
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Aucun résultat
                </td>
              </tr>
            )}
            {pager.pageItems.map(p => {
              const conflict = roleConflictLabel(p)
              const wa = whatsappNumber(p.phones[0])
              return (
                <tr
                  key={p.key}
                  data-focus-row={p.key === selectedKey ? '' : undefined}
                  onClick={e => selectParent(p, e.target)}
                  className={cn('hover:bg-muted/20 transition-colors align-top cursor-pointer', p.key === selectedKey && FOCUS_ROW_CLASS, p.key === selectedKey && p.key === focusKey && FOCUS_ROW_FLASH_CLASS)}
                >
                  {/* Parent */}
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      {isAtRisk(p)
                        ? <AlertTriangle className="h-3.5 w-3.5 text-[#2d6a4f] shrink-0 mt-0.5" />
                        : p.isConnected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />}
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{p.name}</p>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', ROLE_STYLES[p.role])}>
                            {ROLE_LABELS[p.role]}
                          </span>
                          {conflict && (
                            <span
                              title="Les fiches de ce parent ne donnent pas le même rôle (père / mère)"
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-300"
                            >
                              Rôle incohérent : {conflict}
                            </span>
                          )}
                          {p.maybeSame && (
                            <span
                              title="Fiches regroupées sur le seul nom, sans e-mail ni téléphone en commun"
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-300"
                            >
                              Fusion à vérifier
                            </span>
                          )}
                        </div>
                        {p.nameVariants.length > 0 && (
                          <p className="text-[10px] text-muted-foreground">Aussi : {p.nameVariants.join(' · ')}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Children */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[260px]">
                      {p.children.length === 0
                        ? <span className="text-muted-foreground/60 italic text-xs">—</span>
                        : p.children.map(c => (
                          <Link
                            key={c.id}
                            href={`${ROUTES.admin.students}?student=${c.id}`}
                            title="Ouvrir la fiche de l'élève"
                            className="text-[11px] px-2 py-0.5 rounded-full bg-muted/60 border border-border text-foreground hover:bg-[#2d6a4f]/10 hover:border-[#2d6a4f]/40 hover:text-[#2d6a4f] transition-colors"
                          >
                            {c.name}
                          </Link>
                        ))}
                    </div>
                  </td>

                  {/* Account */}
                  <td className="px-4 py-3">
                    {p.isConnected ? (
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                          Connecté
                        </span>
                        {p.connectedNames.map(n => (
                          <p key={n} className="text-[10px] text-muted-foreground">{n}</p>
                        ))}
                        {p.accountOnly && (
                          <p className="text-[10px] text-amber-700">Aucune fiche tuteur correspondante</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60 italic text-xs">Aucun compte</span>
                    )}
                  </td>

                  {/* Emails */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {p.emails.map(e => (
                        <a key={e} href={`mailto:${e}`} className="text-xs text-[#2d6a4f] hover:underline block break-all">{e}</a>
                      ))}
                      {p.emails.length === 0 && <span className="text-muted-foreground/60 italic text-xs">—</span>}
                      {p.sharedWith.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">Contact partagé avec {p.sharedWith.join(', ')}</p>
                      )}
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    <div className="space-y-1">
                      {p.phones.map(ph => (
                        <p key={ph} className="text-muted-foreground">{formatPhone(ph)}</p>
                      ))}
                      {p.phoneFieldEmails.map(v => (
                        <p
                          key={v}
                          title="Un e-mail a été saisi dans le champ téléphone — à corriger dans la fiche élève"
                          className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-300 text-amber-700 px-1.5 py-0.5"
                        >
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {v}
                        </p>
                      ))}
                      {p.invalidPhones.map(v => (
                        <p
                          key={v}
                          title="Numéro invalide"
                          className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-300 text-amber-700 px-1.5 py-0.5"
                        >
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {v}
                        </p>
                      ))}
                      {p.phones.length + p.phoneFieldEmails.length + p.invalidPhones.length === 0 && (
                        <span className="text-muted-foreground/60 italic">—</span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!p.accountOnly && (
                        <button
                          type="button"
                          onClick={() => setEditing(p)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          Modifier
                        </button>
                      )}
                      {wa && (
                        <a
                          href={`https://wa.me/${wa}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                        >
                          <MessageCircle className="h-3 w-3" />
                          WhatsApp
                        </a>
                      )}
                      {p.emails.length > 0 && !p.isConnected && (
                        <button
                          type="button"
                          onClick={() => setIndividualDialog(p)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border border-[#2d6a4f]/30 text-[#2d6a4f] hover:bg-[#2d6a4f]/5 transition-colors"
                        >
                          <Mail className="h-3 w-3" />
                          Rappel par e-mail
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        <Pagination state={pager} noun="parent" />
      </div>

      {/* Dialogs */}
      {editing && (
        <ParentFormDialog
          key={editing === 'new' ? 'new' : editing.key}
          parent={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {showBulkDialog && (
        <BulkEmailDialog recipients={atRiskRecipients} onClose={() => setShowBulkDialog(false)} />
      )}
      {individualDialog && (
        <IndividualEmailDialog
          key={individualDialog.key}
          parent={individualDialog}
          schoolName={schoolName}
          onClose={() => setIndividualDialog(null)}
        />
      )}
    </div>
  )
}
