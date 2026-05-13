// MyCoach service worker — push handler + offline caching.

// Bump CACHE_VERSION whenever app HTML/static asset changes need to invalidate
// existing PWA caches. The activate handler purges every cache key that
// doesn't match the current version.
const CACHE_VERSION = "mycoach-v2-hifi";
const STATIC_ASSETS = [
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => null)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never cache API / Supabase — always go to network.
  if (url.pathname.startsWith("/api/") || url.hostname.endsWith(".supabase.co")) {
    return;
  }

  // Stale-while-revalidate for /protocol (offline-able but refreshes when online)
  // AND for icons / manifest. Previously /protocol was cache-first, which meant
  // updates to the page never reached existing PWAs — bumping CACHE_VERSION fixes
  // the current breakage, but SWR keeps future updates flowing without ceremony.
  if (
    url.pathname === "/protocol" ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      }),
    );
    return;
  }

  // Stale-while-revalidate for Next.js static assets (hashed → safe to cache).
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        });
        return cached || fetchPromise;
      }),
    );
  }
});

self.addEventListener("push", (event) => {
  const data = (() => {
    try { return event.data ? event.data.json() : {}; } catch { return {}; }
  })();
  const title = data.title || "MyCoach";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || data.url || "mycoach",
    renotify: !!data.renotify,
    data: { url: data.url || "/", ping_log_id: data.ping_log_id },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const sameOrigin = clients.find((c) => "focus" in c);
      if (sameOrigin) {
        sameOrigin.focus();
        if ("navigate" in sameOrigin) sameOrigin.navigate(targetUrl);
        return;
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
