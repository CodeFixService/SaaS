// G24 · 🧹 Limpiar y abrir (núcleo carga.js ?cfx-limpio=1&cfx-cero=1): borra caché, service worker, datos guardados y sesión, y abre la app como recién instalada.
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/Aplicaciones', process.argv[2] || 'p_g24');
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  try {
    await t.sim.crearUsuario('limpia@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Limpia' }); await t.sim.su('update public.profiles set terms_at = now()');
    const q = t.page;
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.evaluate(() => localStorage.setItem('cfx:tour:orbita-inicio', '1'));
    await q.fill('input[type=email]:visible', 'limpia@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3000);
    await q.evaluate(async () => { sessionStorage.setItem('x', '1'); document.cookie = 'galleta=1; path=/'; const c = await caches.open('vieja'); await c.put('/vieja.txt', new Response('v')); indexedDB.open('bd-vieja'); });
    const antes = await q.evaluate(() => [localStorage.length, [...document.querySelectorAll('input[type=password]')].some((i) => i.offsetParent)]);
    await q.goto(t.base + '/?cfx-limpio=1&cfx-cero=1'); await q.waitForTimeout(3500);
    const d = await q.evaluate(async () => [location.search, localStorage.getItem('cfx:tour:orbita-inicio'), sessionStorage.getItem('x'), document.cookie.includes('galleta'),
      (await caches.keys()).includes('vieja'), indexedDB.databases ? (await indexedDB.databases()).some((x) => x.name === 'bd-vieja') : false, [...document.querySelectorAll('input[type=password]')].some((i) => i.offsetParent)]);
    ok(antes[0] > 0 && d[0] === '' && d[1] === null && d[2] === null && !d[3] && !d[4] && !d[5], 'borra caché, guardado, cookies e IndexedDB y queda sin parámetros ' + JSON.stringify([antes, d]));
    ok(d[6], 'abre como recién instalada (pide iniciar sesión)');
    await t.foto('g24-limpia', q);
    const errs = t.errores.filter((e) => !/fichapro\.json|favicon/.test(e));
    ok(!errs.length, 'sin errores de consola ' + JSON.stringify(errs.slice(0, 5)));
  } catch (e) { console.log('✗ ' + e.stack); process.exitCode = 1; }
  await t.cerrar();
})();
