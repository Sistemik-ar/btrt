import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const { signInWithGoogle, devLogin } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [mode,     setMode]     = useState('google') // 'google' | 'email'

  async function handleEmailLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-dvh bg-[#050816] flex flex-col items-center justify-center px-6 gap-6">

      {/* Logo */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <img
            src="/logo.png"
            alt="BTRT"
            className="w-24 h-24 rounded-3xl object-cover shadow-2xl shadow-brand/10"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
          <div className="w-24 h-24 rounded-3xl bg-brand/15 items-center justify-center text-brand font-black text-3xl border border-brand/20"
            style={{ display: 'none' }}>
            B
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black text-white tracking-tight">BTRT</h1>
          <p className="text-brand/80 text-xs font-semibold uppercase tracking-[0.2em] mt-1">
            Bandurrias Trail Running Team
          </p>
          <p className="text-slate-600 text-xs mt-1">Bariloche, Patagonia</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-xs bg-card border border-white/[0.1] rounded-3xl p-6 flex flex-col gap-4 shadow-2xl shadow-black/60">

        {/* Mode toggle */}
        <div className="flex bg-[#060810] rounded-xl p-1 gap-1">
          <button onClick={() => setMode('google')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'google' ? 'bg-white/[0.04] text-white shadow' : 'text-slate-500 hover:text-slate-300'
            }`}>
            Google
          </button>
          <button onClick={() => setMode('email')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'email' ? 'bg-white/[0.04] text-white shadow' : 'text-slate-500 hover:text-slate-300'
            }`}>
            Email
          </button>
        </div>

        {mode === 'google' ? (
          <>
            <p className="text-slate-400 text-sm text-center leading-relaxed">
              Ingresá con tu cuenta de Google.
            </p>
            <button
              onClick={signInWithGoogle}
              className="flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3.5 px-6 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all text-sm shadow-lg"
            >
              <GoogleIcon />
              Entrar con Google
            </button>
          </>
        ) : (
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
            <div>
              <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="roco@gmail.com"
                required
                className="w-full bg-[#060810] text-white rounded-xl px-3 py-2.5 text-sm border border-white/5 placeholder-slate-600 focus:outline-none focus:border-brand/40"
              />
            </div>
            <div>
              <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#060810] text-white rounded-xl px-3 py-2.5 text-sm border border-white/5 placeholder-slate-600 focus:outline-none focus:border-brand/40"
              />
            </div>
            {error && (
              <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {error === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : error}
              </p>
            )}
            <button type="submit" disabled={loading}
              className="bg-brand text-black font-bold py-3 rounded-2xl text-sm active:scale-95 transition-all disabled:opacity-50 hover:bg-[#c4f01a]">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        )}

        <p className="text-slate-700 text-[11px] text-center leading-relaxed">
          Solo miembros del club. Si tenés problemas, contactá a Roco.
        </p>
      </div>

      {import.meta.env.DEV && (
        <button
          onClick={devLogin}
          className="text-slate-700 text-xs hover:text-brand/60 transition-colors border border-white/5 px-4 py-2 rounded-xl"
        >
          [dev] entrar sin login
        </button>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
    </svg>
  )
}
