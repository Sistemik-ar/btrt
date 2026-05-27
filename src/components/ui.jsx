import { useEffect, useRef, useState } from 'react'
import { Calendar, TrendingUp, TrendingDown, ChevronDown, Crown } from 'lucide-react'

const BRAND = '#C6FF00'

/* ── Sparkline (pure SVG) ─────────────────────────────────────────────────── */
export function Sparkline({ data = [], color = BRAND, height = 36, id }) {
  const w = 100
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const step = w / (data.length - 1 || 1)
  const pts = data.map((v, i) => `${i * step},${height - ((v - min) / span) * (height - 8) - 4}`).join(' ')
  const gid = `sg-${id ?? Math.random().toString(36).slice(2, 8)}`

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} ${w},${height}`} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── StatCard ─────────────────────────────────────────────────────────────── */
export function StatCard({ label, value, unit, delta, subLabel, spark, icon, accent = BRAND }) {
  const positive = (delta ?? 0) >= 0

  return (
    <div className="bg-[#0C1326] border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-4 shadow-md shadow-black/30 hover:border-white/[0.14] transition-all">
      {/* Top: label + icon */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-slate-400 text-xs font-medium leading-snug">{label}</p>
        {icon && (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
            style={{ backgroundColor: accent + '1A', borderColor: accent + '33', color: accent }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl sm:text-[34px] font-black text-white tracking-tight leading-none">{value}</span>
        {unit && <span className="text-slate-500 text-sm font-semibold">{unit}</span>}
      </div>

      {/* Delta + sublabel */}
      {delta != null && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`flex items-center gap-0.5 font-bold ${positive ? 'text-[#C6FF00]' : 'text-red-400'}`}>
            {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {positive ? '+' : ''}{delta}%
          </span>
          {subLabel && <span className="text-slate-600 truncate">{subLabel}</span>}
        </div>
      )}

      {/* Sparkline */}
      {spark && spark.length > 0 && (
        <div className="-mx-2 -mb-1">
          <Sparkline data={spark} color={accent} id={label?.replace(/\s/g, '')} />
        </div>
      )}
    </div>
  )
}

/* ── Donut chart ──────────────────────────────────────────────────────────── */
export function Donut({ data = [], total, label = 'Total' }) {
  const sum   = data.reduce((s, d) => s + d.value, 0)
  const C     = 100
  const r     = 38
  const circ  = 2 * Math.PI * r
  let offset  = 0

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative w-44 h-44 shrink-0">
        <svg width="100%" height="100%" viewBox={`0 0 ${C} ${C}`} className="-rotate-90">
          <circle cx={C / 2} cy={C / 2} r={r} fill="none" stroke="#1A1F35" strokeWidth="10" />
          {data.map((d, i) => {
            const len = (d.value / sum) * circ
            const seg = (
              <circle
                key={i}
                cx={C / 2} cy={C / 2} r={r}
                fill="none"
                stroke={d.color}
                strokeWidth="10"
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            )
            offset += len
            return seg
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-white tracking-tight leading-none">{total ?? sum}</span>
          <span className="text-slate-500 text-xs font-medium mt-1">{label}</span>
        </div>
      </div>

      {/* Legend */}
      <ul className="flex-1 min-w-[160px] flex flex-col gap-2.5">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-slate-300 flex-1 truncate">{d.label}</span>
            <span className="text-slate-500 font-mono text-xs">{Math.round((d.value / sum) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Line chart ───────────────────────────────────────────────────────────── */
const DAY_LABELS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

export function LineChart({ data = [], labels = DAY_LABELS, color = BRAND, unit = 'km', yTicks = 4 }) {
  const w = 800, h = 280, pad = { l: 56, r: 20, t: 20, b: 36 }
  const max  = Math.max(...data, 1)
  const span = max || 1
  const stepX = (w - pad.l - pad.r) / (data.length - 1 || 1)

  const points = data.map((v, i) => ({
    x: pad.l + i * stepX,
    y: pad.t + (1 - v / span) * (h - pad.t - pad.b),
  }))
  const pathD  = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ')
  const fillD  = `${pathD} L${points.at(-1).x},${h - pad.b} L${points[0].x},${h - pad.b} Z`

  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((max / yTicks) * i))
  const gid     = `lc-fill-${color.replace('#','')}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto block" role="img">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>

      {/* Grid + Y labels */}
      {yLabels.map((v, i) => {
        const y = pad.t + (1 - i / yTicks) * (h - pad.t - pad.b)
        return (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={pad.l - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#475569" fontFamily="Inter, sans-serif">
              {v}{unit}
            </text>
          </g>
        )
      })}

      {/* Fill + line */}
      <path d={fillD} fill={`url(#${gid})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#0C1326" stroke={color} strokeWidth="2" />
      ))}

      {/* X labels */}
      {labels.map((l, i) => (
        <text key={i} x={pad.l + i * stepX} y={h - 12} textAnchor="middle" fontSize="12" fill="#64748B" fontFamily="Inter, sans-serif">
          {l}
        </text>
      ))}
    </svg>
  )
}

/* ── Leaderboard ──────────────────────────────────────────────────────────── */
export function Leaderboard({ rows = [], unit = 'km' }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map(r => (
        <li key={r.rank} className="flex items-center gap-3">
          <span className={`w-5 text-center text-xs font-mono font-bold ${
            r.rank === 1 ? 'text-[#C6FF00]' : 'text-slate-600'
          }`}>{r.rank}</span>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center shrink-0">
            <span className="text-white text-[11px] font-bold">{r.initials}</span>
          </div>
          <span className="flex-1 text-white text-sm font-medium truncate">{r.name}</span>
          {r.crown && <Crown size={13} className="text-[#C6FF00] -mr-1" />}
          <span className="text-slate-400 text-sm font-mono tabular-nums">{r.km} {unit}</span>
        </li>
      ))}
    </ul>
  )
}

/* ── Date range pill (visual only) ────────────────────────────────────────── */
const DEFAULT_RANGE_PRESETS = [
  { key: '7d',   label: 'Últimos 7 días'  },
  { key: '14d',  label: 'Últimos 14 días' },
  { key: '30d',  label: 'Últimos 30 días' },
  { key: '90d',  label: 'Últimos 90 días' },
  { key: '6m',   label: 'Últimos 6 meses' },
  { key: '1y',   label: 'Último año'      },
  { key: 'all',  label: 'Todo'            },
]

/**
 * Functional preset date-range dropdown.
 *
 * Props:
 *   selected     key of the active preset
 *   onChange     (key, preset) => void
 *   presets      optional override list ({ key, label })
 *   formatLabel  optional fn to derive the displayed label from the active preset
 */
export function DateRangePill({ selected = '7d', onChange, presets = DEFAULT_RANGE_PRESETS, formatLabel }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const active = presets.find(p => p.key === selected) ?? presets[0]
  const label  = formatLabel ? formatLabel(active) : active.label

  function pick(p) {
    setOpen(false)
    onChange?.(p.key, p)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 bg-card border border-white/8 rounded-xl px-4 py-2.5 text-sm text-slate-300 hover:border-white/16 transition-all"
      >
        <Calendar size={14} className="text-slate-500" />
        <span className="font-medium">{label}</span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full mt-2 min-w-56 bg-card border border-white/12 rounded-xl shadow-2xl shadow-black/60 py-1.5 z-30"
        >
          {presets.map(p => {
            const isActive = p.key === selected
            return (
              <li key={p.key}>
                <button
                  type="button"
                  onClick={() => pick(p)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors ${
                    isActive ? 'text-brand bg-brand/8' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span>{p.label}</span>
                  {isActive && <span className="text-brand text-xs">●</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ── Section header w/ optional CTA ───────────────────────────────────────── */
export function Section({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-white font-bold text-base sm:text-lg leading-tight">{title}</h2>
          {subtitle && <p className="text-slate-500 text-xs sm:text-sm mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/* ── Card wrapper ─────────────────────────────────────────────────────────── */
export function Card({ children, className = '', as = 'div' }) {
  const Cmp = as
  return (
    <Cmp className={`bg-[#0C1326] border border-white/[0.08] rounded-2xl shadow-md shadow-black/30 ${className}`}>
      {children}
    </Cmp>
  )
}

/* ── Activity row (Actividades Recientes pattern) ─────────────────────────── */
const SPORT_STYLE = {
  trail:        { bg: '#C6FF001A', icon: '🌲', color: '#C6FF00' },
  entrenamiento:{ bg: '#FBBF241A', icon: '🏃', color: '#FBBF24' },
  competencia:  { bg: '#3B82F61A', icon: '🏁', color: '#3B82F6' },
  recuperacion: { bg: '#A855F71A', icon: '🧘', color: '#A855F7' },
}

const STATUS_STYLE = {
  completada: { label: 'Completada', bg: 'bg-[#C6FF00]/10', text: 'text-[#C6FF00]' },
  programada: { label: 'Programada', bg: 'bg-blue-500/10',  text: 'text-blue-400'  },
  cancelada:  { label: 'Cancelada',  bg: 'bg-red-500/10',   text: 'text-red-400'   },
}

export function ActivityRow({ activity, first }) {
  const sp     = SPORT_STYLE[activity.sport] ?? SPORT_STYLE.entrenamiento
  const status = STATUS_STYLE[activity.status] ?? STATUS_STYLE.completada
  const date   = activity.date
    ? new Date(activity.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div className={`flex items-center gap-3 sm:gap-4 px-4 py-3.5 ${first ? '' : 'border-t border-white/[0.05]'}`}>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm"
        style={{ backgroundColor: sp.bg, color: sp.color }}
      >
        {sp.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{activity.title}</p>
        <p className="text-slate-600 text-[11px] mt-0.5">
          {date}{activity.time ? ` · ${activity.time}` : ''}
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-4 text-[11px] text-slate-500 font-mono shrink-0">
        {activity.distance != null && <span>📏 {activity.distance} km</span>}
        {activity.elevation != null && <span>📈 {activity.elevation} m</span>}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${status.bg} ${status.text}`}>
        {status.label}
      </span>
    </div>
  )
}
