const CACHE = 'mmo-gorev-v1'

self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(['/']))
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const url = event.request.url
  // Supabase ve API isteklerini her zaman ağdan al
  if (url.includes('supabase.co') || url.includes('/api/')) return

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
