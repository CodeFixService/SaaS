// G107 · 💳 FLOW (WEBPAY) PROPIO DE CADA NEGOCIO (núcleo mp_negocio.sql cfx_flow_neg_* + CFX_PAGOS.mpNegocio/flowNegocio/botonesNegocio).
//   El dueño pega su API Key + Secret de Flow (nadie las lee) → el cliente toca "💳 Pagar con Webpay" → la BASE confirma con Flow
//   (status 2 + CLP + monto completo + n° de Flow 1 vez) → mismo gancho que Mercado Pago: 💈 hora agendada · 🚲 reserva confirmada ·
//   🅿️ arriendo confirmado · 🛍️ pedido pagado. FALLA con el código viejo (no existen cfx_flow_neg_guardar ni p_medio ni el botón).
// Uso: ANCHO=320 node g107.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const MP = 'https://api.mercadopago.com', FL = 'https://www.flow.cl/api';
const KEY = '1F90971E-8276-4715-97FF-2BLG5030EE3B', SEC = 'abcdef0123456789abcdef0123456789abcdef01';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
// Flow simulado: crear cobro → url+token; estado → lo que diga flowEstado.
const stubFlow = (su) => su("insert into extensions.http_respuestas values ($1, 200, '{\"url\":\"https://flow.test/pay\",\"token\":\"tk107\",\"flowOrder\":1}'), ($2, 200, '{\"status\":1}') on conflict (url_like) do nothing",
  [FL + '/payment/create', FL + '/payment/getStatusByCommerceId%']);
const flowEstado = (su, cobro, status, monto, orden) => su('update extensions.http_respuestas set content = $1 where url_like = $2',
  [JSON.stringify({ status, commerceOrder: cobro, currency: 'CLP', amount: monto, flowOrder: orden }), FL + '/payment/getStatusByCommerceId%']);
const sinScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const aFlow = async (p) => { await p.route('https://flow.test/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>FLOW</p>' })); };
(async () => {
  // ==================== 💈 BARBERÍA ====================
  execSync(__dirname + '/base.sh /home/user/Barberia p_g107', { stdio: 'ignore' });
  const t = await abrir('/home/user/Barberia', 'p_g107'); const su = t.sim.su, como = comoDe(su);
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'barberia', barberia: 'Barbería Juan', nombre: 'Juan', telefono: '+56912345671' });
    const cod = (await su('select codigo from public.barberias limit 1'))[0].codigo;
    await t.sim.crearUsuario('cli@x.cl', 'clave123', { rol: 'cliente', barberia: cod, nombre: 'Pepe', telefono: '+56912345672' });
    const B = (await su('select b.id, b.owner_id from public.barberias b limit 1'))[0];
    await stubFlow(su);
    // 🔑 Conectar (solo el dueño; las llaves no se leen)
    let e = await como('dueno@x.cl', 'public.cfx_flow_neg_estado()');
    ok(e.dueno && !e.conectado, 'Dueño: Flow sin conectar');
    ok(/Solo el dueño/.test(await falla(() => como('cli@x.cl', 'public.cfx_flow_neg_guardar($2, $3, true)', [KEY, SEC])) || ''), '🔒 Un cliente no conecta Flow');
    ok(/Secret Key/.test(await falla(() => como('dueno@x.cl', "public.cfx_flow_neg_guardar($2, 'corta', true)", [KEY])) || ''), '🔒 Llave inválida se rechaza');
    await su("update extensions.http_respuestas set status = 401 where url_like = $1", [FL + '/payment/getStatusByCommerceId%']);
    ok(/no aceptó/.test(await falla(() => como('dueno@x.cl', 'public.cfx_flow_neg_guardar($2, $3, true)', [KEY, SEC])) || ''), '🔒 Llaves que Flow rechaza (401) no se guardan');
    await su("update extensions.http_respuestas set status = 200 where url_like = $1", [FL + '/payment/getStatusByCommerceId%']);
    e = await como('dueno@x.cl', 'public.cfx_flow_neg_guardar($2, $3, true)', [KEY, SEC]);
    ok(e.conectado && e.activo && e.fin === 'EE3B', '💳 Flow conectado (…EE3B)');
    const P = (await su("select has_table_privilege('authenticated', 'public.cfx_flow_negocio', 'select') a, " +
      "has_function_privilege('anon', 'public.cfx_flow_neg_cobro(uuid, text, text, integer, text, timestamptz)', 'execute') b, " +
      "has_function_privilege('authenticated', 'public.cfx_flow_neg_cfg(uuid)', 'execute') c"))[0];
    ok(!P.a && !P.b && !P.c, '🔒 Nadie lee las llaves ni crea cobros desde fuera');
    // Reserva → /r/ ofrece 💳 Webpay (y no MP)
    const reserva = async (h, exp) => (await su("insert into public.reservas (barberia_id, barbero_id, cliente_nombre, cliente_tel, inicio, fin, servicios, total, abono, estado, expira_at) " +
      "values ($1, $2, 'Pepe', '+56912345672', date_trunc('hour', now()) + make_interval(hours => $3), date_trunc('hour', now()) + make_interval(hours => $3, mins => 30), '[]', 12000, 4000, 'esperando_abono', now() + make_interval(mins => $4)) returning id, token",
      [B.id, B.owner_id, h, exp]))[0];
    const r1 = await reserva(30, 15);
    let v = (await su('select public.reserva_ver($1) v', [r1.token]))[0].v;
    ok(v.barberia.mp === true && v.barberia.medios.flow === true && v.barberia.medios.mp === false, '/r/: ofrece 💳 Webpay (sin Mercado Pago)');
    let x = (await su("select public.reserva_mp_pagar($1, 'https://app.test/r/?t=x&mp=1') x", [r1.token]))[0].x;
    ok(x.ok && x.url === 'https://flow.test/pay?token=tk107', '💳 Sin MP: abre Webpay (Flow) solo');
    const c1 = (await su("select id, monto, medio, volver from public.cfx_mp_neg_cobros where ref = 'reserva:' || $1", [r1.id]))[0];
    ok(c1 && c1.monto === 4000 && c1.medio === 'flow', 'Cobro Flow por el abono ($4.000)');
    ok((await su("select public.cfx_pago_volver('n:' || $1) v", [c1.id]))[0].v === 'https://app.test/r/?t=x&mp=1', '↩️ Flow vuelve (POST) → la función redirige a /r/');
    await flowEstado(su, c1.id, 1, 4000, 9001);
    ok((await su('select public.reserva_mp_revisar($1) v', [r1.token]))[0].v.estado === 'esperando_abono', '🔒 Pendiente en Flow (status 1) NO agenda');
    await flowEstado(su, c1.id, 2, 3999, 9001);
    ok((await su('select public.reserva_mp_revisar($1) v', [r1.token]))[0].v.estado === 'esperando_abono', '🔒 Monto incompleto NO agenda');
    await flowEstado(su, c1.id, 2, 4000, 9001);
    ok((await su("select public.cfx_mp_aviso('n:' || $1) a", [c1.id]))[0].a === true, '⚡ Aviso de Flow (?cfx_mp=n:…) confirma al instante');
    const R1 = (await su('select estado, mp_pago from public.reservas where id = $1', [r1.id]))[0];
    ok(R1.estado === 'agendada' && R1.mp_pago === 'flow:9001', '✅ Pagado con Webpay: hora AGENDADA sola');
    ok((await su("select count(*)::int n from public.avisos where cuerpo like '%Webpay%'"))[0].n >= 1, '🔔 Aviso "💳 abono pagado con Webpay"');
    // Mismo n° de Flow para otra reserva: no vale 2 veces
    const r2 = await reserva(31, 15);
    await su("select public.reserva_mp_pagar($1, 'https://app.test/r/')", [r2.token]);
    const c2 = (await su("select id from public.cfx_mp_neg_cobros where ref = 'reserva:' || $1", [r2.id]))[0];
    await flowEstado(su, c2.id, 2, 4000, 9001);
    ok((await su('select public.reserva_mp_revisar($1) v', [r2.token]))[0].v.estado === 'esperando_abono', '🔒 N° de Flow ya usado no agenda otra hora');
    await flowEstado(su, c2.id, 2, 4000, 9002);
    ok((await su('select public.cfx_mp_neg_revisar_pendientes() n'))[0].n === 1, '⏱️ La revisión de cada minuto confirma Flow también');
    // Con MP y Flow: el cliente elige
    await su("insert into extensions.http_respuestas values ($1, 200, '{\"nickname\":\"JUAN\"}'), ($2, 201, '{\"init_point\":\"https://mp.test/pagar\"}'), ($3, 200, '{\"results\":[]}')",
      [MP + '/users/me', MP + '/checkout/preferences', MP + '/v1/payments/search%']);
    await como('dueno@x.cl', "public.cfx_mp_neg_guardar('APP_USR-1234567890123456789012345-abcd', true)");
    const r3 = await reserva(32, 15);
    x = (await su("select public.reserva_mp_pagar($1, 'https://app.test/r/') x", [r3.token]))[0].x;
    ok(x.url === 'https://mp.test/pagar', 'Con los 2: sin elegir → Mercado Pago (como antes)');
    x = (await su("select public.reserva_mp_pagar($1, 'https://app.test/r/', 'flow') x", [r3.token]))[0].x;
    ok(x.url === 'https://flow.test/pay?token=tk107', 'Con los 2: elige 💳 Webpay → Flow');
    // 📱 /r/ (320 px): los 2 botones; tocar Webpay va a Flow
    const p0 = t.page; await aFlow(p0);
    await p0.goto(t.base + '/r/?t=' + r3.token); await p0.waitForTimeout(2500);
    const txt = await p0.evaluate(() => document.body.innerText);
    ok(/Pagar con Mercado Pago/.test(txt) && /Pagar con Webpay/.test(txt), '📱 /r/: botones ⚡ Mercado Pago y 💳 Webpay');
    ok(await sinScroll(p0), '📱 /r/: sin scroll horizontal');
    await p0.screenshot({ path: __dirname + '/capturas/barberia/g107_r.png', fullPage: true }).catch(() => {});
    await p0.click('[data-mp="flow"]'); await p0.waitForTimeout(2000);
    ok(/flow\.test\/pay/.test(p0.url()), '📱 /r/: tocar 💳 Webpay abre Flow');
    // 📱 Dueño: Más → 💳 Links de pago → tarjeta 💳 Tu Webpay con Flow (debajo de ⚡ Tu Mercado Pago)
    await su("update public.profiles set clave_temporal = false, tour_visto = true, terms_at = coalesce(terms_at, now()) where true").catch(() => {});
    const p = (await t.nuevo()).page;
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'dueno@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(p);
    await p.goto(t.base + '/equipo/#links'); await p.reload(); await p.waitForTimeout(3000); await t.sinModales(p);
    await p.waitForSelector('.cfx-fln:not([hidden])', { timeout: 10000 }).catch(() => {});
    let card = await p.evaluate(() => { const c = document.querySelector('.cfx-fln'); return c && !c.hidden ? c.innerText : ''; });
    ok(/Webpay con Flow/.test(card) && /Activo/.test(card) && /EE3B/.test(card), 'Dueño 📱: ve 💳 Tu Webpay con Flow · ✅ Activo (…EE3B)');
    await p.uncheck('#cfxFlnOn'); await p.click('[data-fln="guardar"]'); await p.waitForTimeout(2000);
    card = await p.evaluate(() => document.querySelector('.cfx-fln').innerText);
    ok(/En pausa/.test(card), 'Dueño 📱: pausa Webpay desde la pantalla');
    ok((await su('select public.reserva_ver($1) v', [r3.token]))[0].v.barberia.medios.flow === false, '…y el cliente ya no ve Webpay');
    await p.evaluate(() => document.querySelector('.cfx-fln').scrollIntoView());
    await p.screenshot({ path: __dirname + '/capturas/barberia/g107_dueno.png' }).catch(() => {});
    ok(await sinScroll(p), 'Dueño 📱: sin scroll horizontal');
    ok(!t.errores.filter((m) => !/favicon|404|status of 400|flow\.test/.test(m)).length, 'Sin errores en la consola ' + t.errores.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'Error: ' + (e.stack || e).toString().slice(0, 500)); }
  await t.cerrar();

  // ==================== 🚲 BICITALLER ====================
  execSync(__dirname + '/base.sh /home/user/Taller p_g107t', { stdio: 'ignore' });
  const t3 = await abrir('/home/user/Taller', 'p_g107t'); const su3 = t3.sim.su, como3 = comoDe(su3);
  try {
    await t3.sim.crearUsuario(ADM, 'admin123');
    await t3.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Sur', nombre: 'Ana' });
    const T = (await su3('select id from public.talleres limit 1'))[0];
    await stubFlow(su3);
    ok((await como3('dueno@x.cl', 'public.cfx_flow_neg_guardar($2, $3, true)', [KEY, SEC])).conectado, 'BiciTaller: el dueño conecta su Flow');
    const r1 = (await su3("insert into public.reservas (taller_id, fecha, hora, hora_fin, nombre, telefono, abono_monto, estado, expira_at) " +
      "values ($1, current_date + 3, '10:00', '11:00', 'Pepe', '+56912345672', 5000, 'por_pagar', now() + interval '20 minutes') returning id, token", [T.id]))[0];
    const v = (await su3('select public.reserva_ver($1) v', [r1.token]))[0].v;
    ok(v.mp === true && v.medios.flow === true && !v.medios.mp, 'BiciTaller /r/: ofrece 💳 Webpay');
    const x = (await su3("select public.reserva_mp_pagar($1, 'https://app.test/r/?t=x&mp=1', 'flow') x", [r1.token]))[0].x;
    ok(x.ok, 'BiciTaller: 💳 abre Webpay');
    const c1 = (await su3("select id from public.cfx_mp_neg_cobros where ref = 'reserva:' || $1", [r1.id]))[0];
    await flowEstado(su3, c1.id, 2, 5000, 7001);
    const w = (await su3('select public.reserva_mp_revisar($1) v', [r1.token]))[0].v;
    ok(w.estado === 'confirmada' && w.abono_estado === 'pagado', 'BiciTaller: ✅ pagado con Webpay → CONFIRMADA sola');
    const r2 = (await su3("insert into public.reservas (taller_id, fecha, hora, hora_fin, nombre, telefono, abono_monto, estado, expira_at) " +
      "values ($1, current_date + 4, '10:00', '11:00', 'Pepe', '+56912345672', 5000, 'por_pagar', now() + interval '20 minutes') returning id, token", [T.id]))[0];
    const p = t3.page; await aFlow(p);
    await p.goto(t3.base + '/r/?t=' + r2.token); await p.waitForTimeout(2500);
    const txt = await p.evaluate(() => document.body.innerText);
    ok(/Pagar \$5\.000 con Webpay/.test(txt) && !/con Mercado Pago/.test(txt), 'BiciTaller 📱 /r/: botón 💳 Pagar $5.000 con Webpay (sin MP)');
    ok(await sinScroll(p), 'BiciTaller 📱: sin scroll horizontal');
    await p.screenshot({ path: __dirname + '/capturas/taller/g107_r.png', fullPage: true }).catch(() => {});
    await p.click('[data-mp="flow"]'); await p.waitForTimeout(2000);
    ok(/flow\.test\/pay/.test(p.url()), 'BiciTaller 📱: tocar Webpay abre Flow');
    ok(!t3.errores.filter((m) => !/favicon|404|status of 400|flow\.test/.test(m)).length, 'BiciTaller: sin errores en la consola ' + t3.errores.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'BiciTaller error: ' + (e.stack || e).toString().slice(0, 500)); }
  await t3.cerrar();

  // ==================== 🅿️ ESTACIONA ====================
  execSync(__dirname + '/base.sh /home/user/Estacionamiento p_g107e', { stdio: 'ignore' });
  const t2 = await abrir('/home/user/Estacionamiento', 'p_g107e'); const su2 = t2.sim.su, como2 = comoDe(su2);
  try {
    const d = await t2.sim.crearUsuario('dueno@x.cl', 'clave123'); await t2.sim.crearUsuario('cliente@x.cl', 'clave123');
    await su2("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    const est = (await su2("insert into public.estacionamientos (dueno, titulo, direccion, lat, lng, precio_hora, precio_mes) values ($1,'Est G107','Calle 1',-33.44,-70.65,1000,60000) returning id", [d.id]))[0].id;
    await stubFlow(su2);
    ok((await como2('dueno@x.cl', 'public.cfx_flow_neg_guardar($2, $3, true)', [KEY, SEC])).conectado, 'Estaciona: el dueño conecta su Flow');
    const aid = await como2('cliente@x.cl', "public.solicitar_arriendo($2, 'mes', now() + interval '1 hour', 1, '', null)", [est]);
    let A = (await como2('cliente@x.cl', 'public.mis_arriendos()')).find((y) => y.id === aid);
    ok(A.mp === true && A.medios.flow === true && !A.medios.mp, 'Estaciona: la reserva ofrece 💳 Webpay');
    const x = await como2('cliente@x.cl', "public.arriendo_mp_pagar($2, 'https://app.test/?mp=1', 'flow')", [aid]);
    ok(x.ok, 'Estaciona: 💳 abre Webpay por $60.000');
    const c1 = (await su2("select id from public.cfx_mp_neg_cobros where ref = 'arriendo:' || $1", [aid]))[0];
    await flowEstado(su2, c1.id, 2, 60000, 6001);
    await como2('cliente@x.cl', 'public.arriendo_mp_revisar($2)', [aid]);
    A = (await su2('select estado, mp_pago from public.arriendos where id = $1', [aid]))[0];
    ok(A.estado === 'aceptado' && A.mp_pago === 'flow:6001', 'Estaciona: ✅ pagado con Webpay → CONFIRMADA sola');
    ok((await su2("select count(*)::int n from public.notificaciones where usuario = $1 and titulo = '💳 Pagado con Webpay'", [d.id]))[0].n === 1, 'Estaciona: 🔔 "💳 Pagado con Webpay" al dueño');
    A = (await como2('cliente@x.cl', 'public.mis_arriendos()')).find((y) => y.id === aid);
    ok(A.auto_ok === false, 'Estaciona: ⚡ pago automático con tarjeta sigue siendo solo con Mercado Pago');
    await su2("update public.estacionamientos set estado = 'disponible' where id = $1", [est]);
    await su2("update public.perfiles set premium_hasta = now() + interval '30 days' where email = 'cliente@x.cl'").catch(() => {});
    const aid3 = await como2('cliente@x.cl', "public.solicitar_arriendo($2, 'hora', now() + interval '90 days', 1, '', null)", [est]);
    const p = t2.page;
    await p.goto(t2.base + '/#/avisos'); await p.waitForTimeout(1500);
    await p.click('button[data-t=in]'); await p.waitForTimeout(300);
    await p.fill('#lEmail', 'cliente@x.cl'); await p.fill('#lClave', 'clave123'); await p.press('#lClave', 'Enter');
    await p.waitForTimeout(2500); await t2.sinModales(p);
    await p.goto(t2.base + '/#/r/' + aid3); await p.reload(); await p.waitForTimeout(2500);
    const txt = await p.evaluate(() => document.body.innerText);
    ok(/Pagar \$1\.000 con Webpay/.test(txt) && !/con Mercado Pago/.test(txt), 'Estaciona 📱: botón 💳 Pagar $1.000 con Webpay');
    ok(await sinScroll(p), 'Estaciona 📱: sin scroll horizontal');
    await p.screenshot({ path: __dirname + '/capturas/estacionamiento/g107_reserva.png', fullPage: true }).catch(() => {});
    ok(!t2.errores.filter((m) => !/favicon|404|status of 400|tile|maplibre|openfreemap|openstreetmap|flow\.test/i.test(m)).length, 'Estaciona: sin errores en la consola ' + t2.errores.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'Estaciona error: ' + (e.stack || e).toString().slice(0, 500)); }
  await t2.cerrar();

  // ==================== 🛍️ DESPEGA: pedidos de la tienda ====================
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g107a', { stdio: 'ignore' });
  const t4 = await abrir('/home/user/Aplicaciones', 'p_g107a'); const su4 = t4.sim.su, como4 = comoDe(su4);
  try {
    const u = await t4.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await stubFlow(su4);
    const e = await como4('tienda@x.cl', 'public.cfx_flow_neg_guardar($2, $3, true)', [KEY, SEC]);
    ok(e.dueno && e.conectado, 'Despega: la tienda conecta su Flow');
    const ped = (await su4("insert into public.pedidos (negocio_id, lineas, subtotal, total, entrega, estado, retenido_hasta, token, invitado_nombre) values ($1, '[{\"nombre\":\"Polera\",\"cant\":1,\"precio\":12990,\"subtotal\":12990}]', 12990, 12990, 'retiro', 'pagando', now() + interval '30 minutes', 'tok107tok107tok107tok107', 'Pepe') returning id, token", [u.id]))[0];
    const vp = (await su4('select public.ver_pedido($1) v', [ped.token]))[0].v;
    ok(vp.link && vp.link.mp === true && vp.link.medios.flow === true && !vp.link.medios.mp, 'Despega: el pedido ofrece 💳 Webpay');
    const x = (await su4("select public.mp_pagar($1, 'https://app.test/r/?t=x') x", [ped.token]))[0].x;
    ok(x.ok && /flow\.test/.test(x.url), 'Despega: sin MP → abre Webpay');
    const c1 = (await su4("select id from public.cfx_mp_neg_cobros where ref = 'pedido:' || $1", [ped.id]))[0];
    await flowEstado(su4, c1.id, 2, 12990, 5001);
    ok((await su4('select public.mp_revisar($1) v', [ped.token]))[0].v.estado === 'preparando', 'Despega: ✅ pagado con Webpay → pedido PREPARANDO solo');
    ok((await su4('select mp_pago from public.pedidos where id = $1', [ped.id]))[0].mp_pago === 'flow:5001', 'Despega: queda el n° de Flow');
    const ped2 = (await su4("insert into public.pedidos (negocio_id, lineas, subtotal, total, entrega, estado, retenido_hasta, token, invitado_nombre) values ($1, '[]', 5000, 5000, 'retiro', 'pagando', now() + interval '30 minutes', 'tok107tok107tok107tok108', 'Ana') returning id, token", [u.id]))[0];
    const p = t4.page; await aFlow(p);
    await p.goto(t4.base + '/r/?t=' + ped2.token); await p.waitForTimeout(2500);
    const vis = await p.evaluate(() => ({ f: !document.getElementById('bFlow').classList.contains('hidden') && !!document.getElementById('bFlow').offsetParent, m: !document.getElementById('bMp').classList.contains('hidden') }));
    ok(vis.f && !vis.m, 'Despega 📱 /r/: botón 💳 Pagar con Webpay (sin MP)');
    ok(await sinScroll(p), 'Despega 📱: sin scroll horizontal');
    await p.screenshot({ path: __dirname + '/capturas/Aplicaciones/g107_r.png', fullPage: true }).catch(() => {});
    await p.click('#bFlow'); await p.waitForTimeout(2000);
    ok(/flow\.test\/pay/.test(p.url()), 'Despega 📱: tocar Webpay abre Flow');
    ok(!t4.errores.filter((m) => !/favicon|404|status of 400|flow\.test/.test(m)).length, 'Despega: sin errores en la consola ' + t4.errores.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'Despega error: ' + (e.stack || e).toString().slice(0, 500)); }
  await t4.cerrar();
  console.log(f ? '✗ ' + f + ' fallaron' : '✓ todo bien'); process.exit(f ? 1 : 0);
})();
