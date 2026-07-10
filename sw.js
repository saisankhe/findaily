// FinDaily service worker v2 — cache-first shell (terms work in airplane mode),
// network-first news, and NO interception of API calls (chat goes straight out).
const CACHE = "findaily-v3";
const SHELL = [
  "./", "./index.html", "./manifest.json",
  "./data/curriculum.js", "./data/news-fallback.js",
  "./js/app.js", "./js/progress.js", "./js/ask-claude.js",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Only same-origin GETs are ours; API calls (api.anthropic.com, POST) pass untouched.
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.endsWith("news-latest.json")) {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
  }
});
