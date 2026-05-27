import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { decodeHTML, titleCase, formatTime } from '../lib/format'
import RaceStats from '../components/RaceStats'

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
        parts.forEach(part => { q = q.ilike('nombre_norm', `%${part}%`) })
        const { data: rows, error } = await q
        data = error ? [] : (rows || [])
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
    <div className="flex flex-col pb-20 lg:pb-0">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Buscar corredor</h1>
        <p className="text-slate-500 text-sm mt-0.5">Resultados de Cronometraje Instantáneo</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-5">
        <input
          type="text"
          placeholder="Nombre o apellido..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          autoFocus
          className="flex-1 bg-white/5 text-white rounded-xl px-4 py-3 text-sm border border-white/10 placeholder-slate-600 focus:outline-none focus:border-[#AADD00]/40 focus:bg-white/8 transition-all"
        />
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="bg-[#AADD00] text-black rounded-xl px-5 py-3 text-sm font-bold active:scale-95 transition-all disabled:opacity-30 min-w-[72px]"
        >
          {loading ? <Spinner /> : 'Buscar'}
        </button>
      </div>

      {/* Results */}
      {results !== null && !showStats && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 text-xs">
              {results.length === 0
                ? 'Sin resultados'
                : `${results.length} resultado${results.length !== 1 ? 's' : ''}`}
              {results.length > 0 && ' — marcá los que son esta persona'}
            </p>
            {results.length > 0 && (
              <div className="flex gap-3 text-xs">
                <button onClick={() => setSelected(new Set(results.map(r => r.id)))} className="text-[#AADD00] font-semibold">todos</button>
                <button onClick={() => setSelected(new Set())} className="text-slate-600 hover:text-slate-400 transition-colors">ninguno</button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {results.map(r => (
              <ResultCard
                key={r.id}
                result={r}
                selected={selected.has(r.id)}
                onToggle={() => toggleSelect(r.id)}
              />
            ))}
          </div>

          {selected.size > 0 && (
            <div className="sticky bottom-4 mt-6">
              <button
                onClick={() => setShowStats(true)}
                className="w-full bg-[#AADD00] text-black rounded-2xl py-4 font-bold text-sm active:scale-[0.98] transition-all shadow-lg shadow-[#AADD00]/20"
              >
                Ver estadísticas · {selected.size} carrera{selected.size !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </>
      )}

      {/* Stats */}
      {showStats && selectedResults.length > 0 && (
        <>
          <button
            onClick={() => setShowStats(false)}
            className="flex items-center gap-2 text-slate-400 text-sm mb-5 hover:text-white transition-colors"
          >
            ← Volver a resultados
          </button>
          <RaceStats results={selectedResults} />
        </>
      )}
    </div>
  )
}

function ResultCard({ result, selected, onToggle }) {
  const evento = result.eventos
  const fecha = evento?.fecha
    ? new Date(evento.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null
  const eventoNombre = decodeHTML(evento?.nombre)
  const carrera = decodeHTML(result.carrera)
  const corredor = titleCase(result.nombre)
  const tiempo = formatTime(result.tiempo_total)

  return (
    <button
      onClick={onToggle}
      className={`rounded-2xl p-4 flex items-center gap-3 text-left w-full border transition-all active:scale-[0.98] ${
        selected
          ? 'bg-[#AADD00]/[0.07] border-[#AADD00]/30'
          : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'
      }`}
    >
      {/* Checkbox */}
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
        selected ? 'bg-[#AADD00] border-[#AADD00]' : 'border-slate-600'
      }`}>
        {selected && <span className="text-black text-[10px] font-bold leading-none">✓</span>}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm leading-tight">{corredor}</p>
        <p className="text-slate-300 text-sm mt-0.5 truncate">{eventoNombre}</p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {fecha && <span className="text-slate-500 text-xs">{fecha}</span>}
          {evento?.localidad && <span className="text-slate-600 text-xs">· {evento.localidad}</span>}
          {carrera && <span className="text-[#AADD00]/50 text-xs font-medium">· {carrera}</span>}
        </div>
      </div>

      {/* Position + time */}
      <div className="text-right shrink-0 ml-1">
        {result.pos_general && (
          <span className="inline-block bg-white/5 text-slate-300 text-xs font-bold px-2 py-0.5 rounded-lg">
            #{result.pos_general}
          </span>
        )}
        {tiempo && <p className="text-slate-400 text-xs mt-1 tabular-nums">{tiempo}</p>}
      </div>
    </button>
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
