import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import WeekSchedule from '../components/WeekSchedule'

const DAY_ORDER = ['Lunes','Martes','Miércoles','Miércoles/Jueves','Jueves','Viernes','Sábado','Domingo']

export default function Home() {
  const { profile } = useAuth()
  const [currentWeek, setCurrentWeek] = useState(null)
  const [loading, setLoading]         = useState(true)

  useEffect(() => { loadCurrentWeek() }, [])

  async function loadCurrentWeek() {
    const today  = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    const weekId = monday.toISOString().split('T')[0]
    const { data } = await supabase
      .from('weeks').select('*, sessions(*)')
      .eq('id', weekId).eq('published', true).single()
    setCurrentWeek(data)
    setLoading(false)
  }

  const firstName    = profile?.name?.split(' ')[0] || 'corredor'
  const sessionCount = currentWeek?.sessions?.length ?? 0
  const nextSession  = currentWeek?.sessions?.slice().sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  )[0]

  const payLabel =
    profile?.status === 'active' ? 'Al día' :
    profile?.status === 'moroso' ? 'Pendiente' : '—'

  const payAccent =
    profile?.status === 'active' ? 'emerald' :
    profile?.status === 'moroso' ? 'yellow'  : 'slate'

  const lastPayment = profile?.last_payment
    ? new Date(profile.last_payment).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="flex flex-col gap-8">

      {/* ── Page title (estilo Argon) ── */}
      <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-semibold mb-1.5">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Inicio</h1>
          <p className="text-slate-500 text-sm mt-1">Bienvenido, {firstName} — Bandurrias Trail Running Team</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0 bg-[#AADD00]/10 border border-[#AADD00]/20 px-3.5 py-2 rounded-xl mt-1">
          <span className="w-2 h-2 rounded-full bg-[#AADD00]" />
          <span className="text-[#AADD00] text-xs font-bold uppercase tracking-widest">Período Base</span>
        </div>
      </div>

      {/* ── Stats row (3 cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

        {/* Estado de pago */}
        <StatCard
          icon={<CardIcon />}
          iconAccent={payAccent}
          label="Estado de pago"
          value={payLabel}
          valueAccent={payAccent}
          sub={lastPayment ? `Último pago: ${lastPayment}` : 'Sin registro de pago'}
        />

        {/* Sesiones esta semana */}
        <StatCard
          icon={<CalIcon />}
          iconAccent="brand"
          label="Sesiones esta semana"
          value={loading ? '—' : String(sessionCount)}
          valueAccent="brand"
          valueLarge
          sub={
            nextSession
              ? `Próxima: ${nextSession.day}`
              : loading ? '' : 'Sin sesiones publicadas'
          }
        />

        {/* Resultados */}
        <Link to="/buscar" className="block">
          <StatCard
            icon={<TrophyIcon />}
            iconAccent="brand"
            label="Mis resultados"
            value="Ver historial"
            valueAccent="white"
            sub="Cronometraje Instantáneo"
            cta
          />
        </Link>
      </div>

      {/* ── Planificación semanal ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">Planificación semanal</h2>
            <p className="text-slate-600 text-xs mt-0.5">
              {currentWeek
                ? 'Confirmá tu asistencia en cada sesión'
                : 'Roco publica el programa los domingos'}
            </p>
          </div>
          {currentWeek && (
            <span className="flex items-center gap-1.5 text-[#AADD00] text-xs font-bold bg-[#AADD00]/10 border border-[#AADD00]/20 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#AADD00]" />
              Publicada
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-[#AADD00]/20 border-t-[#AADD00] rounded-full animate-spin" />
          </div>
        ) : currentWeek ? (
          <WeekSchedule week={currentWeek} />
        ) : (
          <div className="bg-[#13131F] border border-white/5 rounded-2xl flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#AADD00]/[0.07] border border-[#AADD00]/10 flex items-center justify-center text-[#AADD00]/30">
              <CalIcon size={24} />
            </div>
            <div>
              <p className="text-white font-semibold">Sin planificación esta semana</p>
              <p className="text-slate-600 text-sm mt-1.5">Roco publicará el programa el domingo.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Stat Card ── */
const ACCENT = {
  brand:   { iconBg: 'bg-[#AADD00]/15',      iconText: 'text-[#AADD00]',   val: 'text-[#AADD00]'   },
  emerald: { iconBg: 'bg-emerald-500/15',    iconText: 'text-emerald-400', val: 'text-emerald-400' },
  yellow:  { iconBg: 'bg-yellow-400/15',     iconText: 'text-yellow-400',  val: 'text-yellow-400'  },
  slate:   { iconBg: 'bg-slate-500/15',      iconText: 'text-slate-400',   val: 'text-slate-400'   },
  white:   { iconBg: 'bg-[#AADD00]/15',      iconText: 'text-[#AADD00]',   val: 'text-white'       },
}

function StatCard({ icon, iconAccent, label, value, valueAccent, sub, cta, valueLarge }) {
  const ia = ACCENT[iconAccent]  ?? ACCENT.brand
  const va = ACCENT[valueAccent] ?? ACCENT.brand

  return (
    <div className={`bg-[#13131F] border border-white/5 rounded-2xl p-6 flex flex-col gap-5 h-full
      ${cta ? 'hover:border-[#AADD00]/25 hover:bg-[#161624] transition-all cursor-pointer group' : ''}`}>
      {/* Icon + label row */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ia.iconBg} ${ia.iconText}`}>
          {icon}
        </div>
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest leading-tight">{label}</p>
      </div>

      {/* Value */}
      <div className="flex-1">
        <p className={`font-black tracking-tight leading-none ${va.val} ${valueLarge ? 'text-5xl' : 'text-2xl'}`}>
          {value}
        </p>
        {sub && <p className="text-slate-600 text-xs mt-2">{sub}</p>}
      </div>

      {/* CTA arrow */}
      {cta && (
        <p className="text-[#AADD00] text-xs font-bold group-hover:translate-x-1 transition-transform">
          Explorar carreras →
        </p>
      )}
    </div>
  )
}

function CardIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
}
function CalIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
}
function TrophyIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M12 17v4"/><path d="M8 21h8"/><path d="M6 5h12v6a6 6 0 0 1-12 0V5z"/></svg>
}
