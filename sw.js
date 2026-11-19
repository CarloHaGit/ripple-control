// Service Worker: hält die Seite offline verfügbar (WLAN in der Ausstellung ist unsicher).
// Strategie: zuerst aus dem Cache antworten, im Hintergrund nachladen (neue Version beim nächsten Start).
const CACHE = 'ripple-score-v6';
const DATEIEN = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const schluessel = req.mode === 'navigate' ? './index.html' : req;
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const alt = await c.match(schluessel, { ignoreSearch: true });
      const neu = fetch(req)
        .then((r) => {
          if (r.ok) c.put(schluessel, r.clone());
          return r;
        })
        .catch(() => alt);
      if (alt) {
        e.waitUntil(neu.catch(() => {}));
        return alt;
      }
      return neu;
    }),
  );
});
