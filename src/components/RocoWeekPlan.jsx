/**
 * Renders Roco's weekly training plan 1:1 with btrt/src/mocks/roco-plan.html.
 *
 * Accepts either the legacy `cards[]` shape or the new activity-centric
 * `activities[]` shape (with `days: ['lun','mar']` etc). Activities are
 * converted to render-ready cards on the fly.
 */

export const DAY_KEYS    = ['lun','mar','mie','jue','vie','sab','dom']
export const DAY_NAME    = { lun:'Lunes', mar:'Martes', mie:'Miércoles', jue:'Jueves', vie:'Viernes', sab:'Sábado', dom:'Domingo' }
export const DAY_ABBREV  = { lun:'Lun',   mar:'Mar',    mie:'Mié',       jue:'Jue',    vie:'Vie',     sab:'Sáb',    dom:'Dom'    }

/* ── Activity → card converter ───────────────────────────────────────────── */

export function composeDayLabel(activity) {
  if (activity.dayLabel) return activity.dayLabel
  const sortedDays = [...activity.days].sort((a, b) => DAY_KEYS.indexOf(a) - DAY_KEYS.indexOf(b))
  return sortedDays.map(d => DAY_NAME[d]).join(' / ')
}

export function activityToCard(a) {
  const sortedDays = [...a.days].sort((da, db) => DAY_KEYS.indexOf(da) - DAY_KEYS.indexOf(db))
  const multiDay   = sortedDays.length > 1
  const isSat      = sortedDays.length === 1 && sortedDays[0] === 'sab' && a.badge?.type !== 'rest'
  const isRest     = a.rest || a.badge?.type === 'rest'

  const turnos = (a.turnos ?? [])
    .slice()
    .sort((ta, tb) => DAY_KEYS.indexOf(ta.day) - DAY_KEYS.indexOf(tb.day))
    .map(t => ({
      text: multiDay
        ? `${DAY_ABBREV[t.day] ?? ''} ${t.text ?? ''}`.trim()
        : (t.text ?? ''),
    }))

  return {
    id: a.id,
    dayLabel: composeDayLabel(a),
    badge: a.badge,
    saturday: isSat,
    rest: isRest,
    turnos,
    turnoNote: a.turnoNote,
    turnoNoteColor: a.turnoNoteColor,
    meetpoint: a.meetpoint && a.meetpoint.text ? a.meetpoint : null,
    objective: a.objective,
    structureLabel: a.structureLabel,
    activities: (a.activities ?? []).filter(Boolean),
    note: a.note,
    niveles: a.niveles,
    durationLabel: a.durationLabel,
    restBody: a.restBody,
  }
}

function normalizeWeek(week) {
  if (!week) return null
  if (Array.isArray(week.activities)) {
    return { ...week, cards: week.activities.map(activityToCard) }
  }
  return week
}

/* ── Main component ──────────────────────────────────────────────────────── */

export default function RocoWeekPlan({ week: rawWeek }) {
  const week = normalizeWeek(rawWeek)
  if (!week?.cards?.length) return null

  return (
    <div className="roco-plan">
      <style>{ROCO_CSS}</style>

      {/* Site header */}
      <header className="rp-site-header">
        <div className="rp-logo-block">
          <img className="rp-logo-icon" src="/logo.png" alt="BTRT"
            onError={e => { e.target.style.display = 'none' }} />
          <div className="rp-logo-text-block">
            <div className="rp-logo-name">Bandurrias</div>
            <div className="rp-logo-sub">Trail Running Team</div>
          </div>
        </div>
        <div className="rp-header-right">
          <div className="rp-doc-type">{week.docType ?? 'Planificación Semanal'}</div>
          {week.period && <div className="rp-doc-period">{week.period}</div>}
          {week.docSpec && <div className="rp-doc-spec">{week.docSpec}</div>}
        </div>
      </header>

      {/* Week tag */}
      <div className="rp-week-tag">
        <span className="rp-wtag">Semana {week.weekNumber ?? '—'}</span>
        <span className="rp-wdates">{week.dates}</span>
      </div>

      <div className="rp-divider" />

      {/* Week grid */}
      <div className="rp-week-grid">
        {week.cards.map(card => <DayCard key={card.id} card={card} />)}
      </div>

      {/* Footer */}
      {week.footer && (
        <footer className="rp-site-footer">
          <span>{week.footer.left}</span>
          <span>{week.footer.right}</span>
        </footer>
      )}
    </div>
  )
}

