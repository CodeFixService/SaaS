// G91 d · 🚲 BiciTaller AGENDA (G87 F): sábado y domingo con horario, intervalo, bicis a la vez y máximo del día propios (separados de
// lunes a viernes) + ⛔ Días cerrados (uno o un rango) en Más → Horario. FALLA con el código viejo (no existen data-finde, #hCerrar, hd.bloque).
// Uso: ./base.sh /home/user/taller p_g91d && ANCHO=320 node g91d_agenda.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g91d');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const toca = async (sel, pg) => { pg = pg || p; await pg.evaluate((x) => document.querySelector(x).scrollIntoView({ block: 'center' }), sel); await pg.waitForTimeout(300); await pg.click(sel); };
  const horas = async (d) => (await su('select array_agg(h) a from public.horas_libres((select id from public.talleres), $1::date, 30) h', [d]))[0].a || [];
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    await su("update public.talleres set dias = '{1,2,3,4,5,6}', abre = '10:00', cierra = '18:00', bloque_min = 30, cupos = 2, max_dia = 0, horarios = '{}', colacion_desde = null, colacion_hasta = null");
    const sab = (await su("select (d + ((6 - extract(dow from d)::int + 7) % 7) + 7)::text s from (select (now() at time zone 'America/Santiago')::date d) x"))[0].s;
    const lun = (await su("select ($1::date + 2)::text s", [sab]))[0].s;
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await p.evaluate(() => { location.hash = 'mas/horario'; }); await p.waitForTimeout(2500);
    ok(await p.locator('[data-finde="6"]:visible').count() === 1 && await p.locator('[data-finde="0"]:visible').count() === 1, '🗓️ Sábado y Domingo van aparte de lunes a viernes');
    const S = '[data-finde="6"]:visible ';
    await p.fill(S + '[data-a="6"]', '10:00'); await p.fill(S + '[data-c="6"]', '14:00');
    await p.selectOption(S + '[data-fb="6"]', '60'); await p.fill(S + '[data-fu="6"]', '1'); await p.fill(S + '[data-fm="6"]', '2');
    await t.foto('g91d_horario');
    await p.locator('#hGuardar:visible').first().click(); await p.waitForTimeout(2500);
    const h6 = (await su("select horarios -> '6' h from public.talleres"))[0].h || {};
    ok(h6.abre === '10:00' && h6.cierra === '14:00' && h6.bloque === 60 && h6.cupos === 1 && h6.max === 2, '💾 sábado guarda 10-14, cada 60 min, 1 a la vez, máx 2 (' + JSON.stringify(h6) + ')');
    let hs = await horas(sab), hl = await horas(lun);
    ok(hs.join(',') === '10:00,11:00,12:00,13:00', '⏰ sábado: horas cada 60 min (' + hs.join(',') + ')');
    ok(hl.length === 16 && hl[1] === '10:30', 'lunes sigue cada 30 min hasta las 18 (' + hl.length + ')');
    for (const h of ['10:00', '12:00']) await su(`select public.taller_reserva_manual($1::date, $2, null, 'Cliente ' || $2, '+56911112222', '', '', false)
      from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = 'taller@x.cl'), true)) x`, [sab, h]);
    hs = await horas(sab);
    ok(hs.length === 0, '🚫 sábado con 2 reservas = lleno (máximo del día 2)');
    let e = ''; try { await su(`select public.taller_guardar('{"horarios": {"6": {"abre": "10:00", "cierra": "14:00", "cupos": 99}}}') from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = 'taller@x.cl'), true)) x`); } catch (x) { e = x.message; }
    ok(/Revisa sábado/.test(e), '🔒 la base no acepta valores fuera de rango (' + e + ')');

    // ⛔ Días cerrados (rango)
    await p.fill('#hCd1:visible', lun); await p.fill('#hCd2:visible', (await su("select ($1::date + 2)::text s", [lun]))[0].s); await p.fill('#hCm:visible', 'Vacaciones');
    await p.locator('#hCerrar:visible').first().click(); await p.waitForTimeout(2000);
    ok((await su("select count(*)::int n from public.bloqueos where desde is null"))[0].n === 3, '⛔ cerró 3 días seguidos');
    ok((await horas(lun)).length === 0, 'ese lunes ya no tiene horas');
    ok(await p.locator('#hCerr:visible li [data-abrir]').count() === 3, 'la lista muestra los 3 días con ✅ Abrir');
    await p.evaluate(() => [...document.querySelectorAll('#hCerr')].pop().scrollIntoView({ block: 'center' })); await t.foto('g91d_cerrados');
    await p.locator('#hCerr:visible [data-abrir]').first().click(); await p.waitForTimeout(1500);
    ok((await horas(lun)).length === 16, '✅ Abrir devuelve las horas del lunes');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin scroll horizontal a 320 px');
  } catch (x) { f++; console.log('✗ ' + x.message.split('\n')[0]); await t.foto('g91d_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
