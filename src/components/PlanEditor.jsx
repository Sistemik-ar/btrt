import { useEffect, useRef, useState } from 'react'
import { loadWeek, saveWeek, deleteWeek } from '../lib/data'
import { planToCsv, csvToActivities, downloadText } from '../lib/planCsv'
import { broadcastNotification } from '../lib/push'
import { useAutoSave } from '../hooks/useAutoSave'
import PremiumWeekPlan from './PremiumWeekPlan'
import ReusableMessagesPanel from './ReusableMessagesPanel'
import { DAY_KEYS, DAY_NAME, DAY_ABBREV } from './RocoWeekPlan'
import {
  Plus, Trash2, Eye, AlertTriangle, Calendar,
  FileDown, FileUp, Printer, ChevronLeft, ChevronRight, MapPin, Clock,
  Bell, Copy, RotateCcw, CloudCheck, CloudOff, Loader2,
} from 'lucide-react'

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

/* ── Shared styles ───────────────────────────────────────────────────────── */

const INPUT =
  'w-full h-10 rounded-lg bg-black/20 border border-white/[0.06] px-3 text-sm text-white ' +
  'placeholder:text-slate-600 transition-colors focus:outline-none focus:border-brand/50 focus:bg-black/30'
const AREA =
  'w-full rounded-lg bg-black/20 border border-white/[0.06] px-3 py-2.5 text-sm text-white leading-relaxed ' +
  'placeholder:text-slate-600 transition-colors resize-none focus:outline-none focus:border-brand/50 focus:bg-black/30'

