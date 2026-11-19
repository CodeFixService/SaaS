// G128 · 🛒 COBRO DE PEDIDOS (Despega + núcleo cfx_hilo_*/CFX_COBRO). FALLA con el código viejo (no existen catalogo_venta, p_cobro, cfx_hilo_ver,
//   y con solo 🏦 transferencia el pedido quedaba 'recibido' sin cobro).
// Uso: ANCHO=320 node g128.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g128', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g128'); const su = t.sim.su, como = comoDe(su);
  try {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Pepe','client',$1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await su("update public.profiles set terms_at = now()");
    await su("update public.profiles set slug = 'ana', telefono = '56912345678' where id = $1", [u.id]);
    for (const [k, n, p] of [['polera', 'Polera', 10000], ['corte', 'Corte de pelo', 8000], ['curso', 'Curso online', 5000], ['mueble', 'Mueble a pedido', 20000]])
      await como('tienda@x.cl', 'public.catalog_upsert($2, $3, $4, null, $5)', [k, n, p, '']);
    const inv = (items, cobro, ent) => su("select public.crear_pedido_invitado('ana', 'Lu', '56933333333', $1::jsonb, $3, null, null, null, $2) r", [JSON.stringify(items), cobro, ent || 'retiro']).then((r) => r[0].r);
    // d) Sin ningún medio: paga al retirar
    let r = await inv([{ clave: 'polera', cant: 1 }], 'ahora');
    ok(r.ok && r.estado === 'recibido' && r.cobro === 'retiro' && +r.a_pagar === 0, 'd) Sin medios: pedido "💰 paga al retirar" (recibido, $0 ahora)');
    ok((await como('cli@x.cl', 'public.tienda_info($2)', [u.id])).cobra_online === false, 'd) La tienda sabe que no cobra en línea (aviso al dueño)');
    // a) 🏦 Transferencia = medio
    await su("update public.profiles set datos_pago = 'Banco Estado · Cta RUT 12345678' where id = $1", [u.id]);
    r = await inv([{ clave: 'polera', cant: 2 }], 'ahora');
    ok(r.ok && r.estado === 'pagando' && +r.a_pagar === 20000 && r.link && r.link.transferencia, 'a) 🏦 Con transferencia: queda ⏳ esperando pago ($20.000)');
    let s = (await su("select public.subir_comprobante($1, 'data:image/jpeg;base64,/9j/AAAA') s", [r.token]))[0].s;
    ok(s.ok, 'a) El comprador sube el comprobante');
    await como('tienda@x.cl', 'public.revisar_comprobante($2, true, null)', [r.id]);
    let v = (await su('select public.ver_pedido($1) v', [r.token]))[0].v;
    ok(v.estado === 'preparando' && v.pagado, 'a) La tienda aprueba → 👩‍🍳 preparando y pagado');
    // b/c) Tipos y formas de pago por ítem (la base valida)
    ok(/abono va de 10 a 90/.test(await falla(() => como('tienda@x.cl', "public.catalogo_venta('mueble', '{\"cobro\":\"abono\",\"abono\":\"95\"}')")) || ''), 'b) 🔒 Abono fuera de 10–90 % se rechaza');
    ok(/Escribe lo que recibe/.test(await falla(() => como('tienda@x.cl', "public.catalogo_venta('curso', '{\"tipo\":\"digital\"}')")) || ''), 'c) 🔒 Digital sin acceso se rechaza');
    ok(/Solo las empresas/.test(await falla(() => como('cli@x.cl', "public.catalogo_venta('polera', '{\"cobro\":\"retiro\"}')")) || ''), 'b) 🔒 Un cliente no cambia el cobro');
    await como('tienda@x.cl', "public.catalogo_venta('mueble', '{\"cobro\":\"abono\",\"abono\":30}')");
    await como('tienda@x.cl', "public.catalogo_venta('corte', '{\"tipo\":\"servicio\",\"cobro\":\"retiro\"}')");
    const dg = await como('tienda@x.cl', "public.catalogo_venta('curso', '{\"tipo\":\"digital\",\"cobro\":\"retiro\",\"acceso\":\"https://curso.test/clave-123\"}')");
    ok(dg.cobro === 'ahora', 'c) 🔑 Digital siempre se paga ahora');
    await su("update public.catalog_items set stock = 5 where client_key = 'corte'");
    ok((await su("select stock from public.catalog_items where client_key = 'corte'"))[0].stock === null, 'c) 🛠️ Servicio sin stock');
    const pub = (await su("select public.catalogo_venta_publica('ana') p"))[0].p;
    ok(pub.length === 3 && !JSON.stringify(pub).includes('clave-123'), '🔒 El carrito ve tipos y cobros, NUNCA el acceso digital');
    ok(/se paga en línea/.test((await inv([{ clave: 'polera', cant: 1 }], 'retiro')).error || ''), 'b) 🔒 "Pagar al retirar" no vale para un ítem ⚡ pagar ahora');
    r = await inv([{ clave: 'corte', cant: 1 }], 'retiro', 'despacho');
    ok(r.ok && r.estado === 'recibido' && r.cobro === 'retiro' && r.entrega === 'retiro', 'b/c) 🛠️ Servicio: 💰 paga al retirar y sin despacho');
    await como('tienda@x.cl', 'public.actualizar_pedido($2, $3)', [r.id, 'preparando']);
    await como('tienda@x.cl', 'public.actualizar_pedido($2, $3)', [r.id, 'listo']);
    await como('tienda@x.cl', 'public.actualizar_pedido($2, $3)', [r.id, 'entregado']);
    v = (await su('select public.ver_pedido($1) v', [r.token]))[0].v;
    ok(v.pagado && v.servicio, '💰 Entregado = pagado (🛠️ servicio realizado)');
    r = await inv([{ clave: 'mueble', cant: 1 }], 'abono');
    ok(r.ok && r.cobro === 'abono' && +r.a_pagar === 6000 && r.estado === 'pagando', 'b) 💵 Abono 30 %: paga $6.000 ahora');
    await su("select public.subir_comprobante($1, 'data:image/jpeg;base64,/9j/AAAA')", [r.token]);
    await como('tienda@x.cl', 'public.revisar_comprobante($2, true, null)', [r.id]);
    v = (await su('select public.ver_pedido($1) v', [r.token]))[0].v;
    ok(v.abonado && !v.pagado, '💵 Abono aprobado ≠ pago completo (boleta al entregar)');
    r = await inv([{ clave: 'curso', cant: 1 }], 'ahora');
    v = (await su('select public.ver_pedido($1) v', [r.token]))[0].v;
    ok(!v.accesos, '🔒 Acceso digital oculto antes de pagar');
    await su("select public.subir_comprobante($1, 'data:image/jpeg;base64,/9j/AAAA')", [r.token]);
    await como('tienda@x.cl', 'public.revisar_comprobante($2, true, null)', [r.id]);
    v = (await su('select public.ver_pedido($1) v', [r.token]))[0].v;
    ok(v.accesos && v.accesos[0].acceso === 'https://curso.test/clave-123' && v.estado === 'entregado', '🔑 Pago aprobado → acceso entregado (pedido entregado)');
    r = await inv([{ clave: 'curso', cant: 1 }, { clave: 'polera', cant: 1 }], 'ahora');
    await su("select public.subir_comprobante($1, 'data:image/jpeg;base64,/9j/AAAA')", [r.token]);
    await como('tienda@x.cl', 'public.revisar_comprobante($2, true, null)', [r.id]);
    ok(/acceso digital/.test((await su("select public.cancelar_pedido($1) c", [r.token]))[0].c.error || ''), '🔒 Pedido mixto con el acceso ya entregado: el cliente no lo cancela');
    // e) 💬 Chat DEL pedido: solo con cuenta
    const pc = await como('cli@x.cl', "public.crear_pedido($2, '[{\"clave\":\"polera\",\"cant\":1}]'::jsonb, 'retiro', null, null, null)", [u.id]);
    ok(pc.ok && pc.estado === 'pagando', 'Cliente con cuenta: pedido sin p_cobro (app vieja) sigue funcionando');
    let h = await como('cli@x.cl', 'public.cfx_hilo_enviar($2, $3)', ['pedido:' + pc.id, '¿Tienen talla M?']);
    ok(h.ok, 'e) 💬 El cliente escribe en el chat del pedido');
    h = await como('tienda@x.cl', 'public.cfx_hilo_ver($2)', ['pedido:' + pc.id]);
    ok(h.ok && h.mensajes.length === 1 && !h.mensajes[0].mio, 'e) La tienda lo ve dentro del pedido');
    ok((await su("select count(*)::int n from public.cfx_mensajes"))[0].n === 0, 'e) No aparece en Mensajes');
    const pi = await inv([{ clave: 'polera', cant: 1 }], 'ahora');
    ok(!(await como('tienda@x.cl', 'public.cfx_hilo_ver($2)', ['pedido:' + pi.id])).ok, 'e) Sin cuenta: no hay chat (enlace /r/ + WhatsApp)');
    await su("insert into auth.users (id, email) values (gen_random_uuid(), 'otro@x.cl') on conflict do nothing").catch(() => {});
    await su("update public.pedidos set estado = 'entregado', updated_at = now() - interval '8 days' where id = $1", [pc.id]);
    ok((await su('select public.cfx_hilos_limpiar() n'))[0].n === 1 && (await su("select count(*)::int n from public.pedidos where id = $1", [pc.id]))[0].n === 1, 'e) A los 7 días de cerrado se borran los mensajes y queda el pedido');
    // 📱 Pantallas
    const p = t.page;
    await p.goto(t.base + '/t/?s=ana'); await p.waitForTimeout(3000);
    ok(/Abono 30%/.test(await p.locator('#grid').innerText()), '📱 /t/: el ítem muestra "💵 Abono 30%"');
    await p.goto(t.base + '/r/?t=' + pi.token + '&nuevo=1'); await p.waitForTimeout(2500);
    const tx = await p.locator('#ped').innerText();
    ok(/Esperando pago/.test(tx) && /Mandarme por WhatsApp/.test(tx) && /Copiar enlace/.test(tx), '📱 /r/: ⏳ Esperando pago + 📋 Copiar / 📲 Mandarme por WhatsApp');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '📱 /r/: sin scroll horizontal');
    await p.screenshot({ path: __dirname + '/capturas/Aplicaciones/g128_r.png', fullPage: true }).catch(() => {});
    ok(!t.errores.filter((m) => !/favicon|404|status of 400/.test(m)).length, 'Sin errores en la consola ' + t.errores.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'error: ' + (e.stack || e).toString().slice(0, 600)); }
  await t.cerrar();
  console.log(f ? '✗ ' + f + ' fallaron' : '✓ todo bien'); process.exit(f ? 1 : 0);
})();
