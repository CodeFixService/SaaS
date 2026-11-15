// G59f · 🧩 BiciTaller módulo 🪪 Pasaporte de la bici (sticker QR en el cuadro: historial, dueño, robo reportado).
// Sin comprarlo (venta prendida): Más → 🪪 ofrece el módulo y la base no deja crear.
// Con él: orden → 🪪 Pasaporte → Crear (enlaza la orden: historial) → 🖨️ Sticker QR → /p/ pública (serie tapada, ✅ sin robo)
// → dueño con su clave (link en /r/): 🚨 Me la robaron (aviso al taller) → /p/ muestra REPORTADA COMO ROBADA → ✅ La recuperé.
// FALLA con el código viejo (no existen pasaportes, taller_pasaportes, p/ ni Más → 🪪).
// Uso: ./base.sh /home/user/taller p_g59f && ANCHO=320 node g59f_pasaporte.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g59f');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const toca = async (sel, pg) => { pg = pg || p; await pg.evaluate((x) => document.querySelector(x).scrollIntoView({ block: 'center' }), sel); await pg.waitForTimeout(300); await pg.click(sel); };
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  const dialogo = () => p.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => d.innerText).join(' '));
  const cerrarDialogos = () => p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  const sinScroll = (pg) => (pg || p).evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const ir = async (h) => { await p.evaluate(() => { history.replaceState(null, '', '#hoy'); }); await p.reload(); await p.waitForTimeout(3500); await t.sinModales(); await p.evaluate((x) => { location.hash = x; }, h); await p.waitForTimeout(2000); };
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    await su("update public.talleres set premium_hasta = now() - interval '1 day', telefono = '+56955556666'");
    const dueno = (await su("select id from auth.users where email = 'taller@x.cl'"))[0].id;
    const hoy = (await su("select (now() at time zone 'America/Santiago')::date::text d"))[0].d;
    await como('taller@x.cl', "public.taller_reserva_manual($2::date, '10:00', null, 'Pedro Pérez', '+56911112222', 'Trek Marlin 7', '', true)", [hoy]);
    const rid = (await su("select id from public.reservas where nombre = 'Pedro Pérez'"))[0].id;
    await su("update public.reservas set estado = 'lista', items = $1::jsonb where id = $2", [JSON.stringify([{ nombre: 'Cadena 11v', cant: 1, precio: 18000 }, { nombre: 'Pastillas', cant: 1, precio: 9000, aprob: 'no' }]), rid]);

    // Venta prendida y sin comprar
    await su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
    ok((await su("select 'pasaporte' = any (public.cfx_modulos_app()) x"))[0].x, '🧩 BiciTaller vende 🪪 pasaporte');
    ok((await como('taller@x.cl', 'public.taller_pasaportes()')).bloqueado === true, '🔒 sin módulo: taller_pasaportes bloqueado');
    let err = ''; await como('taller@x.cl', "public.taller_pasaporte_guardar('{\"bici\":\"X\"}')").catch((e) => { err = e.message; });
    ok(/módulo/.test(err), '🔒 sin módulo la base no deja crear pasaportes');

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await p.evaluate(() => { location.hash = 'mas/pasaporte'; }); await p.waitForTimeout(2000);
    ok(await p.locator('[data-ofrecer="pasaporte"]').count() === 1, '🪪 Más → Pasaporte sin módulo: "🧩 Ver el módulo"');
    await toca('[data-ofrecer="pasaporte"]'); await p.waitForTimeout(1500);
    ok(/REPORTADA COMO ROBADA/.test(await dialogo()), '▶️ abre la demo de 🪪');
    await cerrarDialogos();

    // Con el módulo: desde la orden
    await su("insert into public.cfx_modulos_negocio (negocio, modulo, hasta) values ($1, 'pasaporte', now() + interval '30 days')", [dueno]);
    const abrirOrden = async () => { await ir('reservas'); await p.evaluate((id) => { const e = document.querySelector('[data-tj="' + id + '"], [data-r="' + id + '"]'); e.scrollIntoView(); e.click(); }, rid); await p.waitForTimeout(2000); };
    await abrirOrden();
    ok(await p.locator('#dPas').count() === 1, '🪪 la orden tiene el botón Pasaporte');
    await toca('#dPas'); await p.waitForTimeout(1200);
    ok(await p.locator('dialog[open] #paB').inputValue() === 'Trek Marlin 7' && await p.locator('dialog[open] #paD').inputValue() === 'Pedro Pérez', '🪪 viene con la bici y el dueño de la orden');
    await p.fill('dialog[open] #paS', 'WTU123456789'); await p.fill('dialog[open] #paC', 'Negra');
    ok(await sinScroll(), 'sin scroll horizontal a 320 px (pasaporte)');
    await toca('dialog[open] #paG'); await p.waitForTimeout(2500);
    const pa = (await su('select * from public.pasaportes'))[0] || {};
    ok(pa.serie === 'WTU123456789' && pa.tel_norm === '56911112222', '💾 pasaporte creado con serie y teléfono');
    ok((await su('select pasaporte_id from public.reservas where id = $1', [rid]))[0].pasaporte_id === pa.id, '🔗 la orden queda enlazada (historial)');
    const dl = await dialogo();
    ok(/Historial/.test(dl) && /Cadena 11v/.test(dl) && !/Pastillas/.test(dl), '🔧 historial con lo aprobado (sin lo rechazado)');
    await t.foto('g59f_pasaporte');
    const [pop] = await Promise.all([t.ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), toca('dialog[open] #paQ')]);
    ok(pop && /PASAPORTE DE LA BICI/.test(await pop.content()), '🖨️ Sticker QR para imprimir');
    if (pop) await pop.close();
    await cerrarDialogos();

    // Orden nueva del mismo cliente y bici: se enlaza sola
    await como('taller@x.cl', "public.taller_reserva_manual($2::date, '12:00', null, 'Pedro Pérez', '+56911112222', 'trek marlin 7', '', true)", [hoy]);
    ok((await su("select count(*)::int n from public.reservas where pasaporte_id = $1", [pa.id]))[0].n === 2, '🔗 orden nueva de la misma bici se enlaza sola');

    // Público: /p/ sin clave
    const q = await t.ctx.newPage();
    await q.goto(t.base + '/p/?t=' + pa.token); await q.waitForTimeout(3500);
    let u = await q.locator('#todo').innerText().catch(() => '');
    ok(/Trek Marlin 7/.test(u) && /6789/.test(u) && !/WTU123456789/.test(u) && /Sin reporte de robo/.test(u) && /Cadena 11v/.test(u), '📱 /p/: bici, serie tapada, ✅ sin robo e historial');
    ok(await q.locator('#cDueno').isHidden(), '🔐 sin clave no puede reportar');
    ok(await sinScroll(q), 'sin scroll horizontal a 320 px (/p/)');
    err = ''; const r0 = (await su("select public.pasaporte_reportar($1, 'clavefalsa1234567890123', true, '') r", [pa.token]))[0].r;
    ok(r0.ok === false, '🔒 clave falsa: no reporta');

    // Dueño: link en /r/ → /p/ con clave → 🚨
    const tk = (await su('select token from public.reservas where id = $1', [rid]))[0].token;
    await q.goto(t.base + '/r/?t=' + tk); await q.waitForTimeout(3500);
    const href = await q.locator('#pasLink').getAttribute('href').catch(() => '');
    ok(/p\/\?t=/.test(href) && /&c=/.test(href) && await q.locator('#cPas').isVisible(), '🪪 /r/: "Ver mi pasaporte" con la clave del dueño');
    await q.goto(new URL(href, q.url()).href); await q.waitForTimeout(3500);
    ok(await q.locator('#cDueno').isVisible() && /WTU123456789/.test(await q.locator('#datos').innerText()), '🔐 dueño: ve su serie completa y el botón');
    q.once('dialog', (dl) => dl.accept('Mall Plaza, 15/11'));  // h.js: CFX_DIALOGO.pedir → prompt
    await q.click('#bRobo'); await q.waitForTimeout(2500);
    ok((await su('select robada, robada_nota from public.pasaportes'))[0].robada === true, '🚨 Me la robaron → robada');
    ok((await su("select count(*)::int n from public.notificaciones where para = $1 and titulo like '%robada%'", [dueno]))[0].n === 1, '🔔 le avisamos al taller');
    await t.foto('g59f_robada', q).catch(() => q.screenshot({ path: __dirname + '/capturas/g59f_robada.png' }));
    await q.goto(t.base + '/p/?t=' + pa.token); await q.waitForTimeout(3500);
    u = await q.locator('#todo').innerText();
    ok(/REPORTADA COMO ROBADA/.test(u) && /Mall Plaza/.test(u) && /avisar al taller/i.test(u), '📱 quien escanea ve REPORTADA COMO ROBADA + 📲 avisar al taller');

    // Taller: lista con 🚨 y ✅ La recuperó
    await ir('mas/pasaporte');
    ok(/Robada/.test(await p.locator('#pLista').innerText().catch(() => '')), '🪪 lista: aparece 🚨 Robada');
    await toca('[data-pa="' + pa.id + '"]'); await p.waitForTimeout(1500);
    await toca('dialog[open] #paR'); await p.waitForTimeout(800);
    await p.locator('dialog[open] [data-si]').last().click().catch(() => {}); await p.waitForTimeout(2000);
    ok((await su('select robada from public.pasaportes'))[0].robada === false, '✅ La recuperó → sin aviso de robo');
    err = ''; await como('taller@x.cl', "public.taller_pasaporte_guardar('{\"bici\":\"Otra\",\"serie\":\"wtu123456789\"}')").catch((e) => { err = e.message; });
    ok(/serie/.test(err), '🔁 no deja 2 pasaportes con el mismo nº de serie');

    // Sin módulo la ficha pública no se ve
    await su("delete from public.cfx_modulos_negocio where modulo = 'pasaporte'");
    ok((await su('select public.pasaporte_ver($1) r', [pa.token]))[0].r === null, '🔒 sin módulo: /p/ ya no muestra la bici');
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); await t.foto('g59f_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
