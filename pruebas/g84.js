// G84 Estaciona: 🚗 patente en la reserva + Mis patentes · ⏱️ pedir más tiempo (dueño acepta) · terminar antes con devolución proporcional.
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  const t = await abrir('/home/user/estacionamiento', process.env.BD || 'p_g84', { dialogo: (d) => (d.type() === 'prompt' ? d.accept('xy-z 987') : d.accept()) });
  const p = t.page, su = t.sim.su;
  const entrar = async (pg, mail) => {
    await pg.goto(t.base + '/#/avisos'); await pg.waitForTimeout(1500);
    await pg.click('button[data-t=in]'); await pg.waitForTimeout(300);
    await pg.fill('#lEmail', mail); await pg.fill('#lClave', 'clave123'); await pg.press('#lClave', 'Enter');
    await pg.waitForTimeout(2500); await t.sinModales(pg);
  };
  try {
    const d = await t.sim.crearUsuario('dueno@x.cl', 'clave123');
    const c = await t.sim.crearUsuario('cliente@x.cl', 'clave123');
    await su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    const est = (await su("insert into public.estacionamientos (dueno, titulo, direccion, lat, lng, precio_hora) values ($1,'Est G84','Calle 1',-33.44,-70.65,1000) returning id", [d.id]))[0].id;
    await entrar(p, 'cliente@x.cl');

    // --- Mis patentes (Más)
    await p.goto(t.base + '/#/mas/patentes'); await p.waitForTimeout(2000);
    await p.fill('.ptPat', 'ab-cd 12'); await p.fill('.ptAlias', 'Auto rojo'); await p.click('.ptOk'); await p.waitForTimeout(1200);
    assert((await su('select patente, alias from patentes'))[0].patente === 'ABCD12', 'Mis patentes guarda ABCD12 (normalizada)');
    await p.fill('.ptPat', 'zz99'); await p.click('.ptOk'); await p.waitForTimeout(1000);
    assert((await su('select count(*)::int n from patentes'))[0].n === 1, 'patente corta no se guarda');
    assert(await t.anchoOk(), 'ancho Mis patentes'); await t.foto('g84-patentes');
    await t.sinModales();

    // --- Reservar con patente
    await p.goto(t.base + '/#/e/' + est); await p.waitForTimeout(2500); await t.sinModales();
    await p.click('#dSol'); await p.waitForSelector('#rPat');
    assert(await p.inputValue('#rPat') === 'ABCD12', 'el formulario trae mi patente guardada');
    await t.foto('g84-reservar');
    await p.click('#rOk'); await p.waitForTimeout(2500);
    let a = (await su('select * from arriendos'))[0];
    assert(a && a.patente === 'ABCD12', 'la reserva queda con patente');
    // Confirmada, pagada y en curso: 3 horas, empezó hace 30 min.
    await su("update arriendos set estado='aceptado', pago_estado='pagado', expira_at=null, cantidad=3, total=3000, monto_pagar=3000, inicio=now()-interval '30 min', fin=now()+interval '150 min'");
    await p.goto(t.base + '/#/r/' + a.id); await p.waitForTimeout(2500); await t.sinModales();
    assert(await p.locator('td', { hasText: 'ABCD12' }).count() === 1, 'la reserva muestra la patente');
    // cambiar patente
    await p.click('#rPatente'); await p.fill('#ptxt', 'xy-z 987'); await p.click('#pok'); await p.waitForTimeout(1500);
    assert((await su('select patente from arriendos'))[0].patente === 'XYZ987', 'cambia la patente de la reserva');

    // --- Pedir más tiempo
    await p.click('#rExt'); await p.waitForSelector('#xCant');
    await p.fill('#xCant', '2'); await p.waitForTimeout(200);
    assert(/2\.000/.test(await p.textContent('#xTot')), 'extra = $2.000');
    await t.foto('g84-mas-tiempo');
    await p.click('#xOk'); await p.waitForTimeout(2000);
    a = (await su('select * from arriendos'))[0];
    assert(a.ext_cantidad === 2 && a.ext_monto === 2000, 'solicitud de más tiempo guardada');
    assert(await p.locator('#rExtQuitar').count() === 1, 'el cliente ve "esperando al dueño"');
    assert(await t.anchoOk(), 'ancho reserva (cliente)'); await t.foto('g84-cliente-espera');
    // Otro no puede reservar encima del tiempo pedido
    const o = await t.sim.crearUsuario('otro@x.cl', 'clave123');
    await su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = 'otro' where id = $1", [o.id]);
    let choque = '';
    try { await t.sim.rpc('public', 'solicitar_arriendo', { p_id: est, p_modalidad: 'hora', p_inicio: new Date(Date.now() + 200 * 60000).toISOString(), p_cantidad: 1, p_nota: '' }, { sub: o.id, email: 'otro@x.cl' }); } catch (e) { choque = e.message; }
    const nArr = (await su('select count(*)::int n from arriendos'))[0].n;
    assert(nArr === 1 && /ya está reservado/.test(choque), 'el tiempo pedido queda apartado (' + choque.slice(0, 40) + ')');

    // --- Dueño acepta
    const D = await t.nuevo(); const q = D.page;
    await entrar(q, 'dueno@x.cl');
    await q.goto(t.base + '/#/r/' + a.id); await q.waitForTimeout(2500); await t.sinModales(q);
    assert(await q.locator('#rExtSi').count() === 1, 'el dueño ve la solicitud');
    assert(await q.locator('td', { hasText: 'XYZ987' }).count() === 1, 'el dueño ve la patente');
    assert(await t.anchoOk(q), 'ancho reserva (dueño)'); await t.foto('g84-dueno', q);
    await q.click('#rExtSi'); await q.waitForTimeout(2000);
    a = (await su("select *, round(extract(epoch from (fin - now())) / 60)::int as quedan from arriendos"))[0];
    assert(a.cantidad === 5 && a.total === 5000 && a.ext_cantidad === null && a.quedan > 260 && a.quedan < 275, 'aceptado: 5 horas, total $5.000, termina 2 h después');
    assert(a.monto_pagar === 3000, 'sin comprobante el extra no cuenta como pagado');

    // --- Terminar antes (cliente): quedan 4 horas completas de 5 → devuelve 3000*4/5 = 2400
    await p.goto(t.base + '/#/r/' + a.id); await p.waitForTimeout(2500); await t.sinModales();
    assert(/Terminar antes/.test(await p.textContent('#rFin')), 'botón "Terminar antes"');
    await p.click('#rFin'); await p.waitForSelector('[data-si]'); await t.foto('g84-confirmar'); await p.click('[data-si]'); await p.waitForTimeout(2000);
    a = (await su("select *, fin <= now() as ya from arriendos"))[0];
    assert(a.estado === 'finalizado' && a.pago_estado === 'devolver' && a.devolver_monto === 2400 && a.ya, 'terminó antes: devolver $2.400');
    assert(/2\.400/.test(await p.textContent('#vista, main, body')), 'el cliente ve cuánto le devuelven');
    await t.foto('g84-termino');
    await q.reload(); await q.waitForTimeout(3000); await t.sinModales(q);
    await q.click('#rDevuelto'); await q.waitForTimeout(1500);
    assert((await su('select pago_estado from arriendos'))[0].pago_estado === 'devuelto', 'el dueño marca devuelto');
    // 320 px y oscuro
    await q.setViewportSize({ width: 320, height: 640 }); await q.emulateMedia({ colorScheme: 'dark' });
    await q.goto(t.base + '/#/reservas'); await q.waitForTimeout(1500); await q.goto(t.base + '/#/r/' + a.id); await q.waitForTimeout(2000); await t.sinModales(q);
    assert(await t.anchoOk(q), 'ancho 320 oscuro'); await t.foto('g84-320', q);
  } catch (e) { console.log(e.message); await t.foto('g84-error'); process.exitCode = 1; }
  console.log('ERRORES:', t.errores.join('\n') || 'ninguno');
  await t.cerrar();
})();
