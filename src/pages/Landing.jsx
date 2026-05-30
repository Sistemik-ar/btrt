import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { Mountain, Activity, Flag, ChevronDown, ArrowRight, Menu, X, Mail } from 'lucide-react'

const IG_URL  = 'https://www.instagram.com/bandurriastrailrunning/'
const HERO_IMG = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=80'

const PLANS = [
  { icon: Activity, name: 'Iniciación',    desc: 'Tu primer contacto con el trail running. Grupos guiados, sin presión, a tu ritmo.' },
  { icon: Mountain, name: 'Trail Running', desc: 'Mejorá técnica, resistencia y rendimiento en montaña con planificación semanal.', highlight: true },
  { icon: Flag,     name: 'Ultra Trail',   desc: 'Preparación específica para grandes desafíos y coaching a distancia personalizado.' },
]

const STATS = [['150+', 'Corredores'], ['4', 'Niveles'], ['7', 'Días'], ['365', 'Aventura']]

const FAQ = [
  { q: '¿Necesito experiencia para empezar?', a: 'No. Tenemos grupos por nivel (iniciación, intermedio, avanzado, ultra). Arrancás donde estés y progresás con el equipo.' },
  { q: '¿Dónde entrenan en Bariloche?', a: 'En distintos puntos de Bariloche y la cordillera: La Usina, Cerro Otto, Cerro López, Colonia Suiza y senderos de la Patagonia. El punto de encuentro se informa en cada sesión.' },
  { q: '¿Hacen coaching a distancia?', a: 'Sí. Si no estás en Bariloche o entrenás por tu cuenta, ofrecemos planificación a distancia y coaching personalizado de ultra trail para tu objetivo de carrera.' },
  { q: '¿Cómo es la cuota?', a: 'Es mensual e incluye planificación, salidas grupales y seguro de actividad. Subís el comprobante desde la app y queda registrado.' },
]

