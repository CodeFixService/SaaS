// G100 · ⚡ Con Mercado Pago conectado, BiciTaller y Estaciona cobran SIN link de pago.
//   🚲 link_guardar activa el abono sin link (solo con MP) · link_activo/taller_publico/reservar/checklist/panel lo aceptan · /r/ sin botón de link vacío.
//   🅿️ mi_cuenta.link_listo, panel.falta.link y la guía cuentan ⚡ MP como "cómo te pagan".
// FALLA con el código viejo (link_guardar exigía el link; link_listo/falta solo miraban url).
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const MP = 'https://api.mercadopago.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
const stub = (su) => su("insert into extensions.http_respuestas values ($1, 200, '{\"nickname\":\"NEGOCIO\"}'), ($2, 201, '{\"init_point\":\"https://mp.test/pagar\"}'), ($3, 200, '{\"results\":[]}')",
  [MP + '/users/me', MP + '/checkout/preferences', MP + '/v1/payments/search%']);
(async () => {
  // ==================== 🚲 BICITALLER ====================
  execSync(__dirname + '/base.sh /home/user/Taller p_g100t', { stdio: 'ignore' });
  const t = await abrir('/home/user/Taller', 'p_g100t'); const su = t.sim.su, como = comoDe(su);
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Sur', nombre: 'Ana' });
    const T = (await su('select id, slug from public.talleres limit 1'))[0];
    await su('update public.talleres set reservas_online = true where id = $1', [T.id]);
    await stub(su);
    const sinLink = "public.link_guardar('abono', 1, 5000, '', '', true)";
    ok(/link/.test(await falla(() => como('dueno@x.cl', sinLink)) || ''), '🔒 Sin ⚡ MP: el abono sin link NO se activa');
    ok(/monto/.test(await falla(() => como('dueno@x.cl', "public.link_guardar('abono', 1, 0, '', '', true)")) || ''), '🔒 Sin monto no se activa');
    await como('dueno@x.cl', "public.cfx_mp_neg_guardar('APP_USR-1234567890123456789012345-b1c1', true)");
    ok(!(await falla(() => como('dueno@x.cl', sinLink))), '⚡ Con MP conectado: el abono se activa SIN link');
    ok((await su("select (public.link_activo($1, 'abono')).monto m", [T.id]))[0].m === 5000, 'link_activo: abono de $5.000 vigente sin link');
    const pub = (await su('select public.taller_publico($1) p', [T.slug]))[0].p;
    ok(pub && pub.reservas_online === true, 'Página pública: recibe reservas online');
    const r = await su("select public.reservar($1, null, current_date + 2, '10:00', 'Pepe', '+56912345672', null, 'Bici', '') r", [T.id]).then((x) => x[0].r);
    ok(!/configura el pago/.test(r.error || ''), 'reservar: ya no dice "aún no configura el pago" (' + (r.error || 'ok') + ')');
    const g = await como('dueno@x.cl', 'public.cfx_guia_app()');
    ok((g.find((x) => x.k === 'abono') || {}).ok === true, 'Guía para partir: ✅ cobro del abono');
    const P = await como('dueno@x.cl', 'public.taller_panel()');
    ok(P.abono_ok === true, 'Panel: abono_ok');
    await como('dueno@x.cl', "public.cfx_mp_neg_guardar(null, false)");
    ok((await su("select (public.link_activo($1, 'abono')).id is null n", [T.id]))[0].n, 'MP pausado y sin link → no recibe reservas (sin cobro)');
    await como('dueno@x.cl', "public.cfx_mp_neg_guardar(null, true)");
    // 📱 /r/ por pagar sin link: solo ⚡ MP, sin botón de link vacío
    const tok = (await su("insert into public.reservas (taller_id, fecha, hora, hora_fin, nombre, telefono, abono_monto, estado, expira_at) " +
      "values ($1, current_date + 3, '10:00', '11:00', 'Pepe', '+56912345672', 5000, 'por_pagar', now() + interval '20 minutes') returning token", [T.id]))[0].token;
    await t.page.goto(t.base + '/r/?t=' + tok); await t.page.waitForTimeout(2500);
    const txt = await t.page.evaluate(() => document.body.innerText);
    ok(/Pagar \$5\.000 con Mercado Pago/.test(txt), '/r/: botón ⚡ Pagar con Mercado Pago');
    ok(!(await t.page.$('#bPagar')) && /Pagaste de otra forma/.test(txt), '/r/: sin botón de link vacío; comprobante como "otra forma"');
    ok(await t.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '/r/ 📱: sin scroll horizontal');
    await t.page.screenshot({ path: __dirname + '/capturas/taller/g100_r.png', fullPage: true }).catch(() => {});
    // 📱 Dueño: Más → 💳 Abono dice que el link es opcional; Hoy no pide el link
    const q = (await t.nuevo()).page;
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.fill('input[type=email]:visible', 'dueno@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter');
    await q.waitForTimeout(3500); await t.sinModales(q);
    const hoy = await q.evaluate(() => (document.getElementById('bienvenida') || {}).innerText || '');
    ok(!/Configura el (cobro|link)/.test(hoy), 'Hoy: ya no pide configurar el abono · ' + hoy.slice(0, 300).replace(/\n/g, ' / '));
    await q.evaluate(() => { location.hash = '#mas/abono'; }); await q.waitForTimeout(2500);
    const ab = await q.evaluate(() => document.body.innerText);
    ok(/opcional con/.test(ab), 'Más → Abono: "Link de pago (opcional con ⚡ Mercado Pago)"');
    await q.screenshot({ path: __dirname + '/capturas/taller/g100_abono.png' }).catch(() => {});
    ok(!t.errores.filter((m) => !/favicon|404|status of 400/.test(m)).length, 'BiciTaller: sin errores en la consola ' + t.errores.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'BiciTaller error: ' + (e.stack || e).toString().slice(0, 500)); }
  await t.cerrar();

  // ==================== 🅿️ ESTACIONA ====================
  execSync(__dirname + '/base.sh /home/user/Estacionamiento p_g100e', { stdio: 'ignore' });
  const t2 = await abrir('/home/user/Estacionamiento', 'p_g100e'); const su2 = t2.sim.su, como2 = comoDe(su2);
  try {
    await t2.sim.crearUsuario('dueno@x.cl', 'clave123');
    await su2("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    await stub(su2);
    let c = await como2('dueno@x.cl', 'public.mi_cuenta()');
    ok(c.link_listo === false, 'Sin link ni MP: link_listo = no');
    ok((await como2('dueno@x.cl', 'public.panel()')).falta.link === true, 'Sin link ni MP: el panel pide configurar el cobro');
    await como2('dueno@x.cl', "public.cfx_mp_neg_guardar('APP_USR-1234567890123456789012345-ef01', true)");
    c = await como2('dueno@x.cl', 'public.mi_cuenta()');
    ok(c.link_listo === true, '⚡ Con MP: link_listo = sí (sin link)');
    ok((await como2('dueno@x.cl', 'public.panel()')).falta.link === false, '⚡ Con MP: el panel ya no pide el link');
    const g = await como2('dueno@x.cl', 'public.cfx_guia_app()');
    ok((g.find((x) => x.k === 'link') || {}).ok === true, 'Guía: ✅ cómo te pagan');
    ok(!(await su2("select has_function_privilege('anon', 'public._cobro_listo(uuid)', 'execute') a"))[0].a, '🔒 _cobro_listo no se llama desde fuera');
  } catch (e) { ok(false, 'Estaciona error: ' + (e.stack || e).toString().slice(0, 500)); }
  await t2.cerrar();
  console.log(f ? '✗ ' + f + ' fallaron' : '✓ todo bien'); process.exit(f ? 1 : 0);
})();
