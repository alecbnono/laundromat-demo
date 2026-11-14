// Service worker for /demo only. It keeps a copy of the demo page and the files it loaded,
// so the demo opens and survives a refresh with the phone's data connection off.
// The real app (forms, order list) is never served from this copy.
const CACHE = "demo-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// The page tells us which files it has already loaded, so we can keep them.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "keep") return;
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        event.data.urls.map((url) =>
          fetch(url)
            .then((res) => (res.ok ? cache.put(url, res) : undefined))
            .catch(() => undefined),
        ),
      ),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Opening or refreshing /demo (any view): the network if there is one, else the kept copy.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put("/demo", copy));
          return res;
        })
        .catch(() => caches.match("/demo").then((kept) => kept ?? Response.error())),
    );
    return;
  }

  // Scripts, styles and images never change under the same address: kept copy first.
  if (url.pathname.startsWith("/_next/static/") || /\.(svg|png|jpg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (kept) =>
          kept ??
          fetch(request).then((res) => {
            const copy = res.clone();
            if (res.ok) caches.open(CACHE).then((cache) => cache.put(request, copy));
            return res;
          }),
      ),
    );
  }
});
