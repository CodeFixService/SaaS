// G128 b · ganchos de cobro en las apps con reservas/arriendos (núcleo CFX_COBRO.sinMedios con titulo/texto).
//   💈 Barbería: pide abono y no tiene cómo cobrarlo → ⚠️ "Tus clientes no pueden reservar online" arriba en Inicio (la base bloquea reservar).
//   🅿️ Estaciona: sin link/🏦/⚡/💳 → ⚠️ en Mis estacionamientos · 🏦 solo datos de banco ya cuenta como medio y el arrendatario los ve.
//   🚲 BiciTaller: la orden con cliente con cuenta trae 💬 Chat (el mismo chat de Mensajes; no se duplica).
// FALLA con el código viejo (no hay .cfx-sinmedio en Barbería/Estaciona ni #dChat en la orden; _cobro_listo ignoraba los datos de banco).
// Uso: ANCHO=320 node g128b.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
const sinScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const aviso = (p) => p.evaluate(() => { const x = [...document.querySelectorAll('.cfx-sinmedio')].find((y) => y.offsetParent); return x ? x.innerText.replace(/\s+/g, ' ') : ''; });
const errs = (t) => t.errores.filter((m) => !/favicon|404|status of 400/.test(m));
const entrar = async (p, base, url, email, sel, tab) => {
  await p.goto(base + url); await p.waitForTimeout(1500); if (tab) { await p.click(tab); await p.waitForTimeout(300); }
  const e = sel ? sel[0] : 'input[type=email]:visible', c = sel ? sel[1] : 'input[type=password]:visible';
  await p.fill(e, email); await p.fill(c, 'clave123'); await p.press(c, 'Enter'); await p.waitForTimeout(3500);
};
(async () => {
  process.env.ANCHO = process.env.ANCHO || '320';
  // ==================== 💈 BARBERÍA ====================
  execSync(__dirname + '/base.sh /home/user/Barberia p_g128b', { stdio: 'ignore' });
  const t = await abrir('/home/user/Barberia', 'p_g128b'); const su = t.sim.su;
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'barberia', barberia: 'Barbería Juan', nombre: 'Juan', telefono: '+56912345671' });
    await su("update public.profiles set clave_temporal = false, tour_visto = true where true").catch(() => {});
    await su("update public.barberias set abono = 5000, pago1_monto = 5000, pago1_link = null, link_pago = null, datos_transferencia = null");
    const cod = (await su('select codigo from public.barberias limit 1'))[0].codigo;
    ok(/no configura cómo recibir el abono/.test(await falla(() => su("select public.reservar_invitado($1, null, now() + interval '2 days', '{}'::uuid[], 'Pepe', '+56912345672')", [cod])) || 'x'),
      '🔒 Base: con abono y sin medio nadie reserva (por eso el aviso)');
    const { page: p } = await t.nuevo();
    await entrar(p, t.base, '/', 'dueno@x.cl'); await t.sinModales(p);
    let a = await aviso(p);
    ok(/no pueden reservar online/.test(a) && /\$5\.000/.test(a), '💈 Inicio: ⚠️ ' + a.slice(0, 90));
    ok(await sinScroll(p), '💈 320 px sin scroll horizontal');
    await p.screenshot({ path: __dirname + '/capturas/barberia/g128b_sinmedio.png', fullPage: true }).catch(() => {});
    await p.evaluate(() => { const b = [...document.querySelectorAll('.cfx-sinmedio [data-cfx-cobro-ir]')].find((y) => y.offsetParent); if (b) b.click(); }); await p.waitForTimeout(1200);
    ok(/Datos de transferencia/.test(await p.evaluate(() => document.body.innerText)), '💈 Configurar → abre 💳 Links de pago');
    await su("update public.barberias set datos_transferencia = 'Banco Estado · Cuenta RUT 12345678'");
    await p.goto(t.base + '/'); await p.waitForTimeout(3000); await t.sinModales(p);
    ok(!(await aviso(p)), '💈 Con 🏦 datos de banco: el aviso desaparece');
    await su("update public.barberias set datos_transferencia = null, abono = 0, pago1_monto = 0");
    await p.goto(t.base + '/'); await p.waitForTimeout(3000); await t.sinModales(p);
    ok(!(await aviso(p)), '💈 Sin abono (paga en el local): sin aviso');
    ok(!errs(t).length, '💈 sin errores en la consola ' + errs(t).slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'Barbería error: ' + (e.stack || e).toString().slice(0, 500)); }
  await t.cerrar();

  // ==================== 🅿️ ESTACIONA ====================
  execSync(__dirname + '/base.sh /home/user/Estacionamiento p_g128be', { stdio: 'ignore' });
  const t2 = await abrir('/home/user/Estacionamiento', 'p_g128be'); const su2 = t2.sim.su, como2 = comoDe(su2);
  try {
    const d = await t2.sim.crearUsuario('dueno@x.cl', 'clave123'); await t2.sim.crearUsuario('cliente@x.cl', 'clave123');
    await su2("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    const est = (await su2("insert into public.estacionamientos (dueno, titulo, direccion, lat, lng, precio_hora, precio_mes) values ($1,'Est G128','Calle 1',-33.44,-70.65,1000,60000) returning id", [d.id]))[0].id;
    await su2("update public.estacionamientos set estado = 'disponible' where id = $1", [est]);
    ok((await como2('dueno@x.cl', 'public.mi_cuenta()')).link_listo === false, 'Estaciona: sin medios → link_listo = false');
    const { page: p } = await t2.nuevo();
    await entrar(p, t2.base, '/#/avisos', 'dueno@x.cl', ['#lEmail', '#lClave'], 'button[data-t=in]'); await t2.sinModales(p);
    await p.goto(t2.base + '/#/mas/estacionamientos'); await p.waitForTimeout(2500);
    let a = await aviso(p);
    ok(/arrendatarios no pueden pagar en línea/.test(a), '🅿️ Mis estacionamientos: ⚠️ ' + a.slice(0, 90));
    ok(await sinScroll(p), '🅿️ 320 px sin scroll horizontal');
    await p.screenshot({ path: __dirname + '/capturas/estacionamiento/g128b_sinmedio.png', fullPage: true }).catch(() => {});
    // 🏦 Solo datos de banco (G117) = medio.
    await como2('dueno@x.cl', "public.guardar_link(1, 0, '', $2, true)", ['Banco Estado\nCuenta RUT 12345678\nBeto']);
    ok((await como2('dueno@x.cl', 'public.mi_cuenta()')).link_listo === true, 'Estaciona: 🏦 solo datos de banco ya cuenta como medio');
    await p.goto(t2.base + '/#/avisos'); await p.waitForTimeout(800); await p.reload(); await p.waitForTimeout(2500);
    await p.goto(t2.base + '/#/mas/estacionamientos'); await p.waitForTimeout(2500);
    ok(!(await aviso(p)), '🅿️ Con 🏦 datos de banco: el aviso desaparece');
    // El arrendatario ve los datos (antes: "el dueño aún no configura su link").
    const aid = await como2('cliente@x.cl', "public.solicitar_arriendo($2, 'hora', now() + interval '2 days', 2, '', null)", [est]);
    const { page: q } = await t2.nuevo();
    await entrar(q, t2.base, '/#/avisos', 'cliente@x.cl', ['#lEmail', '#lClave'], 'button[data-t=in]'); await t2.sinModales(q);
    await q.goto(t2.base + '/#/r/' + aid); await q.waitForTimeout(2500);
    const tx = await q.evaluate(() => document.body.innerText);
    ok(/Transfiere/.test(tx) && /Cuenta RUT 12345678/.test(tx) && !/aún no configura su link/.test(tx), '🅿️ Arrendatario: ve 🏦 los datos para transferir');
    ok(!!(await q.$('[data-cfx-copiar]')), '🅿️ Arrendatario: 📋 Copiar datos');
    ok(await sinScroll(q), '🅿️ arrendatario 320 px sin scroll horizontal');
    await q.screenshot({ path: __dirname + '/capturas/estacionamiento/g128b_transferencia.png', fullPage: true }).catch(() => {});
    ok(!errs(t2).length, '🅿️ sin errores en la consola ' + errs(t2).slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'Estaciona error: ' + (e.stack || e).toString().slice(0, 500)); }
  await t2.cerrar();

  // ==================== 🚲 BICITALLER ====================
  execSync(__dirname + '/base.sh /home/user/Taller p_g128bt', { stdio: 'ignore' });
  const t3 = await abrir('/home/user/Taller', 'p_g128bt'); const su3 = t3.sim.su;
  try {
    await t3.sim.crearUsuario(ADM, 'admin123');
    await t3.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Sur', nombre: 'Ana' });
    await su3('update public.perfiles set terminos_at = now()').catch(() => {});
    const T = (await su3('select id, slug from public.talleres limit 1'))[0];
    const c = await t3.sim.crearUsuario('cli@x.cl', 'clave123', { rol: 'cliente', taller: T.id, nombre: 'Pepe', telefono: '+56912345672' });
    const cid = (await su3("select id from public.perfiles where email = 'cli@x.cl'"))[0].id || c.id;
    await su3("insert into public.reservas (taller_id, fecha, hora, hora_fin, nombre, telefono, abono_monto, estado, cliente_id) values ($1, current_date, '10:00', '11:00', 'Pepe', '+56912345672', 0, 'confirmada', $2)", [T.id, cid]);
    await su3("insert into public.reservas (taller_id, fecha, hora, hora_fin, nombre, telefono, abono_monto, estado) values ($1, current_date, '12:00', '13:00', 'Sin Cuenta', '+56912345673', 0, 'confirmada')", [T.id]);
    const { page: p } = await t3.nuevo();
    await entrar(p, t3.base, '/', 'taller@x.cl'); await t3.sinModales(p);
    const abrirOrden = async (n) => { await p.evaluate((n) => { const x = [...document.querySelectorAll('[data-r]')].find((y) => y.offsetParent && y.innerText.includes(n)); if (x) x.click(); }, n); await p.waitForTimeout(1800); };
    await abrirOrden('Pepe');
    ok(!!(await p.$('#dChat')), '🚲 Orden de cliente con cuenta: botón 💬 Chat');
    await p.screenshot({ path: __dirname + '/capturas/taller/g128b_orden.png', fullPage: true }).catch(() => {});
    await p.click('#dChat'); await p.waitForTimeout(1500);
    ok(/Pepe/.test(await p.evaluate(() => { const w = document.querySelector('.chatwin'); return w ? w.innerText : ''; })), '🚲 💬 abre el chat con ese cliente');
    ok(await sinScroll(p), '🚲 320 px sin scroll horizontal');
    await p.evaluate(() => { const x = document.querySelector('.chatwin [data-x]'); if (x) x.click(); });
    await p.reload(); await p.waitForTimeout(3000); await t3.sinModales(p);
    await abrirOrden('Sin Cuenta');
    ok(!(await p.$('#dChat')) && !!(await p.$('#dLink')), '🚲 Orden sin cuenta: sin 💬 (queda 🔗 enlace y 📲 WhatsApp)');
    ok(!errs(t3).length, '🚲 sin errores en la consola ' + errs(t3).slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'BiciTaller error: ' + (e.stack || e).toString().slice(0, 500)); }
  await t3.cerrar();
  console.log(f ? '✗ ' + f + ' fallaron' : '✓ Todo OK');
  process.exit(f ? 1 : 0);
})();
