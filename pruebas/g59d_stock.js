// G59d · 🧩 BiciTaller módulo 📦 Repuestos y stock + 🛒 pedido a proveedor (G68 genérico).
// Sin comprarlo (venta prendida): Más → 📦 Repuestos ofrece el módulo (demo) y la base no deja usarlo; entregar no descuenta.
// Con él: ✨ repuestos de fábrica, proveedor, el stock baja solo al entregar (una vez), aviso "Se está acabando", Hoy avisa,
// 🛒 pedido por WhatsApp con la cantidad, 📥 Llegó suma, ➕ corrige y la orden muestra "Quedan N en stock".
// FALLA con el código viejo (no existen taller_stock, las tablas repuestos/proveedores ni Más → 📦).
// Uso: ./base.sh /home/user/taller p_g59d && ANCHO=320 node g59d_stock.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g59d');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const toca = async (sel, pg) => { pg = pg || p; await pg.evaluate((x) => document.querySelector(x).scrollIntoView({ block: 'center' }), sel); await pg.waitForTimeout(300); await pg.click(sel); };
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  const dialogo = () => p.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => d.innerText).join(' '));
  const cerrarDialogos = () => p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  const stock = async (n) => (await su('select stock from public.repuestos where nombre = $1', [n]))[0].stock;
  const CAM = 'Cámara aro 29';
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    const hoy = (await su("select (now() at time zone 'America/Santiago')::date::text d"))[0].d;
    await como('taller@x.cl', "public.taller_reserva_manual($2::date, '10:00', null, 'Pedro Pérez', '+56911112222', 'Trek Marlin', '', true)", [hoy]);
    await como('taller@x.cl', "public.taller_reserva_manual($2::date, '11:00', null, 'Diego Soto', '+56933334444', 'Oxford', '', true)", [hoy]);
    const dueno = (await su("select id from auth.users where email = 'taller@x.cl'"))[0].id;
    const id = (await su("select id from public.reservas where nombre = 'Pedro Pérez'"))[0].id;
    const id2 = (await su("select id from public.reservas where nombre = 'Diego Soto'"))[0].id;
    const items = JSON.stringify([{ nombre: CAM, cant: 2, precio: 6000 }, { nombre: 'Mano de obra', cant: 1, precio: 10000 }]);
    await su("update public.reservas set estado = 'lista', items = $1::jsonb where id = $2", [items, id]);
    await su("update public.reservas set estado = 'en_reparacion', items = $1::jsonb where id = $2", [JSON.stringify([{ nombre: CAM, cant: 1, precio: 6000 }]), id2]);
    await su("update public.talleres set premium_hasta = now() - interval '1 day'");
    const notis = async (para, txt) => (await su('select count(*)::int n from public.notificaciones where para = $1 and titulo like $2', [para, '%' + txt + '%']))[0].n;

    // Venta prendida y sin comprar
    await su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
    ok((await su("select 'stock' = any (public.cfx_modulos_app()) x"))[0].x, '🧩 BiciTaller vende 📦 stock (cfx_modulos_app)');
    ok((await como('taller@x.cl', 'public.taller_stock()')).bloqueado === true, '🔒 sin módulo: taller_stock bloqueado');
    let err = ''; await como('taller@x.cl', "public.taller_repuesto_guardar('{\"nombre\":\"X\"}')").catch((e) => { err = e.message; });
    ok(/módulo/.test(err), '🔒 sin módulo la base no deja crear repuestos');

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await p.evaluate(() => { location.hash = 'mas/stock'; }); await p.waitForTimeout(2000);
    ok(await p.locator('[data-ofrecer="stock"]').count() === 1, '📦 Más → Repuestos sin módulo: "🧩 Ver el módulo"');
    await toca('[data-ofrecer="stock"]'); await p.waitForTimeout(1500);
    ok(/stock/i.test(await dialogo()), '▶️ abre la demo de 📦');
    await t.foto('g59d_demo'); await cerrarDialogos();

    // Con el módulo
    await su("insert into public.cfx_modulos_negocio (negocio, modulo, hasta) values ($1, 'stock', now() + interval '30 days')", [dueno]);
    await p.evaluate(() => { history.replaceState(null, '', '#hoy'); }); await p.reload(); await p.waitForTimeout(3500); await t.sinModales();
    await p.evaluate(() => { location.hash = 'mas/stock'; }); await p.waitForTimeout(2000);
    await toca('#rFab'); await p.waitForTimeout(2000);
    const nRep = (await su('select count(*)::int n from public.repuestos'))[0].n;
    ok(nRep >= 30, '✨ Repuestos de fábrica: ' + nRep + ' con stock 0');
    await toca('#rFab'); await p.waitForTimeout(1500);
    ok((await su('select count(*)::int n from public.repuestos'))[0].n === nRep, '✨ otra vez no duplica');
    const prov = await como('taller@x.cl', "public.taller_proveedor_guardar('{\"nombre\":\"Distribuidora Sur\",\"telefono\":\"+56977778888\"}')");
    await su('update public.repuestos set stock = 3, minimo = 2, proveedor_id = $1 where nombre = $2', [prov, CAM]);

    // Entregar descuenta (una vez) y avisa
    await como('taller@x.cl', "public.taller_estado($2, 'completada')", [id]);
    ok(await stock(CAM) === 1, '🎉 al entregar baja el stock (3 − 2 = 1)');
    ok(await notis(dueno, 'Se está acabando') === 1, '📦 aviso al taller: "Se está acabando"');
    await como('taller@x.cl', "public.taller_estado($2, 'lista')", [id]);
    await como('taller@x.cl', "public.taller_estado($2, 'completada')", [id]);
    ok(await stock(CAM) === 1, 'entregar de nuevo no descuenta dos veces');

    // Hoy avisa → 🛒 pedido
    await p.evaluate(() => { history.replaceState(null, '', '#hoy'); }); await p.reload(); await p.waitForTimeout(3500); await t.sinModales();
    ok(/1 repuesto por pedir/.test(await p.locator('#hStock').innerText()), '🏠 Hoy: "📦 1 repuesto por pedir"');
    await toca('#hStock [data-m="stock"]'); await p.waitForTimeout(2000);
    await toca('#rPedido'); await p.waitForTimeout(1200);
    const wa = decodeURIComponent(await p.locator('dialog[open] a[href*="wa.me"]').first().getAttribute('href').catch(() => '') || '');
    ok(/3 × Cámara aro 29/.test(wa) && /Bici Ana/.test(wa), '🛒 pedido por WhatsApp a Distribuidora Sur: "3 × Cámara aro 29"');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin scroll horizontal a 320 px');
    await t.foto('g59d_pedido');
    await toca('dialog[open] [data-llego]'); await p.waitForTimeout(2000);
    ok(await stock(CAM) === 4, '📥 Llegó: suma lo pedido (1 + 3 = 4)');
    const rid = (await su('select id from public.repuestos where nombre = $1', [CAM]))[0].id;
    await toca('[data-mas="' + rid + '"][data-n="1"]'); await p.waitForTimeout(1500);
    ok(await stock(CAM) === 5, '➕ suma uno');
    await t.foto('g59d_lista');

    // Orden en reparación: muestra cuánto queda
    await p.evaluate(() => { history.replaceState(null, '', '#hoy'); }); await p.reload(); await p.waitForTimeout(3500); await t.sinModales();
    await toca('#hTablero [data-tj="' + id2 + '"] b'); await p.waitForTimeout(2500);
    ok(/Quedan 5 en stock/.test(await p.locator('#dItems').innerText()), '🧾 la orden muestra "📦 Quedan 5 en stock"');
    await t.foto('g59d_orden');
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); await t.foto('g59d_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
