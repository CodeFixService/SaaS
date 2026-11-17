// G92 a · Bloque núcleo: G87 G 🔤 textos dentro de su caja + letra delgada de fábrica + Perfil → tamaño (rango leve) y grosor,
//         "aprende" (sugiere letra más grande si agrandas con los dedos) · G66 🎯 íconos de la barra centrados.
// FALLA con el código viejo (sin CFX_LETRA ni [data-lt]). Uso: node g92a.js   (ANCHO=320 opcional)
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  execSync(__dirname + '/base.sh /home/user/emprendedor p_g92a', { stdio: 'ignore' });
  const t = await abrir('/home/user/emprendedor', 'p_g92a'); const p = t.page;
  try {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123'); const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()'); await c.query("select public.crear_negocio('Almacén Ana','almacen',true)"); c.release();
    await p.goto(t.base + '/#ingresar'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'dueno@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(p);
    ok(await p.evaluate(() => !!window.CFX_LETRA), 'CFX_LETRA existe');
    // ---------- de fábrica: delgada (nada en 800/900) y textos que no se salen ----------
    const pesos = () => p.evaluate(() => { const n = {}; document.querySelectorAll('body *').forEach((e) => { const w = getComputedStyle(e).fontWeight; n[w] = (n[w] || 0) + 1; }); return n; });
    const w0 = await pesos();
    ok(await p.evaluate(() => document.documentElement.dataset.cfxGrosor) === 'delgada' && !w0['800'] && !w0['900'], '🔤 de fábrica delgada: ningún texto en 800/900 ' + JSON.stringify(w0));
    ok(await p.evaluate(() => getComputedStyle(document.body).overflowWrap) === 'anywhere', '📦 textos se parten dentro de su caja (overflow-wrap)');
    await p.evaluate(() => { const d = document.createElement('p'); d.id = 'largo'; d.textContent = 'https://ejemplo.cl/' + 'muy'.repeat(60); (document.querySelector('main, .card, #app') || document.body).appendChild(d); });
    ok(await t.anchoOk(p), '📦 un link larguísimo no ensancha la pantalla');
    await p.evaluate(() => document.getElementById('largo').remove());
    // ---------- G66 🎯 barra: cada ícono centrado en su botón ----------
    const barra = await p.evaluate(() => [...document.querySelectorAll('nav.cfx-barra > a, nav.cfx-barra > button')].filter((b) => b.offsetParent).map((b) => {
      const r = b.getBoundingClientRect(), i = b.querySelector('.cfx-ico, svg, span'); const q = i ? i.getBoundingClientRect() : r; return Math.abs((q.left + q.right) / 2 - (r.left + r.right) / 2); }));
    ok(barra.length >= 3 && barra.every((d) => d < 1.5), '🎯 íconos de la barra centrados (desvío px: ' + barra.map((d) => d.toFixed(1)).join(', ') + ')');
    await t.foto('g92a-barra');
    // ---------- Perfil → Color y modo → tamaño y grosor ----------
    await p.evaluate(() => window.CFX_PERFIL.abrir('estilo')); await p.waitForTimeout(900);
    const lt = p.locator('.cfx-hoja-m [data-lt]').last();
    ok(await lt.count() === 1 && await p.locator('.cfx-hoja-m [data-lg]').count() === 3, 'Perfil → Color y modo: tamaño (rango) y 3 grosores');
    await t.foto('g92a-perfil');
    await lt.evaluate((i) => { i.value = '4'; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); }); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.documentElement.style.zoom) === '1.12', '🔤 tamaño máx 112 % aplicado');
    ok(await t.anchoOk(p), '🔤 con 112 % no se sale del ancho');
    await p.click('.cfx-hoja-m [data-lg=gruesa]'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.documentElement.dataset.cfxGrosor === 'gruesa' && getComputedStyle(document.body).fontWeight === '500'), '🔤 gruesa: texto normal en 500');
    await p.reload(); await p.waitForTimeout(2500);
    ok(await p.evaluate(() => document.documentElement.style.zoom === '1.12' && document.documentElement.dataset.cfxGrosor === 'gruesa'), '💾 se mantiene al recargar');
    await t.sinModales(p);
    await p.evaluate(() => window.CFX_PERFIL.abrir('estilo')); await p.waitForTimeout(900);
    await p.click('.cfx-hoja-m [data-lg=normal]'); await p.locator('.cfx-hoja-m [data-lt]').last().evaluate((i) => { i.value = '2'; i.dispatchEvent(new Event('change')); }); await p.waitForTimeout(400);
    ok(await p.evaluate(() => !document.documentElement.style.zoom && !document.documentElement.dataset.cfxGrosor), '↺ normal y 100 %: sin zoom ni reescritura');
    // ---------- aprende: 3 veces agrandando con los dedos → sugiere (y se acepta) ----------
    const c0 = (await t.sim.su('select 1')).length; void c0;
    await p.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.startsWith('cfx-letra:')); const g = JSON.parse(localStorage.getItem(k)); g.s = 2; localStorage.setItem(k, JSON.stringify(g)); });
    await p.reload(); await p.waitForTimeout(2000);
    await p.evaluate(() => { Object.defineProperty(visualViewport, 'scale', { get: () => 1.6 }); visualViewport.dispatchEvent(new Event('resize')); }); await p.waitForTimeout(1600);
    ok(await p.evaluate(() => document.documentElement.style.zoom) === '1.06', '🧠 aprende: sugiere y sube un paso (106 %)');
    ok(!t.errores.filter((e) => !/favicon|ERR_|Failed to load/.test(e)).length, 'sin errores: ' + t.errores.slice(0, 3).join(' | '));
  } finally { await t.cerrar(); }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ todo ok'); process.exit(f ? 1 : 0);
})();
