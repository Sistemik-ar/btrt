import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { Home, Search, Settings2, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'

import { isAdmin as checkAdmin } from '../lib/auth'

export default function Layout({ children }) {
  const { user, profile, signOut } = useAuth()
  const navigate  = useNavigate()
  const isAdmin   = checkAdmin(user?.email)
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

  const NAV_ITEMS = [
    { to: '/',       Icon: Home,     label: 'Inicio'     },
    { to: '/buscar', Icon: Search,   label: 'Resultados' },
    ...(isAdmin ? [{ to: '/admin', Icon: Settings2, label: 'Admin' }] : []),
  ]

  const sidebarW = collapsed ? 64 : 240

  return (
    <div className="min-h-dvh flex bg-[#050816]">

      {/* ── Desktop sidebar ── */}
      <aside
        style={{ width: sidebarW, minWidth: sidebarW }}
        className="hidden lg:flex flex-col bg-[#07090F] sticky top-0 h-screen border-r border-white/[0.06] transition-[width] duration-200 z-20 overflow-hidden shrink-0"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-[#C6FF00]/10 border border-[#C6FF00]/20 flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/logo.png" alt="BTRT" className="w-full h-full object-cover"
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
              <span className="text-[#C6FF00] font-black text-sm hidden w-full h-full items-center justify-center">B</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-white font-bold text-sm leading-tight">Bandurrias</p>
                <p className="text-slate-600 text-[10px] uppercase tracking-widest truncate">Trail Running Team</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expandir' : 'Colapsar'}
            className="shrink-0 w-7 h-7 rounded-lg hover:bg-white/8 flex items-center justify-center text-slate-600 hover:text-slate-300 transition-all"
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {!collapsed && (
            <p className="text-slate-700 text-[9px] font-bold uppercase tracking-[0.15em] px-2 mb-2">
              General
            </p>
          )}
          {NAV_ITEMS.map(({ to, Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                 ${collapsed ? 'justify-center' : ''}
                 ${isActive
                   ? 'bg-[#C6FF00]/[0.08] text-[#C6FF00]'
                   : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                 }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#C6FF00] rounded-r-full" />
                  )}
                  <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div className="px-3 pb-4 border-t border-white/[0.06] pt-3 shrink-0">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#C6FF00]/10 flex items-center justify-center">
                <span className="text-[#C6FF00] text-xs font-bold">{initials}</span>
              </div>
              <button onClick={handleSignOut} title="Cerrar sesión"
                className="w-8 h-8 rounded-lg hover:bg-white/8 flex items-center justify-center text-slate-600 hover:text-white transition-all">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.04] transition-all group">
              <div className="w-9 h-9 rounded-xl bg-[#C6FF00]/10 border border-[#C6FF00]/20 flex items-center justify-center shrink-0">
                <span className="text-[#C6FF00] text-xs font-bold">{initials}</span>
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
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-dvh min-w-0">

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-5 py-4 bg-[#07090F]/90 backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#C6FF00]/10 border border-[#C6FF00]/20 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="BTRT" className="w-full h-full object-cover"
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
              <span className="text-[#C6FF00] text-xs font-black hidden w-full h-full items-center justify-center">B</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Bandurrias</p>
              <p className="text-slate-600 text-[9px] uppercase tracking-widest">Trail Running Team</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
              <span className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
            </div>
            <button onClick={handleSignOut} className="text-slate-500 hover:text-white transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 p-5 lg:p-8 pb-40 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#07090F]/90 backdrop-blur-xl border-t border-white/[0.06] flex z-20 px-2 pb-safe">
        {NAV_ITEMS.map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1.5 py-3 text-[10px] font-semibold tracking-wide uppercase transition-colors
               ${isActive ? 'text-[#C6FF00]' : 'text-slate-600'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} color={isActive ? '#C6FF00' : undefined} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
