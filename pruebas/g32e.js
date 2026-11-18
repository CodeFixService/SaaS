// G32 e · 📲 Tarjeta en el celular (núcleo tap.js): Despega Caja y BiciTaller Caja → monto + abrir app de cobro → "✅ Se aprobó" → venta queda 💳 Tarjeta.
// FALLA con el código viejo (no existe el botón 📲 Tarjeta (celular) ni CFX_TAP).
// Uso: ./base.sh /home/user/Aplicaciones p_g32e && ./base.sh /home/user/taller p_g32e_t && ANCHO=320 node g32e.js
const { abrir } = require('./h');
const ANDROID = () => { Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36' }); };
(async () => {
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  // ---------- Despega Pyme → Caja ----------
  let t = await abrir('/home/user/Aplicaciones', 'p_g32e', {});
  try {
    await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Café Ñandú' }); await t.sim.su('update public.profiles set terms_at = now()');
    const q = t.page;
    await q.addInitScript(ANDROID);
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.evaluate(() => localStorage.setItem('cfx:tour:orbita-inicio', '1'));
    await q.fill('input[type=email]:visible', 'tienda@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3000);
    await q.evaluate(() => { localStorage.setItem('caja:migrado', '1'); localStorage.setItem('caja:' + Cuenta.account.id + ':productos', JSON.stringify([{ id: 'p1', nombre: 'Café', precio: 2500, costo: 0, stock: '' }])); });
    await q.goto(t.base + '/apps/caja/'); await q.waitForTimeout(3000); await t.sinModales(q);
    ok(await q.locator('#pago [data-m="tap"]:visible').count() === 1, '📲 Caja tiene "Tarjeta (celular)"');
    const agregar = async () => { await q.evaluate(() => { const b = document.querySelector('[data-add="p1"], [data-p="p1"], [data-id="p1"]'); if (b) b.click(); }); await q.waitForTimeout(400); };
    await agregar(); await agregar();
    ok(/5\.000/.test(await q.textContent('#ticketTotal')), 'ticket $5.000');
    await q.click('#pago [data-m="tap"]'); await q.click('#bCobrar'); await q.waitForTimeout(700);
    const dlg = q.locator('dialog.cfx-tap[open]');
    ok(await dlg.count() === 1 && /\$5\.000/.test(await dlg.textContent()), 'ventana con el monto $5.000');
    ok(/Abrir Mercado Pago/.test(await dlg.textContent()), 'Mercado Pago elegido de entrada (G33)');
    const sinScroll = await q.evaluate(() => { const c = document.querySelector('.cfx-tap-c'); return c.scrollWidth <= c.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; });
    ok(sinScroll, 'sin scroll horizontal a 320 px');
    await t.foto('g32e_despega', q);
    // Cancelar no registra nada
    await q.click('dialog.cfx-tap [data-no]'); await q.waitForTimeout(400);
    let n = await q.evaluate(() => JSON.parse(localStorage.getItem('caja:' + Cuenta.account.id + ':ventas') || '[]').length);
    ok(n === 0 && /5\.000/.test(await q.textContent('#ticketTotal')), 'Cancelar: no registra la venta y el ticket sigue');
    // Elegir SumUp → enlace intent con su package; recordar la elección
    await q.click('#bCobrar'); await q.waitForTimeout(500);
    await q.click('dialog.cfx-tap [data-p="sumup"]');
    const href = await q.evaluate(() => new Promise((ok) => { CFX_TAP.ir = (u) => ok(u); document.querySelector('dialog.cfx-tap [data-abrir]').click(); }));
    ok(/^intent:\/\/#Intent;package=com\.kaching\.merchant;S\.browser_fallback_url=https%3A%2F%2Fplay\.google\.com/.test(href), '📲 Abrir SumUp → intent de Android con Play Store de respaldo');
    ok(await q.evaluate(() => document.querySelector('dialog.cfx-tap').classList.contains('volvio')), 'al volver pregunta "¿Se aprobó el pago?"');
    await q.click('dialog.cfx-tap [data-si]'); await q.waitForTimeout(800);
    const v = await q.evaluate(() => JSON.parse(localStorage.getItem('caja:' + Cuenta.account.id + ':ventas') || '[]'));
    ok(v.length === 1 && v[0].medio === 'tarjeta' && v[0].tap === 'sumup', '✅ Se aprobó: venta como 💳 Tarjeta (tap: sumup)');
    ok(await q.evaluate(() => CFX_TAP.proveedor()) === 'sumup', 'recuerda SumUp en este celular');
  } catch (e) { console.log('✗ ' + e.message); f++; } finally { await t.cerrar(); }
  // ---------- BiciTaller → Más → 💵 Caja → Nueva venta ----------
  t = await abrir('/home/user/taller', 'p_g32e_t');
  try {
    const p = t.page, su = t.sim.su;
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    await p.addInitScript(ANDROID);
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await p.evaluate(() => { history.replaceState(null, '', '#hoy'); }); await p.reload(); await p.waitForTimeout(3500); await t.sinModales();
    await p.evaluate(() => { location.hash = 'mas/caja'; }); await p.waitForTimeout(2500);
    await p.click('#kVender'); await p.waitForTimeout(800);
    await p.fill('dialog[open] #vItems [data-k=nombre]', 'Parche'); await p.fill('dialog[open] #vItems [data-k=precio]', '3000');
    await p.evaluate(() => document.querySelector('dialog[open] #vItems [data-k=precio]').dispatchEvent(new Event('input', { bubbles: true })));
    await p.click('dialog[open] #vOk'); await p.waitForTimeout(800);
    ok(await p.locator('dialog[open] [data-medio="tap"]').count() === 1, '📲 BiciTaller: "Tarjeta (celular)" al cobrar');
    await p.click('dialog[open] [data-medio="tap"]'); await p.waitForTimeout(1500);
    ok(/\$3\.000/.test(await p.textContent('dialog.cfx-tap[open]')), 'ventana con el monto $3.000');
    await t.foto('g32e_bicitaller', p);
    await p.click('dialog.cfx-tap[open] [data-si]'); await p.waitForTimeout(2500);
    const k = await su('select medio, total from public.caja where reserva_id is null');
    ok(k.length === 1 && k[0].medio === 'tarjeta', '✅ cobro guardado como 💳 Tarjeta (' + JSON.stringify(k) + ')');
  } catch (e) { console.log('✗ ' + e.message); f++; } finally { await t.cerrar(); }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ TODO OK'); process.exitCode = f ? 1 : 0;
})();
