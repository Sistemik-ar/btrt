import { supabase } from './supabase'
import dashboardMock from '../mocks/dashboard.json'
import weeksMock     from '../mocks/weeks.json'

const USE_MOCK      = import.meta.env.DEV
const LS_DRAFT_KEY  = (weekId) => `btrt-week-draft-${weekId}`

function getCurrentWeekId() {
  const today  = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return monday.toISOString().split('T')[0]
}

/* ── Weeks ──────────────────────────────────────────────────────────────── */

/**
 * Load a week plan by id.
 *
 *   Dev  → localStorage draft → mock JSON
 *   Prod → Supabase `weeks.plan` JSONB column (admins also see drafts via RLS)
 */
export async function loadWeek(weekId) {
  if (USE_MOCK) {
    try {
      const raw = localStorage.getItem(LS_DRAFT_KEY(weekId))
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return weeksMock[weekId] ?? null
  }

  const { data, error } = await supabase
    .from('weeks')
    .select('id, published, plan, updated_at')
    .eq('id', weekId)
    .maybeSingle()

  if (error || !data?.plan) return null
  return {
    ...data.plan,
    id:        data.id,
    published: data.published,
    updatedAt: data.updated_at,
  }
}

/**
 * Save a week plan. Dev=localStorage draft, prod=Supabase upsert.
 * Returns { ok, persisted } describing where it landed.
 */
export async function saveWeek(weekId, plan) {
  if (USE_MOCK) {
    localStorage.setItem(LS_DRAFT_KEY(weekId), JSON.stringify(plan))
    return { ok: true, persisted: 'local' }
  }

  const { error } = await supabase
    .from('weeks')
    .upsert(
      { id: weekId, published: !!plan.published, plan },
      { onConflict: 'id' }
    )
  if (error) {
    if (/plan.+column|schema cache/i.test(error.message)) {
      throw new Error(
        'Falta aplicar la migración de Supabase. Pegá el SQL de ' +
        'supabase/migrations/APPLY_ALL.sql en Supabase Studio → SQL Editor.'
      )
    }
    throw error
  }
  return { ok: true, persisted: 'supabase' }
}

export async function deleteWeek(weekId) {
  if (USE_MOCK) {
    localStorage.removeItem(LS_DRAFT_KEY(weekId))
    return
  }
  const { error } = await supabase.from('weeks').delete().eq('id', weekId)
  if (error) throw error
}

/**
 * List week ids the Schedule auto-bump can jump to. Dev=local+mock, prod=published in Supabase.
 * Sync in dev (synchronous mock), async-only in prod — for now Schedule only uses this in dev.
 */
export function listMockWeekIds() {
  if (!USE_MOCK) return []
  const ids = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('btrt-week-draft-')) ids.push(key.replace('btrt-week-draft-', ''))
    }
  } catch { /* ignore */ }
  return [...new Set([...ids, ...Object.keys(weeksMock)])].sort()
}

/* ── Dashboard ──────────────────────────────────────────────────────────── */

export async function loadDashboard() {
  if (USE_MOCK) return dashboardMock

  const weekId = getCurrentWeekId()
  const [{ data: members }, { data: payments }, { data: week }, { data: results }] = await Promise.all([
    supabase.from('members').select('id, name, status'),
    supabase.from('payments').select('amount, status, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('weeks').select('id, published, plan').eq('id', weekId).maybeSingle(),
    supabase.from('resultados').select('id, dorsal, tiempo_total, eventos(nombre, fecha, deporte, localidad)').order('id', { ascending: false }).limit(8),
  ])

  const active        = (members ?? []).filter(m => m.status === 'active')
  const activityCount = week?.plan?.activities?.length ?? 0
  const recentRows    = (results ?? []).slice(0, 5).map(r => ({
    id:        r.id,
    title:     r.eventos?.nombre ?? 'Carrera',
    date:      r.eventos?.fecha,
    time:      null,
    distance:  null,
    elevation: null,
    sport:     r.eventos?.deporte ?? 'trail',
    status:    'completada',
  }))

  return {
    stats: {
      activities:   { ...dashboardMock.stats.activities,   value: activityCount  || dashboardMock.stats.activities.value   },
      kilometers:    dashboardMock.stats.kilometers,
      participants: { ...dashboardMock.stats.participants, value: active.length  || dashboardMock.stats.participants.value },
      hours:         dashboardMock.stats.hours,
    },
    recent:       recentRows.length ? recentRows : dashboardMock.recent,
    distribution: dashboardMock.distribution,
    weekly:       dashboardMock.weekly,
    leaderboard:  dashboardMock.leaderboard,
    dateRange:    dashboardMock.dateRange,
  }
}
