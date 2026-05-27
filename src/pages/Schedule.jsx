import { useEffect, useState } from 'react'
import { loadWeek, listMockWeekIds } from '../lib/data'
import RocoWeekPlan from '../components/RocoWeekPlan'
import { Card } from '../components/ui'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

function getWeekId(offsetWeeks = 0) {
  const today  = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offsetWeeks * 7)
  return monday.toISOString().split('T')[0]
}

function formatWeekRange(weekId) {
  const monday = new Date(weekId + 'T12:00:00')
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const opt = { day: 'numeric', month: 'long' }
  return (
    monday.toLocaleDateString('es-AR', opt) +
    ' — ' +
    sunday.toLocaleDateString('es-AR', { ...opt, year: 'numeric' })
  )
}

export default function Schedule() {
  // On Sunday default to next week so members can read/sign up for the upcoming program.
  const isSunday   = new Date().getDay() === 0
  const baseOffset = isSunday ? 1 : 0

  const [offset,  setOffset]  = useState(baseOffset)
  const [week,    setWeek]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [bumped,  setBumped]  = useState(false)

  const weekId = getWeekId(offset)

  // Auto-bump to first upcoming published week if current is empty (dev/mock UX).
  useEffect(() => {
    if (bumped) return
    ;(async () => {
      const current = await loadWeek(getWeekId(baseOffset))
      if (current) { setWeek(current); setLoading(false); setBumped(true); return }

      const upcoming = listMockWeekIds().find(id => id >= getWeekId(baseOffset))
      if (upcoming) {
        const diffDays = Math.round((new Date(upcoming) - new Date(getWeekId(0))) / 86400000)
        setOffset(Math.round(diffDays / 7))
      }
      setBumped(true)
    })()
  }, [bumped, baseOffset])

  useEffect(() => {
    if (!bumped) return
    ;(async () => {
      setLoading(true)
      setWeek(await loadWeek(weekId))
      setLoading(false)
    })()
  }, [weekId, bumped])

  return (
    <div className="flex flex-col gap-5 max-w-[1140px] mx-auto">

      {/* Slim week nav (above Roco header) */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOffset(o => o - 1)}
          className="w-9 h-9 rounded-lg bg-card border border-white/8 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/16 transition-all active:scale-90 shrink-0"
          title="Semana anterior"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex-1 text-center">
          <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">{formatWeekRange(weekId)}</p>
          {offset !== 0 && (
            <button
              onClick={() => setOffset(0)}
              className="text-brand text-[10px] font-bold uppercase tracking-widest hover:underline mt-0.5"
            >
              Volver a esta semana
            </button>
          )}
        </div>

        <button
          onClick={() => setOffset(o => o + 1)}
          className="w-9 h-9 rounded-lg bg-card border border-white/8 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/16 transition-all active:scale-90 shrink-0"
          title="Semana siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
        </div>
      ) : week ? (
        <RocoWeekPlan week={week} />
      ) : (
        <Card className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand/8 border border-brand/10 flex items-center justify-center">
            <Calendar size={24} className="text-brand/40" />
          </div>
          <div>
            <p className="text-white font-semibold">Sin planificación publicada</p>
            <p className="text-slate-500 text-sm mt-1">
              {offset === 0
                ? 'Roco publicará el programa el domingo.'
                : 'No hay programa publicado para esta semana.'}
            </p>
          </div>
          {offset !== 0 && (
            <button onClick={() => setOffset(0)} className="text-brand text-xs font-semibold hover:underline">
              Ver semana actual →
            </button>
          )}
        </Card>
      )}
    </div>
  )
}
