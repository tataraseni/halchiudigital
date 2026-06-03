const CACHE_VERSION = "halchiu-v5";
const API_CACHE = "halchiu-api-v5";

const PRECACHE = ["/", "/primaria", "/servicii", "/evenimente", "/comunitate", "/afaceri", "/profil", "/offline.html"];
const API_ROUTES = [
  "/api/posts",
  "/api/events",
  "/api/reports",
  "/api/businesses",
  "/api/settings",
  "/api/notifications",
  "/api/services",
  "/api/transport",
  "/api/announcements",
];
const SKIP_CACHE = ["/api/auth", "/api/admin", "/api/push"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION && k !== API_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  if (e.request.method !== "GET") return;
  if (SKIP_CACHE.some(p => url.pathname.startsWith(p))) return;

  // API: stale-while-revalidate
  if (API_ROUTES.some(p => url.pathname.startsWith(p))) {
    e.respondWith(
      caches.open(API_CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        const networkFetch = fetch(e.request)
          .then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          })
          .catch(() => null);
        return cached ?? (await networkFetch) ?? new Response(
          JSON.stringify([]),
          { status: 200, headers: { "Content-Type": "application/json", "X-Offline": "true" } }
        );
      })
    );
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() =>
          caches.match(e.request).then(c => c ?? caches.match("/offline.html"))
        )
    );
    return;
  }

  // Static assets: cache-first with network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && res.type !== "opaque") {
          caches.open(CACHE_VERSION).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => caches.match("/offline.html") ?? new Response("Offline", { status: 503 }));
    })
  );
});

// ── Web Push ─────────────────────────────────────────────────────────────────
self.addEventListener("push", (e) => {
  if (!e.data) return;
  let data = {};
  try { data = e.data.json(); } catch { data = { title: "Hălchiu Digital", body: e.data.text() }; }

  const { title = "Hălchiu Digital", body = "", icon = "/icon-192.png", badge = "/icon-192.png", url = "/" } = data;

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url },
      vibrate: [100, 50, 100],
      requireInteraction: false,
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(wins => {
      for (const win of wins) {
        if (win.url.includes(self.location.origin) && "focus" in win) {
          win.navigate(url);
          return win.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
  if (e.data === "REFRESH_CACHE") {
    caches.open(API_CACHE).then(cache => {
      API_ROUTES.forEach(route => {
        fetch(route)
          .then(res => { if (res.ok) cache.put(route, res); })
          .catch(() => {});
      });
    });
  }
});
