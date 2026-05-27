import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { decodeHTML, titleCase, formatTime } from '../lib/format'
import RaceStats from '../components/RaceStats'
import { Search as SearchIcon, BarChart2, MapPin, Calendar, Check } from 'lucide-react'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [showStats, setShowStats] = useState(false)

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    setResults(null)
    setSelected(new Set())
    setShowStats(false)

    let data = []
    try {
      if (import.meta.env.DEV) {
        const res = await fetch(`http://localhost:3001/search?q=${encodeURIComponent(query)}`)
        data = await res.json()
      } else {
        const norm = query.toLowerCase()
          .normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
        const parts = norm.split(' ').filter(Boolean)
        let q = supabase
          .from('resultados')
          .select(`*, eventos(nombre, fecha, localidad, pais, deporte, participant_count)`)
          .order('id', { ascending: false })
          .limit(100)
        // scraper bug: runner name is in `dorsal` column, race category in `nombre`
        parts.forEach(part => { q = q.ilike('dorsal', `%${part}%`) })
        const { data: rows, error } = await q
        data = error ? [] : (rows || []).map(r => ({
          ...r,
          nombre: r.dorsal,
          carrera: r.nombre,
        }))
      }
    } catch {
      data = []
    }

    setResults(data)
    setLoading(false)
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setShowStats(false)
  }

  const selectedResults = results?.filter(r => selected.has(r.id)) || []

  return (
    <div className="flex flex-col gap-6 pb-20 lg:pb-0 max-w-4xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Buscar corredor</h1>
        <p className="text-slate-500 text-sm mt-1">Resultados de Cronometraje Instantáneo</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <div className="flex-1 flex items-center gap-3 bg-[#0C1020] border border-white/[0.12] rounded-2xl px-4 focus-within:border-[#C6FF00]/50 transition-all">
          <SearchIcon size={15} className="text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Rodrigo Florido"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            autoFocus
            className="flex-1 bg-transparent text-white py-4 text-sm placeholder-slate-600 focus:outline-none"
          />
        </div>
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="bg-[#C6FF00] text-black rounded-2xl px-6 py-4 text-sm font-black active:scale-95 transition-all disabled:opacity-40 min-w-[90px]"
        >
          {loading ? <Spinner /> : 'Buscar'}
        </button>
      </div>

      {/* Results */}
      {results !== null && !showStats && (
        <div className="flex flex-col gap-5">

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">
                {results.length === 0 ? 'Sin resultados' : `${results.length} resultado${results.length !== 1 ? 's' : ''}`}
              </p>
              {results.length > 0 && (
                <p className="text-slate-500 text-xs mt-0.5">Marcá los que corresponden a la misma persona</p>
              )}
            </div>
            {results.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(new Set(results.map(r => r.id)))}
                  className="px-4 py-2 rounded-xl bg-[#C6FF00]/15 text-[#C6FF00] text-xs font-bold border border-[#C6FF00]/30 hover:bg-[#C6FF00]/25 transition-all"
                >
                  Todos
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] text-slate-400 text-xs font-semibold border border-white/[0.08] hover:text-white hover:bg-white/10 transition-all"
                >
                  Ninguno
                </button>
              </div>
            )}
          </div>

          {/* Ver estadísticas CTA */}
          {selected.size > 0 && (
            <button
              onClick={() => setShowStats(true)}
              className="w-full bg-[#C6FF00] text-black rounded-2xl py-4 font-black text-sm active:scale-[0.98] transition-all shadow-lg shadow-[#C6FF00]/20 flex items-center justify-center gap-2"
            >
              <BarChart2 size={15} />
              Ver estadísticas · {selected.size} carrera{selected.size !== 1 ? 's' : ''}
            </button>
          )}

          {/* Cards */}
          <div className="flex flex-col gap-3">
            {results.map(r => (
              <ResultCard
                key={r.id}
                result={r}
                selected={selected.has(r.id)}
                onToggle={() => toggleSelect(r.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stats view */}
      {showStats && selectedResults.length > 0 && (
        <div className="flex flex-col gap-6">
          <button
            onClick={() => setShowStats(false)}
            className="flex items-center gap-2 text-slate-400 text-sm hover:text-white transition-colors w-fit"
          >
            ← Volver a resultados
          </button>
          <RaceStats results={selectedResults} />
        </div>
      )}
    </div>
  )
}

/* Sport color palette */
function sportStyle(deporte) {
  const d = (deporte ?? '').toLowerCase()
  if (d.includes('trail') || d.includes('mountain'))
    return { bg: 'bg-[#C6FF00]/15', text: 'text-[#C6FF00]', border: 'border-[#C6FF00]/20' }
  if (d.includes('ruta') || d.includes('road') || d.includes('maraton'))
    return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' }
  if (d.includes('ultra'))
    return { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/20' }
  return { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/20' }
}

function ResultCard({ result, selected, onToggle }) {
  const evento  = result.eventos
  const fecha   = evento?.fecha
    ? new Date(evento.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null
  const eventoNombre = decodeHTML(evento?.nombre)
  const carrera      = decodeHTML(result.carrera)
  const corredor     = titleCase(result.nombre)
  const tiempo       = formatTime(result.tiempo_total)
  const sport        = sportStyle(evento?.deporte)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle()}
      className={`rounded-2xl p-5 flex items-center gap-4 border transition-all cursor-pointer select-none shadow-sm shadow-black/30 ${
        selected
          ? 'bg-[#0D1A08] border-[#C6FF00]/35 shadow-[#C6FF00]/8'
          : 'bg-[#0A0E1C] border-white/[0.1] hover:border-white/[0.18] hover:bg-[#0E1228]'
      }`}
    >
      {/* Sport icon */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border pointer-events-none ${sport.bg} ${sport.border}`}>
        <RunIcon className={sport.text} />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0 pointer-events-none">
        <p className="text-white font-bold text-sm leading-snug truncate">{eventoNombre}</p>
        <p className="text-slate-400 text-xs mt-0.5 truncate">{corredor}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {fecha && (
            <span className="flex items-center gap-1 text-slate-500 text-xs">
              <Calendar size={10} /> {fecha}
            </span>
          )}
          {evento?.localidad && (
            <span className="flex items-center gap-1 text-slate-600 text-xs">
              <MapPin size={10} /> {evento.localidad}
            </span>
          )}
          {carrera && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sport.bg} ${sport.text} ${sport.border}`}>
              {carrera}
            </span>
          )}
        </div>
      </div>

      {/* Right: position + time + checkbox */}
      <div className="flex items-center gap-3 shrink-0 pointer-events-none">
        <div className="text-right">
          {result.pos_general && (
            <span className={`inline-block text-xs font-black px-2.5 py-1 rounded-lg ${
              selected ? 'bg-[#C6FF00]/20 text-[#C6FF00]' : 'bg-white/8 text-slate-300'
            }`}>
              #{result.pos_general}
            </span>
          )}
          {tiempo && (
            <p className="text-slate-500 text-xs mt-1 tabular-nums">{tiempo}</p>
          )}
        </div>

        {/* Checkbox */}
        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
          selected ? 'bg-[#C6FF00] border-[#C6FF00]' : 'border-slate-600 bg-transparent'
        }`}>
          {selected && <Check size={11} color="black" strokeWidth={3} />}
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 mx-auto" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function RunIcon({ className = '' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="13" cy="4" r="1"/><path d="M7 21l3-7-2-3 4-4 2 4h4"/><path d="M13 12l-2 5"/>
    </svg>
  )
}
