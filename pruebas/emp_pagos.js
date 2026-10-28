const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  const t = await abrir('/home/user/emprendedor', 'p_emprendedor', { conCobro: true });
  const p = t.page;
  try {
    await t.sim.su("update public.cfx_config set valor = jsonb_set(valor, '{link}', '\"https://mpago.la/x\"') where clave = 'pagos'");
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123');
    const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]);
    await c.query('select public.aceptar_terminos()'); await c.query("select public.crear_negocio('Almacén Ana','almacen',true)"); c.release();
    await p.goto(t.base + '/#ingresar'); await p.waitForTimeout(800);
    await p.fill('input[type=email]', 'dueno@x.cl'); await p.fill('input[type=password]', 'clave123'); await p.press('input[type=password]', 'Enter');
    await p.waitForTimeout(3500);
    assert(await p.locator('dialog.cfx-pago').count() === 1, 'billetera nueva bloqueada');
    await t.foto('gate'); assert(await t.anchoOk(), 'ancho');
    await p.setInputFiles('#cpFoto', __dirname + '/comprobante.png'); await p.waitForTimeout(600);
    await p.click('.cfx-pago [data-enviar]'); await p.waitForTimeout(1200);
    assert((await t.sim.su("select count(*)::int n from cfx_pagos where estado='pendiente'"))[0].n === 1, 'pago pendiente');
    // aprobar como admin por SQL (lo mismo que hace el Centro de Mando)
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123'); await t.sim.su('select privado.fijar_admin()');
    const adm = (await t.sim.su("select id from auth.users where email like 'juan%'"))[0].id;
    const id = (await t.sim.su("select id from cfx_pagos"))[0].id;
    const r = await t.sim.rpc('public', 'cfx_pago_resolver', { p_id: id, p_aprobar: true }, { sub: adm });
    assert(r.dias === 30, 'aprobado 30 días');
    assert((await t.sim.su("select privado.estado_plan(id) e from negocios"))[0].e === 'pro', 'billetera en Pro');
    await p.reload(); await p.waitForTimeout(3000); await t.sinModales();
    assert(await p.locator('dialog.cfx-pago').count() === 0, 'ya no bloqueada');
    await p.goto(t.base + '/app/#plan'); await p.waitForTimeout(2000); await t.sinModales();
    await t.foto('plan'); assert(/4\.900/.test(await p.locator('#vista').innerText()), 'plan muestra precio central');
    await p.click('button:has-text("Pagar Pro")'); await p.waitForTimeout(1000);
    assert(await p.locator('dialog.cfx-pago .cp-plan').count() === 4, 'mensual, varios meses, anual y otro');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.join('\n') || 'ninguno');
  await t.cerrar();
})();
