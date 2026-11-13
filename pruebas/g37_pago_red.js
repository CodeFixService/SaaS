// G37 · Pago con señal débil: si el envío del comprobante se corta, reintenta solo; si igual había llegado, muestra ✅ (sin "Ya tienes un pago en revisión").
// Con el código viejo: queda "Sin conexión con el servidor".
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
async function caso(t, email, perderRespuesta) {
  const p = t.page;
  const u = await t.sim.crearUsuario(email, 'clave123', { tipo: 'negocio', empresa: 'Tienda ' + email });
  await t.sim.su("update public.profiles set terms_at = now()");
  await p.goto(t.base + '/'); await p.waitForTimeout(1000);
  await p.fill('input[type=email]:visible', email); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
  await p.waitForTimeout(3500);
  assert(await p.locator('dialog.cfx-pago').count() === 1, email + ': pide el primer pago');
  let cortes = 0;
  await p.route(/rpc\/cfx_pago_pedir/, async (r) => {
    if (r.request().method() !== 'POST' || cortes++) return r.fallback();
    if (perderRespuesta) await t.sim.rpc('public', 'cfx_pago_pedir', JSON.parse(r.request().postData()), { sub: u.id }); // llegó, pero la respuesta se perdió
    return r.abort('internetdisconnected');
  });
  await p.setInputFiles('#cpFoto', __dirname + '/comprobante.png'); await p.waitForTimeout(600);
  await p.click('.cfx-pago [data-enviar]'); await p.waitForTimeout(5000);
  const txt = await p.locator('dialog.cfx-pago').innerText();
  await t.foto(perderRespuesta ? 'respuesta_perdida' : 'reintento');
  assert(/Recibido/.test(txt), email + ': ✅ Recibido (texto: ' + txt.slice(0, 80).replace(/\n/g, ' ') + ')');
  const n = (await t.sim.su('select count(*)::int n from cfx_pagos where cuenta = $1', [u.id]))[0].n;
  assert(n === 1, email + ': 1 solo pago (' + n + ')');
  await p.unroute(/rpc\/cfx_pago_pedir/);
  await p.evaluate(() => localStorage.clear()); await p.context().clearCookies();
}
(async () => {
  const t = await abrir('/home/user/Aplicaciones', 'p_aplicaciones', { conCobro: true });
  let mal = 0;
  try {
    await t.sim.su("update public.cfx_config set valor = jsonb_set(valor, '{transferencia,numero}', '\"999\"') where clave = 'pagos'");
    await caso(t, 'corte@x.cl', false);
    await caso(t, 'perdida@x.cl', true);
  } catch (e) { mal = 1; console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.join('\n') || 'ninguno');
  await t.cerrar(); process.exit(mal);
})();
