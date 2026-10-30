const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  const t = await abrir('/home/user/saas', 'p_saas');
  const p = t.page;
  try {
    const adm = await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    const u = await t.sim.crearUsuario('ana@x.cl', 'clave123');
    await t.sim.su("insert into public.notificaciones (para, titulo, cuerpo) values ($1,'Uno','a'),($1,'Dos','b'),($1,'Tres','c')", [adm.id]);
    await t.sim.su("insert into public.pagos (usuario, plan, monto, estado) values ($1,'mensual',4900,'aprobado')", [u.id]);
    await p.goto(t.base + '/');
    await p.fill('input[type=email]', 'juanjosuecastilloloyola@gmail.com'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(1200);
    await t.sinModales(); await p.waitForTimeout(200);
    await p.click('#bCampana'); await p.waitForTimeout(500);
    assert(await p.locator('dialog [data-quitar]').count() === 3, '3 avisos con ✕');
    await p.locator('dialog [data-quitar]').first().evaluate((b) => b.click()); await p.waitForTimeout(600);
    assert((await t.sim.su('select count(*)::int n from notificaciones where para=$1', [adm.id]))[0].n === 2, 'borra uno');
    await t.foto('campana');
    await p.click('dialog [data-borrar]'); await p.waitForTimeout(300);
    await p.locator('dialog >> text=Borrar').last().click(); await p.waitForTimeout(800);
    assert((await t.sim.su('select count(*)::int n from notificaciones where para=$1', [adm.id]))[0].n === 0, 'borra todos');
    await p.goto(t.base + '/admin/#registro'); await p.waitForTimeout(1500);
    assert(await t.anchoOk(), 'ancho 360 registro');
    await p.click('#rApps'); await p.waitForTimeout(800);
    assert(/#apps/.test(p.url()) || await p.locator('#appsCab').count() === 1, 'lleva a Apps');
    // usuario: descargar mis datos
    const { page: q } = await t.nuevo();
    await q.goto(t.base + '/'); await q.fill('input[type=email]', 'ana@x.cl'); await q.fill('input[type=password]', 'clave123'); await q.press('input[type=password]', 'Enter');
    await q.waitForURL(/app/); await q.waitForTimeout(1500);
    await q.goto(t.base + '/app/#mas'); await q.waitForTimeout(1200);
    await t.sinModales(q); await q.waitForTimeout(200);
    await q.click('[data-act=bajar]'); await q.waitForTimeout(500);
    const [d2] = await Promise.all([q.waitForEvent('download'), q.click('dialog [data-f=xlsx]')]);
    assert(/\.xlsx$/.test(d2.suggestedFilename()), 'excel usuario');
    await d2.saveAs('/tmp/claude-0/cm_user.xlsx');
    assert(await t.anchoOk(q), 'ancho 360 más');
    await t.foto('mas', q);
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.join('\n') || 'ninguno');
  await t.cerrar();
})();
