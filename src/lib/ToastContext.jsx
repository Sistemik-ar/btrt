import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

/**
 * Toast no intrusivo. `toast({ title, body, kind, duration })`.
 * kind: 'info' | 'success' | 'error' | 'payment' | 'plan'
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), [])

  const toast = useCallback((opts) => {
    const id = Math.random().toString(36).slice(2)
    const t = { id, kind: 'info', duration: 4500, ...opts }
    setToasts(prev => [...prev, t])
    if (t.duration > 0) setTimeout(() => remove(id), t.duration)
    return id
  }, [remove])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed z-[200] bottom-4 right-4 left-4 sm:left-auto sm:w-80 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => <Toast key={t.id} t={t} onClose={() => remove(t.id)} />)}
      </div>
    </ToastContext.Provider>
  )
}

const KIND = {
  info:    { icon: '🔔', ring: 'border-white/15' },
  success: { icon: '✅', ring: 'border-emerald-500/30' },
  error:   { icon: '⚠️', ring: 'border-red-500/30' },
  payment: { icon: '💳', ring: 'border-brand/30' },
  plan:    { icon: '🏔', ring: 'border-brand/30' },
}

function Toast({ t, onClose }) {
  const k = KIND[t.kind] ?? KIND.info
  return (
    <div className={`pointer-events-auto bg-card border ${k.ring} rounded-xl shadow-2xl shadow-black/50 p-3.5 flex items-start gap-3 animate-[toastIn_.25s_ease]`}>
      <span className="text-lg shrink-0">{k.icon}</span>
      <div className="min-w-0 flex-1">
        {t.title && <p className="text-white text-sm font-semibold leading-snug">{t.title}</p>}
        {t.body && <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{t.body}</p>}
      </div>
      <button onClick={onClose} className="text-slate-500 hover:text-white text-sm shrink-0">✕</button>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}

export const useToast = () => useContext(ToastContext)
