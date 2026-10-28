const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  const t = await abrir('/home/user/estacionamiento', 'p_estacionamiento', { conCobro: true });
  const p = t.page;
  try {
    await t.sim.su("update public.cfx_config set valor = jsonb_set(valor, '{link}', '\"https://mpago.la/e\"') where clave = 'pagos'");
    await t.sim.crearUsuario('b@x.cl', 'clave123');
    await t.sim.su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = 'Bea'");
    await p.goto(t.base + '/#/premium'); await p.waitForTimeout(1500);
    assert(/3\.000/.test(await p.locator('#prPrecio').innerText()), 'premium muestra precio cliente (anónimo)');
    await p.goto(t.base + '/#/avisos'); await p.waitForTimeout(1200);
    await p.click('button[data-t=in]'); await p.fill('#lEmail', 'b@x.cl'); await p.fill('#lClave', 'clave123'); await p.press('#lClave', 'Enter');
    await p.waitForTimeout(2500); await t.sinModales();
    await p.goto(t.base + '/#/publicar'); await p.waitForTimeout(2500);
    assert(await p.locator('dialog.cfx-pago').count() === 1, 'pide primer pago al publicar');
    assert(/4\.900/.test(await p.locator('#cpMonto').innerText()), 'primer pago 4.900');
    await t.foto('gate');
    await p.click('dialog.cfx-pago [data-salir]'); await p.waitForTimeout(800);
    assert(!/publicar/.test(p.url()), 'Volver sale de publicar');
    await p.goto(t.base + '/#/premium'); await p.waitForTimeout(1500);
    await p.click('#prComprar'); await p.waitForTimeout(800);
    assert(await p.locator('dialog.cfx-pago .cp-plan').count() >= 2, 'hoja premium'); await t.foto('premium'); assert(await t.anchoOk(), 'ancho');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.join('\n') || 'ninguno');
  await t.cerrar();
})();
