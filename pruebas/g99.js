// G99 a · ⚡ AVISO INSTANTÁNEO de Mercado Pago (webhook): cada cobro lleva notification_url = función de la app + ?cfx_mp=<ref>.
//   La función llama cfx_mp_aviso(ref) y la BASE vuelve a preguntarle a MP (no confía en el aviso) → confirma al tiro, sin esperar el minuto.
//   p: pago de la app (cfx_pagos) · n: cobro del negocio (mp_negocio) · d: pedido de Despega (gancho cfx_mp_aviso_app).
// FALLA con el código viejo (no existen cfx_mp_notif / cfx_mp_aviso ni el ?cfx_mp en las funciones).  Uso: node g99.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
const { Pool } = require('pg');
const fs = require('fs');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const MP = 'https://api.mercadopago.com';
const ADM = 'juanjosuecastilloloyola@gmail.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const URLS = { SaaS: 'https://vqevujjraisrcoirswuq.supabase.co/functions/v1/servidor', Aplicaciones: 'https://gilsamacgappycibcqhq.supabase.co/functions/v1/enviar',
  Barberia: 'https://gxlabxuttnxvzkucckef.supabase.co/functions/v1/enviar', Emprendedor: 'https://zbgfvxsqajtixjzxoxeu.supabase.co/functions/v1/enviar',
  Taller: 'https://iwvjthcmufirbnotgixi.supabase.co/functions/v1/servidor', Estacionamiento: 'https://wphxtspicejywwzlbuux.supabase.co/functions/v1/enviar' };
