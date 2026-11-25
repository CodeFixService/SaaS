// G162 · 🔁 COMPRAS RECURRENTES UNIVERSALES (núcleo sql/recurrente.sql + recurrente.js). FALLA con el código viejo (no existe cfx_recurrente_*).
//   Despega: las de antes se copian con su mismo id · cada 7…365 días · 🔔 aviso X días antes · el día que toca crea el pedido real ·
//   ⚡ cobro automático paga el pedido · 📊 resumen · el cliente pausa. Genérico (sin ganchos): link/✅ pagado a mano.
// Uso: node g162.js
const { abrir } = require('./h'); const { execSync } = require('./apps6');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g162', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g162'); const su = t.sim.su, como = comoDe(su);
  try {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    for (const [m, n] of [['cli@x.cl', 'Pepe'], ['otro@x.cl', 'Otro']]) {
      await su("insert into public.user_invites (email, nombre, role, negocio_id) values ($1, $2, 'client', $3)", [m, n, u.id]);
      await t.sim.crearUsuario(m, 'clave123');
    }
    await su('update public.profiles set terms_at = now()');
    await su("insert into public.catalog_items (owner_id, client_key, nombre, precio, categoria, stock) values ($1, 'cafe', 'Café 1 kg', 10000, 'Café', 20), ($1, 'diag', 'Diagnóstico', 5000, 'Diagnóstico', null)", [u.id]);
    const cli = (await su("select id from auth.users where email = 'cli@x.cl'"))[0].id;
    const hoy = (await su("select (now() at time zone 'America/Santiago')::date::text d"))[0].d;
    const en10 = (await su("select ((now() at time zone 'America/Santiago')::date + 10)::text d"))[0].d;
    // 0) 🛡️ Migración: una de antes (tabla suscripciones) pasa al núcleo con su mismo id
    const vieja = (await su("insert into public.suscripciones (negocio_id, cliente_id, items, cada, entrega, proxima, pedidos) values ($1, $2, '[{\"clave\":\"cafe\",\"cant\":2}]', 14, 'retiro', $3::date + 5, 3) returning id", [u.id, cli, hoy]))[0].id;
    await su('select public.suscripciones_a_nucleo()'); await su('select public.suscripciones_a_nucleo()');
    const m = (await su('select * from public.cfx_recurrentes where id = $1', [vieja]))[0];
    ok(m && m.cuenta === cli && m.cada === 14 && m.veces === 3 && m.total === 20000 && m.nombre === 'Pepe', '🛡️ la de antes se copió con su id, cliente, cada 14, 3 pedidos y $20.000');
    ok((await su('select count(*)::int n from public.suscripciones'))[0].n === 1, '🛡️ la tabla vieja queda de respaldo');
    ok((await su("select count(*)::int n from cron.job where jobname = 'suscripciones'"))[0].n === 0, '⏰ el cron viejo ya no crea pedidos (no hay doble pedido)');
    // 1) Sin el módulo: no deja crear
    const sin = await como('tienda@x.cl', 'public.cfx_recurrente_guardar($2::jsonb)', [JSON.stringify({ cuenta: cli, nombre: 'Pepe', items: [{ clave: 'cafe', cant: 1 }], cada: 30 })]);
    ok(!sin.ok && /módulo/.test(sin.error), '🧩 sin el módulo: "es un módulo"');
    await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
    await como('tienda@x.cl', 'public.cfx_modulo_probar($2)', ['suscripciones']);
    // 2) Períodos 7…365 y validaciones del servidor
    const g = (p) => como('tienda@x.cl', 'public.cfx_recurrente_guardar($2::jsonb)', [JSON.stringify(Object.assign({ cuenta: cli, nombre: 'Pepe', items: [{ clave: 'cafe', cant: 1 }], proxima: en10 }, p))]);
    ok(!(await g({ cada: 400 })).ok && !(await g({ cada: 5 })).ok, '⛔ cada 5 o 400 días: no');
    const r45 = await g({ cada: 45, aviso: 2, entrega: 'despacho', direccion: 'Av. Siempre Viva 1, Ñuñoa', items: [{ clave: 'cafe', cant: 1, precio: 1 }] });
    ok(r45.ok && r45.rec.cada === 45 && r45.rec.total === 10000 && r45.rec.entrega === 'despacho', '📅 cada 45 días + 🚚 despacho · precio REAL del catálogo ($10.000, no el que mandó la pantalla)');
    const srv = await g({ cada: 365, entrega: 'despacho', direccion: 'x', items: [{ clave: 'diag', cant: 1 }] });
    ok(srv.ok && srv.rec.entrega === 'retiro' && srv.rec.direccion === null && srv.rec.items[0].tipo === 'servicio', '🛠️ solo servicio (cada año): el servidor quita el despacho (CFX_TIPO)');
    ok(!(await g({ cada: 30, aviso: 30 })).ok, '🔔 aviso igual o mayor que el período: no');
    const otro = await como('otro@x.cl', 'public.cfx_recurrente_guardar($2::jsonb)', [JSON.stringify({ cuenta: cli, nombre: 'x', items: [{ clave: 'cafe' }], cada: 30 })]);
    ok(!otro.ok, '🔒 un cliente no puede crear recurrentes de la tienda');
    // 3) 📊 resumen
    const L = await como('tienda@x.cl', 'public.cfx_recurrente_lista()');
    ok(L.ok && L.items.length === 3 && L.resumen.activas === 3 && L.resumen.al_mes === Math.round(20000 * 30 / 14) + Math.round(10000 * 30 / 45) + Math.round(5000 * 30 / 365), '📊 resumen: 3 activas y $ al mes (' + L.resumen.al_mes + ')');
    ok(L.resumen.proximas.length >= 2 && L.resumen.proximas[0].fecha <= L.resumen.proximas[1].fecha, '📅 próximas fechas en orden');
    // 4) 🔔 aviso X días antes (una sola vez)
    const id45 = r45.rec.id;
    await su("update public.cfx_recurrentes set proxima = $2::date + 2 where id = $1", [id45, hoy]);
    await su('select public.cfx_recurrentes_correr()'); await su('select public.cfx_recurrentes_correr()');
    const av = await su("select count(*)::int n from public.notifications where target_id = $1 and title like '🔔 En 2 días%'", [cli]);
    ok(av[0].n === 1, '🔔 al cliente: "En 2 días…" (1 sola vez aunque el cron corra 2 veces)');
    // 5) 📅 el día que toca: pedido real + período por cobrar con la ref del pedido
    await su("update public.cfx_recurrentes set proxima = $2::date where id = $1", [id45, hoy]);
    await su('select public.cfx_recurrentes_correr()');
    const ped = await su("select id, total, estado from public.pedidos where cliente_id = $1 order by created_at desc", [cli]);
    const cob = (await su('select * from public.cfx_recurrente_cobros where rec = $1', [id45]))[0];
    const x45 = (await su('select proxima::text, veces from public.cfx_recurrentes where id = $1', [id45]))[0];
    ok(ped.length === 1 && cob && cob.ref === 'pedido:' + ped[0].id && cob.estado === 'pendiente', '🛒 se creó el pedido real y el período apunta a él');
    ok(x45.veces === 1 && x45.proxima > hoy, '⏭️ la próxima fecha avanzó 45 días (' + x45.proxima + ')');
    await su('select public.cfx_recurrentes_correr()');
    ok((await su("select count(*)::int n from public.pedidos where cliente_id = $1", [cli]))[0].n === 1, '🛡️ correr de nuevo no duplica el pedido');
    // 6) ⚡ cobro automático (evento de Mercado Pago) → paga el pedido de Despega
    await su("select public._cfx_mp_neg_sub_gancho($1, 'activa', null, 10000)", ['rec:' + id45]);
    ok((await su('select auto from public.cfx_recurrentes where id = $1', [id45]))[0].auto === true, '⚡ "activa" → queda automático');
    await su("update public.pedidos set estado = 'pagando', retenido_hasta = now() + interval '1 hour' where id = $1", [ped[0].id]);  // tienda con ⚡ MP: espera el pago
    await su("select public._cfx_mp_neg_sub_gancho($1, 'cobro', 'PAGO-1', $2)", ['rec:' + id45, Math.round(Number(ped[0].total))]);
    const c2 = (await su('select estado, medio from public.cfx_recurrente_cobros where rec = $1', [id45]))[0];
    const p2 = (await su('select estado, pagado_at from public.pedidos where id = $1', [ped[0].id]))[0];
    ok(c2.estado === 'pagado' && c2.medio === 'auto' && p2.pagado_at, '💰 el cobro automático marca pagado el período Y el pedido (' + p2.estado + ')');
    await su("select public._cfx_mp_neg_sub_gancho($1, 'cobro', 'PAGO-2', $2)", ['rec:' + id45, Math.round(Number(ped[0].total))]);
    ok((await su("select count(*)::int n from public.cfx_recurrente_cobros where rec = $1 and estado = 'pagado'", [id45]))[0].n === 2, '⏩ cobro antes del día: queda pagado por adelantado para la próxima');
    // 7) El cliente: ve las suyas, pausa (avisa a la tienda); otro cliente no
    const mias = await como('cli@x.cl', 'public.cfx_recurrente_mias()');
    ok(mias.length === 3 && mias.every((x) => x.tienda === 'Tienda Ana'), '👤 el cliente ve sus 3 compras recurrentes');
    ok(!(await como('otro@x.cl', 'public.cfx_recurrente_estado($2, false)', [vieja])).ok, '🔒 otro cliente no puede pausarla');
    const pz = await como('cli@x.cl', 'public.cfx_recurrente_estado($2, false)', [vieja]);
    ok(pz.ok && pz.rec.activa === false, '⏸️ el cliente la pausa');
    ok((await su("select count(*)::int n from public.notifications where target_id = $1 and title like '⏸️%'", [u.id]))[0].n === 1, '🔔 la tienda sabe que la pausó');
    // 8) Genérico (sin ganchos): ✅ pagado a mano y 'rcob:' pagado por link
    await su("drop function public.cfx_recurrente_crear_app(uuid)");
    await su("update public.cfx_recurrentes set proxima = $2::date where id = $1", [srv.rec.id, hoy]);
    await su('select public.cfx_recurrentes_correr()');
    const cg = (await su('select * from public.cfx_recurrente_cobros where rec = $1', [srv.rec.id]))[0];
    ok(cg && cg.estado === 'pendiente' && !cg.ref && cg.monto === 5000, '🧾 sin gancho de la app: queda "por cobrar" $5.000');
    ok(!(await como('tienda@x.cl', 'public.cfx_recurrente_pagar($2)', [cg.id])).ok, '💳 sin pago en línea del negocio: lo dice (transferencia)');
    ok((await como('tienda@x.cl', 'public.cfx_recurrente_pagado($2)', [cg.id])).ok && (await su('select estado from public.cfx_recurrente_cobros where id = $1', [cg.id]))[0].estado === 'pagado', '✅ el dueño lo marca pagado');
    await su("update public.cfx_recurrente_cobros set estado = 'pendiente', medio = null where id = $1", [cg.id]);
    await su("select public.cfx_recurrente_cobrado($1, 'MP-9', 5000, 'mp')", ['rcob:' + cg.id]);
    ok((await su('select estado, medio from public.cfx_recurrente_cobros where id = $1', [cg.id]))[0].medio === 'mp', '⚡ link pagado (rcob) → pagado con Mercado Pago');
    ok(!(await como('otro@x.cl', 'public.cfx_recurrente_pagado($2)', [cg.id])).ok, '🔒 otra cuenta no marca pagos');
    // 9) 🗑️ borrar: lo cobrado queda
    ok((await como('tienda@x.cl', 'public.cfx_recurrente_borrar($2)', [srv.rec.id])).ok && (await su('select count(*)::int n from public.cfx_recurrente_cobros where rec = $1', [srv.rec.id]))[0].n === 1, '🗑️ borrar: lo cobrado sigue en los números');
    // 10) 📱 Pantalla del dueño (núcleo recurrente.js)
    await su("create or replace function public.cfx_recurrente_crear_app(p_rec uuid) returns jsonb language sql as $$ select '{\"ok\":false}'::jsonb $$");
    const { page: p } = await t.nuevo();
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'tienda@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(p);
    await p.goto(t.base + '/#recurrentes'); await p.reload(); await p.waitForTimeout(4000);
    const H = '.cfx-hoja-m ';
    const txt = await p.locator(H + '.cfx-rc').innerText().catch(() => '');
    ok(/Al mes/.test(txt) && /Pepe/.test(txt) && /Pausada/.test(txt), '📊 la pantalla muestra el resumen y las de antes (Pepe, ⏸️ pausada)');
    await p.click(H + '[data-a=nueva]'); await p.waitForTimeout(400);
    const ops = await p.evaluate((h) => [...document.querySelectorAll(h + '#rcCada option')].map((o) => o.textContent).join('|'), H);
    ok(/cada semana/.test(ops) && /cada año/.test(ops) && /Otro/.test(ops), '📅 períodos de 1 semana a 1 año + "Otro…"');
    await p.selectOption(H + '#rcCli', { label: 'Pepe' });
    await p.evaluate((h) => { const s = document.querySelector(h + '[data-l] select'); s.value = [...s.options].find((o) => /Diagn/.test(o.text)).value; s.dispatchEvent(new Event('change', { bubbles: true })); }, H);
    await p.waitForTimeout(300);
    ok(!(await p.locator(H + '[data-env]').isVisible()), '🛠️ solo servicio: no pide Retiro / Despacho');
    await p.selectOption(H + '#rcCada', 'otro'); await p.fill(H + '#rcDias', '20');
    await p.screenshot({ path: __dirname + '/capturas/aplicaciones/g162_recurrente.png' }).catch(() => {});
    await p.click(H + '[data-a=guardar]'); await p.waitForTimeout(2500);
    const L2 = await como('tienda@x.cl', 'public.cfx_recurrente_lista()');
    ok(L2.items.some((x) => x.cada === 20 && x.items[0].nombre === 'Diagnóstico'), '🔁 se guarda desde la pantalla (cada 20 días)');
    const ancho = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    ok(ancho, '📱 sin scroll de lado');
  } catch (e) { console.log('ERROR', e); f++; } finally { await t.cerrar(); }
  console.log(f ? '✗ ' + f + ' fallaron' : '✓ todo ok'); process.exit(f ? 1 : 0);
})();
