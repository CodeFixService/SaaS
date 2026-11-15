// G59b · 🧩 BiciTaller módulo ✅ Presupuesto por link: el taller pide aprobación, el cliente responde Sí/No por ítem en /r/,
// lo rechazado no se cobra y el taller ve la respuesta. Sin el módulo (venta prendida y no comprado) → demo ▶️, y la base lo bloquea.
// FALLA con el código viejo (no existen taller_presupuesto, reserva_presupuesto, #dPedir ni #cPres).
// Uso: ./base.sh /home/user/taller p_g59b && ANCHO=320 node g59b_presupuesto.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g59b');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const toca = async (sel, pg) => { pg = pg || p; await pg.evaluate((x) => document.querySelector(x).scrollIntoView({ block: 'center' }), sel); await pg.waitForTimeout(300); await pg.click(sel); };
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    const hoy = (await su("select (now() at time zone 'America/Santiago')::date::text d"))[0].d;
    await como('taller@x.cl', "public.taller_reserva_manual($2::date, '10:00', null, 'Pedro Pérez', '+56911112222', 'Trek Marlin', '', true)", [hoy]);
    await su(`update public.reservas set estado = 'recibida', total = 27000,
      items = '[{"nombre":"Cambio de cadena","cant":1,"precio":18000},{"nombre":"Pastillas de freno","cant":1,"precio":9000}]'`);
    const id = (await su("select id from public.reservas where nombre = 'Pedro Pérez'"))[0].id;
    const tok = (await su('select token from public.reservas where id = $1', [id]))[0].token;
    const dueno = (await su("select id from auth.users where email = 'taller@x.cl'"))[0].id;

    // Venta de módulos prendida y el taller NO lo compró
    await su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
    await su("update public.cfx_config set valor = jsonb_set(valor, '{precios,presupuesto}', '1990') where clave = 'modulos_venta'");
    let e = ''; try { await como('taller@x.cl', 'public.taller_presupuesto($2)', [id]); } catch (x) { e = x.message; }
    ok(/Necesitas el módulo/.test(e), '🔒 sin el módulo la base no deja pedir aprobación (' + e + ')');
    const packs = (await su("select valor -> 'packs' p from public.cfx_config where clave = 'modulos_venta'"))[0].p;
    ok(packs && !Object.keys(packs).length, 'sin los packs de tienda del núcleo (aquí saldrían más caros)');

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    ok(await p.evaluate(() => !document.querySelector('#mSeg [data-m=modulos]').classList.contains('hidden')), '🧩 Más → Módulos aparece con la venta prendida');
    await toca('#hTablero [data-tj="' + id + '"] b'); await p.waitForTimeout(2000);
    ok(await p.locator('#dPedir').count() === 1, 'la orden tiene "✅ Pedir aprobación"');
    await toca('#dPedir'); await p.waitForTimeout(1500);
    const demo = await p.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => d.innerText).join(' '));
    ok(/Presupuesto por link/.test(demo), '▶️ sin el módulo abre la demo con Comprar');
    await t.foto('g59b_demo');
    ok((await su('select presupuesto from public.reservas where id = $1', [id]))[0].presupuesto === null, 'no se envió nada sin el módulo');

    // Con el módulo comprado
    await su("insert into public.cfx_modulos_negocio (negocio, modulo, hasta) values ($1, 'presupuesto', now() + interval '30 days')", [dueno]);
    await p.reload(); await p.waitForTimeout(3500); await t.sinModales();
    await toca('#hTablero [data-tj="' + id + '"] b'); await p.waitForTimeout(2000);
    await toca('#dPedir'); await p.waitForTimeout(2000);
    let r = (await su('select items, presupuesto from public.reservas where id = $1', [id]))[0];
    ok(r.presupuesto && r.presupuesto.estado === 'enviado' && r.items.every((i) => i.aprob === 'pend'), '✅ pedido: los 2 ítems quedan ⏳ esperando al cliente');
    ok(await p.locator('#dPres a[href*="wa.me"]').count() === 1, '📲 botón para mandarle el link por WhatsApp');
    ok(await p.locator('#dItems .ap.pend').count() === 2, 'la orden muestra ⏳ en cada ítem');
    await p.evaluate(() => document.querySelector('#dPres').scrollIntoView({ block: 'center' })); await t.foto('g59b_taller_pide');

    // Cliente responde en /r/
    const c = await t.nuevo(); const cp = c.page;
    await cp.goto(t.base + '/r/?t=' + tok); await cp.waitForTimeout(3000);
    ok(await cp.locator('#cPres:not(.hidden) .pi').count() === 2, '👤 el cliente ve los 2 arreglos para aprobar');
    await toca('#presEnviar', cp); await cp.waitForTimeout(1000);
    ok((await su('select presupuesto from public.reservas where id = $1', [id]))[0].presupuesto.estado === 'enviado', 'sin elegir todo no se envía');
    await toca('#presItems [data-i="0"][data-r="si"]', cp); await toca('#presItems [data-i="1"][data-r="no"]', cp); await cp.waitForTimeout(400);
    ok(/18\.000/.test(await cp.locator('#presTot').innerText()), 'total aprobado en vivo: $18.000');
    await t.foto('g59b_cliente', cp);
    await toca('#presEnviar', cp); await cp.waitForTimeout(2500);
    r = (await su('select items, total, presupuesto from public.reservas where id = $1', [id]))[0];
    ok(r.items[0].aprob === 'si' && r.items[1].aprob === 'no' && r.total === 18000 && r.presupuesto.estado === 'respondido', 'respuesta guardada: ✅ cadena, ❌ pastillas, total $18.000');
    ok(await cp.locator('#cPres.hidden').count() === 1 && await cp.locator('tr.no').count() === 1, '👤 el cliente ve lo rechazado tachado');
    const av = await su("select titulo from public.notificaciones where para = $1 and titulo like '%presupuesto%'", [dueno]);
    ok(av.length === 1, '🔔 el taller recibe el aviso de la respuesta (' + (av[0] || {}).titulo + ')');
    const x2 = await cp.evaluate((tk) => App.rpc('reserva_presupuesto', { p_token: tk, p_resp: { 0: 'no', 1: 'si' } }), tok);
    ok(!x2.ok, 'no se puede responder 2 veces (' + x2.error + ')');

    // Taller ve la respuesta y guardar no la borra
    await p.reload(); await p.waitForTimeout(3500); await t.sinModales();
    await toca('#hTablero [data-tj="' + id + '"] b'); await p.waitForTimeout(2000);
    ok(await p.locator('#dItems .ap.si').count() === 1 && await p.locator('#dItems .ap.no').count() === 1, 'el taller ve ✅ y ❌ en la orden');
    ok(/18\.000/.test(await p.locator('#dTotal').innerText()), 'total del taller $18.000 (lo rechazado no se cobra)');
    ok(await p.locator('#dPedir').count() === 0, 'sin ítems nuevos no ofrece pedir de nuevo');
    await toca('#dGuardar'); await p.waitForTimeout(1500);
    r = (await su('select items, total from public.reservas where id = $1', [id]))[0];
    ok(r.items[1].aprob === 'no' && r.total === 18000, '💾 guardar mantiene la respuesta del cliente');
    const ancho = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    ok(ancho, 'sin scroll horizontal a 320 px');
    await t.foto('g59b_taller_ve');

    // Venta apagada = todos lo tienen (como el resto del núcleo)
    await su("delete from public.cfx_modulos_negocio");
    await su("update public.cfx_config set valor = valor || '{\"activo\": false}' where clave = 'modulos_venta'");
    ok(await como('taller@x.cl', "public.taller_tiene('presupuesto')"), 'con la venta apagada el módulo sirve gratis');
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); await t.foto('g59b_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
