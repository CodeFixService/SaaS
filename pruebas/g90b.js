// G90 · 💰 cfx_dinero y 🔔 cfx_alertas_revisar funcionan en las 6 bases (cada app arma distinto su lista de cuentas). Uso: node g90b.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const APPS = [
  ['saas', async (s) => { const u = await s.crearUsuario(ADM, 'admin123'); await s.su("update public.perfiles set rol = 'admin' where id = $1", [u.id]).catch(() => {}); }],
  ['Aplicaciones', async (s) => { await s.crearUsuario(ADM, 'admin123'); }],
  ['barberia', async (s) => { await s.crearUsuario(ADM, 'admin123'); }],
  ['emprendedor', async (s) => { await s.crearUsuario(ADM, 'admin123'); await s.su('select privado.fijar_admin()'); }],
  ['taller', async (s) => { await s.crearUsuario(ADM, 'admin123'); }],
  ['estacionamiento', async (s) => { const u = await s.crearUsuario(ADM, 'admin123'); await s.su('update public.perfiles set es_admin = true where id = $1', [u.id]); }]
];
(async () => {
  for (const [r, adm] of APPS) {
    execSync(__dirname + '/base.sh /home/user/' + r + ' p_g90b', { stdio: 'ignore' });
    const t = await abrir('/home/user/' + r, 'p_g90b'); const su = t.sim.su, como = comoDe(su);
    try {
      await adm(t.sim);
      const [u] = await su("select id from auth.users where email <> $1 limit 1", [ADM]).catch(() => [null]);
      await su("insert into public.cfx_pagos (cuenta, email, rol, periodo, monto, medio, estado, dias, creado, resuelto) values ((select id from auth.users where email = $1), 'x@x.cl', 'negocio', 'mensual', 4900, 'link', 'aprobado', 30, now() - interval '35 days', now() - interval '35 days')", [ADM]);
      const d = await como(ADM, 'public.cfx_dinero()');
      ok(d && d.mes && Array.isArray(d.vencen) && Array.isArray(d.morosos), r + ': 💰 cfx_dinero responde (morosos ' + d.morosos.length + ', vencen ' + d.vencen.length + ')');
      await su('select public.cfx_alertas_revisar()');
      ok(+(await su('select public.cfx_alertas_revisar() as n'))[0].n === 0, r + ': 🔔 alertas corren sin error');
    } catch (e) { console.log('✗ ' + r + ': ' + e.message); f++; }
    await t.cerrar();
  }
  console.log(f ? '❌ ' + f + ' fallas' : '✅ g90b todo ok'); process.exit(f ? 1 : 0);
})();
