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
    // G42g: Respaldo y limpieza está en Apps (antes en Resumen → Empresas).
    await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(4000); await t.sinModales();
    await p.click('[data-app=cm] [data-a=limp]'); await p.waitForTimeout(1500);
    assert(await p.locator('dialog [data-c]').count() === 9, '9 limpiezas (5 núcleo + 4 CM)');
    // G131 b · 🖼️ Fotos de cuentas borradas: el admin las borra por Storage; la que algo aún usa se queda.
    const MU = '22222222-2222-4222-8222-222222222222', FB = MU + '/bbbbbbbb-aaaa-4aaa-8aaa-bbbbbbbbbbbb.webp', FC = MU + '/cccccccc-aaaa-4aaa-8aaa-cccccccccccc.webp';
    await t.sim.su("insert into storage.buckets (id, name, public) values ('vitrina', 'vitrina', true) on conflict do nothing");
    await t.sim.su("insert into storage.objects (bucket_id, name) values ('vitrina', $1), ('vitrina', $2)", [FB, FC]);
    await t.sim.su("create table if not exists public.z_g131b (t text)"); await t.sim.su("insert into public.z_g131b values ($1)", ['https://abc.supabase.co/storage/v1/object/public/vitrina/' + FC]);
    await t.sinModales();
    await p.click('[data-app=cm] [data-a=limp]'); await p.waitForTimeout(1500);
    const fc = p.locator('dialog [data-c="n_fotos_cuentas"]');
    assert(/2 por borrar/.test(await p.locator('dialog .fila', { has: p.locator('[data-c="n_fotos_cuentas"]') }).innerText()), '🖼️ Fotos de cuentas borradas: 2 por borrar');
    await fc.click(); await p.waitForTimeout(300);
    for (let k = 0; k < 2; k++) { const b = p.locator('dialog button', { hasText: /^(Borrar igual|Borrar)$/ }).last(); if (await b.isVisible().catch(() => false)) { await b.click(); await p.waitForTimeout(500); } }
    await p.waitForTimeout(1200);
    const quedan = (await t.sim.su("select array_agg(name) a from storage.objects where bucket_id = 'vitrina'"))[0].a || [];
    assert(quedan.length === 1 && quedan[0] === FC, '🧹 borró la foto huérfana y dejó la que una tabla usa');
    await t.sim.su('drop table public.z_g131b');
    await t.sinModales(); await p.click('[data-app=cm] [data-a=limp]'); await p.waitForTimeout(1500);
    assert(await p.locator('dialog [data-tb]').count() === 2, '2 tablas sobrantes');
    // G87 E · ↺ Ingresos de prueba
    assert(/todo el historial/.test(await p.locator('dialog [data-cero-txt]').innerText()), '↺ muestra: cuenta todo el historial');
    await p.click('dialog [data-cero-si]'); await p.waitForTimeout(500); await p.locator('dialog button', { hasText: 'Volver a cero' }).last().click(); await p.waitForTimeout(1200);
    assert(/Cuenta desde/.test(await p.locator('dialog [data-cero-txt]').innerText()) && await p.locator('dialog [data-cero-no]').isVisible(), '↺ Volver a cero: cuenta desde hoy + Contar todo otra vez');
    await p.click('dialog [data-cero-no]'); await p.waitForTimeout(1200);
    assert(/todo el historial/.test(await p.locator('dialog [data-cero-txt]').innerText()), '↺ deshacer vuelve a todo el historial');
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
