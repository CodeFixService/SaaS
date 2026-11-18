// G103 · G38 💳 Flow (Webpay + transferencia + MACH) como 2.º pago automático del pago general (núcleo pagos.sql/pagos.js).
// FALLA con el código viejo (sin cfx_flow_pagar ni pestaña 💳 Webpay). Uso: ANCHO=320 node g103.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
const crypto = require('crypto');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const FL = 'https://www.flow.cl/api', SEC = 'abcdef0123456789abcdef0123456789abcdef01';
(async () => {
  execSync(__dirname + '/base.sh /home/user/estacionamiento p_g103', { stdio: 'ignore' });
  const t = await abrir('/home/user/estacionamiento', 'p_g103', { conCobro: true }); const p = t.page;
  try {
    const su = t.sim.su;
    await su("update public.cfx_config set valor = jsonb_set(jsonb_set(valor, '{link}', '\"https://mpago.la/e\"'), '{transferencia,numero}', '\"123\"') where clave = 'pagos'");
    await su("insert into public.cfx_config (clave, valor) values ('mp', '{\"token\":\"APP_USR-1234567890123456789012345\",\"activo\":true}') on conflict (clave) do update set valor = excluded.valor");
    await su("insert into public.cfx_config (clave, valor) values ('flow', $1) on conflict (clave) do update set valor = excluded.valor",
      [JSON.stringify({ apikey: '1F90971E-8276-4713-97FF-2BLF5091EE3B', secret: SEC, activo: true })]);
    await su("insert into public.cfx_config (clave, valor) values ('mp_aviso', '{\"url\":\"https://fn.test/functions/v1/enviar\"}') on conflict (clave) do update set valor = excluded.valor");
    await su("insert into extensions.http_respuestas values ($1, 200, '{\"url\":\"https://flow.test/pagar\",\"token\":\"TK1\",\"flowOrder\":1}'), ($2, 200, '{\"status\":1}')",
      [FL + '/payment/create', FL + '/payment/getStatusByCommerceId%']);
    await t.sim.crearUsuario('b@x.cl', 'clave123');
    await su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = 'Bea'");
    await t.ctx.route('https://flow.test/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Flow</h1>' }));
    await p.goto(t.base + '/#/avisos'); await p.waitForTimeout(1200);
    await p.click('button[data-t=in]'); await p.fill('#lEmail', 'b@x.cl'); await p.fill('#lClave', 'clave123'); await p.press('#lClave', 'Enter');
    await p.waitForTimeout(2500); await t.sinModales();
    for (const modo of ['light', 'dark']) {
      await p.emulateMedia({ colorScheme: modo });
      await p.goto(t.base + '/#/premium'); await p.waitForTimeout(1500); await t.sinModales();
      await p.click('#prComprar'); await p.waitForTimeout(900);
      const tabs = await p.evaluate(() => [...document.querySelectorAll('.cfx-pago .cp-tabs button')].map((b) => b.textContent.trim()));
      ok(tabs.length === 4 && tabs.some((x) => /Webpay/.test(x)), modo + ': la hoja de pago trae 💳 Webpay ' + JSON.stringify(tabs));
      await p.click('.cfx-pago .cp-tabs button:has-text("Webpay")'); await p.waitForTimeout(300);
      const r = await p.evaluate(() => ({ btn: (document.querySelector('.cfx-pago [data-mp]') || {}).textContent, foto: !!document.querySelector('.cfx-pago #cpFoto'),
        ayuda: /MACH/.test(document.querySelector('.cfx-pago').textContent), pasos: /Paga en Flow/.test(document.querySelector('.cfx-pago').textContent),
        ancho: document.documentElement.scrollWidth <= innerWidth + 1, tabsOk: [...document.querySelectorAll('.cfx-pago .cp-tabs button')].every((b) => b.scrollWidth <= b.clientWidth + 1) }));
      ok(/Webpay/.test(r.btn) && !r.foto && r.ayuda && r.pasos, modo + ': Webpay = pago automático (sin comprobante, explica Webpay/transferencia/MACH) ' + JSON.stringify(r));
      ok(r.ancho && r.tabsOk, modo + ': sin desborde (pestañas caben)');
      await t.foto('g103-flow-' + modo);
      if (modo === 'light') { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
    }
    await Promise.all([p.waitForURL(/flow\.test\/pagar\?token=TK1/, { timeout: 8000 }), p.click('.cfx-pago [data-mp]')]);
    const [g] = await su("select id, medio, monto, estado, volver from public.cfx_pagos order by creado desc limit 1");
    ok(g && g.medio === 'flow' && g.estado === 'pendiente' && g.monto === 3000 && g.volver === null, 'abre Flow y queda el cobro pendiente por $3.000 (localhost no es https: sin regreso guardado) ' + JSON.stringify(g));
    const [lg] = await su("select content from extensions.http_log where uri = $1 order by n desc limit 1", [FL + '/payment/create']);
    const q = new URLSearchParams(lg.content), s = q.get('s'); q.delete('s');
    const firma = crypto.createHmac('sha256', SEC).update([...q.keys()].sort().map((k) => k + q.get(k)).join('')).digest('hex');
    ok(s === firma, 'la firma HMAC de Flow es correcta');
    ok(q.get('commerceOrder') === g.id && q.get('amount') === '3000' && q.get('email') === 'b@x.cl' && q.get('urlConfirmation') === 'https://fn.test/functions/v1/enviar?cfx_mp=f:' + g.id &&
      q.get('urlReturn') === 'https://fn.test/functions/v1/enviar?cfx_mp=f:' + g.id + '&cfx_volver=1', 'Flow recibe monto, referencia, aviso y regreso por la función ' + q.get('urlReturn'));
    const [v] = await su("select public.cfx_pago_volver('f:' || $1::text) as v, public.cfx_pago_volver('p:' || $1::text) as w", [g.id]);
    ok(v.v === g.volver && v.w === null, 'la función sabe a dónde volver (solo cobros de Flow)');
    // Aún no paga → no se aprueba. Flow lo paga → al volver se activa solo.
    let [x] = await su("select public.cfx_mp_aviso('f:' || $1::text) as a", [g.id]);
    ok(x.a === false, 'aviso de Flow sin pago: no aprueba');
    await su("update extensions.http_respuestas set content = $1 where url_like = $2", [JSON.stringify({ flowOrder: 777, commerceOrder: g.id, status: 2, amount: 3000, currency: 'CLP' }), FL + '/payment/getStatusByCommerceId%']);
    await p.goto(t.base + '/#/premium'); await p.waitForTimeout(4000);
    const txt = await p.evaluate(() => (document.querySelector('dialog.cfx-pago') || {}).textContent || '');
    const [g2] = await su("select estado, dias, mp_pago from public.cfx_pagos where id = $1", [g.id]);
    const [pr] = await su("select premium_hasta > now() + interval '29 days' as pro from public.perfiles where email = 'b@x.cl'");
    ok(/Pago aprobado/.test(txt), 'al volver de Flow muestra 🎉 Pago aprobado');
    ok(g2.estado === 'aprobado' && g2.dias === 30 && g2.mp_pago === 'flow:777' && pr && pr.pro, 'se aprobó solo: 30 días de Premium ' + JSON.stringify(g2));
    await t.foto('g103-flow-aprobado');
    // El mismo n° de Flow no sirve 2 veces.
    await su("insert into public.cfx_pagos (cuenta, email, rol, periodo, monto, medio, nota) select id, email, 'negocio', 'mensual', 3000, 'flow', 'x' from public.perfiles where email = 'b@x.cl'");
    [x] = await su("select public.cfx_mp_revisar_pendientes() as n");
    ok(x.n === 0, 'el mismo pago de Flow no se usa 2 veces');
    // Admin: conectar con llaves malas (401) → rechaza; buenas → queda conectado.
    await t.sim.crearUsuario('adm@x.cl', 'clave123');
    await su("update public.perfiles set es_admin = true where email = 'adm@x.cl'");
    const como = (mail, fn, a) => su("select " + fn + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = '" + mail + "'), false)) s", a);
    const comoAdm = (fn, a) => como('adm@x.cl', fn, a);
    await su("insert into extensions.http_respuestas values ('https://sandbox.flow.cl/api/payment/getStatusByCommerceId%', 401, '{\"code\":108}')");
    let e = null; try { await comoAdm("public.cfx_flow_guardar('1F90971E-8276-4713-97FF-2BLF5091EE3B', $1, true, true)", [SEC]); } catch (y) { e = y.message; }
    ok(/no aceptó/.test(e || ''), 'llaves malas: Flow no las acepta (' + e + ')');
    await su("update extensions.http_respuestas set status = 400 where url_like like 'https://sandbox.flow.cl/%'");
    const est = await comoAdm("public.cfx_flow_guardar('1F90971E-8276-4713-97FF-2BLF5091EE3B', $1, true, true)", [SEC]);
    const r2 = est[0] && est[0].r;
    ok(JSON.stringify(est).includes('"sandbox":true') && JSON.stringify(est).includes('"activo":true'), 'llaves buenas (pruebas): conectado ' + JSON.stringify(r2).slice(0, 120));
    let e2 = null; try { await como('b@x.cl', 'public.cfx_flow_estado()'); } catch (y) { e2 = y.message; }
    ok(/administrador/.test(e2 || ''), 'una cuenta normal no ve ni cambia Flow');
  } catch (e) { console.log('✗ ' + e.message); f++; }
  if (t.errores.length) console.log('ERRORES:', t.errores.slice(0, 5).join('\n'));
  await t.cerrar(); console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
