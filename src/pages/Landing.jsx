import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import {
  Mountain, ArrowRight, MapPin, Users, CalendarDays,
  Activity, ChevronDown, Menu, X, Mail,
} from 'lucide-react'

const IG_URL = 'https://www.instagram.com/bandurriastrailrunning/'

function Instagram({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
    </svg>
  )
}

const PLANS = [
  {
    name: 'Presencial',
    tag: 'El equipo',
    price: 'Cuota mensual',
    desc: 'Entrenás con el grupo en Bariloche. Planificación semanal, salidas de fondo y comunidad.',
    features: ['Planificación semanal', 'Salidas de fondo en montaña', 'Grupos por nivel', 'Seguro de actividad'],
    highlight: true,
  },
  {
    name: 'Híbrido',
    tag: 'A tu ritmo',
    price: 'Cuota mensual',
    desc: 'Para los que pagan la cuota pero entrenan por su cuenta o están de viaje. Mismo plan, sin presencialidad.',
    features: ['Planificación adaptada', 'Acceso a la app', 'Seguimiento remoto', 'Flexibilidad total'],
    highlight: false,
  },
  {
    name: 'A distancia',
    tag: 'Coaching 1:1',
    price: 'Consultar',
    desc: 'Coaching personalizado de ultra trail para objetivos específicos. Plan individual por atleta.',
    features: ['Plan 100% personalizado', 'Objetivo de carrera', 'Análisis individual', 'Contacto directo con el coach'],
    highlight: false,
  },
]

const TRAININGS = [
  { icon: Activity,     title: 'Técnica + Aeróbico', desc: 'Base de carrera, cadencia y volumen progresivo en terreno natural.' },
  { icon: Mountain,     title: 'Cuesta · Fuerza',    desc: 'Trabajo específico de subida y bajada técnica para piernas de montaña.' },
  { icon: CalendarDays, title: 'Fondo de Montaña',   desc: 'Salidas largas de sábado con desnivel real. El corazón del equipo.' },
]

const FAQ = [
  { q: '¿Necesito experiencia previa?', a: 'No. Tenemos grupos por nivel (inicial, intermedio, avanzado). Arrancás donde estés y vas progresando.' },
  { q: '¿Dónde entrenan?', a: 'En Bariloche y alrededores: La Usina, Cerro Otto, Cerro López, Colonia Suiza y más. El punto de encuentro se informa en cada sesión.' },
  { q: '¿Cómo es la cuota?', a: 'Es mensual. Subís el comprobante desde la app y queda registrado. Incluye planificación, salidas y seguro de actividad.' },
  { q: '¿Puedo entrenar si viajo o no estoy en Bariloche?', a: 'Sí, con el plan Híbrido. Pagás la cuota y seguís la planificación adaptada desde la app, sin necesidad de estar presencial.' },
  { q: '¿Hacen coaching para una carrera específica?', a: 'Sí, con el plan A Distancia. Coaching personalizado de ultra trail con plan individual según tu objetivo.' },
]

