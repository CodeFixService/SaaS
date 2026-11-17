// G96 a · 🧩 MÓDULOS DE TIENDA (Despega): 🎁 gift cards (Caja + carrito) · 🛒 carritos olvidados por WhatsApp · 🔁 compras recurrentes ·
//          📦 stock mínimo y proveedores. Todo validado en el servidor (sin módulo = rechazo) y cada uno en su hoja del Más.
// FALLA con el código viejo (no existen giftcard_crear, cfx_carritos_mios, suscripcion_guardar, proveedores_lista ni las hojas).
// Uso: ANCHO=320 node g96a.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g96a', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g96a'); const su = t.sim.su, como = comoDe(su);
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl', 'Pepe', 'client', $1)", [u.id]);
    const c = await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await su("update public.profiles set terms_at = now(), telefono = '+56912345678' where id = $1", [c.id]);
    await su('update public.profiles set terms_at = now()');
    await su("insert into public.catalog_items (owner_id, client_key, nombre, precio, categoria, stock) values ($1, 'cafe', 'Café 1 kg', 10000, 'Café', 20), ($1, 'taza', 'Taza', 5000, 'Café', 8)", [u.id]);
    await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
    const M = ['giftcards', 'carrito', 'suscripciones', 'proveedores'];
    const T = await como('tienda@x.cl', 'public.cfx_modulos_tienda()');
    ok(['giftcards', 'suscripciones', 'proveedores'].every((k) => T.modulos.some((m) => m.clave === k && m.vende && /\S/.test(m.nombre))), 'Tienda de módulos ofrece 🎁 🔁 📦 con nombre');
    // 🔒 Sin módulo: el servidor rechaza
    ok(/módulo/.test(await falla(() => como('tienda@x.cl', 'public.giftcard_crear(15000)')) || ''), '🔒 Sin módulo no se crean gift cards');
    ok(/módulo/.test(await falla(() => como('tienda@x.cl', 'public.cfx_carritos_mios()')) || ''), '🔒 Sin módulo no se ven los carritos');
    ok(/módulo/.test(await falla(() => como('tienda@x.cl', 'public.proveedores_lista()')) || ''), '🔒 Sin módulo no hay proveedores');
    for (const k of M) await como('tienda@x.cl', 'public.cfx_modulo_probar($2)', [k]);
    // ---------- 🎁 Gift cards ----------
    ok(!!(await falla(() => como('cli@x.cl', 'public.giftcard_crear(15000)'))), '🔒 Un cliente no vende gift cards');
    const g = await como('tienda@x.cl', "public.giftcard_crear(15000, 'Papá', 'Ana', 'transferencia')");
    ok(/^GC[0-9A-F]{8}$/.test(g.codigo) && g.saldo === 15000 && g.vigente, '🎁 Gift card creada ' + g.codigo + ' por $15.000');
    let r = await como('tienda@x.cl', 'public.giftcard_canjear($2, 4000)', [g.codigo.toLowerCase()]);
    ok(r.saldo === 11000, '🎁 Canje en la Caja: quedan $11.000');
    ok(/Le queda/.test(await falla(() => como('tienda@x.cl', 'public.giftcard_canjear($2, 20000)', [g.codigo])) || ''), '🔒 No se canjea más que el saldo');
    r = await como('cli@x.cl', 'public.giftcard_saldo($2, $3)', [u.id, g.codigo]);
    ok(r.saldo === 11000, 'El cliente ve el saldo en su carrito');
    r = await como('cli@x.cl', "public.crear_pedido($2, '[{\"clave\":\"taza\",\"cant\":1}]'::jsonb, 'retiro', null, null, $3)", [u.id, g.codigo]);
    ok(r.ok && +r.total === 0 && r.gift === 5000 && r.estado === 'recibido', '🎁 Pedido de $5.000 pagado entero con la gift card (total $0) ' + JSON.stringify(r).slice(0, 120));
    const sal = async () => +(await su('select saldo from public.giftcards where codigo = $1', [g.codigo]))[0].saldo;
    ok(await sal() === 6000, 'Saldo baja a $6.000');
    await como('tienda@x.cl', "public.actualizar_pedido($2, 'cancelado')", [r.id]);
    ok(await sal() === 11000, '↩️ Al cancelar el pedido el saldo vuelve ($11.000)');
    ok(/no válido/.test((await como('cli@x.cl', "public.crear_pedido($2, '[{\"clave\":\"taza\",\"cant\":1}]'::jsonb, 'retiro', null, null, 'GC00000000')", [u.id])).error || ''), '🔒 Código inventado: rechazado');
    const L = await como('tienda@x.cl', 'public.giftcard_lista()');
    ok(L.lista.length === 1 && +L.vendido_mes === 15000 && +L.saldo === 11000, 'Lista: vendido $15.000 · saldo $11.000');
    // ---------- 🛒 Carritos olvidados ----------
    await como('cli@x.cl', "public.cfx_carrito_guardar($2, '[{\"clave\":\"cafe\",\"cant\":2,\"nombre\":\"Café 1 kg\"}]'::jsonb)", [u.id]);
    let K = await como('tienda@x.cl', 'public.cfx_carritos_mios()');
    ok(K.length === 1 && K[0].nombre && K[0].tel === '+56912345678' && K[0].items[0].cant === 2, '🛒 La tienda ve el carrito de Pepe con su WhatsApp');
    await como('tienda@x.cl', 'public.cfx_carrito_wa($2)', [c.id]);
    K = await como('tienda@x.cl', 'public.cfx_carritos_mios()');
    ok(!!K[0].wa_at, '🛒 Queda anotado que le escribió');
    // ---------- 🔁 Compras recurrentes ----------
    ok(/cliente/.test(await falla(() => como('tienda@x.cl', "public.suscripcion_guardar('{\"cliente\":\"" + u.id + "\",\"items\":[{\"clave\":\"cafe\"}]}'::jsonb)")) || ''), '🔒 Solo para clientes de la tienda');
    const s = await como('tienda@x.cl', "public.suscripcion_guardar(jsonb_build_object('cliente', $2::text, 'items', '[{\"clave\":\"cafe\",\"cant\":1}]'::jsonb, 'cada', 14))", [c.id]);
    ok(s.cada === 14 && +s.total === 10000 && s.activa, '🔁 Compra recurrente: Café cada 14 días ($10.000)');
    const antes = +(await su('select count(*) n from public.pedidos where cliente_id = $1', [c.id]))[0].n;
    ok(+(await su('select public.suscripciones_correr() n'))[0].n === 1, '🔁 Hoy se crea el pedido solo');
    const x = (await su('select * from public.suscripciones where id = $1', [s.id]))[0];
    ok(+(await su('select count(*) n from public.pedidos where cliente_id = $1', [c.id]))[0].n === antes + 1 && x.pedidos === 1 && Math.round((new Date(x.proxima) - Date.now()) / 864e5) >= 13, '🔁 Pedido creado y el próximo en 14 días');
    ok(+(await su('select public.suscripciones_correr() n'))[0].n === 0, '🔁 No se repite el mismo día');
    ok(+(await su("select count(*) n from public.notifications where target_id = $1 and title like '🔁%'", [c.id]))[0].n >= 2, '🔔 Al cliente le llega el aviso');
    r = await como('cli@x.cl', 'public.suscripcion_estado($2, false)', [s.id]);
    ok(r.activa === false && (await como('cli@x.cl', 'public.mis_suscripciones()')).length === 1, '⏸️ El cliente la pausa desde su app');
    // ---------- 📦 Stock mínimo y proveedores ----------
    ok(/WhatsApp/.test(await falla(() => como('tienda@x.cl', "public.proveedor_guardar(null, 'Don Juan', '1234')")) || ''), '🔒 WhatsApp del proveedor validado (+56 9)');
    const v = await como('tienda@x.cl', "public.proveedor_guardar(null, 'Don Juan', '+56 9 8765 4321')");
    await como('tienda@x.cl', "public.producto_minimo('cafe', 10, $2)", [v]);
    await su("update public.catalog_items set stock = 4 where client_key = 'cafe'");
    ok(+(await su("select count(*) n from public.notifications where target_id = $1 and title like '📦%mínimo'", [u.id]))[0].n === 1, '📦 Aviso al dueño: el café bajó de su mínimo');
    const P = await como('tienda@x.cl', 'public.proveedores_lista()');
    ok(P.proveedores[0].bajos === 1 && P.productos[0].bajo, '📦 Lista: 1 producto por pedir');
    r = await como('tienda@x.cl', 'public.pedido_proveedor($2)', [v]);
    ok(r.tel === '56987654321' && /16 × Café 1 kg/.test(r.texto), '💬 Pedido al proveedor listo: ' + r.texto.replace(/\n/g, ' | ').slice(0, 90));

    // ---------- 📱 Pantalla (320 px): las 4 hojas en Más, la Caja y el carrito ----------
    const { page: p } = await t.nuevo();
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'tienda@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(p);
    const hoja = async (h, re, nombre) => {
      await p.goto(t.base + '/#' + h); await p.reload(); await p.waitForTimeout(3500);
      const tx = await p.evaluate(() => [...document.querySelectorAll('.cfx-hoja-m')].map((x) => x.innerText).join(' '));
      const ancho = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
      ok(re.test(tx) && ancho, 'Más → ' + nombre + ' se abre y cabe (' + tx.replace(/\s+/g, ' ').slice(0, 70) + ')');
      await p.screenshot({ path: __dirname + '/capturas/aplicaciones/g96a_' + h + '.png' }).catch(() => {});
    };
    await hoja('giftcards', new RegExp(g.codigo), '🎁 Gift cards');
    await p.fill('#gxMonto', '20000'); await p.click('[data-gx=crear]'); await p.waitForTimeout(1500);
    ok(/Nueva gift card/.test(await p.evaluate(() => document.querySelector('.cfx-hoja-m #gxNueva').innerText)), '🎁 Crear desde la hoja muestra el código + 💬 WhatsApp');
    await hoja('carritos', /Pepe|cli/, '🛒 Carritos olvidados');
    await hoja('recurrentes', /cada 14 días/, '🔁 Compras recurrentes');
    await hoja('proveedores', /Don Juan/, '📦 Stock mínimo y proveedores');
    await p.goto(t.base + '/apps/caja/'); await p.waitForTimeout(3000); await t.sinModales(p);
    ok(await p.evaluate(() => !document.getElementById('mGift').hidden), 'Caja: aparece 🎁 Gift card como medio de pago');
    // Cliente: gift card en el carrito
    const { page: q } = await t.nuevo();
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.fill('input[type=email]:visible', 'cli@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter');
    await q.waitForTimeout(3000); await t.sinModales(q);
    await q.goto(t.base + '/apps/catalogo/?v=pedidos'); await q.waitForTimeout(3500); await t.sinModales(q);
    ok(/Tus compras recurrentes/.test(await q.evaluate(() => document.getElementById('cRecurrentes').innerText)), 'Cliente: ve 🔁 sus compras recurrentes en Pedidos');
    await q.evaluate(() => { document.getElementById('cCarro') && document.getElementById('cCarro').classList.remove('hidden'); });
    await q.fill('#cupon', g.codigo); await q.click('#bCupon'); await q.waitForTimeout(1200);
    ok(/Gift card con \$11\.000/.test(await q.evaluate(() => document.getElementById('cuponTxt').innerText)), 'Cliente: 🎁 escribe la gift card en el carrito y ve su saldo');
    await q.screenshot({ path: __dirname + '/capturas/aplicaciones/g96a_cliente.png' }).catch(() => {});
    ok(!t.errores.filter((e) => !/favicon|404/.test(e)).length, 'Sin errores en la consola ' + t.errores.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'Error: ' + (e.stack || e).toString().slice(0, 400)); }
  await t.cerrar();
  console.log(f ? '✗ ' + f + ' fallaron' : '✓ todo bien'); process.exit(f ? 1 : 0);
})();