export default function Landing() {
  const { user } = useAuth()
  const [menu, setMenu] = useState(false)
  const [faq, setFaq]   = useState(null)
  const loginTo = user ? '/inicio' : '/login'

  return (
    <div className="min-h-dvh bg-[#05070b] text-white" style={{ scrollBehavior: 'smooth' }}>
      <LandingFonts />

      {/* ── Header glass fijo ── */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="backdrop-blur-xl bg-white/[0.05] border-b border-white/[0.08]">
          <div className="max-w-7xl mx-auto h-20 px-5 sm:px-6 flex items-center justify-between">
            <a href="#top" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Bandurrias Trail Running" className="w-9 h-9 rounded-lg object-cover"
                onError={e => { e.target.style.display = 'none' }} />
              <span className="font-black text-lg tracking-tight" style={F.cond}>BANDURRIAS</span>
            </a>

            <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-gray-300">
              <a href="#planes" className="hover:text-brand transition-colors">Planes</a>
              <a href="#faq" className="hover:text-brand transition-colors">FAQ</a>
              <a href={IG_URL} target="_blank" rel="noreferrer" className="hover:text-brand transition-colors">Instagram</a>
              <Link to={loginTo} className="bg-brand text-black px-5 py-2 rounded-xl font-bold hover:bg-[#d4ff33] transition-colors">
                {user ? 'Ir al panel' : 'Ingresar'}
              </Link>
            </nav>

            <button className="md:hidden text-white" onClick={() => setMenu(m => !m)} aria-label="Menú">
              {menu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menu && (
          <div className="md:hidden backdrop-blur-xl bg-black/80 border-b border-white/[0.08] px-5 py-4 flex flex-col gap-3 text-sm font-semibold">
            <a href="#planes" onClick={() => setMenu(false)} className="text-gray-300">Planes</a>
            <a href="#faq" onClick={() => setMenu(false)} className="text-gray-300">FAQ</a>
            <a href={IG_URL} target="_blank" rel="noreferrer" className="text-gray-300">Instagram</a>
            <Link to={loginTo} className="bg-brand text-black px-5 py-2.5 rounded-xl font-bold text-center">{user ? 'Ir al panel' : 'Ingresar'}</Link>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section id="top" className="relative flex items-center min-h-dvh">
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.82)), url('${HERO_IMG}')` }} />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 w-full">
          <div className="pt-32 md:pt-40 pb-16 max-w-4xl" style={fadeUp(0)}>
            <span className="inline-block mb-6 bg-brand/20 border border-brand/30 text-brand px-4 py-2 rounded-full text-sm font-semibold">
              Comunidad de Trail Running en Bariloche
            </span>
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black leading-[0.88] tracking-tight" style={F.cond}>
              CORRÉ<br /><span className="text-brand">LA MONTAÑA.</span>
            </h1>
            <p className="mt-8 text-lg md:text-2xl text-gray-300 max-w-2xl leading-relaxed">
              Entrenamientos grupales, planificación profesional y preparación para carreras y ultras en la Patagonia.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              <a href="#planes" className="bg-brand text-black font-bold px-8 py-4 rounded-2xl hover:scale-105 transition-transform text-center">
                Empezar a entrenar
              </a>
              <Link to={loginTo} className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.1] px-8 py-4 rounded-2xl font-semibold hover:bg-white/[0.1] transition-colors text-center inline-flex items-center justify-center gap-2">
                {user ? 'Ir al panel' : 'Ingresar'} <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 sm:py-20 bg-black">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {STATS.map(([n, l]) => (
            <div key={l} className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.08] rounded-3xl p-6 text-center">
              <div className="text-4xl font-black text-brand" style={F.cond}>{n}</div>
              <div className="text-gray-300 mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Planes ── */}
      <section id="planes" className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <h2 className="text-4xl md:text-6xl font-black text-center mb-14 tracking-tight" style={F.cond}>PARA CADA OBJETIVO</h2>
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {PLANS.map(p => (
              <div key={p.name}
                className={`group rounded-3xl p-8 transition-transform hover:-translate-y-2 ${
                  p.highlight
                    ? 'bg-brand/[0.08] border-2 border-brand/40'
                    : 'backdrop-blur-xl bg-white/[0.06] border border-white/[0.08]'
                }`}>
                <div className="w-12 h-12 rounded-2xl bg-brand/15 border border-brand/25 flex items-center justify-center mb-5">
                  <p.icon size={22} className="text-brand" />
                </div>
                <h3 className="text-3xl font-bold mb-3" style={F.cond}>{p.name}</h3>
                <p className="text-gray-400 leading-relaxed">{p.desc}</p>
                <Link to={loginTo} className="inline-flex items-center gap-1.5 mt-5 text-brand font-bold text-sm group-hover:gap-2.5 transition-all">
                  Sumate <ArrowRight size={15} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ (SEO content) ── */}
      <section id="faq" className="py-20 sm:py-24 bg-black">
        <div className="max-w-3xl mx-auto px-5 sm:px-6">
          <h2 className="text-4xl md:text-5xl font-black text-center mb-12 tracking-tight" style={F.cond}>PREGUNTAS FRECUENTES</h2>
          <div className="flex flex-col gap-3">
            {FAQ.map((it, i) => (
              <div key={i} className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
                <button onClick={() => setFaq(faq === i ? null : i)} className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 text-left">
                  <span className="font-semibold">{it.q}</span>
                  <ChevronDown size={18} className={`text-brand shrink-0 transition-transform ${faq === i ? 'rotate-180' : ''}`} />
                </button>
                {faq === i && <p className="px-5 sm:px-6 pb-5 text-gray-400 leading-relaxed">{it.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.08] rounded-[40px] p-10 md:p-16 text-center"
            style={{ backgroundImage: `linear-gradient(135deg, rgba(198,255,0,.05), rgba(255,255,255,.04))` }}>
            <h2 className="text-4xl md:text-7xl font-black tracking-tight leading-[0.95]" style={F.cond}>
              LA MONTAÑA TE<br /><span className="text-brand">ESTÁ ESPERANDO</span>
            </h2>
            <p className="mt-6 text-gray-300 text-lg md:text-xl max-w-xl mx-auto">
              Sumate a la comunidad de trail running de Bariloche y descubrí hasta dónde podés llegar.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={loginTo} className="bg-brand text-black font-bold px-10 py-5 rounded-2xl hover:scale-105 transition-transform">
                Quiero entrenar
              </Link>
              <a href="mailto:bandurriastrailrunning@gmail.com"
                className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.1] font-semibold px-8 py-5 rounded-2xl hover:bg-white/[0.1] transition-colors inline-flex items-center justify-center gap-2">
                <Mail size={17} /> Escribinos
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10 text-center text-gray-500 text-sm">
        Bandurrias Trail Running · Bariloche · Patagonia Argentina ·{' '}
        <a href={IG_URL} target="_blank" rel="noreferrer" className="hover:text-brand transition-colors">@bandurriastrailrunning</a>
      </footer>
    </div>
  )
}

const F = { cond: { fontFamily: "'Barlow Condensed', sans-serif" } }
function fadeUp(delay) {
  return { animation: `landingFadeUp .8s ${delay}s ease both` }
}

function LandingFonts() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Barlow:wght@300;400;500;600&display=swap');
      @keyframes landingFadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
    `}</style>
  )
}
