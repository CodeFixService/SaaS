const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
async function entrar(t, p, email) {
  await p.goto(t.base + '/'); await p.waitForTimeout(1000);
  await p.fill('input[type=email]:visible', email); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
  await p.waitForTimeout(3500);
}
(async () => {
  const t = await abrir('/home/user/taller', 'p_taller', { conCobro: true });
  const p = t.page;
  try {
    await t.sim.su("update public.cfx_config set valor = jsonb_set(valor, '{link}', '\"https://mpago.la/t\"') where clave = 'pagos'");
    const u = await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    const tid = (await t.sim.su('select id from talleres'))[0].id;
    await t.sim.su("insert into public.invitaciones (email, nombre, rol, taller_id) values ('cli@x.cl','Pepe','cliente',$1)", [tid]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await entrar(t, p, 'taller@x.cl');
    assert(await p.locator('dialog.cfx-pago').count() === 1, 'taller nuevo bloqueado');
    await p.setInputFiles('#cpFoto', __dirname + '/comprobante.png'); await p.waitForTimeout(600);
    await p.click('.cfx-pago [data-enviar]'); await p.waitForTimeout(1200);
    const adm = await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    const id = (await t.sim.su("select id from cfx_pagos"))[0].id;
    await t.sim.rpc('public', 'cfx_pago_resolver', { p_id: id, p_aprobar: true }, { sub: adm.id });
    assert((await t.sim.su("select premium_hasta > now() + interval '29 days' ok from talleres"))[0].ok, 'taller Premium 30 días');
    await p.reload(); await p.waitForTimeout(3000); await t.sinModales();
    assert(await p.locator('dialog.cfx-pago').count() === 0, 'ya no bloqueado');
    await p.goto(t.base + '/taller/#mas'); await p.waitForTimeout(1500); await t.sinModales(); await p.click('#mSeg [data-m=plan]'); await p.waitForTimeout(1500);
    assert(/4\.900/.test(await p.locator('#mBody').innerText()), 'plan con precio central'); await t.foto('plan');
    const { page: q } = await t.nuevo();
    await entrar(t, q, 'cli@x.cl');
    await q.goto(t.base + '/cliente/#plan'); await q.waitForTimeout(2500); await t.sinModales(q);
    await q.click('[data-v=plan]').catch(() => {}); await q.waitForTimeout(1500);
    await q.click('#pPagar'); await q.waitForTimeout(800);
    assert(/3\.000/.test(await q.locator('dialog.cfx-pago').innerText()), 'cliente paga 3.000'); await t.foto('cliente', q);
    assert(await t.anchoOk(q), 'ancho');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.join('\n') || 'ninguno');
  await t.cerrar();
})();
