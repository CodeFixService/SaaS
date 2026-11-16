// G59h · 🧩 BiciTaller módulo 🛡️ Garantías (del trabajo, repuestos o bici usada, con vencimiento; el cliente la "usa" desde su link).
// Sin comprarlo (venta prendida): Más → 🛡️ ofrece el módulo y la base no deja crear. Con él: orden lista → 🛡️ Garantía → Dar garantía
// → /r/ muestra "Tu garantía" → /g/ VIGENTE → 🛡️ Usar mi garantía → Hoy "usó su garantía" → ✅ Lo arreglé → /g/ "Listo". Por vencer → 📲 Avisar.
// Bici usada vendida → garantía al comprador. FALLA con el código viejo (no existen garantias, taller_garantia_guardar, /g/ ni Más → 🛡️).
// Uso: ./base.sh /home/user/taller p_g59h && ANCHO=320 node g59h_garantias.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g59h');
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
    await su("update public.talleres set premium_hasta = now() - interval '1 day', telefono = '+56955556666', direccion = 'Irarrázaval 100', comuna = 'Ñuñoa'");
    const tid = (await su('select id from public.talleres'))[0].id;
    const dueno = (await su("select id from auth.users where email = 'taller@x.cl'"))[0].id;
    const hoy = (await su("select (now() at time zone 'America/Santiago')::date::text d"))[0].d;
    await como('taller@x.cl', "public.taller_reserva_manual($2::date, '10:00', null, 'Pedro Pérez', '+56911112222', 'Trek Marlin 7', '', true)", [hoy]);
    const r = (await su("select id, token from public.reservas where nombre = 'Pedro Pérez'"))[0];
    await su("update public.reservas set items = $1::jsonb, total = 18000, estado = 'lista' where id = $2", [JSON.stringify([{ nombre: 'Cadena 11v', cant: 1, precio: 18000 }]), r.id]);

    // Venta prendida y sin comprar
    await su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
    ok((await su("select 'garantias' = any (public.cfx_modulos_app()) x"))[0].x, '🧩 BiciTaller vende 🛡️ Garantías');
    ok((await como('taller@x.cl', 'public.taller_garantias()')).bloqueado === true, '🔒 sin módulo: lista bloqueada');
    let err = ''; await como('taller@x.cl', "public.taller_garantia_guardar(jsonb_build_object('reserva', $2::text))", [r.id]).catch((e) => { err = e.message; });
    ok(/módulo/.test(err), '🔒 sin módulo la base no deja dar garantía');

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await p.evaluate(() => { location.hash = 'mas/garantias'; }); await p.waitForTimeout(2000);
    ok(await p.locator('[data-ofrecer="garantias"]').count() >= 1, '🛡️ Más → Garantías sin módulo: "🧩 Ver el módulo"');
    await toca('[data-ofrecer="garantias"]'); await p.waitForTimeout(1500);
    ok(/Usar mi garantía/i.test(await dialogo()), '▶️ abre la demo de 🛡️');
    await cerrarDialogos();

    // Con el módulo: orden lista → 🛡️ Garantía
    await su("insert into public.cfx_modulos_negocio (negocio, modulo, hasta) values ($1, 'garantias', now() + interval '30 days')", [dueno]);
    const abrirOrden = async (id) => { await ir('reservas'); await p.evaluate((x) => { const e = document.querySelector('[data-tj="' + x + '"], [data-r="' + x + '"]'); e.scrollIntoView(); e.click(); }, id); await p.waitForTimeout(2000); };
    await abrirOrden(r.id);
    ok(await p.locator('#dGar').count() === 1, '🛡️ la orden lista tiene el botón Garantía');
    await toca('#dGar'); await p.waitForTimeout(1200);
    ok(await p.inputValue('dialog[open] #gaN') === 'Pedro Pérez' && await p.inputValue('dialog[open] #gaB') === 'Trek Marlin 7', '📝 trae cliente y bici de la orden');
    ok(await sinScroll(), 'sin scroll horizontal a 320 px (dar garantía)');
    await p.selectOption('dialog[open] #gaM', '6'); await p.selectOption('dialog[open] #gaQ', 'todo'); await p.fill('dialog[open] #gaD', 'Cambio de cadena');
    await toca('dialog[open] #gaG'); await p.waitForTimeout(2500);
    let g = (await su('select *, hasta::text h, desde::text d from public.garantias'))[0] || {};
    const esp = (await su("select ($1::date + interval '6 months')::date::text x", [hoy]))[0].x;
    ok(g.reserva_id === r.id && g.meses === 6 && g.cubre === 'todo' && g.d === hoy && g.h === esp, '💾 garantía de 6 meses (trabajo y repuestos) hasta ' + esp);
    ok(/Enviar al cliente/.test(await dialogo()), '📲 vuelve a abrir con "Enviar al cliente"');
    const wa = await p.locator('dialog[open] a', { hasText: 'Enviar al cliente' }).getAttribute('href');
    ok(/wa\.me\/56911112222/.test(wa) && /g\/\?t=/.test(decodeURIComponent(wa)), '📲 WhatsApp con el link /g/');
    await cerrarDialogos();
    await toca('#dGar'); await p.waitForTimeout(1200); await toca('dialog[open] #gaG'); await p.waitForTimeout(2000);
    ok((await su('select count(*)::int n from public.garantias'))[0].n === 1, '🔁 guardar de nuevo no duplica');
    await cerrarDialogos();

    // 👤 Cliente: /r/ y /g/
    const q = await t.ctx.newPage();
    await q.goto(t.base + '/r/?t=' + r.token); await q.waitForTimeout(3500);
    ok(await q.locator('#cGar').isVisible(), '📱 /r/: "Tu garantía"');
    await q.click('#garLink'); await q.waitForTimeout(3500);
    ok(/VIGENTE/.test(await q.locator('#estado').innerText()) && /Trek Marlin 7/.test(await q.locator('#tit').innerText()), '📱 /g/: VIGENTE con la bici');
    ok(await sinScroll(q), 'sin scroll horizontal a 320 px (/g/)');
    await t.foto('g59h_cliente', q).catch(() => {});
    q.once('dialog', (d) => d.accept('Suena el cambio trasero'));
    await toca('#bUsar', q); await q.waitForTimeout(800);
    await q.evaluate(() => { const i = document.querySelector('dialog[open] input, dialog[open] textarea'); if (i) { i.value = 'Suena el cambio trasero'; i.dispatchEvent(new Event('input')); } });
    await q.locator('dialog[open] [data-si], dialog[open] button.cfx-dlg-si, dialog[open] button:not(.ghost)').last().click().catch(() => {});
    await q.waitForTimeout(2500);
    g = (await su('select * from public.garantias'))[0];
    ok(g.reclamo === 'abierto' && /cambio trasero/.test(g.reclamo_nota), '🛡️ Usar mi garantía: reclamo enviado');
    ok(/Aviso enviado/.test(await q.locator('#cRec').innerText()) && !(await q.locator('#cUsar').isVisible()), '📱 /g/: "Aviso enviado" (sin repetir)');
    ok((await su("select count(*)::int n from public.notificaciones where para = $1 and titulo like '%garantía%'", [dueno]))[0].n === 1, '🔔 le avisamos al taller');
    ok((await su('select public.garantia_reclamar($1, $2) r', [g.token, 'otra vez']))[0].r.ok === false, '🔒 no deja un 2º reclamo abierto');

    // Taller: Hoy avisa → resolver
    await ir('hoy');
    ok(/usó su garantía/.test(await p.locator('#hGar').innerText().catch(() => '')), '📅 Hoy: "1 cliente usó su garantía"');
    await ir('mas/garantias');
    ok(/La usaron/.test(await p.evaluate(() => [...document.querySelectorAll('.cfx-hm-zona')].map((e) => e.innerText).join(' '))), '🔔 lista: "La usaron" arriba');
    ok(await sinScroll(), 'sin scroll horizontal a 320 px (lista)');
    await t.foto('g59h_lista');
    await p.evaluate(() => document.querySelector('[data-ga]').click()); await p.waitForTimeout(1500);
    await toca('dialog[open] #gaOk'); await p.waitForTimeout(800);
    await p.fill('dialog[open] #ptx', 'Ajustamos el cambio'); await p.click('dialog[open] #ptok'); await p.waitForTimeout(2000);
    g = (await su('select * from public.garantias'))[0];
    ok(g.reclamo === 'resuelto' && g.respuesta === 'Ajustamos el cambio', '✅ Lo arreglé: reclamo resuelto');
    await q.reload(); await q.waitForTimeout(3500);
    ok(/Listo/.test(await q.locator('#cRec').innerText()) && /Ajustamos/.test(await q.locator('#cRec').innerText()), '📱 /g/: "✅ Listo" con la respuesta');

    // Por vencer → 📲 Avisar
    await su("update public.garantias set hasta = (now() at time zone 'America/Santiago')::date + 5");
    await ir('mas/garantias');
    const av = p.locator('[data-ga] a', { hasText: 'Avisar' });
    ok(await av.count() === 1 && /vence/.test(decodeURIComponent(await av.getAttribute('href'))), '⏳ por vencer: 📲 Avisar con WhatsApp');
    // Vencida → no se puede usar
    await su("update public.garantias set hasta = (now() at time zone 'America/Santiago')::date - 1, reclamo = ''");
    ok((await su('select public.garantia_reclamar($1, $2) r', [g.token, 'se rompió']))[0].r.ok === false, '⌛ vencida: no se puede usar');

    // Bici usada vendida → garantía al comprador
    await su("insert into public.cfx_modulos_negocio (negocio, modulo, hasta) values ($1, 'certificadas', now() + interval '30 days')", [dueno]);
    await su("insert into public.bicis_usadas (taller_id, titulo, precio, garantia, estado) values ($1, 'Scott Aspect 940', 350000, 3, 'publicada')", [tid]);
    await ir('mas/usadas');
    await p.evaluate(() => document.querySelector('[data-u]').click()); await p.waitForTimeout(1500);
    await toca('dialog[open] #uV'); await p.waitForTimeout(800);
    await p.locator('dialog[open] [data-si]').last().click().catch(() => {}); await p.waitForTimeout(2500);
    ok(/Dar garantía/.test(await dialogo()) && await p.inputValue('dialog[open] #gaB') === 'Scott Aspect 940' && await p.inputValue('dialog[open] #gaQ') === 'bici', '🏷️ Se vendió → ofrece la garantía de la bici (3 meses)');
    await p.fill('dialog[open] #gaN', 'Marta'); await toca('dialog[open] #gaG'); await p.waitForTimeout(2000);
    ok((await su("select count(*)::int n from public.garantias where cubre = 'bici' and meses = 3 and usada_id is not null"))[0].n === 1, '💾 garantía de la bici usada guardada');

    // Sin módulo
    await su("delete from public.cfx_modulos_negocio where modulo = 'garantias'");
    ok((await su('select public.garantia_ver($1) r', [g.token]))[0].r === null, '🔒 sin módulo: el link /g/ ya no muestra');
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); await t.foto('g59h_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
