/**
 * Plan ⇄ CSV (round-trippable).
 *
 * One row per activity. Nested fields use pipe `|` for list items and `~`
 * to split day~text inside a turno. Standard RFC4180 quoting handles commas,
 * quotes and newlines inside cells, so the file opens cleanly in Excel/Sheets.
 *
 * Use: export a week → tweak/keep → import into another week as a template.
 */

const rid = () => Math.random().toString(36).slice(2, 9)

const COLUMNS = [
  'days', 'badge_type', 'badge_label', 'day_label',
  'turnos', 'turno_note', 'turno_note_color',
  'meetpoint_text', 'meetpoint_url', 'meetpoint_pending',
  'objective', 'structure_label', 'activities',
  'note_strong', 'note_text',
  'nivel_ini', 'nivel_med', 'nivel_avz',
  'duration_label', 'rest', 'rest_title', 'rest_lines',
]

/* ── CSV primitives (RFC4180) ────────────────────────────────────────────── */
function csvCell(value) {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function csvRow(cells) {
  return cells.map(csvCell).join(',')
}

/** Parse a full CSV string into array of string[] rows. */
function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  const src = text.replace(/\r\n?/g, '\n')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else {
      field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(c => c.trim() !== ''))
}

/* ── Export ──────────────────────────────────────────────────────────────── */
export function planToCsv(plan) {
  const lines = [csvRow(COLUMNS)]

  for (const a of plan.activities ?? []) {
    const turnos = (a.turnos ?? []).map(t => `${t.day}~${t.text}`).join('|')
    const niv = (k) => (a.niveles ?? []).find(n => n.type === k)?.text ?? ''
    lines.push(csvRow([
      (a.days ?? []).join('|'),
      a.badge?.type ?? '',
      a.badge?.label ?? '',
      a.dayLabel ?? '',
      turnos,
      a.turnoNote ?? '',
      a.turnoNoteColor ?? '',
      a.meetpoint?.text ?? '',
      a.meetpoint?.url ?? '',
      a.meetpoint?.pending ? 'true' : '',
      a.objective ?? '',
      a.structureLabel ?? '',
      (a.activities ?? []).join('|'),
      a.note?.strong ?? '',
      a.note?.text ?? '',
      niv('ini'), niv('med'), niv('avz'),
      a.durationLabel ?? '',
      a.rest ? 'true' : '',
      a.restBody?.title ?? '',
      (a.restBody?.lines ?? []).join('|'),
    ]))
  }
  return lines.join('\n')
}

/* ── Import ──────────────────────────────────────────────────────────────── */
export function csvToActivities(csvText) {
  const rows = parseCsv(csvText)
  if (rows.length < 2) return []
  const header = rows[0].map(h => h.trim())
  const idx = Object.fromEntries(COLUMNS.map(c => [c, header.indexOf(c)]))

  const get = (row, key) => {
    const i = idx[key]
    return i >= 0 ? (row[i] ?? '') : ''
  }
  const splitList = (s) => s ? s.split('|').map(x => x.trim()).filter(Boolean) : []

  return rows.slice(1).map(row => {
    const isRest = get(row, 'rest') === 'true' || get(row, 'badge_type') === 'rest'
    const days   = splitList(get(row, 'days'))
    const turnos = splitList(get(row, 'turnos')).map(tok => {
      const sep = tok.indexOf('~')
      return sep >= 0
        ? { day: tok.slice(0, sep), text: tok.slice(sep + 1) }
        : { day: days[0] ?? 'lun', text: tok }
    })

    const base = {
      id: rid(),
      days: days.length ? days : ['lun'],
      badge: {
        type:  get(row, 'badge_type') || (isRest ? 'rest' : 'quality'),
        label: get(row, 'badge_label'),
      },
    }
    const dayLabel = get(row, 'day_label')
    if (dayLabel) base.dayLabel = dayLabel

    if (isRest) {
      return {
        ...base,
        rest: true,
        turnos: [],
        restBody: {
          title: get(row, 'rest_title'),
          lines: splitList(get(row, 'rest_lines')),
        },
      }
    }

    const noteText = get(row, 'note_text')
    return {
      ...base,
      turnos,
      turnoNote:      get(row, 'turno_note'),
      turnoNoteColor: get(row, 'turno_note_color') || null,
      meetpoint: {
        text:    get(row, 'meetpoint_text'),
        url:     get(row, 'meetpoint_url'),
        pending: get(row, 'meetpoint_pending') === 'true',
      },
      objective:      get(row, 'objective'),
      structureLabel: get(row, 'structure_label') || undefined,
      activities:     splitList(get(row, 'activities')),
      note: noteText ? { strong: get(row, 'note_strong') || 'Nota:', text: noteText } : null,
      niveles: [
        { type: 'ini', text: get(row, 'nivel_ini') },
        { type: 'med', text: get(row, 'nivel_med') },
        { type: 'avz', text: get(row, 'nivel_avz') },
      ],
      durationLabel: get(row, 'duration_label'),
    }
  })
}

/* ── Browser download helper ─────────────────────────────────────────────── */
export function downloadText(filename, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + text], { type: mime }) // BOM → Excel reads UTF-8
  const url  = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
