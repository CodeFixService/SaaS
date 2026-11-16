// G59g · 🧩 BiciTaller módulo 🚐 Mecánico a domicilio (reserva con dirección + recargo, ruta del día, "Voy en camino").
// Sin comprarlo (venta prendida): Más → 🚐 ofrece el módulo y la base no deja usarlo; /t/ no ofrece domicilio.
// Con él: ⚙️ Ofrecer a domicilio + recargo → /t/ "🏠 Que vengan a mi casa" → reserva con dirección (+ ítem 🚐) → /r/ la muestra
// → orden del taller → 🚐 A domicilio → Ruta del día (▲▼, Google Maps) → 🚐 Voy en camino (/r/ "¡Vamos en camino!") → Hoy avisa → quitar.
// FALLA con el código viejo (no existen domicilio_info, taller_ruta, Más → 🚐 ni #fDom).
// Uso: ./base.sh /home/user/taller p_g59g && ANCHO=320 node g59g_domicilio.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g59g');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const toca = async (sel, pg) => { pg = pg || p; await pg.evaluate((x) => document.querySelector(x).scrollIntoView({ block: 'center' }), sel); await pg.waitForTimeout(300); await pg.click(sel); };
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  const dialogo = () => p.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => d.innerText).join(' '));
  const cerrarDialogos = () => p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  const sinScroll = (pg) => (pg || p).evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const ir = async (h) => { await p.evaluate(() => { history.replaceState(null, '', '#hoy'); }); await p.reload(); await p.waitForTimeout(3500); await t.sinModales(); await p.evaluate((x) => { location.hash = x; }, h); await p.waitForTimeout(2000); };
  const B = () => 'dialog[open], .cfx-hm-zona';
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    await su("update public.talleres set premium_hasta = now() - interval '1 day', telefono = '+56955556666', direccion = 'Irarrázaval 100', comuna = 'Ñuñoa', reservas_online = true");
    const tid = (await su('select id, slug from public.talleres'))[0], slug = tid.slug;
    await su("insert into public.links_pago (taller_id, tipo, slot, monto, url, activo) values ($1, 'abono', 1, 5000, 'https://pago.x.cl/abono', true)", [tid.id]);
    const dueno = (await su("select id from auth.users where email = 'taller@x.cl'"))[0].id;
    const hoy = (await su("select (now() at time zone 'America/Santiago')::date::text d"))[0].d;
    await como('taller@x.cl', "public.taller_reserva_manual($2::date, '10:00', null, 'Pedro Pérez', '+56911112222', 'Trek Marlin 7', '', true)", [hoy]);
    const rid = (await su("select id from public.reservas where nombre = 'Pedro Pérez'"))[0].id;
    await su("update public.reservas set items = $1::jsonb, total = 18000 where id = $2", [JSON.stringify([{ nombre: 'Cadena 11v', cant: 1, precio: 18000 }]), rid]);

    // Venta prendida y sin comprar
    await su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
    ok((await su("select 'domicilio' = any (public.cfx_modulos_app()) x"))[0].x, '🧩 BiciTaller vende 🚐 domicilio');
    ok((await como('taller@x.cl', "public.taller_ruta($2::date)", [hoy])).bloqueado === true, '🔒 sin módulo: ruta bloqueada');
    let err = ''; await como('taller@x.cl', "public.taller_domicilio($2::uuid, '{\"direccion\":\"Av. Grecia 1234\"}')", [rid]).catch((e) => { err = e.message; });
    ok(/módulo/.test(err), '🔒 sin módulo la base no deja poner dirección');

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await p.evaluate(() => { location.hash = 'mas/domicilio'; }); await p.waitForTimeout(2000);
    ok(await p.locator('[data-ofrecer="domicilio"]').count() === 1, '🚐 Más → A domicilio sin módulo: "🧩 Ver el módulo"');
    await toca('[data-ofrecer="domicilio"]'); await p.waitForTimeout(1500);
    ok(/vamos en camino/i.test(await dialogo()), '▶️ abre la demo de 🚐');
    await cerrarDialogos();

    // Con el módulo: ⚙️ configurar
    await su("insert into public.cfx_modulos_negocio (negocio, modulo, hasta) values ($1, 'domicilio', now() + interval '30 days')", [dueno]);
    ok((await su('select public.domicilio_info($1) r', [tid.id]))[0].r === null, '🏪 con módulo pero sin prender: /t/ aún no ofrece');
    await ir('mas/domicilio');
    ok(await p.locator('#dmA').count() === 1, '⚙️ ve la configuración');
    await p.check('#dmA'); await p.fill('#dmR', '5000'); await p.fill('#dmZ', 'Ñuñoa y Providencia');
    ok(await sinScroll(), 'sin scroll horizontal a 320 px (ruta)');
    await toca('#dmG'); await p.waitForTimeout(2000);
    const cfg = (await su('select domicilio from public.talleres'))[0].domicilio;
    ok(cfg.activo === true && cfg.recargo === 5000 && /Providencia/.test(cfg.zona), '💾 domicilio prendido con recargo $5.000');

    // 👤 Cliente en /t/
    const q = await t.ctx.newPage();
    await q.goto(t.base + '/t/?s=' + slug); await q.waitForTimeout(3500);
    ok(await q.locator('#fDom').isVisible() && /\$5\.000/.test(await q.locator('#fDomTxt').innerText()), '🏠 /t/: "Que vengan a mi casa (+$5.000)"');
    await q.click('#servs [data-s=""]').catch(() => {}); await q.waitForTimeout(1500);
    await q.evaluate(() => document.querySelector('#horas [data-h]').scrollIntoView()); await q.click('#horas [data-h]'); await q.waitForTimeout(500);
    await q.fill('#fNom', 'Lucía Rojas'); await q.fill('#fTel', '+56933334444');
    await q.check('#fDomSi'); await q.waitForTimeout(300);
    ok(await q.locator('#fDir').isVisible(), '🏠 al marcar pide la dirección');
    ok(await sinScroll(q), 'sin scroll horizontal a 320 px (/t/)');
    await toca('#bReservar', q); await q.waitForTimeout(800);
    ok(/dirección/.test(await q.locator('#fErr').innerText()), '⚠️ sin dirección no deja reservar');
    await q.fill('#fDir', 'Av. Grecia 1234, depto 52'); await q.fill('#fCom', 'Ñuñoa'); await q.fill('#fRef', 'Portón verde');
    await toca('#bReservar', q); await q.waitForTimeout(4000);
    const rl = (await su("select * from public.reservas where nombre = 'Lucía Rojas'"))[0] || {};
    ok(rl.domicilio && rl.domicilio.direccion === 'Av. Grecia 1234, depto 52' && rl.domicilio.comuna === 'Ñuñoa', '💾 reserva con dirección');
    ok((rl.items || []).some((i) => /Visita a domicilio/.test(i.nombre) && i.precio === 5000) && rl.total === rl.items.reduce((s, i) => s + i.precio * i.cant, 0), '🚐 suma el ítem "Visita a domicilio" $5.000 al total');
    ok(/r\/\?t=/.test(q.url()) && await q.locator('#cDom').isVisible() && /Grecia 1234/.test(await q.locator('#cDom').innerText()), '📱 /r/: muestra la visita a domicilio');
    ok((await su("select count(*)::int n from public.notificaciones where para = $1 and titulo like '%domicilio%'", [dueno]))[0].n === 1, '🔔 le avisamos al taller');
    await su("update public.reservas set fecha = $1::date, hora = '15:00', estado = 'confirmada' where id = $2", [hoy, rl.id]);

    // Taller: orden → 🚐 A domicilio
    const abrirOrden = async (id) => { await ir('reservas'); await p.evaluate((x) => { const e = document.querySelector('[data-tj="' + x + '"], [data-r="' + x + '"]'); e.scrollIntoView(); e.click(); }, id); await p.waitForTimeout(2000); };
    await abrirOrden(rid);
    ok(await p.locator('#dDom').count() === 1, '🚐 la orden tiene el botón A domicilio');
    await toca('#dDom'); await p.waitForTimeout(1000);
    await p.fill('dialog[open] #doD', 'Los Leones 500'); await p.fill('dialog[open] #doC', 'Providencia');
    await toca('dialog[open] #doG'); await p.waitForTimeout(2500);
    let rp = (await su('select domicilio, items, total from public.reservas where id = $1', [rid]))[0];
    ok(rp.domicilio && rp.domicilio.direccion === 'Los Leones 500' && rp.total === 23000, '💾 orden a domicilio (+$5.000 → $23.000)');
    ok(/Los Leones 500/.test(await p.locator('#dDomTxt').innerText().catch(() => '')), '🏠 la orden muestra la dirección');
    await toca('#dDom'); await p.waitForTimeout(800); await toca('dialog[open] #doG'); await p.waitForTimeout(2000);
    ok((await su('select total from public.reservas where id = $1', [rid]))[0].total === 23000, '🔁 guardar de nuevo no duplica el recargo');

    // 🗺️ Ruta del día
    await ir('mas/domicilio');
    const lis = await p.locator('#rLista li').allInnerTexts();
    ok(lis.length === 2 && /Pedro/.test(lis[0]) && /Lucía/.test(lis[1]), '🗺️ ruta: 2 visitas por hora');
    const href = await p.locator('#rMaps').getAttribute('href');
    ok(/origin=Irarr/.test(decodeURIComponent(href)) && /waypoints=Los Leones/.test(decodeURIComponent(href)) && /destination=Av\. Grecia/.test(decodeURIComponent(href)), '🗺️ abre Google Maps con el taller → paradas en orden');
    await t.foto('g59g_ruta');
    await toca('[data-baja="0"]'); await p.waitForTimeout(2000);
    const lis2 = await p.locator('#rLista li').allInnerTexts();
    ok(/Lucía/.test(lis2[0]) && (await su("select domicilio ->> 'orden' o from public.reservas where id = $1", [rl.id]))[0].o === '1', '▼ cambia el orden de la ruta (queda guardado)');
    await p.evaluate(() => { window._ab = []; window.open = (u) => { window._ab.push(u); return null; }; });
    await toca('[data-cam="0"]'); await p.waitForTimeout(500);
    const ab = await p.evaluate(() => window._ab.join(' '));
    ok(/wa\.me\/56933334444/.test(ab) && /camino/.test(decodeURIComponent(ab)), '📲 Voy en camino abre WhatsApp al cliente');
    await p.waitForTimeout(1500);
    ok((await su("select domicilio ->> 'camino_at' c from public.reservas where id = $1", [rl.id]))[0].c, '🚐 queda marcado "en camino"');
    await q.goto(t.base + '/r/?t=' + rl.token); await q.waitForTimeout(3500);
    ok(await q.locator('#domCamino').isVisible(), '📱 /r/: "¡Vamos en camino!"');
    ok(await sinScroll(q), 'sin scroll horizontal a 320 px (/r/)');

    // Hoy avisa
    await ir('hoy');
    ok(/2 visitas a domicilio/.test(await p.locator('#hDom').innerText().catch(() => '')), '📅 Hoy: "2 visitas a domicilio hoy"');

    // Quitar el domicilio
    await abrirOrden(rid);
    await toca('#dDom'); await p.waitForTimeout(800); await toca('dialog[open] #doQ'); await p.waitForTimeout(800);
    await p.locator('dialog[open] [data-si]').last().click().catch(() => {}); await p.waitForTimeout(2000);
    rp = (await su('select domicilio, items, total from public.reservas where id = $1', [rid]))[0];
    ok(rp.domicilio === null && rp.total === 18000 && !rp.items.some((i) => /Visita/.test(i.nombre)), '🏪 Ya no es a domicilio: saca dirección y recargo');

    // Sin módulo
    await su("delete from public.cfx_modulos_negocio where modulo = 'domicilio'");
    ok((await su('select public.domicilio_info($1) r', [tid.id]))[0].r === null, '🔒 sin módulo: /t/ ya no ofrece domicilio');
    ok((await su("select public.reserva_domicilio($1, '{\"direccion\":\"Otra 123\"}') r", [rl.token]))[0].r.ok === false, '🔒 sin módulo: no se puede pedir visita');
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); await t.foto('g59g_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
