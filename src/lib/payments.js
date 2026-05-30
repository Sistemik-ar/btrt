import { supabase } from './supabase'

const USE_MOCK = import.meta.env.DEV
const BUCKET   = 'payment-proofs'

/** Período actual 'YYYY-MM'. */
export function currentPeriod(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function periodLabel(period) {
  const [y, m] = period.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

/* ── Settings ───────────────────────────────────────────────────────────── */

const MOCK_SETTINGS = { fee_amount: 15000, due_day: 10, currency: 'ARS' }

export async function getSettings() {
  if (USE_MOCK) return MOCK_SETTINGS
  const { data } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle()
  return data ?? MOCK_SETTINGS
}

export async function saveSettings(patch) {
  if (USE_MOCK) { Object.assign(MOCK_SETTINGS, patch); return MOCK_SETTINGS }
  const { data, error } = await supabase
    .from('app_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1).select().single()
  if (error) throw error
  return data
}

/* ── Pago del miembro (período actual) ──────────────────────────────────── */

export async function getMyPayment(userId, period = currentPeriod()) {
  if (USE_MOCK || !userId) {
    try { return JSON.parse(localStorage.getItem(`btrt-pay-${period}`) || 'null') } catch { return null }
  }
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('member_id', userId)
    .eq('period', period)
    .order('created_at', { ascending: false })
    .maybeSingle()
  return data
}

/**
 * Sube comprobante (imagen/PDF) y crea/actualiza el payment del período
 * en estado 'validating'. Devuelve el payment.
 */
export async function uploadProof(userId, memberName, file, { amount, period = currentPeriod() }) {
  if (USE_MOCK || !userId) {
    const rec = { id: 'mock', member_id: userId, member_name: memberName, period, amount, state: 'validating', proof_name: file.name, created_at: new Date().toISOString() }
    localStorage.setItem(`btrt-pay-${period}`, JSON.stringify(rec))
    return rec
  }

  const ext  = file.name.split('.').pop()
  const path = `${userId}/${period}-${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (upErr) throw upErr

  // upsert payment del período
  const { data: existing } = await supabase
    .from('payments').select('id').eq('member_id', userId).eq('period', period).maybeSingle()

  const row = {
    member_id: userId, member_name: memberName, period, amount,
    state: 'validating', status: 'pending', source: 'web', proof_text: path,
  }
  let payment
  if (existing) {
    const { data } = await supabase.from('payments').update(row).eq('id', existing.id).select().single()
    payment = data
  } else {
    const { data } = await supabase.from('payments').insert(row).select().single()
    payment = data
  }

  await supabase.from('payment_proofs').insert({
    payment_id: payment.id, user_id: userId, period, storage_path: path,
  })
  return payment
}

/** Borra el comprobante actual del período (vuelve a 'pending'). */
export async function deleteMyProof(userId, period = currentPeriod()) {
  if (USE_MOCK || !userId) { localStorage.removeItem(`btrt-pay-${period}`); return }
  const { data: proofs } = await supabase
    .from('payment_proofs').select('id, storage_path').eq('user_id', userId).eq('period', period)
  for (const p of proofs ?? []) {
    await supabase.storage.from(BUCKET).remove([p.storage_path])
    await supabase.from('payment_proofs').delete().eq('id', p.id)
  }
  await supabase.from('payments').update({ state: 'pending', proof_text: null })
    .eq('member_id', userId).eq('period', period)
}

/** URL firmada para ver/descargar un comprobante (staff). */
export async function getProofUrl(storagePath, expiresIn = 300) {
  if (USE_MOCK) return null
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresIn)
  return data?.signedUrl ?? null
}

/* ── Admin: listar + validar ────────────────────────────────────────────── */

export async function listPayments({ period, state } = {}) {
  if (USE_MOCK) return MOCK_ADMIN_PAYMENTS.filter(p =>
    (!period || p.period === period) && (!state || p.state === state))
  let q = supabase.from('payments')
    .select('*, members(name, email, status)')
    .order('created_at', { ascending: false })
  if (period) q = q.eq('period', period)
  if (state)  q = q.eq('state', state)
  const { data } = await q
  return data ?? []
}

export async function reviewPayment(paymentId, decision, reviewerId, note) {
  // decision: 'approved' | 'rejected'
  if (USE_MOCK) return
  await supabase.from('payments').update({
    state: decision,
    status: decision === 'approved' ? 'approved' : 'rejected',
    reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), note: note ?? null,
    ...(decision === 'approved' ? { last_payment: new Date().toISOString() } : {}),
  }).eq('id', paymentId)

  if (decision === 'approved') {
    const { data: p } = await supabase.from('payments').select('member_id').eq('id', paymentId).single()
    if (p?.member_id) {
      await supabase.from('memberships').upsert(
        { user_id: p.member_id, status: 'active', blocked_at: null, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    }
  }
}

/* ── Estado visual ──────────────────────────────────────────────────────── */

export const PAY_STATE = {
  pending:    { label: 'Pago pendiente',  cls: 'text-slate-400 bg-white/5 border-white/10' },
  validating: { label: 'Validando',       cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  approved:   { label: 'Aprobado',        cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  rejected:   { label: 'Rechazado',       cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
}

const MOCK_ADMIN_PAYMENTS = [
  { id: '1', member_id: 'u1', period: currentPeriod(), amount: 15000, state: 'validating', proof_text: 'mock', created_at: new Date().toISOString(), members: { name: 'Juan Pérez', email: 'juan@mail.com', status: 'active' } },
  { id: '2', member_id: 'u2', period: currentPeriod(), amount: 15000, state: 'approved',   created_at: new Date().toISOString(), members: { name: 'María González', email: 'maria@mail.com', status: 'active' } },
  { id: '3', member_id: 'u3', period: currentPeriod(), amount: 15000, state: 'pending',    created_at: new Date().toISOString(), members: { name: 'Carlos López', email: 'carlos@mail.com', status: 'moroso' } },
]
