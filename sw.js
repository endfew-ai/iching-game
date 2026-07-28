const CACHE_NAME = 'iching-app-shell-v20260710-true-false-snap-v1-hexagram-hunt-v1-reaction-progress-v7-liansuo-route-v1-liansuo-raid-v1-wujian-route-v1-wujian-chain-v1-wanbian-route-v1-wanbian-chaos-v1-jiyi-route-v1-jiyi-prejudge-v1-miaojue-route-v1-miaojue-snap-v1-kongyan-route-v1-kongyan-instant-v1-lingzhen-route-v1-lingzhen-instinct-v1-canying-route-v1-canying-reverse-v1-wuhen-route-v1-wuhen-blink-v1-miji-route-v1-miji-trace-v1-chaopin-route-v1-chaopin-overclock-v1-auto-next-v14-dianguang-route-v1-dianguang-instant-reflex-v1-shanpan-route-v1-shanpan-quick-verdict-v1-yingyin-route-v1-yingyin-afterimage-v1-xinyin-route-v1-xinyin-silent-seal-v1-wuzi-route-v1-wuzi-no-text-v1-xuji-route-v1-xuji-instant-name-v1-kongxiang-route-v1-kongxiang-blind-v1-wunian-route-v1-wunian-direct-v1-yiyan-route-v1-yiyan-direct-v1-shunming-route-v1-shunming-reflex-v1-konghe-route-v1-konghe-collapse-v1-wuxiang-route-v1-wuxiang-vanish-v1-fengbao-route-v1-fengbao-drift-v1-leiting-route-v1-leiting-strike-v1-rilun-route-v1-rilun-break-v1-yueying-route-v1-yueying-mirror-v1-xingmen-route-v1-xingmen-flash-v1-tianyan-route-v1-tianyan-burst-v1-shenshi-chain-v1-shenshi-route-v1-wuji-pressure-v1-wuji-route-v1-focus-shock-v1-option-afterglow-v1-rhythm-window-v1-offset-shadow-v1-half-reveal-v1-yang-count-trap-v1-yin-yang-inversion-v1-half-lock-v1-upper-lower-flip-v1-cluster-rush-v1-answer-vanish-v1-hexagram-flash-v1-name-fragment-v1-name-twin-trap-v1-sequence-trap-v1-decoy-ambush-v1-tempo-ladder-v1-gate-miss-retry-v1-weakness-burst-v1-godspeed-clear-v1-chase-clear-feedback-v1-godspeed-pressure-v1-option-shift-v1-duel-strike-v1-upper-lower-snap-v1-sequence-reflex-v1-silhouette-flash-v1-yao-scan-v1-afterimage-overlay-v1-yao-geometry-v1-mobile-response-v1-safe-refresh-v1-mobile-response-v2'
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/+$/, '')

function withBase(path = '') {
  const cleanPath = path.replace(/^\/+/, '')
  return `${BASE_PATH}/${cleanPath}` || '/'
}

const APP_ROOT = withBase()
const INDEX_PATH = withBase('index.html')
const MANIFEST_PATH = withBase('manifest.webmanifest')
const FAVICON_PATH = withBase('favicon.svg')
const ICONS_PATH = withBase('icons.svg')
const ASSETS_PATH = withBase('assets/')
const AUDIO_PATH = withBase('audio/')
const PWA_PATH = withBase('pwa/')

const APP_SHELL = [
  APP_ROOT,
  INDEX_PATH,
  MANIFEST_PATH,
  FAVICON_PATH,
  withBase('/pwa/icon-180.png'),
  withBase('/pwa/icon-192.png'),
  withBase('/pwa/icon-512.png'),
]

