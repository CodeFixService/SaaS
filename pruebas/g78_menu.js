// G78 · Menú: en computador (≥ 900 px) SIEMPRE al lado y en celular SIEMPRE abajo, desde que carga (sin tocar nada) y en cada recarga. Las 6 apps.
// FALLA con el código viejo: el menú que la app llena después de cargar los datos (CM app/, etc.) quedaba "crudo" (abajo en el PC)
// hasta que algo nuevo se agregaba a la página (tocar + o ⚙️).
// (Los admin de Barbería/BiciTaller/Billetera se manejan desde el CM: no se prueban aquí.)
// Uso: node g78_menu.js [saas barberia ...]   (RECARGAS=3)
const { abrir } = require('./h');
const { execSync } = require('child_process');
const ADM = 'juanjosuecastilloloyola@gmail.com';
const ANCHOS = [[1366, 800, 'PC'], [1024, 700, 'tablet horizontal'], [360, 740, 'celular']];
const APPS = {
  saas: { db: 'p_g78_cm', async cuentas(t) {
    await t.sim.crearUsuario(ADM, 'admin123'); await t.sim.crearUsuario('uno@x.cl', 'clave123');
    return [['CM admin', ADM, 'admin123', '/admin/'], ['CM negocio', 'uno@x.cl', 'clave123', '/app/']]; } },
  barberia: { db: 'p_g78_bar', async cuentas(t) {
    await t.sim.crearUsuario(ADM, 'admin123');
    const inv = (por, email, nombre, rol, tel, bar) => t.sim.su('select public.preparar_invitacion((select id from public.profiles where email = $1), $2, $3, $4, $5, $6)', [por, email, nombre, rol, tel, bar]);
    await inv(ADM, 'dueno@x.cl', 'Rodrigo', 'owner', '+56911111111', 'Barbería Sur'); await t.sim.crearUsuario('dueno@x.cl', 'clave123');
    await inv('dueno@x.cl', 'cli@x.cl', 'Pepe', 'client', '+56933333333', null); await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await t.sim.su('update public.profiles set clave_temporal = false, tour_visto = true where true').catch(() => {});
    return [['Barbería negocio', 'dueno@x.cl', 'clave123', '/equipo/'], ['Barbería cliente', 'cli@x.cl', 'clave123', '/cliente/']]; } },
  taller: { db: 'p_g78_tal', async cuentas(t) {
    await t.sim.crearUsuario(ADM, 'admin123');
    const tl = await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    const [x] = await t.sim.su('select id from public.talleres limit 1');
    await t.sim.crearUsuario('cli@x.cl', 'clave123', { rol: 'cliente', taller: x && x.id });
    await t.sim.su('update public.perfiles set terminos_at = now()').catch(() => {});
    await t.sim.su("update public.talleres set premium_hasta = now() - interval '1 day'").catch(() => {});
    return [['BiciTaller taller', 'taller@x.cl', 'clave123', '/taller/'], ['BiciTaller cliente', 'cli@x.cl', 'clave123', '/cliente/']]; } },
  emprendedor: { db: 'p_g78_emp', login: '/#ingresar', async cuentas(t) {
    await t.sim.crearUsuario(ADM, 'admin123'); await t.sim.su('select privado.fijar_admin()').catch(() => {});
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123');
    const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]);
    await c.query('select public.aceptar_terminos()'); const neg = (await c.query("select public.crear_negocio('Almacén Ana','almacen',true) ->> 'id' as id")).rows[0].id; c.release();
    await t.sim.su("update public.negocios set premium_hasta = now() + interval '30 days', activado = true where id = $1", [neg]);
    return [['Billetera negocio', 'dueno@x.cl', 'clave123', '/app/']]; } },
  estacionamiento: { db: 'p_g78_est', login: '/#/avisos', mail: '#lEmail', clave: '#lClave', async cuentas(t) {
    await t.sim.crearUsuario('b@x.cl', 'clave123');
    await t.sim.su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    return [['Estaciona usuario', 'b@x.cl', 'clave123', '/#/']]; } },
  Aplicaciones: { db: 'p_g78_apl', antes: (ctx) => ctx.addInitScript(() => { try { localStorage.setItem('cfx:tour:orbita-inicio', '1'); } catch (e) { /* */ } }), async cuentas(t) {
    await t.sim.crearUsuario(ADM, 'admin123');
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Pepe','client',$1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123'); await t.sim.su('update public.profiles set terms_at = now()');
    return [['Despega negocio', 'tienda@x.cl', 'clave123', '/'], ['Despega negocio (Caja)', 'tienda@x.cl', 'clave123', '/apps/caja/'], ['Despega cliente', 'cli@x.cl', 'clave123', '/apps/pedidos/']]; } },
};
const est = (p) => p.evaluate(() => { const n = document.querySelector('nav.cfx-barra') || document.querySelector('nav.tabs:not(.sub), nav#nav, nav.nav'); if (!n) return { sin: 1 }; const r = n.getBoundingClientRect();
  return { cfx: n.classList.contains('cfx-barra'), lado: r.left === 0 && Math.round(r.width) === 220 && r.height > innerHeight - 2,
    abajo: innerHeight - r.bottom < 20 && r.bottom <= innerHeight + 1 && r.width > innerWidth - 30 && r.height < 140 && r.top > innerHeight / 2,
    r: [r.left, r.top, r.width, r.height].map(Math.round), vis: getComputedStyle(n).visibility }; });
(async () => {
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const pedidas = process.argv.slice(2), R = Number(process.env.RECARGAS) || 3;
  for (const [repo, A] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(repo)) continue;
    execSync(__dirname + '/base.sh /home/user/' + repo + ' ' + A.db, { stdio: 'ignore' });
    const t = await abrir('/home/user/' + repo, A.db);
    try {
      const cuentas = await A.cuentas(t);
      for (const [w, h, q] of ANCHOS) for (const [nom, mail, clave, ruta] of cuentas) {
        const { ctx, page: p } = await t.nuevo(); if (A.antes) await A.antes(ctx); await p.setViewportSize({ width: w, height: h });
        try {
          await p.goto(t.base + (A.login || '/')); await p.waitForTimeout(1200);
          const tIn = p.locator('button[data-t=in]'); if (await tIn.count() && await tIn.isVisible()) { await tIn.click(); await p.waitForTimeout(300); }
          const cm = A.mail || 'input[type=email]:visible', cc = A.clave || 'input[type=password]:visible'; await p.fill(cm, mail); await p.fill(cc, clave); await p.press(cc, 'Enter');
          await p.waitForTimeout(3500);
          const ley = p.locator('dialog[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog[open] [data-ok]').catch(() => {}); await ley.click().catch(() => {}); await p.waitForTimeout(1200); }
          await p.goto(t.base + ruta); 
          for (let i = 0; i < R; i++) {
            if (i) await p.reload();
            await p.waitForTimeout(3500);
            const e = await est(p);
            const bien = e.cfx && (w >= 900 ? e.lado : e.abajo) && e.vis === 'visible';
            ok(bien, nom + ' · ' + q + ' · carga ' + (i + 1) + ': menú ' + (w >= 900 ? 'al lado' : 'abajo') + (bien ? '' : ' ' + JSON.stringify(e) + ' ' + p.url().replace(t.base, '')));
            if (!bien) await p.screenshot({ path: __dirname + '/capturas/g78_' + nom.replace(/\W+/g, '_') + '_' + w + '_' + i + '.png' });
          }
        } catch (x) { ok(false, nom + ' · ' + q + ': ' + x.message.split('\n')[0]); }
        await ctx.close();
      }
    } finally { await t.cerrar(); }
  }
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
