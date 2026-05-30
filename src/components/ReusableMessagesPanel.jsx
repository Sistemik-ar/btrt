import { useMemo, useState } from 'react'
import {
  CATEGORIES, listMessages, toggleFavorite,
  addCustomMessage, removeCustomMessage,
} from '../lib/reusableMessages'
import { Search, Star, Plus, Trash2, MessageSquarePlus, X } from 'lucide-react'

/**
 * Panel lateral de mensajes preguardados.
 *
 * Props:
 *   onInsert(text)  → inserta el cuerpo del mensaje en el campo activo del editor
 */
export default function ReusableMessagesPanel({ onInsert }) {
  const [query, setQuery]   = useState('')
  const [cat, setCat]       = useState('all')
  const [tick, setTick]     = useState(0)   // fuerza re-list tras fav/add/remove
  const [adding, setAdding] = useState(false)

  const messages = useMemo(() => listMessages(), [tick])

  const filtered = messages.filter(m => {
    if (cat === 'fav' && !m.isFavorite) return false
    if (cat !== 'all' && cat !== 'fav' && m.category !== cat) return false
    if (query.trim()) {
      const q = query.toLowerCase()
      return m.title.toLowerCase().includes(q) || m.body.toLowerCase().includes(q)
    }
    return true
  })

  // favoritos primero
  const sorted = [...filtered].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))

  const catMeta = Object.fromEntries(CATEGORIES.map(c => [c.key, c]))

  return (
    <aside className="flex flex-col gap-3 bg-card/70 border border-white/[0.06] rounded-2xl p-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <MessageSquarePlus size={15} className="text-brand" /> Mensajes
        </h3>
        <button
          onClick={() => setAdding(a => !a)}
          className="h-7 w-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-brand hover:bg-white/[0.08] transition-colors"
          title="Crear mensaje"
        >
          {adding ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>

      {adding && (
        <NewMessageForm
          onDone={() => { setAdding(false); setTick(t => t + 1) }}
        />
      )}

      {/* Search */}
      <div className="flex items-center gap-2 h-9 rounded-lg bg-black/20 border border-white/[0.06] px-2.5">
        <Search size={14} className="text-slate-500 shrink-0" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar mensaje…"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none"
        />
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        <CatChip active={cat === 'all'} onClick={() => setCat('all')}>Todos</CatChip>
        <CatChip active={cat === 'fav'} onClick={() => setCat('fav')}>★</CatChip>
        {CATEGORIES.map(c => (
          <CatChip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)}>
            {c.icon} {c.label}
          </CatChip>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2 overflow-y-auto -mr-1 pr-1 [scrollbar-width:thin]">
        {sorted.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-6">Sin mensajes en esta categoría.</p>
        )}
        {sorted.map(m => (
          <div
            key={m.id}
            className="group rounded-xl bg-white/[0.02] border border-white/[0.05] p-3 hover:border-brand/30 hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="text-sm shrink-0">{catMeta[m.category]?.icon ?? '💬'}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white leading-snug">{m.title}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 line-clamp-3">{m.body}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2.5">
              <button
                onClick={() => onInsert?.(m.body)}
                className="flex-1 h-7 rounded-lg bg-brand/10 text-brand text-[11px] font-bold hover:bg-brand/20 transition-colors"
              >
                Insertar
              </button>
              <button
                onClick={() => { toggleFavorite(m.id); setTick(t => t + 1) }}
                className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                  m.isFavorite ? 'text-brand' : 'text-slate-600 hover:text-slate-300'
                }`}
                title={m.isFavorite ? 'Quitar de favoritos' : 'Marcar favorito'}
              >
                <Star size={13} fill={m.isFavorite ? 'currentColor' : 'none'} />
              </button>
              {m.custom && (
                <button
                  onClick={() => { removeCustomMessage(m.id); setTick(t => t + 1) }}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

function CatChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-colors ${
        active ? 'bg-brand text-black' : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
      }`}
    >
      {children}
    </button>
  )
}

function NewMessageForm({ onDone }) {
  const [title, setTitle] = useState('')
  const [body, setBody]   = useState('')
  const [category, setCategory] = useState('general')

  function save() {
    if (!title.trim() || !body.trim()) return
    addCustomMessage({ title: title.trim(), body: body.trim(), category })
    onDone()
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-black/20 border border-white/[0.06] p-3">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Título"
        className="h-8 rounded-lg bg-black/30 border border-white/[0.06] px-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand/50"
      />
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Texto del mensaje…"
        rows={3}
        className="rounded-lg bg-black/30 border border-white/[0.06] px-2.5 py-2 text-xs text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-brand/50"
      />
      <div className="flex items-center gap-2">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="h-8 flex-1 rounded-lg bg-black/30 border border-white/[0.06] px-2 text-xs text-white focus:outline-none"
        >
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <button
          onClick={save}
          className="h-8 px-3 rounded-lg bg-brand text-black text-xs font-bold hover:bg-[#d4ff33] transition-colors"
        >
          Guardar
        </button>
      </div>
    </div>
  )
}
