import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Admin from './pages/Admin'

const Search = lazy(() => import('./pages/Search'))

const ADMIN_EMAILS = new Set(
  (import.meta.env.VITE_ADMIN_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean)
)

function AppRoutes() {
  const { user } = useAuth()

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-slate-500 text-sm">Cargando...</div>
      </div>
    )
  }

  if (!user) return <Login />

  const isAdmin = ADMIN_EMAILS.has(user.email)
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={isAdmin ? <Admin /> : <Navigate to="/" replace />} />
        <Route path="/buscar" element={
          <Suspense fallback={<div className="flex items-center justify-center py-20"><span className="text-slate-500 text-sm">Cargando...</span></div>}>
            <Search />
          </Suspense>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
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
