// G87 E · 🧹 Limpieza de pruebas (solo admin): ↺ ingresos a cero por app (no borra pagos, se deshace) ·
//          🗑️ productos con error en la vitrina (Despega) · productos publicados que el teléfono no tiene vuelven a la Caja.
// FALLA con el código viejo (no existe cfx_ingresos_cero, no hay opción 'productos', la Caja no muestra lo que solo está en la vitrina).
// Uso: ANCHO=320 node g87e.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g87e', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g87e'); const su = t.sim.su, como = comoDe(su);
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl', 'Pepe', 'client', $1)", [u.id]);
    const c = await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await su('update public.profiles set terms_at = now()');
    // ---------- ↺ Ingresos a cero ----------
    await su("insert into public.cfx_pagos (cuenta, rol, periodo, monto, medio, estado, resuelto) values ($1, 'negocio', 'mensual', 4900, 'link', 'aprobado', now() - interval '1 minute')", [u.id]);
    const mes = async () => +(await como(ADM, 'public.admin_resumen()')).ingresos_mes;
    const serie = async () => (await como(ADM, 'public.cfx_series(1)')).slice(-1)[0].ingresos;
    ok(await mes() === 4900, 'Antes: ingresos del mes = $4.900');
    let r = await como(ADM, 'public.cfx_ingresos_cero(null)');
    ok(r && r.desde === null, 'Ver: cuenta todo el historial ' + JSON.stringify(r));
    r = await como(ADM, 'public.cfx_ingresos_cero(true)');
    ok(r && r.desde, '↺ Volver a cero responde la fecha ' + JSON.stringify(r));
    ok(await mes() === 0 && +(await serie()) === 0, '↺ Después: ingresos del mes y gráfico en $0');
    ok(+(await su("select count(*) n from public.cfx_pagos where estado = 'aprobado'"))[0].n === 1, 'El pago NO se borró (queda en el historial)');
    ok(+(await su("select count(*) n from public.cfx_registro where accion = 'ingresos a cero'"))[0].n === 1, 'Queda anotado en el Registro');
    await su("insert into public.cfx_pagos (cuenta, rol, periodo, monto, medio, estado, resuelto) values ($1, 'negocio', 'mensual', 1000, 'link', 'aprobado', now() + interval '1 second')", [u.id]);
    ok(await mes() === 1000, 'Un pago nuevo sí suma ($1.000)');
    await como(ADM, 'public.cfx_ingresos_cero(false)');
    ok(await mes() === 5900, 'Contar todo otra vez: vuelve a $5.900');
    let neg = null; try { await como('tienda@x.cl', 'public.cfx_ingresos_cero(true)'); } catch (e) { neg = e.message; }
    ok(!!neg, 'Un negocio NO puede volver a cero (' + String(neg).slice(0, 40) + ')');

    // ---------- 🗑️ Productos con error ----------
    await su("insert into public.catalog_items (owner_id, client_key, nombre, precio, categoria, descripcion, opciones) values ($1, 'p1', 'Gorro de lana', 9990, 'Accesorios', 'Tejido a mano', 'Rojo,Azul'), ($1, 'p2', '  ', 100, '', '', ''), ($2, 'p3', 'Producto de un cliente', 500, '', '', '')", [u.id, c.id]);
    const L = await como(ADM, 'public.cfx_limpieza()');
    const o = (L || []).find((x) => x.clave === 'productos');
    ok(o && +o.filas === 2 && /Producto de un cliente/.test(o.detalle), 'Limpieza muestra 🗑️ productos con error (2) con sus nombres ' + JSON.stringify(o).slice(0, 160));
    neg = null; try { await como('tienda@x.cl', "public.cfx_limpiar('productos')"); } catch (e) { neg = e.message; }
    ok(!!neg, 'Un negocio NO puede borrar productos ajenos');
    ok(+(await como(ADM, "public.cfx_limpiar('productos')")) === 2, 'Admin borra los 2 con error');
    const quedan = await su('select client_key from public.catalog_items order by 1');
    ok(quedan.length === 1 && quedan[0].client_key === 'p1', 'El producto bueno queda en la vitrina');

    // ---------- Caja: lo publicado que el teléfono no tiene vuelve a aparecer ----------
    const { page: p } = await t.nuevo();
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'tienda@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(p);
    await p.goto(t.base + '/apps/caja/#productos'); await p.waitForTimeout(3500); await t.sinModales(p);
    const txt = await p.evaluate(() => (document.getElementById('listaProds') || {}).innerText || '');
    ok(/Gorro de lana/.test(txt), 'Caja → Productos: aparece "Gorro de lana" (estaba solo en la vitrina) para editarlo o borrarlo');
    const loc = await p.evaluate(() => { const k = Object.keys(localStorage).find((x) => /^caja:.*productos$/.test(x)); return k ? JSON.parse(localStorage.getItem(k)) : []; });
    const g = loc.find((x) => x.id === 'p1') || {};
    ok(g.publicado && g.desc === 'Tejido a mano' && g.ops === 'Rojo,Azul', 'Se guarda con su descripción y opciones (no se pierden al editar) ' + JSON.stringify(g).slice(0, 140));
    await p.screenshot({ path: __dirname + '/capturas/aplicaciones/g87e_caja.png' }).catch(() => {});
  } catch (e) { console.log('✗ ' + e.message); f++; }
  await t.cerrar();
  console.log(f ? '❌ ' + f + ' fallas' : '✅ g87e todo ok'); process.exit(f ? 1 : 0);
})();
