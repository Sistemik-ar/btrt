import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

export default function Layout({ children }) {
  const { user, profile, signOut } = useAuth()
  const navigate  = useNavigate()
  const isAdmin   = user?.email === ADMIN_EMAIL
  const [collapsed, setCollapsed] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const initials = profile?.name
    ? profile.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : (user?.email?.[0] ?? '?').toUpperCase()

  const st = {
    active:   { label: 'Al día',         color: 'text-emerald-400', dot: 'bg-emerald-400' },
    moroso:   { label: 'Pago pendiente', color: 'text-yellow-400',  dot: 'bg-yellow-400'  },
    inactive: { label: 'Inactivo',       color: 'text-slate-500',   dot: 'bg-slate-500'   },
  }[profile?.status] ?? { label: 'Al día', color: 'text-emerald-400', dot: 'bg-emerald-400' }

  const NAV_SECTIONS = [
    {
      label: 'General',
      items: [
        { to: '/',       icon: HomeIcon,   label: 'Inicio'     },
        { to: '/buscar', icon: SearchIcon, label: 'Resultados' },
        ...(isAdmin ? [{ to: '/admin', icon: AdminIcon, label: 'Admin' }] : []),
      ],
    },
  ]

  const sidebarW = collapsed ? 64 : 240

  return (
    <div className="min-h-dvh flex bg-[#080B12]">

      {/* ── Desktop sidebar ── */}
      <aside
        style={{ width: sidebarW, minWidth: sidebarW }}
        className="hidden lg:flex flex-col bg-[#0D1117] sticky top-0 h-screen border-r border-white/[0.06] transition-[width] duration-200 z-20 overflow-hidden shrink-0"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-[#AADD00]/15 border border-[#AADD00]/20 flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/logo.png" alt="BTRT" className="w-full h-full object-cover"
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
              <span className="text-[#AADD00] font-black text-sm hidden w-full h-full items-center justify-center">B</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-white font-bold text-sm leading-tight">Bandurrias</p>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest truncate">Trail Running Team</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expandir' : 'Colapsar'}
            className="shrink-0 w-7 h-7 rounded-lg hover:bg-white/8 flex items-center justify-center text-slate-600 hover:text-slate-300 transition-all"
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-4 overflow-y-auto">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              {!collapsed && (
                <p className="text-slate-600 text-[9px] font-bold uppercase tracking-[0.15em] px-2 mb-2">
                  {section.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                       ${collapsed ? 'justify-center' : ''}
                       ${isActive
                         ? 'bg-[#AADD00]/10 text-[#AADD00]'
                         : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                       }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && !collapsed && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#AADD00] rounded-r-full" />
                        )}
                        <Icon active={isActive} />
                        {!collapsed && <span className="truncate">{label}</span>}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User card */}
        <div className="px-3 pb-4 border-t border-white/[0.06] pt-3 shrink-0">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#AADD00]/10 flex items-center justify-center">
                <span className="text-[#AADD00] text-xs font-bold">{initials}</span>
              </div>
              <button onClick={handleSignOut} title="Cerrar sesión"
                className="w-8 h-8 rounded-lg hover:bg-white/8 flex items-center justify-center text-slate-600 hover:text-white transition-all">
                <SignOutIcon />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.04] transition-all group">
              <div className="w-9 h-9 rounded-xl bg-[#AADD00]/10 border border-[#AADD00]/20 flex items-center justify-center shrink-0">
                <span className="text-[#AADD00] text-xs font-bold">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-semibold truncate leading-tight">
                  {profile?.name || user?.email?.split('@')[0]}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  <p className={`text-[10px] ${st.color}`}>{st.label}</p>
                </div>
              </div>
              <button onClick={handleSignOut} title="Cerrar sesión"
                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-white transition-all">
                <SignOutIcon />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-dvh min-w-0">

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-5 py-4 bg-[#0D1117] border-b border-white/[0.06] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#AADD00]/15 border border-[#AADD00]/20 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="BTRT" className="w-full h-full object-cover"
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
              <span className="text-[#AADD00] text-xs font-black hidden w-full h-full items-center justify-center">B</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Bandurrias</p>
              <p className="text-slate-500 text-[9px] uppercase tracking-widest">Trail Running Team</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
              <span className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
            </div>
            <button onClick={handleSignOut} className="text-slate-500 hover:text-white transition-colors">
              <SignOutIcon />
            </button>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 p-5 lg:p-8 pb-28 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0D1117] border-t border-white/[0.06] flex z-20 px-2 pb-safe">
        {[
          { to: '/',       icon: HomeIcon,   label: 'Inicio'     },
          { to: '/buscar', icon: SearchIcon, label: 'Resultados' },
          ...(isAdmin ? [{ to: '/admin', icon: AdminIcon, label: 'Admin' }] : []),
        ].map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1.5 py-3 text-[10px] font-semibold tracking-wide uppercase transition-colors
               ${isActive ? 'text-[#AADD00]' : 'text-slate-600'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} size={20} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

/* ── Icons ── */
function HomeIcon({ active, size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? '#AADD00' : 'none'} stroke={active ? '#AADD00' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>
}
function SearchIcon({ active, size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active ? '#AADD00' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
}
function AdminIcon({ active, size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active ? '#AADD00' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
}
function ChevronLeftIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
}
function ChevronRightIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
}
function SignOutIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}
