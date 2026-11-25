/* Finora service worker: keeps the app's own files on the device so it opens instantly and works with no internet.
   It only ever handles files from this same site. It never sees your data (that lives in localStorage, not in the cache). */
const V = 'finora-device-v1';
const FILES = ['./', 'index.html', 'app.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'privacy.html', 'terms.html', 'logos/index.json',
  'js/local.js', 'js/core.js', 'js/views.js', 'js/views2.js', 'js/settings.js', 'js/report.js', 'js/legal.js', 'js/fin.js', 'js/quickadd.js', 'js/auth.js'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(V).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {}))))); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())));
/* stale-while-revalidate: answer from the device at once, refresh the copy quietly when online */
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || (e.request.mode === 'navigate' ? c.match('index.html') : Response.error());
  }));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.matchAll({ type: 'window' }).then(l => l.length ? l[0].focus() : clients.openWindow('./'))); });
