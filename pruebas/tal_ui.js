const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  const t = await abrir('/home/user/taller', 'p_taller');
  const p = t.page;
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    const u = await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await t.sim.su("update public.perfiles set terminos_at = now()").catch(() => {});
    await t.sim.su("insert into public.notificaciones (para, titulo, cuerpo) values ($1,'Uno','a'),($1,'Dos','b')", [u.id]);
    await p.goto(t.base + '/'); await p.waitForTimeout(1000);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3500); await t.sinModales();
    console.log('url', p.url());
    await p.click('#campana'); await p.waitForTimeout(800);
    const n0 = await p.locator('dialog [data-quitar]').count();
    assert(n0 >= 2, 'avisos con ✕ ' + n0);
    await p.locator('dialog [data-quitar]').first().evaluate((b) => b.click()); await p.waitForTimeout(700);
    await t.foto('campana');
    await p.click('dialog [data-borrar]'); await p.waitForTimeout(300); await p.locator('dialog button', { hasText: 'Borrar' }).last().click(); await p.waitForTimeout(800);
    assert((await t.sim.su('select count(*)::int n from notificaciones where para=$1', [u.id]))[0].n === 0, 'borra todos');
    await p.goto(t.base + '/taller/#mas'); await p.waitForTimeout(2000); await t.sinModales(); await p.click('#mBody [data-m=cuenta]'); await p.waitForTimeout(800);
    const [d] = await Promise.all([p.waitForEvent('download'), p.click('#uRespaldo')]);
    await d.saveAs('/tmp/claude-0/tal.xlsx'); assert(true, 'respaldo taller');
    assert(await t.anchoOk(), 'ancho cuenta'); await t.foto('cuenta');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.join('\n') || 'ninguno');
  await t.cerrar();
})();
