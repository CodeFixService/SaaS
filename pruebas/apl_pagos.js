const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
async function entrar(t, p, email) {
  await p.goto(t.base + '/'); await p.waitForTimeout(1000);
  await p.fill('input[type=email]:visible', email); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
  await p.waitForTimeout(3500);
}
(async () => {
  const t = await abrir('/home/user/Aplicaciones', 'p_aplicaciones', { conCobro: true });
  const p = t.page;
  try {
    await t.sim.su("update public.cfx_config set valor = jsonb_set(valor, '{transferencia,numero}', '\"999\"') where clave = 'pagos'");
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Pepe','client',$1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await t.sim.su("update public.profiles set terms_at = now()");
    await entrar(t, p, 'tienda@x.cl');
    assert(await p.locator('dialog.cfx-pago').count() === 1, 'tienda nueva bloqueada');
    assert(/4\.900/.test(await p.locator('#cpMonto').innerText()), 'primer pago 4.900');
    await t.foto('gate');
    await t.sim.su("insert into public.cfx_exentos (cuenta) values ($1)", [u.id]);
    await p.reload(); await p.waitForTimeout(3500);
    assert(await p.locator('dialog.cfx-pago').count() === 0, 'exenta: entra');
    const { page: q } = await t.nuevo();
    await entrar(t, q, 'cli@x.cl');
    await q.goto(t.base + '/#plan'); await q.waitForTimeout(2500); await t.sinModales(q);
    assert(/3\.000/.test(await q.locator('#proPrecio').innerText()), 'cliente ve $3.000');
    await q.click('#bPagarPro'); await q.waitForTimeout(1000);
    const txt = await q.locator('dialog.cfx-pago').innerText();
    assert(/3\.000/.test(txt) && /29\.900/.test(txt), 'hoja de pago cliente');
    await t.foto('cliente', q); assert(await t.anchoOk(q), 'ancho');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.join('\n') || 'ninguno');
  await t.cerrar();
})();