const CACHE_PREFIX = 'iching-app-shell-'
const CACHE_RELEASE = 'symbol-safe-art-v1'
const ACTIVE_CACHE_NAME = `${CACHE_NAME}-${CACHE_RELEASE}`
const RUNTIME_CACHE_LIMIT = 96
const RUNTIME_TRIM_INTERVAL = 12
const APP_SHELL_PATHS = new Set(APP_SHELL)
let runtimeWritesSinceTrim = 0

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(ACTIVE_CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL)),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => (
        key.startsWith(CACHE_PREFIX) && key !== ACTIVE_CACHE_NAME ? caches.delete(key) : null
      ))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'ACTIVATE_WHEN_INTERACTION_SAFE_V1') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    if (!(url.pathname === APP_ROOT || url.pathname === INDEX_PATH)) return
    const networkResponse = fetch(request)
    event.waitUntil(cacheNetworkResponse(request, networkResponse))
    event.respondWith(networkFirst(request, INDEX_PATH, networkResponse))
    return
  }

  if (!isIChingRequest(url)) return

  if (isCriticalRuntimeAsset(url.pathname)) {
    const networkResponse = fetch(request)
    event.waitUntil(cacheNetworkResponse(request, networkResponse))
    event.respondWith(staleWhileRevalidate(request, networkResponse))
    return
  }

  if (isRuntimeAsset(url.pathname)) {
    const networkResponse = fetch(request)
    event.waitUntil(cacheNetworkResponse(request, networkResponse))
    event.respondWith(staleWhileRevalidate(request, networkResponse))
  }
})

function isIChingRequest(url) {
  return url.pathname === APP_ROOT ||
    url.pathname === INDEX_PATH ||
    url.pathname === MANIFEST_PATH ||
    url.pathname === FAVICON_PATH ||
    url.pathname === ICONS_PATH ||
    url.pathname.startsWith(ASSETS_PATH) ||
    url.pathname.startsWith(AUDIO_PATH) ||
    url.pathname.startsWith(PWA_PATH)
}

function isCriticalRuntimeAsset(pathname) {
  return /\.(js|css)$/.test(pathname)
}

function isRuntimeAsset(pathname) {
  return /\.(css|js|json|mp3|wav|woff2?|ttf|otf|png|webp|svg|webmanifest)$/.test(pathname)
}

async function networkFirst(request, fallbackPath, networkResponse) {
  const cache = await caches.open(ACTIVE_CACHE_NAME)
  try {
    const response = await networkResponse
    if (response.ok) return response
    return (await cache.match(request)) ?? (fallbackPath ? await cache.match(fallbackPath) : undefined) ?? response
  } catch {
    return (await cache.match(request)) ?? (fallbackPath ? await cache.match(fallbackPath) : undefined)
  }
}

async function staleWhileRevalidate(request, networkResponse) {
  const cache = await caches.open(ACTIVE_CACHE_NAME)
  const cached = await cache.match(request)
  const fresh = networkResponse
    .then((response) => cached ?? response)
    .catch(() => cached)

  return cached ?? fresh
}

function cacheNetworkResponse(request, networkResponse) {
  return networkResponse
    .then((response) => {
      if (!response.ok) return
      const copy = response.clone()
      return caches
        .open(ACTIVE_CACHE_NAME)
        .then((cache) => cacheAndTrim(cache, request, copy))
    })
    .catch((error) => {
      console.warn('[IChing PWA] Background refresh skipped:', error)
    })
}

async function cacheAndTrim(cache, request, response) {
  try {
    await cache.put(request, response)
    runtimeWritesSinceTrim += 1
    if (runtimeWritesSinceTrim < RUNTIME_TRIM_INTERVAL) return
    runtimeWritesSinceTrim = 0
    await trimRuntimeCache(cache)
  } catch (error) {
    console.warn('[IChing PWA] Runtime cache skipped:', error)
  }
}

async function trimRuntimeCache(cache) {
  const runtimeRequests = (await cache.keys()).filter((request) => {
    const pathname = new URL(request.url).pathname
    return !APP_SHELL_PATHS.has(pathname) && !isCriticalRuntimeAsset(pathname)
  })
  const overflow = runtimeRequests.length - RUNTIME_CACHE_LIMIT
  if (overflow <= 0) return
  await Promise.all(runtimeRequests.slice(0, overflow).map((request) => cache.delete(request)))
}
