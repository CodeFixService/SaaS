// G87 J · ⚡ Mercado Pago propio de la app: el pago confirmado EN EL SERVIDOR (consulta a Mercado Pago, no confía en el aviso) libera
//          al tiro la cuenta nueva bloqueada + Premium + 🧩 módulos. Revisión cada 1 minuto (antes cada 2).
// FALLA con el código viejo (cron '*/2').  Uso: node g87j.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const MP = 'https://api.mercadopago.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
(async () => {
  ok(/cron\.schedule\('cfx-mp', '\* \* \* \* \*'/.test(require('fs').readFileSync('/home/user/SaaS/nucleo/sql/pagos.sql', 'utf8')), 'Revisión automática cada 1 minuto');
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g87j', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g87j'); const su = t.sim.su, como = comoDe(su);
  try {
    await su("update public.cfx_config set valor = jsonb_set(jsonb_set(valor, '{negocio,exigir_inicio}', 'true'), '{inicio_desde}', to_jsonb(now() - interval '1 day')) where clave = 'pagos'");
    await su("insert into public.cfx_config (clave, valor) values ('mp', '{\"token\":\"APP_USR-1234567890123456789012345\",\"activo\":true,\"nick\":\"CODEFIX\"}') on conflict (clave) do update set valor = excluded.valor");
    await su("insert into extensions.http_respuestas values ($1, 201, '{\"init_point\":\"https://mp.test/pagar\"}'), ($2, 200, '{\"results\":[]}')", [MP + '/checkout/preferences', MP + '/v1/payments/search%']);
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    let e = await como('tienda@x.cl', 'public.cfx_pago_estado()');
    ok(e.bloqueado === true, 'Negocio nuevo queda bloqueado hasta su primer pago');
    const aprobar = async (monto) => {
      const [g] = await su("select id from public.cfx_pagos where estado = 'pendiente' and medio = 'mp' order by creado desc limit 1");
      await su("update extensions.http_respuestas set content = $1 where url_like = $2", [JSON.stringify({ results: [{ id: Math.floor(Math.random() * 1e9), status: 'approved', external_reference: g.id, currency_id: 'CLP', transaction_amount: monto }] }), MP + '/v1/payments/search%']);
      return +(await su('select public.cfx_mp_revisar_pendientes() as n'))[0].n;
    };
    const r1 = await como('tienda@x.cl', "public.cfx_mp_pagar('inicio')");
    ok(r1 && /mp\.test/.test(JSON.stringify(r1)), 'Paga el inicio con ⚡ Mercado Pago ' + JSON.stringify(r1).slice(0, 80));
    const [m1] = await su("select monto from public.cfx_pagos where medio = 'mp' order by creado desc limit 1");
    ok(await aprobar(m1.monto) === 1, 'El servidor confirma con Mercado Pago (sin comprobante ni admin)');
    e = await como('tienda@x.cl', 'public.cfx_pago_estado()');
    const [pr] = await su('select pro_until > now() as pro from public.profiles where id = $1', [u.id]);
    ok(e.bloqueado === false && e.pagado === true && pr.pro, 'Al tiro: cuenta liberada + Premium activo');
    // 🧩 Módulo
    const mods = (await su('select public.cfx_modulos_de_app() as m'))[0].m;
    const k = mods[0];
    await su("insert into public.cfx_config (clave, valor) values ('modulos_venta', $1) on conflict (clave) do update set valor = excluded.valor", [JSON.stringify({ activo: true, precios: { [k]: 1990 } })]);
    ok(!(await como('tienda@x.cl', 'public.cfx_modulo_de($2, $3::uuid)', [k, u.id])), '🧩 ' + k + ': antes de pagar NO está activo');
    await como('tienda@x.cl', "public.cfx_mp_pagar('mensual', null, $2)", [k]);
    const [m2] = await su("select monto, producto from public.cfx_pagos where estado = 'pendiente' and medio = 'mp' order by creado desc limit 1");
    ok(m2 && m2.producto === k, 'Cobro del módulo pendiente por $' + (m2 && m2.monto));
    ok(await aprobar(m2.monto) === 1 && await como('tienda@x.cl', 'public.cfx_modulo_de($2, $3::uuid)', [k, u.id]), '🧩 ' + k + ': pagado con MP → activo solo');
    // Monto distinto (pagó menos) → NO libera
    await como('tienda@x.cl', "public.cfx_mp_pagar('mensual')");
    ok(await aprobar(1) === 0, 'Si Mercado Pago informa un monto menor, NO se aprueba (validado en el servidor)');
  } catch (e) { console.log('✗ ' + e.message); f++; }
  await t.cerrar();
  console.log(f ? '❌ ' + f + ' fallas' : '✅ g87j todo ok'); process.exit(f ? 1 : 0);
})();
