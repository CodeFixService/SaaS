// G98 · ⚡ MERCADO PAGO PROPIO DE CADA NEGOCIO (núcleo mp_negocio.sql + CFX_PAGOS.mpNegocio) · 💈 Barbería: abono de la reserva con el MP de la barbería.
//   El dueño conecta su Access Token (nadie lo lee) → el cliente toca "⚡ Pagar con Mercado Pago" en /r/ → la BASE confirma con MP
//   (aprobado + CLP + monto completo) → la hora queda AGENDADA sola. Si se pasó el tiempo, se pregunta a MP antes de liberar.
// FALLA con el código viejo (no existen cfx_mp_neg_guardar, reserva_mp_pagar ni el botón).
// Uso: ANCHO=320 node g98.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const MP = 'https://api.mercadopago.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
(async () => {
  execSync(__dirname + '/base.sh /home/user/Barberia p_g98', { stdio: 'ignore' });
  const t = await abrir('/home/user/Barberia', 'p_g98'); const su = t.sim.su, como = comoDe(su);
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'barberia', barberia: 'Barbería Juan', nombre: 'Juan', telefono: '+56912345671' });
    const cod = (await su('select codigo from public.barberias limit 1'))[0].codigo;
    await t.sim.crearUsuario('cli@x.cl', 'clave123', { rol: 'cliente', barberia: cod, nombre: 'Pepe', telefono: '+56912345672' });
    const B = (await su('select b.id, b.owner_id from public.barberias b limit 1'))[0];
    await su("insert into extensions.http_respuestas values ($1, 200, '{\"nickname\":\"JUANBARBER\"}'), ($2, 201, '{\"init_point\":\"https://mp.test/pagar\"}'), ($3, 200, '{\"results\":[]}')",
      [MP + '/users/me', MP + '/checkout/preferences', MP + '/v1/payments/search%']);

    // ---------- 🔑 Conectar (solo el dueño; el token no se puede leer) ----------
    let e = await como('dueno@x.cl', 'public.cfx_mp_neg_estado()');
    ok(e.dueno && !e.conectado, 'Dueño: Mercado Pago sin conectar');
    ok(/Solo el dueño/.test(await falla(() => como('cli@x.cl', "public.cfx_mp_neg_guardar('APP_USR-1234567890123456789012345', true)")) || ''), '🔒 Un cliente no conecta Mercado Pago');
    ok(/Access Token/.test(await falla(() => como('dueno@x.cl', "public.cfx_mp_neg_guardar('hola', true)")) || ''), '🔒 Token inválido se rechaza');
    e = await como('dueno@x.cl', "public.cfx_mp_neg_guardar('APP_USR-1234567890123456789012345-abcd', true)");
    ok(e.conectado && e.activo && e.nick === 'JUANBARBER' && e.fin === 'abcd', '⚡ Conectado como JUANBARBER (…abcd)');
    const P = (await su("select has_table_privilege('authenticated', 'public.cfx_mp_negocio', 'select') a, has_table_privilege('anon', 'public.cfx_mp_neg_cobros', 'select') b, " +
      "has_function_privilege('anon', 'public.cfx_mp_neg_cobro(uuid, text, text, integer, text, timestamptz, text)', 'execute') c, " +
      "has_function_privilege('authenticated', 'public.cfx_mp_neg_pagado_app(text, text, integer)', 'execute') d"))[0];
    ok(!P.a && !P.b && !P.c && !P.d, '🔒 Nadie lee el token ni crea cobros o marca pagos desde fuera');

    // ---------- 💈 Reserva sin cuenta: paga el abono con MP ----------
    const reserva = async (h, exp) => (await su("insert into public.reservas (barberia_id, barbero_id, cliente_nombre, cliente_tel, inicio, fin, servicios, total, abono, estado, expira_at) " +
      "values ($1, $2, 'Pepe', '+56912345672', date_trunc('hour', now()) + make_interval(hours => $3), date_trunc('hour', now()) + make_interval(hours => $3, mins => 30), '[]', 12000, 4000, 'esperando_abono', now() + make_interval(mins => $4)) returning id, token",
      [B.id, B.owner_id, h, exp]))[0];
    const r1 = await reserva(30, 15);
    let v = await su('select public.reserva_ver($1) v', [r1.token]).then((x) => x[0].v);
    ok(v.barberia.mp === true, '/r/: la reserva ofrece ⚡ Mercado Pago');
    let x = await su("select public.reserva_mp_pagar($1, 'https://app.test/r/?t=x&mp=1') x", [r1.token]).then((y) => y[0].x);
    ok(x.ok && x.url === 'https://mp.test/pagar', '⚡ reserva_mp_pagar abre Mercado Pago');
    const c1 = (await su("select id, monto from public.cfx_mp_neg_cobros where ref = 'reserva:' || $1", [r1.id]))[0];
    ok(c1 && c1.monto === 4000, 'Cobro por el abono ($4.000) con la referencia de la reserva');
    const pago = (id, monto, ref) => su('update extensions.http_respuestas set content = $1 where url_like = $2',
      [JSON.stringify({ results: [{ id, status: 'approved', external_reference: ref, currency_id: 'CLP', transaction_amount: monto }] }), MP + '/v1/payments/search%']);
    await pago(555001, 3000, c1.id);
    v = await su('select public.reserva_mp_revisar($1) v', [r1.token]).then((y) => y[0].v);
    ok(v.estado === 'esperando_abono', '🔒 Pago incompleto ($3.000) NO agenda');
    await pago(555002, 4000, c1.id);
    v = await su('select public.reserva_mp_revisar($1) v', [r1.token]).then((y) => y[0].v);
    const R1 = (await su('select estado, pagado_con, mp_pago, confirmada_at from public.reservas where id = $1', [r1.id]))[0];
    ok(v.estado === 'agendada' && R1.pagado_con === 'link' && R1.mp_pago === '555002' && R1.confirmada_at, '✅ Pago completo: hora AGENDADA sola (sin comprobante)');
    const av = (await su("select count(*)::int n from public.avisos where para = $1 and cuerpo like '%Mercado Pago%'", [B.owner_id]))[0].n;
    ok(av >= 1, '🔔 El dueño recibe el aviso "⚡ abono pagado con Mercado Pago"');
    x = await su("select public.reserva_mp_pagar($1, null) x", [r1.token]).then((y) => y[0].x);
    ok(!x.ok, '🔒 Ya pagada: no abre otro cobro');

    // ---------- ⌛ Pagó justo antes de vencer: se pregunta a MP antes de liberar ----------
    const r2 = await reserva(31, 15);
    await su("select public.reserva_mp_pagar($1, null)", [r2.token]);
    const c2 = (await su("select id from public.cfx_mp_neg_cobros where ref = 'reserva:' || $1", [r2.id]))[0];
    await su("update public.reservas set expira_at = now() - interval '1 minute' where id = $1", [r2.id]);
    await pago(555003, 4000, c2.id);
    await su('select public.liberar_vencidas()');
    ok((await su('select estado from public.reservas where id = $1', [r2.id]))[0].estado === 'agendada', '⌛ Pagó y se pasó el reloj: NO se libera, queda agendada');
    // Mismo n° de pago para otro cobro: no vale 2 veces
    const r3 = await reserva(32, 15);
    await su("select public.reserva_mp_pagar($1, null)", [r3.token]);
    const c3 = (await su("select id from public.cfx_mp_neg_cobros where ref = 'reserva:' || $1", [r3.id]))[0];
    await pago(555003, 4000, c3.id);
    v = await su('select public.reserva_mp_revisar($1) v', [r3.token]).then((y) => y[0].v);
    ok(v.estado === 'esperando_abono', '🔒 Un n° de pago ya usado no agenda otra hora');
    // Cron
    await pago(555004, 4000, c3.id);
    ok((await su('select public.cfx_mp_neg_revisar_pendientes() n'))[0].n === 1, '⏱️ La revisión cada 1 min confirma los que no volvieron');
    ok((await su('select estado from public.reservas where id = $1', [r3.id]))[0].estado === 'agendada', '⏱️ …y la hora queda agendada');
    // Sin cuenta ni link: con MP la barbería sí recibe reservas por link
    await su("update public.barberias set link_pago = null, pago1_link = null, datos_transferencia = null, abono = 4000 where id = $1", [B.id]);
    ok(!/no configura/.test(await falla(() => su("select public.reservar_invitado($1, null, now() + interval '2 day', '{}'::uuid[], 'Ana', '+56 9 8765 4321')", [cod])) || ''), 'Solo con ⚡ MP (sin link ni transferencia) ya recibe reservas sin cuenta');

    // ---------- 📱 Pantalla /r/ (320 px) ----------
    const r4 = await reserva(33, 15);
    await t.page.goto(t.base + '/r/?t=' + r4.token); await t.page.waitForTimeout(2500);
    const txt = await t.page.evaluate(() => document.body.innerText);
    ok(/Pagar con Mercado Pago/.test(txt) && /Se aprueba solo/.test(txt), '/r/: botón ⚡ Pagar con Mercado Pago a la vista');
    const ancho = await t.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    ok(ancho, '/r/: sin scroll horizontal');
    await t.page.screenshot({ path: __dirname + '/capturas/barberia/g98_r.png', fullPage: true }).catch(() => {});
    // Desconectar
    e = await como('dueno@x.cl', 'public.cfx_mp_neg_guardar(null, null)');
    ok(!e.conectado, 'Desconectar: vuelve al link y comprobante');
    v = await su('select public.reserva_ver($1) v', [r4.token]).then((y) => y[0].v);
    ok(v.barberia.mp === false, '…y /r/ ya no ofrece Mercado Pago');
    // 📱 Dueño: Más → 💳 Links de pago → tarjeta ⚡ Tu Mercado Pago (núcleo), conectar desde la pantalla
    await su("update public.profiles set clave_temporal = false, tour_visto = true, terms_at = coalesce(terms_at, now()) where true").catch(() => {});
    const p = t.page;
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'dueno@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales();
    await p.goto(t.base + '/equipo/#links'); await p.reload(); await p.waitForTimeout(3000); await t.sinModales();
    await p.waitForSelector('#cMpNeg:not([hidden])', { timeout: 10000 }).catch(() => {});
    let card = await p.evaluate(() => { const c = document.querySelector('#cMpNeg'); return c && !c.hidden ? c.innerText : ''; });
    ok(/Tu Mercado Pago/.test(card) && /Conectar/.test(card), 'Dueño: Links de pago muestra ⚡ Tu Mercado Pago con Conectar');
    await p.fill('#cfxMpnTok', 'APP_USR-1234567890123456789012345-wxyz'); await p.click('[data-mpn="guardar"]'); await p.waitForTimeout(2000);
    card = await p.evaluate(() => document.querySelector('#cMpNeg').innerText);
    ok(/Activo/.test(card) && /JUANBARBER/.test(card) && /wxyz/.test(card), 'Dueño: conecta desde la pantalla → ✅ Activo · JUANBARBER (…wxyz)');
    await p.evaluate(() => document.querySelector('#cMpNeg').scrollIntoView());
    await p.screenshot({ path: __dirname + '/capturas/barberia/g98_dueno.png' }).catch(() => {});
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Dueño: sin scroll horizontal');
    ok(!t.errores.filter((m) => !/favicon|404|status of 400/.test(m)).length, 'Sin errores en la consola ' + t.errores.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'Error: ' + (e.stack || e).toString().slice(0, 500)); }
  await t.cerrar();

  // ==================== 🅿️ ESTACIONA: arriendo y 🔁 renovación del mes con el MP del dueño ====================
  execSync(__dirname + '/base.sh /home/user/Estacionamiento p_g98e', { stdio: 'ignore' });
  const t2 = await abrir('/home/user/Estacionamiento', 'p_g98e'); const su2 = t2.sim.su, como2 = comoDe(su2);
  try {
    const d = await t2.sim.crearUsuario('dueno@x.cl', 'clave123'), c = await t2.sim.crearUsuario('cliente@x.cl', 'clave123');
    await su2("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    const est = (await su2("insert into public.estacionamientos (dueno, titulo, direccion, lat, lng, precio_hora, precio_mes) values ($1,'Est G98','Calle 1',-33.44,-70.65,1000,60000) returning id", [d.id]))[0].id;
    await su2("insert into extensions.http_respuestas values ($1, 200, '{\"nickname\":\"DUENO\"}'), ($2, 201, '{\"init_point\":\"https://mp.test/pagar\"}'), ($3, 200, '{\"results\":[]}')",
      [MP + '/users/me', MP + '/checkout/preferences', MP + '/v1/payments/search%']);
    const pago = (id, monto, ref) => su2('update extensions.http_respuestas set content = $1 where url_like = $2',
      [JSON.stringify({ results: [{ id, status: 'approved', external_reference: ref, currency_id: 'CLP', transaction_amount: monto }] }), MP + '/v1/payments/search%']);
    const e = await como2('dueno@x.cl', "public.cfx_mp_neg_guardar('APP_USR-1234567890123456789012345-ef01', true)");
    ok(e.conectado && e.nick === 'DUENO', 'Estaciona: el dueño conecta su Mercado Pago');
    const aid = await como2('cliente@x.cl', "public.solicitar_arriendo($2, 'mes', now() + interval '1 hour', 1, '', null)", [est]);
    let A = (await como2('cliente@x.cl', 'public.mis_arriendos()')).find((x) => x.id === aid);
    ok(A.estado === 'por_pagar' && A.mp === true, 'Estaciona: la reserva por pagar ofrece ⚡ Mercado Pago');
    ok(/no encontrada/.test(await falla(() => como2('dueno@x.cl', 'public.arriendo_mp_pagar($2, null)', [aid])) || ''), 'Estaciona: 🔒 solo quien arrienda abre el pago');
    let x = await como2('cliente@x.cl', 'public.arriendo_mp_pagar($2, null)', [aid]);
    ok(x.ok, 'Estaciona: ⚡ abre Mercado Pago por $60.000');
    const c1 = (await su2("select id, monto from public.cfx_mp_neg_cobros where ref = 'arriendo:' || $1", [aid]))[0];
    await pago(777001, 60000, c1.id);
    x = await como2('cliente@x.cl', 'public.arriendo_mp_revisar($2)', [aid]);
    A = (await su2('select estado, pago_estado, mp_pago from public.arriendos where id = $1', [aid]))[0];
    ok(A.estado === 'aceptado' && A.pago_estado === 'pagado' && A.mp_pago === '777001', 'Estaciona: ✅ pagado → reserva CONFIRMADA sola (sin que el dueño toque nada)');
    ok((await su2("select count(*)::int n from public.notificaciones where usuario = $1 and titulo = '⚡ Pagado con Mercado Pago'", [d.id]))[0].n === 1, 'Estaciona: 🔔 el dueño recibe "⚡ Pagado con Mercado Pago"');
    // 🔁 renovación del mes: se pide sola 5 días antes → paga con MP → se extiende sola
    await su2("update public.arriendos set inicio = now() - interval '26 days', fin = now() + interval '4 days', renovar = true where id = $1", [aid]);
    await su2('select public.renovar_mensuales()');
    A = (await como2('cliente@x.cl', 'public.mis_arriendos()')).find((y) => y.id === aid);
    ok(A.ext && A.ext.auto && A.mp === true, 'Estaciona: 🔁 renovación del mes ofrece ⚡ Mercado Pago');
    const fin0 = (await su2('select fin from public.arriendos where id = $1', [aid]))[0].fin;
    x = await como2('cliente@x.cl', 'public.arriendo_mp_pagar($2, null)', [aid]);
    const c2 = (await su2("select id, monto from public.cfx_mp_neg_cobros where ref like 'ext:' || $1 || ':%'", [aid]))[0];
    ok(x.ok && c2 && c2.monto === 60000, 'Estaciona: cobro del mes siguiente ($60.000)');
    await pago(777002, 60000, c2.id);
    ok((await su2('select public.cfx_mp_neg_revisar_pendientes() n'))[0].n === 1, 'Estaciona: ⏱️ la revisión de cada minuto lo confirma');
    A = (await su2('select fin, cantidad, ext_cantidad, monto_pagar from public.arriendos where id = $1', [aid]))[0];
    ok(A.ext_cantidad === null && A.cantidad === 2 && new Date(A.fin) - new Date(fin0) > 27 * 864e5 && A.monto_pagar === 120000, 'Estaciona: 🔁 mes renovado y pagado solo (+1 mes, $120.000 en total)');
    // ⌛ pagó y se pasó el reloj: no se libera
    await su2("update public.estacionamientos set estado = 'disponible' where id = $1", [est]);
    await su2("update public.perfiles set premium_hasta = now() + interval '30 days' where email = 'cliente@x.cl'").catch(() => {});
    const aid2 = await como2('cliente@x.cl', "public.solicitar_arriendo($2, 'hora', now() + interval '60 days', 2, '', null)", [est]);
    await como2('cliente@x.cl', 'public.arriendo_mp_pagar($2, null)', [aid2]);
    const c3 = (await su2("select id from public.cfx_mp_neg_cobros where ref = 'arriendo:' || $1", [aid2]))[0];
    await su2("update public.arriendos set expira_at = now() - interval '1 minute' where id = $1", [aid2]);
    await pago(777003, 2000, c3.id);
    await su2('select public.liberar_vencidas()');
    ok((await su2('select estado from public.arriendos where id = $1', [aid2]))[0].estado === 'aceptado', 'Estaciona: ⌛ pagó justo antes de vencer → NO se libera, queda confirmada');
    // 📱 Pantallas: quien arrienda ve el botón; el dueño ve la tarjeta en Links de pago
    const aid3 = await como2('cliente@x.cl', "public.solicitar_arriendo($2, 'hora', now() + interval '90 days', 1, '', null)", [est]);
    let p = t2.page;
    const entrar = async (mail) => {
      await p.goto(t2.base + '/#/avisos'); await p.waitForTimeout(1500);
      await p.click('button[data-t=in]'); await p.waitForTimeout(300);
      await p.fill('#lEmail', mail); await p.fill('#lClave', 'clave123'); await p.press('#lClave', 'Enter');
      await p.waitForTimeout(2500); await t2.sinModales(p);
    };
    await entrar('cliente@x.cl');
    await p.goto(t2.base + '/#/r/' + aid3); await p.reload(); await p.waitForTimeout(2500);
    let txt = await p.evaluate(() => document.body.innerText);
    ok(/Pagar \$1\.000 con Mercado Pago/.test(txt) && /Se confirma solo/.test(txt), 'Estaciona 📱: botón ⚡ Pagar $1.000 con Mercado Pago');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Estaciona 📱: sin scroll horizontal');
    await p.screenshot({ path: __dirname + '/capturas/estacionamiento/g98_reserva.png', fullPage: true }).catch(() => {});
    p = (await t2.nuevo()).page;
    await entrar('dueno@x.cl');
    await p.goto(t2.base + '/#/mas/links'); await p.reload(); await p.waitForTimeout(2500); await t2.sinModales(p);
    await p.waitForSelector('#lkMp:not([hidden])', { timeout: 8000 }).catch(() => {});
    txt = await p.evaluate(() => { const z = document.querySelector('#lkMp'); return z && !z.hidden ? z.innerText : ''; });
    ok(/Tu Mercado Pago/.test(txt) && /Activo/.test(txt) && /DUENO/.test(txt), 'Estaciona 📱: el dueño ve ⚡ Tu Mercado Pago · ✅ Activo en Links de pago');
    await p.evaluate(() => { const z = document.querySelector('#lkMp'); if (z) z.scrollIntoView(); });
    await p.screenshot({ path: __dirname + '/capturas/estacionamiento/g98_dueno.png' }).catch(() => {});
    ok(!t2.errores.filter((m) => !/favicon|404|status of 400|tile|maplibre|openfreemap|openstreetmap/i.test(m)).length, 'Estaciona: sin errores en la consola ' + t2.errores.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'Estaciona error: ' + (e.stack || e).toString().slice(0, 500)); }
  await t2.cerrar();

  // ==================== 🚲 BICITALLER: abono de la reserva con el MP del taller ====================
  execSync(__dirname + '/base.sh /home/user/Taller p_g98t', { stdio: 'ignore' });
  const t3 = await abrir('/home/user/Taller', 'p_g98t'); const su3 = t3.sim.su, como3 = comoDe(su3);
  try {
    await t3.sim.crearUsuario(ADM, 'admin123');
    await t3.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Sur', nombre: 'Ana' });
    const T = (await su3('select id, owner_id from public.talleres limit 1'))[0];
    await su3("insert into extensions.http_respuestas values ($1, 200, '{\"nickname\":\"BICISUR\"}'), ($2, 201, '{\"init_point\":\"https://mp.test/pagar\"}'), ($3, 200, '{\"results\":[]}')",
      [MP + '/users/me', MP + '/checkout/preferences', MP + '/v1/payments/search%']);
    const pago = (id, monto, ref) => su3('update extensions.http_respuestas set content = $1 where url_like = $2',
      [JSON.stringify({ results: [{ id, status: 'approved', external_reference: ref, currency_id: 'CLP', transaction_amount: monto }] }), MP + '/v1/payments/search%']);
    const e = await como3('dueno@x.cl', "public.cfx_mp_neg_guardar('APP_USR-1234567890123456789012345-b1c1', true)");
    ok(e.conectado && e.nick === 'BICISUR', 'BiciTaller: el dueño conecta su Mercado Pago');
    const reserva = async (dias, exp) => (await su3("insert into public.reservas (taller_id, fecha, hora, hora_fin, nombre, telefono, abono_monto, estado, expira_at) " +
      "values ($1, current_date + $2::int, '10:00', '11:00', 'Pepe', '+56912345672', 5000, 'por_pagar', now() + make_interval(mins => $3)) returning id, token", [T.id, dias, exp]))[0];
    const r1 = await reserva(3, 20);
    let v = await su3('select public.reserva_ver($1) v', [r1.token]).then((y) => y[0].v);
    ok(v.mp === true, 'BiciTaller /r/: la reserva ofrece ⚡ Mercado Pago');
    const x = await su3('select public.reserva_mp_pagar($1, null) x', [r1.token]).then((y) => y[0].x);
    ok(x.ok, 'BiciTaller: ⚡ abre Mercado Pago por el abono');
    const c1 = (await su3("select id from public.cfx_mp_neg_cobros where ref = 'reserva:' || $1", [r1.id]))[0];
    await pago(888001, 4999, c1.id);
    v = await su3('select public.reserva_mp_revisar($1) v', [r1.token]).then((y) => y[0].v);
    ok(v.estado === 'por_pagar', 'BiciTaller: 🔒 pago incompleto no confirma');
    await pago(888002, 5000, c1.id);
    v = await su3('select public.reserva_mp_revisar($1) v', [r1.token]).then((y) => y[0].v);
    ok(v.estado === 'confirmada' && v.abono_estado === 'pagado', 'BiciTaller: ✅ abono pagado → reserva CONFIRMADA sola');
    const r2 = await reserva(4, 20);
    await su3('select public.reserva_mp_pagar($1, null)', [r2.token]);
    const c2 = (await su3("select id from public.cfx_mp_neg_cobros where ref = 'reserva:' || $1", [r2.id]))[0];
    await su3("update public.reservas set expira_at = now() - interval '1 minute' where id = $1", [r2.id]);
    await pago(888003, 5000, c2.id);
    await su3('select public.tareas_periodicas()');
    ok((await su3('select estado from public.reservas where id = $1', [r2.id]))[0].estado === 'confirmada', 'BiciTaller: ⌛ pagó y se pasó el reloj → NO se libera');
    const r3 = await reserva(5, 20);
    await t3.page.goto(t3.base + '/r/?t=' + r3.token); await t3.page.waitForTimeout(2500);
    const txt = await t3.page.evaluate(() => document.body.innerText);
    ok(/Pagar \$5\.000 con Mercado Pago/.test(txt) && /Se confirma solo/.test(txt), 'BiciTaller 📱 /r/: botón ⚡ Pagar $5.000 con Mercado Pago');
    ok(await t3.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'BiciTaller 📱: sin scroll horizontal');
    await t3.page.screenshot({ path: __dirname + '/capturas/taller/g98_r.png', fullPage: true }).catch(() => {});
    // 📱 Dueño: Más → 💳 Abono → tarjeta ⚡ Tu Mercado Pago
    const q = (await t3.nuevo()).page;
    await q.goto(t3.base + '/'); await q.waitForTimeout(1200);
    await q.fill('input[type=email]:visible', 'dueno@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter');
    await q.waitForTimeout(3500); await t3.sinModales(q);
    await q.evaluate(() => { location.hash = '#mas/abono'; }); await q.waitForTimeout(2500);
    await q.waitForSelector('#aMp:not([hidden])', { timeout: 8000 }).catch(() => {});
    const card = await q.evaluate(() => { const z = document.querySelector('#aMp'); return z && !z.hidden ? z.innerText : ''; });
    ok(/Tu Mercado Pago/.test(card) && /Activo/.test(card) && /BICISUR/.test(card), 'BiciTaller 📱: el dueño ve ⚡ Tu Mercado Pago · ✅ Activo en Más → Abono');
    await q.evaluate(() => { const z = document.querySelector('#aMp'); if (z) z.scrollIntoView(); });
    await q.screenshot({ path: __dirname + '/capturas/taller/g98_dueno.png' }).catch(() => {});
    ok(!t3.errores.filter((m) => !/favicon|404|status of 400/.test(m)).length, 'BiciTaller: sin errores en la consola ' + t3.errores.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'BiciTaller error: ' + (e.stack || e).toString().slice(0, 500)); }
  await t3.cerrar();
  console.log(f ? '✗ ' + f + ' fallaron' : '✓ todo bien'); process.exit(f ? 1 : 0);
})();
