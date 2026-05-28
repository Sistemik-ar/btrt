import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

/**
 * Set / reset password page.
 *
 * Same page handles two flows:
 *   · First-time setup — a user invited via magic link wants to create a password
 *     for future logins. They must be signed in.
 *   · Recovery — user clicked the reset-password email link; Supabase fired
 *     PASSWORD_RECOVERY and routed them here (?recovery=1).
 *
 * In both cases the active mechanism is the same: supabase.auth.updateUser.
 */
export default function ResetPassword() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params]  = useSearchParams()
  const isRecovery = params.get('recovery') === '1'

  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [show,            setShow]            = useState(false)
  const [busy,            setBusy]            = useState(false)
  const [error,           setError]           = useState(null)
  const [success,         setSuccess]         = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña tiene que tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setBusy(false)
      setError(error.message)
      return
    }
    // Mark password as set so the dashboard banner disappears (per-user, DB-backed).
    if (user?.id) {
      await supabase.from('members').update({ password_set: true }).eq('id', user.id)
    }
    setBusy(false)
    setSuccess(true)
    setTimeout(() => navigate('/'), 1500)
  }

  if (!user) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6 bg-surface">
        <div className="bg-card border border-white/8 rounded-3xl p-6 max-w-sm w-full text-center flex flex-col gap-3">
          <p className="text-white font-bold">Necesitás estar logueado para crear una contraseña.</p>
          <p className="text-slate-500 text-sm">Si llegaste acá desde un email, esperá unos segundos y refrescá la página. Si el problema sigue, pedile a Roco que te reenvíe el link.</p>
          <Link to="/" className="text-brand text-sm font-semibold hover:underline">Volver al inicio</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-6 py-12 bg-surface">
      <div className="w-full max-w-sm bg-card border border-white/8 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl shadow-black/60">

        <div>
          <p className="text-brand text-[10px] font-bold uppercase tracking-[0.2em]">Bandurrias TRT</p>
          <h1 className="text-2xl font-black text-white tracking-tight mt-2">
            {isRecovery ? 'Nueva contraseña' : 'Creá tu contraseña'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRecovery
              ? 'Elegí una nueva contraseña para tu cuenta.'
              : 'Para entrar la próxima vez con email + contraseña en vez de magic link.'}
          </p>
          <p className="text-slate-600 text-xs mt-2 truncate">Cuenta: {user.email}</p>
        </div>

        {success ? (
          <div className="bg-brand/10 border border-brand/30 rounded-xl px-4 py-3 text-sm text-brand font-semibold text-center">
            ✓ Contraseña guardada. Redirigiendo...
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div>
              <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Contraseña nueva</label>
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                required
                minLength={8}
                className="w-full bg-[#060810] text-white rounded-xl px-3 py-2.5 text-sm border border-white/8 placeholder-slate-600 focus:outline-none focus:border-brand/40"
              />
            </div>
            <div>
              <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Repetir contraseña</label>
              <input
                type={show ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full bg-[#060810] text-white rounded-xl px-3 py-2.5 text-sm border border-white/8 placeholder-slate-600 focus:outline-none focus:border-brand/40"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-400 select-none cursor-pointer">
              <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} className="accent-brand" />
              Ver contraseña
            </label>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="bg-brand text-black font-bold py-3 rounded-2xl text-sm active:scale-95 transition-all disabled:opacity-50 hover:bg-[#d4ff33]"
            >
              {busy ? 'Guardando...' : 'Guardar contraseña'}
            </button>

            <Link to="/" className="text-slate-500 text-xs text-center hover:text-slate-300 transition-colors">
              Volver al inicio
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
