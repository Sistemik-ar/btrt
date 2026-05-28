import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import {
  PUSH_SUPPORTED, permissionState, requestPermission,
  subscribeToPush, showTestNotification,
} from '../lib/push'
import { Bell, BellRing, BellOff, Send } from 'lucide-react'

/**
 * Notification opt-in card. Three states: enable / enabled / blocked.
 * Dismissable once enabled (stores a local flag) so it doesn't nag forever.
 */
export default function NotificationsCard() {
  const { user } = useAuth()
  const [perm, setPerm]   = useState(() => (PUSH_SUPPORTED ? permissionState() : 'unsupported'))
  const [busy, setBusy]   = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('btrt-notif-dismissed') === '1' } catch { return false }
  })

  useEffect(() => {
    if (perm === 'granted' && user?.id) subscribeToPush(user.id).catch(() => {})
  }, [perm, user?.id])

  async function enable() {
    setBusy(true)
    const res = await requestPermission()
    setPerm(res)
    if (res === 'granted') {
      await subscribeToPush(user?.id).catch(() => {})
      await showTestNotification().catch(() => {})
    }
    setBusy(false)
  }

  async function test() {
    setBusy(true)
    await showTestNotification().catch(() => {})
    setBusy(false)
  }

  function dismiss() {
    try { localStorage.setItem('btrt-notif-dismissed', '1') } catch {}
    setDismissed(true)
  }

  if (perm === 'unsupported') return null
  if (perm === 'granted' && dismissed) return null

  // ── Blocked ──
  if (perm === 'denied') {
    return (
      <Wrapper icon={<BellOff size={14} className="text-slate-400" />} tone="muted">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">Notificaciones bloqueadas</p>
          <p className="text-slate-500 text-xs mt-0.5">
            Activalas desde los ajustes del navegador (ícono 🔒 al lado de la URL → Notificaciones → Permitir).
          </p>
        </div>
      </Wrapper>
    )
  }

  // ── Enabled ──
  if (perm === 'granted') {
    return (
      <Wrapper icon={<BellRing size={14} className="text-brand" />}>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">Notificaciones activadas</p>
          <p className="text-slate-500 text-xs mt-0.5">Te avisamos cuando se publica la planificación y antes de cada sesión.</p>
        </div>
        <button
          onClick={test} disabled={busy}
          className="flex items-center gap-1.5 bg-white/5 text-slate-300 border border-white/10 text-xs font-bold px-3 py-2 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50 shrink-0"
        >
          <Send size={12} /> Probar
        </button>
        <button onClick={dismiss} className="text-slate-500 hover:text-white text-xs px-2 shrink-0">Ocultar</button>
      </Wrapper>
    )
  }

  // ── Default (not asked yet) ──
  return (
    <Wrapper icon={<Bell size={14} className="text-brand" />}>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">Activá las notificaciones</p>
        <p className="text-slate-500 text-xs mt-0.5">Recibí avisos en el celu: planificación nueva, recordatorio de tu sesión, cambios de último momento.</p>
      </div>
      <button
        onClick={enable} disabled={busy}
        className="bg-brand text-black text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#d4ff33] active:scale-95 transition-all disabled:opacity-50 shrink-0"
      >
        {busy ? 'Activando…' : 'Activar'}
      </button>
    </Wrapper>
  )
}

function Wrapper({ icon, children, tone }) {
  return (
    <div className={`bg-card border rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap ${
      tone === 'muted' ? 'border-white/8' : 'border-brand/30'
    }`}>
      <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
        {icon}
      </div>
      {children}
    </div>
  )
}
