const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  const t = await abrir('/home/user/estacionamiento', 'p_estacionamiento');
  const p = t.page;
  try {
    const u = await t.sim.crearUsuario('b@x.cl', 'clave123');
    const c = await t.sim.crearUsuario('c@x.cl', 'clave123');
    await t.sim.su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    await t.sim.su("insert into public.notificaciones (usuario, titulo, cuerpo) values ($1,'Uno','a'),($1,'Dos','b')", [u.id]);
    const conv = (await t.sim.su("insert into public.conversaciones (a, b) values (least($1::uuid,$2::uuid), greatest($1::uuid,$2::uuid)) returning id", [u.id, c.id]))[0].id;
    await t.sim.su("insert into public.mensajes (conv, autor, texto) values ($1,$2,'hola')", [conv, c.id]);
    await t.sim.su("insert into public.estacionamientos (dueno, titulo, direccion, lat, lng) values ($1,'Est 1','Calle 1',-33.44,-70.65)", [u.id]);
    await p.goto(t.base + '/#/avisos'); await p.waitForTimeout(1500);
    await p.click('button[data-t=in]'); await p.waitForTimeout(300);
    await p.fill('#lEmail', 'b@x.cl'); await p.fill('#lClave', 'clave123'); await p.press('#lClave', 'Enter');
    await p.waitForTimeout(2500); await t.sinModales();
    await p.goto(t.base + '/#/avisos'); await p.waitForTimeout(1500);
    const n0 = await p.locator('[data-quitar]').count();
    assert(n0 >= 2, 'avisos con ✕ ' + n0);
    await p.locator('[data-quitar]').first().click(); await p.waitForTimeout(800);
    assert(await p.locator('[data-quitar]').count() === n0 - 1, 'borra uno');
    await t.foto('avisos'); assert(await t.anchoOk(), 'ancho avisos');
    await p.goto(t.base + '/#/chat/' + conv); await p.waitForTimeout(1500);
    assert(await t.anchoOk(), 'ancho chat'); await t.foto('chat');
    await p.click('#cBorrar'); await p.waitForTimeout(400);
    await p.locator('button', { hasText: 'Borrar' }).last().click(); await p.waitForTimeout(1000);
    assert((await t.sim.su('select count(*)::int n from conversaciones'))[0].n === 0, 'conversación borrada');
    await p.goto(t.base + '/#/mas/cuenta'); await p.waitForTimeout(2000); await t.sinModales();
    const [d] = await Promise.all([p.waitForEvent('download'), p.click('#cRespaldo')]);
    await d.saveAs('/tmp/claude-0/est.xlsx'); assert(true, 'respaldo');
    assert(await t.anchoOk(), 'ancho cuenta'); await t.foto('cuenta');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.join('\n') || 'ninguno');
  await t.cerrar();
})();
