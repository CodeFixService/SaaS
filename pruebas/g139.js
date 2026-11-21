// G139 · 🛒 PAGAR ANTES DEL PEDIDO + AVISOS DE ESTADO (Despega + núcleo CFX_COBRO.boton/waEstado). FALLA con el código viejo:
//   el botón decía "📨 Enviar pedido" y no llevaba a pagar, la tienda recibía "⏳ Pedido por pagar" antes del pago, sin 📲 avisar listo.
// Uso: ANCHO=320 node g139.js
const { abrir } = require('./h'); const { execSync } = require('child_process');
const MP = 'https://api.mercadopago.com';
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g139', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g139'); const su = t.sim.su;
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  const avisos = (id) => su("select title from public.notifications where target_id = $1 order by created_at, title", [id]).then((l) => l.map((x) => x.title));
  try {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Pepe','client',$1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await su("update public.profiles set terms_at = now()");
    await su("update public.profiles set slug = 'ana', telefono = '56912345678', datos_pago = 'Banco Estado · Cta RUT 1' where id = $1", [u.id]);
    await como('tienda@x.cl', 'public.catalog_upsert($2, $3, $4, null, $5)', ['polera', 'Polera', 10000, '']);
    // 🏦 Solo transferencia: la tienda lo sabe (cobra_mp = false)
    let ti = await como('cli@x.cl', 'public.tienda_info($2)', [u.id]);
    ok(ti.cobra_online === true && ti.cobra_mp === false, 'Solo 🏦 transferencia: tienda_info dice cobra_mp = false');
    const pub = (await su("select public.tienda_publica('ana') p"))[0].p;
    ok(pub.cobra_mp === false, 'tienda_publica también trae cobra_mp');
    // 🔔 Al apartar NO avisa a la tienda; al pagar sí ("💳 Pagado: prepara…")
    await su("insert into public.mp_cuentas (owner_id, token, nick) values ($1, 'TEST-tok', 'ANA')", [u.id]);
    await su("insert into extensions.http_respuestas values ($1, 201, '{\"init_point\":\"https://mp.test/pagar\",\"id\":\"PREF1\"}'), ($2, 200, '{\"results\":[]}')", [MP + '/checkout/preferences', MP + '/v1/payments/search%']);
    ok((await como('cli@x.cl', 'public.tienda_info($2)', [u.id])).cobra_mp === true, 'Con ⚡ MP: cobra_mp = true');
    const r = (await su("select public.crear_pedido_invitado('ana', 'Lu', '56933333333', '[{\"clave\":\"polera\",\"cant\":2}]'::jsonb, 'retiro', null, null, null, 'ahora') r"))[0].r;
    ok(r.ok && r.estado === 'pagando', 'Pedido apartado esperando pago');
    let av = await avisos(u.id);
    ok(!av.some((x) => /por pagar|Nuevo pedido/.test(x)), '🔕 La tienda NO recibe aviso mientras no paguen (' + av.join(' | ') + ')');
    await su("select public.pedido_pagado_auto($1, 'PAGO1', 'Mercado Pago')", [r.id]);
    av = await avisos(u.id);
    ok(av.some((x) => /💳 Pagado: prepara el pedido de Lu/.test(x)), '🔔 Al pagar: "💳 Pagado: prepara el pedido de Lu"');
    // 💰 Paga al retirar: aviso al tiro (no cambia)
    await como('tienda@x.cl', "public.catalogo_venta('polera', '{\"cobro\":\"retiro\"}')");
    await su("select public.crear_pedido_invitado('ana', 'Mia', '56944444444', '[{\"clave\":\"polera\",\"cant\":1}]'::jsonb, 'retiro', null, null, null, 'retiro')");
    ok((await avisos(u.id)).some((x) => /Nuevo pedido \(paga al retirar\) de Mia/.test(x)), '💰 Paga al retirar: la tienda recibe el pedido al tiro');
    await como('tienda@x.cl', "public.catalogo_venta('polera', '{\"cobro\":\"ahora\"}')");

    // 📱 Cliente con cuenta: el botón dice "⚡ Pagar $20.000" y lleva DIRECTO a Mercado Pago
    const p = t.page;
    await p.route('https://mp.test/**', (x) => x.fulfill({ status: 200, contentType: 'text/html', body: '<h1>MP prueba</h1>' }));
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'cli@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(3000);
    await p.goto(t.base + '/apps/catalogo/'); await p.waitForTimeout(3500); await t.sinModales(p);
    const add = p.locator('[data-add]').first(); await add.click(); await add.click(); await p.waitForTimeout(400);
    await p.getByText('Ver pedido').first().evaluate((e) => (e.closest('button') || e).click()); await p.waitForTimeout(1200);
    const bt = (await p.locator('#bEnviarPed').innerText()).trim();
    ok(/Pagar \$20\.000/.test(bt) && !/Enviar/.test(bt), '📱 Botón "' + bt + '" (antes: 📨 Enviar pedido)');
    ok(/Pagas primero/.test(await p.locator('#cobroNota').innerText()), '📱 Nota: "Pagas primero: la tienda recibe tu pedido cuando el pago se aprueba"');
    ok(await t.anchoOk(p), '📱 Sin scroll horizontal');
    await t.foto('g139_carrito', p);
    await p.click('#bEnviarPed'); await p.waitForTimeout(3500);
    ok(/mp\.test\/pagar/.test(p.url()), '📱 Al tocar: va directo a pagar con ⚡ Mercado Pago (' + p.url() + ')');

    // 📱 /t/ sin cuenta, solo 🏦 transferencia: "🏦 Pagar $10.000" → enlace del pedido con los datos
    await su("update public.mp_cuentas set activo = false");
    const g = (await t.nuevo()).page;
    await g.goto(t.base + '/t/?s=ana'); await g.waitForTimeout(3000);
    await g.locator('[data-add]').first().evaluate((e) => e.click()); await g.waitForTimeout(300);
    await g.evaluate(() => document.getElementById('bVer').click()); await g.waitForTimeout(800);
    ok(/Pagar todo ahora/.test(await g.locator('#cobroOps').innerText()) && /transferencia/.test(await g.locator('#cobroOps').innerText()), '📱 /t/: "🏦 Pagar todo ahora · por transferencia" (no dice "en línea")');
    const bt2 = (await g.locator('#bPedir').innerText()).trim();
    ok(/Pagar \$10\.000/.test(bt2), '📱 /t/: botón "' + bt2 + '"');
    await g.fill('#nom', 'Lu'); await g.fill('#tel', '933333333');
    await g.click('#bPedir'); await g.waitForTimeout(3000);
    ok(/\/r\/\?t=/.test(g.url()) && /Esperando pago/.test(await g.locator('body').innerText()), '📱 /t/: va al pedido ⏳ Esperando pago (datos + comprobante)');

    // 🏪 La tienda: aviso "Sin ⚡ Mercado Pago" y 📲 Avisar ✅ listo por WhatsApp
    const q = (await t.nuevo()).page;
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.fill('input[type=email]:visible', 'tienda@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3000);
    await como('tienda@x.cl', 'public.actualizar_pedido($2, $3)', [r.id, 'listo']);
    await q.goto(t.base + '/apps/pedidos/'); await q.waitForTimeout(3500); await t.sinModales(q);
    ok(/Sin\s+Mercado Pago ni\s+Webpay/.test(await q.locator('#sinMedio').innerText()), '🏪 Aviso al dueño: "Sin ⚡ Mercado Pago ni 💳 Webpay" (transferencia + comprobante)');
    await q.click('[data-f="todos"]').catch(() => {}); await q.waitForTimeout(1500);
    const a = q.locator('[data-wa-estado="' + r.id + '"]');
    ok(await a.count() === 1 && /Avisar:\s+listo/.test(await a.innerText()) && /listo%20para%20retirar/.test(await a.getAttribute('href')), '🏪 📲 "Avisar: ✅ listo" con el mensaje para WhatsApp');
    await t.foto('g139_tienda', q);
    ok(!t.errores.filter((m) => !/favicon|404|status of 400|mp\.test/.test(m)).length, 'Sin errores en la consola ' + t.errores.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'error: ' + (e.stack || e).toString().slice(0, 600)); }
  await t.cerrar();
  console.log(f ? '✗ ' + f + ' fallaron' : '✓ todo bien'); process.exit(f ? 1 : 0);
})();
