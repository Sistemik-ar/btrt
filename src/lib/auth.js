/**
 * Parse VITE_ADMIN_EMAIL (comma-separated) into a Set.
 * Accepts the raw env string so tests can inject any value.
 */
export function parseAdminEmails(envStr = '') {
  return new Set(
    envStr.split(',').map(e => e.trim()).filter(Boolean)
  )
}

export const ADMIN_EMAILS = parseAdminEmails(import.meta.env?.VITE_ADMIN_EMAIL)

export function isAdmin(email) {
  return ADMIN_EMAILS.has(email)
}
