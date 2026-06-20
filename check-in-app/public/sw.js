/* Trinity AD — Staff PWA service worker.
 * Caches the app shell and serves an offline fallback for navigations. */

const CACHE = 'trinity-staff-v1'
const OFFLINE_URL = '/offline.html'
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/icon.svg', OFFLINE_URL]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') {
    return
  }

  // Navigations: network-first, fall back to cached shell / offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE)
        return (await cache.match(request)) || (await cache.match(OFFLINE_URL)) || Response.error()
      })
    )
    return
  }

  // Never cache API traffic.
  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Static assets: cache-first.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((response) => {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
            return response
          })
          .catch(() => cached || Response.error())
    )
  )
})
