// G84 d+e · Estaciona: ⏰ aviso antes de terminar · 🔔 "se liberó uno cerca" (alerta de zona) · 🔁 arriendo mensual que se renueva solo
// (5 días antes pide 1 mes más; quien arrienda paga y sube el comprobante; el dueño acepta).
// FALLA con el código viejo (no existen avisar_por_terminar, renovar_arriendo, comprobante_extension ni #rRenovar).
// Uso: ./base.sh /home/user/estacionamiento p_g84d && ANCHO=320 node g84d.js
const { abrir } = require('./h');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  const t = await abrir('/home/user/estacionamiento', process.env.BD || 'p_g84d');
  const p = t.page, su = t.sim.su;
  const n = async (q, a) => (await su('select count(*)::int n from ' + q, a))[0].n;
  const entrar = async (pg, mail) => {
    await pg.goto(t.base + '/#/avisos'); await pg.waitForTimeout(1500);
    await pg.click('button[data-t=in]'); await pg.waitForTimeout(300);
    await pg.fill('#lEmail', mail); await pg.fill('#lClave', 'clave123'); await pg.press('#lClave', 'Enter');
    await pg.waitForTimeout(2500); await t.sinModales(pg);
  };
  try {
    const d = await t.sim.crearUsuario('dueno@x.cl', 'clave123'), c = await t.sim.crearUsuario('cliente@x.cl', 'clave123'), v = await t.sim.crearUsuario('vecino@x.cl', 'clave123');
    await su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    const est = (await su("insert into public.estacionamientos (dueno, titulo, direccion, lat, lng, precio_hora, precio_mes) values ($1,'Est G84','Calle 1',-33.44,-70.65,1000,60000) returning id", [d.id]))[0].id;
    await su("insert into public.links_pago (dueno, tipo, slot, url, texto, activo) values ($1, 'arriendo', 1, 'https://mpago.la/dueno', 'Paga aquí', true)", [d.id]).catch((e) => console.log('  (sin link de pago: ' + e.message.slice(0, 60) + ')'));
    const nuevo = async (mod, extra) => (await su("insert into public.arriendos (estacionamiento, dueno, arrendatario, modalidad, estado, pago_estado, cantidad, total, monto_pagar, inicio, fin" + (extra ? ', renovar' : '') + ") values ($1,$2,$3,$4,'aceptado','pagado',1,$5,$5,$6::timestamptz,$7::timestamptz" + (extra ? ', true' : '') + ") returning id",
      [est, d.id, c.id, mod.m, mod.total, mod.ini, mod.fin]))[0].id;
    const en = (min) => new Date(Date.now() + min * 60000).toISOString();

    // ---------- ⏰ aviso antes de terminar ----------
    const h1 = await nuevo({ m: 'hora', total: 1000, ini: en(-50), fin: en(10) });
    const h2 = await nuevo({ m: 'hora', total: 1000, ini: en(-10), fin: en(50) });   // le quedan 50 min: todavía no
    await su('select public.liberar_vencidas()');
    ok(await n("notificaciones where usuario = $1 and titulo like '⏰ Tu estacionamiento termina a las %' and url = $2", [c.id, '#/r/' + h1]) === 1, 'quien arrienda recibe "⏰ termina a las HH:MM" 15 min antes');
    ok(await n("notificaciones where usuario = $1 and titulo like '⏰ Una reserva termina%'", [d.id]) === 1, 'el dueño sabe que queda libre');
    ok(await n("notificaciones where url = $1 and titulo like '⏰%'", ['#/r/' + h2]) === 0, 'a la que le quedan 50 min no se le avisa todavía');
    await su('select public.liberar_vencidas()'); await su('select public.liberar_vencidas()');
    ok(await n("notificaciones where usuario = $1 and titulo like '⏰ Tu estacionamiento%'", [c.id]) === 1, 'el aviso llega una sola vez');
    await su("update arriendos set fin = fin + interval '1 hour', cantidad = 2 where id = $1", [h1]);
    await su("update arriendos set fin = now() + interval '9 minutes' where id = $1", [h1]); await su('select public.liberar_vencidas()');
    ok(await n("notificaciones where usuario = $1 and titulo like '⏰ Tu estacionamiento%'", [c.id]) === 2, 'si se extendió, avisa de nuevo para la hora nueva');

    // ---------- 🔔 se liberó uno cerca ----------
    await su("update perfiles set alerta_lat = -33.441, alerta_lng = -70.651, alerta_km = 1, premium_hasta = now() + interval '30 days' where id = $1", [v.id]);
    await su("update perfiles set alerta_lat = -33.441, alerta_lng = -70.651, alerta_km = 1, premium_hasta = now() + interval '30 days' where id = $1", [c.id]);
    await su("delete from arriendos where id = $1", [h2]);
    await su("update arriendos set estado = 'finalizado' where id = $1", [h1]);
    ok(await n("notificaciones where usuario = $1 and titulo = '🔔 Se liberó un estacionamiento cerca' and url = $2", [v.id, '#/e/' + est]) === 1, 'al vecino con alerta de zona le llega "🔔 Se liberó un estacionamiento cerca"');
    ok(await n("notificaciones where titulo like '🔔 Se liberó%' and usuario in ($1, $2)", [c.id, d.id]) === 0, 'no le llega a quien lo dejó ni al dueño');
    const h3 = await nuevo({ m: 'hora', total: 1000, ini: en(-20), fin: en(40) });
    await su("update arriendos set estado = 'cancelado' where id = $1", [h3]);
    ok(await n("notificaciones where usuario = $1 and titulo like '🔔 Se liberó%'", [v.id]) === 1, 'máximo un aviso cada 30 min por persona');
    await su("update perfiles set alerta_libre_at = null, premium_hasta = null where id = $1", [v.id]);
    const h4 = await nuevo({ m: 'hora', total: 1000, ini: en(-20), fin: en(40) }); await su("update arriendos set estado = 'finalizado' where id = $1", [h4]);
    ok(await n("notificaciones where usuario = $1 and titulo like '🔔 Se liberó%'", [v.id]) === 1, 'sin Premium no llega (misma regla de la alerta de zona)');
    await su('delete from arriendos');

    // ---------- 🔁 mensual que se renueva ----------
    const m1 = await nuevo({ m: 'mes', total: 60000, ini: en(-20 * 1440), fin: en(10 * 1440) });
    await entrar(p, 'cliente@x.cl');
    for (const modo of ['light', 'dark']) {
      await p.emulateMedia({ colorScheme: modo });
      await p.goto(t.base + '/#/r/' + m1); await p.waitForTimeout(2500); await t.sinModales();
      ok(await p.locator('#rRenovar').count() === 1 && await t.anchoOk(), modo + ': la reserva mensual muestra "Renovar cada mes" sin desborde');
      await t.foto('g84d-renovar-' + modo);
    }
    await p.click('#rRenovar'); await p.waitForTimeout(2000);
    ok((await su('select renovar from arriendos where id = $1', [m1]))[0].renovar === true, 'Prender deja el arriendo renovándose');
    ok(await n("notificaciones where usuario = $1 and titulo = '🔁 Arriendo mensual que se renueva'", [d.id]) === 1, 'el dueño se entera');
    await su('select public.liberar_vencidas()');
    ok((await su('select ext_cantidad from arriendos where id = $1', [m1]))[0].ext_cantidad === null, 'faltando 10 días todavía no pide el mes siguiente');
    await su("update arriendos set fin = now() + interval '4 days' where id = $1", [m1]); await su('select public.liberar_vencidas()'); await su('select public.liberar_vencidas()');
    let a = (await su('select * from arriendos where id = $1', [m1]))[0];
    ok(a.ext_cantidad === 1 && a.ext_monto === 60000 && a.ext_comprobante === null, '5 días antes pide solo 1 mes más por $60.000');
    ok(await n("notificaciones where usuario = $1 and titulo = '🔁 Toca renovar tu mes' and cuerpo like '%$60.000%'", [c.id]) === 1 && await n("notificaciones where usuario = $1 and titulo = '🔁 Renovación mensual'", [d.id]) === 1, 'avisa una vez a quien arrienda (con el monto) y al dueño');
    ok(await n("notificaciones where usuario = $1 and titulo like '⏰ Tu estacionamiento%' and url = $2", [c.id, '#/r/' + m1]) === 0, 'el mensual que se renueva no manda además el aviso de término');
    await p.reload(); await p.waitForTimeout(3000); await t.sinModales();
    const txt = await p.locator('#view, main, body').first().innerText();
    ok(/Renovación del mes/.test(txt) && await p.locator('#rExtSubir').count() === 1, 'quien arrienda ve "🔁 Renovación del mes" con subir comprobante');
    ok(await p.locator('a[href="https://mpago.la/dueno"]').count() >= 1, 'y el botón para pagarle al dueño');
    ok(await t.anchoOk(), 'sin desborde'); await t.foto('g84d-pagar');
    await p.setInputFiles('#rExtComp', __dirname + '/comprobante.png'); await p.click('#rExtSubir'); await p.waitForTimeout(3000);
    a = (await su('select * from arriendos where id = $1', [m1]))[0];
    ok(!!a.ext_comprobante && await n("notificaciones where usuario = $1 and titulo = '🧾 Comprobante del tiempo extra'", [d.id]) === 1, 'el comprobante queda en el pedido y el dueño recibe el aviso');
    // El dueño acepta: un mes más, sigue renovándose y no vuelve a pedir hasta el mes siguiente.
    const { page: q } = await t.nuevo(); await entrar(q, 'dueno@x.cl');
    await q.goto(t.base + '/#/r/' + m1); await q.waitForTimeout(2500); await t.sinModales(q);
    ok(/Se renueva cada mes/.test(await q.locator('body').innerText()), 'el dueño ve que es un mensual que se renueva');
    await q.click('#rExtSi'); await q.waitForTimeout(2500);
    a = (await su("select *, fin > now() + interval '30 days' as mas from arriendos where id = $1", [m1]))[0];
    ok(a.mas && a.cantidad === 2 && a.total === 120000 && a.monto_pagar === 120000 && a.renovar && a.ext_cantidad === null, 'al aceptar: un mes más, pagado sumado y sigue renovándose');
    await su('select public.liberar_vencidas()');
    ok((await su('select ext_cantidad from arriendos where id = $1', [m1]))[0].ext_cantidad === null, 'no vuelve a pedir hasta 5 días antes del nuevo término');
    // Mes siguiente: el dueño rechaza → la renovación se apaga sola.
    await su("update arriendos set fin = now() + interval '3 days' where id = $1", [m1]); await su('select public.liberar_vencidas()');
    await q.reload(); await q.waitForTimeout(3000); await t.sinModales(q);
    await q.click('#rExtNo'); await q.waitForSelector('[data-si]'); await q.click('[data-si]'); await q.waitForTimeout(2500);
    await su('select public.liberar_vencidas()');
    a = (await su('select * from arriendos where id = $1', [m1]))[0];
    ok(a.renovar === false && a.ext_cantidad === null, 'si el dueño rechaza, deja de renovarse (no insiste)');
    // Seguridad: otra persona no puede prender la renovación ni subir comprobantes.
    const como = async (id, expr, args) => { try { await su("select " + expr + " from (select set_config('request.jwt.claim.sub', $1, true)) x", [id].concat(args || [])); return 'pasó'; } catch (e) { return e.message; } };
    ok(/no encontrada/.test(await como(v.id, 'public.renovar_arriendo($2::uuid, true)', [m1])), 'un tercero no puede prender la renovación');
    ok(/no encontrada/.test(await como(v.id, "public.comprobante_extension($2::uuid, 'x/y.png')", [m1])), 'un tercero no puede subir comprobantes');
    const h5 = await nuevo({ m: 'hora', total: 1000, ini: en(-20), fin: en(40) });
    ok(/por mes/.test(await como(c.id, 'public.renovar_arriendo($2::uuid, true)', [h5])), 'un arriendo por hora no se puede renovar solo');
  } catch (e) { console.log('✗ ' + e.message); f++; await t.foto('g84d-error'); }
  const er = t.errores.filter((x) => !/Failed to load resource|ERR_/.test(x)); if (er.length) console.log('ERRORES:', er.slice(0, 5).join('\n'));
  await t.cerrar(); console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
