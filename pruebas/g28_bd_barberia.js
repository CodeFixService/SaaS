// G28 · Barbería → Administración: el aviso "La base de datos es la versión X y la app la Y" salía siempre (comparaba con la versión de la app,
// no con la base que pide). Ahora compara con version.json → bd. Uso: node g28_bd_barberia.js  (antes ./base.sh /home/user/barberia barberia_prueba)
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/barberia', 'barberia_prueba');
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  try {
    const mail = (await t.sim.su('select public.admin_email() e'))[0].e;
    await t.sim.crearUsuario(mail, 'admin123').catch(() => {});
    await t.sim.su("update public.profiles set role = 'admin' where id = (select id from auth.users where lower(email) = $1)", [mail]);
    const q = t.page;
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.fill('input[type=email]:visible', mail); await q.fill('input[type=password]:visible', 'admin123'); await q.press('input[type=password]:visible', 'Enter');
    await q.waitForTimeout(3000); await q.goto(t.base + '/admin/'); await q.waitForTimeout(4000); await t.sinModales(q);
    const r = await q.evaluate(() => [location.pathname, document.body.innerText.includes('La base de datos es la versión'), !!document.querySelector('.stat, .card')]);
    ok(r[0].includes('admin') && r[2] && !r[1], 'Admin sin aviso falso de base ' + JSON.stringify(r));
    // Si la base de verdad está atrasada, el aviso sí sale.
    await t.sim.su("create or replace function public.db_version() returns text language sql immutable as $$ select '2.70'::text $$");
    await q.reload(); await q.waitForTimeout(4000); await t.sinModales(q);
    ok(await q.evaluate(() => document.body.innerText.includes('La base de datos es la versión 2.70')), 'base atrasada → sí avisa');
  } catch (e) { console.log('✗ ' + e.stack); process.exitCode = 1; }
  await t.cerrar();
})();
