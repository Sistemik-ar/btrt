import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { loadWeek } from '../lib/data'
import { loadMyAttendance, loadAttendanceCounts, toggleAttendance, turnoKey } from '../lib/attendance'
import { Section, Card } from '../components/ui'
import { activityToCard, DAY_KEYS, DAY_NAME, DAY_ABBREV } from '../components/RocoWeekPlan'
import { ArrowRight, Calendar, Check, Clock, Users, Key, X, CalendarCheck } from 'lucide-react'

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
  monday.setDate(today.getDate() - ((dow + 6) % 7) + (dow === 0 ? 7 : 0))
  return monday.toISOString().split('T')[0]
}

const BADGE_STYLE = {
  quality: { bg: 'bg-blue-500/10',   text: 'text-blue-400'   },
  hills:   { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  fondazo: { bg: 'bg-brand/15',      text: 'text-brand'      },
  rest:    { bg: 'bg-white/5',       text: 'text-slate-500'  },
}

export default function Home() {
  const { user, profile } = useAuth()
  const [week, setWeek]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [myKeys, setMyKeys] = useState(() => new Set())
  const [counts, setCounts] = useState({})
  const weekId = getDisplayWeekId()
  const isSunday = new Date().getDay() === 0
  // DB-backed per-user flag (members.password_set). Only show once profile loaded.
  const showPwBanner = profile && profile.password_set !== true

  useEffect(() => {
    setLoading(true)
    ;(async () => {
      const [w, mine, c] = await Promise.all([
        loadWeek(weekId),
        loadMyAttendance(weekId, user?.id),
        loadAttendanceCounts(weekId),
      ])
      setWeek(w)
      setMyKeys(mine)
      setCounts(c)
      setLoading(false)
    })()
  }, [weekId, user?.id])

  async function handleToggle(day, text) {
    const wasOn = myKeys.has(turnoKey(day, text))
    const next  = await toggleAttendance(weekId, user?.id, day, text, myKeys)
    setMyKeys(next)
    setCounts(prev => {
      const k = turnoKey(day, text)
      return { ...prev, [k]: Math.max(0, (prev[k] ?? 0) + (wasOn ? -1 : 1)) }
    })
  }

  const activities      = week?.activities ?? []
  const trainingActs    = activities.filter(a => !a.rest && a.badge?.type !== 'rest')
  const totalTurnos     = trainingActs.reduce((s, a) => s + (a.turnos?.length ?? 0), 0)
  const confirmedTurnos = [...myKeys].length

  // Flatten the turnos this user is signed up for, for the quick "Mis inscripciones" view.
  const mySignups = []
  for (const a of activities) {
    for (const t of a.turnos ?? []) {
      if (myKeys.has(turnoKey(t.day, t.text))) {
        mySignups.push({ day: t.day, text: t.text, label: a.badge?.label, type: a.badge?.type })
      }
    }
  }
  mySignups.sort((x, y) => DAY_KEYS.indexOf(x.day) - DAY_KEYS.indexOf(y.day))

  const dateLabel = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-7 max-w-5xl">

      {/* Page header */}
      <header>
        <h1 className="text-2xl sm:text-[28px] font-black text-white tracking-tight">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1 capitalize">
          Hola {profile?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'corredor'} · {dateLabel}
        </p>
        {isSunday && (
          <p className="text-brand text-xs font-semibold mt-2 inline-flex items-center gap-1.5 bg-brand/8 border border-brand/20 px-3 py-1.5 rounded-full">
            <Calendar size={12} /> Hoy es domingo · mostrando la planificación de la próxima semana
          </p>
        )}
      </header>

      {showPwBanner && (
        <div className="bg-card border border-brand/30 rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="w-8 h-8 rounded-lg bg-brand/15 border border-brand/30 flex items-center justify-center shrink-0">
            <Key size={14} className="text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold">Creá una contraseña para tu cuenta</p>
            <p className="text-slate-500 text-xs mt-0.5">Así podés entrar la próxima vez sin esperar el magic link.</p>
          </div>
          <Link
            to="/reset-password"
            className="bg-brand text-black text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#d4ff33] transition-all active:scale-95 shrink-0"
          >
            Crear contraseña
          </Link>
        </div>
      )}

      {/* Mis inscripciones (quick view) */}
      {!loading && activities.length > 0 && (
        <Section
          title="Mis turnos de la semana"
          subtitle={mySignups.length
            ? `Estás anotado a ${mySignups.length} turno${mySignups.length !== 1 ? 's' : ''} · tocá para sacarte`
            : 'Todavía no te anotaste a ningún turno'}
          action={
            <Link to="/planificacion-semanal" className="text-brand text-xs font-semibold hover:underline inline-flex items-center gap-1 shrink-0">
              Ver detalle <ArrowRight size={12} />
            </Link>
          }
        >
          <Card className="p-4">
            {mySignups.length === 0 ? (
              <p className="text-slate-500 text-sm flex items-center gap-2">
                <CalendarCheck size={15} className="text-slate-600" />
                Elegí tus turnos abajo y van a aparecer acá.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {mySignups.map((s, i) => {
                  const style = BADGE_STYLE[s.type] ?? BADGE_STYLE.rest
                  return (
                    <button
                      key={i}
                      onClick={() => handleToggle(s.day, s.text)}
                      title={`${s.label ?? ''} — tocá para sacarte`}
                      className="group flex items-center gap-2 bg-brand text-black rounded-xl pl-3 pr-2 py-2 text-xs font-bold active:scale-95 transition-all"
                    >
                      <span className="uppercase tracking-wide">{DAY_ABBREV[s.day]}</span>
                      <span className="font-semibold">{s.text}</span>
                      <span className="w-5 h-5 rounded-md bg-black/15 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                        <X size={11} strokeWidth={3} />
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </Card>
        </Section>
      )}

      {/* Planificación + attendance */}
      <Section
        title={isSunday ? 'Planificación · Próxima semana' : 'Planificación · Esta semana'}
        subtitle={
          loading
            ? 'Cargando...'
            : activities.length
            ? `Confirmá los turnos que vas a asistir · ${confirmedTurnos}/${totalTurnos} marcados`
            : (isSunday ? 'Roco la publica los domingos' : 'Sin planificación publicada')
        }
        action={
          activities.length > 0 && (
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
        ) : activities.length === 0 ? (
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
            {activities.map(a => (
              <PlanCard
                key={a.id}
                activity={a}
                myKeys={myKeys}
                counts={counts}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

/* ── Compact plan card w/ per-turno attendance toggle ────────────────────── */
function PlanCard({ activity, myKeys, counts, onToggle }) {
  const cardView = activityToCard(activity)
  const badge    = BADGE_STYLE[activity.badge?.type] ?? BADGE_STYLE.rest
  const isRest   = activity.rest || activity.badge?.type === 'rest'
  const multiDay = activity.days.length > 1

  // Group turnos by day for clear UI.
  const turnosByDay = {}
  for (const t of activity.turnos ?? []) {
    if (!turnosByDay[t.day]) turnosByDay[t.day] = []
    turnosByDay[t.day].push(t)
  }

  return (
    <Card className={`p-4 flex flex-col gap-3 ${isRest ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white font-bold text-sm uppercase tracking-wide truncate">{cardView.dayLabel}</p>
          {activity.meetpoint?.text && (
            <p className="text-slate-500 text-[11px] mt-0.5 truncate">📍 {activity.meetpoint.text}</p>
          )}
        </div>
        {activity.badge && (
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 ${badge.bg} ${badge.text}`}>
            {activity.badge.label}
          </span>
        )}
      </div>

      {isRest && activity.restBody?.title && (
        <p className="text-slate-500 text-xs italic">{activity.restBody.title}</p>
      )}

      {!isRest && (activity.turnos?.length > 0) && (
        <div className="flex flex-col gap-2">
          <p className="text-slate-600 text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <Clock size={10} /> Anotate a un turno
          </p>

          {activity.days.map(day => {
            const dayTurnos = turnosByDay[day] ?? []
            if (dayTurnos.length === 0) return null
            return (
              <div key={day} className="flex flex-col gap-1.5">
                {multiDay && (
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{DAY_NAME[day]}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {dayTurnos.map((t, i) => {
                    const key      = turnoKey(day, t.text)
                    const selected = myKeys.has(key)
                    const count    = counts[key] ?? 0
                    return (
                      <button
                        key={i}
                        onClick={() => onToggle(day, t.text)}
                        className={`group flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all active:scale-95 ${
                          selected
                            ? 'bg-brand text-black border-brand'
                            : 'bg-white/4 text-slate-300 border-white/10 hover:border-white/20 hover:bg-white/8'
                        }`}
                      >
                        {selected && <Check size={11} strokeWidth={3} />}
                        {multiDay ? `${DAY_ABBREV[day]} ${t.text}` : t.text}
                        {count > 0 && (
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            selected ? 'bg-black/15 text-black' : 'bg-white/8 text-slate-400'
                          }`}>
                            <Users size={9} /> {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {activity.turnoNote && (
            <p className="text-slate-600 text-[10px] italic">{activity.turnoNote}</p>
          )}
        </div>
      )}
    </Card>
  )
}
