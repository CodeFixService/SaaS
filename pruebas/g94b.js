// G94 b · 💰 Billetera modular: 🧩 tienda en Más · 📝 acuerdo firmado por link · 🧮 link del contador · 🔁 gastos fijos · 📈 cobranza escalonada.
// FALLA con el código viejo (sin cfx_modulos_app ni acuerdos). Uso: node g94b.js   (ANCHO=320 opcional)
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  execSync(__dirname + '/base.sh /home/user/emprendedor p_g94b', { stdio: 'ignore' });
  const t = await abrir('/home/user/emprendedor', 'p_g94b'); const p = t.page, su = t.sim.su;
  try {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123'); const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()');
    const neg = (await c.query("select public.crear_negocio('Almacén Ana','almacen',true) ->> 'id' as id")).rows[0].id;
    const cli = (await c.query("select public.crear_cliente('Juan Pérez', '', '+56912345678', null, null, null, '1234', 90000, true, true) r")).rows[0].r;
    const mm = (await c.query('select public.mis_modulos() m')).rows[0].m;
    ok(mm.acuerdo === true && mm.contador === true && mm.escalonado === true && mm.gastos_fijos === true, '🧩 4 módulos de Billetera prendidos (venta apagada = sirven a todos) ' + JSON.stringify(mm));
    c.release();
    const cliId = cli.id || cli.cliente || (await su('select id from public.clientes limit 1'))[0].id;
    const codigo = (await su('select link_codigo from public.clientes where id = $1', [cliId]))[0].link_codigo;
    await p.goto(t.base + '/#ingresar'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'dueno@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(p);
    // 🧩 Más → Módulos (tienda del núcleo, con la venta prendida un momento)
    await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
    await p.goto(t.base + '/app/#modulos'); await p.waitForTimeout(2000); await t.sinModales(p);
    const tienda = await p.locator('main').innerText();
    ok(/Acuerdo de pago firmado/.test(tienda) && /Link para el contador/.test(tienda) && /Cobranza escalonada/.test(tienda) && /Gastos fijos/.test(tienda), '🧩 tienda con los 4 módulos');
    await t.foto('g94b-tienda'); ok(await t.anchoOk(p), 'ancho ok tienda');
    await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'false') where clave = 'modulos_venta'");
    // 📝 Acuerdo: el dueño lo crea
    await p.goto(t.base + '/app/#cliente/' + cliId); await p.waitForTimeout(1800); await t.sinModales(p);
    await p.click('button:has-text("Acuerdo")'); await p.waitForTimeout(900);
    await p.fill('#acCuotas', '3'); await p.click('.dialogo button:has-text("Crear acuerdo")'); await p.waitForTimeout(1200);
    let a = (await su('select * from public.acuerdos where cliente = $1', [cliId]))[0];
    ok(a && a.monto === 90000 && a.cuotas === 3 && a.estado === 'pendiente', '📝 acuerdo creado (90.000 en 3)');
    await p.click('button:has-text("Después")').catch(() => {}); await p.waitForTimeout(400);
    // El cliente entra a su link y lo firma
    const p2 = await p.context().newPage(); await p2.setViewportSize({ width: +(process.env.ANCHO || 360), height: 760 });
    await p2.goto(t.base + '/c/#' + codigo); await p2.waitForTimeout(1800);
    for (const d of '1234') { await p2.click('button:text-is("' + d + '")'); await p2.waitForTimeout(150); }
    await p2.waitForTimeout(2200);
    ok(await p2.locator('#acuerdo').count() === 1 && /3 cuotas/.test(await p2.locator('#acuerdo').innerText()), '📝 el cliente ve el acuerdo con su calendario');
    await p2.click('#acSi'); await p2.waitForTimeout(800);
    a = (await su('select * from public.acuerdos where cliente = $1', [cliId]))[0];
    ok(a.estado === 'pendiente', '🔒 sin nombre no firma');
    await p2.fill('#acFirma', 'Juan Pérez Soto'); await p2.click('#acSi'); await p2.waitForTimeout(1800);
    a = (await su('select * from public.acuerdos where cliente = $1', [cliId]))[0];
    ok(a.estado === 'firmado' && a.firma_nombre === 'Juan Pérez Soto' && a.firmado_at, '✍️ acuerdo firmado con nombre y fecha');
    ok(/Firmado por Juan Pérez Soto/.test(await p2.locator('#acuerdo').innerText()), 'el link muestra ✅ Firmado');
    await p2.screenshot({ path: __dirname + '/capturas/emprendedor/g94b-portal.png' }).catch(() => {});
    const av = (await su("select count(*)::int n from public.notificaciones where titulo like '%Acuerdo firmado%'"))[0].n;
    ok(av >= 1, '🔔 aviso al dueño (' + av + ')');
    // 🔒 otra sesión / id ajeno no firma
    let rech = false; try { await su("select public.portal_acuerdo_firmar('sesion-falsa', $1, 'X Y Z', true)", [a.id]); } catch (e) { rech = true; }
    ok(rech, '🔒 sin sesión válida no se puede firmar');
    // 🧮 Contador
    await p.goto(t.base + '/app/#contador'); await p.waitForTimeout(1500);
    await p.click('#ctOn'); await p.waitForTimeout(1200);
    const link = await p.locator('#ctLink').innerText();
    ok(/contador\/\?t=/.test(link), '🧮 link del contador creado');
    await su("insert into public.caja (id, negocio, tipo, monto, categoria) values (gen_random_uuid(), $1, 'ingreso', 50000, 'Ventas'), (gen_random_uuid(), $1, 'gasto', 20000, 'Mercadería')", [neg]);
    await p2.goto(link.replace(/^https?:\/\/[^/]+/, t.base)); await p2.waitForTimeout(2000);
    const ct = await p2.locator('#contador').innerText();
    ok(/Almacén Ana/.test(ct) && /30\.000/.test(ct) && !/Juan/.test(ct), '🧮 el contador ve balance $30.000 sin nombres de clientes');
    await p2.screenshot({ path: __dirname + '/capturas/emprendedor/g94b-contador.png' }).catch(() => {});
    await p.click('#ctOff'); await p.waitForTimeout(1000);
    await p2.reload(); await p2.waitForTimeout(1800);
    ok(/ya no está activo|no válido/i.test(await p2.locator('#contador').innerText()), '⛔ desactivado: el link deja de funcionar');
    // 🔁 Gastos fijos
    await p.goto(t.base + '/app/#fijos'); await p.waitForTimeout(1500);
    await p.click('#gfNuevo'); await p.waitForTimeout(700);
    await p.fill('#gfCat', 'Arriendo'); await p.fill('#gfMonto', '250000'); await p.fill('#gfDia', '1');
    await p.click('.dialogo button:has-text("Guardar")'); await p.waitForTimeout(1500);
    let n = (await su("select count(*)::int n from public.caja where negocio = $1 and categoria = 'Arriendo' and monto = 250000", [neg]))[0].n;
    ok(n === 1, '🔁 gasto fijo del día 1 anotado en la caja de este mes');
    await p.reload(); await p.waitForTimeout(2500);
    n = (await su("select count(*)::int n from public.caja where negocio = $1 and categoria = 'Arriendo'", [neg]))[0].n;
    ok(n === 1, '🔁 abrir de nuevo no lo duplica');
    await t.foto('g94b-fijos'); ok(await t.anchoOk(p), 'ancho ok gastos fijos');
    // 📈 Cobranza escalonada: 25 días de atraso → firme (Free, sin Pro)
    await su("update public.negocios set premium_hasta = null, en_prueba = false where id = $1", [neg]);
    await su("update public.movimientos set vence = current_date - 25 where cliente = $1", [cliId]);
    await su("update public.clientes set prox_venc = current_date - 25, atrasado = true where id = $1", [cliId]);
    await p.goto(t.base + '/app/#cliente/' + cliId); await p.reload(); await p.waitForTimeout(2500); await t.sinModales(p);
    await p.click('button:has-text("Cobrar")'); await p.waitForTimeout(1500);
    const dl = await p.locator('#tonoAuto').innerText().catch(() => '');
    ok(/25 días/.test(dl) && await p.locator('.segmento button.activo').innerText() === 'Firme', '📈 tono firme elegido solo con 25 días de atraso');
    await t.foto('g94b-cobrar');
    // 🔒 servidor: con el módulo apagado en la app, el acuerdo se rechaza
    await su("insert into public.cfx_config (clave, valor) values ('modulos', '{\"acuerdo\": false}') on conflict (clave) do update set valor = coalesce(public.cfx_config.valor, '{}') || '{\"acuerdo\": false}'");
    rech = false; try { await su("select public.acuerdo_crear($1, 1000, 1, current_date, 'mes', '') from (select set_config('request.jwt.claim.sub', $2, true)) x", [cliId, u.id]); } catch (e) { rech = /módulo/.test(e.message); console.log('  ' + e.message); }
    ok(rech, '🔒 servidor: módulo apagado → no crea acuerdos');
    await p.emulateMedia({ colorScheme: 'dark' }); await p.goto(t.base + '/app/#modulos'); await p.waitForTimeout(1500); await t.foto('g94b-oscuro');
    ok(await t.anchoOk(p), 'ancho ok oscuro');
  } catch (e) { ok(false, e.message); }
  await t.cerrar(); console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
