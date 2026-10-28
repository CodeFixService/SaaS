const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  const t = await abrir('/home/user/saas', 'p_saas');
  const p = t.page;
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    await t.sim.su("create table public.vieja (a int); insert into public.vieja values (1),(2); create table public.vacia (a int)");
    await p.goto(t.base + '/');
    await p.fill('input[type=email]', 'juanjosuecastilloloyola@gmail.com'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(1000); await t.sinModales();
    await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(4000); await t.sinModales();
    await p.click('[data-app=cm] [data-a=limp]'); await p.waitForTimeout(1500);
    assert(await p.locator('dialog [data-c]').count() === 4, '4 limpiezas');
    assert(await p.locator('dialog [data-tb]').count() === 2, '2 tablas sobrantes');
    await t.foto('limpieza');
    await p.click('dialog [data-tb="public.vacia"]'); await p.waitForTimeout(300); await p.locator('dialog button', { hasText: 'Borrar' }).last().click(); await p.waitForTimeout(1200);
    assert(await p.locator('dialog [data-tb]').count() === 1, 'vacía borrada');
    const [d] = await Promise.all([p.waitForEvent('download'), p.click('dialog [data-td="public.vieja"]')]);
    assert(/\.json$/.test(d.suggestedFilename()), 'respaldo tabla ' + d.suggestedFilename());
    await p.waitForTimeout(500);
    await p.click('dialog [data-tb="public.vieja"]'); await p.waitForTimeout(300);
    await p.locator('dialog #si').fill('sí'); await p.click('dialog #sk'); await p.waitForTimeout(1200);
    assert(await p.locator('dialog [data-tb]').count() === 0, 'con datos borrada tras sí');
    const [d2] = await Promise.all([p.waitForEvent('download'), p.click('dialog [data-r]')]);
    assert(/\.xlsx$/.test(d2.suggestedFilename()), 'excel ' + d2.suggestedFilename());
    assert(await t.anchoOk(), 'ancho'); await t.foto('limpieza2');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.filter((x) => !/raw\.githubusercontent|Failed to load resource|ERR_|db_version/.test(x)).join('\n') || 'ninguno');
  console.log('(errores de red esperados:', t.errores.filter((x) => /raw\.githubusercontent|Failed to load resource|ERR_/.test(x)).length, ')');
  await t.cerrar();
})();
