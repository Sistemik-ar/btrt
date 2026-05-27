import { useEffect, useState } from 'react'
import { loadDashboard } from '../lib/data'
import {
  StatCard, LineChart, DateRangePill, Section, Card,
  Donut, Leaderboard, ActivityRow,
} from '../components/ui'
import { Activity, MapPin, Users, Clock, ChevronDown } from 'lucide-react'

export default function Stats() {
  const [data, setData]     = useState(null)
  const [range, setRange]   = useState('7d')
  const [metric, setMetric] = useState('kilometros')

  useEffect(() => { loadDashboard().then(setData) }, [])

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-7 max-w-7xl">

      {/* Page header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-black text-white tracking-tight">Estadísticas de Carreras</h1>
          <p className="text-slate-500 text-sm mt-1">Resumen de actividad del equipo en el rango seleccionado.</p>
        </div>
        <DateRangePill selected={range} onChange={setRange} />
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          label="Actividades"
          value={data.stats.activities.value}
          delta={data.stats.activities.delta}
          subLabel={data.stats.activities.subLabel}
          spark={data.stats.activities.spark}
          icon={<Activity size={15} />}
          accent="#C6FF00"
        />
        <StatCard
          label="Kilómetros Totales"
          value={data.stats.kilometers.value}
          unit={data.stats.kilometers.unit}
          delta={data.stats.kilometers.delta}
          subLabel={data.stats.kilometers.subLabel}
          spark={data.stats.kilometers.spark}
          icon={<MapPin size={15} />}
          accent="#A855F7"
        />
        <StatCard
          label="Participantes"
          value={data.stats.participants.value}
          delta={data.stats.participants.delta}
          subLabel={data.stats.participants.subLabel}
          spark={data.stats.participants.spark}
          icon={<Users size={15} />}
          accent="#3B82F6"
        />
        <StatCard
          label="Tiempo Total"
          value={data.stats.hours.value}
          delta={data.stats.hours.delta}
          subLabel={data.stats.hours.subLabel}
          spark={data.stats.hours.spark}
          icon={<Clock size={15} />}
          accent="#FBBF24"
        />
      </div>

      {/* Line chart */}
      <Section
        title="Estadísticas de la Semana"
        subtitle="Evolución por día"
        action={
          <div className="relative">
            <select
              value={metric}
              onChange={e => setMetric(e.target.value)}
              className="appearance-none bg-card border border-white/8 text-slate-300 text-xs font-semibold rounded-lg pl-3 pr-8 py-2 hover:border-white/16 transition-all cursor-pointer focus:outline-none"
            >
              <option value="kilometros">Kilómetros</option>
              <option value="participantes">Participantes</option>
              <option value="tiempo">Tiempo (h)</option>
            </select>
            <ChevronDown size={13} className="text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        }
      >
        <Card className="p-4 sm:p-5">
          <LineChart
            data={data.weekly[metric]}
            unit={metric === 'tiempo' ? 'h' : metric === 'participantes' ? '' : 'km'}
          />
        </Card>
      </Section>

      {/* Distribución + Top Participantes */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        <Section title="Distribución por Tipo" subtitle="Carreras del equipo por disciplina">
          <Card className="p-6">
            <Donut data={data.distribution} total={data.recent.length * 5} label="Total" />
          </Card>
        </Section>

        <Section title="Top Participantes" subtitle="Corredores con más kilómetros">
          <Card className="p-5">
            <Leaderboard rows={data.leaderboard} unit="km" />
          </Card>
        </Section>
      </div>

      {/* Carreras Recientes */}
      <Section title="Carreras Recientes" subtitle="Últimas competencias y entrenamientos">
        <Card>
          {data.recent.map((a, i) => (
            <ActivityRow key={a.id} activity={a} first={i === 0} />
          ))}
        </Card>
      </Section>
    </div>
  )
}
