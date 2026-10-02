'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, ExternalLink } from 'lucide-react'
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '@/modules/notifications/notifications.hooks'
import type { Notification } from '@/modules/notifications/notifications.types'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const TYPE_ICON: Record<string, string> = {
  role_granted:           '🎓',
  role_revoked:           '🔒',
  account_activated:      '✅',
  registration_approved:  '✅',
  registration_rejected:  '❌',
  teacher_invitation:     '📩',
  exam_signature_reset:   '✍️',
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data: notifications = [] } = useNotifications()
  const { data: unreadCount = 0 } = useUnreadCount()
  const { mutate: markRead } = useMarkRead()
  const { mutate: markAllRead } = useMarkAllRead()
  const router = useRouter()

  function handleNotificationClick(n: Notification) {
    if (!n.readAt) markRead(n.id)
    if (n.link) {
      router.push(n.link)
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      {/* Bouton cloche */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-sidebar-foreground/80" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="fixed left-2 bottom-24 w-[min(20rem,calc(100vw-1rem))] lg:absolute lg:left-0 lg:bottom-10 lg:w-80 z-50 bg-white rounded-xl shadow-xl border border-border overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#2d6a4f]" />
                <span className="font-semibold text-sm text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tout lire
                </button>
              )}
            </div>

            {/* Liste */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Bell className="h-8 w-8 opacity-30" />
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                notifications.map(n => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onClick={() => handleNotificationClick(n)}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function NotificationItem({ notification: n, onClick }: { notification: Notification; onClick: () => void }) {
  const isUnread = !n.readAt
  const icon = TYPE_ICON[n.type] ?? '🔔'
  const timeAgo = formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0',
        isUnread && 'bg-[#f4f9f3]',
      )}
    >
      {/* Icône + point non-lu */}
      <div className="relative shrink-0 mt-0.5">
        <span className="text-lg leading-none">{icon}</span>
        {isUnread && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#2d6a4f]" />
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', isUnread ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
          {n.title}
        </p>
        {n.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-1">{timeAgo}</p>
      </div>

      {/* Flèche si lien */}
      {n.link && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-1" />}
    </button>
  )
}
