const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
async function entrar(t, p, email, pass) {
  await p.goto(t.base + '/#ingresar'); await p.waitForTimeout(800);
  await p.fill('input[type=email]', email); await p.fill('input[type=password]', pass); await p.press('input[type=password]', 'Enter');
  await p.waitForTimeout(2500);
}
(async () => {
  const t = await abrir('/home/user/emprendedor', 'p_emprendedor');
  const p = t.page;
  try {
    const adm = await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    await t.sim.su('select privado.fijar_admin()');
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123');
    const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]);
    await c.query('select public.aceptar_terminos()'); const neg = (await c.query("select public.crear_negocio('Almacén Ana','almacen',true) ->> 'id' as id")).rows[0].id;
    await c.query("select public.soporte_enviar('Hola, necesito ayuda')"); c.release();
    await t.sim.su("update public.negocios set premium_hasta = now() + interval '30 days', activado = true where id = $1", [neg]);
    await t.sim.su("insert into public.notificaciones (negocio, titulo, cuerpo) values ($1,'Uno','a'),($1,'Dos','b')", [neg]);
    await entrar(t, p, 'dueno@x.cl', 'clave123');
    assert(/app/.test(p.url()), 'entra a la app ' + p.url());
    await t.sinModales();
    await p.goto(t.base + '/app/#avisos'); await p.waitForTimeout(1500); await t.sinModales();
    assert(await p.locator('[aria-label="Borrar aviso"]').count() >= 2, 'avisos con ✕');
    await p.locator('[aria-label="Borrar aviso"]').first().click(); await p.waitForTimeout(800);
    const n1 = (await t.sim.su('select count(*)::int n from notificaciones where negocio=$1', [neg]))[0].n;
    await t.foto('avisos');
    await p.click('text=Borrar todos'); await p.waitForTimeout(400); await p.locator('dialog button, [role=dialog] button', { hasText: 'Borrar' }).last().click(); await p.waitForTimeout(800);
    const n2 = (await t.sim.su('select count(*)::int n from notificaciones where negocio=$1', [neg]))[0].n;
    assert(n2 === 0 && n1 >= 1, 'borra uno y todos (' + n1 + '→' + n2 + ')');
    await p.goto(t.base + '/app/#soporte'); await p.waitForTimeout(1500); await t.sinModales();
    assert(await t.anchoOk(), 'ancho soporte');
    await t.foto('soporte');
    await p.click('[aria-label="Borrar chat"]'); await p.waitForTimeout(400); await p.locator('dialog button, [role=dialog] button', { hasText: 'Borrar' }).last().click(); await p.waitForTimeout(800);
    assert((await t.sim.su('select count(*)::int n from soporte'))[0].n === 0, 'chat borrado');
    await p.goto(t.base + '/app/#reportes'); await p.waitForTimeout(2000); await t.sinModales();
    const [d] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Excel")')]);
    assert(/\.xlsx$/.test(d.suggestedFilename()), 'excel negocio ' + d.suggestedFilename()); await d.saveAs('/tmp/claude-0/emp_neg.xlsx');
    // admin
    const { page: q } = await t.nuevo();
    await entrar(t, q, 'juanjosuecastilloloyola@gmail.com', 'admin123');
    await q.goto(t.base + '/admin/#resumen'); await q.waitForTimeout(2500); await t.sinModales(q);
    await q.click('summary:has-text("Ver cada tabla")'); await q.waitForTimeout(500);
    const [d2] = await Promise.all([q.waitForEvent('download'), q.click('button:has-text("Descargar respaldo")')]);
    await d2.saveAs('/tmp/claude-0/emp_adm.xlsx'); assert(true, 'excel admin');
    assert(await t.anchoOk(q), 'ancho admin'); await t.foto('admin', q);
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.join('\n') || 'ninguno');
  await t.cerrar();
})();
