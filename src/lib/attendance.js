import { supabase } from './supabase'

const USE_MOCK = import.meta.env.DEV
const LS_KEY   = (weekId) => `btrt-attendance-${weekId}`

/** Build the stable turno key used as identity in the DB. */
export function turnoKey(day, text) {
  return `${day}::${text}`
}

/* ── localStorage (dev / offline) ───────────────────────────────────────── */

function loadLocalKeys(weekId) {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY(weekId)) ?? '[]')) }
  catch { return new Set() }
}
function saveLocalKeys(weekId, set) {
  localStorage.setItem(LS_KEY(weekId), JSON.stringify([...set]))
}

/* ── Public API ─────────────────────────────────────────────────────────── */

/**
 * Returns the set of turnoKey strings the given user has confirmed for the week.
 * Dev → localStorage, prod → Supabase week_attendance.
 */
export async function loadMyAttendance(weekId, userId) {
  if (USE_MOCK || !userId) return loadLocalKeys(weekId)

  const { data, error } = await supabase
    .from('week_attendance')
    .select('turno_key')
    .eq('week_id', weekId)
    .eq('user_id', userId)

  if (error) return new Set()
  return new Set((data ?? []).map(r => r.turno_key))
}

/**
 * Returns counts of confirmations per turnoKey for the whole team.
 * { turnoKey: count }
 */
export async function loadAttendanceCounts(weekId) {
  if (USE_MOCK) return {}

  const { data, error } = await supabase
    .from('week_attendance')
    .select('turno_key')
    .eq('week_id', weekId)

  if (error) return {}
  const counts = {}
  for (const r of data ?? []) counts[r.turno_key] = (counts[r.turno_key] ?? 0) + 1
  return counts
}

/**
 * Toggle one turno on/off for current user.
 * Returns updated set of confirmed keys.
 */
export async function toggleAttendance(weekId, userId, day, text, currentSet) {
  const key = turnoKey(day, text)
  const next = new Set(currentSet)
  const hadIt = next.has(key)
  hadIt ? next.delete(key) : next.add(key)

  if (USE_MOCK || !userId) {
    saveLocalKeys(weekId, next)
    return next
  }

  if (hadIt) {
    await supabase
      .from('week_attendance')
      .delete()
      .eq('week_id',  weekId)
      .eq('user_id',  userId)
      .eq('turno_key', key)
  } else {
    await supabase
      .from('week_attendance')
      .upsert(
        { week_id: weekId, user_id: userId, turno_key: key },
        { onConflict: 'week_id,user_id,turno_key' }
      )
  }
  return next
}
