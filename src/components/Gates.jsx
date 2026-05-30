import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { isAdminRole, isStaff, hasPlanAccess } from '../lib/roles'
import { Lock } from 'lucide-react'

/**
 * Route/section guards basados en rol + membership.
 * La seguridad real la hace RLS; esto evita mostrar UI sin permiso.
 */

function Denied({ title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 gap-4 max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
        <Lock size={22} className="text-slate-500" />
      </div>
      <div>
        <p className="text-white font-bold text-lg">{title}</p>
        <p className="text-slate-500 text-sm mt-1">{sub}</p>
      </div>
    </div>
  )
}

/** Solo admin. */
export function AdminGate({ children, redirect }) {
  const { profile } = useAuth()
  if (profile === null) return <GateLoader />
  if (!isAdminRole(profile)) {
    return redirect ? <Navigate to={redirect} replace /> : (
      <Denied title="Acceso restringido" sub="Esta sección es solo para administradores." />
    )
  }
  return children
}

/** Admin o entrenador (puede editar planificaciones). */
export function StaffGate({ children, redirect }) {
  const { profile } = useAuth()
  if (profile === null) return <GateLoader />
  if (!isStaff(profile)) {
    return redirect ? <Navigate to={redirect} replace /> : (
      <Denied title="Acceso restringido" sub="Necesitás permisos de entrenador o admin." />
    )
  }
  return children
}

/** Requiere membership activa/gracia para ver planificaciones. */
export function MembershipGate({ children }) {
  const { profile, membership } = useAuth()
  if (isStaff(profile)) return children            // staff siempre pasa
  if (!hasPlanAccess(membership)) {
    return (
      <Denied
        title="Cuota vencida"
        sub="Para ver la planificación necesitás estar al día con la cuota. Subí tu comprobante desde tu perfil."
      />
    )
  }
  return children
}

function GateLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
    </div>
  )
}
