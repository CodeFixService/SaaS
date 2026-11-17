// G90 · Bloque CM-A: G38 💰 Dinero (por app/módulo, vencen, morosos con WhatsApp) + 🔔 alertas (negocio nuevo, errores) ·
//       G87 K (⚡ MP: 🎉 "activo hasta…" + 🧾 comprobante; 🎁 regalo = key de 1 uso; 🔑 key de respaldo si la activación falla) ·
//       CM: + Cuenta pregunta la app · socio sin botones que el servidor le rechaza.
// FALLA con el código viejo (sin cfx_dinero, cfx_alertas_revisar, p_regalo, key_regalo, dinero.js). Uso: node g90.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
const fs = require('fs');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const MP = 'https://api.mercadopago.com';
const ADM = 'juanjosuecastilloloyola@gmail.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
(async () => {
  // ---------- archivos ----------
  const adm = fs.readFileSync('/home/user/SaaS/admin/admin.js', 'utf8'), ctl = fs.readFileSync('/home/user/SaaS/admin/control.js', 'utf8');
  ok(fs.existsSync('/home/user/SaaS/admin/dinero.js') && /admin\/dinero\.js/.test(fs.readFileSync('/home/user/SaaS/sw.js', 'utf8')), '💰 dinero.js existe y está en el sw.js');
  ok(/CREAR = \{/.test(adm) && /nuevaCM/.test(adm), '+ Cuenta pregunta la app (CM o la 🧭 de cada app)');
  ok(/window\.CM_SOCIO/.test(adm) && /SOCIO\(\)/.test(ctl), 'Socio: Planes/Textos/Ajustes solo para mirar');

  execSync(__dirname + '/base.sh /home/user/estacionamiento p_g90', { stdio: 'ignore' });
  const t = await abrir('/home/user/estacionamiento', 'p_g90', { conCobro: true }); const p = t.page, su = t.sim.su, como = comoDe(su);
  try {
    const a = await t.sim.crearUsuario(ADM, 'admin123'); await su('update public.perfiles set es_admin = true where id = $1', [a.id]);
    await su("update public.cfx_config set valor = jsonb_set(jsonb_set(valor, '{link}', '\"https://mpago.la/e\"'), '{transferencia,numero}', '\"123\"') where clave = 'pagos'");
    await su("insert into public.cfx_config (clave, valor) values ('mp', '{\"token\":\"APP_USR-1234567890123456789012345\",\"activo\":true,\"nick\":\"CODEFIX\"}') on conflict (clave) do update set valor = excluded.valor");
    await su("insert into extensions.http_respuestas values ($1, 201, '{\"init_point\":\"https://mp.test/pagar\"}'), ($2, 200, '{\"results\":[]}')", [MP + '/checkout/preferences', MP + '/v1/payments/search%']);
    const b = await t.sim.crearUsuario('b@x.cl', 'clave123');
    const c = await t.sim.crearUsuario('c@x.cl', 'clave123');
    const m = await t.sim.crearUsuario('m@x.cl', 'clave123');
    await su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    await su(`update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}') || '{"telefono":"+56912345678"}' where email = 'm@x.cl'`);
    const aprobar = async (monto) => {
      const [g] = await su("select id from public.cfx_pagos where estado = 'pendiente' and medio = 'mp' order by creado desc limit 1");
      await su("update extensions.http_respuestas set content = $1 where url_like = $2", [JSON.stringify({ results: [{ id: Math.floor(Math.random() * 1e9), status: 'approved', external_reference: g.id, currency_id: 'CLP', transaction_amount: monto }] }), MP + '/v1/payments/search%']);
      return g.id;
    };

    // ---------- 🔔 alertas: la 1.ª vez solo marca; luego avisa negocio nuevo y errores nuevos ----------
    ok(+(await su('select public.cfx_alertas_revisar() as n'))[0].n === 0, '🔔 1.ª vuelta: solo marca (no avisa de lo viejo)');
    await su("select public.cfx_error_anotar('TypeError: x is undefined', 'app.js:10', '/', 'Chrome', '2.14.83')");
    const [cr] = await su("select count(*)::int n from cron.job where jobname = 'cfx-alertas' and schedule = '*/15 * * * *'").catch(() => [{ n: -1 }]);
    ok(cr.n !== 0, '🔔 tarea cada 15 min programada' + (cr.n < 0 ? ' (sin pg_cron en la prueba)' : ''));
    ok(+(await su('select public.cfx_alertas_revisar() as n'))[0].n === 1, '🔔 avisa 1 error nuevo al celular (vía CM)');
    ok(+(await su('select public.cfx_alertas_revisar() as n'))[0].n === 0, '🔔 no repite el mismo aviso');

    // ---------- 🎁 Regalo con ⚡ MP: no activa al que paga, crea key de 1 uso ----------
    const r1 = await como('b@x.cl', "public.cfx_mp_pagar('mensual', null, null, null, null, true)");
    ok(r1 && r1.ok, '🎁 paga un regalo con ⚡ Mercado Pago');
    const [pv] = await su("select premium_hasta from public.perfiles where id = $1", [b.id]);
    await aprobar(r1.monto);
    const rv = await como('b@x.cl', 'public.cfx_mp_revisar()');
    const [pb] = await su("select premium_hasta from public.perfiles where id = $1", [b.id]);
    ok(rv.aprobado && rv.pago && /^CFX-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(rv.pago.key_regalo || '') && rv.pago.regalo === true, '🎁 aprobado: devuelve la key ' + (rv.pago && rv.pago.key_regalo));
    ok(String(pb.premium_hasta) === String(pv.premium_hasta), '🎁 al que paga NO se le activa (es para otra cuenta)');
    const kc = await como('c@x.cl', 'public.cfx_key_canjear($2)', [rv.pago.key_regalo]);
    const [pc] = await su("select premium_hasta > now() + interval '29 days' pro from public.perfiles where id = $1", [c.id]);
    ok(!kc.error && pc.pro, '🎁 otra cuenta canjea la key → Premium 30 días');
    ok((await como('m@x.cl', 'public.cfx_key_canjear($2)', [rv.pago.key_regalo])).error, '🎁 la key sirve 1 sola vez');
    const eb = await como('b@x.cl', 'public.cfx_pago_estado()');
    ok((eb.keys || []).length === 1 && eb.keys[0].usada === true, '🎁 "Mis keys compradas" la muestra como usada');

    // ---------- 🎉 pago normal: "activo hasta" ----------
    const r2 = await como('m@x.cl', "public.cfx_mp_pagar('mensual')"); await aprobar(r2.monto);
    const rm = await como('m@x.cl', 'public.cfx_mp_revisar()');
    ok(rm.pago && rm.pago.hasta && !rm.pago.key_regalo && rm.pago.monto === r2.monto, '🎉 pago propio: devuelve "activo hasta" ' + (rm.pago && String(rm.pago.hasta).slice(0, 10)));

    // ---------- 🔑 respaldo: si la activación falla, igual queda aprobado con key ----------
    await su("alter function public.cfx_dar_premium(uuid, text, int) rename to cfx_dar_premium_ok");
    await su("create function public.cfx_dar_premium(uuid, text, int) returns timestamptz language plpgsql as $$ begin raise exception 'falla de prueba'; end $$");
    const r3 = await como('c@x.cl', "public.cfx_mp_pagar('mensual')"); const g3 = await aprobar(r3.monto);
    await su('select public.cfx_mp_revisar_pendientes()');
    const [p3] = await su('select estado, key_regalo, regalo, motivo from public.cfx_pagos where id = $1', [g3]);
    ok(p3.estado === 'aprobado' && /^CFX-/.test(p3.key_regalo || '') && !p3.regalo && /respaldo/.test(p3.motivo), '🔑 activación falló → aprobado con key de respaldo (no se pierde el pago)');
    await su('drop function public.cfx_dar_premium(uuid, text, int)'); await su('alter function public.cfx_dar_premium_ok(uuid, text, int) rename to cfx_dar_premium');

    // ---------- 💰 Dinero ----------
    await su("insert into public.cfx_pagos (cuenta, email, nombre, rol, periodo, monto, medio, estado, dias, creado, resuelto) values ($1, 'b@x.cl', 'Bea', 'cliente', 'mensual', 3000, 'link', 'aprobado', 30, now() - interval '40 days', now() - interval '40 days')", [b.id]);
    await su("update public.perfiles set premium_hasta = now() + interval '3 days' where id = $1", [m.id]);
    await su("update public.perfiles set premium_hasta = null where id = $1", [b.id]);  // ya no tiene la prueba Premium
    const d = await como(ADM, 'public.cfx_dinero()');
    ok(d.mes && d.mes.monto >= r1.monto + r2.monto + r3.monto && (d.por || []).some((x) => x.producto === 'premium'), '💰 ingresos del mes por Premium/módulo: $' + (d.mes && d.mes.monto));
    ok((d.morosos || []).some((x) => x.email === 'b@x.cl'), '💰 moroso: le venció hace 10 días y no renovó');
    ok((d.vencen || []).some((x) => x.email === 'm@x.cl' && x.tel === '+56912345678' && x.pago === true), '💰 vence en 3 días, con su WhatsApp');
    await su("insert into public.cfx_exentos (cuenta, nota) values ($1, 'amigo')", [b.id]);
    ok(!((await como(ADM, 'public.cfx_dinero()')).morosos || []).some((x) => x.email === 'b@x.cl'), '💰 exento no sale como moroso');
    let neg = ''; try { await como('b@x.cl', 'public.cfx_dinero()'); } catch (x) { neg = x.message; }
    ok(neg !== '', '💰 solo el administrador lo ve');

    // ---------- UI: 🎁 casilla y 🎉 pantalla con key + 🧾 comprobante ----------
    await t.ctx.route('https://mp.test/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Mercado Pago</h1>' }));
    await p.goto(t.base + '/#/avisos'); await p.waitForTimeout(1200);
    await p.click('button[data-t=in]'); await p.fill('#lEmail', 'b@x.cl'); await p.fill('#lClave', 'clave123'); await p.press('#lClave', 'Enter');
    await p.waitForTimeout(2500); await t.sinModales();
    await p.goto(t.base + '/#/premium'); await p.waitForTimeout(1500); await t.sinModales();
    await p.click('#prComprar'); await p.waitForTimeout(900);
    ok(await p.$('.cfx-pago #cpRegalo') !== null, '🎁 casilla "Es para otra cuenta" junto a ⚡ Pagar');
    await p.check('.cfx-pago #cpRegalo');
    await Promise.all([p.waitForURL(/mp\.test/, { timeout: 8000 }), p.click('.cfx-pago [data-mp]')]);
    const [g4] = await su("select id, monto, regalo from public.cfx_pagos order by creado desc limit 1");
    ok(g4.regalo === true, '🎁 el cobro queda marcado como regalo');
    await aprobar(g4.monto);
    await p.goto(t.base + '/#/premium'); await p.waitForTimeout(3500);
    const txt = await p.evaluate(() => (document.querySelector('dialog.cfx-pago') || {}).textContent || '');
    ok(/regalo está listo/.test(txt) && /CFX-/.test(txt) && /Ver comprobante/.test(txt), '🎉 al volver: key de regalo para copiar + 🧾 comprobante');
    await t.foto('g90-regalo');
    await p.click('dialog.cfx-pago [data-comp]'); await p.waitForTimeout(1500);
    ok(await p.$('.cfx-comp') !== null, '🧾 abre el comprobante de pago');
    await t.foto('g90-comprobante');
    const ancho = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    ok(ancho, 'sin scroll de lado');
  } catch (e) { console.log('✗ ' + e.message); f++; }
  if (t.errores.length) console.log('ERRORES:', t.errores.slice(0, 5).join('\n'));
  await t.cerrar();
  console.log(f ? '❌ ' + f + ' fallas' : '✅ g90 todo ok'); process.exit(f ? 1 : 0);
})();
