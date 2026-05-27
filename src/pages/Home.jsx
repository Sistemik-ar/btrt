import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import WeekSchedule from '../components/WeekSchedule'
import { CreditCard, Calendar, Trophy, ArrowRight } from 'lucide-react'

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
          className="hidden sm:flex items-center gap-2 bg-[#C6FF00] text-black font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#d4ff33] active:scale-95 transition-all shrink-0 mt-1"
        >
          <ArrowRight size={15} /> Ver resultados
        </Link>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">

        <DashCard
          label="Estado de pago"
          value={payStatus}
          sub={lastPayment ? `Último: ${lastPayment}` : 'Sin registro'}
          accent={payAccent}
          icon={<CreditCard size={16} />}
          spark={[30, 45, 35, 50, 40, 55, 45]}
        />

        <DashCard
          label="Sesiones semana"
          value={loading ? '—' : String(sessionCount)}
          sub={nextSession ? `Próxima: ${nextSession.day}` : 'Sin sesiones aún'}
          accent="brand"
          icon={<Calendar size={16} />}
          spark={[20, 40, 30, 60, 45, 70, 55]}
        />

        <Link to="/buscar" className="col-span-2 sm:col-span-1 block">
          <DashCard
            label="Mis resultados"
            value="Explorar"
            sub="Cronometraje Instantáneo"
            accent="brand"
            icon={<Trophy size={16} />}
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
            <span className="flex items-center gap-1.5 text-[#C6FF00] text-xs font-bold bg-[#C6FF00]/10 border border-[#C6FF00]/20 px-3 py-1.5 rounded-full whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C6FF00] animate-pulse" />
              Publicada
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-[#C6FF00]/20 border-t-[#C6FF00] rounded-full animate-spin" />
          </div>
        ) : currentWeek ? (
          <WeekSchedule week={currentWeek} />
        ) : (
          <div className="bg-[#090D1C] border border-white/[0.1] rounded-2xl flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#C6FF00]/[0.07] border border-[#C6FF00]/10 flex items-center justify-center">
              <Calendar size={24} className="text-[#C6FF00]/40" />
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
  brand:   { icon: 'bg-[#C6FF00]/15 text-[#C6FF00]',    val: 'text-[#C6FF00]',    spark: '#C6FF00' },
  emerald: { icon: 'bg-emerald-500/15 text-emerald-400', val: 'text-emerald-400',  spark: '#34d399' },
  yellow:  { icon: 'bg-yellow-400/15 text-yellow-400',   val: 'text-yellow-400',   spark: '#facc15' },
  slate:   { icon: 'bg-slate-500/15 text-slate-400',     val: 'text-slate-300',    spark: '#94a3b8' },
}

function DashCard({ label, value, sub, accent = 'brand', icon, spark = [], cta }) {
  const a = ACCENT[accent] ?? ACCENT.brand

  const min = Math.min(...spark)
  const max = Math.max(...spark)
  const norm = spark.map(v => max === min ? 50 : ((v - min) / (max - min)) * 60 + 10)
  const w = 80, h = 40
  const step = w / (norm.length - 1)
  const pts  = norm.map((v, i) => `${i * step},${h - v * (h / 100)}`).join(' ')

  return (
    <div className={`bg-[#0C1020] border border-white/[0.1] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 h-full transition-all shadow-md shadow-black/40
      ${cta ? 'hover:border-[#C6FF00]/30 hover:bg-[#101528] cursor-pointer group' : 'hover:border-white/[0.15]'}`}>

      {/* Top row: label + icon */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-slate-500 text-[10px] sm:text-xs font-semibold uppercase tracking-wider leading-snug">{label}</p>
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${a.icon}`}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <div>
        <p className={`text-3xl sm:text-4xl font-black tracking-tight leading-none ${a.val}`}>{value}</p>
        {sub && <p className="text-slate-500 text-[10px] sm:text-xs mt-1.5 leading-snug">{sub}</p>}
      </div>

      {/* Sparkline */}
      <div className="mt-auto">
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-5 sm:h-8 opacity-40">
          <defs>
            <linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={a.spark} stopOpacity="0.4"/>
              <stop offset="100%" stopColor={a.spark} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <polyline points={pts} fill="none" stroke={a.spark} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#sg-${label})`}/>
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
