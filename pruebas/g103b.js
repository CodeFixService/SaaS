// G103 b · G38 🧾 FACTURA 33 en Despega: el comprador pide factura en la vitrina → la tienda la ve en Pedidos → OpenFactura emite TipoDTE 33.
// FALLA con el código viejo (sin "🧾 Necesito factura" ni pedido_factura_guardar). Uso: ANCHO=320 node g103b.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g103b', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g103b', { dialogo: (d) => d.type() === 'prompt' ? d.accept('4321') : d.accept() }); const su = t.sim.su, p = t.page;
  try {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await su("update public.profiles set terms_at = now()");
    await su("update public.profiles set slug = 'ana', telefono = '56912345678' where id = $1", [u.id]);
    await su("insert into public.catalog_items (owner_id, client_key, nombre, precio, categoria, stock) values ($1, 'cafe', 'Café 1 kg', 11900, 'Café', 20)", [u.id]);
    // Sin datos de emisor: la vitrina NO ofrece factura.
    const { page: v } = await t.nuevo();
    await v.goto(t.base + '/t/?s=ana'); await v.waitForTimeout(2500);
    await v.click('[data-add="cafe"]'); await v.click('.seg [data-t="pedido"]'); await v.waitForTimeout(600);
    ok(!(await v.isVisible('details.factura')), 'tienda sin datos de boleta: no aparece "Necesito factura"');
    // Tienda guarda sus datos (manual) + Acteco en Ajustes → Boleta SII.
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.evaluate(() => localStorage.setItem('cfx:tour:orbita-inicio', '1'));
    await p.fill('input[type=email]:visible', 'tienda@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(3000);
    await p.goto(t.base + '/#boleta'); await p.waitForTimeout(3000); await t.sinModales(p);
    await p.check('[name=bModo][value=manual]');
    await p.fill('#bRut', '76.123.456-0'); await p.fill('#bRazon', 'Ana SpA'); await p.fill('#bGiro', 'Venta de café');
    await p.fill('#bDir', 'Av. Uno 123'); await p.fill('#bComuna', 'Temuco'); await p.fill('#bActeco', '479100'); await p.click('[data-bo="guardar"]'); await p.waitForTimeout(2000);
    const [bc] = await su("select acteco from public.boleta_cuentas");
    ok(bc && bc.acteco === 479100, 'Ajustes guarda el código de actividad (Acteco) ' + JSON.stringify(bc));
    // Vitrina: el comprador pide factura (RUT malo → avisa; bueno → pedido con factura).
    for (const modo of ['light', 'dark']) {
      await v.emulateMedia({ colorScheme: modo });
      await v.goto(t.base + '/t/?s=ana'); await v.waitForTimeout(2500);
      if (modo === 'light') await v.click('[data-add="cafe"]');
      await v.click('.seg [data-t="pedido"]'); await v.waitForTimeout(800);
      ok(await v.isVisible('details.factura'), modo + ': la vitrina ofrece 🧾 Necesito factura');
      await v.click('details.factura summary'); await v.waitForTimeout(300);
      ok(await v.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), modo + ': sin desborde con los campos de factura');
      await t.foto('g103b-vitrina-' + modo, v);
      if (modo === 'light') await v.click('details.factura summary');
    }
    await v.fill('#nom', 'Lucía'); await v.fill('#tel', '56922222222');
    await v.fill('[data-fac=rut]', '11.111.111-2'); await v.fill('[data-fac=razon]', 'Cafetería Lucía SpA'); await v.fill('[data-fac=giro]', 'Cafetería');
    await v.fill('[data-fac=direccion]', 'Calle 2 #45'); await v.fill('[data-fac=comuna]', 'Ñuñoa');
    await v.click('#bPedir'); await v.waitForTimeout(1200);
    let [n] = await su("select count(*)::int as n from public.pedidos");
    ok(n.n === 0, 'RUT con dígito malo: no envía el pedido (avisa antes)');
    await v.fill('[data-fac=rut]', '11.111.111-1');
    await v.click('#bPedir'); await v.waitForURL(/\/r\/\?t=/, { timeout: 8000 }).catch(() => {}); await v.waitForTimeout(1500);
    const [ped] = await su("select id, token, factura from public.pedidos where invitado_nombre = 'Lucía'");
    ok(ped && ped.factura && ped.factura.rut === '11111111-1' && ped.factura.razon === 'Cafetería Lucía SpA', 'el pedido queda con los datos de factura ' + JSON.stringify(ped && ped.factura));
    // Seguridad: otra persona sin token no la cambia.
    const [x] = await su("select public.pedido_factura_guardar($1, '{\"rut\":\"11111111-1\"}') as r", [ped.id]);
    ok(x.r && x.r.ok === false, 'sin el token del pedido nadie cambia la factura');
    // Pedidos: la tienda la ve, aprueba (preparando) y anota la factura manual.
    await su("update public.pedidos set estado = 'preparando' where id = $1", [ped.id]);
    await p.goto(t.base + '/apps/pedidos/'); await p.waitForTimeout(3000); await t.sinModales(p);
    const txt = await p.evaluate(() => document.getElementById('lista').innerText);
    ok(/Pide factura/.test(txt) && /Cafetería Lucía SpA/.test(txt) && /Anotar N° factura SII/.test(txt), 'Pedidos muestra "Pide factura" y el botón dice factura');
    await t.foto('g103b-pedidos', p);
    // 🧾 Datos de factura (la tienda corrige el giro).
    await p.click('[data-fac="' + ped.id + '"]'); await p.waitForTimeout(500);
    await p.fill('.elegir [data-fac=giro]', 'Cafetería y pastelería'); await t.foto('g103b-hoja', p);
    await p.click('.elegir [data-g]'); await p.waitForTimeout(1500);
    const [pf] = await su("select factura ->> 'giro' as g from public.pedidos where id = $1", [ped.id]);
    ok(pf.g === 'Cafetería y pastelería', 'la tienda corrige los datos de factura desde Pedidos');
    // Automática: OpenFactura emite FACTURA 33 con el receptor y MntBruto.
    await su("update public.boleta_cuentas set modo = 'openfactura', apikey = 'abcdefghijklmnop1234'");
    await su("insert into extensions.http_respuestas values ('https://api.haulmer.com/v2/dte/document', 200, '{\"FOLIO\": \"88\", \"SELF_SERVICE\": {\"url\": \"https://of.cl/f/88\"}}')");
    await p.goto(t.base + '/apps/pedidos/'); await p.waitForTimeout(3000); await t.sinModales(p);
    await p.click('[data-bol="' + ped.id + '"]'); await p.waitForTimeout(2500);
    const [h] = await su("select content, headers from extensions.http_log where uri like '%haulmer%' order by n desc limit 1");
    const dte = JSON.parse(h.content).dte, [{ tot }] = await su('select round(total)::int as tot from public.pedidos where id = $1', [ped.id]);
    ok(dte.Encabezado.IdDoc.TipoDTE === 33 && dte.Encabezado.IdDoc.MntBruto === 1 && dte.Encabezado.Receptor.RUTRecep === '11111111-1' &&
      dte.Encabezado.Receptor.GiroRecep === 'Cafetería y pastelería' && dte.Encabezado.Emisor.Acteco === 479100 && dte.Encabezado.Totales.MntTotal === tot && dte.Encabezado.Totales.IVA === tot - Math.round(tot / 1.19) && dte.Encabezado.Totales.MntNeto + dte.Encabezado.Totales.IVA === tot,
      'OpenFactura recibe FACTURA 33 (receptor, Acteco, neto + IVA 19% = total) ' + JSON.stringify(dte.Encabezado.Totales));
    ok(/-33/.test(h.headers), 'Idempotency-Key distinta para la factura');
    const [pb] = await su("select boleta_folio, boleta_tipo from public.pedidos where id = $1", [ped.id]);
    ok(pb.boleta_folio === '88' && pb.boleta_tipo === 33, 'queda Factura N° 88 (tipo 33)');
    const t2 = await p.evaluate(() => document.getElementById('lista').innerText);
    ok(/Factura N° 88/.test(t2) && !/Pide factura/.test(t2), 'Pedidos muestra Factura N° 88');
    // El comprador ve "Factura electrónica" en su seguimiento y ya no la puede cambiar.
    await v.goto(t.base + '/r/?t=' + ped.token); await v.waitForTimeout(2500);
    ok(/Factura electrónica N° 88/.test(await v.evaluate(() => document.body.innerText)), 'el comprador ve Factura electrónica N° 88');
    const [y] = await su("select public.pedido_factura_guardar($1, null) as r", [ped.token]);
    ok(y.r.ok === false, 'emitida: ya no se cambia');
    // Boleta normal sigue igual (pedido sin factura → TipoDTE 39).
    await su("insert into public.pedidos (negocio_id, invitado_nombre, invitado_tel, lineas, subtotal, total, entrega, estado, token) values ($1, 'Pepe', '569', $2, 5000, 5000, 'retiro', 'preparando', 'abcdefghijabcdefghij1234')",
      [u.id, JSON.stringify([{ nombre: 'Taza', cant: 1, subtotal: 5000 }])]).catch((e) => console.log('  (insert directo: ' + e.message + ')'));
    const [pz] = await su("select id from public.pedidos where invitado_nombre = 'Pepe'");
    if (pz) {
      await su("select public.boleta_intentar($1)", [pz.id]);
      const [h2] = await su("select content from extensions.http_log where uri like '%haulmer%' order by n desc limit 1");
      ok(JSON.parse(h2.content).dte.Encabezado.IdDoc.TipoDTE === 39, 'sin factura sigue saliendo boleta 39');
    }
  } catch (e) { console.log('✗ ' + e.message); f++; }
  if (t.errores.length) console.log('ERRORES:', t.errores.slice(0, 5).join('\n'));
  await t.cerrar(); console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
