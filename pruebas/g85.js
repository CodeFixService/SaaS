// G85 · ⚡ Pago automático con Mercado Pago + 🏷️ cupón a la vista (núcleo pagos) · 🗂️ caja de apps (CM → Control) · Pagos limpio.
// FALLA con el código viejo (sin cfx_mp_pagar, sin .cp-cupon, sin #ctlApps). Uso: ANCHO=320 node g85.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const MP = 'https://api.mercadopago.com';
(async () => {
  // ---------- 1) Estaciona: persona paga Premium con cupón por Mercado Pago y se activa solo ----------
  execSync(__dirname + '/base.sh /home/user/estacionamiento p_g85e', { stdio: 'ignore' });
  let t = await abrir('/home/user/estacionamiento', 'p_g85e', { conCobro: true }); let p = t.page;
  try {
    const su = t.sim.su;
    await su("update public.cfx_config set valor = jsonb_set(jsonb_set(valor, '{link}', '\"https://mpago.la/e\"'), '{transferencia,numero}', '\"123\"') where clave = 'pagos'");
    await su("insert into public.cfx_config (clave, valor) values ('mp', '{\"token\":\"APP_USR-1234567890123456789012345\",\"activo\":true,\"nick\":\"CODEFIX\"}') on conflict (clave) do update set valor = excluded.valor");
    await su("insert into public.cfx_cupones (codigo, pct) values ('VERANO', 20)");
    await su("insert into extensions.http_respuestas values ($1, 201, '{\"init_point\":\"https://mp.test/pagar\"}'), ($2, 200, '{\"results\":[]}')", [MP + '/checkout/preferences', MP + '/v1/payments/search%']);
    await t.sim.crearUsuario('b@x.cl', 'clave123');
    await su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = 'Bea'");
    await t.ctx.route('https://mp.test/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Mercado Pago</h1>' }));
    await p.goto(t.base + '/#/avisos'); await p.waitForTimeout(1200);
    await p.click('button[data-t=in]'); await p.fill('#lEmail', 'b@x.cl'); await p.fill('#lClave', 'clave123'); await p.press('#lClave', 'Enter');
    await p.waitForTimeout(2500); await t.sinModales();
    for (const modo of ['light', 'dark']) {
      await p.emulateMedia({ colorScheme: modo });
      await p.goto(t.base + '/#/premium'); await p.waitForTimeout(1500); await t.sinModales();
      await p.click('#prComprar'); await p.waitForTimeout(900);
      const r = await p.evaluate(() => ({ tabs: [...document.querySelectorAll('.cfx-pago .cp-tabs button')].map((b) => b.textContent.trim()), on: (document.querySelector('.cfx-pago .cp-tabs button.on') || {}).textContent,
        cupon: !!document.querySelector('.cfx-pago .cp-cupon #cpCupon'), mpBtn: !!document.querySelector('.cfx-pago [data-mp]'), foto: !!document.querySelector('.cfx-pago #cpFoto'),
        tarjeta: /Tarjeta/.test(document.querySelector('.cfx-pago').textContent), ancho: document.documentElement.scrollWidth <= innerWidth + 1 }));
      ok(r.tabs.length === 3 && /Mercado Pago/.test(r.on) && r.mpBtn && !r.foto && !r.tarjeta, modo + ': 3 formas (⚡ MP elegido de entrada, link, transferencia), sin tarjeta ni comprobante en MP ' + JSON.stringify(r.tabs));
      ok(r.cupon && r.ancho, modo + ': cupón a la vista y sin desborde');
      await p.fill('#cpCupon', 'verano'); await p.click('.cfx-pago [data-cupon]'); await p.waitForTimeout(700);
      const c = await p.evaluate(() => ({ on: !!document.querySelector('.cfx-pago .cp-cupon.on'), tachado: !!document.querySelector('.cfx-pago .cp-plan s'), total: document.querySelector('#cpMonto').textContent }));
      ok(c.on && c.tachado && /2\.400/.test(c.total), modo + ': cupón VERANO aplicado (−20%: $3.000 → ' + c.total + ', precio tachado)');
      await t.foto('g85-pago-' + modo);
      if (modo === 'light') { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
    }
    await Promise.all([p.waitForURL(/mp\.test/, { timeout: 8000 }), p.click('.cfx-pago [data-mp]')]);
    const [g] = await su("select id, medio, monto, estado, cupon from public.cfx_pagos order by creado desc limit 1");
    const [lg] = await su("select content from extensions.http_log where uri like '%/checkout/preferences' order by n desc limit 1");
    ok(g && g.medio === 'mp' && g.monto === 2400 && g.estado === 'pendiente' && g.cupon === 'VERANO', 'abre Mercado Pago y queda el cobro pendiente por $2.400 con cupón ' + JSON.stringify(g));
    ok(lg && /"unit_price": 2400/.test(lg.content) && lg.content.includes(g.id), 'Mercado Pago recibe el monto y la referencia del cobro');
    // Mercado Pago aprueba → al volver a la app se activa solo.
    await su("update extensions.http_respuestas set content = $1 where url_like = $2", [JSON.stringify({ results: [{ id: 999111, status: 'approved', external_reference: g.id, currency_id: 'CLP', transaction_amount: 2400 }] }), MP + '/v1/payments/search%']);
    await p.goto(t.base + '/#/premium'); await p.waitForTimeout(3500);
    const txt = await p.evaluate(() => (document.querySelector('dialog.cfx-pago') || {}).textContent || '');
    const [g2] = await su("select estado, dias, mp_pago from public.cfx_pagos where id = $1", [g.id]);
    const [pr] = await su("select premium_hasta > now() + interval '29 days' as pro from public.perfiles where email = 'b@x.cl'");
    ok(/Pago aprobado/.test(txt), 'al volver de Mercado Pago muestra 🎉 Pago aprobado');
    ok(g2.estado === 'aprobado' && g2.dias === 30 && g2.mp_pago === '999111' && pr && pr.pro, 'se aprobó solo: 30 días de Premium, sin comprobante ' + JSON.stringify(g2));
    const [n] = await su("select count(*)::int as n from extensions.http_log where uri like '%payments/search%'");
    ok(n.n >= 1, 'revisó el pago con Mercado Pago');
    const [x] = await su("select public.cfx_mp_revisar_pendientes() as n");
    ok(x.n === 0, 'la revisión cada 2 min no aprueba dos veces');
    await t.foto('g85-aprobado');
  } catch (e) { console.log('✗ ' + e.message); f++; }
  if (t.errores.length) console.log('ERRORES:', t.errores.slice(0, 5).join('\n'));
  await t.cerrar();

  // ---------- 2) CM: caja de apps en Control y Pagos limpio ----------
  execSync(__dirname + '/base.sh /home/user/saas p_g85', { stdio: 'ignore' });
  t = await abrir('/home/user/saas', 'p_g85'); p = t.page;
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    await p.goto(t.base + '/'); await p.fill('input[type=email]', 'juanjosuecastilloloyola@gmail.com'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800); await t.sinModales();
    for (const modo of ['light', 'dark']) {
      await p.emulateMedia({ colorScheme: modo });
      await p.goto(t.base + '/admin/#control'); await p.waitForTimeout(4000); await t.sinModales();
      let r = await p.evaluate(() => ({ caja: !!document.querySelector('#ctlApps .ca-btn'), viejo: document.querySelectorAll('#v-control [data-app]').length, pest: document.querySelectorAll('.cfx-tira-pest').length,
        nombre: (document.querySelector('#ctlApps .ca-btn b') || {}).textContent, img: !!document.querySelector('#ctlApps .ca-btn img.ca-img') }));
      ok(r.caja && r.img && r.viejo === 0 && r.nombre === 'Centro de Mando', modo + ': Control muestra la caja de apps (imagen + nombre) en vez de 7 botones ' + JSON.stringify(r));
      ok(r.pest === 0, modo + ': las tiras vuelven a verse como antes (sin pestañas G82)');
      await p.click('#ctlApps .ca-btn'); await p.waitForTimeout(300);
      r = await p.evaluate(() => ({ n: document.querySelectorAll('#ctlApps .ca-op').length, ancho: document.documentElement.scrollWidth <= innerWidth + 1 }));
      ok(r.n === 6 && r.ancho, modo + ': al abrir la caja salen las 6 apps (Cerebro retirado G112 a) y no hay desborde');
      await t.foto('g85-caja-' + modo);
      await p.click('#ctlApps [data-ca-app=billetera]'); await p.waitForTimeout(1500);
      r = await p.evaluate(() => ({ nombre: (document.querySelector('#ctlApps .ca-btn b') || {}).textContent, cerrada: !document.querySelector('#ctlApps .ca-lista') }));
      ok(r.nombre === 'Billetera' && r.cerrada, modo + ': elegir Billetera cierra la caja y cambia la app');
      await p.click('#ctlApps .ca-btn'); await p.click('#ctlApps [data-ca-app=cm]'); await p.waitForTimeout(1200);
    }
    // 🖼️ Cambiar la imagen de una app: queda guardada en el CM.
    await p.click('#ctlApps .ca-btn'); await p.click('#ctlApps [data-ca=editar]');
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#ctlApps [data-ca-img=barberia]')]);
    await fc.setFiles(__dirname + '/bici.png'); await p.waitForTimeout(1500);
    const [im] = await t.sim.su("select valor ? 'barberia' as si from public.config where clave = 'apps_imagenes'");
    ok(im && im.si, 'la imagen elegida para Barbería queda guardada en el CM');
    // Pagos: solo el pago general (sin links de monto fijo ni tarjeta) + Mercado Pago automático + cupones.
    // G112 c2: MP conectado hace más de 1 año → CM → Pagos muestra la fecha y "🔄 Cámbiala".
    await t.sim.su("insert into public.cfx_config (clave, valor) values ('mp', '{\"token\": \"APP_USR-1234567890123456789012345-ab12\", \"activo\": true}') on conflict (clave) do update set valor = excluded.valor");
    await t.sim.su("update public.cfx_config set valor = valor || '{\"desde\": \"2025-01-15T12:00:00Z\"}' where clave = 'mp'");
    await p.goto(t.base + '/admin/#pagos'); await p.waitForTimeout(3500); await t.sinModales();
    await p.waitForTimeout(2000);
    const est = await p.evaluate(() => (document.querySelector('#mpEst') || {}).innerText || '');
    ok(/ab12/.test(est) && /15-01-2025/.test(est) && /más de 1 año/.test(est), 'Pagos: ⚡ Mercado Pago dice desde cuándo y pide cambiar la llave vieja ' + JSON.stringify(est.slice(0, 200)));
    const q = await p.evaluate(() => ({ viejos: document.querySelectorAll('[data-k^="negocio.link_"], [data-k^="cliente.link_"], [data-k^="tarjeta."]').length,
      link: !!document.querySelector('[data-k=link]'), mp: !!document.querySelector('#pgMp #mpTk'), cup: !!document.querySelector('#pgCup'), ancho: document.documentElement.scrollWidth <= innerWidth + 1 }));
    ok(q.viejos === 0 && q.link && q.mp && q.cup && q.ancho, 'Pagos: pago general + ⚡ Mercado Pago + 🏷️ Cupones, sin links fijos ni tarjeta ' + JSON.stringify(q));
    await t.foto('g85-pagos');
    await p.click('#pgCup'); await p.waitForTimeout(2500);
    ok(await p.evaluate(() => !!document.querySelector('#v-control .on[data-s=cupones]')), '🏷️ Crear o ver cupones lleva a Control → Cupones');
  } catch (e) { console.log('✗ ' + e.message); f++; }
  if (t.errores.length) console.log('ERRORES:', t.errores.slice(0, 5).join('\n'));
  await t.cerrar(); console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
