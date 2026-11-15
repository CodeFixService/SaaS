// G65 · 🏭 Barbería de fábrica: la barbería ya trae todos los cortes por categoría (Cortes, Barba, Combos, Niños, Color, Extras),
// FREE 40 servicios, "✨ Servicios de fábrica" trae de vuelta los borrados, y el módulo Productos tiene "✨ Productos típicos".
// FALLA con el código viejo (sin servicios de fábrica, sin servicios_fabrica/productos_fabrica, sin #bFabSer).
// Uso: (cd /home/user/Barberia/supabase/pruebas && ./correr.sh "-h /var/tmp/pgb -p 54329 -U postgres") && ANCHO=320 node g65_barberia.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/barberia', 'barberia_prueba');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  try {
    await su("create table if not exists auth.claves (email text primary key, pass text not null)");
    await su("alter table auth.users add column if not exists last_sign_in_at timestamptz");
    await su("insert into auth.claves select email, 'clave123' from auth.users on conflict do nothing");
    await su("update public.profiles set clave_temporal = false, tour_visto = true where true").catch(() => {});
    await su("delete from public.cfx_modulos_negocio");
    const bid = (await su("select barberia_id b from public.profiles where email = 'dueno@test.cl'"))[0].b;
    const dueno = (await su("select id from public.profiles where email = 'dueno@test.cl'"))[0].id;

    // Barbería nueva → ya viene con todo
    const nb = (await su("insert into public.barberias (codigo, nombre, owner_id) values ('fab65', 'Fábrica', (select id from auth.users where email = 'ana@test.cl')) returning id"))[0].id;
    const sv = await su('select nombre, categoria from public.servicios where barberia_id = $1 order by orden', [nb]);
    const cats = [...new Set(sv.map((s) => s.categoria))];
    ok(sv.length === 31 && ['Cortes', 'Barba', 'Combos', 'Niños', 'Color', 'Extras'].every((c) => cats.includes(c)), '🏭 barbería nueva: 31 servicios en 6 categorías');
    ok(['Skin fade', 'Taper fade', 'Mullet', 'Corte + barba', 'Afeitado clásico'].every((n) => sv.some((s) => s.nombre === n)), 'trae fade, taper, mullet, combo y afeitado');
    await su('delete from public.barberias where id = $1', [nb]);
    ok((await su("select free from public.planes where grupo = 'barberia' and clave = 'servicios'"))[0].free === 40, 'FREE: 40 servicios (G39 opera completo)');

    // ✨ De fábrica en una barbería que ya tenía los suyos: suma lo que falta sin duplicar
    const antes = +(await su('select count(*) n from public.servicios where barberia_id = $1', [bid]))[0].n;
    const n1 = await como('dueno@test.cl', 'public.servicios_fabrica()');
    const n2 = await como('dueno@test.cl', 'public.servicios_fabrica()');
    ok(n1 > 0 && n2 === 0, '✨ agrega ' + n1 + ' que faltaban (tenía ' + antes + ') y repetir no duplica');
    let e = ''; try { await como('carlos@test.cl', 'public.servicios_fabrica()'); } catch (x) { e = x.message; }
    ok(/dueño/.test(e), '🔒 el barbero no puede (' + e + ')');

    // 🛍️ Productos típicos (módulo)
    await su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
    e = ''; try { await como('dueno@test.cl', 'public.productos_fabrica()'); } catch (x) { e = x.message; }
    ok(/módulo/.test(e), '🔒 sin el módulo Productos no carga productos (' + e + ')');
    await su("select public.cfx_modulos_dar($1, 'productos', 30, 'pago')", [dueno]);
    const p1 = await como('dueno@test.cl', 'public.productos_fabrica()');
    ok(p1 === 15 && await como('dueno@test.cl', 'public.productos_fabrica()') === 0, '🛍️ 15 productos típicos (pomada, cera, aceite de barba…) sin duplicar');

    // Pantalla
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'dueno@test.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3500); await t.sinModales();
    await p.goto(t.base + '/equipo/#servicios'); await p.waitForTimeout(3000); await t.sinModales();
    ok(await p.locator('#bFabSer').count() === 1 && await p.locator('.serv:has-text("Skin fade")').count() === 1, '✂️ Servicios: "✨ Servicios de fábrica" y se ve Skin fade');
    await t.foto('g65_servicios');
    await p.locator('.serv:has-text("Skin fade") [data-ed]').click(); await p.waitForTimeout(800);
    ok(await p.locator('[data-c][list=catSer]').count() === 1 && await p.locator('#catSer option').count() === 6, 'categoría para elegir (6)');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin scroll horizontal a 320 px');
    await p.goto(t.base + '/equipo/#productos'); await p.waitForTimeout(3000); await t.sinModales();
    ok(await p.locator('#bPrFab').count() === 1 && await p.locator('#prZona li:has-text("Pomada mate")').count() === 1, '🛍️ Productos: "✨ Productos típicos" y la lista');
    await t.foto('g65_productos');
  } catch (x) { f++; console.log('✗ ' + x.message.split('\n')[0]); await t.foto('g65_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
