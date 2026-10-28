/* Centro de Mando · Service worker
   Cada celular usa la versión que tiene guardada; cuando el administrador libera una versión nueva (Administración → Versiones,
   o al correr instalar.sql) la app la descarga completa y se actualiza sola.
   Cada versión vive en su propio caché "cm-app-<versión>" y "cm-meta" guarda cuál se está usando. También recibe las notificaciones. */
const ARCHIVOS = ['./', 'index.html', 'manifest.webmanifest', 'version.json', 'icons/icon-192.png', 'icons/icon-512.png',
  'shared/app.css', 'shared/app.js', 'shared/ayuda.js', 'shared/premium.js', 'shared/humano.js', 'shared/verificar.js', 'shared/pagos.js', 'shared/respaldo.js', 'shared/voz.js', 'shared/fotos.js', 'shared/auto.js', 'shared/barra.js', 'shared/tema.css', 'shared/config.js', 'shared/vendor/supabase.js',
  'app/', 'app/index.html', 'app/cm.css', 'app/cm.js', 'app/estilo.js', 'app/m-hoy.js', 'app/m-tablero.js', 'app/m-metas.js', 'app/m-cerebro.js',
  'app/m-insights.js', 'app/m-pedidos.js', 'shared/vendor/qrcode.js', 'app/m-panel.js', 'app/m-mas.js', 'admin/', 'admin/index.html', 'admin/admin.js', 'admin/apps.js', 'admin/pagos.js', 'admin/control.js', 'admin/mensajes.js', 'shared/iconos.js', 'shared/instalar.js'];
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

// v4.4: los avisos de algo con hora traen botones "Listo" y "1 hora más": funcionan sin abrir la app.
self.window = self;
try { importScripts('shared/config.js'); } catch (err) { /* sin conexión: los botones abren la app */ }
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: e.data && e.data.text() }; }
  const conItem = /item=[0-9a-f-]{36}/.test(d.url || '');
  e.waitUntil(self.registration.showNotification(d.title || 'Centro de Mando', {
    body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: d.tag, data: { url: d.url || '/', id: d.tag },
    renotify: true, requireInteraction: conItem, vibrate: [200, 100, 200],
    actions: conItem ? [{ action: 'hecho', title: '✓ Listo' }, { action: 'mas1h', title: '⏰ 1 hora más' }] : /#nuevo/.test(d.url || '') ? [{ action: 'abrir', title: '✏️ Anotar' }] : []
  }));
});
async function accionAviso(id, accion) {
  const c = self.BT_CONFIG;
  if (!c || !id) throw new Error('sin datos');
  const r = await fetch(c.SUPABASE_URL + '/rest/v1/rpc/notif_accion', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: c.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + c.SUPABASE_ANON_KEY }, body: JSON.stringify({ p_notif: id, p_accion: accion }) });
  const t = await r.json();
  if (t === 'no') throw new Error('no');
  return self.registration.showNotification(accion === 'hecho' ? '✓ Marcado como listo' : '⏰ Te aviso en 1 hora', { body: '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'ok-' + id, silent: true })
    .then(() => setTimeout(() => self.registration.getNotifications({ tag: 'ok-' + id }).then((l) => l.forEach((n) => n.close())), 4000));
}
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const dat = e.notification.data || {};
  if (e.action === 'hecho' || e.action === 'mas1h') { e.waitUntil(accionAviso(dat.id, e.action).catch(() => self.clients.openWindow(new URL((dat.url || '/').replace(/^\//, ''), self.registration.scope).href))); return; }
  const url = new URL((e.notification.data && e.notification.data.url || '/').replace(/^\//, ''), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((l) => {
    for (const c of l) { if (c.url.split('#')[0] === url.split('#')[0] && 'focus' in c) { c.navigate(url); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
