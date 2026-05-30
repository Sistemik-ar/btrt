import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const IG_URL = 'https://www.instagram.com/bandurriastrailrunning/'
// Foto del hero. Para usar la del equipo: dejá un archivo en public/hero.jpg
// (grupo de trail runners corriendo en Bariloche) y se usa automáticamente.
// Si no existe, cae a una foto de trail running de Unsplash.
const HERO_FALLBACK = 'https://images.unsplash.com/photo-1530137073521-dc479e51a5fe?auto=format&fit=crop&w=1900&q=80'
const HERO_IMG = '/hero.jpg'

const PLANS = [
  {
    name: 'Iniciación', badge: null,
    desc: 'Tu primer contacto con el trail running. Grupos guiados, sin presión, a tu ritmo. Aprendé técnica de montaña en un ambiente amigable.',
    features: ['Salidas grupales semanales', 'Técnica básica de montaña', 'Comunidad activa', 'Acceso a calendario de eventos'],
  },
  {
    name: 'Trail Running', badge: 'Popular',
    desc: 'Mejorá técnica, resistencia y rendimiento en montaña con planificación semanal adaptada a tu nivel y objetivos de carrera.',
    features: ['Planificación semanal personalizada', 'Análisis de carga de entrenamiento', 'Preparación para carreras locales', 'Feedback semanal del coach'],
  },
  {
    name: 'Ultra Trail', badge: null,
    desc: 'Preparación específica para grandes desafíos y coaching a distancia personalizado para atletas con ambición de ultra.',
    features: ['Coaching 1:1 a distancia', 'Periodización para ultras', 'Nutrición y recuperación', 'Seguimiento en tiempo real'],
  },
]

const FAQ = [
  { q: '¿Necesito experiencia para empezar?', a: 'No, el plan de Iniciación está diseñado para personas sin experiencia previa en trail running. Empezamos desde cero, con salidas a bajo impacto y técnica progresiva.' },
  { q: '¿Dónde entrenan en Bariloche?', a: 'Principalmente en los circuitos del Cerro Catedral, Lago Gutiérrez, Cerro Otto y los parques nacionales de la zona. Variamos los escenarios para aprovechar toda la Patagonia.' },
  { q: '¿Hacen coaching a distancia?', a: 'Sí, el plan Ultra Trail incluye coaching a distancia 100% online. Te acompañamos desde cualquier parte del mundo con planificación personalizada y seguimiento semanal.' },
  { q: '¿Cómo es la cuota mensual?', a: 'Cada plan tiene su precio según la dedicación y servicios incluidos. Escribinos por Instagram y te contamos los valores actualizados y las opciones de pago.' },
]

