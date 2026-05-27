import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Admin from './pages/Admin'
import { isAdmin as checkAdmin } from './lib/auth'

const Search        = lazy(() => import('./pages/Search'))
const Schedule      = lazy(() => import('./pages/Schedule'))
const Stats         = lazy(() => import('./pages/Stats'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

function AppRoutes() {
  const { user } = useAuth()
  const location = useLocation()
  const isResetRoute = location.pathname === '/reset-password'

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-slate-500 text-sm">Cargando...</div>
      </div>
    )
  }

  // /reset-password renders standalone (no sidebar) so it works for both
  // recovery-link landings and in-app password setup.
  if (isResetRoute) {
    return (
      <Suspense fallback={<Loader />}>
        <ResetPassword />
      </Suspense>
    )
  }

  if (!user) return <Login />

  const isAdmin = checkAdmin(user.email)
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={isAdmin ? <Admin /> : <Navigate to="/" replace />} />
        <Route path="/buscar" element={
          <Suspense fallback={<Loader />}>
            <Search />
          </Suspense>
        } />
        <Route path="/planificacion-semanal" element={
          <Suspense fallback={<Loader />}>
            <Schedule />
          </Suspense>
        } />
        <Route path="/estadisticas-carreras" element={
          <Suspense fallback={<Loader />}>
            <Stats />
          </Suspense>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
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
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
