import { useEffect, useState } from 'react'
import { loadWeek, saveWeek, deleteWeek } from '../lib/data'
import RocoWeekPlan, { DAY_KEYS, DAY_NAME, DAY_ABBREV } from './RocoWeekPlan'
import { Plus, Trash2, Eye, Save, AlertTriangle, Calendar } from 'lucide-react'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const rid = () => Math.random().toString(36).slice(2, 9)

function snapMonday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.toISOString().split('T')[0]
}

function getNextMondayId() {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7) + (dow === 0 ? 0 : 7))
  return monday.toISOString().split('T')[0]
}

function getThisMondayId() {
  return snapMonday(new Date().toISOString().split('T')[0])
}

function shiftWeek(weekId, weeks) {
  const d = new Date(weekId + 'T12:00:00')
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().split('T')[0]
}

function formatWeekRange(weekId) {
  if (!weekId) return ''
  const mon = new Date(weekId + 'T12:00:00')
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const opt = { day: 'numeric', month: 'long' }
  return mon.toLocaleDateString('es-AR', opt) + ' — ' + sun.toLocaleDateString('es-AR', { ...opt, year: 'numeric' })
}

function weekNumberFromId(weekId) {
  const d = new Date(weekId + 'T12:00:00')
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d - start) / 86400000) + start.getDay() + 1) / 7)
}

/* ── Defaults ────────────────────────────────────────────────────────────── */

const TYPE_LABELS = {
  quality: 'Técnica + Aeróbico',
  hills:   '🏔 Cuesta · Fuerza Específica',
  fondazo: '🏔 Fondo de Montaña',
  rest:    'Descanso',
}

const TYPE_BG = {
  quality: { tag: 'bg-blue-500/15 text-blue-400 border-blue-500/40',     dot: 'bg-blue-400'   },
  hills:   { tag: 'bg-orange-500/15 text-orange-400 border-orange-500/40', dot: 'bg-orange-400' },
  fondazo: { tag: 'bg-brand/15 text-brand border-brand/40',               dot: 'bg-brand'       },
  rest:    { tag: 'bg-white/5 text-slate-500 border-white/10',            dot: 'bg-slate-600'  },
}

const DEFAULT_TIMES_BY_DAY = {
  lun: ['⏰ 18hs'],
  mar: ['⏰ 9hs', '⏰ 18hs'],
  mie: ['⏰ 18hs'],
  jue: ['⏰ 9hs', '⏰ 18hs'],
  vie: [],
  sab: ['⏰ Salida 8:30hs'],
  dom: [],
}

function defaultActivityForDay(day) {
  if (day === 'vie') return restActivity(day, 'Recuperación', 'Recuperación activa opcional')
  if (day === 'dom') return restActivity(day, 'Descanso',     'Descanso completo')
  if (day === 'sab') return trainingActivity([day], 'fondazo', '🏔 Fondo de Montaña')
  if (day === 'mie' || day === 'jue') return trainingActivity([day], 'hills', '🏔 Cuesta · Fuerza Específica')
  return trainingActivity([day], 'quality', 'Técnica + Aeróbico')
}

function trainingActivity(days, type, label) {
  return {
    id: rid(),
    days,
    badge: { type, label },
    turnos: days.flatMap(d => (DEFAULT_TIMES_BY_DAY[d] ?? []).map(text => ({ day: d, text }))),
    turnoNote: type === 'fondazo' ? '' : '→ el corredor elige UN turno',
    turnoNoteColor: null,
    meetpoint: { text: '', url: '', pending: false },
    objective: '',
    activities: [''],
    note: null,
    niveles: [
      { type: 'ini', text: '' },
      { type: 'med', text: '' },
      { type: 'avz', text: '' },
    ],
    durationLabel: '',
  }
}

function restActivity(day, label, title) {
  return {
    id: rid(),
    days: [day],
    rest: true,
    badge: { type: 'rest', label },
    restBody: { title, lines: [''] },
    turnos: [],
  }
}

