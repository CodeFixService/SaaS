// G55 · 🐞🎁 Reportar una falla con premio (núcleo + CM). FALLA con el código viejo (no existe la fila ni cfx_falla_*).
//  1) Despega (negocio, 320 px, oscuro): Más → Cuenta y ayuda → 🐞 Reportar una falla → texto + foto → llega con versión, pantalla, celular y errores.
//  2) Anti-spam: otro reporte antes de 2 min se frena en la app.  3) Solo el admin ve/responde.  4) "Es real" suma 15 días Premium UNA vez;
//  cliente → solo gracias.  5) CM → Mensajes → 🐞 Fallas: abre el reporte, "🎁 Es real: regalar 15 días" con la ventana de la app.
// Uso: ./base.sh /home/user/Aplicaciones && ./base.sh /home/user/saas g55_cm && ANCHO=320 node g55_reportes.js
const { abrir } = require('./h');
let fallas = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fallas++; };
const login = async (p, base, em, pw) => { await p.goto(base + '/'); await p.waitForTimeout(800); await p.fill('input[type=email]:visible', em); await p.fill('input[type=password]:visible', pw); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(3000); };
(async () => {
  let t = await abrir('/home/user/Aplicaciones', 'p_aplicaciones', { dialogosApp: true }); let p = t.page;
  try {
    await p.setViewportSize({ width: 320, height: 680 });
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    const adm = await t.sim.crearUsuario((await t.sim.su('select public.admin_email() e'))[0].e, 'admin123');
    await t.sim.su('update public.profiles set terms_at = now()');
    await p.goto(t.base + '/'); await p.waitForTimeout(500); await p.evaluate(() => localStorage.setItem('cfx:tour:orbita-inicio', '1'));
    await login(p, t.base, 'tienda@x.cl', 'clave123');
    await p.emulateMedia({ colorScheme: 'dark' }); await t.sinModales();
    await p.waitForFunction(() => window.CFX_CARGA, null, { timeout: 15000 });
    await p.evaluate(() => CFX_CARGA.anotarError('Prueba G55: algo se cayó', '/shared/x.js:1:2'));
    await p.evaluate(() => document.querySelector('nav [data-k=mas]').click());
    await p.waitForTimeout(1500);
    const fila = p.locator('[data-k=falla]:visible').first();
    ok(await fila.count() === 1, '1) Más → Cuenta y ayuda trae "🐞 Reportar una falla"');
    ok(await fila.evaluate((b) => !!b.querySelector('svg')), '1) con ícono SVG (bicho)');
    await fila.click(); await p.waitForTimeout(1200);
    const dlg = p.locator('dialog.cfx-ayuda[open]');
    ok(/15 días Premium/.test(await dlg.textContent()), '1) el negocio ve "🎁 Si es una falla real, te regalamos 15 días Premium"');
    ok(await t.anchoOk(), '1) 320 px sin scroll de lado');
    await dlg.locator('[data-enviar]').click(); await p.waitForTimeout(400);
    ok(/mínimo 5/.test(await dlg.locator('.ca-err').textContent()), '1) vacío avisa en la app sin ir al servidor');
    await dlg.locator('[data-t]').fill('Toqué Guardar y no pasó nada');
    await dlg.locator('[data-file]').setInputFiles(__dirname + '/comprobante.png'); await p.waitForTimeout(1200);
    ok(await dlg.locator('[data-fv] img').count() === 1, '1) la foto se ve antes de enviar');
    await t.foto('g55_reporte', p);
    await dlg.locator('[data-enviar]').click(); await p.waitForTimeout(1500);
    ok(/Gracias por avisarnos/.test(await dlg.textContent()), '1) pantalla de gracias');
    const [r] = await t.sim.su('select * from public.cfx_fallas');
    ok(r && r.cuenta === u.id && r.rol === 'negocio' && /^data:image\//.test(r.foto || ''), '1) llega con cuenta, rol y foto');
    ok(r && r.datos.version === '6.26' && r.datos.app && r.datos.celular && r.datos.tamano === '320×680' && r.datos.oscuro === true, '1) adjunta versión, app, celular, tamaño y modo ' + JSON.stringify(r && { v: r.datos.version, a: r.datos.app, c: r.datos.celular, p: r.datos.pantalla }));
    ok(r && (r.datos.errores || []).some((e) => /Prueba G55/.test(e.m)), '1) adjunta los últimos errores de la sesión ' + JSON.stringify(r && r.datos.errores));
    ok(/Recibido/.test(await dlg.textContent()), '1) "Tus reportes" muestra ⏳ Recibido');
    // 2) anti-spam
    await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
    await p.locator('[data-k=falla]:visible').first().click(); await p.waitForTimeout(800);
    await dlg.locator('[data-t]').fill('Otra cosa que falló'); await dlg.locator('[data-enviar]').click(); await p.waitForTimeout(1000);
    ok(/2 minutos/.test(await dlg.locator('.ca-err').textContent()), '2) segundo reporte antes de 2 min se frena');
    // 3) permisos
    const yo = { sub: u.id, email: 'tienda@x.cl' }, ad = { sub: adm.id, email: adm.email };
    ok(await t.sim.rpc('public', 'cfx_fallas_lista', {}, yo).then(() => false, () => true), '3) un negocio NO ve la lista de fallas');
    ok(await t.sim.rpc('public', 'cfx_falla_resolver', { p_id: r.id, p_real: true }, yo).then(() => false, () => true), '3) un negocio NO puede regalarse días');
    ok(await t.sim.rpc('public', 'cfx_falla_enviar', { p_texto: 'hola hola' }, null).then(() => false, () => true), '3) sin cuenta no se puede reportar');
    const L = await t.sim.rpc('public', 'cfx_fallas_lista', {}, ad);
    ok(L.length === 1 && L[0].con_foto && !('foto' in L[0]), '3) el admin ve la lista (sin la foto pesada)');
    // 4) premio una vez
    const antes = (await t.sim.su('select pro_until from public.profiles where id = $1', [u.id]))[0].pro_until;
    const v = await t.sim.rpc('public', 'cfx_falla_resolver', { p_id: r.id, p_real: true, p_mensaje: '', p_dias: 15 }, ad);
    const [pf] = await t.sim.su("select plan, pro_until, round(extract(epoch from pro_until - greatest(coalesce($2::timestamptz, now()), now())) / 86400) d from public.profiles where id = $1", [u.id, antes]);
    ok(v.dias === 15 && pf.plan === 'pro' && +pf.d === 15, '4) "Es real" suma 15 días Premium ' + JSON.stringify(pf));
    ok(await t.sim.rpc('public', 'cfx_falla_resolver', { p_id: r.id, p_real: true }, ad).then(() => false, (e) => /ya se respondió/.test(e.message)), '4) no se puede regalar dos veces el mismo reporte');
    ok((await t.sim.su("select count(*)::int n from public.notifications where target_id = $1 and title like '🎁 Gracias%'", [u.id]).catch(() => [{ n: -1 }]))[0].n === 1, '4) al negocio le llega "🎁 Gracias: tu reporte era real"');
    ok((await t.sim.su("select count(*)::int n from public.cfx_registro where accion = 'falla'"))[0].n === 1, '4) queda en 📜 Registro');
    await t.sim.su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl', 'Pepe', 'client', $1)", [u.id]);
    const c = await t.sim.crearUsuario('cli@x.cl', 'clave123');
    const yc = { sub: c.id, email: 'cli@x.cl' };
    const rc = await t.sim.rpc('public', 'cfx_falla_enviar', { p_texto: 'No carga el catálogo' }, yc);
    const mc = await t.sim.rpc('public', 'cfx_fallas_mias', {}, yc);
    ok(mc.premio === false, '4) al cliente no se le promete Premium');
    const vc = await t.sim.rpc('public', 'cfx_falla_resolver', { p_id: rc.id, p_real: true }, ad);
    ok(vc.dias === 0, '4) cliente: solo gracias (clientes no pagan)');
    const rn = await t.sim.su("insert into public.cfx_fallas (cuenta, rol, texto) values ($1, 'negocio', 'no es nada') returning id", [u.id]);
    await t.sim.rpc('public', 'cfx_falla_resolver', { p_id: rn[0].id, p_real: false }, ad);
    ok((await t.sim.su("select count(*)::int n from public.notifications where target_id = $1 and title = '🐞 Revisamos tu reporte'", [u.id]))[0].n === 1, '4) "No es falla" responde con mensaje amable');
    const ts = await t.sim.su("select count(*)::int n from public.cfx_fallas where cuenta = $1", [u.id]);
    await t.sim.su("update public.cfx_fallas set creado = now() - interval '1 hour'");
    for (let i = 0; i < 2; i++) { await t.sim.su("update public.cfx_fallas set creado = now() - interval '1 hour'"); await t.sim.rpc('public', 'cfx_falla_enviar', { p_texto: 'falla número ' + i }, yo).catch(() => {}); }
    ok(await t.sim.rpc('public', 'cfx_falla_enviar', { p_texto: 'una más hoy' }, yo).then(() => false, (e) => /3 reportes hoy/.test(e.message)) || ts[0].n < 0, '2) máximo 3 reportes al día por cuenta');
  } catch (e) { fallas++; console.log('✗ ' + e.message.split('\n')[0]); }
  await t.cerrar();
  // 5) CM → Mensajes → 🐞 Fallas (base del propio CM)
  t = await abrir('/home/user/saas', 'g55_cm', { dialogosApp: true }); p = t.page;
  try {
    await p.setViewportSize({ width: 320, height: 680 });
    const em = (await t.sim.su('select public.admin_email() e').catch(() => [{ e: '' }]))[0].e;
    const adm = await t.sim.crearUsuario(em, 'admin123');
    const u = await t.sim.crearUsuario('ana@x.cl', 'clave123');
    await t.sim.su("insert into public.cfx_fallas (cuenta, email, nombre, rol, texto, datos) values ($1, 'ana@x.cl', 'Ana', 'negocio', 'El botón Guardar no responde', '{\"version\":\"5.11\",\"pantalla\":\"/#hoy\",\"errores\":[{\"m\":\"x is undefined\",\"d\":\"app.js:3\"}]}')", [u.id]);
    await login(p, t.base, em, 'admin123');
    await p.goto(t.base + '/admin/#mensajes'); await p.waitForTimeout(3000); await t.sinModales();
    const card = p.locator('[data-f]').first();
    ok(await card.count() === 1 && /Nuevo/.test(await card.textContent()), '5) CM → Mensajes muestra la falla nueva');
    ok(await t.anchoOk(), '5) 320 px sin scroll de lado');
    await card.click(); await p.waitForTimeout(1200);
    ok((await t.sim.su('select estado from public.cfx_fallas'))[0].estado === 'revisando', '5) al abrirla queda "Revisando"');
    const md = p.locator('dialog[open]').last();
    ok(/5\.11/.test(await md.textContent()) && /x is undefined/.test(await md.innerHTML()), '5) muestra versión y errores');
    await t.foto('g55_cm_falla', p);
    await md.locator('[data-si]').click(); await p.waitForTimeout(600);
    ok(await p.locator('.cfx-dlg', { hasText: 'Regalar 15 días' }).count() === 1, '5) pide confirmar con la ventana de la app');
    await p.click('.cfx-dlg-si'); await p.waitForTimeout(1500);
    const [f] = await t.sim.su('select estado, dias from public.cfx_fallas');
    const [pf] = await t.sim.su('select premium_hasta > now() + interval \'14 days\' ok from public.perfiles where id = $1', [u.id]);
    ok(f.estado === 'real' && f.dias === 15 && pf.ok, '5) 🎁 regalados 15 días desde el CM ' + JSON.stringify(f));
  } catch (e) { fallas++; console.log('✗ ' + e.message.split('\n')[0]); }
  await t.cerrar();
  console.log(fallas ? 'FALLAS: ' + fallas : 'TODO OK');
  process.exitCode = fallas ? 1 : 0;
})();
