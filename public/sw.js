/* Bandurrias TRT — service worker
 *
 * Minimal, deploy-safe:
 *   · No precache of hashed build assets (avoids serving stale JS after deploy).
 *   · Network-first navigation with an offline fallback to the cached shell.
 *   · Web Push: shows notifications from server-sent payloads.
 *   · Notification click: focuses an existing tab or opens the target URL.
 */

const SHELL_CACHE = 'btrt-shell-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(['/', '/index.html', '/icons/icon-192.png']).catch(() => {})
    )
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  // Only intercept page navigations — let everything else hit the network normally.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    )
  }
})

/* ── Web Push ──────────────────────────────────────────────────────────── */
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} }
  catch { data = { body: event.data && event.data.text ? event.data.text() : '' } }

  const title = data.title || 'Bandurrias TRT'
  const options = {
    body:  data.body || '',
    icon:  data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag:   data.tag || undefined,
    data:  { url: data.url || '/' },
    vibrate: [80, 40, 80],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) { client.navigate(url); return client.focus() }
      }
      return self.clients.openWindow(url)
    })
  )
})
