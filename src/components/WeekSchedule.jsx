import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { Check, Plus } from 'lucide-react'

const DAY_ORDER = ['Lunes','Martes','Miércoles','Miércoles/Jueves','Jueves','Viernes','Sábado','Domingo']

const BADGE = {
  quality: { label: 'Calidad · Llano',    bg: 'bg-blue-500/10',    text: 'text-blue-400',   border: 'border border-blue-500/30'    },
  hills:   { label: 'Cuestas · Terreno',  bg: 'bg-orange-500/10',  text: 'text-orange-400', border: 'border border-orange-500/30'  },
  fondazo: { label: 'Fondo de Montaña',   bg: 'bg-[#C6FF00]/10',   text: 'text-[#C6FF00]',  border: 'border border-[#C6FF00]/30'   },
  rest:    { label: 'Recuperación',       bg: 'bg-white/5',        text: 'text-slate-500',  border: 'border border-white/5'        },
}

const NIVEL_STYLE = {
  ini: { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/30'   },
  med: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  avz: { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/30'    },
}

function parseDesc(raw) {
  if (!raw) return null
  try { return typeof raw === 'string' && raw.trim().startsWith('{') ? JSON.parse(raw) : null }
  catch { return null }
}

export default function WeekSchedule({ week }) {
  const { user } = useAuth()
  const [attendance, setAttendance] = useState({})
  const [loading, setLoading]       = useState({})

  const sessions = [...(week.sessions || [])].sort((a, b) => {
    const di = DAY_ORDER.indexOf(a.day), dj = DAY_ORDER.indexOf(b.day)
    return di !== dj ? di - dj : a.time.localeCompare(b.time)
  })

  useEffect(() => {
    if (!user || !sessions.length) return
    loadAttendance()
  }, [user, week.id])

  async function loadAttendance() {
    const { data } = await supabase
      .from('attendance').select('session_id, confirmed')
      .eq('user_id', user.id).in('session_id', sessions.map(s => s.id))
    const map = {}
    data?.forEach(r => { map[r.session_id] = r.confirmed })
    setAttendance(map)
  }

  async function toggleAttendance(sessionId) {
    if (!user) return
    setLoading(p => ({ ...p, [sessionId]: true }))
    const next = !attendance[sessionId]
    await supabase.from('attendance').upsert(
      { session_id: sessionId, user_id: user.id, confirmed: next },
      { onConflict: 'session_id,user_id' }
    )
    setAttendance(p => ({ ...p, [sessionId]: next }))
    setLoading(p => ({ ...p, [sessionId]: false }))
  }

  return (
    <div className="flex flex-col gap-4">
      {sessions.map(session => {
        const rich = parseDesc(session.description)
        const confirmed = !!attendance[session.id]
        const isLoading = !!loading[session.id]
        return rich
          ? <RichCard key={session.id} session={session} rich={rich} confirmed={confirmed} loading={isLoading} onToggle={() => toggleAttendance(session.id)} />
          : <SimpleCard key={session.id} session={session} confirmed={confirmed} loading={isLoading} onToggle={() => toggleAttendance(session.id)} />
      })}
    </div>
  )
}

/* ── Rich card (JSON description) ─────────────────────────────────────────── */
function RichCard({ session, rich, confirmed, loading, onToggle }) {
  const [tab, setTab] = useState('session')
  const badge = BADGE[rich.badge?.type] ?? BADGE.rest
  const isRest = rich.badge?.type === 'rest'

  return (
    <div className={`rounded-2xl overflow-hidden border transition-colors shadow-md shadow-black/40 ${
      confirmed ? 'border-[#C6FF00]/35 bg-[#0E1A08]' : 'border-white/[0.1] bg-[#0A0E1C]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-white font-bold text-base tracking-wide uppercase">{session.day}</h3>
          {rich.badge && (
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${badge.bg} ${badge.text} ${badge.border}`}>
              {rich.badge.label ?? badge.label}
            </span>
          )}
        </div>
        {!isRest && (
          <button
            onClick={onToggle}
            disabled={loading}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-90 disabled:opacity-40 ${
              confirmed ? 'bg-[#C6FF00] text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {confirmed ? <Check size={12} /> : <Plus size={12} />}
            {confirmed ? 'Confirmado' : 'Confirmar'}
          </button>
        )}
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Turnos */}
        {session.time && (
          <div className="flex flex-wrap gap-2">
            {session.time.split('·').map((t, i) => (
              <span key={i} className="text-[11px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 bg-white/5 text-slate-400 rounded-lg border border-white/5">
                {t.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Warning banner */}
        {rich.warning && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 text-xs font-bold text-red-400 uppercase tracking-wider animate-pulse">
            🚫 {rich.warning}
          </div>
        )}

        {/* Meetpoint */}
        {session.location && (
          <div className="flex items-start gap-2 bg-[#C6FF00]/[0.06] border-l-2 border-[#C6FF00] pl-3 py-1.5 rounded-r-xl">
            <span className="text-[10px] text-[#C6FF00] font-semibold uppercase tracking-wider mt-0.5">📍</span>
            <p className="text-[#C6FF00]/80 text-xs leading-snug">{session.location}</p>
          </div>
        )}

        {/* Rest card body */}
        {isRest ? (
          <p className="text-slate-500 text-sm text-center py-4 italic">{rich.restText ?? 'Recuperación activa opcional'}</p>
        ) : (
          <>
            {/* Tabs */}
            {rich.niveles?.length > 0 && (
              <div className="flex gap-1.5">
                {[['session','Sesión'],['niveles','Por nivel']].map(([k,l]) => (
                  <button key={k} onClick={() => setTab(k)}
                    className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                      tab === k
                        ? 'bg-[#C6FF00] text-black border-[#C6FF00]'
                        : 'bg-transparent text-slate-500 border-white/10 hover:border-white/20 hover:text-slate-300'
                    }`}
                  >{l}</button>
                ))}
              </div>
            )}

            {/* Session tab */}
            {tab === 'session' && (
              <div className="flex flex-col gap-3">
                {rich.objective && (
                  <p className="text-[#C6FF00] text-sm font-medium leading-snug">{rich.objective}</p>
                )}
                {rich.activities?.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {rich.activities.map((a, i) => (
                      <li key={i} className="flex gap-2 items-start text-xs text-slate-400 leading-snug">
                        <span className="text-[#C6FF00] mt-0.5 shrink-0">›</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
                {rich.note && (
                  <div className="border-l-2 border-yellow-500/40 pl-3 py-1 bg-yellow-500/5 rounded-r-lg">
                    <p className="text-xs text-slate-400 leading-snug">
                      <span className="text-yellow-400 font-semibold">Nota: </span>{rich.note}
                    </p>
                  </div>
                )}
                {rich.hbox && (
                  <div className="border border-[#C6FF00]/20 bg-[#C6FF00]/5 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#C6FF00] mb-1.5">{rich.hbox.title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{rich.hbox.content}</p>
                  </div>
                )}
              </div>
            )}

            {/* Niveles tab */}
            {tab === 'niveles' && rich.niveles?.length > 0 && (
              <div className="flex flex-col gap-2">
                {rich.niveles.map((n, i) => {
                  const s = NIVEL_STYLE[n.type] ?? NIVEL_STYLE.med
                  return (
                    <div key={i} className="flex gap-3 items-start">
                      <span className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border mt-0.5 ${s.bg} ${s.text} ${s.border}`}>
                        {n.tag}
                      </span>
                      <p className="text-xs text-slate-400 leading-snug">{n.text}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Duration bar */}
        {rich.duration && (
          <div>
            <div className="h-px bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#C6FF00]/50 rounded-full" style={{ width: `${rich.durationPct ?? 70}%` }} />
            </div>
            <p className="text-slate-600 text-[10px] text-right uppercase tracking-wider mt-1">{rich.duration}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Simple card (plain text description) ─────────────────────────────────── */
function SimpleCard({ session, confirmed, loading, onToggle }) {
  return (
    <div className={`rounded-2xl p-4 flex items-start gap-4 border transition-all shadow-sm shadow-black/30 ${
      confirmed ? 'border-[#C6FF00]/35 bg-[#0E1A08]' : 'border-white/[0.1] bg-[#0A0E1C] hover:border-white/[0.16]'
    }`}>
      <div className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold mt-0.5 ${
        confirmed ? 'bg-[#C6FF00]/15 text-[#C6FF00]' : 'bg-white/5 text-slate-400'
      }`}>{session.time}</div>
      <div className="flex-1 min-w-0">
        {session.location && <p className="text-slate-500 text-xs truncate mb-1">📍 {session.location}</p>}
        {session.description && (
          <p className="text-slate-300 text-sm leading-snug line-clamp-3">{session.description}</p>
        )}
      </div>
      <button onClick={onToggle} disabled={loading}
        className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 mt-0.5 ${
          confirmed ? 'bg-[#C6FF00] text-black' : 'bg-white/5 text-slate-500 hover:bg-white/10'
        }`}>
        {confirmed ? <Check size={15} /> : <Plus size={15} />}
      </button>
    </div>
  )
}
