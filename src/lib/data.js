import { supabase } from './supabase'
import dashboardMock from '../mocks/dashboard.json'
import weeksMock     from '../mocks/weeks.json'

const USE_MOCK = import.meta.env.DEV

function getCurrentWeekId() {
  const today  = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return monday.toISOString().split('T')[0]
}

/* ── Weeks ──────────────────────────────────────────────────────────────── */

/** Load a single published week by id. Dev=mock, prod=supabase. */
export async function loadWeek(weekId) {
  if (USE_MOCK) return weeksMock[weekId] ?? null

  const { data } = await supabase
    .from('weeks')
    .select('*, sessions(*)')
    .eq('id', weekId)
    .eq('published', true)
    .maybeSingle()
  return data
}

/** All weekIds available in mock (dev only). Used to auto-jump to an upcoming published week. */
export function listMockWeekIds() {
  return USE_MOCK ? Object.keys(weeksMock).sort() : []
}

/**
 * Dashboard data loader.
 * Dev → local mock (src/mocks/dashboard.json).
 * Prod → Supabase. Widgets without a wired data source fall back to mock shape so the UI still renders.
 */
export async function loadDashboard() {
  if (USE_MOCK) return dashboardMock

  const weekId = getCurrentWeekId()
  const [{ data: members }, { data: payments }, { data: week }, { data: results }] = await Promise.all([
    supabase.from('members').select('id, name, status'),
    supabase.from('payments').select('amount, status, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('weeks').select('*, sessions(*)').eq('id', weekId).eq('published', true).maybeSingle(),
    supabase.from('resultados').select('id, dorsal, tiempo_total, eventos(nombre, fecha, deporte, localidad)').order('id', { ascending: false }).limit(8),
  ])

  const active     = (members ?? []).filter(m => m.status === 'active')
  const sessions   = week?.sessions ?? []
  const recentRows = (results ?? []).slice(0, 5).map(r => ({
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
      activities:   { ...dashboardMock.stats.activities,   value: sessions.length      || dashboardMock.stats.activities.value   },
      kilometers:    dashboardMock.stats.kilometers,
      participants: { ...dashboardMock.stats.participants, value: active.length        || dashboardMock.stats.participants.value },
      hours:         dashboardMock.stats.hours,
    },
    recent:       recentRows.length ? recentRows : dashboardMock.recent,
    distribution: dashboardMock.distribution,
    weekly:       dashboardMock.weekly,
    leaderboard:  dashboardMock.leaderboard,
    dateRange:    dashboardMock.dateRange,
  }
}
