import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import PlanEditor from '../components/PlanEditor'

import { isAdmin as checkAdmin } from '../lib/auth'

function getCurrentWeekId() {
  const today  = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return monday.toISOString().split('T')[0]
}

/* ── Main page ─────────────────────────────────────────────────── */
export default function Admin() {
  const { user } = useAuth()
  const isAdmin  = checkAdmin(user?.email)
  const [activeTab, setActiveTab] = useState('plan')

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <LockIcon size={22} />
        </div>
        <div>
          <p className="text-white font-semibold">Acceso restringido</p>
          <p className="text-slate-500 text-sm mt-1">Solo el administrador puede ver esta sección.</p>
        </div>
      </div>
    )
  }

  const TABS = [
    { id: 'plan',    label: 'Planificación', icon: PlanIcon },
    { id: 'members', label: 'Miembros',      icon: TeamIcon },
    { id: 'bot',     label: 'Bot WA',        icon: BotIcon  },
  ]

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-black text-white tracking-tight">Panel admin</h1>
          <p className="text-slate-500 text-sm mt-1 truncate">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-brand bg-brand/8 border border-brand/20 px-3 py-1.5 rounded-full w-fit font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
          Admin activo
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === id
                ? 'bg-brand text-black'
                : 'bg-white/[0.04] text-slate-400 border border-white/5 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon size={15} />
            {label}
            {id === 'bot' && (
              <span className="text-[9px] font-black bg-black/20 px-1.5 py-0.5 rounded-md tracking-wider">ADMIN</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'plan'    && <PlanEditor />}
      {activeTab === 'members' && <MembersTab />}
      {activeTab === 'bot'     && <BotTab />}
    </div>
  )
}


