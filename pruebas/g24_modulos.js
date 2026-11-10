// G24 · 🧩 Módulos: apagar/prender, "▶️ Probar módulo" al entrar a uno que no tiene, demo animada con ✕ y Cerrar, prueba gratis, Comprar,
// botones de la tienda de módulos sin partirse y "Renueva tu plan" con el precio entero. Uso: node g24_modulos.js [bd]  (antes ./base.sh /home/user/Aplicaciones <bd>)
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/Aplicaciones', process.argv[2] || 'p_g24');
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  try {
    await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Codex' }); await t.sim.su('update public.profiles set terms_at = now()');
    const [{ id }] = await t.sim.su("select id from public.profiles where email = 'tienda@x.cl'");
    // Como en la captura: Pro que vence pronto (sale "Renueva tu plan") y la venta de módulos prendida.
    await t.sim.su("update public.profiles set slug = 'codex', telefono = '56912345678', plan = 'pro', pro_until = now() + interval '7 days' where id = $1", [id]);
    await t.sim.su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
    await t.sim.su("update public.cfx_config set valor = jsonb_set(jsonb_set(valor, '{negocio,mensual}', '2000'), '{negocio,anual}', '22000') where clave = 'pagos'").catch(() => {});
    const q = t.page;
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.evaluate(() => localStorage.setItem('cfx:tour:orbita-inicio', '1'));
    await q.fill('input[type=email]:visible', 'tienda@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3000);

    // 1) Entra al chat sin tenerlo: aviso "Probar módulo" (no "no disponible").
    await q.goto(t.base + '/apps/mensajes/'); await q.waitForTimeout(2500); await t.sinModales(q);
    const k1 = await q.evaluate(() => [!!document.querySelector('.cfxk'), document.querySelector('main').innerText.includes('no está disponible por ahora')]);
    ok(k1[0] && !k1[1], 'chat sin módulo → aviso ▶️ Probar módulo ' + JSON.stringify(k1));
    await t.foto('g24-chat-candado', q);
    await q.click('.cfxk button'); await q.waitForTimeout(400);
    const d0 = await q.evaluate(() => { const d = document.querySelector('dialog.cfxd'); return d && [d.open, !!d.querySelector('.cfxd-x'), !!d.querySelector('.cerrar'), !!d.querySelector('[data-gratis]'), !!d.querySelector('[data-comprar]')]; });
    ok(d0 && d0.every(Boolean), 'demo abierta con ✕, Cerrar, prueba gratis y Comprar ' + JSON.stringify(d0));
    const op0 = await q.evaluate(() => [...document.querySelectorAll('.cfxd-p')].map((e) => +getComputedStyle(e).opacity));
    await q.waitForTimeout(3600);
    const op1 = await q.evaluate(() => [...document.querySelectorAll('.cfxd-p')].map((e) => +getComputedStyle(e).opacity));
    ok(op0.length >= 3 && op0[op0.length - 1] < 0.5 && op1.every((x) => x > 0.99), 'animación: los pasos aparecen uno tras otro ' + JSON.stringify([op0, op1]));
    await t.foto('g24-chat-demo', q);
    await q.click('dialog.cfxd .cfxd-x'); await q.waitForTimeout(300);
    ok(!(await q.$('dialog.cfxd')), '✕ cierra la demo');
    await q.click('.cfxk button'); await q.waitForTimeout(300); await q.click('dialog.cfxd .cerrar'); await q.waitForTimeout(300);
    ok(!(await q.$('dialog.cfxd')), 'Cerrar (abajo) cierra la demo');
    await q.click('.cfxk button'); await q.waitForTimeout(300); await q.click('dialog.cfxd [data-comprar]'); await q.waitForTimeout(1500);
    const pago = await q.evaluate(() => { const d = document.querySelector('dialog.cfx-pago'); return d && d.open && d.textContent.includes('Chat'); });
    ok(pago, 'Comprar abre el pago del módulo Chat');
    await t.foto('g24-chat-comprar', q);
    await q.evaluate(() => { const d = document.querySelector('dialog.cfx-pago'); if (d) { d.close(); d.remove(); } });

    // 2) Activa la prueba gratis → recarga → el chat funciona (módulo prendido).
    await q.click('.cfxk button'); await q.waitForTimeout(300); await q.click('dialog.cfxd [data-gratis]'); await q.waitForTimeout(4000); await t.sinModales(q);
    const [pr] = await t.sim.su("select origen, hasta > now() a from public.cfx_modulos_negocio where negocio = $1 and modulo = 'chat'", [id]);
    const k2 = await q.evaluate(() => [!document.querySelector('.cfxk'), !!document.getElementById('texto') || !!document.querySelector('main ul, main .list')]);
    ok(pr && pr.origen === 'prueba' && pr.a && k2.every(Boolean), 'prueba gratis activa el chat ' + JSON.stringify([pr, k2]));

    // 3) Se apaga (vence) → vuelve el aviso. Apagado para todos desde el CM → "no disponible".
    await t.sim.su("update public.cfx_modulos_negocio set hasta = now() - interval '1 minute' where negocio = $1 and modulo = 'chat'", [id]);
    await q.reload(); await q.waitForTimeout(2500); await t.sinModales(q);
    const k3 = await q.evaluate(() => [!!document.querySelector('.cfxk'), !!document.querySelector('[data-gratis]')]);
    ok(k3[0], 'vencido → otra vez ▶️ Probar módulo');
    await q.click('.cfxk button'); await q.waitForTimeout(300);
    ok(await q.evaluate(() => !document.querySelector('dialog.cfxd [data-gratis]') && !!document.querySelector('dialog.cfxd [data-comprar]')), 'prueba ya usada: la demo ofrece solo Comprar');
    await q.click('dialog.cfxd .cfxd-x');
    await t.sim.su("insert into public.cfx_config (clave, valor) values ('modulos', '{\"chat\": false}') on conflict (clave) do update set valor = excluded.valor");
    await q.reload(); await q.waitForTimeout(2500); await t.sinModales(q);
    ok(await q.evaluate(() => !document.querySelector('.cfxk') && document.querySelector('main').innerText.includes('no está disponible por ahora')), 'chat apagado desde el CM → no disponible');
    await t.sim.su("delete from public.cfx_config where clave = 'modulos'");
    await t.sim.su("update public.cfx_modulos_negocio set hasta = now() + interval '30 days', origen = 'pago' where negocio = $1 and modulo = 'chat'", [id]);
    await q.reload(); await q.waitForTimeout(2500); await t.sinModales(q);
    ok(await q.evaluate(() => !document.querySelector('.cfxk') && !document.querySelector('main').innerText.includes('no está disponible')), 'comprado → chat prendido');

    // 4) Cupones y estadísticas en Pedidos.
    await q.goto(t.base + '/apps/pedidos/?v=stats'); await q.waitForTimeout(2500); await t.sinModales(q);
    const st = await q.evaluate(() => { const b = document.querySelector('#stLock a.btn'); return b && b.offsetParent && b.textContent; });
    ok(/Probar módulo/.test(st || ''), 'Estadísticas sin módulo: ▶️ Probar módulo');
    await q.click('#stLock a.btn'); await q.waitForTimeout(2500);
    ok(await q.evaluate(() => !!document.querySelector('dialog.cfxd .cfxd-barras')), 'demo de estadísticas con barras');
    await t.foto('g24-stats-demo', q);
    await q.click('dialog.cfxd .cerrar');

    // 5) 🧩 Módulos: botones sin partirse (una línea) a 360 y 320 px; pack abre demo con sus módulos.
    for (const w of [360, 320]) {
      await q.setViewportSize({ width: w, height: 740 });
      await q.goto(t.base + '/#modulos'); await q.reload(); await q.waitForTimeout(3500);
      const bt = await q.evaluate(() => [...document.querySelectorAll('#modTienda .cfxm-btns button')].filter((b) => b.offsetParent).map((b) => b.getBoundingClientRect().height));
      ok(bt.length && bt.every((h) => h <= 46), w + ' px: botones Probar/Comprar en una línea ' + JSON.stringify(bt.slice(0, 4)));
      ok(await t.anchoOk(q), w + ' px: sin scroll de lado');
      await t.foto('g24-modulos-' + w, q);
    }
    await q.evaluate(() => document.querySelector('#modTienda [data-probar="crecer"]').click()); await q.waitForTimeout(600);
    const pk = await q.evaluate(() => document.querySelectorAll('dialog.cfxd .cfxd-chips button').length);
    ok(pk >= 5, 'pack Crecer: demo con sus módulos (' + pk + ')');
    await t.foto('g24-pack-demo', q);
    await q.click('dialog.cfxd .cfxd-x');

    // 6) Mi plan: "$2.000 al mes" y "$22.000 al año" sin cortar "año".
    await q.setViewportSize({ width: 360, height: 740 });
    await q.goto(t.base + '/#plan'); await q.waitForTimeout(3000);
    const pp = await q.evaluate(() => { const e = document.getElementById('proPrecio'); return e && [...e.children].map((s) => [s.textContent, s.getClientRects().length]); });
    ok(pp && pp.length === 2 && pp.every((x) => x[1] === 1), 'Renueva tu plan: cada precio entero en su línea ' + JSON.stringify(pp));
    await t.foto('g24-plan', q);
    await q.emulateMedia({ colorScheme: 'dark' });
    await q.goto(t.base + '/apps/pedidos/?v=cupones'); await q.waitForTimeout(2500); await t.sinModales(q);
    await q.click('#cupLock a.btn'); await q.waitForTimeout(3500); await t.foto('g24-cupones-demo-oscuro', q);
    const errs = t.errores.filter((e) => !/fichapro\.json|favicon/.test(e));
    ok(!errs.length, 'sin errores de consola ' + JSON.stringify(errs.slice(0, 5)));
  } catch (e) { console.log('✗ ' + e.stack); process.exitCode = 1; }
  await t.cerrar();
})();
