'use client'

import { useState, useTransition, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Search, Mail, Phone, Users, Key, AlertTriangle, CheckCircle2,
  MessageCircle, X, Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { sendDownloadReminderAction } from '@/modules/parents/parents.actions'
import type { StudentParentInfo } from '@/modules/parents/parents.types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function isAtRisk(s: StudentParentInfo) {
  return s.connectedParents.length === 0 && s.guardians.some(g => !!g.email)
}

function hasApp(s: StudentParentInfo) {
  return s.connectedParents.length > 0
}

function cleanPhone(phone: string) {
  return phone.replace(/\s/g, '').replace(/^0/, '33')
}

function getStudentEmails(s: StudentParentInfo): { email: string; label: string }[] {
  return s.guardians
    .filter(g => !!g.email)
    .map(g => ({ email: g.email!, label: g.firstName }))
}

function getPrimaryPhone(s: StudentParentInfo): string | null {
  return s.guardians.find(g => g.isPrimary)?.phone
    ?? s.guardians.find(g => !!g.phone)?.phone
    ?? null
}

// ── Bulk email dialog ──────────────────────────────────────────────────────────

function BulkEmailDialog({
  recipients,
  onClose,
}: {
  recipients: Array<{ studentName: string; email: string }>
  onClose: () => void
}) {
  const [subject, setSubject] = useState('Download the Qaf App – Stay Connected')
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
            <Mail className="h-5 w-5 text-[#c2440f] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-base text-foreground">Envoyer à tous les parents à risque</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ceci enverra le rappel de téléchargement à {recipients.length} adresse{recipients.length > 1 ? 's' : ''} e-mail d&apos;élèves dont les parents n&apos;ont pas encore installé l&apos;application.
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
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]/50"
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
                  <span className="font-medium text-foreground truncate">{r.studentName}</span>
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
            className="gap-1.5 bg-[#c2440f] hover:bg-[#a33a0d] text-white"
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
  student,
  schoolName,
  onClose,
}: {
  student: StudentParentInfo
  schoolName: string
  onClose: () => void
}) {
  const emails = getStudentEmails(student)
  const emailList = emails.map(e => e.email).join(', ')
  const [subject, setSubject] = useState(`[${schoolName}] – Download the Qaf App – Stay Connected`)
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    startTransition(async () => {
      const result = await sendDownloadReminderAction(emails.map(e => e.email), subject)
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
            <Send className="h-5 w-5 text-[#c2440f] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-base text-foreground">Envoyer un rappel de téléchargement</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Envoyer un rappel à ce parent pour télécharger l&apos;application Qaf School.
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
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]/50"
            />
          </div>

          {/* Email preview */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Aperçu de l&apos;e-mail</p>
            <div className="rounded-xl border border-border overflow-hidden">
              {/* Email header (matches Qaf brand) */}
              <div className="bg-[#7a4f30] px-6 py-5 flex flex-col items-center gap-1">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Q</span>
                </div>
                <p className="text-white font-semibold text-sm mt-1">Qaf App</p>
                <p className="text-white/70 text-xs">{schoolName}</p>
              </div>
              {/* Email body */}
              <div className="px-5 py-4 bg-white text-sm text-foreground space-y-2">
                <p>Assalamu Alaikum,</p>
                <p className="text-muted-foreground">We hope you are doing well.</p>
                <p className="text-muted-foreground text-xs">
                  We invite you to download the Qaf School app to stay connected with your child&apos;s education.
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
            className="gap-1.5 bg-[#c2440f] hover:bg-[#a33a0d] text-white"
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
  color: 'orange' | 'green'
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
            ? 'bg-[#c2440f] border-[#c2440f] text-white'
            : 'bg-emerald-600 border-emerald-600 text-white'
          : 'bg-white border-border text-muted-foreground hover:border-muted-foreground/50',
      )}
    >
      {label}
      <span className={cn(
        'h-5 min-w-5 rounded-full text-[11px] font-bold flex items-center justify-center px-1',
        active
          ? 'bg-white/25 text-white'
          : color === 'orange' ? 'bg-[#c2440f]/10 text-[#c2440f]' : 'bg-emerald-50 text-emerald-700',
      )}>
        {count}
      </span>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

type Filter = 'all' | 'risk' | 'app'

export function ParentsClient({
  parents,
  schoolName,
}: {
  parents: StudentParentInfo[]
  schoolName: string
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [individualDialog, setIndividualDialog] = useState<StudentParentInfo | null>(null)
  const [showBulkDialog, setShowBulkDialog] = useState(false)

  const atRiskCount = useMemo(() => parents.filter(isAtRisk).length, [parents])
  const hasAppCount = useMemo(() => parents.filter(hasApp).length, [parents])

  const atRiskRecipients = useMemo(() =>
    parents
      .filter(isAtRisk)
      .flatMap(s => getStudentEmails(s).map(e => ({
        studentName: `${s.firstName} ${s.lastName}`,
        email: e.email,
      }))),
    [parents],
  )

  const filtered = useMemo(() => {
    let list = parents
    if (filter === 'risk') list = list.filter(isAtRisk)
    if (filter === 'app')  list = list.filter(hasApp)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.guardians.some(g =>
          (g.phone ?? '').toLowerCase().includes(q) ||
          (g.email ?? '').toLowerCase().includes(q) ||
          g.firstName.toLowerCase().includes(q)
        ),
      )
    }
    return list
  }, [parents, filter, search])

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Voir quels parents ont téléchargé l&apos;application et qui a besoin d&apos;un rappel
          </p>
        </div>

        <Button
          onClick={() => setShowBulkDialog(true)}
          disabled={atRiskRecipients.length === 0}
          className="gap-2 bg-[#c2440f] hover:bg-[#a33a0d] text-white shrink-0"
        >
          <Mail className="h-4 w-4" />
          E-mail à risque ({atRiskRecipients.length})
        </Button>
      </div>

      {/* Stats badges */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs font-medium text-muted-foreground bg-muted/60 border border-border rounded-full px-2.5 py-1">
          {parents.length} élève{parents.length > 1 ? 's' : ''}
        </span>
        <span className={cn(
          'text-xs font-medium rounded-full px-2.5 py-1 border',
          hasAppCount > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-[#c2440f]/10 border-[#c2440f]/20 text-[#c2440f]',
        )}>
          Utilisation de l&apos;app : {hasAppCount}
        </span>
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-4 mb-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Rechercher par nom ou téléphone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]/50"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <FilterChip
            label="À risque"
            count={atRiskCount}
            active={filter === 'risk'}
            color="orange"
            onClick={() => setFilter(f => f === 'risk' ? 'all' : 'risk')}
          />
          <FilterChip
            label="Application téléchargée"
            count={hasAppCount}
            active={filter === 'app'}
            color="green"
            onClick={() => setFilter(f => f === 'app' ? 'all' : 'app')}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs whitespace-nowrap">
                Nom de l&apos;élève ↑
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs whitespace-nowrap">
                <span className="flex items-center gap-1"><Key className="h-3.5 w-3.5" /> Parents Connectés</span>
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs whitespace-nowrap">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Parents Enregistrés</span>
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
            {filtered.map(student => {
              const risk = isAtRisk(student)
              const emails = getStudentEmails(student)
              return (
                <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                  {/* Student name */}
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {risk && (
                        <AlertTriangle className="h-3.5 w-3.5 text-[#c2440f] shrink-0" />
                      )}
                      {!risk && student.connectedParents.length > 0 && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      )}
                      {student.firstName} {student.lastName}
                    </div>
                  </td>

                  {/* Connected parents */}
                  <td className="px-4 py-3">
                    {student.connectedParents.length === 0
                      ? <span className="text-muted-foreground/60 italic text-xs">Aucun parent connecté</span>
                      : (
                        <div className="space-y-0.5">
                          {student.connectedParents.map((p, i) => (
                            <div key={i} className="text-xs font-medium text-foreground">
                              {p.fullName ?? 'Parent connecté'}
                            </div>
                          ))}
                        </div>
                      )
                    }
                  </td>

                  {/* Registered guardians */}
                  <td className="px-4 py-3">
                    <div className="space-y-1.5">
                      {student.guardians.length === 0
                        ? <span className="text-muted-foreground/60 italic text-xs">—</span>
                        : student.guardians.map(g => (
                          <div key={g.id}>
                            <p className="text-xs font-medium text-foreground">{g.firstName} {g.lastName}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{g.relationship}</p>
                          </div>
                        ))
                      }
                    </div>
                  </td>

                  {/* Emails */}
                  <td className="px-4 py-3">
                    <div className="space-y-1.5">
                      {emails.map(({ email, label }) => (
                        <div key={label}>
                          <a
                            href={`mailto:${email}`}
                            className="text-xs text-[#c2440f] hover:underline block"
                          >
                            {email}
                          </a>
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                        </div>
                      ))}
                      {emails.length === 0 && (
                        <span className="text-muted-foreground/60 italic text-xs">—</span>
                      )}
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {getPrimaryPhone(student) ?? '—'}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {(() => {
                      const phone = getPrimaryPhone(student)
                      return (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {phone && (
                        <a
                          href={`https://wa.me/${cleanPhone(phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                        >
                          <MessageCircle className="h-3 w-3" />
                          WhatsApp
                        </a>
                      )}
                      {emails.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIndividualDialog(student)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border border-[#c2440f]/30 text-[#c2440f] hover:bg-[#c2440f]/5 transition-colors"
                        >
                          <Mail className="h-3 w-3" />
                          Rappel par e-mail
                        </button>
                      )}
                    </div>
                      )
                    })()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      {showBulkDialog && (
        <BulkEmailDialog
          recipients={atRiskRecipients}
          onClose={() => setShowBulkDialog(false)}
        />
      )}
      {individualDialog && (
        <IndividualEmailDialog
          student={individualDialog}
          schoolName={schoolName}
          onClose={() => setIndividualDialog(null)}
        />
      )}
    </div>
  )
}
