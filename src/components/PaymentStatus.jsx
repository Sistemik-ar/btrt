import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import {
  getSettings, getMyPayment, uploadProof, deleteMyProof,
  currentPeriod, periodLabel, PAY_STATE,
} from '../lib/payments'
import { Upload, Check, Clock, X, FileText, Trash2, CreditCard } from 'lucide-react'

/**
 * Tarjeta de estado de pago del mes para el miembro.
 * Subir comprobante → validando → (admin) aprobado/rechazado. Borrar y resubir.
 */
export default function PaymentStatus() {
  const { user, profile } = useAuth()
  const [settings, setSettings] = useState(null)
  const [payment, setPayment]   = useState(undefined) // undefined=loading
  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState(null)
  const fileRef = useRef(null)
  const period  = currentPeriod()

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [s, p] = await Promise.all([getSettings(), getMyPayment(user?.id, period)])
      if (!alive) return
      setSettings(s); setPayment(p)
    })()
    return () => { alive = false }
  }, [user?.id, period])

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { setErr('El archivo supera 8MB.'); return }
    setBusy(true); setErr(null)
    try {
      const rec = await uploadProof(user?.id, profile?.name ?? user?.email, file, {
        amount: settings?.fee_amount, period,
      })
      setPayment(rec)
    } catch (e) {
      setErr(e.message ?? 'No se pudo subir el comprobante')
    } finally { setBusy(false) }
  }

  async function removeProof() {
    if (!confirm('¿Borrar el comprobante y subir otro?')) return
    setBusy(true); setErr(null)
    try {
      await deleteMyProof(user?.id, period)
      setPayment(await getMyPayment(user?.id, period))
    } catch (e) {
      setErr(e.message ?? 'No se pudo borrar')
    } finally { setBusy(false) }
  }

  if (payment === undefined || !settings) {
    return <div className="bg-card border border-white/[0.06] rounded-2xl h-24 animate-pulse" />
  }

  const state = payment?.state ?? 'pending'
  const st = PAY_STATE[state]
  const fee = new Intl.NumberFormat('es-AR', { style: 'currency', currency: settings.currency ?? 'ARS', maximumFractionDigits: 0 }).format(settings.fee_amount)
  const approved = state === 'approved'

  return (
    <div className="bg-card border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
            <CreditCard size={18} className="text-brand" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm">Cuota {periodLabel(period)}</p>
            <p className="text-slate-500 text-xs mt-0.5">{fee} · vence el {settings.due_day} de cada mes</p>
          </div>
        </div>
        <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${st.cls}`}>
          {state === 'approved' && <Check size={11} className="inline mr-1" />}
          {state === 'validating' && <Clock size={11} className="inline mr-1" />}
          {st.label}
        </span>
      </div>

      {err && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}

      {/* Acciones según estado */}
      {approved ? (
        <p className="text-emerald-400/80 text-xs flex items-center gap-2">
          <Check size={14} /> Pago confirmado. ¡Gracias!
        </p>
      ) : state === 'validating' ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-2 text-xs text-slate-400 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 flex-1 min-w-0">
            <FileText size={14} className="text-slate-500 shrink-0" />
            <span className="truncate">Comprobante enviado · esperando validación de Roco</span>
          </span>
          <button
            onClick={removeProof} disabled={busy}
            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-xs font-bold transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} /> Cambiar
          </button>
        </div>
      ) : (
        <>
          {state === 'rejected' && (
            <p className="text-red-400/80 text-xs flex items-center gap-2">
              <X size={14} /> {payment?.note || 'El comprobante fue rechazado. Subí uno nuevo.'}
            </p>
          )}
          <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={onFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()} disabled={busy}
            className="h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-brand text-black text-sm font-bold hover:bg-[#d4ff33] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Upload size={15} /> {busy ? 'Subiendo…' : 'Subir comprobante'}
          </button>
          <p className="text-slate-600 text-[11px] text-center">Imagen o PDF · hasta 8MB</p>
        </>
      )}
    </div>
  )
}
