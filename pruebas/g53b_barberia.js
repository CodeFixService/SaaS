// G53b · 💈 Barbería: 6 módulos nuevos sueltos (NO vienen en Premium): 💳 anti-falta, 🖼️ portafolio, 🎁 gift cards, 🔁 membresía,
// 🛍️ productos+stock en caja, 🤖 reservas por WhatsApp/Instagram + ⏳ cuántos esperan hoy en Inicio.
// FALLA con el código viejo (no existen bar_antifalta, portafolio_*, giftcard_*, membresia_*, producto_*, espera_resumen).
// Uso: (cd /home/user/Barberia/supabase/pruebas && ./correr.sh "-h /var/tmp/pgb -p 54329 -U postgres") && ANCHO=320 node g53b_barberia.js
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
(async () => {
  const t = await abrir('/home/user/barberia', 'barberia_prueba');
  const p = t.page, su = t.sim.su;
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  const falla = async (email, expr, re, msg, args) => { let e = ''; try { await como(email, expr, args); } catch (x) { e = x.message; } assert(re.test(e), msg + ' (' + e + ')'); };
  const entrar = async (email) => {
    await p.goto(t.base + '/'); await p.waitForTimeout(1000);
    await p.evaluate(() => { try { localStorage.clear(); } catch (e) { /* */ } });
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', email); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales();
  };
  try {
    await su("create table if not exists auth.claves (email text primary key, pass text not null)");
    await su("alter table auth.users add column if not exists last_sign_in_at timestamptz");
    await su("insert into auth.claves select email, 'clave123' from auth.users on conflict do nothing");
    await su("update public.profiles set clave_temporal = false, tour_visto = true where true").catch(() => {});
    await su("delete from public.cfx_modulos_negocio");
    await su("update public.profiles set plan = 'premium', premium_until = now() + interval '20 days' where email = 'dueno@test.cl'");
    const bid = (await su("select barberia_id b from public.profiles where email = 'dueno@test.cl'"))[0].b;
    const dueno = (await su("select id from public.profiles where email = 'dueno@test.cl'"))[0].id;
    const cod = (await su("select codigo from public.barberias where id = $1", [bid]))[0].codigo;
    await su("update public.profiles set barberia_id = $1 where email in ('carlos@test.cl', 'pedro@test.cl')", [bid]);
    await su("update public.barberias set link_pago = 'https://pago.test/abono', abono = 0, pago1_monto = 0 where id = $1", [bid]);
    await su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
    const NUEVOS = ['espera', 'antifalta', 'portafolio', 'giftcards', 'membresia', 'productos', 'agenda_redes'];
    const s = (await su("select public.bar_sueltos($1) s", [bid]))[0].s;
    assert(NUEVOS.every((k) => s[k] === false) && NUEVOS.length === 7, 'Venta prendida: Premium NO trae los 6 nuevos ' + JSON.stringify(s));

    // 💳 Anti-falta
    await falla('dueno@test.cl', "public.guardar_barberia('{\"antifalta_abono\": 5000}')", /módulo/, 'Sin módulo: no guarda anti-falta');
    for (const k of NUEVOS) await su("select public.cfx_modulos_dar($1, $2, 30, 'pago')", [dueno, k]);
    await como('dueno@test.cl', "public.guardar_barberia('{\"antifalta_abono\": 5000, \"antifalta_faltas\": 2}')");
    const carlos = (await su("select id, telefono from public.profiles where email = 'carlos@test.cl'"))[0];
    await su("delete from public.reservas where barberia_id = $1 and (cliente_id = $2 or cliente_tel = public.tel_norm($3)) and estado = 'no_vino'", [bid, carlos.id, carlos.telefono]);
    assert((await su("select public.bar_antifalta($1, $2, $3) a", [bid, carlos.id, carlos.telefono]))[0].a === null, 'Sin faltas: anti-falta no pide nada');
    const falta = () => su("insert into public.reservas (barberia_id, barbero_id, cliente_id, inicio, fin, servicios, total, estado) " +
      "values ($1, $2, $3, now() - interval '3 days' - random() * interval '20 days', now() - interval '2 days', '[]', 8000, 'no_vino')", [bid, dueno, carlos.id]);
    await falta();
    const a1 = (await su("select public.bar_antifalta($1, $2, $3) a", [bid, carlos.id, carlos.telefono]))[0].a;
    assert(a1.abono === 5000 && !a1.bloqueado, '1 falta: abono obligatorio de $5.000 ' + JSON.stringify(a1));
    const a1b = (await su("select public.bar_antifalta($1, null, '9 8765 4321') a", [bid]))[0].a;
    assert(a1b && a1b.faltas === 1, 'Lo reconoce también por su WhatsApp (sin cuenta)');
    await falta();
    await falla('dueno@test.cl', "public.reservar_invitado($2, null, now() + interval '1 day', '{}'::uuid[], 'Carlos', '+56 9 8765 4321')", /falta\(s\) sin avisar/, '2 faltas: no puede reservar solo por el link', [cod]);

    // 🖼️ Portafolio
    await como('pedro@test.cl', "public.portafolio_agregar($2, 'Degradado')", [PNG]);
    const vp = await como('dueno@test.cl', 'public.vista_publica($2)', [cod]);
    assert(vp.portafolio && vp.portafolio.length >= 1 && vp.portafolio[0].titulo === 'Degradado', 'El barbero sube foto y sale en el link /b/');
    await falla('dueno@test.cl', "public.portafolio_agregar('data:text/html;base64,AAAA')", /no válida/, 'Rechaza lo que no es imagen');

    // 🎁 Gift cards
    const g = await como('dueno@test.cl', "public.giftcard_crear(15000, 'Pedro', 'Ana', 'transferencia')");
    assert(/^GC[0-9A-F]{6}$/.test(g.codigo) && g.saldo === 15000, 'Gift card creada ' + g.codigo);
    assert((await su("select count(*)::int n from public.caja where barberia_id = $1 and servicio = $2 and monto = 15000", [bid, '🎁 Gift card ' + g.codigo]))[0].n === 1, 'La venta de la gift card entra a la caja');
    const g2 = await como('pedro@test.cl', "public.giftcard_canjear($2, 9000)", [g.codigo.toLowerCase()]);
    assert(g2.saldo === 6000, 'El barbero canjea $9.000 (código en minúscula): queda $6.000');
    await falla('pedro@test.cl', "public.giftcard_canjear($2, 7000)", /Le queda \$6\.000/, 'No deja canjear más que el saldo', [g.codigo]);
    await falla('pedro@test.cl', "public.giftcard_crear(5000)", /Solo el dueño/, 'El barbero no vende gift cards');

    // 🔁 Membresía
    const m = await como('dueno@test.cl', "public.membresia_guardar(jsonb_build_object('nombre', 'Carlos', 'cliente_id', $2::text, 'cortes', 2, 'precio', 20000, 'meses', 1))", [carlos.id]);
    assert(m.vigente && m.quedan === 2, 'Membresía de 2 cortes al mes, vigente');
    assert((await su("select count(*)::int n from public.caja where barberia_id = $1 and servicio like '🔁 Membresía%' and monto = 20000", [bid]))[0].n >= 1, 'El cobro de la membresía entra a la caja');
    await como('pedro@test.cl', "public.membresia_usar($2)", [m.id]);
    const mm = await como('carlos@test.cl', 'public.mi_membresia()');
    assert(mm && mm.quedan === 1, 'El cliente ve su membresía: le queda 1 corte');
    await como('pedro@test.cl', "public.membresia_usar($2)", [m.id]);
    await falla('pedro@test.cl', "public.membresia_usar($2)", /ya usó sus 2 cortes/, 'No deja usar más cortes que el plan', [m.id]);

    // 🛍️ Productos y stock
    await como('dueno@test.cl', "public.producto_guardar('{\"nombre\": \"Pomada mate\", \"precio\": 7000, \"stock\": 3}')");
    const pl = await como('pedro@test.cl', 'public.productos_lista()');
    const pr = pl.find((x) => x.nombre === 'Pomada mate');
    assert(pr && pr.precio === null && pr.stock === 3, 'El barbero ve el producto sin precio (no ve montos)');
    const v = await como('pedro@test.cl', "public.producto_vender($2, 2, 'efectivo')", [pr.id]);
    assert(v.stock === 1, 'Vende 2: stock baja a 1');
    assert((await su("select count(*)::int n from public.caja where barberia_id = $1 and servicio = '🛍️ Pomada mate x2' and monto = 14000", [bid]))[0].n === 1, 'La venta entra a la caja ($14.000)');
    await falla('pedro@test.cl', "public.producto_vender($2, 2)", /No alcanza: quedan 1/, 'No vende más que el stock', [pr.id]);

    // ⏳ Cuántos esperan
    await su("delete from public.lista_espera");
    await su("insert into public.lista_espera (barberia_id, cliente_id, fecha) values ($1, $2, (now() at time zone 'America/Santiago')::date)", [bid, carlos.id]);
    const er = await como('dueno@test.cl', 'public.espera_resumen()');
    assert(er && er.hoy === 1, '⏳ Inicio: 1 espera hoy ' + JSON.stringify(er));

    // Pantallas (dueño)
    await entrar('dueno@test.cl');
    await p.goto(t.base + '/equipo/#hoy'); await p.waitForTimeout(2500);
    assert(/Lista de espera:/.test(await p.textContent('#cEspera').catch(() => '')), 'Inicio muestra ⏳ cuántos esperan hoy');
    await p.goto(t.base + '/equipo/#mas'); await p.waitForTimeout(1500);
    const mas = await p.textContent('body');
    assert(['Portafolio', 'WhatsApp e Instagram', 'Productos y stock', 'Gift cards', 'Membresías'].every((x) => mas.includes(x)), 'Más muestra los 5 módulos nuevos');
    await p.goto(t.base + '/equipo/#productos'); await p.waitForTimeout(2000);
    assert(/Pomada mate/.test(await p.textContent('body')) && /quedan 1/.test(await p.textContent('body')), 'Productos: lista con ⚠️ poco stock');
    assert(await t.anchoOk(), 'Productos sin salirse en ' + (process.env.ANCHO || 360));
    await t.foto('g53b_productos');
    await p.goto(t.base + '/equipo/#giftcards'); await p.waitForTimeout(2000);
    assert((await p.textContent('body')).includes(g.codigo), 'Gift cards: lista con la vendida');
    await p.fill('#gcCod', g.codigo); await p.click('#bGcVer'); await p.waitForTimeout(1200);
    assert(/6\.000/.test(await p.textContent('#gcRes')), 'Ver saldo desde la pantalla');
    assert(await t.anchoOk(), 'Gift cards sin salirse');
    await t.foto('g53b_giftcards');
    await p.goto(t.base + '/equipo/#membresias'); await p.waitForTimeout(2000);
    assert(/Carlos/.test(await p.textContent('body')), 'Membresías: lista');
    await t.foto('g53b_membresias');
    await p.goto(t.base + '/equipo/#redes'); await p.waitForTimeout(1500);
    assert(/Respuesta rápida de WhatsApp/.test(await p.textContent('body')) && (await p.textContent('body')).includes('?b=' + cod), 'Redes: respuestas listas con el link');
    assert(await t.anchoOk(), 'Redes sin salirse');
    await t.foto('g53b_redes');
    await p.goto(t.base + '/equipo/#links'); await p.waitForTimeout(1800);
    assert(await p.inputValue('#afAbono') === '5000' && await p.inputValue('#afFaltas') === '2', 'Links de pago: 💳 Anti-falta con lo guardado');
    await p.goto(t.base + '/equipo/#caja'); await p.waitForTimeout(2000);
    assert(await p.isVisible('#bVenderProd'), 'Caja: botón 🛍️ Vender producto');
    await p.emulateMedia({ colorScheme: 'dark' }); await p.goto(t.base + '/equipo/#portafolio'); await p.waitForTimeout(2000);
    assert(await p.locator('.pf-grid img').count() >= 1, 'Portafolio: grilla con la foto');
    await t.foto('g53b_portafolio_oscuro'); await p.emulateMedia({ colorScheme: 'light' });
    // Sin el módulo: abre la demo ▶️ (no la sección)
    await su("delete from public.cfx_modulos_negocio where modulo = 'productos'");
    await p.goto(t.base + '/equipo/'); await p.reload(); await p.waitForTimeout(2500);
    await p.goto(t.base + '/equipo/#productos'); await p.waitForTimeout(2000);
    assert(/Productos y stock/.test(await p.textContent('dialog.cfxd').catch(() => '')), 'Sin módulo: Productos abre la demo del módulo');
    await t.sinModales();
    // Público: portafolio en /b/
    await p.goto(t.base + '/b/?b=' + cod); await p.waitForTimeout(2500);
    assert(/Nuestros cortes/.test(await p.textContent('body')), '/b/: sale 🖼️ Nuestros cortes');
    assert(await t.anchoOk(), '/b/ sin salirse');
    await t.foto('g53b_publico');
    // Cliente: su membresía
    await entrar('carlos@test.cl');
    await p.goto(t.base + '/cliente/'); await p.waitForTimeout(3000);
    assert(/Tu membresía/.test(await p.textContent('body')), 'Cliente ve 🔁 Tu membresía');
    await t.foto('g53b_cliente');
  } catch (e) { console.log(e.message); process.exitCode = 1; await t.foto('g53b_error'); }
  await su("update public.cfx_config set valor = valor || '{\"activo\": false}' where clave = 'modulos_venta'").catch(() => {});
  const err = t.errores.filter((x) => !/Failed to load resource|ERR_|workers\.dev|status of 404/.test(x));
  console.log('ERRORES:', err.join('\n') || 'ninguno');
  if (err.length) process.exitCode = 1;
  await t.cerrar();
})();
