// G104 b · 🅿️ Estaciona: 4 módulos más → 🌙 tarifa fin de semana/noche · 🔁 clientes frecuentes · 📅 cerrar fechas · 🔔 lista de espera.
// FALLA con el código viejo (sin tarifa_guardar, frecuentes, cierres ni esperas). Uso: node g104b.js   (ANCHO=320 opcional)
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  execSync(__dirname + '/base.sh /home/user/estacionamiento p_g104b', { stdio: 'ignore' });
  const t = await abrir('/home/user/estacionamiento', 'p_g104b', { dialogo: (d) => d.accept() }); const p = t.page, su = t.sim.su;
  const entrar = async (pg, mail) => {
    await pg.goto(t.base + '/#/avisos'); await pg.waitForTimeout(1500);
    await pg.click('button[data-t=in]'); await pg.waitForTimeout(300);
    await pg.fill('#lEmail', mail); await pg.fill('#lClave', 'clave123'); await pg.press('#lClave', 'Enter');
    await pg.waitForTimeout(2500); await t.sinModales(pg);
  };
  const como = (uid, sql, args) => t.sim.pool.connect().then(async (c) => {
    try { await c.query('begin'); await c.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]); const r = await c.query(sql, args || []); await c.query('commit'); return r.rows; }
    catch (e) { await c.query('rollback'); throw e; } finally { c.release(); } });
  try {
    const d = await t.sim.crearUsuario('dueno@x.cl', 'clave123');
    const c = await t.sim.crearUsuario('cliente@x.cl', 'clave123');
    const c2 = await t.sim.crearUsuario('otra@x.cl', 'clave123');
    await su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    const est = (await su("insert into public.estacionamientos (dueno, titulo, direccion, lat, lng, precio_hora, precio_dia) values ($1,'Lugar centro','Calle 1',-33.44,-70.65,2000,10000) returning id", [d.id]))[0].id;
    const mm = (await como(d.id, 'select public.mis_modulos() m'))[0].m;
    ok(mm.tarifas && mm.frecuentes && mm.calendario && mm.avisame && mm.destacar, '🧩 8 módulos en Estaciona (4 nuevos) ' + JSON.stringify(mm));
    // Dueño: 🌙 tarifa +20 % fin de semana
    const { page: e } = await t.nuevo();
    await entrar(e, 'dueno@x.cl');
    await e.goto(t.base + '/#/mas/tarifas'); await e.waitForTimeout(2200);
    await e.fill('[data-fi="' + est + '"]', '20'); await e.fill('[data-no="' + est + '"]', '0'); await e.click('[data-gt="' + est + '"]'); await e.waitForTimeout(1200);
    let r = (await su('select finde_pct, noche_pct from public.estacionamientos where id = $1', [est]))[0];
    ok(r.finde_pct === 20 && r.noche_pct === 0, '🌙 tarifa guardada (+20 % fin de semana)');
    await e.screenshot({ path: __dirname + '/capturas/estacionamiento/g104b-tarifas.png' });
    let rech = false; try { await como(d.id, 'select public.tarifa_guardar($1, 300, 0)', [est]); } catch (x) { rech = true; }
    ok(rech, '🔒 servidor: más de 100 % se rechaza');
    // 📅 cerrar el próximo martes
    const mar = (await su("select to_char(d, 'YYYY-MM-DD') d from (select current_date + ((2 - extract(isodow from current_date)::int + 7) % 7 + 7) d) x"))[0].d;
    await e.goto(t.base + '/#/mas/calendario'); await e.reload(); await e.waitForTimeout(2200);
    await e.fill('#ciDesde >> visible=true', mar); await e.fill('#ciHasta >> visible=true', mar); await e.fill('#ciMot >> visible=true', 'vacaciones'); await e.click('#ciOk >> visible=true'); await e.waitForTimeout(1200);
    ok((await su('select count(*)::int n from public.cierres'))[0].n === 1, '📅 fecha cerrada');
    await e.screenshot({ path: __dirname + '/capturas/estacionamiento/g104b-calendario.png' });
    // 🔁 premio: 10 % desde la 2.ª reserva
    await e.goto(t.base + '/#/mas/frecuentes'); await e.reload(); await e.waitForTimeout(2200);
    await e.fill('#frPct >> visible=true', '10'); await e.fill('#frDesde >> visible=true', '2'); await e.click('#frOk >> visible=true'); await e.waitForTimeout(1200);
    r = (await su('select frec_pct, frec_desde from public.perfiles where id = $1', [d.id]))[0];
    ok(r.frec_pct === 10 && r.frec_desde === 2, '🔁 premio guardado (10 % desde la 2.ª)');
    // Cliente: ficha muestra tarifa, premio y cierre
    await entrar(p, 'cliente@x.cl');
    await p.goto(t.base + '/#/e/' + est); await p.waitForTimeout(2500); await t.sinModales();
    const fi = await p.locator('#dG104').innerText().catch(() => '');
    ok(/Fin de semana \+20 %/.test(fi) && /Cliente frecuente: 10 %/.test(fi) && /Cerrado/.test(fi) && /vacaciones/.test(fi), '🔎 la ficha muestra tarifa, premio y fechas cerradas');
    await t.foto('g104b-ficha'); ok(await t.anchoOk(), 'ancho ok ficha');
    // Reservar el próximo sábado 1 día → 12.000 (10.000 + 20 %)
    const sab = (await su("select to_char(d, 'YYYY-MM-DD') d from (select current_date + ((6 - extract(isodow from current_date)::int + 7) % 7 + 7) d) x"))[0].d;
    await p.click('#dSol'); await p.waitForSelector('#rCant');
    await p.click('#rMod button[data-m=dia]'); await p.fill('#rIni', sab + 'T10:00'); await p.fill('#rCant', '1'); await p.waitForTimeout(300);
    ok(/12\.000/.test(await p.locator('#rTot').innerText()) && await p.locator('#rTarifa').count() === 1, '🌙 total en pantalla con +20 % (' + await p.locator('#rTot').innerText() + ')');
    await t.foto('g104b-reservar'); ok(await t.anchoOk(), 'ancho ok reservar');
    await p.click('#rOk'); await p.waitForTimeout(2500);
    let a = (await su('select * from public.arriendos order by creado desc'))[0];
    ok(a && a.total === 12000, '🔒 el servidor cobra 12.000 (sábado +20 %)');
    // 📅 reservar el martes cerrado → rechazado por el servidor
    rech = false; try { await como(c2.id, "select public.solicitar_arriendo($1, 'dia', ($2 || ' 10:00 America/Santiago')::timestamptz, 1, '')", [est, mar]); } catch (x) { rech = /Cerrado/.test(x.message); }
    ok(rech, '⛔ servidor: no se puede reservar un día cerrado');
    // 🔁 2.ª reserva del mismo cliente → 10 % menos (día hábil: miércoles siguiente)
    await su("update public.arriendos set estado = 'finalizado', pago_estado = 'pagado', expira_at = null");
    const mie = (await su("select to_char(d, 'YYYY-MM-DD') d from (select current_date + ((3 - extract(isodow from current_date)::int + 7) % 7 + 7) d) x"))[0].d;
    await como(c.id, "select public.solicitar_arriendo($1, 'dia', ($2 || ' 10:00 America/Santiago')::timestamptz, 1, '')", [est, mie]);
    a = (await su('select * from public.arriendos order by creado desc'))[0];
    ok(a.total === 9000, '🔁 servidor: 2.ª reserva con premio −10 % (' + a.total + ')');
    const lf = (await como(d.id, 'select public.frecuentes() x'))[0].x;
    ok(lf.lista.length === 1 && lf.lista[0].reservas === 1, '🔁 lista de frecuentes con quien arrienda');
    // 🔔 lista de espera: el lugar queda ocupado → la otra persona se anota → al liberarlo le llega el aviso
    await su("update public.estacionamientos set estado = 'ocupado' where id = $1", [est]);
    const { page: q } = await t.nuevo();
    await entrar(q, 'otra@x.cl');
    await q.goto(t.base + '/#/e/' + est); await q.waitForTimeout(2500); await t.sinModales(q);
    ok(await q.locator('#dEspera').count() === 1, '🔔 ocupado: aparece "Avísame cuando se libere"');
    await q.click('#dEspera'); await q.waitForTimeout(1200);
    ok((await su('select count(*)::int n from public.esperas'))[0].n === 1, '🔔 anotada en la lista de espera');
    await q.screenshot({ path: __dirname + '/capturas/estacionamiento/g104b-espera.png' });
    await e.goto(t.base + '/#/mas/avisame'); await e.reload(); await e.waitForTimeout(2200);
    ok(/otra/.test(await e.locator('body').innerText()), '🔔 el dueño ve quién espera');
    await e.screenshot({ path: __dirname + '/capturas/estacionamiento/g104b-esperas.png' });
    await como(d.id, "select public.estado_estacionamiento($1, 'disponible')", [est]);
    const nt = (await su("select count(*)::int n from public.notificaciones where usuario = $1 and titulo like '%Se liberó!%'", [c2.id]))[0].n;
    ok(nt === 1 && (await su('select count(*)::int n from public.esperas'))[0].n === 0, '📲 al liberarlo le llega el aviso y la lista se vacía');
    // 🧩 tienda (venta prendida) y sin comprar: la tarifa ya no se aplica
    await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
    await p.goto(t.base + '/#/mas/modulos'); await p.reload(); await p.waitForTimeout(3000);
    const ti = await p.locator('body').innerText();
    ok(/Tarifa fin de semana y noche/.test(ti) && /Clientes frecuentes/.test(ti) && /Cerrar fechas/.test(ti) && /Lista de espera/.test(ti), '🧩 tienda con los 4 módulos nuevos');
    ok(await t.anchoOk(), 'ancho ok tienda'); await t.foto('g104b-tienda');
    const tot = (await su("select public._tarifa_total(e, 'dia', ($2 || ' 10:00 America/Santiago')::timestamptz, 1, 10000) t from public.estacionamientos e where id = $1", [est, sab]))[0].t;
    ok(tot === 10000, '🔒 sin el módulo la tarifa no se aplica (' + tot + ')');
    rech = false; try { await como(d.id, "select public.cierre_guardar($1, current_date, current_date, '')", [est]); } catch (x) { rech = /módulo/.test(x.message); }
    ok(rech, '🔒 sin el módulo no se cierran fechas');
    await p.emulateMedia({ colorScheme: 'dark' }); await p.goto(t.base + '/#/e/' + est); await p.reload(); await p.waitForTimeout(2500); await t.foto('g104b-oscuro'); ok(await t.anchoOk(), 'ancho ok oscuro');
  } catch (e) { ok(false, e.message); }
  await t.cerrar(); console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
