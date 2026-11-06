// Prueba central: abre las 7 apps (sin errores de JS, carga unificada activa) y en Órbita revisa precios en pesos chilenos.
const { abrir } = require('./h');
const ok = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  let fallas = 0;
  // La versión del código debe ser la de version.json (si no, el botón Actualizar dice "aún se está publicando").
  const fs = require('fs'), CODIGO = { saas: ['shared/config.js', /VERSION: '([\d.]+)'/], emprendedor: ['js/core.js', /VERSION = '([\d.]+)'/], Aplicaciones: ['shared/core.js', /APP_VERSION = '([\d.]+)'/],
    barberia: ['shared/core.js', /VERSION = '([\d.]+)'/], contenido: ['shared/config.js', /VERSION: '([\d.]+)'/] };
  for (const [app, [f, re]] of Object.entries(CODIGO)) {
    const v = JSON.parse(fs.readFileSync('/home/user/' + app + '/version.json')).version, m = fs.readFileSync('/home/user/' + app + '/' + f, 'utf8').match(re);
    if (!m || m[1] !== v) { fallas++; console.log('FALLA: ' + app + ': ' + f + ' dice ' + (m && m[1]) + ' y version.json ' + v); } else console.log('ok', app + ': versión del código = version.json');
  }
  for (const app of ['saas', 'emprendedor', 'Aplicaciones', 'barberia', 'taller', 'estacionamiento', 'contenido']) {
    const db = app === 'barberia' ? 'barberia_prueba' : 'p_' + app.toLowerCase();
    if (app !== 'barberia') require('child_process').execSync(__dirname + '/base.sh /home/user/' + app, { stdio: 'ignore' });
    const t = await abrir('/home/user/' + app, db); const p = t.page;
    try {
      await p.goto(t.base + '/'); await p.waitForTimeout(1500);
      ok(await p.evaluate(() => !!window.CFX_CARGA && !!document.querySelector('style') && typeof fetch === 'function'), app + ': carga unificada activa');
      // La barra aparece con una consulta lenta y se va al terminar.
      const barra = await p.evaluate(async () => { CFX_CARGA.barra(true); await new Promise((r) => setTimeout(r, 400)); const on = document.querySelector('.cfx-carga-b.on') !== null; CFX_CARGA.barra(false); return on && !document.querySelector('.cfx-carga-b.on'); });
      ok(barra, app + ': barra de carga aparece y se va');
      // Reparar la app (núcleo): está en Configuración del menú común.
      ok(await p.evaluate(() => { const d = document.createElement('div'); document.body.append(d); try { CFX_MENU.montar(d, []); return d.textContent.includes('Reparar la app'); } catch (e) { return fetch(document.querySelector('script[src*="ayuda.js"]').src).then((r) => r.text()).then((t) => t.includes("t: 'Reparar la app'")); } finally { d.remove(); } }), app + ': botón Reparar la app');
      // Fotos (núcleo fotos.js): una foto grande se achica a WebP y queda bajo el peso del comprobante.
      const fz = await p.evaluate(async () => { if (!window.CFX_ACHICAR) return null; const c = document.createElement('canvas'); c.width = 3000; c.height = 2000; const g = c.getContext('2d');
        for (let i = 0; i < 4000; i++) { g.fillStyle = 'hsl(' + (i * 37 % 360) + ',70%,50%)'; g.fillRect((i * 97) % 3000, (i * 53) % 2000, 60, 40); }
        const d = await CFX_ACHICAR(c.toDataURL('image/png'), 'comprobante'); return [d.slice(0, 15), d.length, CFX_FOTO.comprobante.kb * 1400]; });
      ok(fz && fz[0] === 'data:image/webp' && fz[1] <= fz[2], app + ': foto achicada a WebP ' + JSON.stringify(fz));
      if (app === 'Aplicaciones') {
        const r = await p.evaluate(() => [Core.money(10000), Core.money(19.99), Core.precioNum('10.000'), Core.precioNum('$ 25.990'), Core.precioNum('Consultar')]);
        ok(r[0] === '$10.000' && r[1] === '$20' && r[2] === 10000 && r[3] === 25990 && Number.isNaN(r[4]), 'Órbita: precios en pesos chilenos ' + JSON.stringify(r));
        await p.goto(t.base + '/apps/fichas/'); await p.waitForTimeout(1500);
        ok(await p.evaluate(() => { const e = document.getElementById('f-precio'); return !e || e.placeholder === '10.000'; }), 'Órbita: editor de anuncio pide precio sin decimales');
        // U14: el pill PRO no se parte y no hay línea amarilla bajo la cabecera.
        ok(await p.evaluate(() => { const x = document.querySelector('.pill.pro'); const c = document.querySelector('.cfx-cinta'); return (!x || getComputedStyle(x).whiteSpace === 'nowrap') && (!c || getComputedStyle(c).display === 'none'); }), 'Órbita: PRO entero y sin línea amarilla');
        // Vitrina (núcleo): la página pública luce el perfil de la tienda.
        const id = '00000000-0000-0000-0000-0000000000aa';
        await t.sim.su('set session_replication_role = replica');
        await t.sim.su('insert into auth.users (id, email) values ($1, $2) on conflict do nothing', [id, 'vitrina@x.cl']);
        await t.sim.su("insert into public.profiles (id, email, role, empresa, slug, telefono, horario, rubro, perfil) values ($1, 'vitrina@x.cl', 'user', 'Vitrina Prueba', 'vitrina', '56912345678', 'Lun a Vie 9 a 18', 'Ropa', $2) on conflict do nothing",
          [id, JSON.stringify({ descripcion: 'Ropa hecha a mano', comuna: 'Ñuñoa', instagram: '@vitrina' })]);
        await t.sim.su('set session_replication_role = origin');
        await p.goto(t.base + '/t/?s=vitrina'); await p.waitForTimeout(1500);
        const v = await p.evaluate(() => { const s = document.querySelector('#perfil .pf'); return s && [s.querySelector('h2').textContent, s.textContent.includes('Ropa hecha a mano'), !!s.querySelector('a[href*="instagram.com/vitrina"]'), !!s.querySelector('a[href*="wa.me/56912345678"]'), document.documentElement.scrollWidth <= innerWidth + 1]; });
        ok(v && v[0] === 'Vitrina Prueba' && v.slice(1).every(Boolean), 'Órbita: tienda pública con perfil ' + JSON.stringify(v));
        await t.foto('vitrina');
        // Variantes + ficha: la opción "L" cuesta distinto y "S" está agotada; la ficha muestra la barra Agregar y el carrito cobra el precio de la opción.
        await t.sim.su("insert into public.catalog_items (owner_id, client_key, nombre, precio, categoria, opciones) values ($1, 'pol', 'Polera', 10000, 'Ropa', 'S, L')", [id]);
        await t.sim.su("insert into public.variantes (owner_id, clave, nombre, precio, stock, orden) values ($1, 'pol', 'S', null, 0, 0), ($1, 'pol', 'L', 12000, null, 1)", [id]);
        await p.goto(t.base + '/t/?s=vitrina'); await p.waitForTimeout(2000);
        await p.click('#grid .item > b'); await p.waitForTimeout(400);
        const f = await p.evaluate(() => [!!document.querySelector('.t-ficha .t-barra [data-f-add]'), !!document.querySelector('.t-ficha [data-f-op="S"].agot')]);
        await p.click('.t-ficha [data-f-op="L"]'); await p.click('.t-ficha [data-f-add]'); await p.waitForTimeout(300);
        const tot = await p.evaluate(() => document.getElementById('barTotal').textContent);
        ok(f[0] && f[1] && tot.replace(/\D/g, '') === '12000', 'Órbita: ficha con barra Agregar y precio por opción ' + JSON.stringify([f, tot]));
        await t.foto('ficha');
        // "Te puede gustar": la ficha sugiere otro producto de la misma categoría y al tocarlo cambia de producto.
        await t.sim.su("insert into public.catalog_items (owner_id, client_key, nombre, precio, categoria) values ($1, 'sho', 'Short', 8000, 'Ropa')", [id]);
        await p.goto(t.base + '/t/?s=vitrina'); await p.waitForTimeout(2000);
        await p.click('#grid .item > b'); await p.waitForTimeout(400);
        const g = await p.evaluate(() => { const b = document.querySelector('.t-ficha [data-f-mas]'); if (!b) return null; const n = b.textContent; b.click(); return [n, document.querySelector('.t-ficha h3').textContent]; });
        ok(g && g[1] !== 'Polera' && g[0].includes(g[1]), 'Órbita: Te puede gustar ' + JSON.stringify(g));
        // Volvió el stock por opción: "S" pasa de 0 a 3 y avisa al cliente que pidió "Avísame".
        const cli = '00000000-0000-0000-0000-0000000000ab';
        await t.sim.su('set session_replication_role = replica');
        await t.sim.su('insert into auth.users (id, email) values ($1, $2) on conflict do nothing', [cli, 'cli@x.cl']);
        await t.sim.su("insert into public.profiles (id, email, role) values ($1, 'cli@x.cl', 'user') on conflict do nothing", [cli]);
        await t.sim.su("insert into public.avisos_stock (cliente_id, negocio_id, clave) values ($1, $2, 'pol')", [cli, id]);
        await t.sim.su('set session_replication_role = origin');
        await t.sim.su("update public.variantes set stock = 3 where owner_id = $1 and clave = 'pol' and nombre = 'S'", [id]);
        const av = await t.sim.su("select (select count(*) from public.notifications where target_id = $1 and title like '%Polera (S)%')::int n, (select count(*) from public.avisos_stock where cliente_id = $1)::int q", [cli]);
        ok(JSON.stringify(av).includes('"n":1') && JSON.stringify(av).includes('"q":0'), 'Órbita: volvió el stock por opción avisa ' + JSON.stringify(av));
        // Pedido nuevo en vivo: con Pedidos abierto, un pedido que entra se marca (y suena/vibra) sin recargar.
        await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' }); await t.sim.su('update public.profiles set terms_at = now()');
        const [{ id: tid }] = await t.sim.su("select id from public.profiles where email = 'tienda@x.cl'");
        const { page: q } = await t.nuevo(); await q.goto(t.base + '/'); await q.waitForTimeout(1200);
        await q.fill('input[type=email]:visible', 'tienda@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3000);
        // Tienda en 5 min: barra de progreso con pasos; al compartir se marca ese paso.
        const t5 = async () => q.evaluate(() => [!document.getElementById('hoyFalta').classList.contains('hidden'), document.getElementById('hoyFaltaN').textContent, document.getElementById('hoyFaltaB').style.width]);
        const a5 = await t5(); await q.evaluate(() => { navigator.share = null; window.open = () => null; document.getElementById('hoyCompartir').click(); location.reload(); }); await q.waitForTimeout(3000); const b5 = await t5();
        ok(a5[0] && / de 7$/.test(a5[1]) && parseInt(b5[1]) === parseInt(a5[1]) + 1 && parseFloat(b5[2]) > parseFloat(a5[2]), 'Órbita: tienda en 5 min con barra ' + JSON.stringify([a5, b5]));
        await t.foto('tienda5', q);
        await q.goto(t.base + '/apps/pedidos/'); await q.waitForTimeout(2500);
        await t.sim.su("insert into public.pedidos (negocio_id, cliente_id, lineas, subtotal, total, entrega, estado) values ($1, $2, '[{\"nombre\":\"Polera\",\"cant\":1,\"precio\":10000,\"subtotal\":10000}]', 10000, 10000, 'retiro', 'recibido')", [tid, cli]);
        await q.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await q.waitForTimeout(1500);
        ok(await q.locator('.card.nuevo').count() === 1, 'Órbita: pedido nuevo en vivo en Pedidos');
        // Push de pedido abre ESE pedido: el aviso lleva ?p=<id> y la página lo busca y lo marca.
        await t.sim.su("begin; insert into public.pedidos (negocio_id, cliente_id, lineas, subtotal, total, entrega, estado) values ('" + tid + "', '" + cli + "', '[]', 5000, 5000, 'retiro', 'entregado'); select public.notify_user('" + tid + "', 'p', 'p', 'apps/pedidos/'); commit;");
        const [{ pid, url }] = await t.sim.su("select url, substr(url, 17) pid from public.notifications where title = 'p' order by created_at desc limit 1");
        await q.goto(t.base + '/apps/pedidos/?p=' + pid); await q.waitForTimeout(3500);
        ok(/^apps\/pedidos\/\?p=/.test(url) && await q.locator('[data-ped="' + pid + '"].nuevo').count() === 1, 'Órbita: push de pedido abre el pedido exacto ' + url);
        // Inventario: la Caja pide la opción, la venta descuenta producto y opción en el servidor, y ➕ Entró suma.
        await t.sim.su("insert into public.catalog_items (owner_id, client_key, nombre, precio, stock, opciones) values ($1, 'cam', 'Camisa', 9000, 10, 'Rojo, Azul')", [tid]);
        await t.sim.su("insert into public.variantes (owner_id, clave, nombre, precio, stock, orden) values ($1, 'cam', 'Rojo', 9500, 5, 0), ($1, 'cam', 'Azul', null, 5, 1)", [tid]);
        await q.evaluate((k) => localStorage.setItem('caja:migrado', '1') || localStorage.setItem('caja:' + k + ':productos', JSON.stringify([{ id: 'cam', nombre: 'Camisa', precio: 9000, costo: 4000, stock: 10, categoria: '', publicado: true, ops: 'Rojo, Azul', vars: [] }])), tid);
        await q.goto(t.base + '/apps/caja/'); await q.waitForTimeout(3000);
        await q.click('#prods .prod[data-id="cam"]'); await q.waitForTimeout(300);
        await q.click('.elegir button:has-text("Rojo")'); await q.waitForTimeout(200);
        const tk = await q.evaluate(() => [document.getElementById('ticket').textContent.includes('Camisa (Rojo)'), document.getElementById('ticketTotal').textContent]);
        await q.click('#bCobrar'); await q.waitForTimeout(1500);
        const st = await t.sim.su("select (select stock from public.catalog_items where client_key = 'cam')::int p, (select stock from public.variantes where clave = 'cam' and nombre = 'Rojo')::int r");
        await q.evaluate(() => document.querySelector('[data-v=productos]').click()); await q.waitForTimeout(300);
        await q.evaluate(() => { window.prompt = () => '4'; });
        await q.click('#invLista [data-inv="cam"][data-op="Azul"]'); await q.waitForTimeout(1500);
        const az = await t.sim.su("select stock::int a from public.variantes where clave = 'cam' and nombre = 'Azul'");
        const inv = await q.evaluate(() => document.getElementById('invKpis').textContent);
        ok(tk[0] && tk[1].replace(/\D/g, '') === '9500' && st[0].p === 9 && st[0].r === 4 && az[0].a === 9 && inv.includes('unidades'), 'Órbita: inventario y venta por opción ' + JSON.stringify([tk, st, az, inv]));
        await t.foto('inventario', q);
        // Equipo con roles: el dueño cambia el rol en Mi equipo; Bodega ve Inventario (sin Vender) y el servidor no la deja vender.
        const eid = '00000000-0000-0000-0000-0000000000eb';
        await t.sim.su('set session_replication_role = replica');
        await t.sim.su("insert into auth.users (id, email) values ($1, 'bodega@x.cl') on conflict do nothing", [eid]);
        await t.sim.su("insert into auth.claves (email, pass) values ('bodega@x.cl', 'clave123') on conflict do nothing");
        await t.sim.su("insert into public.profiles (id, email, role, empresa, negocio_id) values ($1, 'bodega@x.cl', 'equipo', 'Bodeguero', $2) on conflict do nothing", [eid, tid]);
        await t.sim.su('set session_replication_role = origin');
        await t.sim.su("update public.profiles set plan = 'pro' where id = $1", [tid]);
        await q.goto(t.base + '/#equipo'); await q.waitForTimeout(2500);
        await q.evaluate(() => document.getElementById('cEquipo').scrollIntoView());
        await q.selectOption('select[data-rol="bodega@x.cl"]', 'bodega'); await q.waitForTimeout(1200);
        const [{ r: rolBd }] = await t.sim.su("select equipo_rol r from public.profiles where email = 'bodega@x.cl'");
        const { page: w } = await t.nuevo(); await w.goto(t.base + '/'); await w.waitForTimeout(1200);
        await w.fill('input[type=email]:visible', 'bodega@x.cl'); await w.fill('input[type=password]:visible', 'clave123'); await w.press('input[type=password]:visible', 'Enter'); await w.waitForTimeout(3000);
        await w.goto(t.base + '/apps/caja/'); await w.waitForTimeout(3000);
        const bo = await w.evaluate(async () => { const vis = (s) => { const e = document.querySelector(s); return !!e && !e.classList.contains('hidden') && e.offsetParent !== null; };
          let vender = 'ok'; try { await Cuenta.rpc('caja_descontar', { p_items: [{ clave: 'cam', cant: 1 }] }); vender = 'vendió'; } catch (e) { vender = e.message; }
          return [vis('#invCard'), vis('nav.tabs button[data-v="vender"]'), vis('#bGuardarProd'), document.getElementById('invLista').textContent.includes('Camisa'), vender]; });
        await w.evaluate(() => { window.prompt = () => '2'; });
        await w.click('#invLista [data-inv="cam"][data-op="Azul"]'); await w.waitForTimeout(1500);
        const [{ a: az2 }] = await t.sim.su("select stock::int a from public.variantes where clave = 'cam' and nombre = 'Azul'");
        ok(rolBd === 'bodega' && bo[0] && !bo[1] && !bo[2] && bo[3] && /permiso/i.test(bo[4]) && az2 === 11, 'Órbita: equipo con roles (bodega) ' + JSON.stringify([rolBd, bo, az2]));
        await t.foto('equipo-bodega', w);
        // Vitrina también en el catálogo con cuenta: el cliente ve la portada y "Compartir" da el link público.
        const vc = '00000000-0000-0000-0000-0000000000ac';
        await t.sim.su('set session_replication_role = replica');
        await t.sim.su("insert into auth.users (id, email) values ($1, 'clivit@x.cl') on conflict do nothing", [vc]);
        await t.sim.su("insert into auth.claves (email, pass) values ('clivit@x.cl', 'clave123') on conflict do nothing");
        await t.sim.su("insert into public.profiles (id, email, role, empresa, negocio_id, terms_at) values ($1, 'clivit@x.cl', 'client', 'Cliente', $2, now()) on conflict do nothing", [vc, id]);
        await t.sim.su('set session_replication_role = origin');
        const { page: c } = await t.nuevo(); await c.goto(t.base + '/'); await c.waitForTimeout(1200);
        await c.fill('input[type=email]:visible', 'clivit@x.cl'); await c.fill('input[type=password]:visible', 'clave123'); await c.press('input[type=password]:visible', 'Enter'); await c.waitForTimeout(3000);
        await c.goto(t.base + '/apps/catalogo/'); await c.waitForTimeout(2500);
        const vt = await c.evaluate(async () => { const s = document.querySelector('#vProductos #perfil .pf'); if (!s) return null; let u = ''; navigator.share = async (d) => { u = d.url; };
          s.querySelector('[data-pf="compartir"]').click(); await new Promise((r) => setTimeout(r, 200));
          return [s.querySelector('h2').textContent, s.textContent.includes('Ropa hecha a mano'), !!s.querySelector('a[href*="wa.me/56912345678"]'), /\/t\/\?s=vitrina$/.test(u), document.documentElement.scrollWidth <= innerWidth + 1]; });
        ok(vt && vt[0] === 'Vitrina Prueba' && vt.slice(1).every(Boolean), 'Órbita: vitrina en catálogo con cuenta ' + JSON.stringify(vt));
        await t.foto('vitrina-catalogo', c);
        // Vista previa del dueño: productos con los mismos botones que ve el cliente (al tocar solo avisa).
        await q.goto(t.base + '/apps/catalogo/'); await q.waitForTimeout(2500);
        const pv = await q.evaluate(() => [document.querySelectorAll('#grid [data-add]').length, document.querySelectorAll('#grid [data-prev]').length, document.querySelectorAll('#grid .opc-ch').length]);
        await q.click('#grid [data-add]'); await q.waitForTimeout(300);
        const pc = await q.evaluate(() => document.body.textContent.includes('Vista previa'));
        ok(pv.every((n) => n > 0) && pc, 'Órbita: vista previa con botones ' + JSON.stringify([pv, pc]));
        // Mercado Pago automático: el dueño conecta su Access Token; el cliente paga en Mercado Pago y al volver el pedido se aprueba solo.
        await t.sim.su("insert into extensions.http_respuestas (url_like, content) values ('%/users/me', '{\"nickname\":\"TIENDAANA\"}') on conflict do nothing");
        await q.goto(t.base + '/'); await q.waitForTimeout(2500);
        await q.evaluate(() => { document.getElementById('mpTok').value = 'APP_USR-1234567890-abcdefghijklmnopqrstuvwxyz'; document.querySelector('#mpBody [data-mp="guardar"]').click(); }); await q.waitForTimeout(1500);
        const mc = await q.evaluate(() => [document.getElementById('mpBody').textContent.includes('TIENDAANA'), !!document.getElementById('mpOn')]);
        const mk = 'mp' + 'x'.repeat(22);
        const [{ id: mpid }] = await t.sim.su("insert into public.pedidos (negocio_id, invitado_nombre, invitado_tel, lineas, subtotal, total, entrega, estado, retenido_hasta, token) values ($1, 'Rosa', '56911112222', '[{\"nombre\":\"Polera\",\"cant\":1,\"precio\":10000,\"subtotal\":10000}]', 10000, 10000, 'retiro', 'pagando', now() + interval '30 minutes', $2) returning id", [tid, mk]);
        await t.sim.su("insert into extensions.http_respuestas (url_like, content) values ('%/checkout/preferences', $1), ('%/v1/payments/search%', $2) on conflict (url_like) do update set content = excluded.content",
          [JSON.stringify({ init_point: t.base + '/r/?t=' + mk + '&payment_id=99&status=approved' }), JSON.stringify({ results: [{ id: 99, status: 'approved', external_reference: mpid, transaction_amount: 10000, currency_id: 'CLP' }] })]);
        const { page: m } = await t.nuevo(); await m.goto(t.base + '/r/?t=' + mk); await m.waitForTimeout(2000);
        const mv = await m.evaluate(() => [!document.getElementById('rowMp').classList.contains('hidden'), document.getElementById('rowComp').classList.contains('hidden'), document.getElementById('bMp').textContent]);
        await t.foto('mp-pagar', m);
        await m.click('#bMp'); await m.waitForTimeout(3500);
        const [md] = await t.sim.su("select estado, mp_pago, (select count(*) from public.notifications where target_id = $2 and title like '%Mercado Pago%')::int n, (select content from extensions.http_log where uri like '%preferences' order by n desc limit 1) body from public.pedidos where id = $1", [mpid, tid]);
        const me = await m.evaluate(() => [document.getElementById('estado').textContent, location.search]);
        ok(mc.every(Boolean) && mv[0] && mv[1] && /Mercado Pago/.test(mv[2]) && md.estado === 'preparando' && md.mp_pago === '99' && md.n === 1 &&
          JSON.parse(md.body).external_reference === mpid && JSON.parse(md.body).items[0].unit_price === 10000 && /Preparando/.test(me[0]) && !/payment_id/.test(me[1]),
          'Órbita: Mercado Pago automático ' + JSON.stringify([mc, mv, md.estado, md.mp_pago, md.n, me]));
        await t.foto('mp-pagado', m);
        // Boleta SII: el dueño guarda sus datos (manual) y anota el folio; el cliente lo ve. Luego automática con OpenFactura (cada 5 min).
        await q.goto(t.base + '/#boleta'); await q.waitForTimeout(2500);
        await q.evaluate(() => { const f = (i, v) => { document.getElementById(i).value = v; }; f('bRut', '76.795.561-8'); f('bRazon', 'Tienda Ana SpA'); f('bGiro', 'Venta de ropa'); f('bDir', 'Calle 1'); f('bComuna', 'Santiago');
          document.querySelector('#boletaBody [data-bo="guardar"]').click(); }); await q.waitForTimeout(1500);
        await q.goto(t.base + '/apps/pedidos/?f=activos'); await q.waitForTimeout(2500);
        await q.evaluate(() => { window.prompt = () => '1234'; });
        await q.click('[data-bol="' + mpid + '"]'); await q.waitForTimeout(1500);
        const bq = await q.evaluate(() => document.getElementById('lista').textContent.includes('Boleta N° 1234'));
        await m.reload(); await m.waitForTimeout(2500);
        const bm = await m.evaluate(() => document.getElementById('boleta').textContent);
        await t.sim.su("insert into extensions.http_respuestas (url_like, content) values ('%haulmer.com/v2/dte/document', '{\"FOLIO\":555,\"SELF_SERVICE\":{\"url\":\"https://of.cl/b/555\"}}') on conflict (url_like) do update set content = excluded.content");
        await q.goto(t.base + '/#boleta'); await q.waitForTimeout(2500);
        await q.evaluate(() => { document.querySelector('[name=bModo][value=openfactura]').click(); document.getElementById('bKey').value = '928e15a2d14d4a6292345f04960f4bd3';
          document.querySelector('#boletaBody [data-bo="guardar"]').click(); }); await q.waitForTimeout(1500);
        const [{ id: bid }] = await t.sim.su("insert into public.pedidos (negocio_id, invitado_nombre, invitado_tel, lineas, subtotal, descuento, total, entrega, estado, pagado_at, token) values ($1, 'Rosa', '56911112222', '[{\"nombre\":\"Polera\",\"cant\":2,\"precio\":5000,\"subtotal\":10000}]', 10000, 1000, 9000, 'retiro', 'preparando', now(), $2) returning id", [tid, 'bo' + 'x'.repeat(22)]);
        const [{ n: bn }] = await t.sim.su('select public.boleta_pendientes() n');
        const [bd] = await t.sim.su("select boleta_folio f, boleta_url u, (select content from extensions.http_log where uri like '%haulmer%' order by n desc limit 1) body, (select rut from public.boleta_cuentas where owner_id = $2) rut from public.pedidos where id = $1", [bid, tid]);
        const dte = JSON.parse(bd.body).dte;
        ok(bq && /1234/.test(bm) && /Tienda Ana SpA/.test(bm) && bn >= 1 && bd.f === '555' && bd.u === 'https://of.cl/b/555' && bd.rut === '76795561-8' &&
          dte.Encabezado.IdDoc.TipoDTE === 39 && dte.Encabezado.Totales.MntTotal === 9000 && dte.Encabezado.Totales.MntNeto + dte.Encabezado.Totales.IVA === 9000 && dte.DscRcgGlobal[0].ValorDR === 1000,
          'Órbita: boleta SII ' + JSON.stringify([bq, bm, bn, bd.f, bd.u, bd.rut]));
        await t.foto('boleta', m);
      }
      const e = t.errores.filter((x) => !/404|Failed to load resource|net::|Sin permiso para vender/.test(x));
      ok(!e.length, app + ': sin errores ' + e.join(' | ').slice(0, 200));
    } catch (x) { fallas++; console.log(x.message); await t.foto(app + '-central-error'); }
    await t.cerrar();
  }
  console.log(fallas ? 'HAY FALLAS: ' + fallas : 'TODO OK'); process.exit(fallas ? 1 : 0);
})();
