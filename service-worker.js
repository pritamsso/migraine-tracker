const CACHE_NAME = 'migraine-tracker-v2'
const APP_SHELL = ['./', './index.html']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  // Skip non-http(s) schemes (e.g. chrome-extension://) — Cache API only supports http(s)
  if (!event.request.url.startsWith('http')) return
  // Skip third-party auth / API calls — always fetch live
  const url = new URL(event.request.url)
  if (url.hostname !== self.location.hostname) return
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request)
        .then(response => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy))
          return response
        })
        .catch(() => caches.match('./index.html'))
    })
  )
})
