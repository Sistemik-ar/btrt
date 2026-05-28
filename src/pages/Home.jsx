import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { loadWeek } from '../lib/data'
import { loadMyAttendance, loadRoster, toggleAttendance, turnoKey } from '../lib/attendance'
import { Section, Card } from '../components/ui'
import NotificationsCard from '../components/NotificationsCard'
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

// Roster names sometimes fall back to the email (no display name set). Strip the domain.
function cleanName(name) {
  if (!name) return name
  return name.includes('@') ? name.split('@')[0] : name
}

export default function Home() {
  const { user, profile } = useAuth()
  const [week, setWeek]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [myKeys, setMyKeys] = useState(() => new Set())
  const [roster, setRoster] = useState({})
  const weekId = getDisplayWeekId()
  const isSunday = new Date().getDay() === 0
  // Only email/magic-link users need a password. OAuth (Google) users never do.
  const provider = user?.app_metadata?.provider
  const showPwBanner = profile && profile.password_set !== true && provider === 'email'
  const myName = cleanName(profile?.name) || user?.email?.split('@')[0] || 'Vos'

  useEffect(() => {
    setLoading(true)
    ;(async () => {
      const [w, mine, r] = await Promise.all([
        loadWeek(weekId),
        loadMyAttendance(weekId, user?.id),
        loadRoster(weekId),
      ])
      setWeek(w)
      setMyKeys(mine)
      setRoster(r)
      setLoading(false)
    })()
  }, [weekId, user?.id])

  async function handleToggle(day, text) {
    const key   = turnoKey(day, text)
    const wasOn = myKeys.has(key)
    const next  = await toggleAttendance(weekId, user?.id, day, text, myKeys)
    setMyKeys(next)
    // Optimistic roster update for own name.
    setRoster(prev => {
      const list = (prev[key] ?? []).filter(p => p.userId !== (user?.id ?? myName))
      if (!wasOn) list.push({ userId: user?.id ?? myName, name: myName })
      return { ...prev, [key]: list }
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
    <div className="flex flex-col gap-8 max-w-6xl">

      {/* Page header */}
      <header>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Dashboard</h1>
        <p className="text-slate-400 text-sm sm:text-base mt-1.5 capitalize">
          Hola {cleanName(profile?.name)?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'corredor'} · {dateLabel}
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

      {/* Notificaciones push */}
      <NotificationsCard />

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
          <Card className="p-4 sm:p-5">
            {mySignups.length === 0 ? (
              <p className="text-slate-400 text-sm sm:text-base flex items-center gap-2">
                <CalendarCheck size={17} className="text-slate-600 shrink-0" />
                Elegí tus turnos abajo y van a aparecer acá.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {mySignups.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleToggle(s.day, s.text)}
                    title={`${s.label ?? ''} — tocá para sacarte`}
                    className="group flex items-center gap-2 bg-brand text-black rounded-xl pl-3.5 pr-2.5 py-2.5 text-sm font-bold active:scale-95 transition-all"
                  >
                    <span className="uppercase tracking-wide">{DAY_ABBREV[s.day]}</span>
                    <span className="font-semibold">{s.text}</span>
                    <span className="w-5 h-5 rounded-md bg-black/15 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                      <X size={12} strokeWidth={3} />
                    </span>
                  </button>
                ))}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activities.map(a => (
              <PlanCard
                key={a.id}
                activity={a}
                myKeys={myKeys}
                roster={roster}
                myId={user?.id ?? myName}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

/* ── Plan card w/ per-turno attendance + roster of names ─────────────────── */
function PlanCard({ activity, myKeys, roster, myId, onToggle }) {
  const cardView = activityToCard(activity)
  const badge    = BADGE_STYLE[activity.badge?.type] ?? BADGE_STYLE.rest
  const isRest   = activity.rest || activity.badge?.type === 'rest'
  const multiDay = activity.days.length > 1

  const turnosByDay = {}
  for (const t of activity.turnos ?? []) {
    (turnosByDay[t.day] ??= []).push(t)
  }

  return (
    <Card className={`p-5 flex flex-col gap-4 ${isRest ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-bold text-base sm:text-lg uppercase tracking-wide truncate">{cardView.dayLabel}</p>
          {activity.meetpoint?.text && (
            <p className="text-slate-500 text-xs mt-1 truncate">📍 {activity.meetpoint.text}</p>
          )}
        </div>
        {activity.badge && (
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0 ${badge.bg} ${badge.text}`}>
            {activity.badge.label}
          </span>
        )}
      </div>

      {isRest && activity.restBody?.title && (
        <p className="text-slate-400 text-sm italic">{activity.restBody.title}</p>
      )}

      {!isRest && (activity.turnos?.length > 0) && (
        <div className="flex flex-col gap-4">
          <p className="text-slate-500 text-[11px] uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <Clock size={12} /> Anotate · tocá tu turno
          </p>

          {activity.days.map(day => {
            const dayTurnos = turnosByDay[day] ?? []
            if (dayTurnos.length === 0) return null
            return (
              <div key={day} className="flex flex-col gap-2.5">
                {multiDay && (
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{DAY_NAME[day]}</p>
                )}
                {dayTurnos.map((t, i) => {
                  const key      = turnoKey(day, t.text)
                  const selected = myKeys.has(key)
                  const people   = roster[key] ?? []
                  return (
                    <TurnoRow
                      key={i}
                      label={multiDay ? `${DAY_ABBREV[day]} ${t.text}` : t.text}
                      selected={selected}
                      people={people}
                      myId={myId}
                      onClick={() => onToggle(day, t.text)}
                    />
                  )
                })}
              </div>
            )
          })}

          {activity.turnoNote && (
            <p className="text-slate-500 text-[11px] italic">{activity.turnoNote}</p>
          )}
        </div>
      )}
    </Card>
  )
}

/* ── One turno: toggle button + roster of who's going ────────────────────── */
function TurnoRow({ label, selected, people, myId, onClick }) {
  // Dedupe by userId (RPC + optimistic could overlap), own entry first.
  const byId = new Map()
  for (const p of people) if (!byId.has(p.userId)) byId.set(p.userId, p)
  const ordered = [...byId.values()].sort((a, b) =>
    (a.userId === myId ? -1 : 0) - (b.userId === myId ? -1 : 0)
  )

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onClick}
        className={`group self-start flex items-center gap-2 text-sm font-bold px-3.5 py-2 rounded-xl border transition-all active:scale-95 ${
          selected
            ? 'bg-brand text-black border-brand'
            : 'bg-white/4 text-slate-200 border-white/10 hover:border-white/20 hover:bg-white/8'
        }`}
      >
        {selected && <Check size={13} strokeWidth={3} />}
        {label}
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
          selected ? 'bg-black/15 text-black' : 'bg-white/8 text-slate-400'
        }`}>
          <Users size={10} /> {ordered.length}
        </span>
      </button>

      {ordered.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-0.5">
          {ordered.map((p) => (
            <span
              key={p.userId}
              className={`text-xs px-2.5 py-1 rounded-full ${
                p.userId === myId
                  ? 'bg-brand/15 text-brand font-bold'
                  : 'bg-white/5 text-slate-300'
              }`}
            >
              {p.userId === myId ? 'Vos' : cleanName(p.name)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
