/* ==========================================================================
   service-worker.js — offline caching for Dashboard v2
   ========================================================================== */

const CACHE_NAME = "dashboard-v2-cache-v5";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./css/themes.css",
  "./css/mobile.css",
  "./js/app.js",
  "./js/calendar.js",
  "./js/weather.js",
  "./js/oura.js",
  "./js/markets.js",
  "./js/travel.js",
  "./js/birthdays.js",
  "./data/calendar.json",
  "./data/reminders.json",
  "./data/oura.json",
  "./data/trips.json",
  "./data/markets.json",
  "./data/birthdays.csv",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first (with a true no-store fetch, bypassing HTTP/CDN caching) for
// everything except icon images — those are the only assets that never
// change, so they're safe to serve cache-first for instant paint + offline
// support. Data snapshots (data/*.json) and the app shell (html/css/js) all
// go network-first so pushed updates show up on the very next load instead
// of waiting out a cache-name bump or a CDN's max-age window.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  const isIcon = url.origin === self.location.origin && /\/assets\/icons\//.test(url.pathname);

  if (url.origin !== self.location.origin || !isIcon) {
    // cache: "no-store" bypasses the browser's HTTP cache (and any CDN
    // max-age) so "network-first" actually means fresh, not "whatever the
    // disk cache still has from 10 minutes ago."
    const freshRequest = new Request(event.request.url, {
      method: event.request.method,
      headers: event.request.headers,
      mode: url.origin === self.location.origin ? "same-origin" : event.request.mode,
      credentials: event.request.credentials,
      cache: "no-store",
    });
    event.respondWith(
      fetch(freshRequest)
        .then((response) => {
          if (response && response.status === 200 && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