export default function Landing() {
  const { user } = useAuth()
  const [menu, setMenu] = useState(false)
  const [faqOpen, setFaqOpen] = useState(null)

  const loginCta = user
    ? { to: '/inicio', label: 'Ir al panel' }
    : { to: '/login',  label: 'Miembros' }

  return (
    <div className="min-h-dvh bg-[#0a0a0a] text-white font-[Barlow,sans-serif]">
      <LandingFonts />

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Bandurrias" className="w-9 h-9 rounded-lg object-cover"
              onError={e => { e.target.style.display = 'none' }} />
            <span className="font-[Barlow_Condensed] font-black text-lg tracking-wide uppercase">Bandurrias</span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-300">
            <a href="#planes" className="hover:text-brand transition-colors">Planes</a>
            <a href="#entrenamientos" className="hover:text-brand transition-colors">Entrenamientos</a>
            <a href="#faq" className="hover:text-brand transition-colors">FAQ</a>
            <a href="#contacto" className="hover:text-brand transition-colors">Contacto</a>
            <Link to={loginCta.to} className="bg-brand text-black font-bold px-4 py-2 rounded-lg hover:bg-[#d4ff33] transition-colors">
              {loginCta.label}
            </Link>
          </nav>

          <button className="md:hidden text-white" onClick={() => setMenu(m => !m)}>
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menu && (
          <nav className="md:hidden border-t border-white/[0.06] px-5 py-4 flex flex-col gap-3 text-sm font-semibold">
            <a href="#planes" onClick={() => setMenu(false)} className="text-slate-300">Planes</a>
            <a href="#entrenamientos" onClick={() => setMenu(false)} className="text-slate-300">Entrenamientos</a>
            <a href="#faq" onClick={() => setMenu(false)} className="text-slate-300">FAQ</a>
            <a href="#contacto" onClick={() => setMenu(false)} className="text-slate-300">Contacto</a>
            <Link to={loginCta.to} className="bg-brand text-black font-bold px-4 py-2.5 rounded-lg text-center">{loginCta.label}</Link>
          </nav>
        )}
      </header>

      {/* ── Hero ── */}
      <section id="top" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#141a00] via-[#0a0a0a] to-[#0a0a0a]" />
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, #c8f000 0%, transparent 45%)' }} />
        <div className="relative max-w-6xl mx-auto px-5 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/25 rounded-full px-3 py-1.5 mb-7">
            <MapPin size={13} className="text-brand" />
            <span className="text-brand text-[11px] font-bold uppercase tracking-[0.15em]">Bariloche · Patagonia</span>
          </div>

          <h1 className="font-[Barlow_Condensed] font-black uppercase leading-[0.9] tracking-tight text-5xl sm:text-7xl lg:text-8xl">
            Corré la<br /><span className="text-brand">montaña</span>
          </h1>
          <p className="mt-6 text-slate-300 text-lg sm:text-xl max-w-xl leading-relaxed">
            Equipo de trail running de Bariloche. Planificación profesional, salidas de fondo
            y una comunidad que te empuja a llegar más lejos.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <Link to={user ? '/inicio' : '/login'}
              className="inline-flex items-center justify-center gap-2 bg-brand text-black font-bold text-sm px-6 py-3.5 rounded-xl hover:bg-[#d4ff33] active:scale-95 transition-all">
              {user ? 'Ir al panel' : 'Unirme al equipo'} <ArrowRight size={16} />
            </Link>
            <a href="#planes"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.1] text-white font-bold text-sm px-6 py-3.5 rounded-xl hover:bg-white/[0.08] transition-colors">
              Ver planes
            </a>
          </div>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-3 gap-4 max-w-lg">
            {[['40+', 'Corredores'], ['3', 'Niveles'], ['52', 'Semanas/año']].map(([n, l]) => (
              <div key={l}>
                <p className="font-[Barlow_Condensed] font-black text-4xl text-brand leading-none">{n}</p>
                <p className="text-slate-500 text-xs uppercase tracking-wider mt-1.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Entrenamientos ── */}
      <section id="entrenamientos" className="max-w-6xl mx-auto px-5 py-20">
        <SectionHead kicker="Cómo entrenamos" title="Tres pilares, una montaña" />
        <div className="grid sm:grid-cols-3 gap-4 mt-10">
          {TRAININGS.map(t => (
            <div key={t.title} className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 hover:border-brand/30 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-4">
                <t.icon size={20} className="text-brand" />
              </div>
              <h3 className="font-[Barlow_Condensed] font-bold text-xl uppercase tracking-wide">{t.title}</h3>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Planes ── */}
      <section id="planes" className="border-y border-white/[0.06] bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <SectionHead kicker="Sumate" title="Elegí cómo entrenar" />
          <div className="grid md:grid-cols-3 gap-4 mt-10">
            {PLANS.map(p => (
              <div key={p.name}
                className={`rounded-2xl p-6 flex flex-col ${
                  p.highlight ? 'bg-brand/[0.06] border-2 border-brand/40' : 'bg-[#111] border border-white/[0.08]'
                }`}>
                <span className="text-brand text-[11px] font-bold uppercase tracking-[0.15em]">{p.tag}</span>
                <h3 className="font-[Barlow_Condensed] font-black text-2xl uppercase mt-1">{p.name}</h3>
                <p className="text-slate-400 text-sm mt-3 leading-relaxed flex-1">{p.desc}</p>
                <ul className="flex flex-col gap-2 mt-5">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="text-brand">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link to={user ? '/inicio' : '/login'}
                  className={`mt-6 text-center font-bold text-sm px-5 py-3 rounded-xl transition-colors ${
                    p.highlight ? 'bg-brand text-black hover:bg-[#d4ff33]' : 'bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1]'
                  }`}>
                  {p.price}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comunidad / IG ── */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <div className="bg-gradient-to-br from-[#141a00] to-[#111] border border-white/[0.08] rounded-3xl p-8 sm:p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-5">
            <Users size={22} className="text-brand" />
          </div>
          <h2 className="font-[Barlow_Condensed] font-black text-3xl sm:text-4xl uppercase">Más que un equipo</h2>
          <p className="text-slate-400 mt-3 max-w-lg mx-auto leading-relaxed">
            Seguinos en Instagram para ver las salidas, los paisajes de la Patagonia y la vida del equipo.
          </p>
          <a href={IG_URL} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 mt-7 bg-brand text-black font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#d4ff33] transition-colors">
            <Instagram size={16} /> @bandurriastrailrunning
          </a>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="border-t border-white/[0.06] bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto px-5 py-20">
          <SectionHead kicker="Dudas" title="Preguntas frecuentes" />
          <div className="flex flex-col gap-2 mt-10">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-[#111] border border-white/[0.06] rounded-xl overflow-hidden">
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
                  <span className="font-semibold text-sm sm:text-base">{item.q}</span>
                  <ChevronDown size={18} className={`text-brand shrink-0 transition-transform ${faqOpen === i ? 'rotate-180' : ''}`} />
                </button>
                {faqOpen === i && (
                  <p className="px-5 pb-4 text-slate-400 text-sm leading-relaxed">{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contacto / CTA final ── */}
      <section id="contacto" className="max-w-6xl mx-auto px-5 py-20 text-center">
        <h2 className="font-[Barlow_Condensed] font-black text-4xl sm:text-5xl uppercase">¿Listo para la montaña?</h2>
        <p className="text-slate-400 mt-3 max-w-md mx-auto">Sumate al equipo o escribinos para coaching personalizado.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={user ? '/inicio' : '/login'}
            className="inline-flex items-center justify-center gap-2 bg-brand text-black font-bold text-sm px-6 py-3.5 rounded-xl hover:bg-[#d4ff33] transition-colors">
            {user ? 'Ir al panel' : 'Unirme al equipo'} <ArrowRight size={16} />
          </Link>
          <a href={`mailto:bandurriastrailrunning@gmail.com`}
            className="inline-flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.1] font-bold text-sm px-6 py-3.5 rounded-xl hover:bg-white/[0.08] transition-colors">
            <Mail size={16} /> Escribinos
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 uppercase tracking-wider font-[Barlow_Condensed] font-semibold">
          <span>Bandurrias Trail Running Team · Bariloche, Patagonia</span>
          <div className="flex items-center gap-4">
            <a href={IG_URL} target="_blank" rel="noreferrer" className="hover:text-brand transition-colors">Instagram</a>
            <Link to="/login" className="hover:text-brand transition-colors">Miembros</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function SectionHead({ kicker, title }) {
  return (
    <div>
      <span className="text-brand text-[11px] font-bold uppercase tracking-[0.2em]">{kicker}</span>
      <h2 className="font-[Barlow_Condensed] font-black text-3xl sm:text-4xl uppercase mt-2 tracking-tight">{title}</h2>
    </div>
  )
}

function LandingFonts() {
  return (
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Barlow:wght@300;400;500;600&display=swap');`}</style>
  )
}
