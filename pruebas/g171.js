// G171 · 💰 Billetera: 💵 cierre de caja con 💸 "lo que sacaste" (banco/transferencia), lo digital aparte y ❓ cómo se usa.
// FALLA con el código viejo (sin #ccRet ni retiro). Uso: node g171.js   (ANCHO=320 opcional)
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  execSync(__dirname + '/base.sh /home/user/emprendedor p_g171', { stdio: 'ignore' });
  const t = await abrir('/home/user/emprendedor', 'p_g171'); const p = t.page, su = t.sim.su;
  try {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123'); const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()');
    const neg = (await c.query("select public.crear_negocio('Almacén Ana','almacen',true) ->> 'id' as id")).rows[0].id;
    c.release();
    await p.goto(t.base + '/#ingresar'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'dueno@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(2500);
    // sin efectivo: aviso + ayuda
    await su("insert into public.caja (id, negocio, tipo, monto, categoria, medio) values (gen_random_uuid(), $1, 'ingreso', 40000, 'Ventas', 'transferencia'), (gen_random_uuid(), $1, 'gasto', 5000, 'Mercadería', 'tarjeta')", [neg]);
    await p.goto(t.base + '/app/#cierre'); await p.reload(); await p.waitForTimeout(2000); await t.sinModales(p);
    ok(await p.locator('#ccComo').count() === 1, '❓ ¿Cómo se usa? (contraíble)');
    ok(await p.locator('#ccSinEf').count() === 1, '📲 aviso: hoy no hubo efectivo');
    const dg = await p.locator('#ccDigital').innerText(); ok(/40\.000/.test(dg) && /5\.000/.test(dg) && /35\.000/.test(dg), '📲 digital aparte: entró 40.000, salió 5.000, neto 35.000');
    // con efectivo: 10.000 inicial + 50.000 venta = 60.000; contado 60.000; saqué todo
    await su("insert into public.caja (id, negocio, tipo, monto, categoria, medio) values (gen_random_uuid(), $1, 'ingreso', 50000, 'Ventas', 'efectivo')", [neg]);
    await p.reload(); await p.waitForTimeout(2000); await t.sinModales(p);
    await p.fill('#ccIni', '10000'); await p.fill('#ccCont', '60000'); await p.click('#ccTodo'); await p.waitForTimeout(300);
    ok(await p.inputValue('#ccRet') === '60000', '💸 "Lo saqué todo" copia lo contado');
    ok(/\$?0\b/.test(await p.locator('#ccQueda').innerText()), 'queda $0 para mañana');
    await t.foto('g171-cierre'); ok(await t.anchoOk(p), 'ancho ok');
    await p.click('#ccGuardar'); await p.waitForTimeout(1500);
    const ci = (await su('select * from public.cierres_caja where negocio = $1', [neg]))[0];
    ok(ci && ci.diferencia === 0 && ci.retiro === 60000, '🔒 servidor guarda retiro 60.000 y cuadra');
    const bal = (await su("select count(*)::int n from public.caja where negocio = $1", [neg]))[0].n;
    ok(bal === 3, '✅ cerrar NO crea movimientos (balance intacto)');
    // día siguiente parte con contado − retiro
    await su("update public.cierres_caja set dia = dia - 1 where negocio = $1", [neg]);
    const sug = (await su("select (public.cierre_ver(current_date) ->> 'inicial_sugerido')::int s from (select set_config('request.jwt.claim.sub', $1, true)) x", [u.id]))[0].s;
    ok(sug === 0, 'mañana parte en $0 (lo sacó todo)');
    let rech = false; try { await su("select public.cierre_guardar(current_date, 0, 1000, '', 5000) from (select set_config('request.jwt.claim.sub', $1, true)) x", [u.id]); } catch (e) { rech = /más que lo que contaste/.test(e.message); }
    ok(rech, '🔒 no se puede sacar más de lo contado');
    const viejo = (await su("select (public.cierre_guardar(current_date, 0, 1000, '') ->> 'retiro')::int r from (select set_config('request.jwt.claim.sub', $1, true)) x", [u.id]))[0].r;
    ok(viejo === 0, '🛡️ app vieja (4 datos) sigue funcionando');
  } catch (e) { console.log('✗ ERROR', e.message); f++; }
  await t.cerrar(); console.log(f ? '❌ ' + f + ' fallas' : '✅ G171 OK'); process.exit(f ? 1 : 0);
})();
