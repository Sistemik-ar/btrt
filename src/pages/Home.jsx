import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { loadWeek } from '../lib/data'
import { Section, Card } from '../components/ui'
import { ArrowRight, Calendar, Check, Clock } from 'lucide-react'

/**
 * Returns the weekId to display on the home dashboard.
 *
 * Normally that's the current ISO week (Monday). On Sundays we shift to the
 * upcoming week so members can start signing up for next week's sessions
 * right when Roco publishes them on Sunday.
 */
function getDisplayWeekId() {
  const today = new Date()
  const dow   = today.getDay()                  // 0 = Sunday
  const monday = new Date(today)
  // Days from Monday of current ISO week. On Sunday, jump to next Monday (+1).
  monday.setDate(today.getDate() - ((dow + 6) % 7) + (dow === 0 ? 7 : 0))
  return monday.toISOString().split('T')[0]
}

function attKey(weekId) {
  return `btrt-attendance-${weekId}`
}
function loadAttendance(weekId) {
  try { return new Set(JSON.parse(localStorage.getItem(attKey(weekId)) ?? '[]')) }
  catch { return new Set() }
}
function saveAttendance(weekId, set) {
  localStorage.setItem(attKey(weekId), JSON.stringify([...set]))
}

const BADGE_STYLE = {
  quality: { bg: 'bg-blue-500/10',   text: 'text-blue-400'   },
  hills:   { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  fondazo: { bg: 'bg-brand/15',      text: 'text-brand'      },
  rest:    { bg: 'bg-white/5',       text: 'text-slate-500'  },
}

export default function Home() {
  const { profile }  = useAuth()
  const [week, setWeek]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [attendance, setAttendance]   = useState(() => new Set())
  const weekId = getDisplayWeekId()
  const isSunday = new Date().getDay() === 0

  useEffect(() => {
    setAttendance(loadAttendance(weekId))
    ;(async () => {
      setWeek(await loadWeek(weekId))
      setLoading(false)
    })()
  }, [weekId])

  function toggleTurno(cardId, turnoText) {
    const key = `${cardId}::${turnoText}`
    setAttendance(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      saveAttendance(weekId, next)
      return next
    })
  }

  const cards            = week?.cards ?? []
  const trainingCards    = cards.filter(c => !c.rest)
  const totalTurnos      = trainingCards.reduce((s, c) => s + (c.turnos?.length ?? 0), 0)
  const confirmedTurnos  = [...attendance].length

  const dateLabel = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-7 max-w-5xl">

      {/* Page header */}
      <header>
        <h1 className="text-2xl sm:text-[28px] font-black text-white tracking-tight">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1 capitalize">
          Hola {profile?.name?.split(' ')[0] ?? 'corredor'} · {dateLabel}
        </p>
        {isSunday && (
          <p className="text-brand text-xs font-semibold mt-2 inline-flex items-center gap-1.5 bg-brand/8 border border-brand/20 px-3 py-1.5 rounded-full">
            <Calendar size={12} /> Hoy es domingo · mostrando la planificación de la próxima semana
          </p>
        )}
      </header>

      {/* Planificación + attendance */}
      <Section
        title={isSunday ? 'Planificación · Próxima semana' : 'Planificación · Esta semana'}
        subtitle={
          loading
            ? 'Cargando...'
            : week
            ? `Confirmá los turnos que vas a asistir · ${confirmedTurnos}/${totalTurnos} marcados`
            : (isSunday ? 'Roco la publica los domingos' : 'Sin planificación publicada')
        }
        action={
          week && (
            <Link to="/planificacion-semanal" className="text-brand text-xs font-semibold hover:underline inline-flex items-center gap-1 shrink-0">
              Ver plan completo <ArrowRight size={12} />
            </Link>
          )
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
          </div>
        ) : cards.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand/8 border border-brand/10 flex items-center justify-center">
              <Calendar size={22} className="text-brand/40" />
            </div>
            <div>
              <p className="text-white font-semibold">Sin planificación publicada</p>
              <p className="text-slate-500 text-sm mt-1">Roco publica el programa el domingo.</p>
            </div>
            <Link to="/planificacion-semanal" className="text-brand text-xs font-semibold hover:underline">
              Ver otras semanas →
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cards.map(c => (
              <PlanCard
                key={c.id}
                card={c}
                attendance={attendance}
                onToggle={turno => toggleTurno(c.id, turno)}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

/* ── Compact plan card w/ per-turno attendance toggle ────────────────────── */
function PlanCard({ card, attendance, onToggle }) {
  const badge = BADGE_STYLE[card.badge?.type] ?? BADGE_STYLE.rest
  const isRest = card.rest

  return (
    <Card className={`p-4 flex flex-col gap-3 ${isRest ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white font-bold text-sm uppercase tracking-wide truncate">{card.dayLabel}</p>
          {card.meetpoint?.text && (
            <p className="text-slate-500 text-[11px] mt-0.5 truncate">📍 {card.meetpoint.text}</p>
          )}
        </div>
        {card.badge && (
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 ${badge.bg} ${badge.text}`}>
            {card.badge.label}
          </span>
        )}
      </div>

      {isRest && card.restBody?.title && (
        <p className="text-slate-500 text-xs italic">{card.restBody.title}</p>
      )}

      {!isRest && card.turnos?.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-slate-600 text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <Clock size={10} /> Mis turnos
          </p>
          <div className="flex flex-wrap gap-2">
            {card.turnos.map((t, i) => {
              const key      = `${card.id}::${t.text}`
              const selected = attendance.has(key)
              return (
                <button
                  key={i}
                  onClick={() => onToggle(t.text)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all active:scale-95 ${
                    selected
                      ? 'bg-brand text-black border-brand'
                      : 'bg-white/4 text-slate-300 border-white/10 hover:border-white/20 hover:bg-white/8'
                  }`}
                >
                  {selected && <Check size={11} strokeWidth={3} />}
                  {t.text}
                </button>
              )
            })}
          </div>
          {card.turnoNote && (
            <p className="text-slate-600 text-[10px] italic">{card.turnoNote}</p>
          )}
        </div>
      )}
    </Card>
  )
}