/* ─────────────────────────── MIEMBROS ─────────────────────────── */
function MembersTab() {
  const [members,        setMembers]        = useState([])
  const [filter,         setFilter]         = useState('all')
  const [search,         setSearch]         = useState('')
  const [editingWa,      setEditingWa]      = useState(null)
  const [waInput,        setWaInput]        = useState('')
  const [waError,        setWaError]        = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [selectedMember, setSelectedMember] = useState(null)
  const [payments,       setPayments]       = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  // Invite / reset state
  const [inviteOpen,  setInviteOpen]  = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName,  setInviteName]  = useState('')
  const [inviteBusy,  setInviteBusy]  = useState(false)
  const [inviteMsg,   setInviteMsg]   = useState(null) // { ok: bool, text }
  const [resetting,   setResetting]   = useState({})    // memberId -> 'ok' | 'err' | 'loading'

  useEffect(() => {
    supabase.from('members').select('*').order('name')
      .then(({ data }) => { setMembers(data ?? []); setLoading(false) })
  }, [])

  async function updateStatus(id, status) {
    await supabase.from('members').update({ status }).eq('id', id)
    setMembers(prev => prev.map(m => m.id === id ? { ...m, status } : m))
  }

  /**
   * Invite a new member via magic link.
   * Supabase sends a one-click email. `shouldCreateUser: true` provisions
   * an auth.users row on first click. Optionally pre-creates a `members` row.
   */
  async function inviteUser() {
    if (!inviteEmail.trim()) return
    setInviteBusy(true)
    setInviteMsg(null)
    try {
      const email = inviteEmail.trim().toLowerCase()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) throw error

      // Pre-create members row if we have a name and one doesn't exist yet.
      if (inviteName.trim()) {
        const exists = members.some(m => m.email?.toLowerCase() === email)
        if (!exists) {
          const { data } = await supabase
            .from('members')
            .insert({ name: inviteName.trim(), email, status: 'active' })
            .select()
            .single()
          if (data) setMembers(prev => [...prev, data].sort((a,b) => (a.name||'').localeCompare(b.name||'')))
        }
      }

      setInviteMsg({ ok: true, text: `Magic link enviado a ${email}` })
      setInviteEmail('')
      setInviteName('')
    } catch (e) {
      setInviteMsg({ ok: false, text: e.message ?? 'Error enviando invitación' })
    } finally {
      setInviteBusy(false)
    }
  }

  /** Send password-reset email to the member. */
  async function resetPassword(member) {
    if (!member.email) {
      setResetting(s => ({ ...s, [member.id]: 'noemail' }))
      setTimeout(() => setResetting(s => ({ ...s, [member.id]: null })), 2500)
      return
    }
    setResetting(s => ({ ...s, [member.id]: 'loading' }))
    const { error } = await supabase.auth.resetPasswordForEmail(member.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    // Clear password_set so the "Creá tu contraseña" banner reappears for them.
    if (!error) {
      await supabase.from('members').update({ password_set: false }).eq('id', member.id)
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, password_set: false } : m))
    }
    setResetting(s => ({ ...s, [member.id]: error ? 'err' : 'ok' }))
    setTimeout(() => setResetting(s => ({ ...s, [member.id]: null })), 2500)
  }

  async function saveWaId(id) {
    setWaError(null)
    const cleaned = waInput.replace(/\D/g, '')
    const { error } = await supabase.from('members').update({ wa_id: cleaned || null }).eq('id', id)
    if (error) { setWaError(error.message); return }
    setMembers(prev => prev.map(m => m.id === id ? { ...m, wa_id: cleaned || null } : m))
    setEditingWa(null)
    setWaInput('')
  }

  async function viewPayments(member) {
    setSelectedMember(member)
    setPaymentsLoading(true)
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
    setPayments(data ?? [])
    setPaymentsLoading(false)
  }

  const counts = {
    all:      members.length,
    active:   members.filter(m => m.status === 'active').length,
    moroso:   members.filter(m => m.status === 'moroso').length,
    inactive: members.filter(m => m.status === 'inactive').length,
  }
  const withWa = members.filter(m => m.wa_id).length

  const byStatus  = filter === 'all' ? members : members.filter(m => m.status === filter)
  const filtered  = search.trim()
    ? byStatus.filter(m => m.name?.toLowerCase().includes(search.trim().toLowerCase()))
    : byStatus

  const STATUS_FILTERS = [
    { id: 'all',      label: 'Todos',    count: counts.all      },
    { id: 'active',   label: 'Al día',   count: counts.active   },
    { id: 'moroso',   label: 'Moroso',   count: counts.moroso   },
    { id: 'inactive', label: 'Inactivo', count: counts.inactive },
  ]

  // ── Payment history view ──
  if (selectedMember) {
    const approved = payments.filter(p => p.status === 'approved')
    const pending  = payments.filter(p => p.status === 'pending')
    const total    = approved.reduce((s, p) => s + (p.amount ?? 0), 0)

    const statusCfg = {
      approved: { label: 'Aprobado',  color: 'text-brand',   bg: 'bg-brand/10 border-brand/20'   },
      pending:  { label: 'Pendiente', color: 'text-yellow-400',  bg: 'bg-yellow-400/10 border-yellow-400/20' },
      rejected: { label: 'Rechazado', color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20'       },
    }

    return (
      <div className="flex flex-col gap-5">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedMember(null); setPayments([]) }}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/[0.1] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate">{selectedMember.name}</p>
            <p className="text-slate-500 text-xs">Historial de pagos</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total pagado',  value: `$${total.toLocaleString('es-AR')}`, color: 'text-brand'  },
            { label: 'Aprobados',     value: approved.length,                     color: 'text-white'       },
            { label: 'Pendientes',    value: pending.length,                      color: pending.length ? 'text-yellow-400' : 'text-slate-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card border border-white/[0.1] rounded-2xl p-4">
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-slate-500 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Payment list */}
        {paymentsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-card border border-white/[0.1] rounded-2xl p-12 text-center">
            <p className="text-slate-500 text-sm">Sin pagos registrados.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {payments.map(p => {
              const cfg = statusCfg[p.status] ?? { label: p.status, color: 'text-slate-400', bg: 'bg-white/5 border-white/10' }
              const date = new Date(p.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
              return (
                <div key={p.id} className="bg-card border border-white/[0.1] rounded-2xl p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-bold text-lg">
                        {p.amount != null ? `$${p.amount.toLocaleString('es-AR')}` : '—'}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">{date}</p>
                    {p.proof_text && p.proof_text !== '(comprobante adjunto)' && (
                      <p className="text-slate-600 text-[11px] mt-1 italic line-clamp-1">"{p.proof_text}"</p>
                    )}
                  </div>
                  {p.approved_by && (
                    <p className="text-slate-700 text-[10px] shrink-0">por {p.approved_by.split(' ')[0]}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Member list view ──
  return (
    <div className="flex flex-col gap-5">

      {/* Invite form */}
      <div className="bg-card border border-white/8 rounded-2xl p-4 flex flex-col gap-3">
        <button
          onClick={() => { setInviteOpen(o => !o); setInviteMsg(null) }}
          className="flex items-center justify-between gap-2 text-left"
        >
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <UserPlusIcon /> Invitar nuevo miembro
          </span>
          <span className="text-slate-500 text-xs">{inviteOpen ? '−' : '+'}</span>
        </button>

        {inviteOpen && (
          <div className="flex flex-col gap-2">
            <p className="text-slate-600 text-xs">
              Mandá un magic link al email. El miembro entra con un click y luego puede setear contraseña. Si poneś nombre se crea su ficha aquí.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="email@bandurrias.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="flex-1 bg-[#060810] text-white rounded-xl px-3 py-2.5 text-sm border border-white/8 placeholder-slate-600 focus:outline-none focus:border-brand/40"
              />
              <input
                type="text"
                placeholder="Nombre (opcional)"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                className="flex-1 bg-[#060810] text-white rounded-xl px-3 py-2.5 text-sm border border-white/8 placeholder-slate-600 focus:outline-none focus:border-brand/40"
              />
              <button
                onClick={inviteUser}
                disabled={inviteBusy || !inviteEmail.trim()}
                className="bg-brand text-black rounded-xl px-4 py-2.5 text-xs font-bold hover:bg-[#d4ff33] active:scale-95 transition-all disabled:opacity-50"
              >
                {inviteBusy ? 'Enviando…' : 'Enviar magic link'}
              </button>
            </div>
            {inviteMsg && (
              <p className={`text-xs font-semibold ${inviteMsg.ok ? 'text-brand' : 'text-red-400'}`}>
                {inviteMsg.ok ? '✓' : '⚠'} {inviteMsg.text}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',        value: counts.all,    color: 'text-white'       },
          { label: 'Al día',       value: counts.active, color: 'text-brand'   },
          { label: 'Morosos',      value: counts.moroso, color: 'text-yellow-400'  },
          { label: 'WA vinculado', value: `${withWa}/${counts.all}`, color: withWa === counts.all ? 'text-brand' : 'text-slate-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-white/[0.1] rounded-2xl p-5">
            <p className={`text-3xl font-black ${color}`}>{value}</p>
            <p className="text-slate-500 text-sm mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Search + filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1 bg-card border border-white/[0.1] rounded-xl px-3 focus-within:border-brand/40 transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="flex-1 bg-transparent text-white py-3 text-sm placeholder-slate-600 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-600 hover:text-slate-400 transition-colors shrink-0 text-xs">✕</button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {STATUS_FILTERS.map(({ id, label, count }) => (
            <button key={id} onClick={() => setFilter(id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                filter === id
                  ? 'bg-brand/15 text-brand border border-brand/30'
                  : 'bg-white/[0.04] text-slate-500 border border-white/5 hover:text-slate-300'
              }`}>
              {label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === id ? 'bg-brand/20' : 'bg-white/5'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Member list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(m => {
            const initials = m.name?.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '?'
            const lastPay  = m.last_payment
              ? new Date(m.last_payment).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })
              : null
            const statusCfg = {
              active:   { color: 'text-brand',  label: 'Al día'   },
              moroso:   { color: 'text-yellow-400', label: 'Moroso'   },
              inactive: { color: 'text-slate-500',  label: 'Inactivo' },
            }[m.status] ?? { color: 'text-slate-400', label: m.status }

            return (
              <div key={m.id}
                className="bg-card border border-white/[0.1] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">

                {/* Avatar + info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                    <span className="text-brand text-sm font-bold">{initials}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-sm truncate">{m.name}</p>
                    <p className="text-slate-600 text-[11px] truncate">{m.email}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {lastPay && <span className="text-slate-600 text-[10px]">Último pago: {lastPay}</span>}
                      <span className={`text-[10px] font-semibold ${statusCfg.color}`}>{statusCfg.label}</span>
                    </div>
                  </div>
                </div>

                {/* WA ID */}
                <div className="flex flex-col gap-1 sm:w-48 shrink-0">
                  {editingWa === m.id ? (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={waInput}
                          onChange={e => { setWaInput(e.target.value); setWaError(null) }}
                          onKeyDown={e => { if (e.key === 'Enter') saveWaId(m.id); if (e.key === 'Escape') { setEditingWa(null); setWaError(null) } }}
                          placeholder="5492944123456"
                          className="flex-1 min-w-0 bg-[#060810] text-white rounded-xl px-3 py-2 text-xs border border-brand/40 focus:outline-none"
                        />
                        <button onClick={() => saveWaId(m.id)}
                          className="w-8 h-8 rounded-xl bg-brand/15 text-brand flex items-center justify-center text-xs font-bold hover:bg-brand/25 transition-all shrink-0">✓</button>
                        <button onClick={() => { setEditingWa(null); setWaError(null) }}
                          className="w-8 h-8 rounded-xl bg-white/5 text-slate-500 flex items-center justify-center text-xs hover:bg-white/10 transition-all shrink-0">✕</button>
                      </div>
                      {waError && <p className="text-red-400 text-[10px] leading-tight px-1">{waError}</p>}
                    </>
                  ) : (
                    <button
                      onClick={() => { setEditingWa(m.id); setWaInput(m.wa_id ?? '') }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all w-full ${
                        m.wa_id
                          ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15'
                          : 'bg-white/3 border-white/5 text-slate-600 hover:text-slate-400 hover:border-white/15'
                      }`}>
                      <WaIcon size={12} />
                      {m.wa_id ? m.wa_id : 'Sin WA vinculado'}
                    </button>
                  )}
                </div>

                {/* Status select */}
                <div className="shrink-0">
                  <select value={m.status} onChange={e => updateStatus(m.id, e.target.value)}
                    className={`bg-[#060810] rounded-xl px-3 py-2 text-xs border border-white/5 font-semibold focus:outline-none cursor-pointer ${statusCfg.color}`}>
                    <option value="active">Al día</option>
                    <option value="moroso">Moroso</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>

                {/* Reset password */}
                <button
                  onClick={() => resetPassword(m)}
                  disabled={resetting[m.id] === 'loading'}
                  title={m.email ? `Enviar email de reset a ${m.email}` : 'Sin email asociado'}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    resetting[m.id] === 'ok'      ? 'bg-brand/15 text-brand border-brand/30' :
                    resetting[m.id] === 'err'     ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                    resetting[m.id] === 'noemail' ? 'bg-slate-500/10 text-slate-400 border-slate-500/30' :
                    'bg-white/4 border-white/5 text-slate-500 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/5'
                  }`}>
                  <KeyIcon />
                  {resetting[m.id] === 'loading'  ? '…' :
                   resetting[m.id] === 'ok'       ? 'Enviado' :
                   resetting[m.id] === 'err'      ? 'Error' :
                   resetting[m.id] === 'noemail'  ? 'Sin email' :
                   'Reset'}
                </button>

                {/* Ver pagos */}
                <button
                  onClick={() => viewPayments(m)}
                  title="Ver historial de pagos"
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/5 text-slate-500 hover:text-brand hover:border-brand/30 hover:bg-brand/5 transition-all text-xs font-semibold">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                  Pagos
                </button>
              </div>
            )
          })}

          {filtered.length === 0 && !loading && (
            <div className="bg-card border border-white/[0.1] rounded-2xl p-12 text-center">
              <p className="text-slate-500 text-sm">
                {search ? `Sin resultados para "${search}".` : 'Sin miembros en esta categoría.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── BOT WA ─────────────────────────── */
function BotTab() {
  const [payments,  setPayments]  = useState([])
  const [members,   setMembers]   = useState([])
  const [sessions,  setSessions]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [acting,    setActing]    = useState({})
  const [section,   setSection]   = useState('pagos')
  const [broadcast, setBroadcast] = useState('')
  const [bcastSent, setBcastSent] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const weekId = getCurrentWeekId()
    const [{ data: pays }, { data: mems }, { data: sess }] = await Promise.all([
      supabase.from('payments').select('*, member:member_id(name)').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('members').select('*').order('name'),
      supabase.from('sessions').select('*, attendance(count)').eq('week_id', weekId),
    ])
    setPayments(pays ?? [])
    setMembers(mems ?? [])
    setSessions(sess ?? [])
    setLoading(false)
  }

  async function approvePayment(p) {
    setActing(a => ({ ...a, [p.id]: 'approving' }))
    const now = new Date().toISOString()
    await supabase.from('payments').update({ status: 'approved', approved_at: now }).eq('id', p.id)
    if (p.member_id) {
      await supabase.from('members').update({ status: 'active', last_payment: now }).eq('id', p.member_id)
    } else {
      const match = members.find(m =>
        m.name?.toLowerCase().includes((p.member_name ?? '').toLowerCase()) ||
        (p.member_name ?? '').toLowerCase().includes((m.name ?? '').toLowerCase())
      )
      if (match) {
        await supabase.from('members').update({ status: 'active', last_payment: now }).eq('id', match.id)
        await supabase.from('payments').update({ member_id: match.id }).eq('id', p.id)
      }
    }
    await loadAll()
    setActing(a => ({ ...a, [p.id]: null }))
  }

  async function rejectPayment(id) {
    setActing(a => ({ ...a, [id]: 'rejecting' }))
    await supabase.from('payments').update({ status: 'rejected' }).eq('id', id)
    setPayments(prev => prev.filter(p => p.id !== id))
    setActing(a => ({ ...a, [id]: null }))
  }

  async function markInactive(id) {
    setActing(a => ({ ...a, [id]: 'removing' }))
    await supabase.from('members').update({ status: 'inactive' }).eq('id', id)
    setMembers(prev => prev.map(m => m.id === id ? { ...m, status: 'inactive' } : m))
    setActing(a => ({ ...a, [id]: null }))
  }

  function copyBroadcast() {
    if (!broadcast.trim()) return
    navigator.clipboard.writeText(broadcast)
    setBcastSent(true)
    setTimeout(() => setBcastSent(false), 2000)
  }

  const today        = new Date()
  const pastDeadline = today.getDate() >= 15
  const currentMonth = today.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const morosos      = members.filter(m => m.status === 'moroso')
  const withWa       = members.filter(m => m.wa_id).length
  const activeCount  = members.filter(m => m.status === 'active').length

  const DAY_ORDER = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
  const activeSessions = sessions
    .filter(s => { try { return JSON.parse(s.description)?.badge?.type !== 'rest' } catch { return true } })
    .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))

  const SECTIONS = [
    { id: 'pagos',      label: 'Pagos pendientes', count: payments.length  },
    { id: 'morosos',    label: 'Morosos',           count: morosos.length   },
    { id: 'asistencia', label: 'Asistencia',        count: null             },
    { id: 'broadcast',  label: 'Broadcast',         count: null             },
  ]

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col gap-6">

      {/* Bot status bar */}
      <div className="bg-card border border-brand/20 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
              <BotIcon size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-brand font-bold text-sm">Bot WhatsApp</p>
                <span className="flex items-center gap-1 text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                  <span className="w-1 h-1 rounded-full bg-brand" />ACTIVO
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Solo vos ves esta sección. Los miembros no pueden acceder.
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-4 sm:gap-6 shrink-0 flex-wrap">
            {[
              { label: 'Pendientes', value: payments.length,         color: payments.length  ? 'text-yellow-400' : 'text-slate-500' },
              { label: 'Morosos',    value: morosos.length,          color: morosos.length   ? 'text-red-400'    : 'text-slate-500' },
              { label: 'WA linked',  value: `${withWa}/${activeCount}`, color: withWa === activeCount ? 'text-brand' : 'text-slate-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center min-w-[50px]">
                <p className={`text-xl font-black ${color}`}>{value}</p>
                <p className="text-slate-600 text-[10px] uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
        {SECTIONS.map(({ id, label, count }) => (
          <button key={id} onClick={() => setSection(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              section === id
                ? 'bg-brand/15 text-brand border border-brand/30'
                : 'bg-white/[0.04] text-slate-500 border border-white/5 hover:text-slate-300'
            }`}>
            {label}
            {count != null && count > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                section === id ? 'bg-brand/20' : 'bg-red-500/20 text-red-400'
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Pagos pendientes ── */}
      {section === 'pagos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {payments.length === 0 ? (
            <div className="md:col-span-2 bg-card border border-white/[0.1] rounded-2xl p-12 text-center">
              <p className="text-brand text-2xl mb-2">✓</p>
              <p className="text-slate-400 text-sm font-semibold">Sin comprobantes pendientes</p>
              <p className="text-slate-600 text-xs mt-1.5">El bot registra aquí cuando un miembro envía un comprobante por WA.</p>
            </div>
          ) : payments.map(p => {
            const initials = (p.member_name ?? '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()
            const ts       = new Date(p.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

            return (
              <div key={p.id} className="bg-card border border-white/[0.1] rounded-2xl p-5 flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center shrink-0">
                    <span className="text-yellow-400 text-xs font-bold">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white font-semibold text-sm truncate">{p.member_name}</p>
                      <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full shrink-0">
                        Pendiente
                      </span>
                    </div>
                    <p className="text-brand font-black text-2xl mt-0.5">
                      ${p.amount?.toLocaleString('es-AR')}
                    </p>
                    {p.proof_text && (
                      <p className="text-slate-500 text-xs mt-1.5 italic line-clamp-2">"{p.proof_text}"</p>
                    )}
                    <p className="text-slate-700 text-[10px] mt-1">{ts} · {p.source}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => approvePayment(p)} disabled={!!acting[p.id]}
                    className="flex-1 bg-brand text-black rounded-xl py-2.5 text-sm font-bold active:scale-95 transition-all disabled:opacity-50 hover:bg-[#c4f01a]">
                    {acting[p.id] === 'approving' ? 'Aprobando…' : '✓ Aprobar'}
                  </button>
                  <button onClick={() => rejectPayment(p.id)} disabled={!!acting[p.id]}
                    className="px-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl py-2.5 text-sm font-bold active:scale-95 transition-all disabled:opacity-50 hover:bg-red-500/20">
                    Rechazar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Morosos ── */}
      {section === 'morosos' && (
        <div className="flex flex-col gap-4">
          {/* Banner */}
          <div className={`rounded-2xl p-4 border text-sm leading-relaxed ${
            pastDeadline
              ? 'bg-red-500/8 border-red-500/20 text-red-300'
              : 'bg-yellow-400/8 border-yellow-400/20 text-yellow-300'
          }`}>
            {pastDeadline
              ? <><span className="font-bold">⚠ Superó el día 15 de {currentMonth}.</span> Considerá remover del grupo a los morosos listados abajo.</>
              : <><span className="font-bold">Período de pago activo.</span> Los pagos se aceptan del 1 al 10. Luego del 15 el bot sugiere remover morosos.</>
            }
          </div>

          {morosos.length === 0 ? (
            <div className="bg-card border border-white/[0.1] rounded-2xl p-12 text-center">
              <p className="text-brand text-2xl mb-2">✓</p>
              <p className="text-slate-400 font-semibold text-sm">Sin morosos este mes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {morosos.map(m => {
                const initials = m.name?.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '?'
                const lastPay  = m.last_payment
                  ? new Date(m.last_payment).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
                  : 'Sin registro'
                return (
                  <div key={m.id} className="bg-card border border-yellow-500/15 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center shrink-0">
                      <span className="text-yellow-400 text-xs font-bold">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{m.name}</p>
                      <p className="text-slate-600 text-[11px]">Último pago: {lastPay}</p>
                      {m.wa_id && <p className="text-slate-700 text-[10px] mt-0.5">WA: {m.wa_id}</p>}
                    </div>
                    <button onClick={() => markInactive(m.id)} disabled={!!acting[m.id]}
                      className="shrink-0 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl px-3 py-2 text-xs font-bold hover:bg-red-500/20 transition-all disabled:opacity-50">
                      {acting[m.id] === 'removing' ? '…' : 'Dar de baja'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Asistencia semanal ── */}
      {section === 'asistencia' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeSessions.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3 bg-card border border-white/[0.1] rounded-2xl p-12 text-center">
              <p className="text-slate-500 text-sm">Sin sesiones publicadas esta semana.</p>
            </div>
          ) : activeSessions.map(s => {
            const count  = s.attendance?.[0]?.count ?? 0
            const pct    = activeCount ? Math.round((count / activeCount) * 100) : 0
            let badge    = null
            try { badge = JSON.parse(s.description)?.badge } catch {}

            return (
              <div key={s.id} className="bg-card border border-white/[0.1] rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white font-bold text-sm">{s.day}</p>
                    {badge && <p className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-wide">{badge.label}</p>}
                    {s.time && <p className="text-slate-600 text-[10px]">{s.time}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-brand font-black text-2xl leading-none">{count}</p>
                    <p className="text-slate-600 text-[10px] mt-1">confirmados</p>
                  </div>
                </div>
                <div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-slate-600 text-[10px] mt-1.5 text-right">{pct}% del equipo</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Broadcast ── */}
      {section === 'broadcast' && (
        <div className="flex flex-col gap-5 max-w-lg">
          <div className="bg-card border border-white/[0.1] rounded-2xl p-5 flex flex-col gap-4">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-0.5">Mensaje masivo</p>
              <p className="text-slate-600 text-xs">
                Redactá el mensaje y copialo. Después envialo como comando al bot: <span className="text-slate-400 font-mono">/broadcast &lt;mensaje&gt;</span>
              </p>
            </div>

            <div className="bg-[#060810] border border-white/5 rounded-xl p-3 text-xs text-slate-500 leading-relaxed">
              <p className="text-slate-400 font-semibold mb-1">Miembros con WA vinculado:</p>
              <p className="text-brand font-black text-xl">{withWa}</p>
              <p className="text-slate-600">de {activeCount} activos recibirán el mensaje</p>
            </div>

            <textarea
              value={broadcast}
              onChange={e => setBroadcast(e.target.value)}
              placeholder={`Hola equipo BTRT 🏃\n\nEscribí tu mensaje acá...`}
              rows={5}
              className="w-full bg-[#060810] text-white rounded-xl px-4 py-3 text-sm border border-white/5 placeholder-slate-600 resize-none focus:outline-none focus:border-brand/40 leading-relaxed"
            />

            <div className="flex gap-2">
              <button onClick={copyBroadcast} disabled={!broadcast.trim()}
                className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.98] ${
                  bcastSent
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-brand text-black hover:bg-[#c4f01a] disabled:opacity-40 disabled:cursor-not-allowed'
                }`}>
                {bcastSent ? '✓ Copiado al portapapeles' : 'Copiar mensaje'}
              </button>
            </div>

            <div className="bg-brand/5 border border-brand/15 rounded-xl p-3">
              <p className="text-slate-400 text-xs font-semibold mb-1">Cómo enviar:</p>
              <p className="text-slate-500 text-xs leading-relaxed">
                1. Copiá el mensaje de arriba<br />
                2. Abrí WhatsApp y hablale al bot<br />
                3. Escribí <span className="font-mono text-brand">/broadcast</span> y pegá el mensaje<br />
                4. El bot lo enviará a los {withWa} miembros vinculados
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Icons ── */
function PlanIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/></svg>
}
function TeamIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function BotIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
}
function LockIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
}
function UserPlusIcon({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
}
function KeyIcon({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
}
function WaIcon({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.121 1.528 5.845L.057 23.55a.5.5 0 0 0 .614.614l5.705-1.471A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.9 0-3.67-.51-5.19-1.4l-.37-.22-3.84.99.99-3.84-.22-.37A9.96 9.96 0 0 1 2 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z"/></svg>
}
