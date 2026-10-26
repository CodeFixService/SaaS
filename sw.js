/* Centro de Mando · Service worker
   La app NO se actualiza sola: cada celular usa la versión que tiene guardada hasta que la persona toca
   "Actualizar", y ese botón aparece solo cuando el administrador libera una versión nueva (Administración → Versiones).
   Cada versión vive en su propio caché "cm-app-<versión>" y "cm-meta" guarda cuál se está usando. También recibe las notificaciones. */
const ARCHIVOS = ['./', 'index.html', 'manifest.webmanifest', 'version.json', 'icons/icon-192.png', 'icons/icon-512.png',
  'shared/app.css', 'shared/app.js', 'shared/tema.css', 'shared/config.js', 'shared/vendor/supabase.js',
  'app/', 'app/index.html', 'app/cm.css', 'app/cm.js', 'app/estilo.js', 'app/m-hoy.js', 'app/m-tablero.js', 'app/m-metas.js', 'app/m-cerebro.js',
  'app/m-insights.js', 'app/m-panel.js', 'app/m-mas.js', 'admin/', 'admin/index.html', 'admin/admin.js', 'admin/apps.js', 'shared/iconos.js', 'shared/instalar.js'];
const META = 'cm-meta';
let reinstalando = null;
// "?t=" evita copias viejas del CDN (GitHub guarda archivos hasta 10 minutos).
const pedirVersion = () => fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => r.json()).then((j) => String(j.version));

// Algunos hostings (Cloudflare) redirigen ".../index.html" a ".../": se guarda una copia sin la marca de redirección.
async function limpia(res) {
  if (!res || !res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}
async function versionActual() {
  const r = await (await caches.open(META)).match('actual');
  return r ? r.text() : null;
}
// Descarga todos los archivos de una versión y la deja como la actual (si falta algo, no cambia nada).
async function instalarVersion(v) {
  const c = await caches.open('cm-app-' + v);
  const marca = '?v=' + v + '&t=' + Date.now();
  const conf = await (await fetch('shared/config.js' + marca, { cache: 'no-store' })).text();
  if (!conf.includes("VERSION: '" + v + "'")) throw new Error('La versión ' + v + ' aún se está publicando. Prueba de nuevo en unos minutos.');
  await Promise.all(ARCHIVOS.map(async (f) => {
    const res = await fetch(f + marca, { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo descargar ' + f);
    await c.put(new Request(f), await limpia(res));
  }));
  await (await caches.open(META)).put('actual', new Response(v));
  for (const k of await caches.keys()) if (k.startsWith('cm-') && k !== META && k !== 'cm-app-' + v) await caches.delete(k);
  return v;
}

self.addEventListener('install', (e) => {
  // Primera vez en este celular: guarda la versión publicada hoy. Si ya había una, la conserva.
  e.waitUntil(versionActual().then((v) => v || pedirVersion().then(instalarVersion)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Botón "Actualizar": baja la versión publicada y avisa cuando está lista.
self.addEventListener('message', (e) => {
  if (!e.data || e.data.tipo !== 'actualizar') return;
  const port = e.ports && e.ports[0];
  e.waitUntil(pedirVersion().then(instalarVersion)
    .then((v) => port && port.postMessage({ ok: true, version: v }))
    .catch((err) => port && port.postMessage({ ok: false, error: (err && err.message) || String(err) })));
});

// Primero la versión guardada; si falta un archivo, se pide a internet.
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // Supabase y otros: siempre a internet
  if (/\/(version\.json|sw\.js)$/.test(url.pathname) && !url.searchParams.has('v')) return; // siempre desde internet
  e.respondWith((async () => {
    const v = await versionActual();
    if (!v && !reinstalando) reinstalando = pedirVersion().then(instalarVersion).catch(() => {}).then(() => { reinstalando = null; });
    const c = v ? await caches.open('cm-app-' + v) : null;
    const hit = c && await c.match(req, { ignoreSearch: true });
    if (hit) return limpia(hit);
    try {
      const res = await limpia(await fetch(req));
      if (res.ok && c && url.pathname.startsWith(new URL(self.registration.scope).pathname)) c.put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === 'navigate' && c) return (await limpia(await c.match('index.html'))) || Response.error();
      return Response.error();
    }
  })());
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Centro de Mando', {
    body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: d.tag, data: { url: d.url || '/' }
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url || '/').replace(/^\//, ''), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((l) => {
    for (const c of l) { if (c.url.split('#')[0] === url.split('#')[0] && 'focus' in c) { c.navigate(url); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
