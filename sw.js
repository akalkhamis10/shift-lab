/* SHIFT — حصة صفّية · نسخة 3fd1e208 */
const CACHE = 'shift-class-3fd1e208';
const FILES = ['./', './index.html', './play.html', './report.html', './lessons.html', './game.html',
  './fonts-sea.css', './figures.js', './lessons-figures.js', './manifest.webmanifest',
  "./kw/bg-classroom.webp","./kw/boy-happy-lg.webp","./kw/boy-happy-sm.webp","./kw/girl-happy-lg.webp","./kw/girl-happy-sm.webp","./kw/girl-thinking-lg.webp","./kw/girl-thinking-sm.webp","./kw/og-card.jpg","./kw/pack.js","./kw/teacher-main-lg.webp","./kw/teacher-main-sm.webp",
  './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  /* **التطابق يتجاهل معاملات الرابط**: رابطٌ يصل بـ?v=2 أو ?utm=… من واتساب كان
     يخطئ المخزَّن فيسقط بلا شبكة، والمُرجَع حينها undefined لا صفحة. */
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(res => {
      if (res && res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }).catch(() => hit);            /* بلا شبكة: النسخة المخزّنة هي الجواب */
    return hit || net;              /* المخزّن أولاً، والتحديث في الخلفية */
  }));
});
