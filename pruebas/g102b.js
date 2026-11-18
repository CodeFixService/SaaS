// G102 b · 💲 TARIFA CHILEXPRESS EN EL CARRITO (Despega): Ajustes → Despacho → Resto de Chile = "💲 Tarifa Chilexpress".
//   El cliente escribe su comuna y ve el costo antes de pedir; el servidor cobra esa tarifa (caché 12 h, tope 120/h, respaldo si Chilexpress no responde).
// FALLA con el código viejo (no existe despacho_cotizar ni el modo 'courier'). Uso: ANCHO=320 node g102b.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const CX = 'https://services.wschilexpress.com';
const LLAVE = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g102b', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g102b'); const su = t.sim.su, como = comoDe(su), p = t.page;
  try {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.crearUsuario('otra@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Otra' });
    await su('update public.profiles set terms_at = now()');
    await su("update public.profiles set slug = 'ana', telefono = '56912345678' where id = $1", [u.id]);
    await su("insert into public.catalog_items (owner_id, client_key, nombre, precio, categoria, stock) values ($1, 'cafe', 'Café 1 kg', 11900, 'Café', 20)", [u.id]);
    await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
    const CFG = { retiro: true, gratis_desde: 0, zonas: [{ comuna: 'Ñuñoa', precio: 2500 }], resto: { modo: 'courier', precio: 0 } };
    ok(/conecta 🚚 Courier/.test(await falla(() => como('otra@x.cl', 'public.guardar_despacho($2)', [CFG])) || ''), 'Sin 🚚 Courier conectado: no deja elegir la tarifa Chilexpress (aviso claro)');
    await como('tienda@x.cl', "public.cfx_modulo_probar('courier')");
    await su("insert into extensions.http_respuestas values ($1, 200, $2), ($3, 200, $4), ($5, 200, $6), ($7, 200, $8)", [
      CX + '/georeference/api/v1.0/regions', JSON.stringify({ regions: [{ regionId: 'RM' }, { regionId: 'R9' }] }),
      CX + '/georeference/api/v1.0/coverage-areas?RegionCode=RM%', JSON.stringify({ coverageAreas: [{ countyCode: 'NUNO', countyName: 'ÑUÑOA' }] }),
      CX + '/georeference/api/v1.0/coverage-areas?RegionCode=R9%', JSON.stringify({ coverageAreas: [{ countyCode: 'TEMU', countyName: 'TEMUCO' }] }),
      CX + '/rating/api/v1.0/rates/courier', JSON.stringify({ data: { courierServiceOptions: [{ serviceTypeCode: 2, serviceDescription: 'PRIORITARIO', serviceValue: '5990' }, { serviceTypeCode: 3, serviceDescription: 'DIA HABIL SIGUIENTE', serviceValue: '4990' }] } })]);
    await como('tienda@x.cl', 'public.courier_guardar($2)', [{ llave_cot: LLAVE, origen: 'Ñuñoa', peso: 1.5, tamano: 'mediana' }]);
    const d = await como('tienda@x.cl', 'public.guardar_despacho($2)', [CFG]);
    ok(d.resto.modo === 'courier' && d.resto.precio === 0, '✅ Despacho guardado: resto de Chile = 💲 tarifa Chilexpress');
    ok((await su("select has_function_privilege('anon', 'public.despacho_cotizar(uuid,text,numeric)', 'execute') s"))[0].s === true
      && (await su("select has_function_privilege('anon', 'public.courier_tarifa(uuid,text)', 'execute') s"))[0].s === false, '🔒 El invitado solo pregunta el costo (la tarifa interna y las llaves no se tocan)');
    // 💲 Cotizar como el carrito
    await su('delete from extensions.http_log');
    let q = (await su("select public.despacho_cotizar($1, 'Temuco', 11900) r", [u.id]))[0].r;
    ok(q.costo === 4990 && q.servicio === 'Chilexpress' && !q.por_pagar, '💲 Temuco: $4.990 (el servicio más barato de Chilexpress)');
    const cb = JSON.parse((await su("select content from extensions.http_log where uri like '%/rates/courier'"))[0].content);
    ok(cb.originCountyCode === 'NUNO' && cb.destinationCountyCode === 'TEMU' && cb.package.weight === '1.50' && cb.package.length === '30', 'Usa el peso y tamaño de siempre de la tienda (1,5 kg, mediana)');
    await su('delete from extensions.http_log');
    q = (await su("select public.despacho_cotizar($1, 'temuco', 11900) r", [u.id]))[0].r;
    ok(q.costo === 4990 && (await su('select count(*)::int n from extensions.http_log'))[0].n === 0, 'Segunda vez: sale de la caché (no vuelve a preguntar a Chilexpress)');
    q = (await su("select public.despacho_cotizar($1, 'Ñuñoa', 11900) r", [u.id]))[0].r;
    ok(q.costo === 2500 && !q.servicio, 'Comuna de la lista (Ñuñoa) mantiene su precio propio ($2.500)');
    q = (await su("select public.despacho_cotizar($1, 'Narnia', 11900) r", [u.id]))[0].r;
    ok(/no encuentra la comuna/.test(q.error || ''), 'Comuna inventada → aviso claro');
    ok(/no encontrada/.test((await su("select public.despacho_cotizar(gen_random_uuid(), 'Temuco', 0) r"))[0].r.error || ''), 'Tienda que no existe → rechazada');
    // 📱 Tienda pública (invitado, 320 px): ve el costo antes de pedir y el pedido lo cobra.
    for (const modo of ['light', 'dark']) {
      await p.emulateMedia({ colorScheme: modo });
      await p.goto(t.base + '/t/?s=ana'); await p.waitForTimeout(2500);
      if (modo === 'light') await p.click('[data-add="cafe"]');
      await p.click('.seg [data-t="pedido"]'); await p.waitForTimeout(600);
      await p.click('[data-e="despacho"]'); await p.selectOption('#dComuna', '__otra'); await p.selectOption('#dRegion', 'La Araucanía');
      await p.fill('#dOtra', 'Temuco'); await p.waitForTimeout(1800);
      const tx = await p.textContent('#dCosto');
      ok(/Chilexpress/.test(tx) && /4\.990/.test(tx), modo + ': el carrito muestra "Despacho Chilexpress a Temuco: $4.990" (' + tx.trim().slice(0, 70) + ')');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), modo + ': sin desborde');
      await t.foto('g102b-carrito-' + modo, p);
    }
    await p.fill('#dOtra', 'Gotham'); await p.waitForTimeout(1800);
    ok(/no encuentra la comuna/.test(await p.textContent('#dCosto')), 'Comuna mal escrita: el carrito lo avisa antes de pedir');
    await p.fill('#dOtra', 'Temuco'); await p.waitForTimeout(300);
    await p.fill('#nom', 'Lucía'); await p.fill('#tel', '56922222222'); await p.fill('#dir', 'Av. Alemania 0345');
    await p.click('#bPedir'); await p.waitForTimeout(2000);
    let [x] = await su("select costo_despacho::int c, total::int t, comuna, lineas from public.pedidos order by created_at desc limit 1");
    ok(x && x.c === 4990 && x.t === 11900 + 4990 && x.comuna === 'Temuco' && x.lineas.some((l) => l.nombre === '🚚 Chilexpress a Temuco'), '🧾 Pedido: $4.990 de Chilexpress sumado al total (' + JSON.stringify(x && { c: x.c, t: x.t }) + ')');
    // 🛡️ Chilexpress no responde → respaldo
    await su("update extensions.http_respuestas set status = 500, content = '{}' where url_like = $1", [CX + '/rating/api/v1.0/rates/courier']);
    await su('delete from public.chx_tarifas');
    q = (await su("select public.despacho_cotizar($1, 'Temuco', 11900) r", [u.id]))[0].r;
    ok(q.costo === 0 && q.por_pagar === true, 'Chilexpress caído y respaldo $0 → envío por pagar (no bloquea)');
    const r1 = (await su("select public.crear_pedido_invitado('ana', 'Lu', '56933333333', '[{\"clave\":\"cafe\",\"cant\":1}]', 'despacho', 'Calle 1 · Región La Araucanía, Temuco', null) r"))[0].r;
    [x] = await su('select envio_por_pagar, costo_despacho::int c from public.pedidos where id = $1', [r1.id]);
    ok(r1.ok && x.envio_por_pagar === true && x.c === 0, 'El pedido queda "📦 por pagar"');
    ok(/Tarifa del carrito/.test((await su('select ultimo_error from public.courier_cuentas'))[0].ultimo_error || ''), 'La tienda ve el error en 🚚 Courier');
    await como('tienda@x.cl', 'public.guardar_despacho($2)', [Object.assign({}, CFG, { resto: { modo: 'courier', precio: 3500 } })]);
    q = (await su("select public.despacho_cotizar($1, 'Temuco', 11900) r", [u.id]))[0].r;
    ok(q.costo === 3500 && !q.por_pagar, 'Con respaldo $3.500 → cobra el respaldo');
    // Tope por hora
    await su("update extensions.http_respuestas set status = 200, content = $2 where url_like = $1", [CX + '/rating/api/v1.0/rates/courier', JSON.stringify({ data: { courierServiceOptions: [{ serviceTypeCode: 3, serviceDescription: 'DIA HABIL', serviceValue: '6100' }] } })]);
    await su('update public.courier_cuentas set cot_desde = now(), cot_n = 120'); await su('delete from extensions.http_log');
    q = (await su("select public.despacho_cotizar($1, 'Temuco', 11900) r", [u.id]))[0].r;
    ok(q.costo === 3500 && (await su('select count(*)::int n from extensions.http_log'))[0].n === 0, '🔒 Tope de 120 consultas por hora → respaldo, sin llamar a Chilexpress');
    await su("update public.courier_cuentas set cot_desde = now() - interval '2 hours'");
    q = (await su("select public.despacho_cotizar($1, 'Temuco', 11900) r", [u.id]))[0].r;
    ok(q.costo === 6100, 'Pasada la hora vuelve a cotizar ($6.100)');
    // Gratis desde
    await como('tienda@x.cl', 'public.guardar_despacho($2)', [Object.assign({}, CFG, { gratis_desde: 10000 })]);
    await su('delete from extensions.http_log');
    q = (await su("select public.despacho_cotizar($1, 'Temuco', 11900) r", [u.id]))[0].r;
    ok(q.costo === 0 && !q.por_pagar && (await su('select count(*)::int n from extensions.http_log'))[0].n === 0, '"Gratis desde $10.000" también vale para Chilexpress (sin consultar)');
    // Ajustes (dueño): la opción aparece en Despacho
    await p.emulateMedia({ colorScheme: 'light' });
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.evaluate(() => localStorage.setItem('cfx:tour:orbita-inicio', '1'));
    await p.fill('input[type=email]:visible', 'tienda@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(3000);
    await p.goto(t.base + '/#despacho'); await p.waitForTimeout(3000); await t.sinModales(p);
    ok(await p.evaluate(() => { const s = document.querySelector('#dResto'); return !!s && s.value === 'courier' && !document.querySelector('#dCourierNota').classList.contains('hidden'); }),
      'Ajustes → Despacho: "💲 Tarifa Chilexpress" elegida + nota de cómo funciona');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Ajustes sin desborde');
    await t.foto('g102b-ajustes', p);
  } catch (e) { ok(false, 'ERROR ' + e.message); }
  await t.cerrar();
  console.log(f ? '✗ ' + f + ' fallas' : '✓ TODO OK');
  process.exit(f ? 1 : 0);
})();
