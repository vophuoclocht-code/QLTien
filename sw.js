// Đổi số phiên bản mỗi khi đẩy code mới
const V = 'qlt-v11';
const A = ['./', './index.html', './style.css', './app.js', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png'];

// Cài đặt: tải sẵn TOÀN BỘ file vào bộ nhớ máy
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(A.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
// Kích hoạt: xóa cache của phiên bản cũ
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
// Mở app: lấy từ bộ nhớ máy NGAY (nhanh, không cần mạng), đồng thời âm thầm tải bản mới nếu có mạng
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith(self.location.origin)) return;
  e.respondWith(caches.match(r, {ignoreSearch: true}).then(hit => {
    const net = fetch(r).then(res => { if (res && res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); } return res; }).catch(() => null);
    e.waitUntil(net);
    return hit || net.then(res => res || (r.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
  }));
});