export default function Landing() {
  const { user } = useAuth()
  const [menu, setMenu] = useState(false)
  const [open, setOpen] = useState(0)
  const loginTo = user ? '/inicio' : '/login'
  const loginLabel = user ? 'Ir al panel' : 'Ingresar'

  return (
    <div className="bw">
      <style>{CSS}</style>

      {/* ── Nav ── */}
      <nav className="bw-nav">
        <a className="bw-nav-logo" href="#hero">
          <img src="/logo.png" alt="Bandurrias Trail Running" className="bw-nav-img"
            onError={e => { e.target.style.display = 'none' }} />
          BANDURRIAS
        </a>
        <ul className="bw-nav-links">
          <li><a href="#planes">Planes</a></li>
          <li><a href="#faq">FAQ</a></li>
          <li><a href={IG_URL} target="_blank" rel="noreferrer">Instagram</a></li>
          <li><Link to={loginTo} className="bw-nav-cta">{loginLabel}</Link></li>
        </ul>
        <button className="bw-burger" onClick={() => setMenu(m => !m)} aria-label="Menú">{menu ? '✕' : '☰'}</button>
      </nav>
      {menu && (
        <div className="bw-mobile">
          <a href="#planes" onClick={() => setMenu(false)}>Planes</a>
          <a href="#faq" onClick={() => setMenu(false)}>FAQ</a>
          <a href={IG_URL} target="_blank" rel="noreferrer">Instagram</a>
          <Link to={loginTo} className="bw-nav-cta" onClick={() => setMenu(false)}>{loginLabel}</Link>
        </div>
      )}

      {/* ── Hero ── */}
      <section id="hero">
        <div className="bw-hero-bg" style={{
          backgroundImage:
            // gradientes oscurecen izquierda + base (legibilidad de texto y botón)
            'linear-gradient(to right,rgba(10,10,8,0.88) 28%,rgba(10,10,8,0.25) 100%),' +
            'linear-gradient(to top,rgba(10,10,8,0.94) 0%,rgba(10,10,8,0.45) 26%,transparent 55%),' +
            // foto local del equipo si existe, si no la de fallback
            `url('${HERO_IMG}'),url('${HERO_FALLBACK}')`,
        }} />
        <div className="bw-hero-noise" />
        <div className="bw-hero-content">
          <span className="bw-hero-tag">Comunidad · Bariloche · Patagonia</span>
          <h1 className="bw-hero-title">Corré<br /><span>La Montaña.</span></h1>
          <p className="bw-hero-sub">Entrenamientos grupales, planificación profesional y preparación para carreras y ultras en la Patagonia.</p>
          <div className="bw-hero-actions">
            <a href="#planes" className="bw-btn-primary">Empezar a entrenar</a>
            <Link to={loginTo} className="bw-btn-ghost">{loginLabel} <span className="bw-arrow">→</span></Link>
          </div>
        </div>
      </section>

      {/* ── Planes ── */}
      <section id="planes">
        <div className="bw-planes-header">
          <span className="bw-section-label">Programas</span>
          <h2 className="bw-section-title">Para Cada<br />Objetivo</h2>
        </div>
        <div className="bw-planes-grid">
          {PLANS.map((p, i) => (
            <div key={p.name} className="bw-plan-card" style={{ transitionDelay: `${i * 0.08}s` }}>
              {p.badge && <span className="bw-plan-badge">{p.badge}</span>}
              <div className="bw-plan-icon">▲</div>
              <div className="bw-plan-name">{p.name}</div>
              <p className="bw-plan-desc">{p.desc}</p>
              <ul className="bw-plan-features">
                {p.features.map(f => <li key={f}>{f}</li>)}
              </ul>
              <Link to={loginTo} className="bw-btn-primary bw-plan-cta">Sumate</Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq">
        <div className="bw-faq-inner">
          <div className="bw-faq-head">
            <span className="bw-section-label">Dudas frecuentes</span>
            <h2 className="bw-section-title" style={{ marginBottom: 0 }}>Preguntas<br />Frecuentes</h2>
          </div>
          <div className="bw-faq-list">
            {FAQ.map((it, i) => (
              <div key={i} className={`bw-faq-item ${open === i ? 'open' : ''}`}>
                <button className="bw-faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                  {it.q}
                  <span className="bw-faq-icon">+</span>
                </button>
                {open === i && <div className="bw-faq-a">{it.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta">
        <div className="bw-cta-inner">
          <span className="bw-cta-eyebrow">Comunidad Patagonia</span>
          <h2 className="bw-cta-title">La Montaña<br />Te <span>Espera.</span></h2>
          <p className="bw-cta-sub">Sumate a la comunidad de trail running de Bariloche y descubrí hasta dónde podés llegar.</p>
          <div className="bw-cta-actions">
            <Link to={loginTo} className="bw-btn-primary">Quiero entrenar</Link>
            <a href={IG_URL} target="_blank" rel="noreferrer" className="bw-btn-outline">✦ Contactanos por Instagram</a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bw-footer">
        <a href={IG_URL} target="_blank" rel="noreferrer" className="bw-footer-join">¡Sumate!</a>
        <div className="bw-footer-center">Bandurrias Trail Running · Bariloche · Patagonia Argentina</div>
        <a href={IG_URL} target="_blank" rel="noreferrer" className="bw-footer-ig">
          <IgIcon /> @bandurriastrailrunning
        </a>
      </footer>
    </div>
  )
}

function IgIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
    </svg>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

.bw {
  --acid: #C8FF00; --white: #f5f5f0; --off-white: #e0e0d8;
  --dark: #0a0a08; --dark-2: #111110; --dark-3: #1a1a18; --dark-4: #222220;
  --muted: #888880; --border: rgba(200,255,0,0.12);
  font-family: 'Syne', sans-serif; background: var(--dark); color: var(--white);
  overflow-x: hidden; min-height: 100dvh;
}
.bw *, .bw *::before, .bw *::after { margin: 0; padding: 0; box-sizing: border-box; }
.bw a { text-decoration: none; color: inherit; }
.bw ul { list-style: none; }

/* Nav */
.bw-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; height: 64px; background: rgba(10,10,8,0.88); backdrop-filter: blur(14px); border-bottom: 1px solid var(--border); }
@media (min-width: 768px) { .bw-nav { padding: 0 48px; } }
.bw-nav-logo { display: flex; align-items: center; gap: 10px; font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.08em; color: var(--white); }
.bw-nav-img { width: 30px; height: 30px; border-radius: 6px; object-fit: cover; }
.bw-nav-links { display: none; align-items: center; gap: 32px; }
@media (min-width: 768px) { .bw-nav-links { display: flex; } }
.bw-nav-links a { font-size: 14px; font-weight: 600; color: var(--off-white); transition: color 0.2s; }
.bw-nav-links a:hover { color: var(--acid); }
.bw-nav-cta { background: var(--acid) !important; color: var(--dark) !important; padding: 8px 20px; border-radius: 4px; font-weight: 700 !important; }
.bw-nav-cta:hover { opacity: 0.88; }
.bw-burger { display: block; background: none; border: none; color: var(--white); font-size: 20px; cursor: pointer; }
@media (min-width: 768px) { .bw-burger { display: none; } }
.bw-mobile { position: fixed; top: 64px; left: 0; right: 0; z-index: 99; background: rgba(10,10,8,0.97); backdrop-filter: blur(14px); border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 16px; padding: 20px 24px; }
.bw-mobile a { font-weight: 600; color: var(--off-white); }
.bw-mobile .bw-nav-cta { text-align: center; }

/* Hero */
.bw #hero, #hero { position: relative; height: 100dvh; min-height: 600px; display: flex; align-items: flex-end; padding: 0 24px 64px; overflow: hidden; }
@media (min-width: 768px) { #hero { padding: 0 64px 80px; } }
.bw-hero-bg { position: absolute; inset: 0; background-size: cover; background-position: center; transform: scale(1.04); animation: bwZoom 12s ease-out forwards; }
@keyframes bwZoom { from { transform: scale(1.04); } to { transform: scale(1.00); } }
.bw-hero-noise { position: absolute; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); pointer-events: none; }
.bw-hero-content { position: relative; z-index: 2; max-width: 680px; animation: bwFadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
@keyframes bwFadeUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
.bw-hero-tag { display: inline-block; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--acid); border: 1px solid var(--acid); padding: 5px 12px; border-radius: 2px; margin-bottom: 24px; }
.bw-hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(72px,10vw,140px); line-height: 0.92; letter-spacing: 0.01em; color: var(--white); margin-bottom: 24px; }
.bw-hero-title span { color: var(--acid); }
.bw-hero-sub { font-size: 17px; line-height: 1.6; color: var(--off-white); max-width: 420px; margin-bottom: 40px; }
.bw-hero-actions { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }

/* Buttons */
.bw-btn-primary { display: inline-flex; align-items: center; gap: 8px; background: var(--acid); color: #0a0a08 !important; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; padding: 15px 30px; border-radius: 4px; box-shadow: 0 8px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(200,255,0,0.5); transition: transform 0.18s, box-shadow 0.18s; }
.bw-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(200,255,0,0.3), 0 0 0 1px var(--acid); }
.bw-btn-ghost { display: inline-flex; align-items: center; gap: 8px; color: var(--white); font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; text-shadow: 0 2px 8px rgba(0,0,0,0.7); }
.bw-btn-ghost .bw-arrow { transition: transform 0.18s; }
.bw-btn-ghost:hover .bw-arrow { transform: translateX(4px); }
.bw-btn-outline { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(200,255,0,0.4); color: var(--acid); font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; padding: 14px 28px; border-radius: 4px; transition: background 0.18s, border-color 0.18s; }
.bw-btn-outline:hover { background: rgba(200,255,0,0.06); border-color: var(--acid); }

/* Section heads */
.bw-section-label { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--acid); margin-bottom: 16px; display: block; }
.bw-section-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(48px,6vw,80px); line-height: 0.95; letter-spacing: 0.02em; color: var(--white); margin-bottom: 56px; }

/* Planes */
#planes { background: var(--dark); padding: 100px 24px; }
@media (min-width: 768px) { #planes { padding: 120px 64px; } }
.bw-planes-header { max-width: 1200px; margin: 0 auto; }
.bw-planes-grid { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr; gap: 20px; }
@media (min-width: 880px) { .bw-planes-grid { grid-template-columns: repeat(3, 1fr); } }
.bw-plan-card { background: var(--dark-2); border: 2px solid var(--acid); padding: 40px 32px; display: flex; flex-direction: column; position: relative; overflow: hidden; transition: background 0.25s, transform 0.25s, box-shadow 0.25s; }
.bw-plan-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--acid); }
.bw-plan-card:hover { background: var(--dark-3); transform: translateY(-4px); box-shadow: 0 12px 48px rgba(200,255,0,0.14); }
.bw-plan-badge { position: absolute; top: 18px; right: 18px; background: var(--acid); color: var(--dark); font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; padding: 4px 10px; border-radius: 2px; }
.bw-plan-icon { width: 44px; height: 44px; background: rgba(200,255,0,0.1); border: 1px solid rgba(200,255,0,0.3); border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; color: var(--acid); font-size: 16px; }
.bw-plan-name { font-family: 'Bebas Neue', sans-serif; font-size: 36px; letter-spacing: 0.04em; color: var(--white); margin-bottom: 12px; }
.bw-plan-desc { font-size: 14px; line-height: 1.6; color: var(--muted); margin-bottom: 24px; }
.bw-plan-features { display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px; flex: 1; }
.bw-plan-features li { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--off-white); }
.bw-plan-features li::before { content: ''; width: 16px; height: 16px; flex-shrink: 0; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none'%3E%3Ccircle cx='8' cy='8' r='7' stroke='%23C8FF00' stroke-width='1.2'/%3E%3Cpath d='M5 8l2 2 4-4' stroke='%23C8FF00' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/contain no-repeat; }
.bw-plan-cta { justify-content: center; }

/* FAQ */
#faq { background: var(--dark-2); padding: 100px 24px; }
@media (min-width: 768px) { #faq { padding: 120px 64px; } }
.bw-faq-inner { max-width: 820px; margin: 0 auto; }
.bw-faq-list { display: flex; flex-direction: column; }
.bw-faq-item { border-bottom: 1px solid var(--border); }
.bw-faq-q { width: 100%; background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 24px 0; font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 600; color: var(--white); text-align: left; transition: color 0.18s; }
.bw-faq-q:hover { color: var(--acid); }
.bw-faq-icon { width: 24px; height: 24px; flex-shrink: 0; background: var(--dark-4); border: 1px solid var(--border); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--acid); font-size: 16px; transition: background 0.2s, transform 0.2s; }
.bw-faq-item.open .bw-faq-icon { background: var(--acid); color: var(--dark); transform: rotate(45deg); }
.bw-faq-a { font-size: 14px; line-height: 1.7; color: var(--muted); padding: 0 0 24px; max-width: 90%; }

/* CTA */
#cta { background: var(--dark); padding: 100px 24px; text-align: center; position: relative; overflow: hidden; }
@media (min-width: 768px) { #cta { padding: 120px 64px; } }
#cta::before { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 600px; height: 600px; background: radial-gradient(circle, rgba(200,255,0,0.07) 0%, transparent 70%); pointer-events: none; }
.bw-cta-inner { position: relative; z-index: 2; max-width: 800px; margin: 0 auto; }
.bw-cta-eyebrow { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--acid); margin-bottom: 20px; display: block; }
.bw-cta-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(56px,8vw,100px); line-height: 0.93; color: var(--white); margin-bottom: 20px; }
.bw-cta-title span { color: var(--acid); }
.bw-cta-sub { font-size: 17px; line-height: 1.6; color: var(--off-white); max-width: 520px; margin: 0 auto 36px; }
.bw-cta-actions { display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap; }

/* Footer */
.bw-footer { background: var(--dark-2); border-top: 1px solid var(--border); padding: 36px 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
@media (min-width: 768px) { .bw-footer { padding: 40px 64px; } }
.bw-footer-join { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.06em; color: var(--acid); transition: opacity 0.18s; }
.bw-footer-join:hover { opacity: 0.8; }
.bw-footer-center { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.12em; color: var(--muted); text-align: center; line-height: 1.8; }
.bw-footer-ig { display: inline-flex; align-items: center; gap: 7px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); transition: color 0.18s; }
.bw-footer-ig:hover { color: var(--acid); }
`
