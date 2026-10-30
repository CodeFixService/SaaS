// Ronda 2 en el navegador (360 px): 🛟 ayuda (guía, chat, términos), hoja de pago nueva (copiar cada dato, tarjeta, varios meses,
// cargo online visible), despacho por comuna en Órbita y la bandeja de Mensajes del Centro de Mando.
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
async function entrar(t, p, email) {
  await p.goto(t.base + '/'); await p.waitForTimeout(1000);
  await p.fill('input[type=email]:visible', email); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
  await p.waitForTimeout(3500);
}
(async () => {
  let t = await abrir('/home/user/Aplicaciones', 'p_aplicaciones');
  let p = t.page;
  try {
    await t.sim.su(`update public.cfx_config set valor = valor || '{"link":"https://mpago.la/x","comision_pct":3.5,"tarjeta":{"link":"https://flow.cl/x","comision_pct":4}}'::jsonb
      || jsonb_build_object('transferencia', '{"banco":"BancoEstado","tipo":"Cuenta RUT","numero":"12345678","rut":"12.345.678-5","titular":"Juan","correo":"j@x.cl"}'::jsonb) where clave = 'pagos'`);
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Pepe','client',$1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await t.sim.su("update public.profiles set terms_at = now()");
    await t.sim.su("insert into public.catalog_items (owner_id, client_key, nombre, precio) values ($1, 'k1', 'Vaso', 10000)", [u.id]);
    await t.sim.su("update public.profiles set slug = 'ana' where id = $1", [u.id]);
    await entrar(t, p, 'tienda@x.cl'); await t.sinModales();
    // 🛟 Ayuda
    await p.waitForSelector('.cfx-cab .cfx-av', { timeout: 8000 });
    assert(/\d/.test(await p.locator('.cfx-av i').innerText()), 'foto con pendientes');
    assert(await p.locator('header .cfx-cab [data-cfx-campana]').count() === 1, 'una sola campana');
    assert(/^(PRO|FREE)$/.test(await p.locator('.cfx-plan').innerText()), 'insignia del plan');
    await p.click('.cfx-av'); await p.waitForTimeout(400);
    assert(await p.locator('dialog.cfx-ayuda .ca-op').count() === 1 && await p.locator('dialog.cfx-ayuda [data-a=salir]').count() === 1, 'menú de la foto: solo Cerrar sesión');
    assert(await p.evaluate(() => !!document.querySelector('.cfx-cab').closest('header, .top, .cab')), 'cabecera arriba en el encabezado');
    await p.click('dialog.cfx-ayuda [data-a=salir]'); await p.waitForTimeout(300);
    assert(/¿Cerrar sesión\?/.test(await p.locator('dialog.cfx-ayuda').innerText()), 'cerrar sesión pide confirmar');
    await p.click('dialog.cfx-ayuda [data-cerrar]');
    // Cuenta y ayuda (guía, soporte, términos…) ahora está en Más.
    await p.locator('nav.cfx-barra > *', { hasText: 'Más' }).first().click(); await p.waitForTimeout(1200); await t.sinModales();
    assert(await p.locator('.cfx-cuenta-g [data-cfx-a=chat]').count() === 1, 'Cuenta y ayuda en Más'); await t.foto('r2-mas-cuenta');
    await p.click('.cfx-cuenta-g [data-cfx-a=guia]'); await p.waitForTimeout(400);
    const g = await p.locator('dialog.cfx-ayuda').innerText();
    assert(/Te faltan 5 de 6/.test(g) && /Despacho o retiro/.test(g), 'guía con 5 de 6 pendientes');
    await t.foto('r2-guia'); assert(await t.anchoOk(), 'ancho guía');
    await p.click('dialog.cfx-ayuda [data-cerrar]'); await p.click('.cfx-cuenta-g [data-cfx-a=terminos]'); await p.waitForTimeout(300);
    assert(/19\.496/.test(await p.locator('dialog.cfx-ayuda').innerText()) && /despacho/i.test(await p.locator('dialog.cfx-ayuda').innerText()), 'términos de tienda');
    await t.foto('r2-terminos');
    await p.click('dialog.cfx-ayuda [data-cerrar]'); await p.click('.cfx-cuenta-g [data-cfx-a=chat]'); await p.waitForTimeout(800);
    await p.fill('dialog.cfx-ayuda textarea', '¿Cómo pongo mi link?'); await p.click('dialog.cfx-ayuda [data-enviar]'); await p.waitForTimeout(1000);
    assert((await t.sim.su("select count(*)::int n from public.cfx_chat where de = 'persona'"))[0].n === 1, 'mensaje de soporte guardado');
    assert(await p.locator('dialog.cfx-ayuda .ca-m.yo').count() === 1, 'mensaje en pantalla');
    await t.foto('r2-chat'); assert(await t.anchoOk(), 'ancho chat');
    await p.click('dialog.cfx-ayuda [data-cerrar]');
    // Hoja de pago nueva
    await p.evaluate(() => CFX_PAGOS.abrir({ rpc: (f, a) => Cuenta.rpc(f, a) })); await p.waitForTimeout(1200);
    assert(await p.locator('dialog.cfx-pago .cp-tabs button').count() === 3, 'tres formas de pago');
    assert(await p.locator('dialog.cfx-pago [data-d]').count() === 4, 'copiar cada dato (4: banco y tipo de cuenta sin copiar)');
    assert(await p.locator('dialog.cfx-pago .cp-plan').count() === 3, 'solo 1 mes, 3 meses y 1 año');
    await p.click('dialog.cfx-pago [data-d="0"]'); await p.waitForTimeout(200);
    assert(/Copiado/.test(await p.locator('dialog.cfx-pago [data-d="0"]').innerText()), 'dato copiado');
    await p.click('dialog.cfx-pago .cp-plan:has-text("3 meses")'); await p.waitForTimeout(300);
    assert(/14\.700/.test(await p.locator('#cpMonto').innerText()), '3 meses = 14.700 por transferencia');
    await p.click('dialog.cfx-pago [data-m=link]'); await p.waitForTimeout(300);
    const d = await p.locator('#cpDesglose').innerText();
    assert(/Cargo por pago online \(3,5 %\)/.test(d) && /15\.215/.test(d), 'cargo online visible: 14.700 + 515 = 15.215');
    await p.click('dialog.cfx-pago [data-m=tarjeta]'); await p.waitForTimeout(300);
    assert(/15\.288/.test(await p.locator('#cpMonto').innerText()), 'tarjeta 4 %: 15.288');
    await t.foto('r2-pago'); assert(await t.anchoOk(), 'ancho pago');
    await p.setInputFiles('#cpFoto', __dirname + '/comprobante.png'); await p.waitForTimeout(1200);
    await p.click('dialog.cfx-pago [data-enviar]'); await p.waitForTimeout(1500);
    const pg = (await t.sim.su("select periodo, meses, medio, monto from public.cfx_pagos"))[0];
    assert(pg.periodo === 'meses' && pg.meses === 3 && pg.medio === 'tarjeta' && pg.monto === 15288, 'pago de 3 meses con tarjeta guardado');
    await p.evaluate(() => CFX_PAGOS.cerrar());
    // Despacho: la tienda configura comunas
    await p.goto(t.base + '/#despacho'); await p.waitForTimeout(2500); await t.sinModales();
    await p.click('#dMas'); await p.locator('[data-c="0"]').fill('Ñuñoa'); await p.locator('[data-p="0"]').fill('2500');
    await p.click('#dGuardar'); await p.waitForTimeout(1200);
    assert((await t.sim.su("select despacho -> 'zonas' -> 0 ->> 'precio' v from public.profiles where id = $1", [u.id]))[0].v === '2500', 'despacho guardado');
    await t.foto('r2-despacho-ajustes'); assert(await t.anchoOk(), 'ancho ajustes despacho');
    // Cliente: tienda pública con comuna
    const { page: q } = await t.nuevo();
    await q.goto(t.base + '/t/?s=ana'); await q.waitForTimeout(2500);
    await q.locator('[data-add]').first().click(); await q.waitForTimeout(300); await q.click('#bVer'); await q.waitForTimeout(400);
    await q.click('[data-e=despacho]'); await q.waitForTimeout(300);
    assert(await q.locator('#dComuna').count() === 1, 'cliente elige comuna');
    await q.selectOption('#dComuna', 'Ñuñoa'); await q.waitForTimeout(200);
    assert(/2\.500/.test(await q.locator('#dCosto').innerText()), 've costo de despacho');
    await t.foto('r2-despacho-cliente', q); assert(await t.anchoOk(q), 'ancho tienda');
    await q.fill('#nom', 'Pepe'); await q.fill('#tel', '56912345678'); await q.fill('#dir', 'Los Aromos 123'); await q.click('#bPedir'); await q.waitForTimeout(2000);
    const pd = (await t.sim.su("select total::int t, costo_despacho::int c, direccion from public.pedidos"))[0];
    assert(pd && pd.t === 12500 && pd.c === 2500 && /Ñuñoa$/.test(pd.direccion), 'pedido con despacho: 10.000 + 2.500');
  } catch (e) { console.log(e.message); await t.foto('r2-error'); }
  console.log('ERRORES:', t.errores.join('\n') || 'ninguno');
  await t.cerrar();

  // Centro de Mando: bandeja de Mensajes
  t = await abrir('/home/user/saas', 'p_saas'); p = t.page;
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    const a = await t.sim.crearUsuario('ana@x.cl', 'clave123');
    await t.sim.su("insert into public.cfx_chat (cuenta, email, nombre, rol, de, texto) values ($1, 'ana@x.cl', 'Ana', 'negocio', 'persona', 'Hola soporte')", [a.id]);
    await p.goto(t.base + '/'); await p.fill('input[type=email]', 'juanjosuecastilloloyola@gmail.com'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800); await t.sinModales();
    await p.goto(t.base + '/admin/#mensajes'); await p.waitForTimeout(4000); await t.sinModales();
    assert(/1 sin leer/.test(await p.locator('#v-mensajes').innerText()), 'bandeja con 1 sin leer');
    await t.foto('r2-cm-mensajes'); assert(await t.anchoOk(), 'ancho mensajes');
    await p.click('#v-mensajes [data-i="0"]'); await p.waitForTimeout(1200);
    await p.fill('dialog [data-t]', 'Hola Ana, te ayudo'); await p.click('dialog [data-r]'); await p.waitForTimeout(1200);
    assert((await t.sim.su("select count(*)::int n from public.cfx_chat where de = 'soporte'"))[0].n === 1, 'respuesta guardada');
    await t.foto('r2-cm-hilo');
    await p.goto(t.base + '/admin/#pagos'); await p.waitForTimeout(4000); await t.sinModales();
    assert(await p.locator('#lbSi').count() === 1 && await p.locator('[data-k="tarjeta.link"]').count() === 1, 'pagos: liberar y tarjeta');
    await t.foto('r2-cm-pagos'); assert(await t.anchoOk(), 'ancho pagos');
    // Hoy y Tablero separados
    await p.goto(t.base + '/app/#tablero'); await p.waitForTimeout(3000); await t.sinModales();
    await p.fill('#tkIn', 'Tarea del tablero'); await p.press('#tkIn', 'Enter'); await p.waitForTimeout(1200);
    await p.goto(t.base + '/app/#hoy'); await p.waitForTimeout(2500); await t.sinModales();
    const h = await p.locator('#v-hoy').innerText();
    assert(!/Tarea del tablero/.test(h) && /1 por hacer/.test(h), 'Hoy no mezcla el tablero (solo un resumen)');
    await t.foto('r2-cm-hoy');
  } catch (e) { console.log(e.message); await t.foto('r2-error'); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource: the server responded with a status of 404/.test(x)).join('\n') || 'ninguno');  // 404: las otras 5 apps no se simulan aquí
  await t.cerrar();
})();
