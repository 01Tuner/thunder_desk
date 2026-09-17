/**
 * Thunder Desk - Progressive Web App Service Worker
 * Provides offline capabilities, caching strategies, and fast loading.
 */

const CACHE_VERSION = 'thunder-desk-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const OFFLINE_URL = '/assets/thunder_desk/offline.html';

// Critical app shell resources to cache on install
const PRECACHE_ASSETS = [
    '/manifest.json',
    OFFLINE_URL,
    '/assets/thunder_desk/images/icons/icon-192x192.png',
    '/assets/thunder_desk/images/icons/icon-512x512.png',
    '/assets/thunder_desk/images/icons/icon-32x32.png',
    '/assets/thunder_desk/images/icons/icon.svg',
    '/assets/thunder_desk/css/dashboard.css',
    '/assets/thunder_desk/js/pwa_init.js'
];

// 1. Install Event: Pre-cache core shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                    console.warn('[PWA SW] Precache warning:', err);
                });
            })
            .then(() => self.skipWaiting())
    );
});

// 2. Activate Event: Cleanup stale caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Fetch Event: Intelligent multi-strategy handling
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignore non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Ignore WebSocket, Socket.io, API mutations, and chrome extensions
    if (
        url.pathname.startsWith('/api/method/frappe.desk') ||
        url.pathname.startsWith('/api/method/upload_file') ||
        url.pathname.startsWith('/socket.io') ||
        url.protocol.startsWith('chrome-extension')
    ) {
        return;
    }

    // Strategy A: Navigation requests (HTML pages) -> Network-first with Offline fallback
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(DYNAMIC_CACHE).then((cache) => {
                            cache.put(request, copy);
                        });
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    // Try cache first
                    const cachedResponse = await caches.match(request);
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Fallback to offline page
                    const offlineFallback = await caches.match(OFFLINE_URL);
                    if (offlineFallback) {
                        return offlineFallback;
                    }
                    return new Response('You are offline. Please reconnect to continue.', {
                        headers: { 'Content-Type': 'text/plain' }
                    });
                })
        );
        return;
    }

    // Strategy B: Static assets (CSS, JS, Images, Fonts) -> Stale-While-Revalidate
    if (
        url.pathname.startsWith('/assets/') ||
        url.pathname.match(/\.(css|js|woff2|woff|ttf|svg|png|jpg|jpeg|webp|gif|ico)$/i)
    ) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                const fetchPromise = fetch(request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            const copy = networkResponse.clone();
                            caches.open(DYNAMIC_CACHE).then((cache) => {
                                cache.put(request, copy);
                            });
                        }
                        return networkResponse;
                    })
                    .catch(() => cachedResponse);

                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // Strategy C: Default Network with Cache Fallback
    event.respondWith(
        fetch(request)
            .then((networkResponse) => {
                return networkResponse;
            })
            .catch(() => {
                return caches.match(request);
            })
    );
});

// 4. Message Event: Support skipWaiting for immediate client updates
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
