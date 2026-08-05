/* Family Travel Atlas service worker — read-mostly offline cache.
 * Strategy:
 * - App shell / static chunks: CacheFirst
 * - HTML navigations: NetworkFirst → last cached page
 * - Map CDN textures: CacheFirst (CORS permitting)
 * - Never cache auth API or mutating requests
 */
const VERSION = "fta-offline-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const ASSET_CACHE = `${VERSION}-assets`;

const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/map",
  "/trips",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/~offline",
];

const TEXTURE_HOSTS = new Set(["cdn.jsdelivr.net"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { credentials: "same-origin" });
            if (res.ok) await cache.put(url, res.clone());
          } catch {
            /* ignore individual precache failures */
          }
        }),
      );
      // Stay waiting so the client can prompt “Update available”.
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("fta-offline-") && !key.startsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isAuthApi(url) {
  return url.pathname.startsWith("/api/auth");
}

function isMutable(request) {
  return request.method !== "GET" && request.method !== "HEAD";
}

function isNextStatic(url) {
  return url.pathname.startsWith("/_next/static/");
}

function isSameOriginAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/icons/") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".jpg") ||
      url.pathname.endsWith(".jpeg") ||
      url.pathname.endsWith(".webp") ||
      url.pathname.endsWith(".woff2"))
  );
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const offline = await caches.match("/~offline");
      if (offline) return offline;
    }
    throw new Error("offline");
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && fresh.ok) {
    cache.put(request, fresh.clone());
  }
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (isMutable(request)) return;

  const url = new URL(request.url);

  if (isAuthApi(url)) return;

  // Cross-origin map textures
  if (TEXTURE_HOSTS.has(url.hostname)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (isNextStatic(url) || isSameOriginAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Cache countries catalog for offline map search helpers
  if (url.pathname === "/api/countries") {
    event.respondWith(networkFirst(request, ASSET_CACHE));
    return;
  }

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }

  // RSC / flight payloads and other same-origin GETs: try network, fall back cache
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }
});
