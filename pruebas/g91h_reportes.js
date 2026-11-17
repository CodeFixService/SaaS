// G91 h · 🚲 BiciTaller 📊 Reportes (Premium, en Más → Estadísticas): 🧑‍🔧 por mecánico (trabajos, ingresos, horas de recibida a lista),
// 💵 caja del mes (órdenes/mostrador/medios), 🔩 lo más vendido y 📥 Descargar reporte (CSV que abre Excel). FALLA con el código viejo.
// Uso: ./base.sh /home/user/taller p_g91h && ANCHO=320 node g91h_reportes.js
const { abrir } = require('./h');
const fs = require('fs');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g91h');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const como = async (expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = 'taller@x.cl'), true)) x", args || []))[0].r;
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su("update public.perfiles set terminos_at = now()").catch(() => {});
    const hoy = (await su("select (now() at time zone 'America/Santiago')::date::text d"))[0].d;
    await como("public.taller_reserva_manual($1::date, '10:00', null, 'Pedro', '+56911112222', 'Trek', '', true)", [hoy]);
    const ana = (await su("select id from auth.users where email = 'taller@x.cl'"))[0].id;
    await su(`update public.reservas set estado = 'completada', completada_at = now(), mecanico_id = $1, total = 30000,
      items = '[{"nombre":"Cadena 11v","cant":1,"precio":20000},{"nombre":"Ajuste","cant":1,"precio":10000}]',
      historial = jsonb_build_array(jsonb_build_object('estado','recibida','at', now() - interval '5 hours'), jsonb_build_object('estado','lista','at', now() - interval '2 hours'))`, [ana]);
    const rid = (await su('select id from public.reservas'))[0].id;
    await su("insert into public.caja (taller_id, fecha, medio, total, items, nombre, reserva_id) select taller_id, $2::date, 'tarjeta', 30000, items, nombre, id from public.reservas where id = $1", [rid, hoy]);
    await como(`public.taller_caja_vender('[{"nombre":"Cadena 11v","cant":2,"precio":20000}]', 'efectivo', 'María')`);
    await su("update public.caja set boleta = '777' where reserva_id is null");

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await p.evaluate(() => { location.hash = 'mas/stats'; }); await p.waitForTimeout(3000);
    const txt = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
    ok(/Por mecánico/.test(txt) && /Ana 1 trabajo · \$30\.000 · (⏱️ )?3 h de recibida a lista/.test(txt), '🧑‍🔧 Ana: 1 trabajo, $30.000, 3 h de recibida a lista');
    ok(/Caja de este mes/.test(txt) && /Total \$70\.000 en 2 cobros/.test(txt), '💵 caja del mes: $70.000 en 2 cobros');
    ok(/Lo más vendido/.test(txt) && /Cadena 11v/.test(txt), '🔩 lo más vendido: Cadena 11v (orden + mostrador)');
    await p.evaluate(() => [...document.querySelectorAll('#rpB')].pop().scrollIntoView({ block: 'center' })); await t.foto('g91h_reportes');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('#rpB:visible').click()]);
    const csv = fs.readFileSync(await dl.path(), 'utf8');
    ok(csv.charCodeAt(0) === 0xfeff && /Fecha;Hora;Tipo;Cliente/.test(csv) && /;Orden;Pedro;Trek;Ana;Cadena 11v, Ajuste;Tarjeta;30000;/.test(csv) && /;Mostrador;María;;;Cadena 11v x2;Efectivo;40000;777/.test(csv),
      '📥 CSV para Excel con las 2 filas (orden y mostrador con boleta 777)');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin scroll horizontal a 320 px');
    await su("update public.talleres set premium_hasta = now() - interval '1 day'");
    let e = ''; try { await como("public.taller_reporte(current_date - 30, current_date)"); } catch (x) { e = x.message; }
    ok(/Premium/.test(e), '🔒 sin Premium no descarga (' + e + ')');
  } catch (x) { f++; console.log('✗ ' + x.message.split('\n')[0]); await t.foto('g91h_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
