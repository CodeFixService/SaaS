// G104 a · 💰 Billetera: 3 módulos más → 📤 cuentas por pagar · 💵 cierre de caja · 🔔 aviso de vencimiento automático.
// FALLA con el código viejo (sin cpp_*, cierre_* ni avisar_vencimientos). Uso: node g104a.js   (ANCHO=320 opcional)
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  execSync(__dirname + '/base.sh /home/user/emprendedor p_g104a', { stdio: 'ignore' });
  const t = await abrir('/home/user/emprendedor', 'p_g104a'); const p = t.page, su = t.sim.su;
  try {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123'); const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()');
    const neg = (await c.query("select public.crear_negocio('Almacén Ana','almacen',true) ->> 'id' as id")).rows[0].id;
    await c.query("select public.crear_cliente('Juan Pérez', '', '+56912345678', null, null, null, '1234', 90000, true, true) r");
    const mm = (await c.query('select public.mis_modulos() m')).rows[0].m;
    ok(mm.cuentas_pagar === true && mm.cierre_caja === true && mm.aviso_vence === true && mm.acuerdo === true, '🧩 7 módulos en Billetera (3 nuevos) ' + JSON.stringify(mm));
    c.release();
    const cliId = (await su('select id from public.clientes limit 1'))[0].id;
    await p.goto(t.base + '/#ingresar'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'dueno@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(p);
    // 🧩 Más muestra los 3 y la tienda los vende
    await p.goto(t.base + '/app/#mas'); await p.waitForTimeout(1800); await t.sinModales(p);
    const mas = await p.locator('main').innerText();
    ok(/Cuentas por pagar/.test(mas) && /Cierre de caja/.test(mas) && /Aviso de vencimiento/.test(mas), '📋 Más → los 3 módulos nuevos');
    await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
    await p.goto(t.base + '/app/#modulos'); await p.reload(); await p.waitForTimeout(2200); await t.sinModales(p);
    const tienda = await p.locator('main').innerText();
    ok(/Cuentas por pagar/.test(tienda) && /Cierre de caja/.test(tienda) && /Aviso de vencimiento automático/.test(tienda), '🧩 tienda con los 3 módulos nuevos');
    await t.foto('g104a-tienda'); ok(await t.anchoOk(p), 'ancho ok tienda');
    await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'false') where clave = 'modulos_venta'");
    // 📤 Cuentas por pagar
    await p.goto(t.base + '/app/#pagar'); await p.reload(); await p.waitForTimeout(1800); await t.sinModales(p);
    await p.click('#cpNuevo'); await p.waitForTimeout(600);
    await p.fill('#cpProv', 'Distribuidora Sur'); await p.fill('#cpMonto', '120000');
    const manana = (await su("select to_char(current_date + 1, 'YYYY-MM-DD') d"))[0].d;
    await p.fill('#cpVence', manana);
    await p.click('.dialogo button:has-text("Guardar")'); await p.waitForTimeout(1500);
    let cp = (await su('select * from public.cuentas_pagar where negocio = $1', [neg]))[0];
    ok(cp && cp.monto === 120000 && cp.estado === 'pendiente', '📤 cuenta por pagar guardada ($120.000)');
    ok(/120\.000/.test(await p.locator('#cpTotal').innerText()), '📤 total adeudado en pantalla');
    await t.foto('g104a-pagar'); ok(await t.anchoOk(p), 'ancho ok cuentas por pagar');
    await p.goto(t.base + '/app/#inicio'); await p.reload(); await p.waitForTimeout(2500); await t.sinModales(p);
    ok(/1 cuenta por pagar vence pronto/.test(await p.locator('main').innerText()), '🔔 aviso en el inicio: vence pronto');
    await p.goto(t.base + '/app/#pagar'); await p.reload(); await p.waitForTimeout(1800); await t.sinModales(p);
    await p.click('.lista button:has-text("Pagar")'); await p.waitForTimeout(600);
    await p.click('.dialogo button:has-text("Transferencia")'); await p.waitForTimeout(1500);
    cp = (await su('select * from public.cuentas_pagar where negocio = $1', [neg]))[0];
    const gasto = (await su("select * from public.caja where negocio = $1 and categoria = 'Proveedores'", [neg]))[0];
    ok(cp.estado === 'pagada' && gasto && gasto.monto === 120000 && gasto.tipo === 'gasto' && gasto.medio === 'transferencia', '✅ pagada → gasto de $120.000 en la caja');
    let rech = false; try { await su("select public.cpp_pagar($1, 'efectivo') from (select set_config('request.jwt.claim.sub', $2, true)) x", [cp.id, u.id]); } catch (e) { rech = /ya está pagada/.test(e.message); }
    ok(rech, '🔒 no se puede pagar 2 veces');
    // 💵 Cierre de caja: inicial 20.000 + venta 85.000 + abono 30.000 − gasto 15.000 = 120.000; contado 118.000 → faltan 2.000
    await su("insert into public.caja (id, negocio, tipo, monto, categoria, medio) values (gen_random_uuid(), $1, 'ingreso', 85000, 'Ventas', 'efectivo'), (gen_random_uuid(), $1, 'gasto', 15000, 'Mercadería', 'efectivo'), (gen_random_uuid(), $1, 'ingreso', 40000, 'Ventas', 'tarjeta')", [neg]);
    await su("insert into public.movimientos (id, negocio, cliente, tipo, signo, monto, medio) values (gen_random_uuid(), $1, $2, 'abono', -1, 30000, 'efectivo')", [neg, cliId]);
    await p.goto(t.base + '/app/#cierre'); await p.reload(); await p.waitForTimeout(2000); await t.sinModales(p);
    await p.fill('#ccIni', '20000'); await p.fill('#ccCont', '118000'); await p.waitForTimeout(300);
    ok(/120\.000/.test(await p.locator('#ccEsp').innerText()), '💵 debería haber $120.000 (sin contar la tarjeta)');
    ok(/Faltan \$?2\.000/.test(await p.locator('#ccDif').innerText()), '⬇️ en vivo: faltan $2.000');
    await t.foto('g104a-cierre'); ok(await t.anchoOk(p), 'ancho ok cierre');
    await p.click('#ccGuardar'); await p.waitForTimeout(1500);
    const ci = (await su('select * from public.cierres_caja where negocio = $1', [neg]))[0];
    ok(ci && ci.esperado === 120000 && ci.contado === 118000 && ci.diferencia === -2000, '🔒 servidor calcula el esperado y guarda −2.000');
    // 🔔 Aviso de vencimiento: cliente con avisos activos y vence mañana
    await su("update public.clientes set saldo = 60000, prox_venc = current_date + 1, aviso_auto = null where id = $1", [cliId]);
    await su("insert into public.push_subs (endpoint, p256dh, auth, cliente) values ('https://push.x/1', 'k', 'a', $1)", [cliId]);
    const permitido = (await su('select ok from privado.cobro_permitido($1)', [cliId]))[0].ok;
    const k = (await su('select privado.avisar_vencimientos() k'))[0].k;
    const pushes = (await su("select count(*)::int n from public.cola_push where cliente = $1 and titulo like '%vence mañana%'", [cliId]))[0].n;
    const recs = (await su("select count(*)::int n from public.recordatorios where cliente = $1 and tono = 'auto'", [cliId]))[0].n;
    if (permitido) ok(k === 1 && pushes === 1 && recs === 1, '🔔 aviso automático al cliente (vence mañana) y cuenta como recordatorio');
    else ok(k === 0 && pushes === 0, '⚖️ fuera de horario legal: no se envía (' + k + ')');
    const k2 = (await su('select privado.avisar_vencimientos() k'))[0].k;
    ok(k2 === 0, '🔁 el mismo día no se repite');
    await p.goto(t.base + '/app/#avisovence'); await p.reload(); await p.waitForTimeout(2000); await t.sinModales(p);
    ok(/1\/1/.test(await p.locator('#avCon').innerText()), '🔔 pantalla: 1 de 1 clientes con avisos');
    await t.foto('g104a-aviso'); ok(await t.anchoOk(p), 'ancho ok aviso');
    // 🔒 módulo apagado en la app → el servidor rechaza
    await su("insert into public.cfx_config (clave, valor) values ('modulos', '{\"cuentas_pagar\": false, \"cierre_caja\": false}') on conflict (clave) do update set valor = coalesce(public.cfx_config.valor, '{}') || '{\"cuentas_pagar\": false, \"cierre_caja\": false}'");
    rech = false; try { await su("select public.cpp_guardar(null, 'X proveedor', '', 1000, current_date) from (select set_config('request.jwt.claim.sub', $1, true)) x", [u.id]); } catch (e) { rech = /módulo/.test(e.message); }
    ok(rech, '🔒 servidor: módulo apagado → no guarda cuentas por pagar');
    rech = false; try { await su("select public.cierre_guardar(current_date, 0, 1000, '') from (select set_config('request.jwt.claim.sub', $1, true)) x", [u.id]); } catch (e) { rech = /módulo/.test(e.message); }
    ok(rech, '🔒 servidor: módulo apagado → no cierra caja');
    await p.goto(t.base + '/app/#cierre'); await p.reload(); await p.waitForTimeout(2000); await t.sinModales(p);
    ok(/Ver el módulo/.test(await p.locator('main').innerText()), '🧩 sin módulo: explica y ofrece verlo');
    await p.emulateMedia({ colorScheme: 'dark' }); await p.goto(t.base + '/app/#pagar'); await p.waitForTimeout(1500); await t.foto('g104a-oscuro');
    ok(await t.anchoOk(p), 'ancho ok oscuro');
  } catch (e) { ok(false, e.message); }
  await t.cerrar(); console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
