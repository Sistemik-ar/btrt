import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { decodeHTML, formatTime, parseTimeToMinutes, formatMinutesShort, percentile, parseDistance, formatPace } from '../lib/format'

const BRAND  = '#AADD00'
const BRAND2 = '#7aaa00'

export default function RaceStats({ results }) {
  const sorted = [...results]
    .filter(r => r.eventos?.fecha)
    .sort((a, b) => new Date(a.eventos.fecha) - new Date(b.eventos.fecha))

  const chartData = sorted.map(r => {
    const pct    = percentile(r.pos_general, r.eventos?.participant_count)
    const mins   = parseTimeToMinutes(r.tiempo_total)
    const distKm = parseDistance(decodeHTML(r.carrera)) ?? parseDistance(decodeHTML(r.eventos?.nombre))
    const pace   = (mins != null && distKm != null && distKm > 0) ? mins / distKm : null
    const fecha  = new Date(r.eventos.fecha + 'T12:00:00')
    return {
      label:   fecha.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
      evento:  decodeHTML(r.eventos?.nombre),
      carrera: decodeHTML(r.carrera),
      pos:     r.pos_general ? parseInt(r.pos_general) : null,
      total:   r.eventos?.participant_count,
      pct,
      mins,
      pace,
      distKm,
      tiempo:  formatTime(r.tiempo_total),
    }
  })

  const hasPct   = chartData.some(d => d.pct != null)
  const hasTimes = chartData.some(d => d.mins != null)
  // Use pace chart when at least 2 races have distance info (meaningful comparison)
  const hasPace  = chartData.filter(d => d.pace != null).length >= 2

  const validPcts  = chartData.filter(d => d.pct != null).map(d => d.pct)
  const validMins  = chartData.filter(d => d.mins != null).map(d => d.mins)
  const validPaces = chartData.filter(d => d.pace != null).map(d => d.pace)

  const bestPct   = validPcts.length  ? Math.min(...validPcts)  : null
  const avgPct    = validPcts.length  ? Math.round(validPcts.reduce((s, v) => s + v, 0) / validPcts.length) : null
  const bestMins  = validMins.length  ? Math.min(...validMins)  : null
  const bestPace  = validPaces.length ? Math.min(...validPaces) : null

  // Y-axis domain capped at P75×1.3 to prevent outliers flattening bars
  const paceDomain = validPaces.length >= 2
    ? [Math.min(...validPaces) * 0.9, [...validPaces].sort((a,b)=>a-b)[Math.floor(validPaces.length * 0.75)] * 1.2]
    : undefined
  const timeDomain = validMins.length >= 2
    ? [0, [...validMins].sort((a,b)=>a-b)[Math.floor(validMins.length * 0.75)] * 1.3]
    : undefined

  return (
    <div className="flex flex-col gap-5">

      {/* ── Summary cards ── */}
      <div className={`grid gap-4 ${bestPace != null ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
        <SummaryCard
          icon={<FlagIcon />}
          label="Carreras"
          value={String(results.length)}
          accent="white"
        />
        <SummaryCard
          icon={<StarIcon />}
          label="Mejor top"
          value={bestPct != null ? `Top ${bestPct}%` : '—'}
          accent="brand"
        />
        <SummaryCard
          icon={<AvgIcon />}
          label="Promedio top"
          value={avgPct != null ? `Top ${avgPct}%` : '—'}
          accent="dim"
        />
        {bestPace != null && (
          <SummaryCard
            icon={<PaceIcon />}
            label="Mejor pace"
            value={formatPace(bestPace)}
            accent="brand"
            sub="min/km"
          />
        )}
      </div>

      {/* ── Position percentile chart ── */}
      {hasPct && (
        <ChartCard title="Posición relativa" subtitle="% del campo completado — menos es mejor">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[0, 100]}
                reversed
                tick={{ fill: '#475569', fontSize: 10 }}
                tickFormatter={v => `${v}%`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<PctTooltip />} />
              <Line
                type="monotone"
                dataKey="pct"
                stroke={BRAND}
                strokeWidth={2.5}
                dot={{ fill: BRAND, r: 5, strokeWidth: 2, stroke: '#0A0A14' }}
                activeDot={{ r: 7, stroke: '#0A0A14', strokeWidth: 2 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ── Pace chart (preferred when distance available) ── */}
      {hasPace && (
        <ChartCard
          title="Pace por kilómetro"
          subtitle={`Mejor: ${formatPace(bestPace)} · menos es mejor · normalizado por distancia`}
        >
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={paceDomain}
                reversed
                tick={{ fill: '#475569', fontSize: 10 }}
                tickFormatter={v => formatPace(v)}
                width={52}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<PaceTooltip bestPace={bestPace} />} />
              <Bar dataKey="pace" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {chartData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.pace != null ? (d.pace === bestPace ? BRAND : BRAND2) : '#334155'}
                    fillOpacity={d.pace != null ? (d.pace === bestPace ? 1 : 0.45) : 0.3}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {chartData.some(d => d.pace == null && d.mins != null) && (
            <p className="text-slate-600 text-[10px] mt-2 text-right">
              Barras grises = distancia no disponible en esa carrera
            </p>
          )}
        </ChartCard>
      )}

      {/* ── Raw time chart (fallback when no distances) ── */}
      {hasTimes && !hasPace && (
        <ChartCard
          title="Tiempo de llegada"
          subtitle={bestMins ? `Mejor: ${formatMinutesShort(bestMins)}` : undefined}
        >
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={timeDomain}
                tick={{ fill: '#475569', fontSize: 10 }}
                tickFormatter={v => formatMinutesShort(v)}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<TimeTooltip />} />
              <Bar dataKey="mins" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {chartData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.mins === bestMins ? BRAND : BRAND2}
                    fillOpacity={d.mins === bestMins ? 1 : 0.45}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ── Race list ── */}
      <div>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">Detalle</p>
        <div className="flex flex-col gap-2">
          {sorted.map((r, i) => (
            <RaceRow key={r.id} result={r} index={i + 1} bestMins={bestMins} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Summary card ── */
function SummaryCard({ icon, label, value, accent, sub }) {
  const styles = {
    brand: { iconBg: 'bg-[#AADD00]/15', iconText: 'text-[#AADD00]', val: 'text-[#AADD00]' },
    white: { iconBg: 'bg-white/8',       iconText: 'text-white',       val: 'text-white'     },
    dim:   { iconBg: 'bg-white/5',       iconText: 'text-slate-400',   val: 'text-slate-300' },
  }
  const s = styles[accent] ?? styles.dim

  return (
    <div className="bg-[#13131F] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg} ${s.iconText}`}>
          {icon}
        </div>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-tight">{label}</p>
      </div>
      <p className={`text-2xl font-black tracking-tight ${s.val}`}>{value}</p>
      {sub && <p className="text-slate-600 text-[10px] mt-0.5">{sub}</p>}
    </div>
  )
}

