export function decodeHTML(str) {
  if (!str) return ''
  const el = document.createElement('textarea')
  el.innerHTML = str
  return el.value
}

export function titleCase(str) {
  if (!str) return ''
  return str
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function formatTime(t) {
  if (!t || t === '-') return null
  // strip milliseconds: 00:17:25.348 → 00:17:25
  return t.replace(/\.\d+$/, '')
}

export function parseTimeToMinutes(t) {
  if (!t || t === '-') return null
  const clean = t.replace(/\.\d+$/, '')
  const parts = clean.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60
  if (parts.length === 2) return parts[0] + parts[1] / 60
  return null
}

export function formatMinutesShort(m) {
  if (m == null) return '—'
  const h = Math.floor(m / 60)
  const min = Math.floor(m % 60)
  if (h > 0) return `${h}h ${min}m`
  return `${min} min`
}

// Extracts km distance from strings like "20Km - Caballeros", "21km - Masculino"
export function parseDistance(str) {
  if (!str) return null
  const m = str.match(/(\d+(?:[.,]\d+)?)\s*km/i)
  return m ? parseFloat(m[1].replace(',', '.')) : null
}

// Format pace as "m:ss /km"
export function formatPace(minsPerKm) {
  if (minsPerKm == null || !isFinite(minsPerKm)) return null
  const m = Math.floor(minsPerKm)
  const s = Math.round((minsPerKm - m) * 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
}

export function percentile(pos, total) {
  if (!pos || !total) return null
  const p = parseInt(pos)
  const t = parseInt(total)
  if (!p || !t || t === 0) return null
  return Math.round((p / t) * 100)
}
