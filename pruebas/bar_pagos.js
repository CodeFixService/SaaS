const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
async function entrar(t, p, email) {
  await p.goto(t.base + '/'); await p.waitForTimeout(1000);
  await p.fill('input[type=email]:visible', email); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
  await p.waitForTimeout(3500);
}
(async () => {
  const t = await abrir('/home/user/barberia', 'barberia_prueba', { conCobro: true });
  const p = t.page;
  try {
    await t.sim.su("update public.cfx_config set valor = jsonb_set(valor, '{link}', '\"https://mpago.la/b\"') where clave = 'pagos'");
    await entrar(t, p, 'dueno@test.cl');
    assert(await p.locator('dialog.cfx-pago').count() === 1, 'dueño nuevo bloqueado');
    await t.foto('gate');
    const due = (await t.sim.su("select id from profiles where email='dueno@test.cl'"))[0].id;
    await t.sim.su("insert into public.cfx_exentos (cuenta) values ($1)", [due]);
    await p.goto(t.base + '/equipo/#plan'); await p.reload(); await p.waitForTimeout(3000); await t.sinModales();
    assert(await p.locator('dialog.cfx-pago').count() === 0, 'exento entra');
    const txt = await p.locator('#v-mas').innerText();
    await t.foto('plan');
    assert(/4\.900/.test(txt) || /Eres/.test(txt), 'plan con precio central o premium');
    if (await p.locator('[data-pagar]').count()) { await p.click('[data-pagar]'); await p.waitForTimeout(800); assert(await p.locator('dialog.cfx-pago .cp-plan').count() >= 2, 'hoja de pago'); }
    const { page: q } = await t.nuevo();
    await entrar(t, q, 'ana@test.cl');
    assert(await q.locator('dialog.cfx-pago').count() === 0, 'cliente no bloqueado');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.join('\n') || 'ninguno');
  await t.cerrar();
})();
