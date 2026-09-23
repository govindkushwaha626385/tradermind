// ──────────────────────────────────────────────
// TradeMind — Service Worker (PWA)
//
// Strategy:
// - Cache First for static assets (fonts, images, CSS, JS)
// - Network First with cache fallback for API calls
// - Stale-While-Revalidate for HTML pages
// ──────────────────────────────────────────────

const CACHE_NAME = 'trademind-v1';
const STATIC_CACHE = 'trademind-static-v1';
const API_CACHE = 'trademind-api-v1';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
];

// ── Install ────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_ASSETS)
    ).then(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
            .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests, chrome-extension, and browser-sync
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // API calls — Network First
  if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirstWithFallback(request, API_CACHE));
    return;
  }

  // Static assets — Cache First
  if (/\.(js|css|png|jpg|jpeg|gif|svg|webp|woff2?|ico)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(cacheFirstWithFallback(request, STATIC_CACHE));
    return;
  }

  // HTML pages — Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ── Strategies ─────────────────────────────────────────────────────

async function cacheFirstWithFallback(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstWithFallback(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request).then((response) => {
    if (response.ok) {
      caches.open(STATIC_CACHE).then((cache) => cache.put(request, response.clone()));
    }
    return response;
  }).catch(() => null);

  return cached ?? await networkPromise ?? new Response('Offline', { status: 503 });
}
