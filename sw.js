/* ══════════════════════════════════════════════════════════
   تأمينات تعز – Service Worker v1.0
   Offline-first caching strategy
══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'taiz-portal-v1.0.0';
const STATIC_CACHE = 'taiz-static-v1';
const DYNAMIC_CACHE = 'taiz-dynamic-v1';

// Files to cache on install
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;600;700;800&family=Cairo:wght@400;600;700;900&display=swap'
];

// ═══ INSTALL ═══
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { mode: 'no-cors' })));
      })
      .then(() => self.skipWaiting())
      .catch(err => {
        console.warn('[SW] Pre-cache failed (some assets may not be available offline):', err);
        return self.skipWaiting();
      })
  );
});

// ═══ ACTIVATE ═══
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ═══ FETCH (Stale-While-Revalidate Strategy) ═══
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension & DevTools
  if (!url.protocol.startsWith('http')) return;

  // Font requests — cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages — network-first with offline fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Everything else — stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ═══ STRATEGIES ═══

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return offline page
    const offlinePage = await caches.match('./index.html');
    return offlinePage || new Response(offlineHTML(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || await fetchPromise || new Response('Offline', { status: 503 });
}

// ═══ OFFLINE FALLBACK HTML ═══
function offlineHTML() {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>غير متصل – تأمينات تعز</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Tajawal', sans-serif;
    background: linear-gradient(135deg, #0f2338 0%, #1A3A5C 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    text-align: center;
    padding: 2rem;
  }
  .icon { font-size: 4rem; margin-bottom: 1rem; }
  h1 { font-size: 1.5rem; margin-bottom: .5rem; color: #C8922A; }
  p { color: rgba(255,255,255,.65); font-size: .9rem; line-height: 1.7; max-width: 360px; margin: 0 auto 1.5rem; }
  button {
    background: linear-gradient(135deg, #C8922A, #a0731f);
    color: #fff;
    border: none;
    padding: 12px 28px;
    border-radius: 8px;
    font-size: .9rem;
    cursor: pointer;
    font-family: inherit;
    font-weight: 700;
  }
</style>
</head>
<body>
  <div>
    <div class="icon">📡</div>
    <h1>لا يوجد اتصال بالإنترنت</h1>
    <p>يبدو أنك غير متصل بالإنترنت. يرجى التحقق من اتصالك والمحاولة مرة أخرى.</p>
    <button onclick="location.reload()">إعادة المحاولة</button>
  </div>
</body>
</html>`;
}

// ═══ PUSH NOTIFICATIONS (Future use) ═══
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'تأمينات تعز', {
      body: data.body || '',
      icon: './icons/icon-192.png',
      badge: './icons/icon-96.png',
      dir: 'rtl',
      lang: 'ar',
      tag: data.tag || 'taiz-notif',
      data: { url: data.url || './' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || './')
  );
});
