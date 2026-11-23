// Service Worker: hält die Seite offline verfügbar (WLAN in der Ausstellung ist unsicher).
// Seite selbst: zuerst übers Netz (immer die neueste Version), nach 3 s oder ohne Netz aus dem Speicher.
// Icons und Manifest: aus dem Speicher, im Hintergrund nachladen.
// Wichtig: immer am Browser-Cache vorbei laden (GitHub Pages schickt max-age=600), sonst landet eine alte Version im Speicher.
const CACHE = 'ripple-score-v18';
const DATEIEN = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
const NETZ_WARTEN_MS = 3000;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(DATEIEN.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
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
  const seite = req.mode === 'navigate';
  const schluessel = seite ? './index.html' : req;
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const alt = await c.match(schluessel, { ignoreSearch: true });
      const neu = fetch(req, { cache: 'no-cache' })
        .then((r) => {
          if (r.ok) c.put(schluessel, r.clone());
          return r;
        });
      if (!alt) return neu;
      if (!seite) {
        e.waitUntil(neu.catch(() => {}));
        return alt;
      }
      // Seite: Netz bevorzugen, aber nicht ewig warten
      const zeit = new Promise((r) => setTimeout(() => r(alt), NETZ_WARTEN_MS));
      e.waitUntil(neu.catch(() => {}));
      return Promise.race([neu.catch(() => alt), zeit]);
    }),
  );
});
