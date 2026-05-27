import { useAuth } from '../lib/AuthContext'

export default function Login() {
  const { signInWithGoogle, devLogin } = useAuth()

  return (
    <div className="min-h-dvh bg-[#080810] flex flex-col items-center justify-center px-6 gap-6">

      {/* Logo + brand */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <img
            src="/logo.png"
            alt="BTRT"
            className="w-24 h-24 rounded-3xl object-cover shadow-2xl shadow-[#AADD00]/10"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
          <div className="w-24 h-24 rounded-3xl bg-[#AADD00]/15 items-center justify-center text-[#AADD00] font-black text-3xl border border-[#AADD00]/20"
            style={{ display: 'none' }}>
            B
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black text-white tracking-tight">BTRT</h1>
          <p className="text-[#AADD00]/80 text-xs font-semibold uppercase tracking-[0.2em] mt-1">
            Bandurrias Trail Running Team
          </p>
          <p className="text-slate-600 text-xs mt-1">Bariloche, Patagonia</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-xs bg-[#13131F] border border-white/[0.07] rounded-3xl p-6 flex flex-col gap-4 shadow-2xl">
        <p className="text-slate-400 text-sm text-center leading-relaxed">
          Ingresá con tu cuenta de Google para ver la planificación y confirmar asistencia.
        </p>

        <button
          onClick={signInWithGoogle}
          className="flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3.5 px-6 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all text-sm shadow-lg"
        >
          <GoogleIcon />
          Entrar con Google
        </button>

        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-slate-700 text-xs">Bariloche, Argentina</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        <p className="text-slate-700 text-[11px] text-center leading-relaxed">
          Solo miembros del club. Si tenés problemas para ingresar, contactá a Roco.
        </p>
      </div>

      {import.meta.env.DEV && (
        <button
          onClick={devLogin}
          className="text-slate-700 text-xs hover:text-[#AADD00]/60 transition-colors border border-white/5 px-4 py-2 rounded-xl"
        >
          [dev] entrar sin Google
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