const FN = { SaaS: 'servidor', Aplicaciones: 'enviar', Barberia: 'enviar', Emprendedor: 'enviar', Taller: 'servidor', Estacionamiento: 'enviar' };
const U = '11111111-2222-3333-4444-555555555555';
(async () => {
  // ---------- Las 6 funciones atienden ?cfx_mp=… antes que todo (sin sesión: MP no manda token) ----------
  for (const r of Object.keys(FN)) {
    const s = fs.readFileSync(`/home/user/${r}/supabase/functions/${FN[r]}/index.ts`, 'utf8');
    const i = s.indexOf("searchParams.get('cfx_mp')"), j = s.indexOf('Deno.serve');
    ok(i > j && j > 0 && /rpc\('cfx_mp_aviso', \{ p_ref: ref\.slice\(0, 80\) \}\)/.test(s) && s.indexOf('try {', j) > i, r + ': la función "' + FN[r] + '" recibe el aviso de Mercado Pago');
  }

  // ---------- 🛍️ Despega: pago de la app (p:) ----------
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g99a', { stdio: 'ignore' });
  let t = await abrir('/home/user/Aplicaciones', 'p_g99a'); let su = t.sim.su, como = comoDe(su);
  try {
    await su("update public.cfx_config set valor = jsonb_set(jsonb_set(valor, '{negocio,exigir_inicio}', 'true'), '{inicio_desde}', to_jsonb(now() - interval '1 day')) where clave = 'pagos'");
    await su("insert into public.cfx_config (clave, valor) values ('mp', '{\"token\":\"APP_USR-1234567890123456789012345\",\"activo\":true,\"nick\":\"CODEFIX\"}') on conflict (clave) do update set valor = excluded.valor");
    await su("insert into extensions.http_respuestas values ($1, 201, '{\"init_point\":\"https://mp.test/pagar\"}'), ($2, 200, '{\"results\":[]}')", [MP + '/checkout/preferences', MP + '/v1/payments/search%']);
    await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    const r1 = await como('tienda@x.cl', "public.cfx_mp_pagar('inicio')");
    const [g] = await su("select id, monto from public.cfx_pagos where medio = 'mp' order by creado desc limit 1");
    const [lg] = await su("select content from extensions.http_log where uri like '%/checkout/preferences' order by n desc limit 1");
    const nu = lg && JSON.parse(lg.content).notification_url;
    ok(r1 && r1.ok && nu === URLS.Aplicaciones + '?cfx_mp=p:' + g.id, '⚡ El cobro le dice a MP dónde avisar: ' + nu);
    const P = (await su("select has_function_privilege('anon', 'public.cfx_mp_aviso(text)', 'execute') a, has_function_privilege('authenticated', 'public.cfx_mp_aviso(text)', 'execute') b, " +
      "has_function_privilege('service_role', 'public.cfx_mp_aviso(text)', 'execute') c, has_table_privilege('anon', 'public.cfx_mp_avisos', 'select') d"))[0];
    ok(!P.a && !P.b && P.c && !P.d, '🔒 Solo la función del servidor llama el aviso (anon/sesión no)');
    const aviso = async (ref) => (await su('select public.cfx_mp_aviso($1) r', [ref]))[0].r;
    ok(await aviso('p:' + g.id) === false, 'Aviso sin pago aprobado en MP: no aprueba nada');
    ok((await su('select estado from public.cfx_pagos where id = $1', [g.id]))[0].estado === 'pendiente', '🔒 El cobro sigue pendiente (el aviso solo no basta)');
    await su("update extensions.http_respuestas set content = $1 where url_like = $2", [JSON.stringify({ results: [{ id: 777001, status: 'approved', external_reference: g.id, currency_id: 'CLP', transaction_amount: g.monto }] }), MP + '/v1/payments/search%']);
    ok(await aviso('p:' + g.id) === false, '🔒 Freno: el mismo cobro no se pregunta 2 veces en 5 s');
    await su("update public.cfx_mp_avisos set at = now() - interval '10 seconds'");
    ok(await aviso('P:' + g.id.toUpperCase()) === true, '⚡ Aviso con pago aprobado: se confirma AL TIRO (sin esperar el minuto)');
    const e = await como('tienda@x.cl', 'public.cfx_pago_estado()');
    ok((await su('select estado from public.cfx_pagos where id = $1', [g.id]))[0].estado === 'aprobado' && e.bloqueado === false, '✅ Pago aprobado y la cuenta queda liberada');
    ok(await aviso('hola') === false && await aviso("p:x'; drop table x;--") === false && await aviso('d:' + U) === false && await aviso('z:' + U) === false, '🔒 Avisos inventados o de pedidos que no existen: nada');
    ok((await su("select public.cfx_mp_aviso_app('d:' || $1) r", [U]))[0].r === false, 'Despega: el aviso de un pedido (d:) va a su revisión de Mercado Pago');
    ok(/cfx_mp_notif\('d:' \|\| x\.id::text\)/.test(fs.readFileSync('/home/user/Aplicaciones/supabase/instalar.sql', 'utf8')), 'Despega: el pago de pedidos también pide el aviso instantáneo');
  } finally { await t.cerrar(); }

  // ---------- 💈 Barbería: cobro del negocio (n:) ----------
  execSync(__dirname + '/base.sh /home/user/Barberia p_g99b', { stdio: 'ignore' });
  t = await abrir('/home/user/Barberia', 'p_g99b'); su = t.sim.su; como = comoDe(su);
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'barberia', barberia: 'Barbería Juan', nombre: 'Juan', telefono: '+56912345671' });
    const B = (await su('select b.id, b.owner_id from public.barberias b limit 1'))[0];
    await su("insert into extensions.http_respuestas values ($1, 200, '{\"nickname\":\"JUAN\"}'), ($2, 201, '{\"init_point\":\"https://mp.test/pagar\"}'), ($3, 200, '{\"results\":[]}')",
      [MP + '/users/me', MP + '/checkout/preferences', MP + '/v1/payments/search%']);
    await como('dueno@x.cl', "public.cfx_mp_neg_guardar('APP_USR-1234567890123456789012345-abcd', true)");
    const [r] = await su("insert into public.reservas (barberia_id, barbero_id, cliente_nombre, cliente_tel, inicio, fin, servicios, total, abono, estado, expira_at) " +
      "values ($1, $2, 'Pepe', '+56912345672', date_trunc('hour', now()) + interval '30 hours', date_trunc('hour', now()) + interval '30 hours 30 min', '[]', 12000, 4000, 'esperando_abono', now() + interval '15 min') returning id, token", [B.id, B.owner_id]);
    const x = (await su('select public.reserva_mp_pagar($1, null) x', [r.token]))[0].x;
    const [c] = await su("select id from public.cfx_mp_neg_cobros where ref = 'reserva:' || $1", [r.id]);
    const [lg] = await su("select content from extensions.http_log where uri like '%/checkout/preferences' order by n desc limit 1");
    const nu = lg && JSON.parse(lg.content).notification_url;
    ok(x.ok && c && nu === URLS.Barberia + '?cfx_mp=n:' + c.id, '⚡ El abono le dice a MP dónde avisar: ' + nu);
    await su("update extensions.http_respuestas set content = $1 where url_like = $2", [JSON.stringify({ results: [{ id: 888001, status: 'approved', external_reference: c.id, currency_id: 'CLP', transaction_amount: 4000 }] }), MP + '/v1/payments/search%']);
    ok((await su('select public.cfx_mp_aviso($1) r', ['n:' + c.id]))[0].r === true, '⚡ Aviso del abono: confirmado al tiro');
    const [R] = await su('select estado, mp_pago from public.reservas where id = $1', [r.id]);
    ok(R.estado === 'agendada' && R.mp_pago === '888001', '✅ La hora queda AGENDADA sola apenas paga');
  } finally { await t.cerrar(); }

  // ---------- CM, Billetera, BiciTaller y Estaciona: cada una avisa a SU función ----------
  for (const r of ['SaaS', 'Emprendedor', 'Taller', 'Estacionamiento']) {
    const db = 'p_g99_' + r.toLowerCase();
    execSync(__dirname + '/base.sh /home/user/' + r + ' ' + db, { stdio: 'ignore' });
    const pool = new Pool({ host: '/var/tmp/pgb', port: 54329, user: 'postgres', database: db, max: 1 });
    try {
      const [q] = (await pool.query("select public.cfx_mp_notif('p:' || $1) n, has_function_privilege('service_role', 'public.cfx_mp_aviso(text)', 'execute') s, " +
        "has_function_privilege('anon', 'public.cfx_mp_aviso(text)', 'execute') a, public.cfx_mp_aviso('p:' || $1) v", [U])).rows;
      ok(q.n.notification_url === URLS[r] + '?cfx_mp=p:' + U && q.s && !q.a && q.v === false, r + ': avisa a ' + (q.n.notification_url || '—') + ' · solo el servidor');
      await pool.query("insert into public.cfx_config (clave, valor) values ('mp_aviso', '{\"url\":\"javascript:alert(1)\"}') on conflict (clave) do update set valor = excluded.valor");
      ok(JSON.stringify((await pool.query("select public.cfx_mp_notif('p:x') n")).rows[0].n) === '{}', r + ': 🔒 URL rara → sin aviso (sigue el cron de 1 min)');
    } finally { await pool.end(); }
  }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ todo bien'); process.exit(f ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
