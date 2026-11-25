// G160 · 🧩 TIPO DE VENTA en el núcleo (CFX_TIPO + cfx_tipo_adivinar) + 🔑 clave de un solo uso · G161 regla de entrega a la vista.
//   Raíz de Despega #6: "Diagnóstico" sin marcar quedaba 📦 producto → ofrecía Despacho. FALLA con el código viejo.
// Uso: node g160.js
const { abrir } = require('./h'); const { execSync } = require('./apps6');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g160', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g160'); const su = t.sim.su, como = comoDe(su);
  try {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    for (const [m, n] of [['cli@x.cl', 'Pepe'], ['otro@x.cl', 'Otro']]) {
      await su("insert into public.user_invites (email, nombre, role, negocio_id) values ($1, $2, 'client', $3)", [m, n, u.id]);
      await t.sim.crearUsuario(m, 'clave123');
    }
    await su('update public.profiles set terms_at = now()');
    await su("insert into public.catalog_items (owner_id, client_key, nombre, precio, categoria, stock) values ($1, 'cafe', 'Café 1 kg', 10000, 'Café', 20), ($1, 'diag', 'Diagnóstico', 5000, 'Diagnóstico', null), ($1, 'clase', 'Clase de pesas (mancuerna)', 9000, 'Gimnasio', 5), ($1, 'lic', 'Licencia Office', 7000, 'Software', null)", [u.id]);
    const tipo = async (k) => (await su("select tipo from public.catalog_items where client_key = $1", [k]))[0].tipo;
    // 1) Servidor: tipo automático (no depende solo de la categoría)
    ok(await tipo('diag') === 'servicio', '🛠️ "Diagnóstico" (categoría Diagnóstico, sin marcar) → servicio');
    ok(await tipo('cafe') === 'producto', '📦 con stock → producto');
    ok(await tipo('clase') === 'producto', '📦 "Clase…" con stock → sigue producto (no se pierde el stock)');
    ok((await su("select stock from public.catalog_items where client_key = 'clase'"))[0].stock === 5, '📦 stock intacto');
    ok(await tipo('lic') === 'digital', '🔑 "Licencia…" → digital');
    // 2) Manual manda
    await como('tienda@x.cl', "public.catalogo_venta('diag', $2::jsonb)", [JSON.stringify({ tipo: 'producto', cobro: 'ahora', manual: true })]);
    await su("update public.catalog_items set nombre = 'Diagnóstico completo' where client_key = 'diag'");
    ok(await tipo('diag') === 'producto', '✋ elegido a mano: se respeta aunque cambie el nombre');
    await como('tienda@x.cl', "public.catalogo_venta('diag', $2::jsonb)", [JSON.stringify({ tipo: 'producto', cobro: 'ahora', manual: false })]);
    ok(await tipo('diag') === 'servicio', '✨ volver a automático → servicio');
    const vt = await como('tienda@x.cl', 'public.catalogo_venta_negocio($2)', [u.id]);
    ok(vt.some((x) => x.clave === 'diag' && x.tipo === 'servicio'), '🔁/🏪 recurrentes y tienda reciben "servicio" para Diagnóstico');
    // 3) 🔑 clave de un solo uso
    await como('tienda@x.cl', "public.catalogo_venta('lic', $2::jsonb)", [JSON.stringify({ tipo: 'digital', cobro: 'ahora', acceso: 'https://x.cl/curso?k=SECRETO', manual: true })]);
    const cli = (await su("select id from auth.users where email = 'cli@x.cl'"))[0].id;
    const ped = (await su("insert into public.pedidos (negocio_id, cliente_id, lineas, subtotal, total, entrega, estado, token) values ($1, $2, $3::jsonb, 14000, 14000, 'retiro', 'recibido', 'tok-g160') returning id",
      [u.id, cli, JSON.stringify([{ clave: 'lic', nombre: 'Licencia Office', cant: 2, precio: 7000, subtotal: 14000, tipo: 'digital', cobro: 'ahora' }])]))[0].id;
    await su("update public.pedidos set estado = 'preparando', pagado_at = now() where id = $1", [ped]);
    const acc = (await su('select accesos, estado from public.pedidos where id = $1', [ped]))[0];
    ok(acc.accesos && acc.accesos.length === 2 && acc.accesos.every((a) => /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(a.clave) && !a.acceso), '🔑 2 unidades → 2 claves, sin mostrar el acceso antes de canjear');
    ok(acc.estado === 'entregado', '🔑 solo digital → entregado al tiro');
    const k1 = acc.accesos[0].clave;
    const r1 = await como('cli@x.cl', 'public.cfx_clave_canjear($2)', [k1.toLowerCase().replace(/-/g, ' ')]);
    ok(r1.ok && /SECRETO/.test(r1.acceso), '🔓 el comprador canjea y ve su acceso');
    const r2 = await como('otro@x.cl', 'public.cfx_clave_canjear($2)', [k1]);
    ok(!r2.ok && /ya fue usada/.test(r2.error), '⛔ otra cuenta: "Esta clave ya fue usada"');
    ok((await como('cli@x.cl', 'public.cfx_clave_canjear($2)', [k1])).ok, '🔁 la misma cuenta la vuelve a ver');
    const anon = await su("select public.cfx_clave_canjear($1, null) as r", [acc.accesos[1].clave]);
    ok(!anon[0].r.ok, '🚫 sin cuenta y sin token del pedido: no canjea');
    ok((await su("select public.cfx_clave_canjear($1, 'tok-g160') as r", [acc.accesos[1].clave]))[0].r.ok, '🎟️ comprador sin cuenta con el token de su pedido: canjea');
    const L = await como('tienda@x.cl', 'public.cfx_clave_lista($2, $3)', [u.id, ped]);
    ok(L.length === 2 && L.some((x) => x.clave === k1 && x.canjeado_at && x.quien), '👀 el dueño ve a quién se entregó');
    ok((await como('otro@x.cl', 'public.cfx_clave_lista($2, null)', [u.id])).length === 0, '🔒 otra cuenta no ve las claves');
    const rp = await como('tienda@x.cl', 'public.cfx_clave_reponer($2)', [L.find((x) => x.clave === k1).id]);
    const acc2 = (await su('select accesos from public.pedidos where id = $1', [ped]))[0].accesos;
    ok(rp.ok && acc2.some((a) => a.clave === rp.clave) && !acc2.some((a) => a.clave === k1), '🔄 reponer: el pedido muestra la nueva');
    ok(/anulada/.test((await como('cli@x.cl', 'public.cfx_clave_canjear($2)', [k1])).error || ''), '❌ la vieja queda anulada (no se borra)');
    ok((await su("select count(*)::int as n from public.cfx_claves where clave = $1", [k1]))[0].n === 1, '🛡️ la vieja sigue guardada');
    // 4) Pantalla: Caja con 3 botones · recurrentes sin Despacho · regla de entrega
    await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
    await como('tienda@x.cl', 'public.cfx_modulo_probar($2)', ['suscripciones']);
    const { page: p } = await t.nuevo();
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'tienda@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(p);
    await p.goto(t.base + '/apps/caja/'); await p.waitForTimeout(3500); await t.sinModales(p);
    const n3 = await p.evaluate(() => document.querySelectorAll('.cfx-tipo [data-tipo]').length);
    ok(n3 === 3, '🧩 Caja: el tipo son 3 botones grandes (' + n3 + ')');
    const auto = await p.evaluate(async () => { const n = document.getElementById('p-nombre'); n.value = 'Mantención de bici'; n.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((x) => setTimeout(x, 200)); return document.getElementById('p-tipo').value; });
    await p.evaluate(() => document.querySelector('.cfx-tipo').scrollIntoView()); await p.screenshot({ path: __dirname + '/capturas/aplicaciones/g160_caja.png' }).catch(() => {});
    ok(auto === 'servicio', '✨ Caja: escribir "Mantención…" lo marca 🛠️ solo (' + auto + ')');
    const reg = await p.evaluate(() => !!(window.CFX_COBRO && CFX_COBRO.regla && /al tiro/.test(CFX_COBRO.regla()) && /revisa/.test(CFX_COBRO.regla())));
    ok(reg, '💳 G161 CFX_COBRO.regla: ⚡ al tiro · 🏦 verificación humana');
    await p.goto(t.base + '/#recurrentes'); await p.reload(); await p.waitForTimeout(3500);
    const H = '.cfx-hoja-m ';
    const hay = await p.evaluate((h) => { const s = document.querySelector(h + '.gxP'); if (!s) return false; s.value = 'diag'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; }, H);
    await p.waitForTimeout(400);
    ok(hay && !(await p.locator(H + '#gxEnt').isVisible()), '🔁 recurrentes: "Diagnóstico" NO ofrece Retiro/Despacho');
    await p.screenshot({ path: __dirname + '/capturas/aplicaciones/g160_recurrente.png' }).catch(() => {});
  } catch (e) { ok(false, 'error: ' + (e.stack || e)); }
  await t.cerrar(); console.log(f ? '✗ ' + f + ' fallas' : '✓ G160 OK'); process.exit(f ? 1 : 0);
})();
