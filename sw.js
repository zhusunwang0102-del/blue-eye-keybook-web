const CACHE_NAME = "blue-eye-keybook-web-6b50da58b6f921e3";
const APP_SHELL = [
  "./",
  "./app.js",
  "./assets/black-cat-guardian.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./features.css",
  "./features.js",
  "./index.html",
  "./manifest.webmanifest",
  "./manual/images/access-menu.webp",
  "./manual/images/access-token.webp",
  "./manual/images/account_config.webp",
  "./manual/images/blankform.webp",
  "./manual/images/detail.webp",
  "./manual/images/detail_full.webp",
  "./manual/images/feature-home.webp",
  "./manual/images/home.webp",
  "./manual/images/home_dark.webp",
  "./manual/images/home_light.webp",
  "./manual/images/logs.webp",
  "./manual/images/manual-cover.png",
  "./manual/images/model-guide-1.webp",
  "./manual/images/model-guide-2.webp",
  "./manual/images/model-guide-3.webp",
  "./manual/images/model-guide-4.webp",
  "./manual/images/model-guide-5.webp",
  "./manual/images/model-guide-6.webp",
  "./manual/images/model-guide-7.webp",
  "./manual/images/notes-bottom.webp",
  "./manual/images/notes-top.webp",
  "./manual/images/overview.webp",
  "./manual/images/overview_filters.webp",
  "./manual/images/paste.webp",
  "./manual/images/profile-id.webp",
  "./manual/images/profile-menu.webp",
  "./manual/images/recognition.webp",
  "./manual/images/review-card.webp",
  "./manual/images/review-config.webp",
  "./manual/images/review-export.webp",
  "./manual/images/review-output.webp",
  "./manual/images/security.webp",
  "./manual/images/unlock.webp",
  "./manual/index.html",
  "./model-status.css",
  "./model-status.js",
  "./styles.css",
  "./web.css",
  "./web.js"
];
const knownUrls = new Set(APP_SHELL.map((path) => new URL(path, self.registration.scope).href));

self.addEventListener("install", (event) => {
  // Cache a complete version. Existing pages keep their version until they close or request an update.
  const requests = APP_SHELL.map((path) => new Request(new URL(path, self.registration.scope), { cache: "reload" }));
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(requests)));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("blue-eye-keybook-") && key !== CACHE_NAME).map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  url.search = "";
  url.hash = "";
  if (!knownUrls.has(url.href)) return;
  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => {
    const cached = await cache.match(url.href);
    return cached || fetch(request);
  }));
});
