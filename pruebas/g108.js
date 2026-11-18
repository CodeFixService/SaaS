// G108 · 🔁 RENOVACIÓN AUTOMÁTICA de ⭐ Premium y 🧩 módulos (núcleo pagos.sql: suscripción "preapproval" de MP con la cuenta de CodeFix).
//   La persona autoriza su tarjeta 1 vez → MP cobra solo → la BASE confirma cada cobro (CLP, monto completo, 1 vez) → pago aprobado → +30/365 días.
// FALLA con el código viejo (no existen cfx_mp_suscribir ni la casilla 🔁 Renovar solo).
// Uso: ANCHO=320 node g108.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const MP = 'https://api.mercadopago.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
(async () => {
  execSync(__dirname + '/base.sh /home/user/Estacionamiento p_g108', { stdio: 'ignore' });
  const t = await abrir('/home/user/Estacionamiento', 'p_g108', { conCobro: true }); const su = t.sim.su, como = comoDe(su);
  try {
    const d = await t.sim.crearUsuario('dueno@x.cl', 'clave123');
    await t.sim.crearUsuario('bea@x.cl', 'clave123');
    await su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    await su("insert into public.estacionamientos (dueno, titulo, direccion, lat, lng, precio_hora, precio_mes) values ($1,'Est G108','Calle 1',-33.44,-70.65,1000,60000)", [d.id]);
    const stub = (url, st, body) => su('insert into extensions.http_respuestas values ($1, $2, $3) on conflict (url_like) do update set status = excluded.status, content = excluded.content', [MP + url, st, JSON.stringify(body)]);
    const viejo = () => su("update public.cfx_mp_subs set revisado_at = now() - interval '2 hours'");
    const notif = async (email, tit) => (await su('select count(*)::int n from public.notificaciones n join auth.users u on u.id = n.usuario where u.email = $1 and n.titulo = $2', [email, tit]))[0].n;
    const pagos = async (email) => su("select periodo, monto, medio, estado, dias, producto, mp_pago, nota from public.cfx_pagos where email = $1 order by creado", [email]);

    // Sin Mercado Pago de CodeFix → no se puede
    ok(/necesita Mercado Pago/.test(await falla(() => como('bea@x.cl', "public.cfx_mp_suscribir('mensual', null, 'bea@x.cl', 'https://a.cl/')")) || ''), 'Sin ⚡ Mercado Pago de CodeFix → no hay renovación automática');
    await su("update public.cfx_config set valor = jsonb_set(jsonb_set(valor, '{link}', '\"https://mpago.la/e\"'), '{transferencia,numero}', '\"123\"') where clave = 'pagos'");
    await su("insert into public.cfx_config (clave, valor) values ('mp', '{\"token\":\"APP_USR-1234567890123456789012345\",\"activo\":true,\"nick\":\"CODEFIX\"}') on conflict (clave) do update set valor = excluded.valor");
    await stub('/preapproval', 201, { id: 'S1', init_point: 'https://mp.test/sus', status: 'pending' });
    await stub('/preapproval/S1', 200, { id: 'S1', status: 'pending' });
    await stub('/authorized_payments/search?preapproval_id=S1', 200, { results: [] });
    const cobros = (pre, res) => stub('/authorized_payments/search?preapproval_id=' + pre, 200, { results: res });

    // ---------- SQL: ⭐ Premium ----------
    ok(/1 mes o 1 año/.test(await falla(() => como('bea@x.cl', "public.cfx_mp_suscribir('meses', null, 'bea@x.cl', 'https://a.cl/')")) || ''), '3 meses → no (solo 1 mes o 1 año)');
    ok(/correo/.test(await falla(() => como('bea@x.cl', "public.cfx_mp_suscribir('mensual', null, 'malo', 'https://a.cl/')")) || ''), 'Correo no válido → no se crea');
    ok(/regreso/.test(await falla(() => como('bea@x.cl', "public.cfx_mp_suscribir('mensual', null, 'bea@x.cl', 'http://a.cl/')")) || ''), 'Regreso sin https → no se crea');
    let x = await como('bea@x.cl', "public.cfx_mp_suscribir('mensual', null, 'Bea@X.cl', 'https://a.cl/')");
    ok(x.ok && x.url === 'https://mp.test/sus', '🔁 Renovar solo → abre Mercado Pago para autorizar la tarjeta');
    let req = JSON.parse((await su("select content from extensions.http_log where method = 'POST' and uri = $1 order by n desc limit 1", [MP + '/preapproval']))[0].content);
    ok(req.auto_recurring.transaction_amount === 3000 && req.auto_recurring.frequency === 1 && req.auto_recurring.frequency_type === 'months' && req.auto_recurring.currency_id === 'CLP' && req.payer_email === 'bea@x.cl' && /^s:/.test(req.external_reference),
      'Suscripción: $3.000 CLP cada 1 mes, con el correo de MP ' + JSON.stringify(req.auto_recurring));
    ok(Math.abs(new Date(req.auto_recurring.start_date) - Date.now()) < 10 * 60000, 'Sin plan activo: 1.er cobro en minutos');
    let e = await como('bea@x.cl', 'public.cfx_pago_estado()');
    ok(e.subs.length === 1 && e.subs[0].estado === 'pendiente' && e.subs[0].producto === null, 'cfx_pago_estado muestra la renovación ⏳ pendiente');
    await stub('/preapproval/S1', 200, { id: 'S1', status: 'authorized' });
    x = await como('bea@x.cl', 'public.cfx_mp_revisar()');
    ok(x.subs[0].estado === 'activa' && await notif('bea@x.cl', '🔁 Renovación automática activa') === 1, 'Al volver de MP: ✅ activa + aviso');
    ok(/Ya se renueva solo/.test(await falla(() => como('bea@x.cl', "public.cfx_mp_suscribir('mensual', null, 'bea@x.cl', 'https://a.cl/')")) || ''), 'No se crea una 2.ª renovación de Premium');
    await cobros('S1', [{ id: 7001, preapproval_id: 'S1', currency_id: 'CLP', transaction_amount: 3000, payment: { id: 6001, status: 'approved' } },
      { id: 7002, preapproval_id: 'S1', currency_id: 'CLP', transaction_amount: 100, payment: { id: 6002, status: 'approved' } },
      { id: 7003, preapproval_id: 'S1', currency_id: 'CLP', transaction_amount: 3000, payment: { id: 6003, status: 'rejected' } }]);
    await viejo();
    ok((await su('select public.cfx_mp_subs_revisar() n'))[0].n === 1, '⏱️ El cron encuentra 1 cobro válido (ignora monto menor y rechazado)');
    let P = await pagos('bea@x.cl');
    const [pro1] = await su("select premium_hasta from public.perfiles where email = 'bea@x.cl'");
    ok(P.length === 1 && P[0].estado === 'aprobado' && P[0].dias === 30 && P[0].mp_pago === '6001' && P[0].medio === 'mp' && /Renovación automática/.test(P[0].nota) && new Date(pro1.premium_hasta) - Date.now() > 29 * 864e5,
      '✅ Cobro → pago aprobado + 30 días de Premium ' + JSON.stringify(P));
    ok(await notif('bea@x.cl', '✅ Pago aprobado') === 1, '🔔 Aviso de pago aprobado');
    await viejo(); await su('select public.cfx_mp_subs_revisar()');
    ok((await pagos('bea@x.cl')).length === 1, '🔒 El mismo cobro no suma 2 veces');
    await cobros('S1', [{ id: 7001, preapproval_id: 'S1', currency_id: 'CLP', transaction_amount: 3000, payment: { id: 6001, status: 'approved' } },
      { id: 7004, preapproval_id: 'S1', currency_id: 'CLP', transaction_amount: 3000, payment: { id: 6004, status: 'approved' } }]);
    await viejo(); await su('select public.cfx_mp_subs_revisar()');
    const [pro2] = await su("select premium_hasta from public.perfiles where email = 'bea@x.cl'");
    ok((await pagos('bea@x.cl')).length === 2 && new Date(pro2.premium_hasta) - new Date(pro1.premium_hasta) > 29 * 864e5, '🔁 2.º mes cobrado → +30 días más (se suma, no se pisa)');
    // Quitar: MP caído → no se marca
    await stub('/preapproval/S1', 500, { message: 'error' });
    x = await como('bea@x.cl', 'public.cfx_mp_sub_quitar(null)');
    ok(x.ok === false && /no respondió/.test(x.error) && (await su("select estado from public.cfx_mp_subs where preapproval = 'S1'"))[0].estado === 'activa', 'MP caído al quitar → avisa y sigue activa (se reintenta)');
    await stub('/preapproval/S1', 200, { id: 'S1', status: 'authorized' });
    x = await como('bea@x.cl', 'public.cfx_mp_sub_quitar(null)');
    const put = (await su("select count(*)::int n from extensions.http_log where method = 'PUT' and uri = $1 and content like '%cancelled%'", [MP + '/preapproval/S1']))[0].n;
    e = await como('bea@x.cl', 'public.cfx_pago_estado()');
    const [pro3] = await su("select premium_hasta from public.perfiles where email = 'bea@x.cl'");
    ok(x.ok && put >= 2 && e.subs.length === 0 && +new Date(pro3.premium_hasta) === +new Date(pro2.premium_hasta), 'Quitar → se apaga EN Mercado Pago; lo pagado sigue activo');
    // Plan activo → el 1.er cobro es 1 día antes de que venza (anual = cada 12 meses)
    await stub('/preapproval', 201, { id: 'S2', init_point: 'https://mp.test/sus2', status: 'pending' });
    x = await como('bea@x.cl', "public.cfx_mp_suscribir('anual', null, 'bea@x.cl', 'https://a.cl/')");
    req = JSON.parse((await su("select content from extensions.http_log where method = 'POST' and uri = $1 order by n desc limit 1", [MP + '/preapproval']))[0].content);
    const hp = (await su("select max(hasta) h from public.cfx_pagos where email = 'bea@x.cl' and estado = 'aprobado'"))[0].h;
    ok(x.ok && req.auto_recurring.frequency === 12 && req.auto_recurring.transaction_amount === 29900 && Math.abs(new Date(req.auto_recurring.start_date) - (new Date(hp) - 864e5)) < 120000,
      'Plan activo + 1 año: $29.900 cada 12 meses, 1.er cobro 1 día antes de que venza');
    // Apagada desde Mercado Pago → se marca y avisa
    await stub('/preapproval/S2', 200, { id: 'S2', status: 'authorized' }); await cobros('S2', []);
    await viejo(); await su('select public.cfx_mp_subs_revisar()');
    await stub('/preapproval/S2', 200, { id: 'S2', status: 'cancelled' });
    await viejo(); await su('select public.cfx_mp_subs_revisar()');
    ok((await su("select estado from public.cfx_mp_subs where preapproval = 'S2'"))[0].estado === 'cancelada' && await notif('bea@x.cl', '🔁 Renovación automática apagada') === 1, 'Apagada desde Mercado Pago → se marca y avisa');

    // ---------- SQL: 🧩 módulo ----------
    await su("update public.cfx_config set valor = jsonb_set(jsonb_set(valor, '{activo}', 'true'), '{precio}', '2000') where clave = 'modulos_venta'");
    ok(/no válido/.test(await falla(() => como('dueno@x.cl', "public.cfx_mp_suscribir('mensual', 'zzz', 'dueno@x.cl', 'https://a.cl/')")) || ''), '🔒 Módulo que no se vende → no');
    await stub('/preapproval', 201, { id: 'S3', init_point: 'https://mp.test/sus3', status: 'pending' });
    x = await como('dueno@x.cl', "public.cfx_mp_suscribir('mensual', 'destacar', 'dueno@x.cl', 'https://a.cl/')");
    req = JSON.parse((await su("select content from extensions.http_log where method = 'POST' and uri = $1 order by n desc limit 1", [MP + '/preapproval']))[0].content);
    ok(x.ok && req.auto_recurring.transaction_amount === 2000 && /Módulo destacar/.test(req.reason), '🧩 Módulo: renovación de $2.000 al mes');
    await stub('/preapproval/S3', 200, { id: 'S3', status: 'authorized' });
    await cobros('S3', [{ id: 7101, preapproval_id: 'S3', currency_id: 'CLP', transaction_amount: 2000, payment: { id: 6101, status: 'approved' } }]);
    await viejo(); await su('select public.cfx_mp_subs_revisar()');
    const [m] = await su("select hasta from public.cfx_modulos_negocio where negocio = $1 and modulo = 'destacar'", [d.id]);
    ok(m && new Date(m.hasta) - Date.now() > 29 * 864e5 && (await pagos('dueno@x.cl'))[0].producto === 'destacar', '✅ Cobro del módulo → 🧩 destacar activo 30 días');
    const adm = await su('select count(*)::int n from public.cfx_mp_subs where estado = \'activa\'');
    ok(adm[0].n === 1, 'Quedan vivas solo las que siguen activas');

    // ---------- 📱 Pantalla (Estaciona, Premium) ----------
    await stub('/preapproval', 201, { id: 'S4', init_point: 'https://mp.test/sus4', status: 'pending' });
    await stub('/preapproval/S4', 200, { id: 'S4', status: 'pending' }); await cobros('S4', []);
    await su("update public.cfx_mp_subs set estado = 'cancelada' where cuenta = (select id from auth.users where email = 'bea@x.cl')");
    await su("update public.perfiles set premium_hasta = null where email = 'bea@x.cl'");
    const p = t.page;
    await t.ctx.route('https://mp.test/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Mercado Pago</h1>' }));
    let volvio = '';
    await t.ctx.route('**/rpc/cfx_mp_suscribir', (r) => { const b = JSON.parse(r.request().postData()); volvio = b.p_volver; b.p_volver = b.p_volver.replace(/^http:\/\/[^/]+/, 'https://estaciona.test'); r.fallback({ postData: JSON.stringify(b) }); });
    await p.goto(t.base + '/#/avisos'); await p.waitForTimeout(1200);
    await p.click('button[data-t=in]'); await p.fill('#lEmail', 'bea@x.cl'); await p.fill('#lClave', 'clave123'); await p.press('#lClave', 'Enter');
    await p.waitForTimeout(2500); await t.sinModales();
    for (const modo of ['light', 'dark']) {
      await p.emulateMedia({ colorScheme: modo });
      await p.goto(t.base + '/#/premium'); await p.reload(); await p.waitForTimeout(1800); await t.sinModales();
      await p.click('#prComprar'); await p.waitForTimeout(900);
      ok(await p.evaluate(() => !!document.querySelector('.cfx-pago #cpRenovar')), modo + ': 1 mes con ⚡ Mercado Pago → casilla "🔁 Renovar solo cada mes"');
      await p.click('.cfx-pago #cpRenovar'); await p.waitForTimeout(400);
      const r = await p.evaluate(() => ({ correo: (document.querySelector('.cfx-pago #cpMpCorreo') || {}).value, btn: (document.querySelector('.cfx-pago [data-mp]') || {}).textContent, regalo: !!document.querySelector('.cfx-pago #cpRegalo'),
        ancho: document.documentElement.scrollWidth <= innerWidth + 1 }));
      ok(r.correo === 'bea@x.cl' && /Autorizar en Mercado Pago/.test(r.btn) && !r.regalo && r.ancho, modo + ': marcada → pide el correo de MP (viene escrito), botón "🔁 Autorizar", sin 🎁 regalo, sin desborde');
      await p.evaluate(() => document.querySelector('.cfx-pago [data-mp]').scrollIntoView({ block: 'center' }));
      await t.foto('g108-renovar-' + modo);
      if (modo === 'light') { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
    }
    // 3 meses → no se ofrece
    await p.click('.cfx-pago .cp-plan[data-p="1"]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !document.querySelector('.cfx-pago #cpRenovar') && /Pagar con Mercado Pago/.test(document.querySelector('.cfx-pago [data-mp]').textContent)), '3 meses → sin renovación (pago suelto)');
    await p.click('.cfx-pago .cp-plan[data-p="0"]'); await p.waitForTimeout(300);
    await p.click('.cfx-pago #cpRenovar'); await p.waitForTimeout(300);
    await Promise.all([p.waitForURL(/mp\.test/, { timeout: 8000 }), p.click('.cfx-pago [data-mp]')]);
    ok(/mp\.test\/sus4/.test(p.url()) && /^http/.test(volvio), '📱 "🔁 Autorizar" → va a Mercado Pago (vuelve a la app)');
    await stub('/preapproval/S4', 200, { id: 'S4', status: 'authorized' });
    await p.goto(t.base + '/#/premium'); await p.waitForTimeout(3500);
    let txt = await p.evaluate(() => (document.querySelector('dialog.cfx-pago') || {}).textContent || '');
    ok(/Listo/.test(txt) && /se renueva solo cada mes/.test(txt), '📱 Al volver: "🔁 ¡Listo! se renueva solo cada mes"');
    await t.foto('g108-listo');
    await p.click('dialog.cfx-pago [data-x]'); await p.waitForTimeout(300);
    await p.click('#prComprar'); await p.waitForTimeout(900);
    txt = await p.evaluate(() => (document.querySelector('.cfx-pago .cp-sub') || {}).textContent || '');
    ok(/Se renueva solo cada mes/.test(txt) && /Quitar renovación/.test(txt) && await p.evaluate(() => !document.querySelector('.cfx-pago #cpRenovar')), '📱 Arriba: "🔁 Se renueva solo cada mes · Quitar" (y ya no ofrece otra)');
    await t.foto('g108-activa');
    await p.click('.cfx-pago [data-subq]'); await p.waitForTimeout(500);
    const si = await p.$('[data-si]'); if (si) await si.click();
    await p.waitForTimeout(1500);
    ok(await p.evaluate(() => !document.querySelector('.cfx-pago .cp-sub') && !!document.querySelector('.cfx-pago #cpRenovar')), '📱 Quitar → desaparece la tarjeta y se puede volver a activar');
    ok((await su("select estado from public.cfx_mp_subs where preapproval = 'S4'"))[0].estado === 'cancelada', '…y queda apagada en la base');
    ok(!t.errores.filter((m) => !/favicon|404|status of 400|tile|maplibre|openfreemap|openstreetmap|mp\.test/i.test(m)).length, 'Sin errores en la consola ' + t.errores.slice(0, 3).join(' | '));
  } catch (err) { ok(false, 'Error: ' + (err.stack || err).toString().slice(0, 600)); }
  await t.cerrar();
  // ---------- 🖥️ CM → Pagos: lista de 🔁 renovaciones automáticas ----------
  execSync(__dirname + '/base.sh /home/user/SaaS p_g108c', { stdio: 'ignore' });
  const c = await abrir('/home/user/SaaS', 'p_g108c');
  try {
    const A = 'juanjosuecastilloloyola@gmail.com', q = c.page;
    await c.sim.crearUsuario(A, 'admin123');
    await c.sim.su("insert into public.cfx_mp_subs (cuenta, email, nombre, rol, periodo, monto, estado, inicio, cobros, ultimo_at) values (gen_random_uuid(), 'ana@x.cl', 'Ana', 'negocio', 'mensual', 4900, 'activa', now(), 2, now())");
    await q.goto(c.base + '/'); await q.fill('input[type=email]', A); await q.fill('input[type=password]', 'admin123'); await q.press('input[type=password]', 'Enter');
    await q.waitForURL(/admin/); await q.waitForTimeout(800); await c.sinModales();
    await q.goto(c.base + '/admin/#pagos'); await q.waitForTimeout(4000); await c.sinModales();
    await q.click('#mpSubs summary').catch(() => {}); await q.waitForTimeout(300);
    const r = await q.evaluate(() => ({ t: (document.querySelector('#mpSubs') || {}).innerText || '', ancho: document.documentElement.scrollWidth <= innerWidth + 1 }));
    ok(/1 activa/.test(r.t) && /Ana/.test(r.t) && /4\.900\/mes/.test(r.t) && /2 cobro/.test(r.t) && r.ancho, '🖥️ CM → Pagos → ⚡ Mercado Pago: "🔁 Renovaciones automáticas: 1 activa" con Ana ' + JSON.stringify(r.t.slice(0, 120)));
    await q.evaluate(() => document.querySelector('#mpSubs').scrollIntoView({ block: 'center' }));
    await c.foto('g108-cm');
  } catch (err) { ok(false, 'CM: ' + (err.stack || err).toString().slice(0, 400)); }
  await c.cerrar();
  console.log(f ? '✗ ' + f + ' fallas' : 'TODO OK'); process.exit(f ? 1 : 0);
})();
