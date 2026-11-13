// G30: 🎟️ Cupones y sellos juntos en Pedidos (sin "Promociones") · 📖 instructivos en Boletas y Despacho · 📋 Registro de ventas en formato boleta.
// Uso: node g30_ventas.js [bd]  (antes ./base.sh /home/user/Aplicaciones <bd>)
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/Aplicaciones', process.argv[2] || 'p_g30');
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  try {
    await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Codex' }); await t.sim.su('update public.profiles set terms_at = now()');
    const q = t.page;
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.evaluate(() => localStorage.setItem('cfx:tour:orbita-inicio', '1'));
    await q.fill('input[type=email]:visible', 'tienda@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3000);
    // 1) Negocio: Pedidos → 🎟️ Cupones y sellos → Tarjeta de sellos → Guardar → recargar → sigue.
    await q.goto(t.base + '/apps/pedidos/?v=cupones'); await q.waitForTimeout(3000); await t.sinModales(q);
    const tab = await q.evaluate(() => document.querySelector('#subtabs [data-v=cupones]').innerText.trim());
    ok(tab === 'Cupones y sellos', 'pestaña dice "Cupones y sellos": ' + tab);
    await q.fill('#tSellos', '5'); await q.fill('#tPremio', 'Un café'); await q.click('#bSellos'); await q.waitForTimeout(1500);
    await q.goto(t.base + '/apps/pedidos/?v=cupones'); await q.waitForTimeout(3000); await t.sinModales(q);
    ok(await q.inputValue('#tSellos') === '5' && await q.inputValue('#tPremio') === 'Un café', 'tarjeta de sellos guardada y se ve al recargar');
    await t.foto('g30-cupones-sellos', q);
    // 2) Ajustes: Mi tienda ya no tiene sellos; guardar la tienda no borra la tarjeta.
    await q.goto(t.base + '/#ajustes'); await q.waitForTimeout(3000); await t.sinModales(q);
    ok(!(await q.$('#tSellos')), 'Ajustes → Mi tienda ya no muestra sellos');
    await q.evaluate(() => document.getElementById('bTienda').click()); await q.waitForTimeout(2000);
    const [{ m }] = await t.sim.su("select s.meta::text m from public.cfx_sellos_cfg s join public.profiles p on p.id = s.owner_id where p.email = 'tienda@x.cl'");
    ok(m === '5', 'guardar Mi tienda conserva la tarjeta: ' + m);
    const menu = await q.evaluate(() => document.body.innerHTML.includes('Promociones: cupones'));
    ok(!menu, 'el menú ya no dice "Promociones"');
    // 3) Boletas y Despacho: instructivo desplegable.
    await q.goto(t.base + '/'); await q.waitForTimeout(1500); await q.goto(t.base + '/#boleta'); await q.waitForTimeout(3000); await t.sinModales(q);
    const guias = await q.evaluate(() => ['cBoleta', 'cDespacho'].map((id) => !!document.querySelector('#' + id + ' details.guia')));
    ok(guias[0] && guias[1], '📖 ¿Cómo se usa? en Boletas y Despacho ' + JSON.stringify(guias));
    // Datos de boleta (firma) → Guardar.
    await q.fill('#bRut', '76.123.456-0'); await q.fill('#bRazon', 'Codex SpA'); await q.fill('#bGiro', 'Venta de ropa');
    await q.fill('#bDir', 'Av. Uno 123'); await q.fill('#bComuna', 'Temuco'); await q.click('[data-bo="guardar"]'); await q.waitForTimeout(2000);
    // 4) Una venta de Caja → 📋 Registro de ventas → 🧾 Ver → formato boleta.
    await q.evaluate(() => {
      const id = Cuenta.account.id;
      localStorage.setItem('caja:' + id + ':ventas', JSON.stringify([{ id: 'abc123xyz', t: Date.now(), medio: 'efectivo', items: [{ cant: 2, nombre: 'Polera', precio: 5000 }] }]));
    });
    await q.goto(t.base + '/'); await q.waitForTimeout(1500); await q.goto(t.base + '/#boleta'); await q.waitForTimeout(3000); await t.sinModales(q);
    await q.click('#bRegistro'); await q.waitForTimeout(2000);
    const lista = await q.evaluate(() => document.getElementById('registro').innerText);
    ok(/Caja N° 123XYZ/.test(lista) && /\$10\.000/.test(lista), 'registro lista la venta de Caja: ' + lista.replace(/\n/g, ' '));
    await q.click('[data-reg="0"]'); await q.waitForTimeout(2000);
    const p = await q.evaluate(() => (document.querySelector('.cfx-comp .cb-papel') || {}).innerText || '');
    ok(/Codex SpA/.test(p) && /RUT 76\.123\.456-0/.test(p) && /Fecha/.test(p) && /Hora/.test(p) && /TOTAL/.test(p) && /Firma y timbre/.test(p), 'formato boleta con razón social, RUT, fecha, hora, total y firma: ' + p.replace(/\n/g, ' | '));
    ok(!!(await q.$('.cfx-comp [data-a="print"]')), 'botón 🖨️ Imprimir o guardar PDF');
    await t.foto('g30-boleta', q);
  } catch (e) { console.log('✗ ' + e.message); process.exitCode = 1; } finally { await t.cerrar(); }
})();