/* ── Chart card ── */
function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-[#13131F] border border-white/5 rounded-2xl p-5">
      <div className="mb-4">
        <p className="text-white text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

/* ── Tooltips ── */
function PctTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-3 text-xs shadow-xl max-w-[200px]">
      <p className="text-white font-semibold truncate">{d.evento}</p>
      {d.carrera && <p className="text-slate-400 mt-0.5 truncate">{d.carrera}</p>}
      <p className="text-[#AADD00] font-bold mt-2">
        Top {d.pct}% · #{d.pos}/{d.total}
      </p>
    </div>
  )
}

function TimeTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-3 text-xs shadow-xl max-w-[200px]">
      <p className="text-white font-semibold truncate">{d.evento}</p>
      {d.carrera && <p className="text-slate-400 mt-0.5 truncate">{d.carrera}</p>}
      <p className="text-[#AADD00] font-bold mt-2 tabular-nums">{d.tiempo}</p>
    </div>
  )
}

function PaceTooltip({ active, payload, bestPace }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  if (d.pace == null) return null
  const isBest = d.pace === bestPace
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-3 text-xs shadow-xl max-w-[220px]">
      <p className="text-white font-semibold truncate">{d.evento}</p>
      {d.carrera && <p className="text-slate-400 mt-0.5 truncate">{d.carrera}</p>}
      <div className="flex items-center gap-3 mt-2">
        <div>
          <p className="text-slate-500 text-[10px] uppercase tracking-wider">Pace</p>
          <p className={`font-bold tabular-nums ${isBest ? 'text-[#AADD00]' : 'text-white'}`}>
            {formatPace(d.pace)}
          </p>
        </div>
        {d.distKm && (
          <div>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider">Distancia</p>
            <p className="text-white font-bold">{d.distKm} km</p>
          </div>
        )}
        <div>
          <p className="text-slate-500 text-[10px] uppercase tracking-wider">Tiempo</p>
          <p className="text-slate-300 tabular-nums">{d.tiempo}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Race row ── */
function RaceRow({ result, index, bestMins }) {
  const evento  = result.eventos
  const fecha   = evento?.fecha
    ? new Date(evento.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null
  const pct     = percentile(result.pos_general, evento?.participant_count)
  const tiempo  = formatTime(result.tiempo_total)
  const mins    = parseTimeToMinutes(result.tiempo_total)
  const distKm  = parseDistance(decodeHTML(result.carrera)) ?? parseDistance(decodeHTML(evento?.nombre))
  const pace    = (mins != null && distKm) ? mins / distKm : null
  const isBest  = bestMins != null && mins === bestMins

  return (
    <div className="bg-[#13131F] border border-white/5 rounded-2xl p-4 grid grid-cols-[auto_1fr_auto] gap-3 items-start">
      {/* Index */}
      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-slate-500 text-xs font-bold">{index}</span>
      </div>

      {/* Main info */}
      <div className="min-w-0">
        <p className="text-white text-sm font-semibold leading-snug">
          {decodeHTML(evento?.nombre)}
        </p>
        <div className="flex items-center gap-x-2 gap-y-0.5 mt-1 flex-wrap">
          {fecha && <span className="text-slate-500 text-xs">{fecha}</span>}
          {evento?.localidad && <span className="text-slate-600 text-xs">· {evento.localidad}</span>}
          {result.carrera && (
            <span className="text-[#AADD00]/50 text-xs">· {decodeHTML(result.carrera)}</span>
          )}
        </div>
      </div>

      {/* Stats column */}
      <div className="flex flex-col items-end gap-1 shrink-0 w-28">
        {result.pos_general && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
            isBest ? 'bg-[#AADD00]/20 text-[#AADD00]' : 'bg-white/5 text-slate-300'
          }`}>
            #{result.pos_general}
          </span>
        )}
        {pct != null && (
          <p className={`text-xs font-semibold ${isBest ? 'text-[#AADD00]' : 'text-slate-500'}`}>
            top {pct}%
          </p>
        )}
        {tiempo && (
          <p className="text-slate-400 text-xs tabular-nums">{tiempo}</p>
        )}
        {pace != null && (
          <p className={`text-[10px] tabular-nums font-semibold ${isBest ? 'text-[#AADD00]/70' : 'text-slate-600'}`}>
            {formatPace(pace)}
          </p>
        )}
      </div>
    </div>
  )
}

/* ── Icons ── */
function FlagIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
}
function StarIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
}
function AvgIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
}
function PaceIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
