/* SHIFT — النموذج · نسخة c771927c */
/* **السياسة نفسها** التي في نسخة النشر (`build-site.mjs`): مخزَّن أولاً وتحديث في
   الخلفية. لا سياسة جديدة — نُقلت كما هي ليبقى سلوك التعافي واحداً. */
const CACHE = 'shift-runner-c771927c';
const FILES = ['./', './index.html', './manifest.webmanifest',
  './favicon.ico', './apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'];
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
  /* **التطابق يتجاهل معاملات الرابط**: رابطٌ يصل بـ`?v=2` أو `?utm=…` كان يخطئ
     المخزَّن فيسقط بلا شبكة، والمُرجَع حينها `undefined` لا صفحة.
     **والتخزين يتجاهلها كذلك** — وهذا نصف القاعدة الذي سقط سهواً: الحفظ تحت العنوان
     كاملاً بمعاملاته ينشئ مدخلاً جديداً كل مرة **ولا يحدّث القديم أبداً**، فيبقى
     المخزَّن الأول يُخدَم وتُحجب النسخة المنشورة. فالمفتاح واحد بلا معاملات. */
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