function defaultPlan(weekId) {
  return {
    id: weekId,
    published: false,
    weekNumber: weekNumberFromId(weekId),
    period: `Período Base · Semana ${weekNumberFromId(weekId)}`,
    dates: formatWeekRange(weekId),
    docType: 'Planificación Semanal',
    attendance: {
      label: '📋 Registrá tu asistencia para esta semana',
      sub:   'Abrís el form una sola vez · marcás los turnos que vas · enviás',
      okUrl:  '',
      modUrl: '',
    },
    activities: [
      trainingActivity(['lun', 'mar'], 'quality', 'Técnica + Aeróbico'),
      trainingActivity(['mie', 'jue'], 'hills',   '🏔 Cuesta · Fuerza Específica'),
      defaultActivityForDay('vie'),
      trainingActivity(['sab'], 'fondazo', '🏔 Fondo de Montaña'),
      defaultActivityForDay('dom'),
    ],
    footer: {
      left:  'Bandurrias Trail Running Team · Bariloche, Patagonia',
      right: `Período Base · Semana ${weekNumberFromId(weekId)} · ${formatWeekRange(weekId)}`,
    },
  }
}

/* ── Plan ops ────────────────────────────────────────────────────────────── */

function getActivityForDay(plan, day) {
  return plan.activities.find(a => a.days.includes(day)) ?? null
}

function withActivities(plan, fn) {
  return { ...plan, activities: fn(plan.activities).filter(a => a.days.length > 0) }
}

/** Move `day` to target activity (id). Strip from any other activity. */
function attachDay(plan, day, targetActivityId) {
  return withActivities(plan, acts => acts.map(a => {
    if (a.id === targetActivityId) {
      if (!a.days.includes(day)) {
        const days = [...a.days, day].sort((x, y) => DAY_KEYS.indexOf(x) - DAY_KEYS.indexOf(y))
        const newTurnos = (DEFAULT_TIMES_BY_DAY[day] ?? []).map(text => ({ day, text }))
        return { ...a, days, turnos: [...a.turnos, ...newTurnos] }
      }
      return a
    }
    if (a.days.includes(day)) {
      return {
        ...a,
        days:   a.days.filter(d => d !== day),
        turnos: a.turnos.filter(t => t.day !== day),
      }
    }
    return a
  }))
}

/** Detach `day` from its activity and give it a fresh solo activity. */
function detachDay(plan, day) {
  const stripped = withActivities(plan, acts => acts.map(a =>
    a.days.includes(day)
      ? { ...a, days: a.days.filter(d => d !== day), turnos: a.turnos.filter(t => t.day !== day) }
      : a
  ))
  return { ...stripped, activities: [...stripped.activities, defaultActivityForDay(day)] }
}

function patchActivity(plan, activityId, patch) {
  return { ...plan, activities: plan.activities.map(a => a.id === activityId ? { ...a, ...patch } : a) }
}

/* ── Main component ──────────────────────────────────────────────────────── */

