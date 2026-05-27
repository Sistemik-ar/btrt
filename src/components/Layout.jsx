import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

const BASE_NAV = [
  { to: '/',       icon: HomeIcon,   label: 'Inicio'     },
  { to: '/buscar', icon: SearchIcon, label: 'Resultados' },
]

export default function Layout({ children }) {
  const { user, profile, signOut } = useAuth()
  const navigate  = useNavigate()
  const isAdmin   = user?.email === ADMIN_EMAIL
  const NAV       = isAdmin
    ? [...BASE_NAV, { to: '/admin', icon: AdminIcon, label: 'Admin' }]
    : BASE_NAV
  const [collapsed, setCollapsed]  = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const initials = profile?.name
    ? profile.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'

  const st = {
    active:   { label: 'Al día',         color: 'text-[#AADD00]', dot: 'bg-[#AADD00]' },
    moroso:   { label: 'Pago pendiente', color: 'text-yellow-400', dot: 'bg-yellow-400' },
    inactive: { label: 'Inactivo',       color: 'text-slate-500',  dot: 'bg-slate-500'  },
  }[profile?.status] ?? { label: 'Al día', color: 'text-[#AADD00]', dot: 'bg-[#AADD00]' }

  const sidebarWidth = collapsed ? 64 : 220

  return (
    <div className="min-h-dvh flex bg-[#0A0A14]">

      {/* ── Desktop sidebar (sticky, not fixed – flex takes care of layout) ── */}
      <aside
        style={{ width: sidebarWidth, minWidth: sidebarWidth }}
        className="hidden lg:flex flex-col bg-[#06060F] sticky top-0 h-screen border-r border-white/5 transition-[width] duration-200 z-10 overflow-hidden shrink-0"
      >
        {/* Logo + toggle */}
        <div className="flex items-center justify-between px-3 h-16 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#AADD00]/15 flex items-center justify-center text-[#AADD00] font-black text-sm shrink-0">
              B
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-white font-bold text-sm leading-tight">BTRT</p>
                <p className="text-[#AADD00]/50 text-[9px] uppercase tracking-widest truncate">Bandurrias Trail</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="shrink-0 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all"
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-4 flex flex-col gap-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all
                 ${collapsed ? 'justify-center' : ''}
                 ${isActive
                   ? 'bg-[#AADD00]/10 text-[#AADD00]'
                   : 'text-slate-500 hover:text-white hover:bg-white/5'
                 }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon active={isActive} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div className="px-2 pb-4 shrink-0">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#AADD00]/15 flex items-center justify-center">
                <span className="text-[#AADD00] text-[11px] font-bold">{initials}</span>
              </div>
              <button
                onClick={handleSignOut}
                title="Cerrar sesión"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all"
              >
                <SignOutIcon />
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#AADD00]/15 flex items-center justify-center shrink-0">
                  <span className="text-[#AADD00] text-[11px] font-bold">{initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold truncate">
                    {profile?.name || user?.email?.split('@')[0]}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    <p className={`text-[10px] ${st.color}`}>{st.label}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-center text-slate-600 text-[10px] hover:text-slate-400 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content (flex-1 takes remaining space automatically) ── */}
      <div className="flex-1 flex flex-col min-h-dvh min-w-0">

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3.5 bg-[#06060F] border-b border-white/5 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#AADD00]/15 flex items-center justify-center text-[#AADD00] font-bold text-sm">B</div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">BTRT</p>
              <p className="text-[#AADD00]/50 text-[9px] uppercase tracking-widest">Bandurrias Trail</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
              <span className={`text-xs ${st.color}`}>{st.label}</span>
            </div>
            <button onClick={handleSignOut} className="text-slate-500 text-xs hover:text-white transition-colors">
              Salir
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 lg:p-8 pb-28 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#06060F] border-t border-white/5 flex z-20">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3.5 text-[10px] font-semibold tracking-wider uppercase transition-colors
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

function HomeIcon({ active, size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? '#AADD00' : 'none'} stroke={active ? '#AADD00' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>
}
function SearchIcon({ active, size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active ? '#AADD00' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
}
function ChevronLeftIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
}
function ChevronRightIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
}
function SignOutIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}
function AdminIcon({ active, size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active ? '#AADD00' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
}
