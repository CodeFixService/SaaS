// G74a · 🧾 BiciTaller FREE: Hoy "＋ Nueva orden" / "🧾 Presupuesto" (sin hora, queda 🚲 Recibida) · presupuesto por WhatsApp sin módulo
// · 💵 Cobrar y entregar desde la orden · Más → 💵 Caja: venta de mostrador (baja 📦 stock), por cobrar, cierre del día por medio, anular (vuelve el stock).
// FALLA con el código viejo (no existen #hOrden, taller_orden_nueva, caja ni Más → 💵 Caja).
// Uso: ./base.sh /home/user/taller p_g74a && ANCHO=320 node g74a_caja.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g74a');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const toca = async (sel) => { await p.evaluate((x) => document.querySelector(x).scrollIntoView({ block: 'center' }), sel); await p.waitForTimeout(300); await p.click(sel); };
  const sinScroll = () => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const ir = async (h) => { await p.evaluate(() => { history.replaceState(null, '', '#hoy'); }); await p.reload(); await p.waitForTimeout(3500); await t.sinModales(); if (h) { await p.evaluate((x) => { location.hash = x; }, h); await p.waitForTimeout(2500); } };
  const hoja = () => p.evaluate(() => [...document.querySelectorAll('.cfx-hm-zona')].map((e) => e.innerText).join(' '));
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    await su("update public.talleres set premium_hasta = now() - interval '1 day', telefono = '+56955556666', direccion = 'Irarrázaval 100', comuna = 'Ñuñoa'");
    const dueno = (await su("select id from auth.users where email = 'taller@x.cl'"))[0].id;
    await su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");  // venta prendida, sin módulos

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await p.addInitScript(() => { window.__wa = []; window.open = (u) => { window.__wa.push(u); return null; }; });
    await p.reload(); await p.waitForTimeout(3500); await t.sinModales();

    // ＋ Nueva orden desde Hoy
    ok(await p.locator('#hOrden:visible').count() === 1 && await p.locator('#hPres:visible').count() === 1, '🧾 Hoy: "＋ Nueva orden" y "🧾 Presupuesto" a la mano');
    ok(await sinScroll(), 'sin scroll horizontal a 320 px (Hoy)');
    await t.foto('g74a_hoy');
    await toca('#hOrden'); await p.waitForTimeout(800);
    await p.fill('dialog[open] #oN', 'Pedro Pérez'); await p.fill('dialog[open] #oT', '+56911112222'); await p.fill('dialog[open] #oB', 'Trek Marlin 7'); await p.fill('dialog[open] #oO', 'Frena mal');
    await toca('dialog[open] #oOk'); await p.waitForTimeout(3000);
    const r = (await su("select * from public.reservas where nombre = 'Pedro Pérez'"))[0] || {};
    ok(r.estado === 'recibida' && r.origen === 'taller' && r.abono_estado === 'sin_abono' && r.bici === 'Trek Marlin 7', '🚲 orden creada: Recibida, sin abono, con la bici');
    ok(await p.locator('#v-detalle #dItems:visible').count() === 1, '📝 abre la orden para agregar servicios y repuestos');

    // 🧾 Presupuesto (sin módulo): 📲 Enviar presupuesto por WhatsApp con el detalle
    await ir(); await toca('#hPres'); await p.waitForTimeout(800);
    await p.fill('dialog[open] #oN', 'Luisa Rojas'); await p.fill('dialog[open] #oT', '+56933334444');
    await toca('dialog[open] #oOk'); await p.waitForTimeout(3000);
    const r2 = (await su("select * from public.reservas where nombre = 'Luisa Rojas'"))[0] || {};
    ok(r2.servicio_nombre === 'Presupuesto' && r2.estado === 'recibida', '🧾 presupuesto creado');
    await toca('#dAddR'); await p.waitForTimeout(300);
    await p.fill('#dItems [data-k=nombre] >> nth=-1', 'Cadena 11v'); await p.fill('#dItems [data-k=precio] >> nth=-1', '25000');
    await p.evaluate(() => { const e = document.querySelector('#dItems [data-k=precio]'); e.dispatchEvent(new Event('input', { bubbles: true })); });
    await toca('#dGuardar'); await p.waitForTimeout(1500);
    await abrirOrden(r2.id);
    ok(await p.locator('#dPresWa').count() === 1, '📲 sin módulo: botón "Enviar presupuesto" (gratis)');
    await toca('#dPresWa'); await p.waitForTimeout(800);
    const wa = decodeURIComponent((await p.evaluate(() => window.__wa.pop())) || '');
    ok(/Cadena 11v: \$25\.000/.test(wa) && /Total: \$25\.000/.test(wa), '📲 WhatsApp con el detalle y el total');

    // 💵 Cobrar y entregar desde la orden (lista)
    await su("update public.reservas set estado = 'lista', lista_at = now() where id = $1", [r2.id]);
    await abrirOrden(r2.id);
    await toca('#dCobrar'); await p.waitForTimeout(800);
    await toca('dialog[open] [data-medio=transferencia]'); await p.waitForTimeout(2500);
    let k = (await su('select k.*, r.estado from public.caja k join public.reservas r on r.id = k.reserva_id where k.reserva_id = $1', [r2.id]))[0] || {};
    ok(k.total === 25000 && k.medio === 'transferencia' && k.estado === 'completada', '💵 cobrado $25.000 por transferencia y la bici queda 🎉 entregada');
    let err = ''; await t.sim.su("select set_config('request.jwt.claim.sub', $1, true), public.taller_caja_cobrar($2, 'efectivo')", [dueno, r2.id]).catch((e) => { err = e.message; });
    ok(/ya está cobrada/.test(err), '🔒 no cobra 2 veces la misma orden');

    // 💵 Caja: venta de mostrador con 📦 stock
    await su("insert into public.cfx_modulos_negocio (negocio, modulo, hasta) values ($1, 'stock', now() + interval '30 days')", [dueno]);
    await su("insert into public.repuestos (taller_id, nombre, precio, stock, minimo) select id, 'Cámara 29', 6000, 5, 1 from public.talleres");
    await su("update public.reservas set estado = 'lista', lista_at = now(), items = '[{\"nombre\":\"Ajuste\",\"cant\":1,\"precio\":10000}]', total = 10000 where id = $1", [r.id]);
    await ir('mas/caja');
    let z = await hoja();
    ok(/Venta de mostrador/.test(z) && /Por cobrar/.test(z) && /Pedro Pérez/.test(z) && /Cierre del día/.test(z), '💵 Más → Caja: venta, por cobrar (Pedro) y cierre');
    ok(/Transferencia\s*\$25\.000/.test(z), '📊 cierre: 🏦 Transferencia $25.000');
    ok(await sinScroll(), 'sin scroll horizontal a 320 px (Caja)');
    await toca('#kVender'); await p.waitForTimeout(800);
    await p.fill('dialog[open] #vItems [data-k=nombre]', 'Cámara 29'); await p.waitForTimeout(300);
    ok(await p.inputValue('dialog[open] #vItems [data-k=precio]') === '6000' && /Quedan 5/.test(await p.locator('dialog[open] #vItems').innerText()), '📦 elegir del stock pone el precio y muestra "Quedan 5"');
    await p.fill('dialog[open] #vItems [data-k=cant]', '2'); await p.evaluate(() => document.querySelector('dialog[open] #vItems [data-k=cant]').dispatchEvent(new Event('input', { bubbles: true })));
    ok(/12\.000/.test(await p.locator('dialog[open] #vTot').innerText()), '🧮 total $12.000');
    ok(await sinScroll(), 'sin scroll horizontal a 320 px (venta)');
    await t.foto('g74a_venta');
    await toca('dialog[open] #vOk'); await p.waitForTimeout(800);
    await p.click('dialog[open] [data-medio=efectivo]'); await p.waitForTimeout(2500);
    ok((await su("select stock from public.repuestos where nombre = 'Cámara 29'"))[0].stock === 3, '📦 la venta bajó el stock 5 → 3');
    z = await hoja();
    ok(/Efectivo\s*\$12\.000/.test(z) && /Total \(2\)\s*\$37\.000/.test(z), '📊 cierre: 💵 $12.000 · total $37.000 (2 cobros)');
    await t.foto('g74a_caja');
    // Cobrar Pedro desde la caja
    await toca('[data-cobrar="' + r.id + '"]'); await p.waitForTimeout(800);
    await p.click('dialog[open] [data-medio=tarjeta]'); await p.waitForTimeout(2500);
    z = await hoja();
    ok(/Tarjeta\s*\$10\.000/.test(z) && !/Por cobrar/.test(z), '💳 cobró a Pedro $10.000 con tarjeta; ya no hay por cobrar');
    // Anular la venta de mostrador → vuelve el stock
    const kv = (await su("select id from public.caja where reserva_id is null"))[0].id;
    await toca('[data-anular="' + kv + '"]'); await p.waitForTimeout(800); await p.click('dialog[open] [data-si]'); await p.waitForTimeout(2500);
    ok((await su("select stock from public.repuestos where nombre = 'Cámara 29'"))[0].stock === 5 && !(await su('select 1 from public.caja where id = $1', [kv])).length, '↩️ anular: borra el cobro y devuelve el stock');
    // Equipo no anula
    err = ''; await su("select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true), public.taller_caja('2020-01-01')").catch((e) => { err = e.message; });
    ok(/Sin acceso/.test(err), '🔒 otro usuario no ve la caja');
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); await t.foto('g74a_error').catch(() => {}); }
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
  async function abrirOrden(id) { await ir('reservas'); await p.evaluate(() => { const b = document.querySelector('#rSeg [data-f=taller]'); if (b) b.click(); }); await p.waitForTimeout(1500); await p.evaluate((x) => { const e = document.querySelector('[data-tj="' + x + '"], [data-r="' + x + '"]'); e.scrollIntoView(); e.click(); }, id); await p.waitForTimeout(2500); }
})();
