// G106 · ⚡ PAGO AUTOMÁTICO CON TARJETA (núcleo: suscripción "preapproval" de Mercado Pago con el MP del negocio) · 🅿️ Estaciona: arriendo mensual.
//   Quien arrienda autoriza su tarjeta 1 vez → MP cobra solo cada mes → la BASE confirma el cobro (CLP, monto completo, 1 vez) → +1 mes solo.
// FALLA con el código viejo (no existen arriendo_mp_auto ni cfx_mp_neg_suscribir).
// Uso: ANCHO=320 node g106.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const MP = 'https://api.mercadopago.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
(async () => {
  execSync(__dirname + '/base.sh /home/user/Estacionamiento p_g106', { stdio: 'ignore' });
  let pidio = null;  // texto por defecto del correo que muestra la app
  const t = await abrir('/home/user/Estacionamiento', 'p_g106', { dialogo: (d) => { if (d.type() === 'prompt') { pidio = d.defaultValue(); d.accept(pidio); } else d.accept(); } }); const su = t.sim.su, como = comoDe(su);
  try {
    const d = await t.sim.crearUsuario('dueno@x.cl', 'clave123'), c = await t.sim.crearUsuario('cliente@x.cl', 'clave123');
    await t.sim.crearUsuario('otro@x.cl', 'clave123');
    await su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    const est = (await su("insert into public.estacionamientos (dueno, titulo, direccion, lat, lng, precio_hora, precio_mes) values ($1,'Est G106','Calle 1',-33.44,-70.65,1000,60000) returning id", [d.id]))[0].id;
    const stub = (url, st, body) => su('insert into extensions.http_respuestas values ($1, $2, $3) on conflict (url_like) do update set status = excluded.status, content = excluded.content', [MP + url, st, JSON.stringify(body)]);
    await stub('/users/me', 200, { nickname: 'DUENO' });
    await stub('/preapproval', 201, { id: 'PRE1', init_point: 'https://mp.test/sus', status: 'pending' });
    await stub('/preapproval/PRE1', 200, { id: 'PRE1', status: 'pending' });
    await stub('/authorized_payments/search?preapproval_id=PRE1', 200, { results: [] });
    const cobros = (id, pre, res) => stub('/authorized_payments/search?preapproval_id=' + pre, 200, { results: res });
    const viejo = () => su("update public.cfx_mp_neg_subs set revisado_at = now() - interval '2 hours'");
    const A = async (id) => (await su('select estado, fin, cantidad, total, monto_pagar, ext_cantidad, renovar, mp_pago from public.arriendos where id = $1', [id]))[0];
    const notif = async (u, tit) => (await su('select count(*)::int n from public.notificaciones where usuario = $1 and titulo = $2', [u, tit]))[0].n;
    await como('dueno@x.cl', "public.cfx_mp_neg_guardar('APP_USR-1234567890123456789012345-ef01', true)");
    // arriendo mensual confirmado que termina en 10 días
    const aid = await como('cliente@x.cl', "public.solicitar_arriendo($2, 'mes', now() + interval '1 hour', 1, '', null)", [est]);
    await su("update public.arriendos set estado = 'aceptado', pago_estado = 'pagado', inicio = now() - interval '20 days', fin = now() + interval '10 days' where id = $1", [aid]);
    let M = (await como('cliente@x.cl', 'public.mis_arriendos()')).find((x) => x.id === aid);
    ok('auto' in M && M.auto === null && M.auto_ok === true, 'Quien arrienda: el arriendo mensual ofrece ⚡ pago automático');
    ok(/no encontrada/.test(await falla(() => como('dueno@x.cl', "public.arriendo_mp_auto($2, 'x@x.cl', 'https://a.cl/')", [aid])) || ''), '🔒 Solo quien arrienda activa el pago automático');
    let x = await como('cliente@x.cl', "public.arriendo_mp_auto($2, 'malo', 'https://a.cl/')", [aid]);
    ok(x.ok === false && /correo/.test(x.error), 'Correo no válido → no se crea');
    x = await como('cliente@x.cl', "public.arriendo_mp_auto($2, 'Cliente@X.cl', 'https://a.cl/?mpa=1')", [aid]);
    ok(x.ok && x.url === 'https://mp.test/sus', '⚡ Activar → abre Mercado Pago para autorizar la tarjeta');
    const req = JSON.parse((await su("select content from extensions.http_log where method = 'POST' and uri = $1 order by n desc limit 1", [MP + '/preapproval']))[0].content);
    const fin0 = (await A(aid)).fin;
    const ini = new Date(req.auto_recurring.start_date), espera = new Date(fin0) - 2 * 864e5;
    ok(req.auto_recurring.transaction_amount === 60000 && req.auto_recurring.currency_id === 'CLP' && req.auto_recurring.frequency_type === 'months' && req.payer_email === 'cliente@x.cl' && req.back_url === 'https://a.cl/?mpa=1',
      'Suscripción: $60.000 CLP cada mes, correo y regreso correctos');
    ok(Math.abs(ini - espera) < 120000, 'Primer cobro: 2 días antes de terminar el mes');
    M = (await como('cliente@x.cl', 'public.mis_arriendos()')).find((y) => y.id === aid);
    ok(M.auto && M.auto.estado === 'pendiente', 'Sin autorizar → ⏳ pendiente');
    await stub('/preapproval/PRE1', 200, { id: 'PRE1', status: 'authorized' });
    x = await como('cliente@x.cl', 'public.arriendo_mp_auto_revisar($2)', [aid]);
    ok(x && x.estado === 'activa', 'Al volver de MP: ✅ activa');
    ok(await notif(d.id, '⚡ Pago automático activado') === 1 && await notif(c.id, '⚡ Listo: tu mes se paga solo') === 1, '🔔 Dueño y quien arrienda reciben el aviso de activado');
    x = await como('cliente@x.cl', "public.arriendo_mp_auto($2, 'cliente@x.cl', 'https://a.cl/')", [aid]);
    ok(x.ok === false && /Ya tienes/.test(x.error), 'No se crea una 2.ª suscripción');
    // 🔁 5 días antes: NO se pide pagar (se cobra solo)
    await su("update public.arriendos set fin = now() + interval '4 days' where id = $1", [aid]);
    await su('select public.renovar_mensuales()'); await su('select public.renovar_mensuales()');
    let a = await A(aid);
    ok(a.ext_cantidad === null && a.renovar === true && await notif(c.id, '⚡ Tu mes se paga solo') === 1 && await notif(c.id, '🔁 Toca renovar tu mes') === 0, '🔁 Con pago automático no se pide comprobante: solo avisa "tu mes se paga solo" (1 vez)');
    // 💳 MP cobra → +1 mes solo
    const fin1 = a.fin;
    await cobros(1, 'PRE1', [{ id: 9001, preapproval_id: 'PRE1', status: 'processed', currency_id: 'CLP', transaction_amount: 60000, payment: { id: 8001, status: 'approved' } },
      { id: 9002, preapproval_id: 'PRE1', status: 'processed', currency_id: 'CLP', transaction_amount: 1000, payment: { id: 8002, status: 'approved' } },
      { id: 9003, preapproval_id: 'PRE1', status: 'recycling', currency_id: 'CLP', transaction_amount: 60000, payment: { id: 8003, status: 'rejected' } }]);
    await viejo();
    ok((await su('select public.cfx_mp_neg_subs_revisar() n'))[0].n === 1, '⏱️ El cron encuentra 1 cobro válido (ignora monto menor y rechazado)');
    a = await A(aid);
    ok(a.cantidad === 2 && new Date(a.fin) - new Date(fin1) > 27 * 864e5 && a.mp_pago === '8001' && a.total === 120000, '✅ Cobro aprobado → +1 mes solo ($120.000 en total)');
    ok(await notif(d.id, '⚡ Mes pagado solo') === 1 && await notif(c.id, '✅ Mes pagado') === 1, '🔔 Avisos de mes pagado');
    await viejo(); await su('select public.cfx_mp_neg_subs_revisar()');
    ok((await A(aid)).cantidad === 2, '🔒 El mismo cobro no suma 2 veces');
    // ⚠️ MP no responde al quitar → no se marca como apagado
    await stub('/preapproval/PRE1', 500, { message: 'error' });
    ok(/no respondió/.test(await falla(() => como('cliente@x.cl', 'public.arriendo_mp_auto_quitar($2)', [aid])) || ''), 'MP caído al quitar → avisa y no lo marca apagado');
    ok((await su("select estado from public.cfx_mp_neg_subs where ref = 'auto:' || $1", [aid]))[0].estado === 'activa', '…sigue activa (se puede reintentar)');
    await stub('/preapproval/PRE1', 200, { id: 'PRE1', status: 'authorized' });
    await como('cliente@x.cl', 'public.arriendo_mp_auto_quitar($2)', [aid]);
    const put = (await su("select count(*)::int n from extensions.http_log where method = 'PUT' and uri = $1 and content like '%cancelled%'", [MP + '/preapproval/PRE1']))[0].n;
    M = (await como('cliente@x.cl', 'public.mis_arriendos()')).find((y) => y.id === aid);
    ok(put >= 1 && M.auto === null && M.auto_ok === true && await notif(d.id, '⚡ Pago automático apagado') === 1, '⚡ Quitar → se apaga EN Mercado Pago, el dueño recibe aviso y se puede volver a activar');
    // 🚫 mes siguiente ocupado → cobro no suma, se apaga y el dueño debe devolver
    await stub('/preapproval', 201, { id: 'PRE2', init_point: 'https://mp.test/sus2', status: 'pending' });
    await stub('/preapproval/PRE2', 200, { id: 'PRE2', status: 'authorized' });
    await cobros(1, 'PRE2', []);
    await como('cliente@x.cl', "public.arriendo_mp_auto($2, 'cliente@x.cl', 'https://a.cl/')", [aid]);
    await como('cliente@x.cl', 'public.arriendo_mp_auto_revisar($2)', [aid]);
    a = await A(aid);
    await su("insert into public.arriendos (estacionamiento, dueno, arrendatario, modalidad, inicio, fin, cantidad, total, estado) select estacionamiento, dueno, (select id from auth.users where email = 'otro@x.cl'), 'mes', fin, fin + interval '1 month', 1, 60000, 'aceptado' from public.arriendos where id = $1", [aid]).catch((e) => console.log('  (insert otro: ' + e.message + ')'));
    await cobros(1, 'PRE2', [{ id: 9101, preapproval_id: 'PRE2', status: 'processed', currency_id: 'CLP', transaction_amount: 60000, payment: { id: 8101, status: 'approved' } }]);
    await viejo(); await su('select public.cfx_mp_neg_subs_revisar()');
    ok((await A(aid)).cantidad === 2 && await notif(d.id, '⚡ Pago automático recibido: revísalo') === 1, '🚫 Mes siguiente ocupado → no suma, el dueño recibe "revísalo" para devolver');
    ok((await su("select estado from public.cfx_mp_neg_subs where preapproval = 'PRE2'"))[0].estado === 'cancelada', '…y la suscripción se apaga sola');
    // 🏁 arriendo que terminó → se apaga sola en MP; apagada desde MP → aviso
    await su("delete from public.arriendos where arrendatario = (select id from auth.users where email = 'otro@x.cl')");
    await stub('/preapproval', 201, { id: 'PRE3', init_point: 'https://mp.test/sus3', status: 'pending' });
    await stub('/preapproval/PRE3', 200, { id: 'PRE3', status: 'authorized' });
    await cobros(1, 'PRE3', []);
    await como('cliente@x.cl', "public.arriendo_mp_auto($2, 'cliente@x.cl', 'https://a.cl/')", [aid]);
    await como('cliente@x.cl', 'public.arriendo_mp_auto_revisar($2)', [aid]);
    await stub('/preapproval/PRE3', 200, { id: 'PRE3', status: 'cancelled' });
    await viejo(); await su('select public.cfx_mp_neg_subs_revisar()');
    ok((await su("select estado from public.cfx_mp_neg_subs where preapproval = 'PRE3'"))[0].estado === 'cancelada' && await notif(c.id, '⚡ Pago automático apagado') === 1, 'Apagada desde Mercado Pago → se marca y avisa');
    await stub('/preapproval', 201, { id: 'PRE4', init_point: 'https://mp.test/sus4', status: 'pending' });
    await stub('/preapproval/PRE4', 200, { id: 'PRE4', status: 'authorized' });
    await cobros(1, 'PRE4', []);
    await como('cliente@x.cl', "public.arriendo_mp_auto($2, 'cliente@x.cl', 'https://a.cl/')", [aid]);
    await como('cliente@x.cl', 'public.arriendo_mp_auto_revisar($2)', [aid]);
    await su("update public.arriendos set fin = now() - interval '1 minute' where id = $1", [aid]);
    await su('select public.liberar_vencidas()');
    ok((await su("select estado from public.cfx_mp_neg_subs where preapproval = 'PRE4'"))[0].estado === 'cancelada', '🏁 Arriendo terminado → se apaga sola en Mercado Pago');
    const ah = await como('cliente@x.cl', "public.solicitar_arriendo($2, 'hora', now() + interval '50 days', 1, '', null)", [est]);
    ok(/por mes/.test(await falla(() => como('cliente@x.cl', "public.arriendo_mp_auto($2, 'cliente@x.cl', 'https://a.cl/')", [ah])) || ''), 'Arriendo por hora → no aplica');

    // 📱 Pantallas
    const est2 = (await su("insert into public.estacionamientos (dueno, titulo, direccion, lat, lng, precio_hora, precio_mes) values ($1,'Est G106 b','Calle 2',-33.45,-70.66,1000,60000) returning id", [d.id]))[0].id;
    const aid2 = (await su("insert into public.arriendos (estacionamiento, dueno, arrendatario, modalidad, inicio, fin, cantidad, total, monto_pagar, estado, pago_estado) values ($1, $2, $3, 'mes', now() - interval '5 days', now() + interval '25 days', 1, 60000, 60000, 'aceptado', 'pagado') returning id", [est2, d.id, c.id]))[0].id;
    await stub('/preapproval', 201, { id: 'PRE5', init_point: 'https://mp.test/sus5', status: 'pending' });
    await stub('/preapproval/PRE5', 200, { id: 'PRE5', status: 'pending' });
    await cobros(1, 'PRE5', []);
    let p = t.page;
    await p.context().route(/mp\.test/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>MP prueba</h1>' }));
    const entrar = async (mail) => {
      await p.goto(t.base + '/#/avisos'); await p.waitForTimeout(1500);
      await p.click('button[data-t=in]'); await p.waitForTimeout(300);
      await p.fill('#lEmail', mail); await p.fill('#lClave', 'clave123'); await p.press('#lClave', 'Enter');
      await p.waitForTimeout(2500); await t.sinModales(p);
    };
    await entrar('cliente@x.cl');
    await p.goto(t.base + '/#/r/' + aid2); await p.reload(); await p.waitForTimeout(2500);
    let txt = await p.evaluate(() => (document.querySelector('#rAuto') || {}).innerText || '');
    ok(/Pagar solo cada mes/.test(txt) && /60\.000/.test(txt) && /Activar pago automático/.test(txt), '📱 Quien arrienda ve "⚡ Pagar solo cada mes" con el monto');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '📱 Sin scroll horizontal');
    await p.evaluate(() => document.querySelector('#rAuto').scrollIntoView());
    await p.screenshot({ path: __dirname + '/capturas/estacionamiento/g106_activar.png' }).catch(() => {});
    let volvio = '';  // local es http: se cambia a https como en producción (MP exige regreso https)
    await p.route('**/rpc/arriendo_mp_auto', (r) => { const b = JSON.parse(r.request().postData()); volvio = b.p_volver; b.p_volver = b.p_volver.replace(/^http:\/\/[^/]+/, 'https://estaciona.test'); r.fallback({ postData: JSON.stringify(b) }); });
    await p.click('#rAutoSi'); await p.waitForTimeout(2500);
    ok(pidio === 'cliente@x.cl', '📱 Pide el correo de Mercado Pago (viene escrito el de su cuenta): ' + pidio);
    ok(/\?mpa=/.test(volvio) && /#\/r\//.test(volvio), '📱 Pide volver a la misma reserva (?mpa=)');
    ok(/mp\.test\/sus5/.test(p.url()), '📱 Tocar Activar → va a Mercado Pago');
    await stub('/preapproval/PRE5', 200, { id: 'PRE5', status: 'authorized' });
    await p.goto(t.base + '/?mpa=' + aid2 + '#/r/' + aid2); await p.waitForTimeout(3000);
    txt = await p.evaluate(() => (document.querySelector('#rAuto') || {}).innerText || '');
    ok(/Pago automático/.test(txt) && /Activo/.test(txt) && /Quitar/.test(txt) && !/mpa=/.test(p.url()), '📱 Al volver: "✅ Activo" + Quitar (y limpia la dirección)');
    await p.evaluate(() => document.querySelector('#rAuto').scrollIntoView());
    await p.screenshot({ path: __dirname + '/capturas/estacionamiento/g106_activo.png' }).catch(() => {});
    p = (await t.nuevo()).page;
    await entrar('dueno@x.cl');
    await p.goto(t.base + '/#/r/' + aid2); await p.reload(); await p.waitForTimeout(2500);
    txt = await p.evaluate(() => document.body.innerText);
    ok(/Se paga solo cada mes con tarjeta/.test(txt), '📱 El dueño ve "⚡ Se paga solo cada mes con tarjeta"');
    ok(!t.errores.filter((m) => !/favicon|404|status of 400|tile|maplibre|openfreemap|openstreetmap|mp\.test/i.test(m)).length, 'Sin errores en la consola ' + t.errores.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'Error: ' + (e.stack || e).toString().slice(0, 600)); }
  await t.cerrar();
  console.log(f ? '✗ ' + f + ' fallas' : 'TODO OK'); process.exit(f ? 1 : 0);
})();
