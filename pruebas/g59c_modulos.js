// G59c · 🧩 BiciTaller módulos 🔔 Aviso "bici lista" y ⏰ Recordatorio de mantención.
// Sin comprarlos (venta prendida): no sale la ventana de aviso, la orden ofrece el módulo, mantención sale bloqueada con "🧩 O activa solo esta función"
// y las tareas automáticas no avisan. Con ellos: ventana 📲 WhatsApp con total y link al dejarla lista, recordatorio a los 2 días (cliente y taller,
// una sola vez) y aviso automático de mantención al cliente aunque no sea Premium.
// FALLA con el código viejo (no existen lista_at, los módulos aviso_lista/mantencion ni la ventana #avLista).
// Uso: ./base.sh /home/user/taller p_g59c && ANCHO=320 node g59c_modulos.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g59c');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const toca = async (sel, pg) => { pg = pg || p; await pg.evaluate((x) => document.querySelector(x).scrollIntoView({ block: 'center' }), sel); await pg.waitForTimeout(300); await pg.click(sel); };
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  const dialogo = () => p.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => d.innerText).join(' '));
  const cerrarDialogos = () => p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    const tid = (await su('select id from public.talleres'))[0].id;
    await t.sim.crearUsuario('cli@x.cl', 'clave123', { rol: 'cliente', nombre: 'Pedro', taller: tid });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    const hoy = (await su("select (now() at time zone 'America/Santiago')::date::text d"))[0].d;
    await como('taller@x.cl', "public.taller_reserva_manual($2::date, '10:00', null, 'Pedro Pérez', '+56911112222', 'Trek Marlin', '', true)", [hoy]);
    await como('taller@x.cl', "public.taller_reserva_manual($2::date, '11:00', null, 'Diego Soto', '+56933334444', 'Oxford', '', true)", [hoy]);
    await como('taller@x.cl', "public.taller_reserva_manual($2::date - 120, '12:00', null, 'Lucía Rojas', '+56955556666', 'Giant', '', true)", [hoy]);
    const cli = (await su("select id from auth.users where email = 'cli@x.cl'"))[0].id;
    const dueno = (await su("select id from auth.users where email = 'taller@x.cl'"))[0].id;
    await su("update public.reservas set estado = 'esperando_repuesto', total = 27000, cliente_id = $1 where nombre in ('Pedro Pérez', 'Diego Soto')", [cli]);
    await su("update public.reservas set estado = 'completada', cliente_id = $1, proxima_mantencion = current_date - 1, mantencion_avisada = false where nombre = 'Lucía Rojas'", [cli]);
    const id = (await su("select id from public.reservas where nombre = 'Pedro Pérez'"))[0].id;
    const id2 = (await su("select id from public.reservas where nombre = 'Diego Soto'"))[0].id;
    await su("update public.talleres set premium_hasta = now() - interval '1 day'");  // taller Free (sin la prueba Premium)
    const notis = async (para, txt) => (await su('select count(*)::int n from public.notificaciones where para = $1 and titulo like $2', [para, '%' + txt + '%']))[0].n;

    // Venta de módulos prendida y el taller NO los compró
    await su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
    await su("update public.cfx_config set valor = jsonb_set(jsonb_set(valor, '{precios,aviso_lista}', '1490'), '{precios,mantencion}', '1490') where clave = 'modulos_venta'");
    const cat = await su("select clave from public.cfx_modulos_catalogo() where clave in ('aviso_lista', 'mantencion', 'stock')");
    ok(cat.length === 3, '🧩 el núcleo trae 🔔 aviso lista, ⏰ mantención y 📦 stock en el catálogo');
    ok((await como('taller@x.cl', 'public.taller_recordatorios()')).bloqueado === true, '🔒 sin módulo ni Premium: mantención bloqueada');
    await su('select public.tareas_periodicas()');
    ok(await notis(cli, 'mantención') === 0, 'sin el módulo no se avisa la mantención (cliente Free)');

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();

    // 🔔 sin módulo: pasa a Lista sin ventana; la orden lo ofrece
    await toca('#hTablero [data-mover="' + id + '"][data-a="lista"]'); await p.waitForTimeout(2500);
    ok((await su('select estado from public.reservas where id = $1', [id]))[0].estado === 'lista', '🚦 › mueve la bici a Lista');
    ok(await p.locator('#avLista').count() === 0, 'sin el módulo no sale la ventana de aviso');
    ok((await su('select lista_at is not null x from public.reservas where id = $1', [id]))[0].x, 'la base guarda cuándo quedó lista');
    await cerrarDialogos();
    await toca('#hTablero [data-tj="' + id + '"] b'); await p.waitForTimeout(2000);
    ok(await p.locator('[data-ofrecer="aviso_lista"]').count() === 1, 'la orden lista ofrece 🧩 Aviso "bici lista"');
    await toca('[data-ofrecer="aviso_lista"]'); await p.waitForTimeout(1500);
    ok(/bici lista/i.test(await dialogo()), '▶️ abre la demo del módulo');
    await t.foto('g59c_demo_lista'); await cerrarDialogos();
    await su("update public.reservas set lista_at = now() - interval '3 days' where id = $1", [id]);
    await su('select public.tareas_periodicas()');
    ok(await notis(cli, 'te espera') === 0, 'sin el módulo no se recuerda retirar');

    // ⏰ pantalla bloqueada con la opción de módulo
    await p.evaluate(() => { location.hash = 'mas/recordar'; }); await p.waitForTimeout(2000);
    ok(await p.locator('[data-ofrecer="mantencion"]').count() === 1, '⏰ Recordatorios: "🧩 O activa solo esta función"');
    await toca('[data-ofrecer="mantencion"]'); await p.waitForTimeout(1500);
    ok(/mantención/i.test(await dialogo()), '▶️ abre la demo de mantención');
    await t.foto('g59c_demo_mant'); await cerrarDialogos();

    // Con los 2 módulos comprados
    await su("insert into public.cfx_modulos_negocio (negocio, modulo, hasta) values ($1, 'aviso_lista', now() + interval '30 days'), ($1, 'mantencion', now() + interval '30 days')", [dueno]);
    await su('select public.tareas_periodicas()');
    ok(await notis(cli, 'te espera') === 1 && await notis(dueno, 'sin retirar') === 1, '🔔 a los 2 días: avisa al cliente y al taller');
    ok(await notis(cli, 'mantención') === 1, '⏰ con el módulo el cliente Free recibe el aviso de mantención');
    await su('select public.tareas_periodicas()');
    ok(await notis(cli, 'te espera') === 1, 'el recordatorio de retiro sale una sola vez');
    ok((await como('taller@x.cl', 'public.taller_recordatorios()')).lista.length === 1, '⏰ lista de "Les toca mantención" desbloqueada (Lucía)');

    await p.evaluate(() => { history.replaceState(null, '', '#hoy'); }); await p.reload(); await p.waitForTimeout(3500); await t.sinModales();
    ok(/Lista hace 3 días/.test(await p.locator('#hTablero').innerText()), '⏳ el tablero muestra "Lista hace 3 días"');
    await toca('#hTablero [data-mover="' + id2 + '"][data-a="lista"]'); await p.waitForTimeout(2500);
    const href = await p.locator('#avLista').getAttribute('href').catch(() => '');
    ok(/wa\.me/.test(href || '') && /lista/.test(decodeURIComponent(href || '')) && /27\.000/.test(decodeURIComponent(href || '')), '📲 ventana con WhatsApp listo: "está lista" + total $27.000 + link');
    const ancho = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    ok(ancho, 'sin scroll horizontal a 320 px');
    await t.foto('g59c_aviso');
    await cerrarDialogos();
    await p.evaluate(() => { location.hash = 'mas/recordar'; }); await p.waitForTimeout(2000);
    ok(await p.evaluate(() => /Lucía/.test(document.body.innerText) && !!document.querySelector('a[href*="wa.me"]')), '⏰ Más → Recordatorios muestra a Lucía con 📲 Recordar');

    // Al volver a Lista se puede recordar de nuevo
    await como('taller@x.cl', "public.taller_estado($2, 'en_reparacion')", [id]);
    await como('taller@x.cl', "public.taller_estado($2, 'lista')", [id]);
    ok((await su('select lista_recordada from public.reservas where id = $1', [id]))[0].lista_recordada === false, 'si vuelve a quedar lista, el recordatorio se arma de nuevo');
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); await t.foto('g59c_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
