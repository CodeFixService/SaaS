// G86 · 📍 BiciTaller: rastreo de la bici robada (pasaporte). Quien escanea el QR comparte su ubicación (permiso del navegador);
// si la bici está reportada, la reciben en vivo el taller, el cliente dueño y CodeFix. 🕵️ Silencioso = quien escanea no ve el aviso.
// FALLA con el código viejo (no existen pasaporte_rastro, pasaporte_rastros, #cUbi ni "Dónde está").
// Uso: ./base.sh /home/user/taller p_g86 && ANCHO=320 node g86.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g86');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  const sinScroll = (pg) => (pg || p).evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const n = async (q, a) => (await su('select count(*)::int n from ' + q, a))[0].n;
  const S1 = 'a'.repeat(32), S2 = 'b'.repeat(32);
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    await su("update public.talleres set premium_hasta = now() - interval '1 day', telefono = '+56955556666'");
    const dueno = (await su("select id from auth.users where email = 'taller@x.cl'"))[0].id;
    const tid = (await su('select id from public.talleres'))[0].id;
    await t.sim.crearUsuario('cli@x.cl', 'clave123', { rol: 'cliente', taller: tid, nombre: 'Pedro' });
    await su("update public.perfiles set telefono = '+56911112222' where email = 'cli@x.cl'");
    const cli = (await su("select id from auth.users where email = 'cli@x.cl'"))[0].id;
    await su("insert into public.cfx_modulos_negocio (negocio, modulo, hasta) values ($1, 'pasaporte', now() + interval '30 days')", [dueno]);
    const pid = await como('taller@x.cl', "public.taller_pasaporte_guardar('{\"bici\":\"Trek Marlin 7\",\"serie\":\"WTU123456789\",\"dueno\":\"Pedro Pérez\",\"telefono\":\"+56911112222\"}')");
    const pa = (await su('select * from public.pasaportes where id = $1', [pid]))[0];

    // Seguridad de la base
    ok((await su("select relrowsecurity r from pg_class where relname = 'pasaporte_rastros'"))[0].r === true && await n("pg_policies where tablename = 'pasaporte_rastros'") === 0, '🔒 pasaporte_rastros: RLS sin políticas (solo por funciones)');
    ok((await su("select has_table_privilege('anon', 'public.pasaporte_rastros', 'select') or has_function_privilege('anon', 'public.pasaporte_rastros_json(uuid)', 'execute') x"))[0].x === false, '🔒 anónimo no lee la tabla ni la función de puntos');
    let r = (await su("select public.pasaporte_rastro($1, $2, -33.45, -70.66, 12) r", [pa.token, S1]))[0].r;
    ok(r.ok === true && await n('public.pasaporte_rastros') === 0, '🧹 sin robo: responde igual y NO guarda la ubicación');

    // Dueño reporta (silencioso por defecto) desde su link
    const q = await t.ctx.newPage();
    await q.goto(t.base + '/p/?t=' + pa.token + '&c=' + pa.clave); await q.waitForTimeout(3500);
    ok(await q.locator('#cSil').isChecked() && await q.locator('#cUbi').isHidden(), '🔐 dueño: casilla 🕵️ silencioso marcada y a él no se le pide ubicación');
    q.once('dialog', (dl) => dl.accept('Mall Plaza'));
    await q.click('#bRobo'); await q.waitForTimeout(2500);
    const pb = (await su('select robada, silencio from public.pasaportes'))[0];
    ok(pb.robada === true && pb.silencio === true, '🚨 Me la robaron → robada + silencio');
    ok(await n("public.notificaciones where para = $1 and titulo like '%Bici robada%'", [dueno]) === 1 && await n("public.notificaciones where para = $1 and titulo like '%Bici robada%' and url like '/p/?t=%&c=%'", [cli]) === 1, '🔔 aviso de robo al taller y al cliente (por su teléfono)');
    ok(/Todavía nadie la escanea/.test(await q.locator('#cRas').innerText()), '📍 dueño ve "Dónde está" (aún sin escaneos)');

    // Quien escanea (otro teléfono, con ubicación)
    const { ctx: c2, page: e } = await t.nuevo();
    await c2.grantPermissions(['geolocation']); await c2.setGeolocation({ latitude: -33.4489, longitude: -70.6693, accuracy: 9 });
    await e.goto(t.base + '/p/?t=' + pa.token); await e.waitForTimeout(5000);
    const u = await e.locator('#todo').innerText();
    ok(!/ROBADA/i.test(u) && /Sin reporte de robo/.test(u), '🕵️ silencioso: quien escanea NO ve el aviso de robo');
    ok(/Ubicación compartida/.test(u), '📍 a quien escanea se le pide la ubicación y queda tranquilo ("Listo, gracias")');
    ok(await sinScroll(e), 'sin scroll horizontal a 320 px (/p/ escaneo)');
    let R = await su('select * from public.pasaporte_rastros order by id');
    ok(R.length === 1 && Math.abs(R[0].lat + 33.4489) < 1e-5 && R[0].prec === 9, '💾 se guardó el punto con su precisión');
    ok(await n("public.notificaciones where titulo like '%ubicación recibida%' and para = $1", [dueno]) === 1 && await n("public.notificaciones where titulo like '%ubicación recibida%' and para = $1", [cli]) === 1, '🔔 ubicación: aviso al taller y al cliente');
    ok(await n("public.notificaciones where titulo like '%ubicación recibida%' and cuerpo ~ '-?[0-9]+\\.[0-9]{3}'") === 0, '🔒 el aviso no lleva coordenadas (solo dentro de la app)');

    // Se mueve: el punto nuevo llega solo
    await e.waitForTimeout(8500);
    await c2.setGeolocation({ latitude: -33.4400, longitude: -70.6500, accuracy: 15 }); await e.waitForTimeout(4000);
    R = await su('select * from public.pasaporte_rastros order by id');
    ok(R.length === 2 && Math.abs(R[1].lat + 33.44) < 1e-5, '🏃 se mueve → llega el punto nuevo (tiempo real)');
    ok(await n("public.notificaciones where para = $1 and (titulo like '%ubicación%' or titulo like '%se mueve%')", [dueno]) === 1, '🔕 sin lluvia de avisos (1 por teléfono, luego cada 10 min)');
    await q.waitForTimeout(16000);
    const dv = await q.locator('#cRas').innerText();
    ok(/Última ubicación/.test(dv) && await q.locator('#ras [data-rastros="2"]').count() === 1 && /-33\.440000,-70\.650000/.test(await q.locator('#ras a.btn').first().getAttribute('href')), '🗺️ dueño: el mapa se actualiza solo con el último punto');
    ok(await sinScroll(q), 'sin scroll horizontal a 320 px (/p/ dueño)');
    await t.foto('g86_dueno', q).catch(() => {});

    // Frenos y validación
    await su("select public.pasaporte_rastro($1, $2, -33.44, -70.65, 5)", [pa.token, 'e'.repeat(32)]);
    await su("select public.pasaporte_rastro($1, $2, -33.45, -70.66, 5)", [pa.token, 'e'.repeat(32)]);
    ok(await n('public.pasaporte_rastros') === 3, '⏱️ freno: 1 punto cada 4 s por teléfono');
    await su("select public.pasaporte_rastro($1, $2, 999, -70.65, 5), public.pasaporte_rastro($1, 'x', -33, -70, 5), public.pasaporte_rastro($1, $2, 'NaN', 'NaN', 5)", [pa.token, S2]);
    R = await su("select * from public.pasaporte_rastros where sesion = $1", [S2]);
    ok(R.length === 1 && R[0].lat === null, '🧪 coordenadas inválidas: quedan como "solo la escanearon" (una vez)');
    await su("insert into public.pasaporte_rastros (pasaporte_id, sesion, lat, lng, created_at) values ($1, $2, 1, 1, now() - interval '31 days')", [pid, S1]);
    await su("select public.pasaporte_rastro($1, $2, -33.1, -70.1, 5)", [pa.token, S1]);
    ok(await n("public.pasaporte_rastros where created_at < now() - interval '30 days'") === 0, '🧹 los puntos de más de 30 días se borran solos');
    await su("insert into public.pasaporte_rastros (pasaporte_id, sesion) select $1, md5(g::text) from generate_series(1, 30) g", [pid]);
    await su("select public.pasaporte_rastro($1, $2, -33.2, -70.2, 5)", [pa.token, 'c'.repeat(32)]);
    ok(await n("public.pasaporte_rastros where sesion = $1", ['c'.repeat(32)]) === 0, '🛑 freno: máximo 30 teléfonos por hora por bici');
    await su("delete from public.pasaporte_rastros where lat is null and sesion <> $1", [S2]);
    ok((await su('select public.pasaporte_ver($1) r', [pa.token]))[0].r.rastros.length === 0, '🔒 sin la clave del dueño nadie ve los puntos');

    // Taller: lista + pasaporte con mapa
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await p.evaluate(() => { location.hash = 'mas/pasaporte'; }); await p.waitForTimeout(2500);
    ok(/Robada · vista/.test(await p.locator('#pLista').innerText().catch(() => '')), '🪪 lista del taller: "Robada · vista recién"');
    await p.click('[data-pa="' + pid + '"]'); await p.waitForTimeout(1800);
    const dl = await p.locator('dialog[open]').last().innerText();
    ok(/Dónde está/.test(dl) && /Última ubicación/.test(dl) && /silencioso/i.test(dl), '🗺️ taller: pasaporte con "Dónde está", último punto y modo silencioso');
    ok(await sinScroll(), 'sin scroll horizontal a 320 px (taller)');
    await t.foto('g86_taller').catch(() => {});

    // Recuperada → vuelve a la normalidad; reporte a la vista (sin silencio) desde el taller
    await como('taller@x.cl', "public.taller_pasaporte_guardar($2::jsonb)", [JSON.stringify({ id: pid, bici: 'Trek Marlin 7', serie: 'WTU123456789', dueno: 'Pedro Pérez', telefono: '+56911112222', robada: false })]);
    const antes = await n('public.pasaporte_rastros');
    await su("select public.pasaporte_rastro($1, $2, -33.3, -70.3, 5)", [pa.token, 'd'.repeat(32)]);
    ok(await n('public.pasaporte_rastros') === antes, '✅ recuperada: deja de guardar ubicaciones');
    await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close())); await p.waitForTimeout(500);
    await p.evaluate(() => { location.hash = 'mas'; }); await p.waitForTimeout(800); await p.evaluate(() => { location.hash = 'mas/pasaporte'; }); await p.waitForTimeout(2500);
    await p.click('[data-pa="' + pid + '"]'); await p.waitForTimeout(1800);
    await p.click('dialog[open] #paR'); await p.waitForTimeout(800);
    ok(await p.locator('dialog[open] #rbS').isChecked(), '🚨 taller → Reportar robo: casilla 🕵️ silencioso marcada');
    await p.fill('dialog[open] #rbN', 'Ciclovía'); await p.uncheck('dialog[open] #rbS'); await p.click('dialog[open] #rbOk'); await p.waitForTimeout(2500);
    const pc = (await su('select robada, silencio from public.pasaportes'))[0];
    ok(pc.robada === true && pc.silencio === false, '📢 sin silencio: robada con aviso a la vista');
    await e.reload(); await e.waitForTimeout(4000);
    ok(/REPORTADA COMO ROBADA/.test(await e.locator('#todo').innerText()), '📢 sin silencio quien escanea ve REPORTADA COMO ROBADA (como antes)');
    await c2.close();
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); await t.foto('g86_error').catch(() => {}); }
  await t.cerrar();
  console.log(f ? '\n' + f + ' FALLAS' : '\nTODO OK');
  process.exit(f ? 1 : 0);
})();
