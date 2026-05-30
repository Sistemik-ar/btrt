/**
 * PremiumWeekPlan — visual premium para /planificacion-semanal.
 *
 * Inspirado en btrt/docs/reference-premium.html (Cerro López).
 * Renderiza UNA card por actividad (no grilla). Mobile-first.
 *
 * Data shape compatible con `activities[]` que ya genera el editor.
 * Campos opcionales nuevos (material, capas, accesorios, terreno,
 * hidra, tips, corte, destinos por nivel) se renderizan solo si existen.
 */

import { DAY_KEYS, DAY_NAME } from './RocoWeekPlan'

const BADGE_TITLES = {
  quality: 'Calidad · Aeróbico',
  hills:   'Cuesta · Fuerza Específica',
  fondazo: 'Fondo de Montaña',
  rest:    'Recuperación',
}

const NIVEL_DEFAULT_DEST = { ini: 'Nivel Inicial', med: 'Nivel Intermedio', avz: 'Nivel Avanzado' }

function composeDayTitle(activity) {
  if (activity.dayLabel) return activity.dayLabel
  const sorted = [...activity.days].sort((a, b) => DAY_KEYS.indexOf(a) - DAY_KEYS.indexOf(b))
  if (sorted.length === 1) return DAY_NAME[sorted[0]]
  return sorted.map(d => DAY_NAME[d]).join(' / ')
}

function deriveTitle(activity) {
  // Para fondazo (1 sola card grande, estilo "Fondo Sábado"): split en dos
  if (activity.badge?.type === 'fondazo' && activity.days.length === 1) {
    const day = DAY_NAME[activity.days[0]]
    return { primary: 'Fondo', accent: day }
  }
  const t = composeDayTitle(activity)
  // Si tiene "/" lo partimos para resaltar el segundo día
  if (t.includes(' / ')) {
    const [a, b] = t.split(' / ')
    return { primary: a, accent: b }
  }
  return { primary: t, accent: '' }
}

function deriveMetaChips(activity) {
  const chips = []
  const firstTurno = (activity.turnos ?? []).find(Boolean)
  if (firstTurno) {
    chips.push({ icon: '⏰', label: 'Encuentro', value: firstTurno.text.replace(/^⏰\s*/, '') })
  }
  if (activity.durationLabel) {
    chips.push({ icon: '⏱', label: 'Duración', value: activity.durationLabel })
  }
  if (activity.extra?.elevation) {
    chips.push({ icon: '🏔', label: 'Desnivel', value: activity.extra.elevation })
  }
  return chips
}

function splitNivel(text) {
  // Permite "Refugio López · 2-3 hs · D+500-700m" → destino + resto
  if (!text) return { dest: '', desc: '' }
  const idx = text.indexOf('·')
  if (idx < 0) return { dest: text.trim(), desc: '' }
  return { dest: text.slice(0, idx).trim(), desc: text.slice(idx + 1).trim() }
}

export default function PremiumWeekPlan({ week }) {
  if (!week?.activities?.length) return null
  const sorted = [...week.activities].sort((a, b) =>
    DAY_KEYS.indexOf((a.days ?? [])[0] ?? 'lun') - DAY_KEYS.indexOf((b.days ?? [])[0] ?? 'lun')
  )

  return (
    <div className="pwp-root">
      <style>{PWP_CSS}</style>
      {sorted.map(a => <ActivityCard key={a.id} activity={a} weekDates={week.dates} />)}
    </div>
  )
}

