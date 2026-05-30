import { supabase } from './supabase'

const USE_MOCK = import.meta.env.DEV
const LS_READ  = 'btrt-notif-read'   // ids de broadcasts leídos (no tienen read_at por-usuario)

/* ── Read-state local de broadcasts ─────────────────────────────────────── */
function readBroadcastSet() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_READ) || '[]')) } catch { return new Set() }
}
function markBroadcastRead(id) {
  const s = readBroadcastSet(); s.add(id)
  try { localStorage.setItem(LS_READ, JSON.stringify([...s])) } catch { /* ignore */ }
}

const MOCK = [
  { id: 'm1', user_id: null, kind: 'payment', title: 'Recordatorio de cuota', body: 'Hoy es el último día para pagar la cuota del mes.', url: '/inicio', read_at: null, created_at: new Date(Date.now() - 3600e3).toISOString() },
  { id: 'm2', user_id: 'dev', kind: 'plan', title: 'Planificación disponible', body: 'Ya está la semana del 1 al 7 de junio. Anotate a tus turnos.', url: '/planificacion-semanal', read_at: null, created_at: new Date(Date.now() - 8e6).toISOString() },
]

/* ── API ────────────────────────────────────────────────────────────────── */

export async function listNotifications(userId, limit = 20) {
  let rows
  if (USE_MOCK) {
    rows = MOCK
  } else {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit)
    rows = data ?? []
  }
  const broadcastRead = readBroadcastSet()
  return rows.map(n => ({
    ...n,
    isRead: n.user_id === null ? broadcastRead.has(n.id) : !!n.read_at,
  }))
}

export function unreadCount(list) {
  return list.filter(n => !n.isRead).length
}

export async function markRead(notif, userId) {
  if (notif.user_id === null) { markBroadcastRead(notif.id); return }
  if (USE_MOCK) { notif.read_at = new Date().toISOString(); return }
  await supabase.from('notifications').update({ read_at: new Date().toISOString() })
    .eq('id', notif.id).eq('user_id', userId)
}

export async function markAllRead(list, userId) {
  await Promise.all(list.filter(n => !n.isRead).map(n => markRead(n, userId)))
}

/** Realtime: nuevas notificaciones (propias o broadcast). Devuelve unsubscribe. */
export function subscribeNotifications(userId, onInsert) {
  if (USE_MOCK) return () => {}
  const ch = supabase
    .channel('rt-notifs')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
      const n = payload.new
      if (n.user_id === null || n.user_id === userId) onInsert(n)
    })
    .subscribe()
  return () => { supabase.removeChannel(ch) }
}

export const KIND_ICON = {
  payment: '💳',
  plan:    '🏔',
  info:    '🔔',
  warning: '⚠️',
}
