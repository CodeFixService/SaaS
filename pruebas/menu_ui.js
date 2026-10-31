// Menú Más común (núcleo CFX_MENU): lista sin repetidos; cada opción de Configuración abre una hoja desde abajo, la página no se mueve ni se recarga;
// la hoja se cierra con ✕ y con "atrás". Uso: ANCHO=390 node menu_ui.js [app…]
const { abrir } = require('./h');
const ANCHO = Number(process.env.ANCHO) || 390;
const ADM = 'juanjosuecastilloloyola@gmail.com';
const APPS = {
  saas: { db: 'p_saas', async cuentas(t) { await t.sim.crearUsuario('ana@x.cl', 'clave123'); return [{ rol: 'negocio', url: '/', email: 'ana@x.cl', mas: () => window.CM.ir('mas') }]; } },
  emprendedor: { db: 'p_emprendedor', async cuentas(t) {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123'); const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()'); await c.query("select public.crear_negocio('Almacén Ana','almacen',true)"); c.release();
    return [{ rol: 'negocio', url: '/#ingresar', email: 'dueno@x.cl', hash: '#mas' }]; } },
  Aplicaciones: { db: 'p_aplicaciones', async cuentas(t) {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Pepe','client',$1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123'); await t.sim.su('update public.profiles set terms_at = now()');
    return [{ rol: 'negocio', url: '/', email: 'tienda@x.cl', hash: '#ajustes' }, { rol: 'cliente', url: '/', email: 'cli@x.cl', goto: '/#cuenta' }]; } },
  barberia: { db: 'barberia_prueba', base: false, async cuentas(t) {
    await t.sim.su('update public.profiles set clave_temporal = false where true').catch(() => {}); await t.sim.su("update auth.claves set pass = 'clave123'").catch(() => {});
    return [{ rol: 'negocio', url: '/', email: 'dueno@test.cl', hash: '#mas', secciones: ['horario', 'servicios', 'premium', 'negocio'] }, { rol: 'cliente', url: '/', email: 'carlos@test.cl', hash: '#perfil' }]; } },
  taller: { db: 'p_taller', async cuentas(t) {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await t.sim.su("insert into public.invitaciones (email, nombre, rol, taller_id) select 'ciclista@x.cl','Pepe','cliente', id from talleres limit 1");
    await t.sim.crearUsuario('ciclista@x.cl', 'clave123'); await t.sim.su('update public.perfiles set terminos_at = now()').catch(() => {});
    return [{ rol: 'negocio', url: '/', email: 'taller@x.cl', hash: '#mas', secciones: ['horario', 'servicios', 'perfil', 'micuenta'] }, { rol: 'cliente', url: '/', email: 'ciclista@x.cl', hash: '#cuenta' }]; } },
  estacionamiento: { db: 'p_estacionamiento', async cuentas(t) {
    await t.sim.crearUsuario('b@x.cl', 'clave123'); await t.sim.su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    return [{ rol: 'cliente', url: '/#/mas', sel: 'button[data-t=in]', email: 'b@x.cl', hash: '#/mas', secciones: ['estacionamientos', 'links', 'premium', 'favoritos'] }]; } },
  contenido: { db: 'p_contenido', sh: '/home/user/contenido/pruebas/base.sh', async cuentas(t) {
    const u = await t.sim.crearUsuario('redes@x.cl', 'clave123');
    await t.sim.su('alter table public.empresas disable trigger empresas_antes'); await t.sim.su("insert into public.empresas (owner, nombre) values ($1, 'Bici Ana')", [u.id]); await t.sim.su('alter table public.empresas enable trigger empresas_antes');
    await t.sim.su(`update public.perfiles set prefs = coalesce(prefs, '{}') || '{"guia":{"n":9}}'`).catch(() => {});
    return [{ rol: 'negocio', url: '/', email: 'redes@x.cl', mas: () => window.CC.ir('empresa') }]; } },
};
(async () => {
  const pedidas = process.argv.slice(2), inf = [];
  for (const [app, A] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(app)) continue;
    if (A.base !== false) require('child_process').execSync(A.sh || __dirname + '/base.sh /home/user/' + app, { stdio: 'ignore' });
    const t = await abrir('/home/user/' + app, A.db);
    try {
      for (const c of await A.cuentas(t)) {
        const { ctx, page: p } = await t.nuevo(); const malos = []; const foto = (x) => t.foto(ANCHO + '-menu-' + c.rol + '-' + x, p);
        try {
          await p.goto(t.base + c.url); await p.waitForTimeout(1200); if (c.sel) { await p.click(c.sel).catch(() => {}); await p.waitForTimeout(300); }
          await p.fill('input[type=email]:visible', c.email); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
          await p.waitForTimeout(3500); await t.sinModales(p);
          if (c.goto) await p.goto(t.base + c.goto); else if (c.mas) await p.evaluate(c.mas); else await p.evaluate((h) => { location.hash = h; }, c.hash);
          await p.waitForTimeout(2500); await t.sinModales(p);
          const menus = await p.locator('.cfx-mmas:visible').count();
          if (menus !== 1) malos.push('menús visibles: ' + menus);
          const ks = await p.$$eval('.cfx-mmas .cfx-fila', (l) => l.map((x) => x.dataset.k));
          const tit = await p.$$eval('.cfx-mmas .cfx-fila b, .cfx-cuenta-g .cfx-fila b', (l) => l.filter((x) => x.offsetParent).map((x) => x.textContent.trim()));
          const rep = tit.filter((x, i) => tit.indexOf(x) !== i); if (rep.length) malos.push('repetidos: ' + [...new Set(rep)].join(', '));
          if (await p.locator('.cfx-cuenta-g:visible').count()) malos.push('Cuenta y ayuda suelta (fuera del menú)');
          await foto('0'); if (!(await t.anchoOk(p))) malos.push('ancho menú');
          await p.evaluate(() => { window.__marca = 1; scrollTo(0, 300); }); await p.waitForTimeout(200);
          const conf = await p.$$eval('.cfx-mmas .cfx-aj-g', (gs) => { const r = []; gs.forEach((g) => { if (/Configuración/i.test(g.textContent)) g.nextElementSibling.querySelectorAll('.cfx-fila[data-tipo=hoja]').forEach((f) => r.push(f.dataset.k)); }); return r; });
          let n = 0;
          for (const k of conf) {
            const y = await p.evaluate(() => scrollY);
            await p.locator('.cfx-mmas .cfx-fila[data-k="' + k + '"]').evaluate((b) => b.click()); await p.waitForTimeout(900);
            const h = await p.locator('.cfx-hoja-m').count();
            if (!h) { malos.push(k + ': no abrió hoja'); continue; }
            const vacia = await p.$eval('.cfx-hoja-m .cfx-hm-zona', (z) => !z.textContent.trim() && !z.querySelector('input,button,img'));
            if (vacia) malos.push(k + ': hoja vacía');
            await foto('h-' + k); if (!(await t.anchoOk(p))) malos.push('ancho hoja ' + k);
            if (n++ % 2) await p.click('.cfx-hoja-m .cfx-hm-x'); else await p.goBack();
            await p.waitForTimeout(500);
            if (await p.locator('.cfx-hoja-m').count()) malos.push(k + ': la hoja no se cerró');
            if (await p.evaluate(() => window.__marca !== 1)) { malos.push(k + ': la página se recargó'); break; }
            if (Math.abs((await p.evaluate(() => scrollY)) - y) > 2) malos.push(k + ': la página se movió');
            if (!(await p.locator('.cfx-mmas:visible').count())) { malos.push(k + ': al cerrar ya no está el menú'); break; }
          }
          // Opciones que abren su propia sección (p. ej. Horario en Barbería): también en hoja, sin cambiar la página.
          for (const k of (c.secciones || [])) {
            await p.locator('.cfx-mmas .cfx-fila[data-k="' + k + '"]').evaluate((b) => b.click()); await p.waitForTimeout(1500);
            const hs = await p.locator('.cfx-hoja-m').count();
            if (hs !== 1) malos.push(k + ': hojas abiertas ' + hs);
            else { await foto('s-' + k); if (await p.$eval('.cfx-hoja-m .cfx-hm-zona', (z) => !z.textContent.trim())) malos.push(k + ': hoja vacía'); await p.click('.cfx-hoja-m .cfx-hm-x'); await p.waitForTimeout(500); }
            if (await p.evaluate(() => window.__marca !== 1)) { malos.push(k + ': la página se recargó'); break; }
            if (!(await p.locator('.cfx-mmas:visible').count())) { malos.push(k + ': al cerrar ya no está el menú'); break; }
          }
          // Perfil compacto arriba: abre Foto y nombre
          await p.locator('.cfx-mmas [data-pf-cab]').first().click(); await p.waitForTimeout(700);
          if (!(await p.locator('.cfx-hoja-m [data-pf=guardar]').count())) malos.push('el perfil de arriba no abre Foto y nombre'); else await p.click('.cfx-hoja-m .cfx-hm-x');
          inf.push(app + ' · ' + c.rol + ' · ' + ks.length + ' opciones, ' + conf.length + ' en Configuración' + (malos.length ? ' · ⚠️ ' + malos.join(' | ') : ' · ok'));
        } catch (e) { inf.push(app + ' · ' + c.rol + ' · FALLA ' + e.message.split('\n')[0]); await foto('error').catch(() => {}); }
        await ctx.close();
      }
    } finally { const err = t.errores.filter((e) => !/404|TUNNEL|ERR_/.test(e)); if (err.length) inf.push(app + ' · ERRORES: ' + [...new Set(err)].slice(0, 5).join(' || ')); await t.cerrar(); }
  }
  console.log(inf.join('\n'));
})();
