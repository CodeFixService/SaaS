// G65 · 🏭 BiciTaller de fábrica: el taller nuevo ya trae los servicios más pedidos (FREE 40), la bici se elige de una lista
// de marcas/modelos, la nota tiene frases de un toque y el repuesto elegido pone su precio.
// FALLA con el código viejo (taller nuevo sin servicios, sin taller_servicios_fabrica, sin fabBicis ni .fab-notas).
// Uso: ./base.sh /home/user/taller p_g65 && ANCHO=320 node g65_fabrica.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g65');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const toca = async (sel, pg) => { pg = pg || p; await pg.evaluate((x) => document.querySelector(x).scrollIntoView({ block: 'center' }), sel); await pg.waitForTimeout(300); await pg.click(sel); };
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    const sv = await su("select nombre, precio, adicional from public.servicios order by orden");
    ok(sv.length >= 20 && sv[0].nombre === 'Mantención básica' && sv.some((s) => s.adicional), '🏭 taller nuevo ya trae ' + sv.length + ' servicios de fábrica (con adicionales)');
    const lim = (await su("select limites ->> 'servicios' l, beneficios::text b from public.planes where codigo = 'taller_free'"))[0];
    ok(lim.l === '40' && /40 servicios/.test(lim.b), 'FREE: 40 servicios (G39 opera completo)');
    await su("delete from public.servicios where nombre in ('Ajuste de frenos', 'Centrado de rueda')");
    ok(await como('taller@x.cl', 'public.taller_servicios_fabrica()') === 2, '✨ el dueño recupera solo los 2 que borró');
    ok(await como('taller@x.cl', 'public.taller_servicios_fabrica()') === 0, 'repetir no duplica');
    const slug = (await su('select slug from public.talleres'))[0].slug;
    const hoy = (await su("select (now() at time zone 'America/Santiago')::date::text d"))[0].d;
    await como('taller@x.cl', "public.taller_reserva_manual($2::date, '10:00', null, 'Pedro Pérez', '+56911112222', 'Trek Marlin 5', '', true)", [hoy]);
    await su("update public.reservas set estado = 'recibida'");
    const id = (await su("select id from public.reservas where nombre = 'Pedro Pérez'"))[0].id;

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();

    // 📦 Orden: repuesto de la lista → precio sugerido
    await toca('#hTablero [data-tj="' + id + '"] b'); await p.waitForTimeout(2000);
    await toca('#dAddR'); await p.waitForTimeout(300);
    const ins = p.locator('#dItems [data-k=nombre]').last();
    const lst = await ins.getAttribute('list');  // G59d: con 📦 stock la lista es stRep (mis repuestos + los de fábrica)
    ok(/^(fabRep|stRep)$/.test(lst) && await p.locator('#' + lst + ' option[value="Cadena 11 velocidades"]').count() === 1, '📦 el ítem tiene la lista de repuestos (' + lst + ')');
    await ins.fill('Cadena 11 velocidades'); await p.waitForTimeout(300);
    ok(await p.locator('#dItems [data-k=precio]').last().inputValue() === '25000', 'elegir "Cadena 11 velocidades" pone $25.000 (editable)');
    await t.foto('g65_orden');
    await p.keyboard.press('Escape'); await p.waitForTimeout(600); await t.sinModales();

    // 🚲 Reserva manual: bici de la lista + notas de un toque
    await p.goto(t.base + '/taller/#agenda'); await p.waitForTimeout(3000); await t.sinModales();
    await toca('#agNueva'); await p.waitForTimeout(800);
    ok(await p.locator('dialog[open] #mB[list=fabBicis]').count() === 1 && await p.locator('#fabBicis option[value="Trek Marlin 5"]').count() === 1, '🚲 bici: lista de marcas y modelos');
    ok(await p.locator('#fabBicis option').count() > 200, 'más de 200 bicis para elegir (' + await p.locator('#fabBicis option').count() + ')');
    await p.click('dialog[open] .fab-notas .chip:has-text("Frena poco")'); await p.click('dialog[open] .fab-notas .chip:has-text("Pinchazo")');
    ok(await p.locator('dialog[open] #mO').inputValue() === 'Frena poco, Pinchazo', '📝 notas de un toque se suman');
    ok(await p.locator('dialog[open]').count() === 1, 'tocar una nota no cierra la ventana');
    await t.foto('g65_reserva');
    const ancho = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    ok(ancho, 'sin scroll horizontal a 320 px');
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);

    // Más → Servicios
    await p.goto(t.base + '/taller/#mas/servicios'); await p.waitForTimeout(3000); await t.sinModales();
    const txt = await p.evaluate(() => [...document.querySelectorAll('#sLista, .pill')].map((x) => x.innerText).join(' | ') + ' #' + location.hash);
    ok(await p.locator('#sTipicos').count() === 1 && /23 de 40/.test(txt), '🛠️ Servicios: "✨ Servicios de fábrica" y "23 de 40" (G95: parte en Free) (' + (txt.match(/\d+ de \d+/) || [""])[0] + ')');
    await t.foto('g65_servicios');

    // 👤 Cliente en /t/
    const c = await t.nuevo(); const cp = c.page;
    await cp.goto(t.base + '/t/?s=' + slug); await cp.waitForTimeout(3000);
    ok(await cp.locator('#fBici[list=fabBicis]').count() === 1 && await cp.locator('#fabBicis option').count() > 200, '👤 el cliente elige su bici de la lista');
    ok(await cp.locator('#fNota + .fab-notas .chip').count() === 10, '👤 el cliente tiene las 10 frases de un toque');
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); await t.foto('g65_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
