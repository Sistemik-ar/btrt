/**
 * Roles & membership helpers (client-side).
 *
 * Source of truth en DB (members.role + RLS). Esto es para gatear UI/UX —
 * la seguridad real la hace RLS en Supabase.
 */

export const ROLE = { ADMIN: 'admin', TRAINER: 'trainer', MEMBER: 'member' }

export function isAdminRole(profile)  { return profile?.role === ROLE.ADMIN }
export function isStaff(profile)      { return profile?.role === ROLE.ADMIN || profile?.role === ROLE.TRAINER }
export function isMember(profile)     { return !!profile }

/** ¿Puede ver planificaciones? Membership active/grace, o sin fila (legacy). */
export function hasPlanAccess(membership) {
  if (!membership) return true
  return membership.status === 'active' || membership.status === 'grace'
}

export const ROLE_LABEL = {
  admin:   'Administrador',
  trainer: 'Entrenador',
  member:  'Miembro',
}

export const MEMBERSHIP_LABEL = {
  active:  { label: 'Al día',    cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  grace:   { label: 'En gracia', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  blocked: { label: 'Bloqueado', cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
}
