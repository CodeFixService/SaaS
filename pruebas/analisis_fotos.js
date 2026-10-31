// Análisis (no cambia nada): en cada app, como negocio y cliente, sube una foto de celular (vertical 3000x4000) por Mi perfil
// y saca capturas de la cabecera, del perfil y de la pantalla de menú (Más/Ajustes/Cuenta). Uso: node analisis_fotos.js [app…]
const { abrir } = require('./h');
const fs = require('fs');
const DIR = '/tmp/claude-0/-home-user/dee7cf15-7841-5e80-b288-4da577370f36/scratchpad/an/';
const FOTO = DIR + 'foto.jpg';
const ADM = 'juanjosuecastilloloyola@gmail.com';
const APPS = {
  saas: { db: 'p_saas', async cuentas(t) { await t.sim.crearUsuario('ana@x.cl', 'clave123'); return [{ rol: 'negocio', url: '/', email: 'ana@x.cl' }]; }, menu: 'Más' },
  emprendedor: { db: 'p_emprendedor', async cuentas(t) {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123'); const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()'); await c.query("select public.crear_negocio('Almacén Ana','almacen',true)"); c.release();
    return [{ rol: 'negocio', url: '/#ingresar', email: 'dueno@x.cl' }]; }, menu: 'Más' },
  Aplicaciones: { db: 'p_aplicaciones', async cuentas(t) {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Pepe','client',$1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123'); await t.sim.su('update public.profiles set terms_at = now()');
    return [{ rol: 'negocio', url: '/', email: 'tienda@x.cl' }, { rol: 'cliente', url: '/', email: 'cli@x.cl' }]; }, menu: 'Ajustes' },
  barberia: { db: 'barberia_prueba', base: false, async cuentas(t) {
    await t.sim.su('update public.profiles set clave_temporal = false where true').catch(() => {}); await t.sim.su("update auth.claves set pass = 'clave123'").catch(() => {});
    return [{ rol: 'negocio', url: '/', email: 'dueno@test.cl' }, { rol: 'cliente', url: '/', email: 'carlos@test.cl' }]; }, menu: 'Perfil|Más' },
  taller: { db: 'p_taller', async cuentas(t) {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await t.sim.su("insert into public.invitaciones (email, nombre, rol, taller_id) select 'ciclista@x.cl','Pepe','cliente', id from talleres limit 1");
    await t.sim.crearUsuario('ciclista@x.cl', 'clave123'); await t.sim.su('update public.perfiles set terminos_at = now()').catch(() => {});
    return [{ rol: 'negocio', url: '/', email: 'taller@x.cl' }, { rol: 'cliente', url: '/', email: 'ciclista@x.cl' }]; }, menu: 'Más|Cuenta' },
  estacionamiento: { db: 'p_estacionamiento', async cuentas(t) {
    await t.sim.crearUsuario('b@x.cl', 'clave123'); await t.sim.su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    return [{ rol: 'cliente', url: '/#/mas', sel: 'button[data-t=in]', email: 'b@x.cl' }]; }, menu: 'Más' },
  contenido: { db: 'p_contenido', sh: '/home/user/contenido/pruebas/base.sh', async cuentas(t) {
    const u = await t.sim.crearUsuario('redes@x.cl', 'clave123');
    await t.sim.su('alter table public.empresas disable trigger empresas_antes'); await t.sim.su("insert into public.empresas (owner, nombre) values ($1, 'Bici Ana')", [u.id]); await t.sim.su('alter table public.empresas enable trigger empresas_antes');
    await t.sim.su(`update public.perfiles set prefs = coalesce(prefs, '{}') || '{"guia":{"n":9}}'`).catch(() => {});
    return [{ rol: 'negocio', url: '/', email: 'redes@x.cl' }]; }, menu: 'Empresa|Más' },
};
(async () => {
  const pedidas = process.argv.slice(2), inf = [];
  for (const [app, A] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(app)) continue;
    if (A.base !== false) require('child_process').execSync(A.sh || __dirname + '/base.sh /home/user/' + app, { stdio: 'ignore' });
    const t = await abrir('/home/user/' + app, A.db);
    try {
      for (const c of await A.cuentas(t)) {
        const { ctx, page: p } = await t.nuevo(); const n = (x) => DIR + app + '-' + c.rol + '-' + x + '.png';
        try {
          await p.goto(t.base + c.url); await p.waitForTimeout(1200); if (c.sel) { await p.click(c.sel).catch(() => {}); await p.waitForTimeout(300); }
          await p.fill('input[type=email]:visible', c.email); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
          await p.waitForTimeout(3500); await t.sinModales(p);
          // Subir la foto por Mi perfil (menú de la foto)
          await p.locator('.cfx-av:visible').first().click(); await p.waitForTimeout(500); await p.click('dialog [data-a=perfil]'); await p.waitForTimeout(700);
          await p.locator('.cfx-hoja-m .cfx-aj > .cfx-fila').first().evaluate((b) => b.click()); await p.waitForTimeout(600);
          const bloq = await p.locator('.cfx-hoja-m [data-pf=foto]').count();
          if (bloq) {
            const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null), p.click('.cfx-hoja-m [data-pf=foto]')]);
            if (fc) { await fc.setFiles(FOTO); await p.waitForTimeout(800); await p.screenshot({ path: n('1-perfil-previa') }); await p.click('.cfx-hoja-m [data-pf=guardar]'); await p.waitForTimeout(2500); }
            else inf.push(app + ' ' + c.rol + ': la foto es Premium (se pide pagar)');
          }
          await p.screenshot({ path: n('2-perfil-guardado') });
          while (await p.locator('.cfx-hoja-m').count()) { await p.locator('.cfx-hoja-m').last().locator('.cfx-hm-x').click(); await p.waitForTimeout(400); }
          await t.sinModales(p);
          await p.screenshot({ path: n('3-cabecera'), clip: { x: 0, y: 0, width: 390, height: 80 } });
          // Fotos en pantalla: tamaño y proporción reales de cada <img> de perfil/cabecera
          const imgs = await p.$$eval('img', (l) => l.filter((i) => i.offsetParent && /^data:|blob:|fotos|avatar|perfil/.test(i.src) || i.closest('.cfx-av')).map((i) => {
            const r = i.getBoundingClientRect(), cs = getComputedStyle(i);
            return (i.closest('.cfx-av') ? 'cabecera ' : '') + Math.round(r.width) + 'x' + Math.round(r.height) + ' natural ' + i.naturalWidth + 'x' + i.naturalHeight + ' fit=' + cs.objectFit + ' src=' + i.src.slice(0, 22);
          }));
          inf.push(app + ' ' + c.rol + ' imgs: ' + (imgs.join(' | ') || 'ninguna'));
          // Menú: pestaña Más/Ajustes/Cuenta, página completa
          const tab = p.locator('nav.cfx-barra > *').filter({ hasText: new RegExp(A.menu, 'i') }).first();
          if (await tab.count()) { await tab.evaluate((b) => b.click()); await p.waitForTimeout(2000); await t.sinModales(p); await p.screenshot({ path: n('4-menu'), fullPage: true }); }
          else inf.push(app + ' ' + c.rol + ': sin pestaña ' + A.menu);
        } catch (e) { inf.push(app + ' ' + c.rol + ' FALLA ' + e.message.split('\n')[0]); await p.screenshot({ path: n('error') }).catch(() => {}); }
        await ctx.close();
      }
    } finally { const err = t.errores.filter((e) => !/404|TUNNEL|ERR_/.test(e)); if (err.length) inf.push(app + ' ERRORES: ' + [...new Set(err)].slice(0, 4).join(' || ')); await t.cerrar(); }
  }
  console.log(inf.join('\n'));
})();
