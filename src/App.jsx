import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { ToastProvider } from './lib/ToastContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Home from './pages/Home'
import Admin from './pages/Admin'
import { isAdmin as checkAdmin } from './lib/auth'
import { isStaff } from './lib/roles'

const Search        = lazy(() => import('./pages/Search'))
const Schedule      = lazy(() => import('./pages/Schedule'))
const Stats         = lazy(() => import('./pages/Stats'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

/** Rutas autenticadas (con sidebar). Redirige a /login si no hay sesión. */
function AppShell() {
  const { user, profile } = useAuth()
  if (!user) return <Navigate to="/login" replace />

  const isAdminUser = isStaff(profile) || checkAdmin(user.email)
  return (
    <Layout>
      <Routes>
        <Route path="/inicio" element={<Home />} />
        <Route path="/admin" element={isAdminUser ? <Admin /> : <Navigate to="/inicio" replace />} />
        <Route path="/buscar" element={<Suspense fallback={<Loader />}><Search /></Suspense>} />
        <Route path="/planificacion-semanal" element={<Suspense fallback={<Loader />}><Schedule /></Suspense>} />
        <Route path="/estadisticas-carreras" element={<Suspense fallback={<Loader />}><Stats /></Suspense>} />
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </Layout>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  const location = useLocation()

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-slate-500 text-sm">Cargando...</div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={user ? <Navigate to="/inicio" replace /> : <Login />} />
      <Route path="/reset-password" element={<Suspense fallback={<Loader />}><ResetPassword /></Suspense>} />

      {/* App (autenticada) — cualquier otra ruta entra al shell */}
      <Route path="/*" element={<AppShell key={location.key} />} />
    </Routes>
  )
}

function Loader() {
  return (
    <div className="flex items-center justify-center py-20">
      <span className="text-slate-500 text-sm">Cargando...</span>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
