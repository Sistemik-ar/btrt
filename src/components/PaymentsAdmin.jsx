import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import {
  listPayments, reviewPayment, getProofUrl, getSettings, saveSettings,
  currentPeriod, periodLabel, PAY_STATE,
} from '../lib/payments'
import {
  Search, Check, X, FileText, Settings, DollarSign, Clock, Users, Download,
} from 'lucide-react'

const STATES = [
  { key: '',           label: 'Todos'      },
  { key: 'validating', label: 'Validando'  },
  { key: 'pending',    label: 'Pendientes' },
  { key: 'approved',   label: 'Aprobados'  },
  { key: 'rejected',   label: 'Rechazados' },
]

export default function PaymentsAdmin() {
  const { user } = useAuth()
  const [period, setPeriod]   = useState(currentPeriod())
  const [stateF, setStateF]   = useState('')
  const [query, setQuery]     = useState('')
  const [rows, setRows]       = useState(null)
  const [settings, setSettings] = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  async function refresh() {
    setRows(null)
    const [r, s] = await Promise.all([listPayments({ period }), getSettings()])
    setRows(r); setSettings(s)
  }
  useEffect(() => { refresh() /* eslint-disable-line */ }, [period])

  const filtered = useMemo(() => {
    let list = rows ?? []
    if (stateF) list = list.filter(r => (r.state ?? 'pending') === stateF)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(r => (r.members?.name ?? r.member_name ?? '').toLowerCase().includes(q))
    }
    return list
  }, [rows, stateF, query])

  const stats = useMemo(() => {
    const list = rows ?? []
    const approved = list.filter(r => r.state === 'approved')
    return {
      total:    list.length,
      validating: list.filter(r => r.state === 'validating').length,
      approved: approved.length,
      revenue:  approved.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    }
  }, [rows])

  async function review(id, decision) {
    await reviewPayment(id, decision, user?.id)
    refresh()
  }

  async function openProof(path) {
    const url = await getProofUrl(path)
    if (url) window.open(url, '_blank')
    else alert('Comprobante no disponible (modo dev o sin archivo).')
  }

  function exportCsv() {
    const header = ['nombre', 'email', 'periodo', 'monto', 'estado', 'fecha']
    const lines = [header.join(',')]
    for (const r of filtered) {
      lines.push([
        `"${r.members?.name ?? r.member_name ?? ''}"`,
        r.members?.email ?? '',
        r.period ?? '',
        r.amount ?? '',
        r.state ?? 'pending',
        (r.created_at ?? '').split('T')[0],
      ].join(','))
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `pagos-${period}.csv`
    a.click()
  }

  const money = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: settings?.currency ?? 'ARS', maximumFractionDigits: 0 }).format(n || 0)

  // últimos 6 períodos para el selector
  const periods = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    return currentPeriod(d)
  })

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={DollarSign} label="Ingresos del mes" value={money(stats.revenue)} accent="#C6FF00" />
        <Stat icon={Check}      label="Aprobados"        value={stats.approved} accent="#34d399" />
        <Stat icon={Clock}      label="Validando"        value={stats.validating} accent="#fbbf24" />
        <Stat icon={Users}      label="Registros"        value={stats.total} accent="#3b82f6" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="h-9 rounded-lg bg-card border border-white/[0.08] px-3 text-sm text-white focus:outline-none capitalize">
          {periods.map(p => <option key={p} value={p}>{periodLabel(p)}</option>)}
        </select>

        <div className="flex items-center gap-2 h-9 rounded-lg bg-card border border-white/[0.08] px-2.5 flex-1 min-w-[160px]">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar miembro…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none" />
        </div>

        <button onClick={exportCsv} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-card text-slate-300 text-xs font-bold hover:text-white transition-colors">
          <Download size={14} /> CSV
        </button>
        <button onClick={() => setShowSettings(s => !s)} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-card text-slate-300 text-xs font-bold hover:text-white transition-colors">
          <Settings size={14} /> Cuota
        </button>
      </div>

      {showSettings && settings && (
        <SettingsForm settings={settings} onSaved={s => { setSettings(s); setShowSettings(false); refresh() }} />
      )}

      {/* State filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {STATES.map(s => (
          <button key={s.key} onClick={() => setStateF(s.key)}
            className={`h-8 px-3 rounded-lg text-xs font-bold transition-colors ${
              stateF === s.key ? 'bg-brand text-black' : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* List */}
      {rows === null ? (
        <div className="flex flex-col gap-2">
          {[0,1,2].map(i => <div key={i} className="h-16 bg-card border border-white/[0.06] rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-slate-500 text-sm py-16 bg-card/50 border border-white/[0.06] rounded-2xl">
          Sin pagos para este filtro.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(r => {
            const st = PAY_STATE[r.state ?? 'pending']
            return (
              <div key={r.id} className="bg-card border border-white/[0.08] rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center shrink-0">
                  <span className="text-white text-[11px] font-bold">
                    {(r.members?.name ?? r.member_name ?? '?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold truncate">{r.members?.name ?? r.member_name ?? 'Miembro'}</p>
                  <p className="text-slate-500 text-[11px] truncate">{money(r.amount)} · {r.members?.email ?? ''}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border ${st.cls}`}>{st.label}</span>

                {r.proof_text && (
                  <button onClick={() => openProof(r.proof_text)} title="Ver comprobante"
                    className="h-8 w-8 shrink-0 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <FileText size={14} />
                  </button>
                )}
                {(r.state === 'validating' || r.state === 'pending') && (
                  <>
                    <button onClick={() => review(r.id, 'approved')} title="Aprobar"
                      className="h-8 w-8 shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                      <Check size={14} />
                    </button>
                    <button onClick={() => review(r.id, 'rejected')} title="Rechazar"
                      className="h-8 w-8 shrink-0 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors">
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-card border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wide">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: accent+'1a', color: accent }}>
          <Icon size={13} />
        </div>
      </div>
      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
    </div>
  )
}

function SettingsForm({ settings, onSaved }) {
  const [fee, setFee] = useState(settings.fee_amount)
  const [due, setDue] = useState(settings.due_day)
  const [busy, setBusy] = useState(false)
  async function save() {
    setBusy(true)
    const s = await saveSettings({ fee_amount: Number(fee), due_day: Number(due) })
    setBusy(false); onSaved(s)
  }
  return (
    <div className="bg-card border border-white/[0.08] rounded-2xl p-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Cuota mensual</span>
        <input type="number" value={fee} onChange={e => setFee(e.target.value)}
          className="h-10 w-36 rounded-lg bg-black/20 border border-white/[0.06] px-3 text-sm text-white focus:outline-none focus:border-brand/50" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Vence el día</span>
        <input type="number" min="1" max="28" value={due} onChange={e => setDue(e.target.value)}
          className="h-10 w-24 rounded-lg bg-black/20 border border-white/[0.06] px-3 text-sm text-white focus:outline-none focus:border-brand/50" />
      </label>
      <button onClick={save} disabled={busy}
        className="h-10 px-4 rounded-lg bg-brand text-black text-sm font-bold hover:bg-[#d4ff33] transition-colors disabled:opacity-50">
        {busy ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  )
}