function DayCard({ card }) {
  const isRest     = !!card.rest
  const isSaturday = !!card.saturday
  const badgeClass =
    card.badge?.type === 'quality' ? 'rp-bq' :
    card.badge?.type === 'hills'   ? 'rp-bh' :
    card.badge?.type === 'fondazo' ? 'rp-bf' :
    'rp-br'

  return (
    <div className={`rp-day-card ${isSaturday ? 'rp-saturday' : ''} ${isRest ? 'rp-rest' : ''}`}>
      <div className="rp-card-header">
        <div className="rp-day-name">{card.dayLabel}</div>
        {card.badge && <span className={`rp-badge ${badgeClass}`}>{card.badge.label}</span>}
      </div>

      <div className="rp-card-body">
        {/* Rest body */}
        {isRest && card.restBody && (
          <p className="rp-rest-body">
            {card.restBody.title}
            {card.restBody.lines?.length > 0 && (
              <>
                <br />
                <span className="rp-rest-sub">
                  {card.restBody.lines.map((l, i) => (
                    <span key={i}>{l}{i < card.restBody.lines.length - 1 && <br />}</span>
                  ))}
                </span>
              </>
            )}
          </p>
        )}

        {/* Turnos */}
        {!isRest && card.turnos?.length > 0 && (
          <div className="rp-turnos">
            {card.turnos.map((t, i) => (
              <span key={i} className="rp-turno">{t.text}</span>
            ))}
            {card.turnoNote && (
              <span
                className="rp-turno-note"
                style={card.turnoNoteColor === 'orange' ? { color: '#ff8c00' } : undefined}
              >
                {card.turnoNote}
              </span>
            )}
          </div>
        )}

        {/* Meetpoint */}
        {!isRest && card.meetpoint && (
          <div className={`rp-meetpoint ${card.meetpoint.pending ? 'rp-pending' : ''}`}>
            {card.meetpoint.icon ?? (card.meetpoint.pending ? '⚠️' : '📍')}{' '}
            {card.meetpoint.url
              ? <a href={card.meetpoint.url} target="_blank" rel="noreferrer">{card.meetpoint.text}</a>
              : card.meetpoint.text}
          </div>
        )}

        {/* Objetivo */}
        {!isRest && card.objective && (
          <>
            <div className="rp-sec">Objetivo</div>
            <div className="rp-obj">{card.objective}</div>
          </>
        )}

        {/* Actividades */}
        {!isRest && card.activities?.length > 0 && (
          <>
            <div className="rp-sec">{card.structureLabel ?? 'Actividades'}</div>
            <ul className="rp-act">
              {card.activities.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </>
        )}

        {/* Nota / Observación */}
        {!isRest && card.note && card.note.text && (
          <div className="rp-note">
            {card.note.strong && <strong>{card.note.strong}</strong>}
            {card.note.strong && ' '}
            {card.note.text}
          </div>
        )}

        {/* Por nivel */}
        {!isRest && card.niveles?.some(n => n.text) && (
          <>
            <div className="rp-sec">Por nivel</div>
            {card.niveles.filter(n => n.text).map((n, i) => (
              <div key={i} className="rp-nrow">
                <span className={`rp-ntag rp-${n.type}`}>{n.type.toUpperCase()}</span>
                <span className="rp-ndesc">{n.text}</span>
              </div>
            ))}
          </>
        )}

        {/* Duration label */}
        {!isRest && card.durationLabel && (
          <div className="rp-dlabel">{card.durationLabel}</div>
        )}
      </div>
    </div>
  )
}

/* ── Scoped CSS (mirrors btrt/src/mocks/roco-plan.html) ────────────────── */
const ROCO_CSS = `
.roco-plan {
  --rp-black:  #0a0a0a;
  --rp-black2: #111111;
  --rp-black3: #181818;
  --rp-black4: #222222;
  --rp-lime:   #c8f000;
  --rp-lime2:  #a8cc00;
  --rp-white:  #ffffff;
  --rp-gray:   #888888;
  --rp-gray2:  #555555;
  --rp-gray3:  #333333;
  --rp-red:    #ff4433;
  --rp-orange: #ff8c00;
  --rp-blue:   #3399ff;

  background: var(--rp-black);
  color: var(--rp-white);
  font-family: 'Barlow', sans-serif;
  padding: 0 0 24px;
  border: 1px solid var(--rp-black4);
}
.roco-plan * { box-sizing: border-box; }

.rp-site-header {
  background: var(--rp-black);
  border-bottom: 3px solid var(--rp-lime);
  padding: 28px 32px 24px;
  display: flex; align-items: center; justify-content: space-between;
  max-width: 1100px; margin: 0 auto;
}
.rp-logo-block  { display: flex; align-items: center; gap: 16px; }
.rp-logo-icon   { width: 80px; height: 80px; flex-shrink: 0; object-fit: contain; }
.rp-logo-text-block { display: flex; flex-direction: column; }
.rp-logo-name {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
  font-size: 36px; letter-spacing: 2px; line-height: 1; color: var(--rp-white);
  text-transform: uppercase;
}
.rp-logo-sub {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 600;
  font-size: 13px; letter-spacing: 4px; color: var(--rp-lime);
  text-transform: uppercase; margin-top: 2px;
}
.rp-header-right { text-align: right; }
.rp-doc-type {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
  font-size: 28px; letter-spacing: 3px; color: var(--rp-white);
  text-transform: uppercase; line-height: 1;
}
.rp-doc-period {
  display: inline-block; background: var(--rp-lime); color: var(--rp-black);
  font-family: 'Barlow Condensed', sans-serif; font-weight: 800;
  font-size: 12px; letter-spacing: 3px; padding: 3px 12px; margin-top: 6px;
  text-transform: uppercase;
}
.rp-doc-spec {
  font-size: 11px; color: var(--rp-gray); letter-spacing: 1px; margin-top: 5px;
  text-transform: uppercase;
}
.rp-week-tag {
  max-width: 1100px; margin: 0 auto; padding: 10px 32px;
  display: flex; align-items: center; gap: 10px;
}
.rp-wtag {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 800;
  font-size: 11px; letter-spacing: 2px; color: var(--rp-black);
  background: var(--rp-lime); padding: 3px 10px; text-transform: uppercase;
}
.rp-wdates {
  font-size: 11px; color: var(--rp-gray2); letter-spacing: 1px;
  text-transform: uppercase;
}
.rp-divider {
  height: 1px;
  background: linear-gradient(90deg, var(--rp-lime) 0%, transparent 100%);
  max-width: 1100px; margin: 0 auto 28px;
}

.rp-attendance-bar {
  background: rgba(200,240,0,0.05);
  border: 1px solid rgba(200,240,0,0.18);
  border-left: 4px solid var(--rp-lime);
  max-width: 1100px; margin: 0 auto 20px; padding: 14px 24px;
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px;
}
.rp-att-label {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
  font-size: 12px; letter-spacing: 1.5px; color: var(--rp-lime);
  text-transform: uppercase;
}
.rp-att-sub {
  font-size: 10px; color: var(--rp-gray2); letter-spacing: 0.5px;
  margin-top: 2px; font-style: italic;
}
.rp-att-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
.rp-att-btn {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 800;
  font-size: 11px; letter-spacing: 2px; padding: 9px 22px;
  text-decoration: none; text-transform: uppercase; cursor: pointer;
  border-radius: 0; display: inline-block; white-space: nowrap;
}
.rp-att-ok  { background: var(--rp-lime); color: var(--rp-black); }
.rp-att-ok:hover { background: var(--rp-lime2); }
.rp-att-mod { background: transparent; color: var(--rp-gray); border: 1px solid var(--rp-gray3); }
.rp-att-mod:hover { border-color: var(--rp-gray); color: var(--rp-white); }

.rp-week-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  max-width: 1100px; margin: 0 auto; padding: 0 24px;
}
.rp-day-card {
  background: var(--rp-black2);
  border: 1px solid var(--rp-black4);
  border-top: 3px solid var(--rp-gray3);
  border-radius: 0; overflow: hidden;
  transition: border-top-color 0.2s;
}
.rp-day-card:hover { border-top-color: var(--rp-lime2); }
.rp-saturday {
  grid-column: 1 / -1;
  border-top: 4px solid var(--rp-lime);
  background: linear-gradient(135deg, #0f0f0f 0%, #141a00 100%);
}
.rp-rest { border-top-color: var(--rp-gray3); opacity: 0.55; }

.rp-card-header {
  padding: 12px 16px 10px;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--rp-black4);
  gap: 8px; flex-wrap: wrap;
}
.rp-day-name {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
  font-size: 26px; letter-spacing: 1px; text-transform: uppercase;
  line-height: 1; color: var(--rp-white);
}
.rp-badge {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
  font-size: 10px; letter-spacing: 2px; padding: 3px 10px;
  text-transform: uppercase; border-radius: 0;
}
.rp-bq { background: transparent; color: var(--rp-blue);   border: 1px solid var(--rp-blue);   }
.rp-bh { background: transparent; color: var(--rp-orange); border: 1px solid var(--rp-orange); }
.rp-bf { background: var(--rp-lime); color: var(--rp-black); border: 1px solid var(--rp-lime); font-weight: 800; }
.rp-br { background: transparent; color: var(--rp-gray2);  border: 1px solid var(--rp-gray3);  }

.rp-card-body  { padding: 14px 16px; }
.rp-rest-body  { font-size: 13px; color: var(--rp-gray2); line-height: 1.6; }
.rp-rest-sub   { font-size: 11px; color: var(--rp-gray3); }

.rp-turnos {
  display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; align-items: center;
}
.rp-turno {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
  font-size: 11px; letter-spacing: 1px; padding: 3px 9px;
  background: var(--rp-black3); color: var(--rp-gray);
  border: 1px solid var(--rp-gray3); text-transform: uppercase;
}
.rp-turno-note { font-size: 10px; color: var(--rp-gray2); font-style: italic; }

.rp-meetpoint {
  font-size: 11px; font-weight: 500; color: var(--rp-lime);
  background: rgba(200,240,0,0.06);
  border-left: 3px solid var(--rp-lime);
  padding: 5px 10px; margin-bottom: 12px; letter-spacing: 0.3px;
}
.rp-meetpoint a {
  color: var(--rp-lime);
  text-decoration: underline dotted;
}
.rp-meetpoint.rp-pending {
  color: var(--rp-orange);
  background: rgba(255,140,0,0.06);
  border-left-color: var(--rp-orange);
}
.rp-meetpoint.rp-pending a { color: var(--rp-orange); }

.rp-sec {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
  font-size: 10px; letter-spacing: 3px; color: var(--rp-gray2);
  text-transform: uppercase; margin: 12px 0 5px;
  border-bottom: 1px solid var(--rp-black4); padding-bottom: 3px;
}
.rp-sec:first-of-type { margin-top: 0; }

.rp-obj {
  font-size: 13px; font-weight: 500; color: var(--rp-lime);
  margin-bottom: 10px; line-height: 1.4;
}

.rp-act { list-style: none; padding: 0; margin: 0; }
.rp-act li {
  font-size: 12px; color: #aaaaaa; padding: 4px 0 4px 16px;
  position: relative; line-height: 1.45;
  border-bottom: 1px solid #1a1a1a;
}
.rp-act li:last-child { border-bottom: none; }
.rp-act li::before {
  content: '▸'; position: absolute; left: 0;
  color: var(--rp-lime); font-size: 10px; top: 6px;
}

.rp-nrow { display: flex; align-items: flex-start; gap: 8px; font-size: 11px; }
.rp-nrow + .rp-nrow { margin-top: 5px; }
.rp-ndesc { color: #999999; line-height: 1.4; }
.rp-ntag {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
  font-size: 9px; letter-spacing: 1px; padding: 2px 7px;
  text-transform: uppercase; white-space: nowrap;
  align-self: flex-start; margin-top: 1px;
}
.rp-ini { background: rgba(51,153,255,0.15); color: var(--rp-blue);  border: 1px solid rgba(51,153,255,0.4); }
.rp-med { background: rgba(255,200,0,0.12);  color: #ffc800;          border: 1px solid rgba(255,200,0,0.4); }
.rp-avz { background: rgba(255,68,51,0.12);  color: var(--rp-red);   border: 1px solid rgba(255,68,51,0.4); }

.rp-dlabel {
  font-size: 10px; color: var(--rp-gray2); font-style: italic;
  margin-top: 10px; text-align: right;
  border-top: 1px solid var(--rp-black4); padding-top: 8px;
}
.rp-note {
  background: rgba(255,200,0,0.06);
  border-left: 3px solid #ffc800;
  padding: 8px 10px; font-size: 11px; color: #aaa;
  margin: 10px 0; line-height: 1.5;
}
.rp-note strong { color: #ffc800; }

.rp-site-footer {
  max-width: 1100px; margin: 40px auto 0; padding: 16px 24px;
  border-top: 1px solid var(--rp-black4);
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 8px;
}
.rp-site-footer span {
  font-size: 10px; color: var(--rp-gray2);
  letter-spacing: 1.5px; text-transform: uppercase;
}

@media (max-width: 700px) {
  .rp-site-header { flex-direction: column; gap: 16px; text-align: center; padding: 20px 16px 16px; }
  .rp-header-right { text-align: center; }
  .rp-logo-block { flex-direction: column; }
  .rp-logo-name { font-size: 28px; }
  .rp-logo-sub  { font-size: 11px; }
  .rp-logo-icon { width: 60px; height: 60px; }
  .rp-week-tag  { padding: 8px 16px; }
  .rp-week-grid { grid-template-columns: 1fr; padding: 0 12px; }
  .rp-saturday  { grid-column: 1; }
  .rp-turnos    { gap: 5px; }
  .rp-turno     { font-size: 10px; padding: 2px 7px; }
  .rp-ndesc     { font-size: 11px; }
  .rp-site-footer { flex-direction: column; gap: 6px; text-align: center; }
}
`
