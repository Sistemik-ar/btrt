import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Admin from './pages/Admin'
import { isAdmin as checkAdmin } from './lib/auth'

const Search = lazy(() => import('./pages/Search'))

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

  const isAdmin = checkAdmin(user.email)
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
