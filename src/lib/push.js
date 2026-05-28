import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export const PUSH_SUPPORTED =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

export function permissionState() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return await Notification.requestPermission()
}

/** Fire a notification right now via the SW. Works without a server (good for demo). */
export async function showTestNotification() {
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification('Bandurrias TRT', {
    body: '✅ Notificaciones activadas. Así te van a llegar los avisos del equipo.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: '/' },
    vibrate: [80, 40, 80],
  })
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/**
 * Subscribe this device to web push and persist the subscription.
 * Needs VITE_VAPID_PUBLIC_KEY set. Returns the subscription or null.
 */
export async function subscribeToPush(userId) {
  if (!PUSH_SUPPORTED || !VAPID_PUBLIC_KEY) return null

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const json = sub.toJSON()
  if (userId) {
    await supabase.from('push_subscriptions').upsert(
      {
        user_id:  userId,
        endpoint: sub.endpoint,
        p256dh:   json.keys?.p256dh,
        auth:     json.keys?.auth,
      },
      { onConflict: 'endpoint' }
    )
  }
  return sub
}

export async function unsubscribeFromPush() {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

const PUSH_ENDPOINT = import.meta.env.VITE_PUSH_ENDPOINT

/**
 * Ask the bot to broadcast a push to all subscribed members.
 * Best-effort: no-op if VITE_PUSH_ENDPOINT isn't configured. The bot
 * re-verifies the JWT is an admin before sending.
 */
export async function broadcastNotification({ title, body, url, tag }) {
  if (!PUSH_ENDPOINT) return { skipped: true }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return { skipped: true }

  const res = await fetch(PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ title, body, url, tag }),
  })
  return res.ok ? await res.json() : { error: res.status }
}