export default function PlanEditor() {
  const [weekId, setWeekId]   = useState(getNextMondayId())
  const [plan, setPlan]       = useState(null)
  const [saving, setSaving]   = useState(false)
  const [savedInfo, setSavedInfo] = useState(null) // { at, persisted }
  const [preview, setPreview] = useState(false)
  const [activeDay, setActiveDay] = useState('lun')
  const [error, setError]     = useState(null)

  useEffect(() => {
    setSavedInfo(null)
    setError(null)
    ;(async () => {
      try {
        const existing = await loadWeek(weekId)
        setPlan(existing && existing.activities ? existing : defaultPlan(weekId))
      } catch (e) {
        setError(e.message ?? 'Error cargando la semana')
        setPlan(defaultPlan(weekId))
      }
    })()
  }, [weekId])

  function setWeekIdSafe(monday) {
    setWeekId(monday)
  }

  function updateActivity(activityId, patch) {
    setPlan(p => patchActivity(p, activityId, patch))
  }

  function shareDayWithCurrent(day, currentActivityId) {
    setPlan(p => attachDay(p, day, currentActivityId))
  }

  function unshareDay(day) {
    setPlan(p => detachDay(p, day))
  }

  async function publish() {
    setSaving(true)
    setError(null)
    try {
      const updated = {
        ...plan,
        published: true,
        dates: formatWeekRange(weekId),
        weekNumber: weekNumberFromId(weekId),
      }
      const res = await saveWeek(weekId, updated)
      setPlan(updated)
      setSavedInfo({ at: new Date(), persisted: res.persisted })
    } catch (e) {
      setError(e.message ?? 'Error guardando')
    } finally {
      setSaving(false)
    }
  }

  async function clear() {
    if (!confirm(`¿Borrar plan de la semana ${formatWeekRange(weekId)}?`)) return
    try {
      await deleteWeek(weekId)
      setPlan(defaultPlan(weekId))
      setSavedInfo(null)
    } catch (e) {
      setError(e.message ?? 'Error borrando')
    }
  }

  if (!plan) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  const currentActivity = getActivityForDay(plan, activeDay)

  return (
    <div className="flex flex-col gap-5">

      {/* Week picker */}
      <WeekPicker weekId={weekId} setWeekId={setWeekIdSafe} />

      {/* Action bar */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <button
          onClick={() => setPreview(p => !p)}
          className="flex items-center gap-1.5 bg-white/4 text-slate-300 border border-white/8 rounded-xl px-3 py-2.5 text-xs font-bold hover:bg-white/8 transition-all"
        >
          <Eye size={13} />
          {preview ? 'Volver al editor' : 'Vista previa'}
        </button>
        <button
          onClick={clear}
          className="flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl px-3 py-2.5 text-xs font-bold hover:bg-red-500/20 transition-all"
        >
          <Trash2 size={13} />
          Borrar
        </button>
        <button
          onClick={publish}
          disabled={saving}
          className="flex items-center gap-1.5 bg-brand text-black rounded-xl px-4 py-2.5 text-xs font-bold hover:bg-[#d4ff33] active:scale-95 transition-all disabled:opacity-50"
        >
          <Save size={13} />
          {saving ? 'Guardando…' : 'Publicar'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-xs text-red-300 font-semibold">
          ⚠ {error}
        </div>
      )}

      {savedInfo && (
        <div className="bg-brand/8 border border-brand/20 rounded-xl px-4 py-2.5 text-xs text-brand font-semibold flex items-center gap-2 flex-wrap">
          ✓ Publicado · {savedInfo.at.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          <span className="text-slate-500 font-normal">
            {savedInfo.persisted === 'supabase'
              ? '· Sincronizado en Supabase, visible para todos los miembros'
              : '· Guardado localmente (solo este navegador en dev)'}
          </span>
        </div>
      )}

      {preview ? (
        <RocoWeekPlan week={plan} />
      ) : (
        <>
          {/* Day tabs */}
          <DayTabs plan={plan} activeDay={activeDay} setActiveDay={setActiveDay} />

          {/* Active day editor */}
          {currentActivity && (
            <ActivityEditor
              key={currentActivity.id}
              activity={currentActivity}
              activeDay={activeDay}
              plan={plan}
              onPatch={patch => updateActivity(currentActivity.id, patch)}
              onShareDay={day => shareDayWithCurrent(day, currentActivity.id)}
              onUnshareDay={day => unshareDay(day)}
            />
          )}
        </>
      )}

      <FormStyle />
    </div>
  )
}

/* ── Week picker ──────────────────────────────────────────────────────── */

function WeekPicker({ weekId, setWeekId }) {
  const presets = [
    { key: 'this',  label: 'Esta semana',     value: getThisMondayId() },
    { key: 'next',  label: 'Próxima semana',  value: getNextMondayId() },
    { key: 'next2', label: 'En 2 semanas',    value: shiftWeek(getThisMondayId(), 2) },
  ]
  const active = presets.find(p => p.value === weekId)?.key

  return (
    <div className="bg-card border border-white/8 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        <Calendar size={12} /> Semana a editar
      </div>

      {/* Presets */}
      <div className="flex gap-2 flex-wrap">
        {presets.map(p => (
          <button
            key={p.key}
            onClick={() => setWeekId(p.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              active === p.key
                ? 'bg-brand text-black'
                : 'bg-white/5 text-slate-400 border border-white/8 hover:bg-white/10 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date */}
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={weekId}
          onChange={e => setWeekId(snapMonday(e.target.value))}
          className="input flex-1"
        />
        <button
          onClick={() => setWeekId(shiftWeek(weekId, -1))}
          className="w-9 h-9 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          title="Semana anterior"
        >
          ←
        </button>
        <button
          onClick={() => setWeekId(shiftWeek(weekId, 1))}
          className="w-9 h-9 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          title="Semana siguiente"
        >
          →
        </button>
      </div>

      <p className="text-slate-600 text-xs">
        <span className="text-white font-semibold capitalize">{formatWeekRange(weekId)}</span> · Cualquier fecha se ajusta al lunes de la semana.
      </p>
    </div>
  )
}

/* ── Day tabs ──────────────────────────────────────────────────────────── */

function DayTabs({ plan, activeDay, setActiveDay }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
      {DAY_KEYS.map(d => {
        const a = getActivityForDay(plan, d)
        const type = a?.badge?.type ?? 'rest'
        const dot = TYPE_BG[type]?.dot ?? TYPE_BG.rest.dot
        const isActive = d === activeDay
        return (
          <button
            key={d}
            onClick={() => setActiveDay(d)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-w-16 ${
              isActive
                ? 'bg-card border border-brand/40 text-white'
                : 'bg-white/4 border border-white/8 text-slate-400 hover:text-white hover:bg-white/8'
            }`}
          >
            <span className="uppercase tracking-wide">{DAY_ABBREV[d]}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
          </button>
        )
      })}
    </div>
  )
}

/* ── Activity editor ───────────────────────────────────────────────────── */

function ActivityEditor({ activity, activeDay, plan, onPatch, onShareDay, onUnshareDay }) {
  const isRest = activity.rest || activity.badge?.type === 'rest'
  const dayLabel = activity.days.length > 1
    ? activity.days.map(d => DAY_NAME[d]).join(' / ')
    : DAY_NAME[activity.days[0]]

  return (
    <div className="flex flex-col gap-4">

      {/* Day-share panel */}
      <div className="bg-card border border-white/8 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          Esta sesión se repite los días
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {DAY_KEYS.map(d => {
            const sharesHere   = activity.days.includes(d)
            const isCurrentDay = d === activeDay
            const otherActivity = !sharesHere ? getActivityForDay(plan, d) : null
            const otherLabel = otherActivity ? TYPE_LABELS[otherActivity.badge?.type] : null

            return (
              <button
                key={d}
                onClick={() => {
                  if (sharesHere && !isCurrentDay) onUnshareDay(d)
                  else if (!sharesHere) onShareDay(d)
                }}
                disabled={isCurrentDay && sharesHere}
                title={
                  isCurrentDay && sharesHere ? 'Día actual (no se puede sacar desde acá)'
                    : sharesHere               ? 'Sacar este día de la sesión'
                    : `Compartir con ${DAY_NAME[d]}${otherLabel ? ` (actualmente: ${otherLabel})` : ''}`
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                  sharesHere
                    ? 'bg-brand/15 text-brand border-brand/40'
                    : 'bg-white/4 text-slate-500 border-white/8 hover:text-white hover:border-white/20'
                } ${isCurrentDay && sharesHere ? 'opacity-100' : ''}`}
              >
                {sharesHere && '✓'}
                {DAY_ABBREV[d]}
              </button>
            )
          })}
        </div>
        <p className="text-slate-600 text-[11px]">
          Hacé click en otro día para que tenga la <strong className="text-slate-400">misma sesión</strong> (con horarios que vos definís por día). Al sacarlo, ese día vuelve a tener su propia sesión por defecto.
        </p>
      </div>

      {/* Editor card */}
      <div className={`bg-card border rounded-2xl p-5 flex flex-col gap-4 ${
        isRest ? 'border-white/10 opacity-95' : 'border-white/8'
      }`}>
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/5">
          <p className="text-white font-black text-base sm:text-lg tracking-wide uppercase">{dayLabel}</p>
          <TypeSelect activity={activity} onPatch={onPatch} />
        </div>

        {/* Badge label */}
        <Field label="Nombre de la sesión (etiqueta visible)">
          <input
            type="text"
            value={activity.badge?.label ?? ''}
            onChange={e => onPatch({ badge: { ...activity.badge, label: e.target.value } })}
            placeholder={TYPE_LABELS[activity.badge?.type] ?? ''}
            className="input"
          />
        </Field>

        {/* Custom dayLabel override */}
        {activity.days.length === 1 && activity.days[0] === 'sab' && (
          <Field label='Título personalizado (opcional, ej "Sábado — Fondo de Montaña")'>
            <input
              type="text"
              value={activity.dayLabel ?? ''}
              onChange={e => onPatch({ dayLabel: e.target.value || undefined })}
              placeholder={dayLabel}
              className="input"
            />
          </Field>
        )}

        {/* Branch: rest vs training */}
        {isRest
          ? <RestEditor activity={activity} onPatch={onPatch} />
          : <TrainingEditor activity={activity} activeDay={activeDay} onPatch={onPatch} />
        }
      </div>
    </div>
  )
}

/* ── Type selector ─────────────────────────────────────────────────────── */

function TypeSelect({ activity, onPatch }) {
  const type = activity.badge?.type ?? 'rest'
  return (
    <select
      value={type}
      onChange={e => {
        const next = e.target.value
        if (next === 'rest') {
          onPatch({
            rest: true,
            badge: { type: 'rest', label: 'Descanso' },
            restBody: activity.restBody ?? { title: 'Descanso', lines: [''] },
          })
        } else {
          onPatch({
            rest: false,
            badge: { type: next, label: activity.badge?.label?.length > 0 ? activity.badge.label : TYPE_LABELS[next] },
          })
        }
      }}
      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg cursor-pointer focus:outline-none border ${TYPE_BG[type]?.tag ?? TYPE_BG.rest.tag}`}
    >
      <option value="quality">Calidad · Aeróbico</option>
      <option value="hills">Cuesta · Fuerza</option>
      <option value="fondazo">Fondo de Montaña</option>
      <option value="rest">Descanso</option>
    </select>
  )
}

/* ── Training editor ───────────────────────────────────────────────────── */

function TrainingEditor({ activity, activeDay, onPatch }) {
  function setActivityItem(i, text) {
    const next = activity.activities.map((a, idx) => idx === i ? text : a)
    onPatch({ activities: next })
  }
  function addActivityItem() { onPatch({ activities: [...activity.activities, ''] }) }
  function removeActivityItem(i) { onPatch({ activities: activity.activities.filter((_, idx) => idx !== i) }) }

  function setNivel(type, text) {
    const next = activity.niveles.map(n => n.type === type ? { ...n, text } : n)
    onPatch({ niveles: next })
  }
  function setMeetpoint(patch) { onPatch({ meetpoint: { ...activity.meetpoint, ...patch } }) }
  function setObservation(text) {
    if (!text.trim()) { onPatch({ note: null }); return }
    onPatch({ note: { strong: activity.note?.strong ?? 'Nota:', text } })
  }

  return (
    <>
      {/* Turnos per day */}
      <Field label={`Horarios (turnos por día — el corredor elige uno)`}>
        <div className="flex flex-col gap-3">
          {activity.days.map(day => (
            <TurnosForDay
              key={day}
              day={day}
              turnos={activity.turnos.filter(t => t.day === day)}
              isActive={day === activeDay}
              onChange={dayTurnos => {
                const others = activity.turnos.filter(t => t.day !== day)
                onPatch({ turnos: [...others, ...dayTurnos] })
              }}
            />
          ))}
        </div>
      </Field>

      <Field label='Nota junto al horario (ej: "→ el corredor elige UN turno")'>
        <input
          type="text"
          value={activity.turnoNote ?? ''}
          onChange={e => onPatch({ turnoNote: e.target.value })}
          className="input"
        />
        <label className="flex items-center gap-2 text-xs text-slate-400 select-none cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={activity.turnoNoteColor === 'orange'}
            onChange={e => onPatch({ turnoNoteColor: e.target.checked ? 'orange' : null })}
            className="accent-brand"
          />
          Resaltar nota en naranja (aviso)
        </label>
      </Field>

      {/* Meetpoint */}
      <Field label="Punto de encuentro">
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={activity.meetpoint?.text ?? ''}
            onChange={e => setMeetpoint({ text: e.target.value })}
            placeholder="La Usina · Virgen de las Nieves"
            className="input"
          />
          <input
            type="url"
            value={activity.meetpoint?.url ?? ''}
            onChange={e => setMeetpoint({ url: e.target.value })}
            placeholder="https://goo.gl/maps/... (link a Google Maps)"
            className="input"
          />
          <label className="flex items-center gap-2 text-xs text-slate-400 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={!!activity.meetpoint?.pending}
              onChange={e => setMeetpoint({ pending: e.target.checked })}
              className="accent-brand"
            />
            <AlertTriangle size={12} className="text-orange-400" />
            Aviso pendiente (resalta en naranja, ej "⚠️ Punto de encuentro a confirmar")
          </label>
        </div>
      </Field>

      <Field label="Objetivo de la sesión">
        <textarea
          value={activity.objective ?? ''}
          onChange={e => onPatch({ objective: e.target.value })}
          rows={2}
          className="input resize-none"
        />
      </Field>

      <Field label={activity.structureLabel ?? 'Actividades'}>
        <div className="flex flex-col gap-2">
          {activity.activities.map((a, i) => (
            <div key={i} className="flex items-start gap-2">
              <textarea
                value={a}
                onChange={e => setActivityItem(i, e.target.value)}
                rows={1}
                className="input flex-1 resize-none"
              />
              <button
                onClick={() => removeActivityItem(i)}
                className="w-8 h-8 rounded-lg bg-white/4 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center shrink-0"
                title="Quitar"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button
            onClick={addActivityItem}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-brand border border-dashed border-white/8 hover:border-brand/30 rounded-xl py-2 transition-all"
          >
            <Plus size={13} /> Agregar actividad
          </button>
        </div>
      </Field>

      <Field label="Observación (aparece como nota amarilla)">
        <textarea
          value={activity.note?.text ?? ''}
          onChange={e => setObservation(e.target.value)}
          rows={2}
          placeholder="Ej: Progresión S1 → S2: el terreno cambia y el volumen sube..."
          className="input resize-none"
        />
        {activity.note && (
          <input
            type="text"
            value={activity.note.strong ?? ''}
            onChange={e => onPatch({ note: { ...activity.note, strong: e.target.value } })}
            placeholder='Título en negrita (ej: "Progresión S1 → S2:")'
            className="input mt-2"
          />
        )}
      </Field>

      <Field label="Por nivel">
        <div className="flex flex-col gap-2">
          {['ini','med','avz'].map(k => {
            const cur = activity.niveles.find(n => n.type === k)
            const labels = { ini: 'Inicial', med: 'Medio', avz: 'Avanzado' }
            const tagCls = {
              ini: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
              med: 'bg-yellow-500/12 text-yellow-400 border-yellow-500/40',
              avz: 'bg-red-500/12 text-red-400 border-red-500/40',
            }[k]
            return (
              <div key={k} className="flex items-start gap-2">
                <span className={`shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-1.5 rounded-lg border ${tagCls} w-20 text-center`}>
                  {labels[k]}
                </span>
                <textarea
                  value={cur?.text ?? ''}
                  onChange={e => setNivel(k, e.target.value)}
                  rows={2}
                  className="input flex-1 resize-none"
                />
              </div>
            )
          })}
        </div>
      </Field>

      <Field label="Duración total (ej: 90 – 100 min)">
        <input
          type="text"
          value={activity.durationLabel ?? ''}
          onChange={e => onPatch({ durationLabel: e.target.value })}
          className="input"
        />
      </Field>
    </>
  )
}

function TurnosForDay({ day, turnos, isActive, onChange }) {
  function setTurno(i, text) { onChange(turnos.map((t, idx) => idx === i ? { day, text } : t)) }
  function addTurno() { onChange([...turnos, { day, text: '⏰ 18hs' }]) }
  function removeTurno(i) { onChange(turnos.filter((_, idx) => idx !== i)) }

  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-2 ${
      isActive ? 'border-brand/30 bg-brand/[0.03]' : 'border-white/8'
    }`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{DAY_NAME[day]}</p>
        {isActive && <span className="text-[10px] text-brand font-semibold">Día activo</span>}
      </div>
      {turnos.length === 0 && (
        <p className="text-slate-600 text-[11px] italic">Sin turnos. Agregá uno abajo.</p>
      )}
      {turnos.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={t.text}
            onChange={e => setTurno(i, e.target.value)}
            placeholder="⏰ 18hs"
            className="input flex-1"
          />
          <button
            onClick={() => removeTurno(i)}
            className="w-8 h-8 rounded-lg bg-white/4 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center shrink-0"
            title="Quitar turno"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button
        onClick={addTurno}
        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand border border-dashed border-white/8 hover:border-brand/30 rounded-lg py-1.5 transition-all"
      >
        <Plus size={12} /> Agregar turno {DAY_NAME[day]}
      </button>
    </div>
  )
}

/* ── Rest editor ───────────────────────────────────────────────────────── */

function RestEditor({ activity, onPatch }) {
  function setRestBody(patch) { onPatch({ restBody: { ...activity.restBody, ...patch } }) }
  function setLine(i, text) {
    const lines = (activity.restBody?.lines ?? []).map((l, idx) => idx === i ? text : l)
    setRestBody({ lines })
  }
  function addLine() { setRestBody({ lines: [...(activity.restBody?.lines ?? []), ''] }) }
  function removeLine(i) { setRestBody({ lines: (activity.restBody?.lines ?? []).filter((_, idx) => idx !== i) }) }

  return (
    <>
      <Field label="Título">
        <input
          type="text"
          value={activity.restBody?.title ?? ''}
          onChange={e => setRestBody({ title: e.target.value })}
          placeholder="Ej: Recuperación activa opcional"
          className="input"
        />
      </Field>

      <Field label="Detalle (una línea por idea)">
        <div className="flex flex-col gap-2">
          {(activity.restBody?.lines ?? []).map((l, i) => (
            <div key={i} className="flex items-start gap-2">
              <input
                type="text"
                value={l}
                onChange={e => setLine(i, e.target.value)}
                className="input flex-1"
              />
              <button
                onClick={() => removeLine(i)}
                className="w-8 h-8 rounded-lg bg-white/4 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button
            onClick={addLine}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-brand border border-dashed border-white/8 hover:border-brand/30 rounded-xl py-2 transition-all"
          >
            <Plus size={13} /> Agregar línea
          </button>
        </div>
      </Field>
    </>
  )
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{label}</label>
      {children}
    </div>
  )
}

function FormStyle() {
  return (
    <style>{`
      .input {
        background: #060810;
        color: #fff;
        border-radius: 0.75rem;
        padding: 0.625rem 0.75rem;
        font-size: 0.875rem;
        border: 1px solid rgba(255,255,255,0.08);
        width: 100%;
      }
      .input::placeholder { color: #475569; }
      .input:focus { outline: none; border-color: rgba(198,255,0,0.4); }
    `}</style>
  )
}
