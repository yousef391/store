const CACHE_NAME = 'nova-admin-v4';

// Install — activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate — aggressively clean all old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch — ALWAYS Network-First so PWAs never get trapped with stale code
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never cache API calls, Supabase requests, or non-http schemas
  if (
    request.url.includes('/api/') ||
    request.url.includes('supabase') ||
    !request.url.startsWith('http')
  ) {
    return;
  }

  // Network-first: try network, fall back to cache when offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
