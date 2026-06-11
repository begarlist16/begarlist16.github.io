// ============================================================
// service-worker.js — Arsip Begarlist 16 (Main Site)
// Covers: /, /photo/, /video/, /yearbook/, /eyearbook/
// Strategy: Cache-first for shells, network-first for JSON data
// ============================================================

const CACHE_VERSION = 'begarlist16-v1';
const CACHE_STATIC  = CACHE_VERSION + '-static';
const CACHE_DATA    = CACHE_VERSION + '-data';

// Pages & assets to pre-cache on install
const STATIC_FILES = [
  '/',
  '/index.html',
  '/photo/',
  '/photo/index.html',
  '/video/',
  '/video/index.html',
  '/yearbook/',
  '/yearbook/index.html',
  '/eyearbook/',
  '/eyearbook/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ── Install: pre-cache all static shells ─────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ──────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('begarlist16-') && key !== CACHE_STATIC && key !== CACHE_DATA)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: route requests by type ────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // JSON data files → network-first (always fresh), fallback to cache
  if (url.pathname.endsWith('.json')) {
    event.respondWith(networkFirstJSON(request));
    return;
  }

  // HTML pages & assets → cache-first, fallback to network
  event.respondWith(cacheFirstStatic(request));
});

// Network-first strategy for JSON data files
async function networkFirstJSON(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_DATA);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('[]', {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Cache-first strategy for static assets
async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Offline fallback: return root if we can't find the page
    return caches.match('/') || new Response('Offline', { status: 503 });
  }
}
