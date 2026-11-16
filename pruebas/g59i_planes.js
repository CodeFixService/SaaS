// G59i · 🧩 BiciTaller módulo 🔁 Plan de mantención (el cliente paga al mes: N visitas incluidas + % de descuento al usarlo en la orden).
// Sin comprarlo (venta prendida): Más → 🔁 ofrece el módulo y la base no deja crear. Con él: ＋ Nuevo plan → ＋ Sumar cliente (💰 cobra 3 meses)
// → orden del mismo teléfono: ✅ Usar el plan (total −10%) → /r/ "Tu plan" → 2ª orden sin visitas → ↩️ Quitar → por vencer 📲 Avisar → /t/ "Lo quiero".
// FALLA con el código viejo (no existen planes_mant, taller_planes, Más → 🔁 ni #dPlan).
// Uso: ./base.sh /home/user/taller p_g59i && ANCHO=320 node g59i_planes.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g59i');
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
    await su("update public.reservas set items = $1::jsonb, total = 20000, estado = 'recibida' where id = $2", [JSON.stringify([{ nombre: 'Mantención completa', cant: 1, precio: 20000 }]), r.id]);
    const slug = (await su('select slug from public.talleres'))[0].slug;

    // Venta prendida y sin comprar
    await su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
    ok((await su("select 'plan_mant' = any (public.cfx_modulos_app()) x"))[0].x, '🧩 BiciTaller vende 🔁 Plan de mantención');
    ok((await como('taller@x.cl', 'public.taller_planes()')).bloqueado === true, '🔒 sin módulo: planes bloqueados');
    let err = ''; await como('taller@x.cl', "public.taller_plan_guardar('{\"nombre\": \"X\"}'::jsonb)").catch((e) => { err = e.message; });
    ok(/módulo/.test(err), '🔒 sin módulo la base no deja crear planes');

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await p.evaluate(() => { location.hash = 'mas/planes'; }); await p.waitForTimeout(2000);
    ok(await p.locator('[data-ofrecer="plan_mant"]').count() >= 1, '🔁 Más → Planes sin módulo: "🧩 Ver el módulo"');
    await toca('[data-ofrecer="plan_mant"]'); await p.waitForTimeout(1500);
    ok(/Usar el plan/i.test(await dialogo()), '▶️ abre la demo de 🔁');
    await cerrarDialogos();

    // Con el módulo: crear plan y sumar cliente (cobrar 3 meses)
    await su("insert into public.cfx_modulos_negocio (negocio, modulo, hasta) values ($1, 'plan_mant', now() + interval '30 days')", [dueno]);
    await ir('mas/planes');
    await toca('#plNuevo'); await p.waitForTimeout(1000);
    await p.fill('dialog[open] #plN', 'Rodador'); await p.fill('dialog[open] #plP', '15000'); await p.selectOption('dialog[open] #plD', '10'); await p.fill('dialog[open] #plI', 'Ajuste de cambios y frenos');
    ok(await sinScroll(), 'sin scroll horizontal a 320 px (nuevo plan)');
    await toca('dialog[open] #plG'); await p.waitForTimeout(2500);
    const pl = (await su('select * from public.planes_mant'))[0] || {};
    ok(pl.nombre === 'Rodador' && pl.precio === 15000 && pl.visitas === 1 && pl.descuento === 10, '💾 plan Rodador $15.000 · 1 visita · 10%');
    await toca('#soNuevo'); await p.waitForTimeout(1000);
    await p.fill('dialog[open] #soN', 'Pedro Pérez'); await p.fill('dialog[open] #soT', '+56911112222'); await p.fill('dialog[open] #soB', 'Trek Marlin 7');
    await p.selectOption('dialog[open] #soM', '3'); await p.selectOption('dialog[open] #soMe', 'transferencia');
    await toca('dialog[open] #soC'); await p.waitForTimeout(2500);
    const so = (await su('select *, hasta::text h from public.plan_socios'))[0] || {};
    const esp = (await su("select (($1::date - 1) + interval '3 months')::date::text x", [hoy]))[0].x;
    ok(so.h === esp && so.tel_norm === '56911112222', '💰 cobró 3 meses: pagado hasta ' + esp);
    ok((await su("select sum(monto)::int m from public.plan_cobros where medio = 'transferencia'"))[0].m === 45000, '💰 cobro $45.000 por transferencia');
    ok(/45\.000/.test(await p.evaluate(() => [...document.querySelectorAll('.cfx-hm-zona')].map((e) => e.innerText).join(' '))), '💰 "Cobrado este mes $45.000"');
    ok(await sinScroll(), 'sin scroll horizontal a 320 px (lista)');
    await t.foto('g59i_lista');
    err = ''; await como('taller@x.cl', "public.taller_socio_guardar(jsonb_build_object('plan', $2::text, 'nombre', 'Otro', 'telefono', '+56911112222'))", [pl.id]).catch((e) => { err = e.message; });
    ok(/ya tiene un plan/.test(err), '🔒 no duplica el plan del mismo teléfono');

    // En la orden: ✅ Usar el plan → 1 visita + 10%
    const abrirOrden = async (id) => { await ir('reservas'); await p.evaluate((x) => { const e = document.querySelector('[data-tj="' + x + '"], [data-r="' + x + '"]'); e.scrollIntoView(); e.click(); }, id); await p.waitForTimeout(2500); };
    await abrirOrden(r.id);
    ok(/quedan 1 de 1/.test(await p.locator('#dPlan').innerText().catch(() => '')), '🔁 la orden avisa: "tiene el plan Rodador: quedan 1 de 1"');
    await toca('#dPlanUsar'); await p.waitForTimeout(2500);
    let rr = (await su('select plan_desc, total from public.reservas where id = $1', [r.id]))[0];
    ok(rr.plan_desc === 10 && rr.total === 18000, '✅ Usar el plan: total $20.000 → $18.000');
    ok(/18\.000/.test(await p.locator('#dTotal').innerText()) && /usado en esta orden/.test(await p.locator('#dPlan').innerText()), '🧾 pantalla: total $18.000 y "usado en esta orden"');
    ok(await sinScroll(), 'sin scroll horizontal a 320 px (orden)');
    await toca('#dGuardar'); await p.waitForTimeout(2000);
    ok((await su('select total from public.reservas where id = $1', [r.id]))[0].total === 18000, '💾 guardar la orden mantiene el descuento');

    // 👤 Cliente: /r/ ve su plan y el descuento
    const q = await t.ctx.newPage();
    await q.goto(t.base + '/r/?t=' + r.token); await q.waitForTimeout(3500);
    ok(await q.locator('#cPlan').isVisible() && /quedan 0 de 1/.test(await q.locator('#planTxt').innerText()), '📱 /r/: "Tu plan: te quedan 0 de 1 visitas"');
    ok(/Descuento de tu plan/.test(await q.locator('#detalle').innerText()), '📱 /r/: línea "Descuento de tu plan −10%"');
    ok(await sinScroll(q), 'sin scroll horizontal a 320 px (/r/)');

    // 2ª orden el mismo mes: no quedan visitas
    await como('taller@x.cl', "public.taller_reserva_manual($2::date, '12:00', null, 'Pedro Pérez', '+56911112222', 'Trek Marlin 7', '', true)", [hoy]);
    const r2 = (await su("select id from public.reservas where hora = '12:00'"))[0].id;
    err = ''; await como('taller@x.cl', 'public.taller_plan_usar($2::uuid, true)', [r2]).catch((e) => { err = e.message; });
    ok(/ya usó sus 1 visitas/.test(err), '🔒 2ª orden: "ya usó sus visitas de este mes"');
    // ↩️ Quitar
    await abrirOrden(r.id);
    await toca('#dPlanQuitar'); await p.waitForTimeout(2500);
    rr = (await su('select plan_desc, total from public.reservas where id = $1', [r.id]))[0];
    ok(rr.plan_desc === 0 && rr.total === 20000 && (await su('select count(*)::int n from public.plan_usos'))[0].n === 0, '↩️ Quitar el plan: vuelve a $20.000 y devuelve la visita');

    // Por vencer → Hoy avisa + 📲 Avisar
    await su("update public.plan_socios set hasta = (now() at time zone 'America/Santiago')::date + 3");
    await ir('hoy');
    ok(/por vencer/.test(await p.locator('#hPlanes').innerText().catch(() => '')), '📅 Hoy: "1 plan de mantención por vencer"');
    await ir('mas/planes');
    const av = p.locator('[data-so] a', { hasText: 'Avisar' });
    ok(await av.count() === 1 && /renovamos/.test(decodeURIComponent(await av.getAttribute('href'))), '⏳ por vencer: 📲 Avisar para renovar');
    // Vencido → no se usa
    await su("update public.plan_socios set hasta = (now() at time zone 'America/Santiago')::date - 1");
    err = ''; await como('taller@x.cl', 'public.taller_plan_usar($2::uuid, true)', [r2]).catch((e) => { err = e.message; });
    ok(/venció/.test(err), '⌛ vencido: no se puede usar');

    // 🏪 Vitrina /t/: planes a la venta con "Lo quiero"
    await q.goto(t.base + '/t/?s=' + slug); await q.waitForTimeout(3500);
    const lq = q.locator('#planes a', { hasText: 'Lo quiero' });
    ok(await lq.count() === 1 && /Rodador/.test(decodeURIComponent(await lq.getAttribute('href'))), '🏪 /t/: "Planes de mantención" con 📲 Lo quiero');
    ok(await sinScroll(q), 'sin scroll horizontal a 320 px (/t/)');
    await t.foto('g59i_vitrina', q).catch(() => {});

    // Sin módulo
    await su("delete from public.cfx_modulos_negocio where modulo = 'plan_mant'");
    ok((await su('select public.planes_publicos($1) r', [tid]))[0].r.length === 0, '🔒 sin módulo: la vitrina ya no muestra planes');
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); await t.foto('g59i_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
