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
      .eq('id', weekId).eq('published', true).maybeSingle()
    setCurrentWeek(data)
    setLoading(false)
  }

  const firstName    = profile?.name?.split(' ')[0] || 'corredor'
  const sessionCount = currentWeek?.sessions?.length ?? 0
  const nextSession  = currentWeek?.sessions?.slice().sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  )[0]

  const payStatus =
    profile?.status === 'active' ? 'Al día' :
    profile?.status === 'moroso' ? 'Pendiente' : '—'

  const payAccent =
    profile?.status === 'active' ? 'emerald' :
    profile?.status === 'moroso' ? 'yellow'  : 'slate'

  const lastPayment = profile?.last_payment
    ? new Date(profile.last_payment).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    : null

  const today = new Date()
  const dateLabel = today.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-8 max-w-5xl">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Inicio</h1>
          <p className="text-slate-500 text-sm mt-1 capitalize">{dateLabel}</p>
        </div>
        <Link
          to="/buscar"
          className="hidden sm:flex items-center gap-2 bg-[#AADD00] text-black font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#c4f01a] active:scale-95 transition-all shrink-0 mt-1"
        >
          <SearchIcon /> Ver resultados
        </Link>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <DashCard
          label="Estado de pago"
          value={payStatus}
          sub={lastPayment ? `Último: ${lastPayment}` : 'Sin registro'}
          accent={payAccent}
          icon={<CardIcon />}
          spark={[30, 45, 35, 50, 40, 55, 45]}
        />

        <DashCard
          label="Sesiones esta semana"
          value={loading ? '—' : String(sessionCount)}
          sub={nextSession ? `Próxima: ${nextSession.day}` : 'Sin sesiones aún'}
          accent="brand"
          icon={<CalIcon />}
          spark={[20, 40, 30, 60, 45, 70, 55]}
        />

        <Link to="/buscar" className="block">
          <DashCard
            label="Mis resultados"
            value="Explorar"
            sub="Cronometraje Instantáneo"
            accent="brand"
            icon={<TrophyIcon />}
            spark={[15, 35, 25, 45, 55, 50, 65]}
            cta
          />
        </Link>

      </div>

      {/* ── Planificación semanal ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">Planificación semanal</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {currentWeek
                ? 'Confirmá tu asistencia en cada sesión'
                : 'Roco publica el programa los domingos'}
            </p>
          </div>
          {currentWeek && (
            <span className="flex items-center gap-1.5 text-[#AADD00] text-xs font-bold bg-[#AADD00]/10 border border-[#AADD00]/20 px-3 py-1.5 rounded-full whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#AADD00] animate-pulse" />
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
          <div className="bg-[#0D1117] border border-white/[0.06] rounded-2xl flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#AADD00]/[0.07] border border-[#AADD00]/10 flex items-center justify-center">
              <CalIcon size={24} className="text-[#AADD00]/40" />
            </div>
            <div>
              <p className="text-white font-semibold">Sin planificación esta semana</p>
              <p className="text-slate-500 text-sm mt-1">Roco publicará el programa el domingo.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Dashboard card ── */
const ACCENT = {
  brand:   { icon: 'bg-[#AADD00]/15 text-[#AADD00]',    val: 'text-[#AADD00]',    spark: '#AADD00' },
  emerald: { icon: 'bg-emerald-500/15 text-emerald-400', val: 'text-emerald-400',  spark: '#34d399' },
  yellow:  { icon: 'bg-yellow-400/15 text-yellow-400',   val: 'text-yellow-400',   spark: '#facc15' },
  slate:   { icon: 'bg-slate-500/15 text-slate-400',     val: 'text-slate-300',    spark: '#94a3b8' },
}

function DashCard({ label, value, sub, accent = 'brand', icon, spark = [], cta }) {
  const a = ACCENT[accent] ?? ACCENT.brand

  // Normalize spark to 0-100 range
  const min = Math.min(...spark)
  const max = Math.max(...spark)
  const norm = spark.map(v => max === min ? 50 : ((v - min) / (max - min)) * 60 + 10)
  const w = 80, h = 40
  const step = w / (norm.length - 1)
  const pts  = norm.map((v, i) => `${i * step},${h - v * (h / 100)}`).join(' ')

  return (
    <div className={`bg-[#0D1117] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4 h-full
      ${cta ? 'hover:border-[#AADD00]/20 hover:bg-[#111827] transition-all cursor-pointer group' : ''}`}>

      {/* Top row: label + icon */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest leading-snug">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${a.icon}`}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <div>
        <p className={`text-4xl font-black tracking-tight leading-none ${a.val}`}>{value}</p>
        {sub && <p className="text-slate-500 text-xs mt-2 leading-snug">{sub}</p>}
      </div>

      {/* Sparkline */}
      <div className="mt-auto">
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-8 opacity-60">
          <defs>
            <linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={a.spark} stopOpacity="0.3"/>
              <stop offset="100%" stopColor={a.spark} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <polyline
            points={pts}
            fill="none"
            stroke={a.spark}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon
            points={`0,${h} ${pts} ${w},${h}`}
            fill={`url(#sg-${label})`}
          />
        </svg>
        {cta && (
          <p className={`text-xs font-bold mt-1 group-hover:translate-x-1 transition-transform ${a.val}`}>
            Ver historial →
          </p>
        )}
      </div>
    </div>
  )
}

/* ── Icons ── */
function CardIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
}
function CalIcon({ size = 16, className = '' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
}
function TrophyIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M12 17v4"/><path d="M8 21h8"/><path d="M6 5h12v6a6 6 0 0 1-12 0V5z"/></svg>
}
function SearchIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
}
