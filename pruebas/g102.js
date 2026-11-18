// G102 a · 🚚 COURIER CHILEXPRESS en Despega (módulo 'courier'): la tienda pone SUS llaves (Cotizador/Coberturas/Envíos) y su TCC,
//   cotiza a cualquier comuna y saca la etiqueta desde Pedidos: se crea la OT, se guarda la etiqueta y el seguimiento queda puesto solo.
// FALLA con el código viejo (no existen courier_guardar, courier_cotizar, courier_etiqueta ni la hoja #courier).
// Uso: ANCHO=320 node g102.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const CX = 'https://services.wschilexpress.com', CXT = 'https://testservices.wschilexpress.com';
const LLAVE = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6', LLAVE_ENV = 'f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5';
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAADwAAAAoCAIAAAAt2Q6oAAAAW0lEQVR4nO3QQQkAQBDDwPVv+s5DHy2BjIKQO6IHZHQLMxppfS1hdAszGml9LWF0CzMaaX0tYXQLMxppfS1hdAszGml9LWF0CzMaaX0tYXQLMxppfS1hdAsy+gPCh2rL4w819AAAAABJRU5ErkJggg==';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
const hojaTx = (p) => p.evaluate(() => [...document.querySelectorAll('.cfx-hoja-m')].map((x) => x.innerText).join(' '));
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g102', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g102'); const su = t.sim.su, como = comoDe(su);
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.crearUsuario('otra@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Otra' });
    await su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl', 'Pepe', 'client', $1)", [u.id]);
    const c = await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await su("update public.profiles set terms_at = now(), telefono = '+56912345678' where id = $1", [c.id]);
    await su('update public.profiles set terms_at = now()');
    await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
    const T = await como('tienda@x.cl', 'public.cfx_modulos_tienda()');
    ok(T.modulos.some((m) => m.clave === 'courier' && m.vende && /Chilexpress/.test(m.nombre)), 'Tienda de módulos ofrece 🚚 Courier Chilexpress');
    ok(/módulo/.test(await falla(() => como('tienda@x.cl', 'public.courier_estado()')) || ''), '🔒 Sin módulo: courier_estado rechazado');
    await como('tienda@x.cl', "public.cfx_modulo_probar('courier')");
    let e = await como('tienda@x.cl', 'public.courier_estado()');
    ok(e.conectado === false && e.rem_nombre === 'Tienda Ana', 'Sin conectar: parte con el nombre de la tienda');
    ok(/conecta Chilexpress/i.test(await falla(() => como('tienda@x.cl', "public.courier_cotizar('Temuco')")) || ''), 'Cotizar sin conectar → aviso claro');
    // Stub de Chilexpress
    await su("insert into extensions.http_respuestas values ($1, 200, $2), ($3, 200, $4), ($5, 200, $6), ($7, 200, $8), ($9, 200, $10), ($11, 200, $2), ($12, 200, $4), ($13, 200, $6)", [
      CX + '/georeference/api/v1.0/regions', JSON.stringify({ regions: [{ regionId: 'RM', regionName: 'METROPOLITANA' }, { regionId: 'R9', regionName: 'ARAUCANIA' }, { regionId: 'x;drop' }] }),
      CX + '/georeference/api/v1.0/coverage-areas?RegionCode=RM%', JSON.stringify({ coverageAreas: [{ countyCode: 'NUNO', countyName: 'ÑUÑOA' }, { countyCode: 'STGO', countyName: 'SANTIAGO' }] }),
      CX + '/georeference/api/v1.0/coverage-areas?RegionCode=R9%', JSON.stringify({ coverageAreas: [{ countyCode: 'TEMU', countyName: 'TEMUCO' }] }),
      CX + '/rating/api/v1.0/rates/courier', JSON.stringify({ data: { courierServiceOptions: [{ serviceTypeCode: 2, serviceDescription: 'PRIORITARIO', serviceValue: '5990' }, { serviceTypeCode: 3, serviceDescription: 'DIA HABIL SIGUIENTE', serviceValue: '4990' }] }, statusCode: 0 }),
      CX + '/transport-orders/api/v1.0/transport-orders', JSON.stringify({ data: { detail: [{ transportOrderNumber: '700123456789', label: { labelData: PNG, labelType: 2 }, statusCode: 0 }] }, statusCode: 0 }),
      CXT + '/georeference/api/v1.0/regions', CXT + '/georeference/api/v1.0/coverage-areas?RegionCode=RM%', CXT + '/georeference/api/v1.0/coverage-areas?RegionCode=R9%']);
    ok(/Revisa la llave/.test(await falla(() => como('tienda@x.cl', "public.courier_guardar('{\"llave_cot\":\"corta\",\"origen\":\"Ñuñoa\"}')")) || ''), 'Llave mal escrita → rechazada');
    ok(/No encontramos la comuna/.test(await falla(() => como('tienda@x.cl', 'public.courier_guardar($2)', [{ llave_cot: LLAVE, origen: 'Gotham' }])) || ''), 'Comuna de origen que no existe → aviso claro');
    await su('delete from public.chx_comunas'); await su('delete from extensions.http_log');
    e = await como('tienda@x.cl', 'public.courier_guardar($2)', [{ llave_cot: LLAVE, origen: 'Ñuñoa', rem_calle: 'Irarrázaval', rem_numero: '3456', rem_tel: '+56 9 8765 4321', peso: 1.5, tamano: 'mediana' }]);
    ok(e.conectado === true && e.origen === 'Ñuñoa' && e.etiquetas === false && !JSON.stringify(e).includes(LLAVE), '✅ Conectado: sale desde Ñuñoa (código de Chilexpress) y la llave no se vuelve a leer');
    const h1 = (await su("select headers from extensions.http_log where uri like '%/regions' limit 1"))[0];
    ok(h1 && h1.headers.includes('Ocp-Apim-Subscription-Key') && h1.headers.includes(LLAVE), 'La llave va en el encabezado Ocp-Apim-Subscription-Key (solo desde el servidor)');
    ok((await su("select count(*)::int n from public.chx_comunas where cod ~ ';'"))[0].n === 0 && (await su('select count(*)::int n from public.chx_comunas'))[0].n === 3, 'Comunas guardadas (región rara ignorada)');
    ok((await su("select has_table_privilege('authenticated', 'public.courier_cuentas', 'select') s"))[0].s === false, '🔒 Las llaves no se leen desde la app');
    e = await como('tienda@x.cl', 'public.courier_guardar($2)', [{ llave_cot: '', origen: 'Ñuñoa', rem_calle: 'Irarrázaval', rem_numero: '3456', rem_tel: '+56987654321', peso: 1.5, tamano: 'mediana' }]);
    ok(e.llave_cot === true, 'Guardar sin escribir la llave no la borra');
    // 💲 Cotizar
    await su('delete from extensions.http_log');
    const q = await como('tienda@x.cl', "public.courier_cotizar('temuco', 2, 'chica', 15000)");
    ok(q.destino === 'TEMU' && q.opciones.length === 2 && q.opciones[0].valor === 4990 && q.opciones[0].nombre === 'Dia Habil Siguiente', '💲 Cotiza a Temuco: 2 servicios, el más barato primero ($4.990)');
    const cb = JSON.parse((await su("select content from extensions.http_log where uri like '%/rates/courier'"))[0].content);
    ok(cb.originCountyCode === 'NUNO' && cb.destinationCountyCode === 'TEMU' && cb.package.weight === '2' && cb.package.length === '20', 'Pide a Chilexpress NUNO → TEMU, 2 kg, caja chica');
    ok(/no encuentra la comuna/.test(await falla(() => como('tienda@x.cl', "public.courier_cotizar('Narnia')")) || ''), 'Comuna inventada → aviso claro');
    ok((await su("select count(*)::int n from extensions.http_log where uri like '%/regions'"))[0].n === 0, 'No vuelve a traer las comunas (1 vez al día como mucho)');
    ok(/Sin permiso|módulo/.test(await falla(() => como('otra@x.cl', "public.courier_cotizar('Temuco')")) || ''), '🔒 Otra tienda no usa estas llaves');
    // Pedido con despacho
    const P1 = (await su("insert into public.pedidos (negocio_id, cliente_id, lineas, subtotal, total, entrega, direccion, comuna, estado) values ($1, $2, '[{\"nombre\":\"Café\",\"cant\":1,\"subtotal\":15000}]', 15000, 15000, 'despacho', 'Av. Alemania 0345 depto 4, Temuco', 'Temuco', 'preparando') returning id", [u.id, c.id]))[0].id;
    let pr = await como('tienda@x.cl', 'public.courier_preparar($2)', [P1]);
    ok(pr.calle === 'Av. Alemania' && pr.numero === '0345' && pr.extra === 'depto 4' && pr.comuna === 'Temuco' && pr.cliente === 'Pepe' && pr.tel === '+56912345678', 'Prepara la etiqueta: separa calle, número y depto; cliente y teléfono');
    ok(pr.cotizacion.opciones.length === 2 && pr.etiquetas === false, 'Trae la cotización · sin llave de Envíos: solo cotizar');
    ok(/llave de Envíos/.test(await falla(() => como('tienda@x.cl', "public.courier_etiqueta($2, 3, 1, 'chica', 'Av. Alemania', '0345')", [P1])) || ''), 'Etiqueta sin llave de Envíos/TCC → aviso claro');
    ok(/TCC/.test(await falla(() => como('tienda@x.cl', 'public.courier_guardar($2)', [{ llave_env: LLAVE_ENV, tcc: '12', origen: 'Ñuñoa', rem_calle: 'Irarrázaval', rem_numero: '3456', rem_tel: '+56987654321' }])) || ''), 'TCC mal escrito → rechazado');
    e = await como('tienda@x.cl', 'public.courier_guardar($2)', [{ llave_env: LLAVE_ENV, tcc: '18578680', origen: 'Ñuñoa', rem_calle: 'Irarrázaval', rem_numero: '3456', rem_tel: '+56987654321', rem_nombre: 'Tienda Ana', peso: 1.5, tamano: 'mediana' }]);
    ok(e.etiquetas === true && e.tcc === '•••680', 'Llave de Envíos + TCC: 🏷️ etiquetas activas (TCC tapado)');
    ok(/no está disponible/.test(await falla(() => como('tienda@x.cl', "public.courier_etiqueta($2, 9, 1, 'chica', 'Av. Alemania', '0345')", [P1])) || ''), 'Servicio que no ofrece Chilexpress → rechazado');
    ok(/calle y el número/.test(await falla(() => como('tienda@x.cl', "public.courier_etiqueta($2, 3, 1, 'chica', 'Av. Alemania', '12; drop')", [P1])) || ''), 'Número raro → rechazado');
    await su('delete from extensions.http_log');
    const et = await como('tienda@x.cl', "public.courier_etiqueta($2, 3, 1.2, 'chica', 'Av. Alemania', '0345', 'depto 4')", [P1]);
    ok(et.ot === '700123456789' && et.etiqueta === PNG && et.valor === 4990, '🏷️ Etiqueta creada: OT 700123456789 con su imagen');
    const ob = JSON.parse((await su("select content from extensions.http_log where uri like '%/transport-orders'"))[0].content);
    const dest = ob.details[0].addresses.find((a) => a.addressType === 'DEST'), dCon = ob.details[0].contacts.find((x) => x.contactType === 'D');
    ok(ob.header.customerCardNumber === '18578680' && ob.header.countyOfOriginCoverageCode === 'NUNO' && dest.countyCoverageCode === 'TEMU' && dest.streetNumber === '0345' && dCon.phoneNumber === '912345678' && ob.details[0].packages[0].serviceDeliveryCode === '3',
      'Manda a Chilexpress: TCC, origen NUNO, destino TEMU, número, teléfono del cliente y servicio');
    const x1 = (await su('select estado, envio_courier, envio_codigo from public.pedidos where id = $1', [P1]))[0];
    ok(x1.estado === 'en_camino' && x1.envio_courier === 'chilexpress' && x1.envio_codigo === '700123456789', '🚚 El seguimiento queda puesto solo y el pedido pasa a "En camino"');
    ok((await su("select count(*)::int n from public.notifications where target_id = $1", [c.id]))[0].n >= 1, '🔔 Al cliente le llega el aviso');
    ok(/ya tiene etiqueta/.test(await falla(() => como('tienda@x.cl', "public.courier_etiqueta($2, 3, 1, 'chica', 'Av. Alemania', '0345')", [P1])) || ''), 'No se crea 2 veces (no se cobra doble)');
    ok((await como('tienda@x.cl', 'public.courier_preparar($2)', [P1])).hecha === true, 'Preparar de nuevo → ya hecha (muestra la etiqueta)');
    ok(/no tiene etiqueta|Sin permiso/.test(await falla(() => como('otra@x.cl', 'public.courier_etiqueta_ver($2)', [P1])) || ''), '🔒 Otra tienda no ve la etiqueta');
    e = await como('tienda@x.cl', 'public.courier_estado()');
    ok(e.envios_mes === 1 && e.ultimos[0].ot === '700123456789', 'Hoja: 1 etiqueta este mes en "Últimas"');
    // Error de Chilexpress → se ve el motivo
    const P2 = (await su("insert into public.pedidos (negocio_id, cliente_id, lineas, subtotal, total, entrega, direccion, comuna, estado) values ($1, $2, '[]', 9000, 9000, 'despacho', 'Los Aromos 77, Santiago', 'Santiago', 'recibido') returning id", [u.id, c.id]))[0].id;
    await su("update extensions.http_respuestas set status = 400, content = '{\"statusCode\":-1,\"statusDescription\":\"TCC no habilitada\"}' where url_like = $1", [CX + '/transport-orders/api/v1.0/transport-orders']);
    ok(/TCC no habilitada/.test(await falla(() => como('tienda@x.cl', "public.courier_etiqueta($2, 3, 1, 'chica', 'Los Aromos', '77')", [P2])) || ''), 'Chilexpress rechaza → la tienda ve el motivo ("TCC no habilitada")');
    ok((await su('select count(*)::int n from public.courier_envios where pedido_id = $1', [P2]))[0].n === 0, 'Si falla no queda nada a medias');
    await su("update extensions.http_respuestas set status = 200, content = $2 where url_like = $1", [CX + '/transport-orders/api/v1.0/transport-orders', JSON.stringify({ data: { detail: [{ transportOrderNumber: '700999888777', label: { labelData: PNG } }] } })]);
    // 🧪 Modo prueba → testservices
    await su('delete from extensions.http_log'); await su('delete from public.chx_comunas');
    await como('tienda@x.cl', 'public.courier_guardar($2)', [{ prueba: true, origen: 'Santiago', rem_calle: 'Irarrázaval', rem_numero: '3456', rem_tel: '+56987654321', peso: 1.5, tamano: 'mediana' }]);
    ok((await su("select count(*)::int n from extensions.http_log where uri like 'https://testservices.%'"))[0].n >= 1, '🧪 Llaves de prueba → ambiente de pruebas de Chilexpress');
    await como('tienda@x.cl', 'public.courier_guardar($2)', [{ prueba: false, origen: 'Ñuñoa', rem_calle: 'Irarrázaval', rem_numero: '3456', rem_tel: '+56987654321', peso: 1.5, tamano: 'mediana' }]);
    // 📱 Pantalla (320 px): Pedidos → 🏷️ Etiqueta Chilexpress → Crear → se ve la etiqueta
    const { page: p } = await t.nuevo();
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'tienda@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(p);
    await p.goto(t.base + '/apps/pedidos/'); await p.waitForTimeout(3500); await t.sinModales(p);
    await p.click('#filtros [data-f=activos]').catch(() => {}); await p.waitForTimeout(2000);
    ok(await p.evaluate((id) => !!document.querySelector('[data-etq="' + id + '"]'), P2), '📱 Pedidos: botón 🏷️ Etiqueta Chilexpress en el pedido con despacho');
    await p.click('#filtros [data-f=""], #filtros [data-f=todos]').catch(() => {}); await p.waitForTimeout(1500);
    await p.click('[data-etq="' + P2 + '"]'); await p.waitForTimeout(2500);
    let tx = await hojaTx(p);
    ok(/Los Aromos/.test(await p.inputValue('#cxCalle')) && (await p.inputValue('#cxNum')) === '77' && /Dia Habil Siguiente/.test(tx) && /4\.990/.test(tx), '📱 Hoja: calle y número listos + servicios con precio');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '📱 Cabe en 320 px');
    await p.screenshot({ path: __dirname + '/capturas/aplicaciones/g102_etiqueta.png' }).catch(() => {});
    await p.click('[data-cx=crear]'); await p.waitForTimeout(3000);
    tx = await hojaTx(p);
    ok(/700999888777/.test(tx) && await p.evaluate(() => { const i = document.querySelector('.cfx-hoja-m img[alt=Etiqueta]'); return !!i && i.naturalWidth > 0; }), '📱 Crear → se ve la etiqueta (OT 700999888777) para imprimir');
    ok((await su('select envio_codigo from public.pedidos where id = $1', [P2]))[0].envio_codigo === '700999888777', 'Desde la pantalla: seguimiento puesto');
    await p.keyboard.press('Escape'); await p.waitForTimeout(800);
    await p.goto(t.base + '/apps/pedidos/'); await p.waitForTimeout(3000); await t.sinModales(p);
    await p.click('#filtros [data-f=activos]').catch(() => {}); await p.waitForTimeout(2000);
    ok(await p.evaluate((id) => !!document.querySelector('[data-etv="' + id + '"]'), P2), '📱 Después: 🖨️ Etiqueta para volver a imprimirla');
    // 📱 Hoja del Más (#courier): cotizar
    await p.goto(t.base + '/#courier'); await p.reload(); await p.waitForTimeout(3500);
    tx = await hojaTx(p);
    ok(/Chilexpress conectado/.test(tx) && /etiquetas activas/.test(tx) && /Últimas etiquetas/.test(tx), '📱 Más → 🚚 Courier: conectado, etiquetas activas y últimas');
    await p.fill('#cxqCom', 'Temuco'); await p.click('[data-cx=cotizar]'); await p.waitForTimeout(2000);
    tx = await hojaTx(p);
    ok(/Prioritario/.test(tx) && /5\.990/.test(tx), '📱 Cotizar desde la hoja: Prioritario $5.990');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '📱 Hoja cabe en 320 px');
    await p.screenshot({ path: __dirname + '/capturas/aplicaciones/g102_courier.png' }).catch(() => {});
    await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await p.screenshot({ path: __dirname + '/capturas/aplicaciones/g102_courier_oscuro.png' }).catch(() => {});
  } catch (x) { console.log('✗ ERROR', x.message); f++; }
  await t.cerrar();
  console.log(f ? '✗ ' + f + ' fallas' : '✓ todo ok'); process.exit(f ? 1 : 0);
})();
