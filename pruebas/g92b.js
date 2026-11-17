// G92 b · 🧾 Boleta SII del núcleo (nucleo/sql/boleta.sql + boleta.js): BiciTaller (Más → 🧾 Boleta SII; ⚡ automática al cobrar con
// OpenFactura; manual = N° del SII) y Barbería (Caja → corte → 🧾 Boleta SII, solo el dueño). Montos desde la base.
// FALLA con el código viejo (no existen cfx_boleta_*, taller_caja_boleta_sii, bar_caja_boleta). Uso: node g92b.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const OF = 'https://api.haulmer.com/v2/dte/document';
const como = (su) => (email, sql, args) => su("select " + sql + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])).then((x) => x[0].r);
const err = async (pr) => { try { await pr; return ''; } catch (e) { return e.message; } };
const entrar = async (t, p, email, clave) => {
  await p.goto(t.base + '/'); await p.waitForTimeout(1200);
  await p.fill('input[type=email]:visible', email); await p.fill('input[type=password]:visible', clave); await p.press('input[type=password]:visible', 'Enter');
  await p.waitForTimeout(4500); await t.sinModales(p);
  const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
  await t.sinModales(p);
};
(async () => {
  // ================= 🚲 BiciTaller =================
  execSync(__dirname + '/base.sh /home/user/taller p_g92b', { stdio: 'ignore' });
  let t = await abrir('/home/user/taller', 'p_g92b'); let p = t.page, su = t.sim.su, C = como(su);
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    ok((await C('taller@x.cl', 'public.cfx_boleta_estado()')).puede === true, 'estado: el dueño puede');
    ok(/RUT no válido/.test(await err(C('taller@x.cl', `public.cfx_boleta_guardar('{"rut":"11.111.111-2","razon":"Bici Ana SpA","giro":"Taller","direccion":"Calle 1","comuna":"Ñuñoa"}')`))), '🔒 RUT con dígito malo se rechaza');
    await C('taller@x.cl', `public.cfx_boleta_guardar('{"rut":"11.111.111-1","razon":"Bici Ana SpA","giro":"Taller","direccion":"Calle 1","comuna":"Ñuñoa"}')`);
    await C('taller@x.cl', `public.taller_caja_vender('[{"nombre":"Cámara 29","cant":2,"precio":5000}]', 'efectivo', 'Pedro')`);
    const kid = (await su('select id from public.caja'))[0].id;
    ok((await C('taller@x.cl', 'public.taller_caja_boleta_sii($2)', [kid])).manual === true, '✍️ manual: pide el N° del SII');
    await C('taller@x.cl', "public.taller_caja_boleta_sii($2, '88')", [kid]);
    ok((await su('select boleta from public.caja where id = $1', [kid]))[0].boleta === '88', '✍️ N° 88 anotado en el cobro');
    ok(/Sin acceso/.test(await err(su('select public.taller_caja_boleta_sii($1)', [kid]))), '🔒 sin sesión no se emite');
    // ⚡ OpenFactura: sale sola al cobrar (stub http)
    await su("insert into extensions.http_respuestas values ($1, 200, '{\"FOLIO\":\"555\",\"SELF_SERVICE\":{\"url\":\"https://of.test/b/555\"}}')", [OF]);
    ok(/API key/.test(await err(C('taller@x.cl', `public.cfx_boleta_guardar('{"modo":"openfactura","rut":"11111111-1","razon":"Bici Ana SpA","giro":"Taller","direccion":"Calle 1","comuna":"Ñuñoa"}')`))), 'OpenFactura sin API key se pide');
    await C('taller@x.cl', `public.cfx_boleta_guardar('{"modo":"openfactura","apikey":"abcdEFGH1234567890xyz","rut":"11111111-1","razon":"Bici Ana SpA","giro":"Taller","direccion":"Calle 1","comuna":"Ñuñoa"}')`);
    const e2 = await C('taller@x.cl', 'public.cfx_boleta_estado()');
    ok(e2.modo === 'openfactura' && e2.fin === '0xyz' && !JSON.stringify(e2).includes('abcdEFGH'), '🔑 la API key no sale (solo 4 caracteres)');
    await C('taller@x.cl', `public.taller_caja_vender('[{"nombre":"Luz LED","cant":1,"precio":7990}]', 'tarjeta', 'Luis')`);
    const [k2] = await su("select boleta, boleta_url from public.caja where nombre = 'Luis'");
    ok(k2.boleta === '555' && k2.boleta_url === 'https://of.test/b/555', '⚡ cobro nuevo → boleta automática N° 555');
    const [b2] = await su("select total from public.cfx_boletas where folio = '555'");
    ok(+b2.total === 7990, '💲 monto desde la base (7.990)');
    // UI: Más → 🧾 Boleta SII y Caja → 🧾 con link de la boleta
    await entrar(t, p, 'taller@x.cl', 'clave123');
    await p.evaluate(() => { location.hash = 'mas'; }); await p.waitForTimeout(1500); await p.evaluate(() => { location.hash = 'mas/boleta'; }); await p.waitForTimeout(2500);
    ok(await p.locator('[data-bk=rut]:visible').count() === 1 && await p.locator('[data-bm=openfactura].on:visible').count() === 1, 'Más → 🧾 Boleta SII muestra los datos y ⚡ Automática');
    ok(await t.anchoOk(p), 'boleta SII cabe en el ancho'); await t.foto('g92b-taller-ajustes');
    await p.evaluate(() => { location.hash = 'mas/caja'; }); await p.waitForTimeout(2500);
    ok(/Boleta N° 555/.test(await p.locator('#kLista:visible').innerText()), 'el cierre muestra la boleta automática');
  } catch (x) { f++; console.log('✗ ' + x.message.split('\n')[0]); await t.foto('g92b-error').catch(() => {}); }
  const e1 = t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)); ok(!e1.length, 'BiciTaller sin errores ' + e1.slice(0, 2).join(' | '));
  await t.cerrar();

  // ================= 💈 Barbería =================
  execSync(__dirname + '/base.sh /home/user/barberia p_g92b_bar', { stdio: 'ignore' });
  t = await abrir('/home/user/barberia', 'p_g92b_bar'); p = t.page; su = t.sim.su; C = como(su);
  try {
    const d = await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'barberia', barberia: 'Barbería Ana', nombre: 'Ana', telefono: '+56912345678' });
    const [bar] = await su('select id, codigo from public.barberias');
    const b = await t.sim.crearUsuario('barbero@x.cl', 'clave123', { rol: 'cliente', barberia: bar.codigo, nombre: 'Beto', telefono: '+56912345679' });
    await su("update public.profiles set clave_temporal = false, tour_visto = true where true").catch(() => {});
    await su("update public.profiles set role = 'barber' where id = $1", [b.id]);
    const [k] = await su("insert into public.caja (barberia_id, barbero_id, servicio, monto, propina) values ($1, $2, 'Corte + barba', 15000, 2000) returning id", [bar.id, d.id]);
    ok(/Solo el dueño/.test(await err(C('barbero@x.cl', 'public.bar_caja_boleta($2)', [k.id]))), '🔒 el barbero no da boleta');
    ok(/dueño/.test(await err(C('barbero@x.cl', `public.cfx_boleta_guardar('{"rut":"11111111-1"}')`))), '🔒 el barbero no configura');
    await C('dueno@x.cl', `public.cfx_boleta_guardar('{"rut":"11111111-1","razon":"Barbería Ana SpA","giro":"Peluquería","direccion":"Calle 2","comuna":"Maipú"}')`);
    await C('dueno@x.cl', "public.bar_caja_boleta($2, '321')", [k.id]);
    const v = await C('dueno@x.cl', 'public.bar_caja_boleta_ver($2)', [k.id]);
    const [bb] = await su('select total from public.cfx_boletas');
    ok(v && v.folio === '321' && +bb.total === 17000, '✍️ corte con boleta N° 321 por $17.000 (servicio + propina)');
    // UI: Caja → corte → 🧾 Boleta SII
    await entrar(t, p, 'dueno@x.cl', 'clave123');
    ok(await p.evaluate(() => !!window.CFX_BOLETA), 'boleta.js cargado en el panel');
    await p.evaluate(() => { location.hash = 'mas'; }); await p.waitForTimeout(1500);
    const fila = p.locator('.cfx-fila', { hasText: 'Boleta SII' }).first();
    ok(await fila.count() === 1, 'Más → 🧾 Boleta SII (dueño)');
    if (await fila.count()) { await fila.click(); await p.waitForTimeout(1500); ok(await p.locator('[data-bk=razon]:visible').inputValue() === 'Barbería Ana SpA', 'muestra los datos guardados'); ok(await p.locator('[data-bm]:visible').evaluateAll((l) => l.every((b) => b.offsetHeight < 110 && b.offsetWidth > 100)), 'botones Manual/Automática bien formados'); await t.foto('g92b-bar-ajustes'); }
  } catch (x) { f++; console.log('✗ ' + x.message.split('\n')[0]); await t.foto('g92b-bar-error').catch(() => {}); }
  const e3 = t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)); ok(!e3.length, 'Barbería sin errores ' + e3.slice(0, 2).join(' | '));
  await t.cerrar();
  console.log(f ? '✗ ' + f + ' fallas' : '✓ todo ok'); process.exit(f ? 1 : 0);
})();
