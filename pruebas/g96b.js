// G96 b · 🏬 SUCURSALES Y BODEGAS (Despega) · 📣 PROMO DESTACADA en la app de tus clientes (núcleo: Despega, Barbería, BiciTaller).
// FALLA con el código viejo (no existen bodegas_lista, bodega_mover, cfx_promo_guardar ni las hojas #sucursales / #promos).
// Uso: ANCHO=320 node g96b.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
const PROMO = (t) => "public.cfx_promo_guardar('{\"titulo\":\"" + t + "\",\"texto\":\"Solo hoy\",\"boton\":\"Ver\",\"link\":\"https://x.cl\"}'::jsonb)";
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g96b', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g96b'); const su = t.sim.su, como = comoDe(su);
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl', 'Pepe', 'client', $1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await t.sim.crearUsuario('otra@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Otra' });
    await su('update public.profiles set terms_at = now()');
    await su("insert into public.catalog_items (owner_id, client_key, nombre, precio, categoria, stock) values ($1, 'cafe', 'Café 1 kg', 10000, 'Café', 20), ($1, 'taza', 'Taza', 5000, 'Café', 8)", [u.id]);
    await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
    const T = await como('tienda@x.cl', 'public.cfx_modulos_tienda()');
    ok(['sucursales', 'promos'].every((k) => T.modulos.some((m) => m.clave === k && m.vende && /\S/.test(m.nombre))), 'Tienda de módulos ofrece 🏬 y 📣 con nombre');
    ok(/módulo/.test(await falla(() => como('tienda@x.cl', 'public.bodegas_lista()')) || ''), '🔒 Sin módulo no hay sucursales');
    ok(/módulo/.test(await falla(() => como('tienda@x.cl', PROMO('X'))) || ''), '🔒 Sin módulo no se publican promos');
    ok((await como('tienda@x.cl', 'public.cfx_promos_mias()')).puede === false, '📣 Sin módulo la hoja dice que no puede (y muestra sus promos)');
    for (const k of ['sucursales', 'promos']) await como('tienda@x.cl', 'public.cfx_modulo_probar($2)', [k]);
    // ---------- 🏬 Sucursales ----------
    ok(!!(await falla(() => como('cli@x.cl', "public.bodega_guardar(null, 'Mall')"))), '🔒 Un cliente no crea sucursales');
    const mall = await como('tienda@x.cl', "public.bodega_guardar(null, 'Local Mall', 'Av. Uno 123')");
    let d = await como('tienda@x.cl', 'public.bodegas_lista()');
    const casa = d.bodegas.find((b) => b.principal);
    ok(d.bodegas.length === 2 && casa && casa.nombre === 'Casa matriz', '🏬 La primera sucursal crea también la principal (Casa matriz)');
    const cafe = () => d.productos.find((p) => p.clave === 'cafe');
    ok(cafe().total === 20 && cafe().principal === 20, 'Todo el stock de hoy queda en la principal (20)');
    await como('tienda@x.cl', "public.bodega_stock_fijar($2, 'cafe', 5)", [mall]);
    d = await como('tienda@x.cl', 'public.bodegas_lista()');
    ok(cafe().total === 25 && cafe().principal === 20 && cafe().en[mall] === 5, 'Contar 5 en el Mall: total 25, principal sigue en 20');
    await como('tienda@x.cl', "public.bodega_mover('cafe', $2, $3, 3)", [casa.id, mall]);
    d = await como('tienda@x.cl', 'public.bodegas_lista()');
    ok(cafe().total === 25 && cafe().principal === 17 && cafe().en[mall] === 8, '⇄ Mover 3 al Mall: principal 17 · Mall 8 · total igual');
    ok(/hay 8/.test(await falla(() => como('tienda@x.cl', "public.bodega_mover('cafe', $2, $3, 50)", [mall, casa.id])) || ''), '🔒 No se mueve más de lo que hay');
    await como('tienda@x.cl', "public.caja_descontar(jsonb_build_array(jsonb_build_object('clave', 'cafe', 'cant', 2, 'bodega', $2::text)))", [mall]);
    d = await como('tienda@x.cl', 'public.bodegas_lista()');
    ok(cafe().total === 23 && cafe().en[mall] === 6 && cafe().principal === 17, '🛒 Venta en la Caja del Mall: baja en el Mall y en el total');
    await como('tienda@x.cl', "public.caja_descontar('[{\"clave\":\"cafe\",\"cant\":1}]'::jsonb)");
    d = await como('tienda@x.cl', 'public.bodegas_lista()');
    ok(cafe().total === 22 && cafe().principal === 16, 'Caja sin sucursal (como antes): baja de la principal');
    const otraB = await como('otra@x.cl', "public.cfx_modulo_probar('sucursales')").then(() => como('otra@x.cl', "public.bodega_guardar(null, 'Suya')"));
    ok(!!(await falla(() => como('tienda@x.cl', "public.bodega_stock_fijar($2, 'cafe', 1)", [otraB]))), '🔒 No se toca la sucursal de otra tienda');
    ok(/principal/.test(await falla(() => como('tienda@x.cl', 'public.bodega_borrar($2)', [casa.id])) || ''), '🔒 La principal no se borra');
    await como('tienda@x.cl', 'public.bodega_borrar($2)', [mall]);
    d = await como('tienda@x.cl', 'public.bodegas_lista()');
    ok(d.bodegas.length === 1 && cafe().total === 22 && cafe().principal === 22, '🛡️ Borrar el Mall: su stock vuelve a la principal (nada se pierde)');
    const mall2 = await como('tienda@x.cl', "public.bodega_guardar(null, 'Local Mall')");
    await como('tienda@x.cl', "public.bodega_stock_fijar($2, 'cafe', 4)", [mall2]);
    // ---------- 📣 Promo destacada ----------
    const p1 = await como('tienda@x.cl', PROMO('2x1 en café'));
    let V = await como('cli@x.cl', 'public.cfx_anuncios_ver()');
    ok(V.length === 1 && V[0].id === p1 && V[0].de === 'Tienda Ana', '📣 Su cliente ve la promo con el nombre de la tienda');
    ok((await como('otra@x.cl', 'public.cfx_anuncios_ver()')).length === 0, '🔒 Quien no es su cliente no la ve');
    ok((await como(ADM, 'public.cfx_anuncios_admin()')).length === 0, 'El CM (📣 Anuncios) no mezcla las promos de los negocios');
    ok(/https/.test(await falla(() => como('tienda@x.cl', "public.cfx_promo_guardar('{\"titulo\":\"A\",\"link\":\"javascript:alert(1)\"}'::jsonb)")) || ''), '🔒 Link solo https://');
    await como('tienda@x.cl', PROMO('B')); await como('tienda@x.cl', PROMO('C'));
    ok(/Máximo 3/.test(await falla(() => como('tienda@x.cl', PROMO('D'))) || ''), '🔒 Máximo 3 promos al aire');
    ok(!!(await falla(() => como('otra@x.cl', 'public.cfx_promo_borrar($2)', [p1]))) || (await su('select count(*) n from public.cfx_anuncios where id = $1', [p1]))[0].n == 1, '🔒 Otra tienda no borra la promo');
    await como('cli@x.cl', "public.cfx_anuncio_marcar($2, 'vista')", [p1]); await como('cli@x.cl', "public.cfx_anuncio_marcar($2, 'clic')", [p1]);
    let M = await como('tienda@x.cl', 'public.cfx_promos_mias()');
    const m1 = M.lista.find((x) => x.id === p1);
    ok(M.puede && M.lista.length === 3 && +m1.vistas === 1 && +m1.clics === 1, '📊 La tienda ve 1 vista y 1 toque');
    await su("update public.cfx_modulos_negocio set hasta = now() - interval '1 minute' where modulo = 'promos'");
    ok((await como('cli@x.cl', 'public.cfx_anuncios_ver()')).length === 0, '⌛ Al vencer el módulo la promo deja de salir');
    M = await como('tienda@x.cl', 'public.cfx_promos_mias()');
    ok(!M.puede && M.lista.length === 3, '🛡️ …pero sus promos y números siguen a la vista');
    await su("update public.cfx_modulos_negocio set hasta = now() + interval '7 days' where modulo = 'promos'");

    // ---------- 📱 Pantalla (320 px) ----------
    const { page: p } = await t.nuevo();
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'tienda@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(p);
    const hoja = async (h, re, nombre) => {
      await p.goto(t.base + '/#' + h); await p.reload(); await p.waitForTimeout(3500);
      const tx = await p.evaluate(() => [...document.querySelectorAll('.cfx-hoja-m')].map((x) => x.innerText).join(' '));
      const ancho = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
      ok(re.test(tx) && ancho, 'Más → ' + nombre + ' se abre y cabe (' + tx.replace(/\s+/g, ' ').slice(0, 80) + ')');
      await p.screenshot({ path: __dirname + '/capturas/aplicaciones/g96b_' + h + '.png' }).catch(() => {});
    };
    await hoja('sucursales', /Casa matriz[\s\S]*Local Mall[\s\S]*Mover/, '🏬 Sucursales');
    await p.fill('.cfx-hoja-m #gxBn', 'Bodega Sur'); await p.click('.cfx-hoja-m [data-gx=bodega]'); await p.waitForTimeout(1500);
    ok(/Bodega Sur/.test(await p.evaluate(() => document.querySelector('.cfx-hoja-m').innerText)), '🏬 Agregar sucursal desde la hoja');
    await hoja('promos', /2x1 en café[\s\S]*1 la vieron/, '📣 Promo destacada');
    await p.fill('.cfx-hoja-m #cfxPrT', 'Nueva'); await p.click('.cfx-hoja-m [data-pr=guardar]'); await p.waitForTimeout(1500);
    ok(/Máximo 3/.test(await p.evaluate(() => document.querySelector('.cfx-hoja-m .cfx-pr-msg').innerText)), '📣 La 4.ª promo muestra el aviso del servidor (sin diálogo de Chrome)');
    await p.goto(t.base + '/apps/caja/'); await p.waitForTimeout(3500); await t.sinModales(p);
    const op = await p.evaluate(() => !document.getElementById('rowSucursal').hidden && [...document.querySelectorAll('#sucursal option')].map((o) => o.textContent).join(','));
    ok(/Casa matriz,Local Mall/.test(op || ''), 'Caja: aparece 🏬 "Vendes desde" con las sucursales (' + op + ')');
    await p.screenshot({ path: __dirname + '/capturas/aplicaciones/g96b_caja.png' }).catch(() => {});
    // Cliente: la tarjeta aparece sola al abrir la app
    await su("update public.cfx_anuncios set activo = false where titulo in ('B', 'C')");
    const { page: q } = await t.nuevo();
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.fill('input[type=email]:visible', 'cli@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter');
    await q.waitForTimeout(3000); await t.sinModales(q);
    await q.waitForSelector('.cfx-anuncio', { timeout: 15000 }).catch(() => {});
    const card = await q.evaluate(() => { const a = document.querySelector('.cfx-anuncio'); return a ? a.innerText : ''; });
    ok(/Tienda Ana/.test(card) && /2x1 en café/.test(card), 'Cliente: ve la tarjeta 📣 Tienda Ana · 2x1 en café');
    await q.screenshot({ path: __dirname + '/capturas/aplicaciones/g96b_cliente.png' }).catch(() => {});
    ok(!t.errores.filter((e) => !/favicon|404|Máximo 3|status of 400/.test(e)).length, 'Sin errores en la consola ' + t.errores.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'Error: ' + (e.stack || e).toString().slice(0, 400)); }
  await t.cerrar();

  // ---------- 📣 Barbería y BiciTaller (servidor: sus clientes ven la promo) ----------
  for (const [repo, nombre, crear, cliente, otro] of [
    ['barberia', 'Barbería', (t) => t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'barberia', barberia: 'Barbería Juan', nombre: 'Juan', telefono: '+56912345671' }),
      async (t) => t.sim.crearUsuario('cli@x.cl', 'clave123', { rol: 'cliente', barberia: (await t.sim.su('select codigo from public.barberias limit 1'))[0].codigo, nombre: 'Pepe', telefono: '+56912345672' }),
      (t) => t.sim.crearUsuario('nadie@x.cl', 'clave123', { rol: 'barberia', barberia: 'Otra', nombre: 'Leo', telefono: '+56912345673' })],
    ['taller', 'BiciTaller', (t) => t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Sur', nombre: 'Ana' }),
      async (t) => t.sim.crearUsuario('cli@x.cl', 'clave123', { rol: 'cliente', nombre: 'Pepe', taller: (await t.sim.su('select id from public.talleres limit 1'))[0].id }),
      (t) => t.sim.crearUsuario('nadie@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Otro', nombre: 'Leo' })]]) {
    execSync(__dirname + '/base.sh /home/user/' + repo + ' p_g96b_' + repo, { stdio: 'ignore' });
    const t = await abrir('/home/user/' + repo, 'p_g96b_' + repo); const su = t.sim.su, como = comoDe(su);
    try {
      await t.sim.crearUsuario(ADM, 'admin123'); await crear(t); await cliente(t);
      await otro(t);
      await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
      ok(/módulo/.test(await falla(() => como('dueno@x.cl', PROMO('Promo'))) || ''), nombre + ': 🔒 sin módulo no se publica');
      await como('dueno@x.cl', "public.cfx_modulo_probar('promos')");
      await como('dueno@x.cl', PROMO('20% en mantención'));
      const V = await como('cli@x.cl', 'public.cfx_anuncios_ver()');
      ok(V.length === 1 && /Barbería Juan|Bici Sur/.test(V[0].de), nombre + ': 📣 su cliente ve la promo (' + (V[0] && V[0].de) + ')');
      ok((await como('nadie@x.cl', 'public.cfx_anuncios_ver()')).length === 0, nombre + ': 🔒 otro no la ve');
      ok(!!(await falla(() => como('cli@x.cl', PROMO('X')))), nombre + ': 🔒 un cliente no publica promos');
    } catch (e) { ok(false, nombre + ' error: ' + (e.stack || e).toString().slice(0, 300)); }
    await t.cerrar();
  }
  console.log(f ? '✗ ' + f + ' fallaron' : '✓ todo bien'); process.exit(f ? 1 : 0);
})();
