import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import {
  listNotifications, unreadCount, markRead, markAllRead,
  subscribeNotifications, KIND_ICON,
} from '../lib/notifications'
import { Bell } from 'lucide-react'

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60) return 'recién'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  return `hace ${Math.floor(s / 86400)} d`
}

export default function NotificationBell({ compact }) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  async function refresh() {
    setList(await listNotifications(user?.id))
  }

  useEffect(() => {
    refresh()
    const off = subscribeNotifications(user?.id, (n) => {
      toast?.({ kind: n.kind ?? 'info', title: n.title, body: n.body })
      refresh()
    })
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (!open) return
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const unread = unreadCount(list)

  async function onItem(n) {
    await markRead(n, user?.id)
    refresh()
    setOpen(false)
    if (n.url) navigate(n.url)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative flex items-center justify-center transition-colors ${
          compact ? 'w-8 h-8 rounded-lg hover:bg-white/8 text-slate-400 hover:text-white'
                  : 'text-slate-500 hover:text-white'
        }`}
        title="Notificaciones"
        aria-label="Notificaciones"
      >
        <Bell size={compact ? 16 : 16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-brand text-black text-[9px] font-black flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-white/10 rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <p className="text-white text-sm font-bold">Notificaciones</p>
            {unread > 0 && (
              <button onClick={async () => { await markAllRead(list, user?.id); refresh() }}
                className="text-brand text-[11px] font-semibold hover:underline">
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {list.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-10">Sin notificaciones</p>
            ) : list.map(n => (
              <button
                key={n.id}
                onClick={() => onItem(n)}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${
                  n.isRead ? 'opacity-60' : ''
                }`}
              >
                <span className="text-base shrink-0 mt-0.5">{KIND_ICON[n.kind] ?? '🔔'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold leading-snug">{n.title}</p>
                  {n.body && <p className="text-slate-400 text-xs mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>}
                  <p className="text-slate-600 text-[10px] mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
