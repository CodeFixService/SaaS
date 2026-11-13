// G32 c: 🖨️ Impresora térmica Bluetooth en el comprobante de Caja (Web Bluetooth simulado: se guardan los bytes que llegan).
// Uso: node g32_impresora.js [bd]  (antes ./base.sh /home/user/Aplicaciones <bd>)
const { abrir } = require('./h');
const BT = () => {
  window.__bt = { bytes: [], pide: 0 };
  const car = { properties: { writeWithoutResponse: true, write: true }, service: { device: { gatt: { connected: true } } },
    writeValueWithoutResponse: async (b) => { window.__bt.bytes.push(...b); } };
  const dev = { id: 'imp1', name: 'MTP-II', gatt: { connected: true, connect: async () => ({ getPrimaryServices: async () => [{ getCharacteristics: async () => [car] }] }) } };
  car.service.device = dev;
  Object.defineProperty(navigator, 'bluetooth', { value: { requestDevice: async () => { window.__bt.pide++; return dev; }, getDevices: async () => [dev] } });
};
(async () => {
  const t = await abrir('/home/user/Aplicaciones', process.argv[2] || 'p_g32i', {});
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  try {
    await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Café Ñandú' }); await t.sim.su('update public.profiles set terms_at = now()');
    const q = t.page;
    await q.addInitScript(BT);
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.evaluate(() => localStorage.setItem('cfx:tour:orbita-inicio', '1'));
    await q.fill('input[type=email]:visible', 'tienda@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3000);
    await q.evaluate(() => { localStorage.setItem('caja:migrado', '1'); localStorage.setItem('caja:' + Cuenta.account.id + ':ventas', JSON.stringify([
      { id: 'venta0001', t: Date.now() - 60000, medio: 'efectivo', items: [{ id: 'p1', cant: 2, nombre: 'Café con leche de almendra grande', precio: 2500 }] }])); });
    await q.goto(t.base + '/apps/caja/'); await q.waitForTimeout(3000); await t.sinModales(q);
    await q.click('nav.tabs button[data-v="reporte"]'); await q.waitForTimeout(1500);
    await q.click('[data-comp="venta0001"]'); await q.waitForTimeout(1500);
    ok(!!(await q.$('.cfx-comp [data-a="bt"]')), 'comprobante tiene 🖨️ Impresora Bluetooth');
    await q.click('.cfx-comp [data-a="bt"]'); await q.waitForTimeout(1500);
    const r = await q.evaluate(() => ({ b: window.__bt.bytes, pide: window.__bt.pide, msj: document.querySelector('.cb-btmsg').textContent }));
    const txt = Buffer.from(r.b).toString('latin1');
    ok(r.b[0] === 0x1B && r.b[1] === 0x40 && r.b[3] === 0x74 && r.b[4] === 2, 'empieza con ESC @ y tabla PC850');
    ok(/TOTAL +\$5\.000/.test(txt) && /No es boleta electr/.test(txt), 'imprime TOTAL $5.000 y "No es boleta electrónica"');
    ok(r.b.includes(0xA5) && r.b.includes(0xA2), 'Ñ y ó llegan en PC850');
    const lineas = txt.split('\n').filter((l) => /^[ -~]*$/.test(l));
    ok(lineas.every((l) => l.replace(/\x1b..|\x1d..|\x1b.|\x1d./g, '').length <= 32), 'ninguna línea pasa de 32 caracteres (58 mm)');
    ok(/Impreso/.test(r.msj), 'avisa ✅ Impreso: ' + r.msj);
    await t.foto('g32-impresora', q);
    // Recargar: 80 mm queda guardado y la misma impresora se reusa sin volver a elegirla.
    await q.click('.cb-bt summary'); await q.click('.cfx-comp [data-a="p80"]');
    await q.goto(t.base + '/apps/caja/'); await q.waitForTimeout(3000); await t.sinModales(q);
    await q.click('nav.tabs button[data-v="reporte"]'); await q.waitForTimeout(1500);
    await q.click('[data-comp="venta0001"]'); await q.waitForTimeout(1000);
    ok(/80 mm/.test(await q.textContent('.cb-bt summary')), 'al recargar sigue en papel 80 mm');
    await q.click('.cfx-comp [data-a="bt"]'); await q.waitForTimeout(1500);
    const r2 = await q.evaluate(() => ({ pide: window.__bt.pide, n: window.__bt.bytes.length }));
    ok(r2.pide === 0 && r2.n > 100, 'reusa la impresora sin mostrar la lista otra vez');
    // Sin Bluetooth (iPhone): avisa y no se cae.
    const p2 = await t.ctx.newPage();
    await p2.addInitScript(() => { Object.defineProperty(navigator, 'bluetooth', { value: undefined }); });
    await p2.goto(t.base + '/apps/caja/'); await p2.waitForTimeout(3000); await t.sinModales(p2);
    await p2.click('nav.tabs button[data-v="reporte"]'); await p2.waitForTimeout(1500);
    await p2.click('[data-comp="venta0001"]'); await p2.waitForTimeout(800); await p2.click('.cfx-comp [data-a="bt"]');
    ok(/iPhone no deja/.test(await p2.textContent('.cb-btmsg')), 'sin Bluetooth avisa (iPhone) y sugiere PDF');
  } catch (e) { console.log('✗ ' + e.message); process.exitCode = 1; } finally { await t.cerrar(); }
})();
