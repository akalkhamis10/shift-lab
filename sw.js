/* SHIFT — حصة صفّية · نسخة 966a2d9a */
const CACHE = 'shift-class-966a2d9a';
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
     يخطئ المخزَّن فيسقط بلا شبكة، والمُرجَع حينها undefined لا صفحة.
     **والتخزين يتجاهلها كذلك** — وهذا نصف القاعدة الذي سقط سهواً: الحفظ تحت العنوان
     كاملاً بمعاملاته ينشئ مدخلاً جديداً كل مرة **ولا يحدّث القديم أبداً**، فيبقى
     المخزَّن الأول يُخدَم وتُحجب النسخة المنشورة (قِيس على وجهة التجربة: ملفٌّ جديد
     على الخادم وثلاث إعادات تحميل تعرض القديم). فالمفتاح واحد بلا معاملات. */
  const key = (() => { try { const u = new URL(e.request.url); u.search = ''; return u.toString(); }
                       catch (x) { return e.request; } })();
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(res => {
      if (res && res.ok) caches.open(CACHE).then(c => c.put(key, res.clone()));
      return res;
    }).catch(() => hit);            /* بلا شبكة: النسخة المخزّنة هي الجواب */
    return hit || net;              /* المخزّن أولاً، والتحديث في الخلفية */
  }));
});
