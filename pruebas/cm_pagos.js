const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const IMG = __dirname + '/comprobante.png';
(async () => {
  const t = await abrir('/home/user/saas', 'p_saas', { conCobro: true });
  const p = t.page;
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    await t.sim.su("update public.cfx_config set valor = jsonb_set(jsonb_set(valor, '{link}', '\"https://link.mercadopago.cl/x\"'), '{transferencia,numero}', '\"123456\"') || '{\"comision_pct\": 3.5}' where clave = 'pagos'");
    await t.sim.crearUsuario('nuevo@x.cl', 'clave123');
    // usuario nuevo → bloqueado
    const { page: q } = await t.nuevo();
    await q.goto(t.base + '/'); await q.fill('input[type=email]', 'nuevo@x.cl'); await q.fill('input[type=password]', 'clave123'); await q.press('input[type=password]', 'Enter');
    await q.waitForURL(/app/); await q.waitForTimeout(2500);
    assert(await q.locator('.cfx-pago').count() === 1, 'pantalla de activación');
    assert(await q.locator('.cfx-pago [data-x]').count() === 0, 'no se puede cerrar');
    assert(/5\.072/.test(await q.locator('#cpMonto').innerText()), 'monto con comisión 3,5% = $5.072 → ' + await q.locator('#cpMonto').innerText());
    await t.foto('gate', q); assert(await t.anchoOk(q), 'ancho gate');
    await q.click('.cfx-pago [data-m=transferencia]'); await q.waitForTimeout(200);
    assert(/4\.900/.test(await q.locator('#cpMonto').innerText()), 'transferencia sin comisión');
    await q.setInputFiles('#cpFoto', IMG); await q.waitForTimeout(800);
    await q.click('.cfx-pago [data-enviar]'); await q.waitForTimeout(1200);
    assert(/Recibido/.test(await q.locator('.cfx-pago').innerText()), 'comprobante enviado');
    const g = (await t.sim.su("select periodo, monto, medio, length(comprobante) l from cfx_pagos"))[0];
    assert(g.periodo === 'inicio' && g.monto === 4900 && g.medio === 'transferencia' && g.l > 1000, 'pago guardado ' + JSON.stringify(g));
    // admin aprueba desde Pagos
    await p.goto(t.base + '/'); await p.fill('input[type=email]', 'juanjosuecastilloloyola@gmail.com'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800); await t.sinModales();
    await p.goto(t.base + '/admin/#pagos'); await p.waitForTimeout(5000); await t.sinModales();
    const cards = await p.locator('#pgLista [data-ok]').count();
    assert(cards >= 1, 'pago por revisar en la lista central (' + cards + ')');
    await t.foto('pagos'); assert(await t.anchoOk(), 'ancho pagos');
    await p.locator('#pgLista [data-ok]').first().click(); await p.waitForTimeout(300); await p.click('dialog #pk'); await p.waitForTimeout(1500);
    const u = (await t.sim.su("select premium_hasta > now() + interval '29 days' ok from perfiles where email='nuevo@x.cl'"))[0];
    assert(u.ok, 'premium 30 días');
    assert((await t.sim.su("select comprobante is null c, estado from cfx_pagos"))[0].c, 'comprobante borrado al aprobar');
    // cambiar precios desde el panel
    await p.fill('#pgCfg [data-k="cliente.mensual"]', '3500'); await p.click('#pgGuardar'); await p.waitForTimeout(2500);
    const cm = (await t.sim.su("select valor #>> '{cliente,mensual}' v from cfx_config where clave = 'pagos'"))[0].v;
    assert(cm === '3500', 'precio guardado ' + cm);
    // usuario ya no bloqueado
    await q.reload(); await q.waitForTimeout(2500);
    assert(await q.locator('.cfx-pago').count() === 0, 'ya no bloqueado');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.filter((x) => !/raw\.githubusercontent|Failed to load resource|ERR_|db_version/.test(x)).join('\n') || 'ninguno');
  await t.cerrar();
})();