/* ── Domain defaults ─────────────────────────────────────────────────────── */

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
  rest:    { tag: 'bg-white/8 text-slate-300 border-white/15',            dot: 'bg-slate-500'  },
}
const TYPE_OPTIONS = [
  { key: 'quality', label: 'Calidad'  },
  { key: 'hills',   label: 'Cuesta'   },
  { key: 'fondazo', label: 'Fondo'    },
  { key: 'rest',    label: 'Descanso' },
]
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
  const n = weekNumberFromId(weekId)
  return {
    id: weekId,
    published: false,
    weekNumber: n,
    period: `Período Base · Semana ${n}`,
    dates: formatWeekRange(weekId),
    docType: 'Planificación Semanal',
    attendance: {
      label: '📋 Registrá tu asistencia para esta semana',
      sub:   'Abrís el form una sola vez · marcás los turnos que vas · enviás',
      okUrl: '', modUrl: '',
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
      right: `Período Base · Semana ${n} · ${formatWeekRange(weekId)}`,
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
function attachDay(plan, day, targetActivityId) {
  return withActivities(plan, acts => acts.map(a => {
    if (a.id === targetActivityId) {
      if (!a.days.includes(day)) {
        const days = [...a.days, day].sort((x, y) => DAY_KEYS.indexOf(x) - DAY_KEYS.indexOf(y))
        const newTurnos = (DEFAULT_TIMES_BY_DAY[day] ?? []).map(text => ({ day, text }))
        return { ...a, days, turnos: [...(a.turnos ?? []), ...newTurnos] }
      }
      return a
    }
    if (a.days.includes(day)) {
      return { ...a, days: a.days.filter(d => d !== day), turnos: (a.turnos ?? []).filter(t => t.day !== day) }
    }
    return a
  }))
}
function detachDay(plan, day) {
  const stripped = withActivities(plan, acts => acts.map(a =>
    a.days.includes(day)
      ? { ...a, days: a.days.filter(d => d !== day), turnos: (a.turnos ?? []).filter(t => t.day !== day) }
      : a
  ))
  return { ...stripped, activities: [...stripped.activities, defaultActivityForDay(day)] }
}
function patchActivity(plan, activityId, patch) {
  return { ...plan, activities: plan.activities.map(a => a.id === activityId ? { ...a, ...patch } : a) }
}

/* ── Main component ──────────────────────────────────────────────────────── */

export default function PlanEditor() {
  const [weekId, setWeekId]       = useState(getNextMondayId())
  const [plan, setPlan]           = useState(null)
  const [notifying, setNotifying] = useState(false)
  const [notifInfo, setNotifInfo] = useState(null)
  const [preview, setPreview]     = useState(false)
  const [activeDay, setActiveDay] = useState('lun')
  const [error, setError]         = useState(null)
  const [showMsgs, setShowMsgs]   = useState(false)   // panel mobile
  const fileRef = useRef(null)

  // Auto-save: persiste borrador (no publicado) con debounce.
  const auto = useAutoSave(plan, async (p) => {
    if (!p) return
    await saveWeek(weekId, { ...p, dates: formatWeekRange(weekId), weekNumber: weekNumberFromId(weekId) })
  }, { delay: 1000, enabled: !!plan })

  useEffect(() => {
    setNotifInfo(null); setError(null)
    auto.skipNext()
    ;(async () => {
      try {
        const existing = await loadWeek(weekId)
        setPlan(existing && existing.activities ? existing : defaultPlan(weekId))
      } catch (e) {
        setError(e.message ?? 'Error cargando la semana')
        setPlan(defaultPlan(weekId))
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId])

  const updateActivity = (id, patch) => setPlan(p => patchActivity(p, id, patch))
  const shareDay       = (day, id)   => setPlan(p => attachDay(p, day, id))
  const unshareDay     = (day)       => {
    if (day === activeDay) {
      const sibling = getActivityForDay(plan, day)?.days.find(d => d !== day)
      if (sibling) setActiveDay(sibling)
    }
    setPlan(p => detachDay(p, day))
  }

  // Inserta un mensaje preguardado en la Observación de la actividad activa.
  function insertMessage(text) {
    const act = getActivityForDay(plan, activeDay)
    if (!act) return
    const prev = act.note?.text ?? ''
    const next = prev ? `${prev}\n${text}` : text
    updateActivity(act.id, { note: { strong: act.note?.strong ?? 'Importante:', text: next } })
    setShowMsgs(false)
  }

  async function notifyUsers() {
    setNotifying(true); setError(null)
    try {
      await auto.flush()
      const updated = { ...plan, published: true }
      await saveWeek(weekId, { ...updated, dates: formatWeekRange(weekId), weekNumber: weekNumberFromId(weekId) })
      setPlan(updated)
      const r = await broadcastNotification({
        title: 'Planificación disponible 🏔',
        body:  `Ya está la semana ${formatWeekRange(weekId)}. Anotate a tus turnos.`,
        url:   '/planificacion-semanal',
        tag:   `plan-${weekId}`,
      })
      setNotifInfo({ at: new Date(), pushed: r?.sent ?? null, skipped: r?.skipped })
    } catch (e) {
      setError(e.message ?? 'Error al notificar')
    } finally {
      setNotifying(false)
    }
  }

  function duplicatePrevWeek() {
    if (!confirm('Traer la planificación de la semana anterior a esta semana? Reemplaza lo actual.')) return
    ;(async () => {
      const prev = await loadWeek(shiftWeek(weekId, -1))
      if (prev?.activities) {
        setPlan({ ...prev, id: weekId, published: false })
      } else {
        setError('La semana anterior no tiene planificación cargada.')
      }
    })()
  }

  function resetWeek() {
    if (!confirm('Resetear esta semana a la plantilla por defecto?')) return
    setPlan(defaultPlan(weekId))
  }

  async function clearWeek() {
    if (!confirm(`Borrar la planificación de ${formatWeekRange(weekId)}?`)) return
    try {
      await deleteWeek(weekId)
      auto.skipNext()
      setPlan(defaultPlan(weekId)); setNotifInfo(null)
    } catch (e) { setError(e.message ?? 'Error borrando') }
  }

  function exportCsv() { downloadText(`bandurrias-plan-${weekId}.csv`, planToCsv(plan)) }
  async function importCsv(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const activities = csvToActivities(await file.text())
      if (!activities.length) { setError('CSV vacío o con formato inválido.'); return }
      setPlan(p => ({ ...p, activities })); setError(null)
    } catch (err) { setError('No se pudo leer el CSV: ' + (err.message ?? '')) }
  }
  function exportPdf() { setPreview(true); setTimeout(() => window.print(), 350) }

  if (!plan) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  const currentActivity = getActivityForDay(plan, activeDay)

  return (
    <div className="flex flex-col gap-5">
      <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={importCsv} className="hidden" />

      {/* ── Header ── */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Planificación semanal</h1>
          <p className="text-xs text-slate-500 mt-1 capitalize">
            {plan.published ? 'Publicada' : 'Borrador'} · {formatWeekRange(weekId)}
          </p>
        </div>

        <div className="lg:ml-auto flex items-center gap-2 flex-wrap">
          <SaveStatus status={auto.status} savedAt={auto.savedAt} />
          <div className="flex items-center gap-1.5">
            <IconButton icon={FileUp}   label="Importar CSV" onClick={() => fileRef.current?.click()} />
            <IconButton icon={FileDown} label="Exportar CSV" onClick={exportCsv} />
            <IconButton icon={Printer}  label="Exportar PDF" onClick={exportPdf} />
          </div>
          <button
            onClick={() => setPreview(p => !p)}
            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-300 text-xs font-bold hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <Eye size={14} /> {preview ? 'Editor' : 'Vista previa'}
          </button>
          <button
            onClick={notifyUsers}
            disabled={notifying}
            className="h-9 px-4 inline-flex items-center gap-1.5 rounded-lg bg-brand text-black text-xs font-bold hover:bg-[#d4ff33] active:scale-95 transition-all disabled:opacity-50"
          >
            <Bell size={14} /> {notifying ? 'Notificando…' : 'Notificar a usuarios'}
          </button>
        </div>
      </div>

      {/* ── Banners ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-300 font-medium">⚠ {error}</div>
      )}
      {notifInfo && (
        <div className="bg-brand/8 border border-brand/20 rounded-xl px-4 py-2.5 text-sm text-brand font-semibold flex flex-wrap items-center gap-x-2">
          ✓ Publicado · {notifInfo.at.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          <span className="text-slate-500 font-normal">
            {notifInfo.skipped
              ? '· Push no configurado (solo guardado)'
              : notifInfo.pushed != null
              ? `· 🔔 ${notifInfo.pushed} notificaciones enviadas`
              : '· Visible para los miembros'}
          </span>
        </div>
      )}

      {preview ? (
        <PremiumWeekPlan week={plan} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
          {/* Columna editor */}
          <div className="flex flex-col gap-5 min-w-0">
            {/* Week bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="sm:flex-1">
                <WeekPicker weekId={weekId} setWeekId={setWeekId} />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <SmallBtn icon={Copy}    label="Duplicar semana anterior" onClick={duplicatePrevWeek} />
              <SmallBtn icon={RotateCcw} label="Reset semana" onClick={resetWeek} />
              <SmallBtn icon={Trash2}  label="Borrar" onClick={clearWeek} danger />
              <button
                onClick={() => setShowMsgs(true)}
                className="xl:hidden h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/10 text-brand text-xs font-bold ml-auto"
              >
                Mensajes
              </button>
            </div>

            {/* Overview de los 7 días */}
            <WeekOverview plan={plan} activeDay={activeDay} setActiveDay={setActiveDay} />

            {/* Detalle de la sesión */}
            {currentActivity && (
              <ActivityEditor
                key={currentActivity.id}
                activity={currentActivity}
                activeDay={activeDay}
                setActiveDay={setActiveDay}
                plan={plan}
                onPatch={patch => updateActivity(currentActivity.id, patch)}
                onShareDay={day => shareDay(day, currentActivity.id)}
                onUnshareDay={unshareDay}
              />
            )}
          </div>

          {/* Panel mensajes (desktop) */}
          <div className="hidden xl:block sticky top-4 h-[calc(100dvh-2rem)]">
            <ReusableMessagesPanel onInsert={insertMessage} />
          </div>
        </div>
      )}

      {/* Panel mensajes (mobile drawer) */}
      {showMsgs && (
        <div className="xl:hidden fixed inset-0 z-50 flex" onClick={() => setShowMsgs(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative ml-auto w-[88%] max-w-sm h-full p-3" onClick={e => e.stopPropagation()}>
            <ReusableMessagesPanel onInsert={insertMessage} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Save status indicator ───────────────────────────────────────────────── */

function SaveStatus({ status, savedAt }) {
  const map = {
    idle:   { icon: CloudCheck, text: 'Sin cambios',  cls: 'text-slate-500' },
    saving: { icon: Loader2,    text: 'Guardando…',   cls: 'text-slate-400' },
    saved:  { icon: CloudCheck, text: savedAt ? `Guardado ${savedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : 'Guardado', cls: 'text-brand' },
    error:  { icon: CloudOff,   text: 'Error al guardar', cls: 'text-red-400' },
  }
  const s = map[status] ?? map.idle
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${s.cls}`}>
      <Icon size={13} className={status === 'saving' ? 'animate-spin' : ''} />
      {s.text}
    </span>
  )
}

function SmallBtn({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border text-xs font-bold transition-colors ${
        danger
          ? 'border-white/[0.06] bg-white/[0.03] text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20'
          : 'border-white/[0.06] bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.08]'
      }`}
    >
      <Icon size={13} /> {label}
    </button>
  )
}

/* ── Week overview (7 días horizontal) ───────────────────────────────────── */

function WeekOverview({ plan, activeDay, setActiveDay }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
      {DAY_KEYS.map(d => {
        const a = getActivityForDay(plan, d)
        const type = a?.badge?.type ?? 'rest'
        const c = TYPE_BG[type]
        const isActive = d === activeDay
        const isRest = a?.rest || type === 'rest'
        const turnos = (a?.turnos ?? []).filter(t => t.day === d)
        return (
          <button
            key={d}
            onClick={() => setActiveDay(d)}
            className={`flex flex-col gap-2 p-2.5 rounded-xl border text-left transition-colors min-h-[92px] ${
              isActive
                ? 'border-brand/50 bg-brand/[0.06]'
                : 'border-white/[0.06] bg-card/60 hover:border-white/[0.12] hover:bg-white/[0.03]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-black uppercase tracking-wide ${isActive ? 'text-brand' : 'text-white'}`}>
                {DAY_ABBREV[d]}
              </span>
              <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
            </div>
            {isRest ? (
              <span className="text-[10px] text-slate-600 uppercase tracking-wide">Descanso</span>
            ) : (
              <div className="flex flex-col gap-1">
                {turnos.length === 0 && <span className="text-[10px] text-slate-600">Sin turnos</span>}
                {turnos.slice(0, 3).map((t, i) => (
                  <span key={i} className="text-[10px] font-bold text-brand bg-brand/10 rounded px-1.5 py-0.5 truncate">
                    {t.text.replace(/^⏰\s*/, '')}
                  </span>
                ))}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ── Week picker ─────────────────────────────────────────────────────────── */

function WeekPicker({ weekId, setWeekId }) {
  const presets = [
    { key: 'this',  label: 'Vigente',         value: getThisMondayId() },
    { key: 'next',  label: 'Próxima',         value: getNextMondayId() },
    { key: 'next2', label: 'En 2 semanas',    value: shiftWeek(getThisMondayId(), 2) },
    { key: 'next3', label: 'En 3 semanas',    value: shiftWeek(getThisMondayId(), 3) },
  ]
  const active = presets.find(p => p.value === weekId)?.key

  return (
    <SectionCard
      icon={Calendar}
      title="Semana a editar"
      desc="Se ajusta automáticamente al lunes de la semana elegida."
    >
      <div className="flex flex-wrap gap-1.5">
        {presets.map(p => (
          <button
            key={p.key}
            onClick={() => setWeekId(p.value)}
            className={`h-9 px-3.5 rounded-lg text-xs font-bold transition-colors ${
              active === p.key
                ? 'bg-brand text-black'
                : 'bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setWeekId(shiftWeek(weekId, -1))}
          className="h-10 w-10 shrink-0 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center justify-center"
          title="Semana anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <input
          type="date"
          value={weekId}
          onChange={e => setWeekId(snapMonday(e.target.value))}
          className={`${INPUT} flex-1`}
        />
        <button
          onClick={() => setWeekId(shiftWeek(weekId, 1))}
          className="h-10 w-10 shrink-0 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center justify-center"
          title="Semana siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </SectionCard>
  )
}


/* ── Activity editor ─────────────────────────────────────────────────────── */

function ActivityEditor({ activity, activeDay, setActiveDay, plan, onPatch, onShareDay, onUnshareDay }) {
  const isRest = activity.rest || activity.badge?.type === 'rest'
  const dayLabel = activity.days.length > 1
    ? activity.days.map(d => DAY_NAME[d]).join(' / ')
    : DAY_NAME[activity.days[0]]
  const typeColor = TYPE_BG[activity.badge?.type ?? 'rest']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_1fr] gap-5 items-start">

      {/* ── Left column: configuración ── */}
      <div className="flex flex-col gap-5">
        <SectionCard
          title={dayLabel}
          titleRight={
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${typeColor.tag}`}>
              {TYPE_OPTIONS.find(o => o.key === (activity.badge?.type ?? 'rest'))?.label}
            </span>
          }
        >
          <Field label="Tipo de sesión">
            <TypeSelector activity={activity} onPatch={onPatch} />
          </Field>

          <Field label="Nombre visible">
            <input
              type="text"
              value={activity.badge?.label ?? ''}
              onChange={e => onPatch({ badge: { ...activity.badge, label: e.target.value } })}
              placeholder={TYPE_LABELS[activity.badge?.type] ?? ''}
              className={INPUT}
            />
          </Field>

          {activity.days.length === 1 && activity.days[0] === 'sab' && (
            <Field label="Título personalizado" hint='Ej: "Sábado — Fondo de Montaña"'>
              <input
                type="text"
                value={activity.dayLabel ?? ''}
                onChange={e => onPatch({ dayLabel: e.target.value || undefined })}
                placeholder={dayLabel}
                className={INPUT}
              />
            </Field>
          )}

          <Field label="Se repite los días" hint="Tocá un día para que comparta esta sesión. El día activo se marca con un punto.">
            <div className="grid grid-cols-7 gap-1">
              {DAY_KEYS.map(d => {
                const sharesHere   = activity.days.includes(d)
                const isCurrentDay = d === activeDay
                const isSoleDay    = isCurrentDay && activity.days.length === 1
                const other = !sharesHere ? getActivityForDay(plan, d) : null
                return (
                  <button
                    key={d}
                    onClick={() => {
                      if (sharesHere) {
                        if (isSoleDay) return // único día del grupo: no se puede sacar
                        // Si era el día actual, saltamos al primer día restante del grupo
                        // para que la UI no se "quede" en el solo recién creado.
                        if (isCurrentDay) {
                          const next = activity.days.find(x => x !== d)
                          if (next) setActiveDay(next)
                        }
                        onUnshareDay(d)
                      } else {
                        onShareDay(d)
                      }
                    }}
                    disabled={isSoleDay}
                    title={
                      isSoleDay ? 'Único día de esta sesión'
                        : isCurrentDay && sharesHere ? 'Sacar este día del grupo (te lleva al día restante)'
                        : sharesHere ? 'Sacar de esta sesión'
                        : `Compartir con ${DAY_NAME[d]}${other ? ` (hoy: ${TYPE_LABELS[other.badge?.type]})` : ''}`
                    }
                    className={`relative h-9 rounded-md text-[11px] font-bold uppercase transition-colors ${
                      sharesHere
                        ? 'bg-brand/15 text-brand border border-brand/40'
                        : 'bg-white/[0.03] text-slate-500 border border-white/[0.06] hover:text-white hover:bg-white/[0.08]'
                    } ${isCurrentDay ? 'ring-1 ring-brand/50' : ''}`}
                  >
                    {DAY_ABBREV[d]}
                    {isCurrentDay && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-brand" />
                    )}
                  </button>
                )
              })}
            </div>
          </Field>
        </SectionCard>

        {!isRest && (
          <SectionCard icon={Clock} title="Horarios" desc="Turnos por día — el corredor elige uno.">
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

            <Field label="Nota junto al horario">
              <input
                type="text"
                value={activity.turnoNote ?? ''}
                onChange={e => onPatch({ turnoNote: e.target.value })}
                placeholder="→ el corredor elige UN turno"
                className={INPUT}
              />
              <Check
                checked={activity.turnoNoteColor === 'orange'}
                onChange={v => onPatch({ turnoNoteColor: v ? 'orange' : null })}
                label="Resaltar en naranja (aviso)"
              />
            </Field>
          </SectionCard>
        )}
      </div>

      {/* ── Right column: contenido ── */}
      <div className="flex flex-col gap-5">
        {isRest ? (
          <RestEditor activity={activity} onPatch={onPatch} />
        ) : (
          <>
            <SectionCard icon={MapPin} title="Punto de encuentro">
              <Field label="Lugar">
                <input
                  type="text"
                  value={activity.meetpoint?.text ?? ''}
                  onChange={e => onPatch({ meetpoint: { ...activity.meetpoint, text: e.target.value } })}
                  placeholder="La Usina · Virgen de las Nieves"
                  className={INPUT}
                />
              </Field>
              <Field label="Link de Google Maps">
                <input
                  type="url"
                  value={activity.meetpoint?.url ?? ''}
                  onChange={e => onPatch({ meetpoint: { ...activity.meetpoint, url: e.target.value } })}
                  placeholder="https://maps.google.com/..."
                  className={INPUT}
                />
              </Field>
              <Check
                checked={!!activity.meetpoint?.pending}
                onChange={v => onPatch({ meetpoint: { ...activity.meetpoint, pending: v } })}
                icon={<AlertTriangle size={13} className="text-orange-400" />}
                label="Punto a confirmar (muestra aviso en vez del lugar)"
              />
            </SectionCard>

            <SectionCard title="Plan de la sesión">
              <Field label="Objetivo">
                <textarea
                  value={activity.objective ?? ''}
                  onChange={e => onPatch({ objective: e.target.value })}
                  rows={2}
                  placeholder="Qué se busca con esta sesión"
                  className={AREA}
                />
              </Field>
              <Field label="Actividades">
                <RepeatableList
                  items={activity.activities}
                  placeholder="Ej: 6×400m al 95% con recup. 90s"
                  onChange={items => onPatch({ activities: items })}
                  addLabel="Agregar actividad"
                />
              </Field>
              <Field label="Observación">
                <input
                  type="text"
                  value={activity.note?.text ?? ''}
                  onChange={e => {
                    const text = e.target.value
                    onPatch({ note: text.trim() ? { strong: activity.note?.strong ?? 'Nota:', text } : null })
                  }}
                  placeholder="Ej: si llueve fuerte se suspende"
                  className={INPUT}
                />
              </Field>
            </SectionCard>

            <SectionCard title="Por nivel" desc="Variantes según el corredor. Opcional.">
              <div className="flex flex-col gap-2">
                {activity.niveles.map(n => (
                  <div key={n.type} className="flex items-center gap-2">
                    <span className={`shrink-0 w-14 text-center text-[10px] font-black uppercase rounded-md py-2.5 ${
                      n.type === 'ini' ? 'bg-blue-500/15 text-blue-400'
                      : n.type === 'med' ? 'bg-yellow-500/15 text-yellow-400'
                      : 'bg-red-500/15 text-red-400'
                    }`}>
                      {n.type}
                    </span>
                    <input
                      type="text"
                      value={n.text}
                      onChange={e => onPatch({ niveles: activity.niveles.map(x => x.type === n.type ? { ...x, text: e.target.value } : x) })}
                      className={`${INPUT} flex-1`}
                    />
                  </div>
                ))}
              </div>
              <Field label="Duración / volumen">
                <input
                  type="text"
                  value={activity.durationLabel ?? ''}
                  onChange={e => onPatch({ durationLabel: e.target.value })}
                  placeholder="Ej: 90–100 min · 12-16 km"
                  className={INPUT}
                />
              </Field>
            </SectionCard>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Type selector (segmented) ───────────────────────────────────────────── */

function TypeSelector({ activity, onPatch }) {
  const type = activity.badge?.type ?? 'rest'
  function pick(next) {
    if (next === type) return
    if (next === 'rest') {
      onPatch({ rest: true, badge: { type: 'rest', label: 'Descanso' }, restBody: activity.restBody ?? { title: 'Descanso', lines: [''] } })
    } else {
      onPatch({ rest: false, badge: { type: next, label: activity.badge?.label?.length ? activity.badge.label : TYPE_LABELS[next] } })
    }
  }
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {TYPE_OPTIONS.map(o => {
        const active = o.key === type
        const c = TYPE_BG[o.key]
        return (
          <button
            key={o.key}
            onClick={() => pick(o.key)}
            className={`h-9 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold border transition-colors ${
              active ? c.tag : 'bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} /> {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── Turnos editor ───────────────────────────────────────────────────────── */

function TurnosForDay({ day, turnos, isActive, onChange }) {
  const setTurno   = (i, text) => onChange(turnos.map((t, idx) => idx === i ? { day, text } : t))
  const addTurno   = () => onChange([...turnos, { day, text: '' }])
  const removeTurno = (i) => onChange(turnos.filter((_, idx) => idx !== i))

  return (
    <div className={`rounded-xl p-3 transition-colors ${isActive ? 'bg-brand/[0.04] ring-1 ring-brand/20' : 'bg-black/15'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{DAY_NAME[day]}</span>
        {isActive && <span className="text-[10px] text-brand font-bold uppercase">día activo</span>}
      </div>
      <div className="flex flex-col gap-2">
        {turnos.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={t.text}
              onChange={e => setTurno(i, e.target.value)}
              placeholder="⏰ 18hs"
              className={`${INPUT} flex-1`}
            />
            <RemoveBtn onClick={() => removeTurno(i)} />
          </div>
        ))}
        <AddBtn onClick={addTurno} label="Agregar horario" />
      </div>
    </div>
  )
}

/* ── Rest editor ─────────────────────────────────────────────────────────── */

function RestEditor({ activity, onPatch }) {
  const setRest  = (patch) => onPatch({ restBody: { ...activity.restBody, ...patch } })
  const lines    = activity.restBody?.lines ?? []

  return (
    <SectionCard title="Descanso" desc="Sin turnos. Aparece atenuado en la grilla.">
      <Field label="Título">
        <input
          type="text"
          value={activity.restBody?.title ?? ''}
          onChange={e => setRest({ title: e.target.value })}
          placeholder="Ej: Recuperación activa opcional"
          className={INPUT}
        />
      </Field>
      <Field label="Detalle">
        <RepeatableList
          items={lines}
          placeholder="Una línea por idea"
          onChange={next => setRest({ lines: next })}
          addLabel="Agregar línea"
        />
      </Field>
    </SectionCard>
  )
}

/* ── Reusable primitives ─────────────────────────────────────────────────── */

function SectionCard({ icon: Icon, title, desc, titleRight, children }) {
  return (
    <section className="bg-card/70 border border-white/[0.06] rounded-2xl shadow-sm shadow-black/20">
      {(title || titleRight) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-white/[0.05]">
          <div className="flex items-start gap-2.5 min-w-0">
            {Icon && (
              <span className="mt-0.5 h-7 w-7 shrink-0 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400">
                <Icon size={14} />
              </span>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
              {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
            </div>
          </div>
          {titleRight}
        </header>
      )}
      <div className="px-5 py-4 flex flex-col gap-4">{children}</div>
    </section>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</label>}
      {children}
      {hint && <p className="text-[11px] text-slate-600 leading-relaxed">{hint}</p>}
    </div>
  )
}

function RepeatableList({ items, placeholder, onChange, addLabel }) {
  const set    = (i, v) => onChange(items.map((x, idx) => idx === i ? v : x))
  const add    = () => onChange([...items, ''])
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="text" value={item} onChange={e => set(i, e.target.value)} placeholder={placeholder} className={`${INPUT} flex-1`} />
          <RemoveBtn onClick={() => remove(i)} />
        </div>
      ))}
      <AddBtn onClick={add} label={addLabel} />
    </div>
  )
}

function IconButton({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`h-9 w-9 flex items-center justify-center rounded-lg border transition-colors ${
        danger
          ? 'border-white/[0.06] bg-white/[0.03] text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20'
          : 'border-white/[0.06] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.08]'
      }`}
    >
      <Icon size={15} />
    </button>
  )
}

function RemoveBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Quitar"
      className="h-10 w-10 shrink-0 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-colors flex items-center justify-center"
    >
      <Trash2 size={14} />
    </button>
  )
}

function AddBtn({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="h-10 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-brand border border-dashed border-white/10 hover:border-brand/30 rounded-lg transition-colors"
    >
      <Plus size={14} /> {label}
    </button>
  )
}

function Check({ checked, onChange, label, icon }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-400 select-none cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-brand h-3.5 w-3.5" />
      {icon}
      {label}
    </label>
  )
}
