// G94 c · 🅿️ Estaciona modular: 🧩 tienda · ⭐ destacado por módulo · 🏷️ descuento por estadía larga (servidor) · 🔑 pase QR + control de acceso · 💰 ganancias.
// FALLA con el código viejo (sin cfx_modulos_app ni pase_arriendo). Uso: node g94c.js   (ANCHO=320 opcional)
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  execSync(__dirname + '/base.sh /home/user/estacionamiento p_g94c', { stdio: 'ignore' });
  const t = await abrir('/home/user/estacionamiento', 'p_g94c', { dialogo: (d) => d.accept() }); const p = t.page, su = t.sim.su;
  const entrar = async (pg, mail) => {
    await pg.goto(t.base + '/#/avisos'); await pg.waitForTimeout(1500);
    await pg.click('button[data-t=in]'); await pg.waitForTimeout(300);
    await pg.fill('#lEmail', mail); await pg.fill('#lClave', 'clave123'); await pg.press('#lClave', 'Enter');
    await pg.waitForTimeout(2500); await t.sinModales(pg);
  };
  const como = (uid, sql, args) => su("select set_config('request.jwt.claim.sub', $1, true)", [uid]).then(() => t.sim.pool.connect()).then(async (c) => {
    try { await c.query('begin'); await c.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]); const r = await c.query(sql, args || []); await c.query('commit'); return r.rows; }
    catch (e) { await c.query('rollback'); throw e; } finally { c.release(); } });
  try {
    const d = await t.sim.crearUsuario('dueno@x.cl', 'clave123');
    const c = await t.sim.crearUsuario('cliente@x.cl', 'clave123');
    await su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    const est = (await su("insert into public.estacionamientos (dueno, titulo, direccion, lat, lng, precio_dia) values ($1,'Lugar centro','Calle 1',-33.44,-70.65,5000) returning id", [d.id]))[0].id;
    const mm = (await como(d.id, 'select public.mis_modulos() m'))[0].m;
    ok(mm.destacar && mm.acceso && mm.descuentos && mm.ganancias, '🧩 4 módulos de Estaciona (venta apagada = sirven a todos) ' + JSON.stringify(mm));
    const mp = await su('select d from public.mapa(-34, -71, -33, -70)');
    ok(mp.length === 1 && mp[0].d === true, '⭐ destacado en el mapa por el módulo (sin Premium)');
    // Dueño: descuento 10 % desde 3 días
    const { page: e } = await t.nuevo();
    await entrar(e, 'dueno@x.cl');
    await e.goto(t.base + '/#/mas/descuentos'); await e.waitForTimeout(2200);
    await e.fill('[data-pct="' + est + '"]', '10'); await e.fill('[data-desde="' + est + '"]', '3'); await e.click('[data-gd="' + est + '"]'); await e.waitForTimeout(1200);
    let r = (await su('select desc_pct, desc_desde from public.estacionamientos where id = $1', [est]))[0];
    ok(r.desc_pct === 10 && r.desc_desde === 3, '🏷️ descuento guardado (10 % desde 3)');
    await e.screenshot({ path: __dirname + '/capturas/estacionamiento/g94c-descuentos.png' });
    let rech = false; try { await como(d.id, "select public.descuento_guardar($1, 80, 3)", [est]); } catch (x) { rech = true; }
    ok(rech, '🔒 servidor: más de 50 % se rechaza');
    // Cliente reserva 4 días → −10 %
    await entrar(p, 'cliente@x.cl');
    await p.goto(t.base + '/#/e/' + est); await p.waitForTimeout(2500); await t.sinModales();
    await p.click('#dSol'); await p.waitForSelector('#rCant');
    ok(await p.locator('#rDesc').count() === 1, '🏷️ el formulario avisa el descuento');
    await p.fill('#rCant', '4'); await p.waitForTimeout(300);
    const tot = await p.locator('#rTot').innerText();
    ok(/18\.000/.test(tot) && /10 %/.test(tot), '🏷️ total con −10 % en pantalla (' + tot + ')');
    await t.foto('g94c-reservar'); if (!(await t.anchoOk())) console.log(await require('/tmp/claude-0/-home-user/d67d487c-ba4a-5562-8e19-111900cc9965/scratchpad/ancho.js')(p)); ok(await t.anchoOk(), 'ancho ok reservar');
    await p.click('#rOk'); await p.waitForTimeout(2500);
    let a = (await su('select * from public.arriendos'))[0];
    ok(a && a.total === 18000, '🔒 el servidor cobra 18.000 (4 × 5.000 − 10 %)');
    // Aceptada y en curso → pase
    await su("update public.arriendos set estado='aceptado', pago_estado='pagado', expira_at=null, inicio=now()-interval '1 hour', fin=now()+interval '3 days'");
    await p.goto(t.base + '/#/r/' + a.id); await p.reload(); await p.waitForTimeout(3000); await t.sinModales();
    await p.waitForSelector('#rPase', { timeout: 20000 }).catch(() => {});
    ok(await p.locator('#rPase').count() === 1, '🔑 quien arrienda ve "Mi pase para entrar"');
    await p.click('#rPase'); await p.waitForTimeout(600);
    const cod = (await p.locator('#paseCod').innerText()).trim();
    ok(/^[A-Z0-9]{8}$/.test(cod) && await p.locator('#paseQR canvas').count() === 1, '🔑 pase con QR y código ' + cod);
    await t.foto('g94c-pase');
    await p.click('#paseCerrar'); await p.waitForTimeout(300);
    // Dueño valida en Control de acceso
    await e.goto(t.base + '/#/mas/acceso'); await e.waitForTimeout(2200);
    await e.fill('#acCod', cod.toLowerCase()); await e.click('#acVer'); await e.waitForTimeout(1200);
    ok(/VIGENTE/.test(await e.locator('#acRes').innerText()) && !/NO VIGENTE/.test(await e.locator('#acRes').innerText()), '✅ el dueño ve VIGENTE');
    await e.click('#acEnt'); await e.waitForTimeout(1200);
    let n = (await su("select count(*)::int n from public.accesos where tipo = 'entrada'"))[0].n;
    ok(n === 1, '🟢 entrada anotada');
    await e.screenshot({ path: __dirname + '/capturas/estacionamiento/g94c-acceso.png' });
    rech = false; try { await como(c.id, "select public.acceso_validar($1, 'entrada')", [cod]); } catch (x) { rech = true; }
    ok(rech, '🔒 quien no es el dueño no puede validar pases');
    await su("update public.arriendos set estado = 'finalizado'");
    rech = false; try { await como(d.id, "select public.acceso_validar($1, 'entrada')", [cod]); } catch (x) { rech = /no está vigente/.test(x.message); }
    ok(rech, '⛔ pase vencido no puede entrar');
    // 💰 Ganancias
    await e.goto(t.base + '/#/mas/ganancias'); await e.waitForTimeout(2200);
    const gt = await e.locator('#gMes').innerText().catch(() => '');
    ok(/18\.000/.test(gt), '💰 ganancias del mes ' + gt);
    ok(/Lugar centro/.test(await e.locator('body').innerText()), '📈 ocupación por lugar');
    await e.screenshot({ path: __dirname + '/capturas/estacionamiento/g94c-ganancias.png' });
    // 🧩 tienda (venta prendida un momento)
    await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
    await p.goto(t.base + '/#/mas/modulos'); await p.reload(); await p.waitForTimeout(3000);
    const ti = await p.locator('body').innerText();
    ok(/Destacado en el mapa/.test(ti) && /Control de acceso con QR/.test(ti) && /estadía larga/.test(ti) && /Ganancias y ocupación/.test(ti), '🧩 tienda con los 4 módulos');
    ok(await t.anchoOk(), 'ancho ok tienda'); await t.foto('g94c-tienda');
    // Con venta prendida y sin comprar: el descuento ya no se aplica y no se destaca
    await su('update public.perfiles set premium_hasta = null where id = $1', [d.id]);
    const mp2 = await su('select d from public.mapa(-34, -71, -33, -70)');
    ok(mp2[0].d === false, '⭐ sin el módulo (y sin Premium) ya no se destaca');
    await p.emulateMedia({ colorScheme: 'dark' }); await t.foto('g94c-oscuro'); ok(await t.anchoOk(), 'ancho ok oscuro');
  } catch (e) { ok(false, e.message); }
  await t.cerrar(); console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
