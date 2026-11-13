// G32 a/b: 🧾 Boleta SII desde la Caja (manual: anota el N° · automática: OpenFactura) + guías ❓ ¿Necesito boleta? y ⚡ paso a paso.
// Uso: node g32_boleta.js [bd]  (antes ./base.sh /home/user/Aplicaciones <bd>)
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/Aplicaciones', process.argv[2] || 'p_g32', { dialogo: (d) => d.type() === 'prompt' ? d.accept('1234') : d.accept() });
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  try {
    await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Codex' }); await t.sim.su('update public.profiles set terms_at = now()');
    const q = t.page;
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.evaluate(() => localStorage.setItem('cfx:tour:orbita-inicio', '1'));
    await q.fill('input[type=email]:visible', 'tienda@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3000);
    // 1) Negocio: Ajustes → 🧾 Boletas: guías y Automática primero.
    await q.goto(t.base + '/#boleta'); await q.waitForTimeout(3000); await t.sinModales(q);
    const g = await q.evaluate(() => ({ nec: !!document.querySelector('#cBoleta #gNecesito'), aut: !!document.querySelector('#cBoleta #gAuto'),
      primero: (document.querySelector('[name=bModo]') || {}).value }));
    ok(g.nec && g.aut, 'guías ❓ ¿Necesito boleta? y ⚡ paso a paso ' + JSON.stringify(g));
    ok(g.primero === 'openfactura', 'Automática aparece primero');
    await q.check('[name=bModo][value=manual]');
    await q.fill('#bRut', '76.123.456-0'); await q.fill('#bRazon', 'Codex SpA'); await q.fill('#bGiro', 'Venta de ropa');
    await q.fill('#bDir', 'Av. Uno 123'); await q.fill('#bComuna', 'Temuco'); await q.click('[data-bo="guardar"]'); await q.waitForTimeout(2000);
    await t.foto('g32-boletas-ajustes', q);
    // 2) Caja (manual): venta → Reporte → SII → escribe folio → queda guardado y se ve al recargar.
    await q.evaluate(() => localStorage.setItem('caja:migrado', '1'));
    await q.evaluate(() => localStorage.setItem('caja:' + Cuenta.account.id + ':ventas', JSON.stringify([
      { id: 'venta0001', t: Date.now() - 60000, medio: 'efectivo', items: [{ id: 'p1', cant: 2, nombre: 'Polera', precio: 5000 }] }])));
    await q.goto(t.base + '/apps/caja/'); await q.waitForTimeout(3000); await t.sinModales(q);
    ok(!!(await q.$('#bBol')), 'Caja tiene botón 🧾 Boleta SII');
    await q.click('nav.tabs button[data-v="reporte"]'); await q.waitForTimeout(1500);
    await q.click('[data-bol="venta0001"]'); await q.waitForTimeout(2500);
    let [r] = await t.sim.su("select folio, total from public.boletas_caja where venta_id = 'venta0001'");
    ok(r && r.folio === '1234' && +r.total === 10000, 'manual: folio anotado en la base ' + JSON.stringify(r));
    await q.goto(t.base + '/apps/caja/'); await q.waitForTimeout(3000); await t.sinModales(q);
    await q.click('nav.tabs button[data-v="reporte"]'); await q.waitForTimeout(1500);
    const lista = await q.evaluate(() => document.getElementById('r-lista').innerText);
    ok(/SII N° 1234/.test(lista) && !(await q.$('[data-bol="venta0001"]')), 'al recargar la venta muestra SII N° 1234 y ya no pide boleta');
    // 3) Automática: OpenFactura responde folio 555 → venta nueva → SII → boleta emitida (con Idempotency-Key).
    await t.sim.su("update public.boleta_cuentas set modo = 'openfactura', apikey = 'abcdefghijklmnop1234'");
    await t.sim.su("insert into extensions.http_respuestas values ('https://api.haulmer.com/v2/dte/document', 200, '{\"FOLIO\": \"555\", \"SELF_SERVICE\": {\"url\": \"https://of.cl/b/555\"}}')");
    await q.evaluate(() => { const k = 'caja:' + Cuenta.account.id + ':ventas'; const v = JSON.parse(localStorage.getItem(k));
      v.push({ id: 'venta0002', t: Date.now(), medio: 'tarjeta', items: [{ id: 'p1', cant: 1, nombre: 'Polera (M)', precio: 7000, opcion: 'M' }] }); localStorage.setItem(k, JSON.stringify(v)); });
    await q.goto(t.base + '/apps/caja/'); await q.waitForTimeout(3000); await t.sinModales(q);
    await q.click('nav.tabs button[data-v="reporte"]'); await q.waitForTimeout(1500);
    await q.click('[data-bol="venta0002"]'); await q.waitForTimeout(2500);
    [r] = await t.sim.su("select folio, url from public.boletas_caja where venta_id = 'venta0002'");
    ok(r && r.folio === '555' && r.url === 'https://of.cl/b/555', 'automática: boleta 555 emitida ' + JSON.stringify(r));
    const [h] = await t.sim.su("select content, headers from extensions.http_log where uri like '%haulmer%' order by n desc limit 1");
    ok(h && /Idempotency-Key/.test(h.headers) && /"MntTotal": 7000/.test(h.content) && /Polera \(M\)"/.test(h.content), 'envía a OpenFactura total 7000 y nombre sin repetir talla');
    const p = await q.evaluate(() => (document.querySelector('.cfx-comp .cb-papel') || {}).innerText || '');
    ok(/Boleta electrónica SII N° 555/.test(p) && !/No es boleta/.test(p), 'el comprobante muestra la boleta SII N° 555');
    await t.foto('g32-caja-boleta', q);
    // 4) Registro de ventas muestra el folio de Caja.
    await q.goto(t.base + '/'); await q.waitForTimeout(1500); await q.goto(t.base + '/#boleta'); await q.waitForTimeout(3000); await t.sinModales(q);
    await q.click('#bRegistro'); await q.waitForTimeout(2000);
    ok(/SII N° 555/.test(await q.evaluate(() => document.getElementById('registro').innerText)), 'Registro de ventas muestra SII N° 555');
  } catch (e) { console.log('✗ ' + e.message); process.exitCode = 1; } finally { await t.cerrar(); }
})();
