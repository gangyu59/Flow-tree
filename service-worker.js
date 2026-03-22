// Cache version — bump this string to force all clients to update
const CACHE_NAME = 'flow-tree-v4';

const ASSETS = [
    './',
    './index.html',
    './style.css',
    './main.js',
    './menifest.json',
    './service-worker.js',
];

self.addEventListener('install', event => {
    // Skip waiting so the new SW activates immediately
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
            .catch(err => console.error('SW install cache failed:', err))
    );
});

self.addEventListener('activate', event => {
    // Delete all old caches that don't match our current version
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).catch(err => console.error('Fetch failed:', err));
        })
    );
});