function ActivityCard({ activity, weekDates }) {
  const isRest = activity.rest || activity.badge?.type === 'rest'
  const title  = deriveTitle(activity)
  const meta   = deriveMetaChips(activity)
  const niveles = (activity.niveles ?? []).filter(n => n.text)
  const destinos = activity.extra?.destinations ?? {}

  return (
    <article className={`pwp-card ${isRest ? 'pwp-rest' : ''}`}>
      {/* Header */}
      <header className="pwp-header">
        <div className="pwp-team">Bandurrias Trail Running Team · Bariloche</div>
        <h2 className="pwp-title">
          {title.primary}
          {title.accent && <><br/><span>{title.accent}</span></>}
        </h2>
        {activity.badge?.label && (
          <p className="pwp-subtitle">🖤 {activity.badge.label}{weekDates ? ` · ${weekDates}` : ''}</p>
        )}
        {meta.length > 0 && (
          <div className="pwp-meta">
            {meta.map((c, i) => (
              <div key={i} className="pwp-chip">
                <span className="pwp-chip-icon">{c.icon}</span>
                <div>
                  <span className="pwp-chip-label">{c.label}</span>
                  <span className="pwp-chip-value">{c.value}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Location */}
      {activity.meetpoint?.text && (
        <div className={`pwp-loc ${activity.meetpoint.pending ? 'pwp-pending' : ''}`}>
          <div className="pwp-loc-icon">{activity.meetpoint.pending ? '⚠️' : '📍'}</div>
          <div>
            <div className="pwp-loc-title">{activity.meetpoint.pending ? 'A confirmar' : 'Punto de Encuentro'}</div>
            <div className="pwp-loc-name">{activity.meetpoint.text}</div>
            {activity.meetpoint.sub && <div className="pwp-loc-sub">{activity.meetpoint.sub}</div>}
            {activity.meetpoint.url && (
              <a className="pwp-loc-link" href={activity.meetpoint.url} target="_blank" rel="noreferrer">
                🗺 Abrir en Maps
              </a>
            )}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="pwp-body">
        {isRest && activity.restBody && (
          <div className="pwp-rest-body">
            <div className="pwp-sec">💤 {activity.restBody.title}</div>
            {(activity.restBody.lines ?? []).filter(Boolean).map((l, i) => (
              <p key={i} className="pwp-rest-line">{l}</p>
            ))}
          </div>
        )}

        {!isRest && activity.objective && (
          <div>
            <div className="pwp-sec">🎯 Objetivo de la sesión</div>
            <p className="pwp-text">{activity.objective}</p>
          </div>
        )}

        {!isRest && niveles.length > 0 && (
          <div>
            <div className="pwp-sec">🏃 Objetivos por nivel</div>
            <div className="pwp-niveles">
              {niveles.map((n) => {
                const dest = destinos[n.type] ?? splitNivel(n.text).dest ?? NIVEL_DEFAULT_DEST[n.type]
                const desc = destinos[n.type] ? n.text : (splitNivel(n.text).desc || n.text)
                return (
                  <div key={n.type} className={`pwp-nrow pwp-${n.type}`}>
                    <span className={`pwp-ntag pwp-${n.type}`}>{n.type.toUpperCase()}</span>
                    <div>
                      <div className="pwp-ndest">{dest}</div>
                      {desc && desc !== dest && <div className="pwp-ndesc">{desc}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activity.extra?.corte && (
          <div className="pwp-corte">
            <div className="pwp-corte-icon">⚠️</div>
            <div>
              <div className="pwp-corte-label">Tiempo de corte para regreso</div>
              <div className="pwp-corte-val">{activity.extra.corte}</div>
            </div>
          </div>
        )}

        {(activity.extra?.material?.length || activity.extra?.layers?.length || activity.extra?.accesorios?.length || activity.extra?.terreno?.length) > 0 && (
          <div className="pwp-grid2">
            {activity.extra.material?.length > 0   && <ItemBlock title="🎒 Material obligatorio" items={activity.extra.material} />}
            {activity.extra.layers?.length > 0     && <ItemBlock title="🧅 Sistema de capas"    items={activity.extra.layers} />}
            {activity.extra.accesorios?.length > 0 && <ItemBlock title="🧤 Accesorios"           items={activity.extra.accesorios} />}
            {activity.extra.terreno?.length > 0    && <ItemBlock title="🦯 Terreno"              items={activity.extra.terreno} />}
          </div>
        )}

        {activity.extra?.hidra?.length > 0 && (
          <div className="pwp-hidra">
            <div className="pwp-sec">🥤 Hidratación y energía</div>
            <div className="pwp-hidra-row">
              {activity.extra.hidra.map((h, i) => (
                <div key={i} className="pwp-hidra-item">
                  <span className="pwp-hi">{h.icon ?? '💧'}</span>
                  <p>{h.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isRest && activity.activities?.filter(Boolean).length > 0 && (
          <div>
            <div className="pwp-sec">📋 Plan de la sesión</div>
            <ul className="pwp-act">
              {activity.activities.filter(Boolean).map((it, i) => <li key={i}>{it}</li>)}
            </ul>
          </div>
        )}

        {activity.extra?.tips?.length > 0 && activity.extra.tips.map((t, i) => (
          <div key={i} className="pwp-tip">
            <div className="pwp-tip-title">💡 {t.title}</div>
            <p>{t.text}</p>
          </div>
        ))}

        {activity.note?.text && (
          <div className="pwp-tip">
            <div className="pwp-tip-title">{activity.note.strong || 'Nota'}</div>
            <p>{activity.note.text}</p>
          </div>
        )}

        {activity.extra?.warning && (
          <div className="pwp-warn">
            <span className="pwp-wi">⚠️</span>
            <p>{activity.extra.warning}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="pwp-foot">
        <span>Bandurrias TRT<span className="pwp-dot">·</span>Bariloche</span>
        <span>{weekDates}<span className="pwp-dot">·</span>{BADGE_TITLES[activity.badge?.type] ?? ''}</span>
      </footer>
    </article>
  )
}

function ItemBlock({ title, items }) {
  return (
    <div className="pwp-item">
      <div className="pwp-sec">{title}</div>
      <ul>{items.filter(Boolean).map((it, i) => <li key={i}>{it}</li>)}</ul>
    </div>
  )
}

/* ── CSS scoped por prefix pwp- (mirrors docs/reference-premium.html) ── */
const PWP_CSS = `
.pwp-root {
  --pwp-black:  #0a0a0a;
  --pwp-black2: #111111;
  --pwp-black3: #181818;
  --pwp-black4: #222222;
  --pwp-lime:   #c8f000;
  --pwp-white:  #fff;
  --pwp-gray:   #888;
  --pwp-gray2:  #555;
  --pwp-gray3:  #333;
  --pwp-orange: #ff8c00;
  --pwp-blue:   #3399ff;

  font-family: 'Barlow', sans-serif;
  display: flex; flex-direction: column; gap: 20px;
  width: 100%; max-width: 560px; margin: 0 auto;
  color: var(--pwp-white);
}
.pwp-root * { box-sizing: border-box; }

.pwp-card {
  background: var(--pwp-black2);
  border-top: 5px solid var(--pwp-lime);
  border-radius: 4px;
  overflow: hidden;
}
.pwp-card.pwp-rest { border-top-color: var(--pwp-gray3); opacity: 0.7; }

.pwp-header {
  background: linear-gradient(135deg, #0a0a0a 0%, #141a00 100%);
  padding: 28px 24px 22px;
  border-bottom: 1px solid var(--pwp-gray3);
}
.pwp-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700; font-size: 11px; letter-spacing: 3px;
  color: var(--pwp-lime); text-transform: uppercase; margin-bottom: 10px;
}
.pwp-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 40px; line-height: 0.95;
  text-transform: uppercase; letter-spacing: 1px;
  color: var(--pwp-white); margin: 0 0 6px;
}
.pwp-title span { color: var(--pwp-lime); }
.pwp-subtitle {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600; font-size: 15px; letter-spacing: 2px;
  color: var(--pwp-gray); text-transform: uppercase; margin-bottom: 18px;
}
.pwp-meta { display: flex; gap: 10px; flex-wrap: wrap; }
.pwp-chip {
  background: var(--pwp-black4);
  border: 1px solid var(--pwp-gray3);
  border-radius: 3px;
  padding: 7px 12px;
  display: flex; align-items: center; gap: 7px;
}
.pwp-chip-icon { font-size: 15px; }
.pwp-chip-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px; font-weight: 600; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--pwp-gray);
  display: block; line-height: 1;
}
.pwp-chip-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 16px; font-weight: 800;
  color: var(--pwp-lime); display: block; line-height: 1.1;
}

.pwp-loc {
  background: var(--pwp-black3);
  padding: 16px 24px;
  border-bottom: 1px solid var(--pwp-gray3);
  display: flex; align-items: flex-start; gap: 14px;
}
.pwp-loc.pwp-pending { background: #1a1000; border-bottom-color: #3d2800; }
.pwp-loc.pwp-pending .pwp-loc-title { color: var(--pwp-orange); }
.pwp-loc-icon { font-size: 20px; margin-top: 2px; flex-shrink: 0; }
.pwp-loc-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: 2px;
  color: var(--pwp-lime); text-transform: uppercase; margin-bottom: 3px;
}
.pwp-loc-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 18px; font-weight: 800;
  color: var(--pwp-white); text-transform: uppercase;
  letter-spacing: 0.5px; margin-bottom: 4px; line-height: 1.15;
}
.pwp-loc-sub { font-size: 12px; color: var(--pwp-gray); margin-bottom: 8px; line-height: 1.4; }
.pwp-loc-link {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--pwp-black4); border: 1px solid var(--pwp-gray3);
  border-radius: 3px; padding: 5px 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--pwp-lime); text-decoration: none;
}
.pwp-loc-link:hover { background: var(--pwp-gray3); }

.pwp-body { padding: 22px 24px; display: flex; flex-direction: column; gap: 20px; }

.pwp-sec {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: 2px;
  color: var(--pwp-lime); text-transform: uppercase; margin-bottom: 8px;
}
.pwp-text { font-size: 13px; color: #c8c8c8; line-height: 1.5; }

.pwp-rest-body { background: var(--pwp-black3); border-radius: 3px; padding: 14px; }
.pwp-rest-line { font-size: 12px; color: var(--pwp-gray); line-height: 1.4; margin-top: 4px; }

.pwp-niveles { display: flex; flex-direction: column; gap: 8px; }
.pwp-nrow {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 14px; background: var(--pwp-black3);
  border-radius: 3px; border-left: 3px solid transparent;
}
.pwp-nrow.pwp-ini { border-left-color: var(--pwp-blue); }
.pwp-nrow.pwp-med { border-left-color: var(--pwp-orange); }
.pwp-nrow.pwp-avz { border-left-color: var(--pwp-lime); }
.pwp-ntag {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px; font-weight: 800; letter-spacing: 1.5px;
  padding: 3px 7px; border-radius: 2px;
  flex-shrink: 0; margin-top: 1px;
}
.pwp-ntag.pwp-ini { background: #1a2d4a; color: var(--pwp-blue); }
.pwp-ntag.pwp-med { background: #2d1e00; color: var(--pwp-orange); }
.pwp-ntag.pwp-avz { background: #1a2200; color: var(--pwp-lime); }
.pwp-ndest {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 15px; font-weight: 800;
  color: var(--pwp-white); text-transform: uppercase;
  letter-spacing: 0.5px; margin-bottom: 2px;
}
.pwp-ndesc { font-size: 12px; color: var(--pwp-gray); line-height: 1.4; }

.pwp-corte {
  background: #1a1000; border: 1px solid #3d2800; border-radius: 3px;
  padding: 14px 16px; display: flex; align-items: center; gap: 12px;
}
.pwp-corte-icon { font-size: 20px; flex-shrink: 0; }
.pwp-corte-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: 2px;
  color: var(--pwp-orange); text-transform: uppercase; margin-bottom: 2px;
}
.pwp-corte-val {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 17px; font-weight: 800; color: var(--pwp-white);
}

.pwp-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 480px) { .pwp-grid2 { grid-template-columns: 1fr; } }
.pwp-item { background: var(--pwp-black3); border-radius: 3px; padding: 14px; }
.pwp-item ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 5px; }
.pwp-item ul li {
  font-size: 12px; color: var(--pwp-gray); line-height: 1.35;
  padding-left: 10px; position: relative;
}
.pwp-item ul li::before {
  content: '—'; position: absolute; left: 0;
  color: var(--pwp-gray3); font-size: 10px; top: 1px;
}

.pwp-hidra { background: var(--pwp-black3); border-radius: 3px; padding: 14px; }
.pwp-hidra-row { display: flex; gap: 16px; flex-wrap: wrap; }
.pwp-hidra-item { display: flex; align-items: flex-start; gap: 6px; flex: 1; min-width: 130px; }
.pwp-hi { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
.pwp-hidra-item p { font-size: 12px; color: var(--pwp-gray); line-height: 1.4; }

.pwp-act { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.pwp-act li {
  font-size: 12.5px; color: #aaa; line-height: 1.45;
  padding-left: 14px; position: relative;
}
.pwp-act li::before { content: '▸'; position: absolute; left: 0; color: var(--pwp-lime); font-size: 11px; top: 1px; }

.pwp-tip { background: #0f1a00; border: 1px solid #2a3d00; border-radius: 3px; padding: 13px 16px; }
.pwp-tip-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: 2px;
  color: var(--pwp-lime); text-transform: uppercase; margin-bottom: 6px;
}
.pwp-tip p { font-size: 12.5px; color: #aaa; line-height: 1.55; }

.pwp-warn { background: #1a0f00; border: 1px solid #3d2200; border-radius: 3px; padding: 12px 16px; display: flex; gap: 10px; align-items: flex-start; }
.pwp-wi { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
.pwp-warn p { font-size: 12px; color: #aaa; line-height: 1.5; }

.pwp-foot {
  padding: 13px 24px; border-top: 1px solid var(--pwp-gray3);
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 6px;
}
.pwp-foot span {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px; font-weight: 600; letter-spacing: 1.5px;
  color: var(--pwp-gray2); text-transform: uppercase;
}
.pwp-dot { margin: 0 6px; color: var(--pwp-lime); }

@media (max-width: 480px) {
  .pwp-title { font-size: 34px; }
  .pwp-header { padding: 24px 18px 18px; }
  .pwp-body { padding: 18px; }
  .pwp-loc { padding: 14px 18px; }
  .pwp-foot { padding: 12px 18px; }
}
`
