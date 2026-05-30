/**
 * Biblioteca de mensajes preguardados (bloques reutilizables).
 *
 * Roco arma planes repetitivos — mismo texto de "llevar hidratación",
 * "registro de trekking obligatorio", etc. Esta biblioteca evita re-tipear.
 *
 * Por ahora: catálogo base hardcodeado + favoritos/personalizados en
 * localStorage. Migrable a tabla `reusable_messages` en Supabase sin tocar
 * la UI (misma shape: { id, category, title, body, vars }).
 *
 * Variables dinámicas: {{punto_encuentro}}, {{horario}}, {{semana}} se
 * reemplazan al insertar con el contexto de la actividad.
 */

const LS_KEY = 'btrt-reusable-msgs'

export const CATEGORIES = [
  { key: 'material',    label: 'Material',      icon: '🎒' },
  { key: 'hidratacion', label: 'Hidratación',   icon: '🥤' },
  { key: 'seguridad',   label: 'Seguridad',     icon: '⚠️' },
  { key: 'encuentro',   label: 'Encuentro',     icon: '📍' },
  { key: 'general',     label: 'General',       icon: '💬' },
]

const BUILTIN = [
  {
    id: 'b-trekking',
    category: 'seguridad',
    title: 'Registro de trekking obligatorio',
    body: 'Registro de trekking obligatorio en la web de Parques Nacionales antes de la salida. Sin registro no se sale.',
  },
  {
    id: 'b-hidra',
    category: 'hidratacion',
    title: 'Llevar hidratación',
    body: 'Llevar mínimo 1,5L de agua + electrolitos. Hidratación cada 20–25 min sin esperar a tener sed.',
  },
  {
    id: 'b-fondo',
    category: 'general',
    title: 'Para participar del fondo',
    body: 'Para participar del fondo del sábado tenés que haber hecho al menos 2 sesiones de la semana. Si no, sumá rodaje suave.',
  },
  {
    id: 'b-material',
    category: 'material',
    title: 'Material obligatorio montaña',
    body: 'Obligatorio: campera rompeviento, gorro, guantes, manta térmica, celular cargado, snack y silbato.',
  },
  {
    id: 'b-capas',
    category: 'material',
    title: 'Sistema de capas',
    body: 'Primera capa técnica (no algodón), segunda capa abrigo, tercera capa rompeviento. El clima de montaña cambia rápido.',
  },
  {
    id: 'b-corte',
    category: 'seguridad',
    title: 'Tiempo de corte',
    body: 'Respetá el tiempo de corte para el regreso. Si no llegás al punto en el tiempo indicado, volvé con el grupo de barrido.',
  },
  {
    id: 'b-encuentro',
    category: 'encuentro',
    title: 'Confirmar punto de encuentro',
    body: 'Punto de encuentro a confirmar según condiciones climáticas. Se informa por el grupo el día anterior.',
  },
  {
    id: 'b-clima',
    category: 'seguridad',
    title: 'Salida sujeta a clima',
    body: 'La salida está sujeta a las condiciones climáticas. Ante alerta meteorológica se reprograma. Atentos al grupo.',
  },
]

function readCustom() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : { custom: [], favorites: [] }
  } catch {
    return { custom: [], favorites: [] }
  }
}
function writeCustom(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

/** Todos los mensajes (builtin + custom), con flag isFavorite. */
export function listMessages() {
  const { custom, favorites } = readCustom()
  const favSet = new Set(favorites)
  return [...BUILTIN, ...custom].map(m => ({ ...m, isFavorite: favSet.has(m.id) }))
}

export function toggleFavorite(id) {
  const data = readCustom()
  const set = new Set(data.favorites)
  set.has(id) ? set.delete(id) : set.add(id)
  data.favorites = [...set]
  writeCustom(data)
  return set.has(id)
}

export function addCustomMessage({ category, title, body }) {
  const data = readCustom()
  const msg = { id: `c-${Date.now().toString(36)}`, category, title, body, custom: true }
  data.custom = [msg, ...(data.custom ?? [])]
  writeCustom(data)
  return msg
}

export function removeCustomMessage(id) {
  const data = readCustom()
  data.custom = (data.custom ?? []).filter(m => m.id !== id)
  data.favorites = (data.favorites ?? []).filter(f => f !== id)
  writeCustom(data)
}

/** Reemplaza variables {{x}} con el contexto dado. */
export function renderMessage(body, ctx = {}) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] ?? `{{${k}}}`)
}
