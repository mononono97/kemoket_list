// 오프라인에서도 사이트를 볼 수 있도록 하는 서비스 워커.
// 페이지(HTML)는 네트워크 우선(온라인이면 항상 최신 반영, 오프라인이면 캐시 사용),
// 아바타 이미지는 캐시 우선(한 번 본 이미지는 이후 오프라인에서도 계속 보임)으로 동작함.
const CACHE_VERSION = "v1";
const CACHE_NAME = `kemoket-cache-${CACHE_VERSION}`;
const SHELL_URLS = ["./", "./index.html", "./favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin || event.request.method !== "GET") return;

  const isAvatar = url.pathname.includes("/avatars/");

  if (isAvatar) {
    // 캐시 우선: 이미 받아둔 아바타는 오프라인에서도 바로 표시
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // 그 외(페이지 본문 등)는 네트워크 우선: 온라인이면 최신 내용, 오프라인이면 캐시로 대체
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
