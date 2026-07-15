/* ==========================================================================
   service-worker.js — offline caching for Dashboard v2
   ========================================================================== */

const CACHE_NAME = "dashboard-v2-cache-v3";

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

// Network-first for cross-origin API calls (weather) and for the app shell
// (HTML/CSS/JS) so deploys show up on next reload instead of waiting on a
// cache-name bump. Cache-first only for heavier static assets (icons, data
// snapshots) where staleness for a few minutes doesn't break the layout.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  const isAppCode = url.origin === self.location.origin && /\.(html|css|js)$/.test(url.pathname) || event.request.mode === "navigate";

  if (url.origin !== self.location.origin || isAppCode) {
    event.respondWith(
      fetch(event.request)
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
