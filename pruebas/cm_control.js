const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  const t = await abrir('/home/user/saas', 'p_saas');
  const p = t.page;
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    const u = await t.sim.crearUsuario('ana@x.cl', 'clave123');
    await p.goto(t.base + '/'); await p.fill('input[type=email]', 'juanjosuecastilloloyola@gmail.com'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800); await t.sinModales();
    await p.goto(t.base + '/admin/#control'); await p.waitForTimeout(4000); await t.sinModales();
    await p.fill('#avT', 'Hola a todos'); await p.fill('#avC', 'Prueba'); await p.click('#avG'); await p.waitForTimeout(300); await p.locator('dialog button', { hasText: 'Enviar' }).last().click(); await p.waitForTimeout(1200);
    assert((await t.sim.su("select count(*)::int n from notificaciones where titulo='Hola a todos'"))[0].n === 1, 'aviso masivo');
    await t.foto('control-avisar'); assert(await t.anchoOk(), 'ancho avisar');
    await p.click('[data-s=planes]'); await p.waitForTimeout(1500);
    await p.locator('[data-c=items] [data-k=free]').fill('300'); await p.locator('[data-c=items] [data-k=free]').dispatchEvent('change'); await p.waitForTimeout(800);
    assert((await t.sim.su("select limites->>'items' v from planes where codigo='free'"))[0].v === '300', 'plan guardado');
    await t.foto('control-planes'); assert(await t.anchoOk(), 'ancho planes');
    await p.click('[data-s=textos]'); await p.waitForTimeout(1200);
    await p.locator('[data-t=app_lema]').fill('Nuevo lema'); await p.click('[data-g=app_lema]'); await p.waitForTimeout(700);
    assert((await t.sim.su("select valor from textos where clave='app_lema'"))[0].valor === 'Nuevo lema', 'texto guardado');
    await p.click('[data-s=keys]'); await p.waitForTimeout(1200);
    await p.fill('#kN', '2'); await p.click('#kG'); await p.waitForTimeout(1000);
    const codigos = (await p.locator('#kOut pre').innerText()).split('\n');
    assert(codigos.length === 2 && /^CFX-/.test(codigos[0]), 'keys creadas ' + codigos[0]);
    await p.click('[data-s=cupones]'); await p.waitForTimeout(1200);
    await p.fill('#cC', 'FERIA20'); await p.click('#cG'); await p.waitForTimeout(1500);
    assert((await t.sim.su("select pct from cfx_cupones where codigo='FERIA20'"))[0].pct === 20, 'cupón guardado');
    // usuario: canjea key y verifica identidad
    const { page: q } = await t.nuevo();
    await t.sim.su("update cfx_config set valor = jsonb_set(jsonb_set(valor, '{negocio,exigir_inicio}', 'true'), '{link}', '\"https://mpago.la/x\"') where clave='pagos'");
    await q.goto(t.base + '/'); await q.fill('input[type=email]', 'ana@x.cl'); await q.fill('input[type=password]', 'clave123'); await q.press('input[type=password]', 'Enter');
    await q.waitForURL(/app/); await q.waitForTimeout(2500);
    assert(await q.locator('dialog.cfx-pago').count() === 1, 'bloqueada');
    await q.click('dialog.cfx-pago summary:has-text("cupón")'); await q.fill('#cpCupon', 'feria20'); await q.click('[data-cupon]'); await q.waitForTimeout(800);
    assert(/3\.920/.test(await q.locator('#cpMonto').innerText()), 'cupón 20% sobre 4.900 = 3.920');
    await q.click('dialog.cfx-pago summary:has-text("key")'); await q.fill('#cpKey', codigos[0]); await q.click('[data-key]'); await q.waitForTimeout(1200);
    assert(/Premium activo/.test(await q.locator('dialog.cfx-pago').innerText()), 'key canjeada');
    await q.click('dialog.cfx-pago [data-x]'); await q.waitForTimeout(2500);
    assert(await q.locator('dialog.cfx-pago').count() === 0, 'desbloqueada con key');
    await q.evaluate(() => CFX_VERIFICAR.abrir({ rpc: App.rpc })); await q.waitForTimeout(800);
    await q.fill('#cvRut', '11.111.111-1'); await q.fill('#cvDoc', '123');
    for (const f of ['frente', 'reverso', 'selfie']) { await q.setInputFiles('#cv' + f, __dirname + '/comprobante.png'); await q.waitForTimeout(500); }
    await q.click('dialog.cfx-pago [data-enviar]'); await q.waitForTimeout(1000);
    assert(/Enviada/.test(await q.locator('dialog.cfx-pago').innerText()), 'verificación enviada'); await t.foto('verif', q);
    await p.click('[data-s=verif]'); await p.waitForTimeout(1500);
    await p.locator('[data-ok]').first().click(); await p.waitForTimeout(300); await p.locator('dialog button', { hasText: 'Aprobar' }).last().click(); await p.waitForTimeout(1000);
    assert((await t.sim.su("select estado, frente is null f from cfx_verificaciones"))[0].f, 'verificación aprobada y fotos borradas');
    await p.click('[data-s=registro]'); await p.waitForTimeout(1200);
    assert(await p.locator('#ctlCuerpo').innerText().then((x) => /verificación aprobada/.test(x)), 'registro');
    await t.foto('control-registro');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.filter((x) => !/raw\.githubusercontent|Failed to load resource|ERR_|db_version/.test(x)).join('\n') || 'ninguno');
  await t.cerrar();
})();
