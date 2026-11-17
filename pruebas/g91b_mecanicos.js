// G91 b · 🚲 BiciTaller 🧑‍🔧 Carga por mecánico: en el tablero, un botón por mecánico con cuántas bicis tiene; tocar filtra.
// FALLA con el código viejo (no existe #hMecs).
// Uso: ./base.sh /home/user/taller p_g91b && ANCHO=320 node g91b_mecanicos.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g91b');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const toca = async (sel, pg) => { pg = pg || p; await pg.evaluate((x) => document.querySelector(x).scrollIntoView({ block: 'center' }), sel); await pg.waitForTimeout(300); await pg.click(sel); };
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    const tid = (await su("select id from public.talleres"))[0].id;
    await t.sim.crearUsuario('juan@x.cl', 'clave123', { rol: 'cliente', taller: tid, nombre: 'Juan' });
    await su("update public.perfiles set rol = 'equipo', taller_id = $1, nombre = 'Juan' where email = 'juan@x.cl'", [tid]);
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    const hoy = (await su("select (now() at time zone 'America/Santiago')::date::text d"))[0].d;
    for (const n of ['Pedro', 'María', 'Luis']) await su(`select public.taller_reserva_manual($1::date, '10:00', null, $2, '+56911112222', 'Trek', '', true)
      from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = 'taller@x.cl'), true)) x`, [hoy, n]);
    await su("update public.reservas set estado = 'recibida'");
    await su("update public.reservas set mecanico_id = (select id from public.perfiles where email = 'juan@x.cl') where nombre in ('Pedro', 'María')");

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    const txt = (await p.locator("#hMecs").innerText()).replace(/\s+/g, " ");
    ok(/Todos · 3/.test(txt) && /Juan · 2/.test(txt) && /Sin asignar · 1/.test(txt), '🧑‍🔧 carga: Todos 3 · Juan 2 · Sin asignar 1 (' + txt.replace(/\n/g, ' ') + ')');
    const juan = (await su("select id from public.perfiles where email = 'juan@x.cl'"))[0].id;
    await toca('#hMecs [data-mec="' + juan + '"]'); await p.waitForTimeout(500);
    ok(await p.locator('#hTablero .tj').count() === 2, 'tocar Juan deja solo sus 2 bicis');
    await t.foto('g91b_tablero');
    await p.reload(); await p.waitForTimeout(3500); await t.sinModales();
    ok(await p.locator('#hTablero .tj').count() === 2 && await p.locator('#hMecs .on').innerText().then((x) => /Juan/.test(x)), 'el filtro se recuerda al volver');
    await toca('#hMecs [data-mec="sin"]'); await p.waitForTimeout(400);
    ok(await p.locator('#hTablero .tj').count() === 1, 'Sin asignar = 1');
    await toca('#hMecs [data-mec=""]'); await p.waitForTimeout(400);
    ok(await p.locator('#hTablero .tj').count() === 3, 'Todos = 3');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin scroll horizontal a 320 px');
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); await t.foto('g91b_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
