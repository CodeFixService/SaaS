// A1 · Legal en el núcleo: al entrar, la cuenta que no aceptó la versión vigente ve "Términos y privacidad" (Ley 21.719),
// no se cierra con Escape ni tocando afuera, pide marcar la casilla, guarda en cfx_legal y no vuelve a salir. Uso: node legal_ui.js [app…]
const { abrir } = require('./h');
const APPS = {
  saas: { db: 'p_saas', async cuenta(t) { await t.sim.crearUsuario('ana@x.cl', 'clave123'); return { url: '/', email: 'ana@x.cl' }; } },
  emprendedor: { db: 'p_emprendedor', async cuenta(t) {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123'); const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()'); await c.query("select public.crear_negocio('Almacén Ana','almacen',true)"); c.release();
    return { url: '/#ingresar', email: 'dueno@x.cl' }; } },
  // Órbita, cuenta que ya había aceptado los términos viejos (terms_at): el núcleo pide la versión nueva.
  Aplicaciones: { db: 'p_aplicaciones', async cuenta(t) { await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' }); await t.sim.su('update public.profiles set terms_at = now()'); return { url: '/', email: 'tienda@x.cl' }; } },
  taller: { db: 'p_taller', async cuenta(t) { await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' }); return { url: '/', email: 'taller@x.cl' }; } },
  estacionamiento: { db: 'p_estacionamiento', async cuenta(t) {
    await t.sim.crearUsuario('b@x.cl', 'clave123'); await t.sim.su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    return { url: '/#/mas', sel: 'button[data-t=in]', email: 'b@x.cl' }; } },
};
(async () => {
  const pedidas = process.argv.slice(2); let fallas = 0;
  if (!pedidas.length || pedidas.includes('orbita-nueva')) {
    require('child_process').execSync(__dirname + '/base.sh /home/user/Aplicaciones', { stdio: 'ignore' });
    const t = await abrir('/home/user/Aplicaciones', 'p_aplicaciones', { conHola: true }); const malos = [];
    try {
      await t.sim.crearUsuario('nueva@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Nueva' }); const { page: p } = await t.nuevo();
      await p.goto(t.base + '/'); await p.waitForTimeout(1200);
      await p.fill('input[type=email]:visible', 'nueva@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
      await p.waitForSelector('#tAcepto', { state: 'visible', timeout: 9000 }); await p.check('#tAcepto'); await p.click('#tBtn'); await p.waitForTimeout(4000);
      if (await p.locator('dialog.cfx-ayuda[open] [data-acepto]').count()) malos.push('preguntó dos veces');
      const r = await t.sim.su('select version from public.cfx_legal'); if (r.length !== 1 || r[0].version !== 2) malos.push('no guardó la versión: ' + JSON.stringify(r));
      const e = t.errores.filter((x) => !/404|Failed to load resource|net::/.test(x)); if (e.length) malos.push('errores: ' + e.join(' | ').slice(0, 300));
    } catch (x) { malos.push(x.message.slice(0, 300)); }
    console.log((malos.length ? '✗ ' : '✓ ') + 'orbita-nueva' + (malos.length ? ': ' + malos.join(' · ') : ': acepta una sola vez y queda guardado'));
    if (malos.length) fallas++;
    await t.cerrar();
  }
  for (const [app, A] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(app)) continue;
    require('child_process').execSync(__dirname + '/base.sh /home/user/' + app, { stdio: 'ignore' });
    const t = await abrir('/home/user/' + app, A.db, { conHola: true }); const malos = [];
    try {
      const c = await A.cuenta(t); const { page: p } = await t.nuevo();
      await p.goto(t.base + c.url); await p.waitForTimeout(1200); if (c.sel) { await p.click(c.sel).catch(() => {}); await p.waitForTimeout(300); }
      await p.fill('input[type=email]:visible', c.email); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
      const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]');
      await ley.waitFor({ timeout: 9000 }).catch(async () => { malos.push('no salió la ventana de términos'); await t.foto('legal-' + app + '-sin', p); });
      if (!malos.length) {
        const txt = await p.locator('dialog.cfx-ayuda[open]').innerText();
        if (!/21\.719/.test(txt)) malos.push('no menciona la Ley 21.719');
        const vent = await p.locator('dialog.cfx-ayuda[open]').count(); if (vent !== 1) malos.push('ventanas abiertas: ' + vent);
        await t.foto('legal-' + app, p);
        await p.keyboard.press('Escape'); await p.mouse.click(3, 3); await p.waitForTimeout(300);
        if (!(await ley.count())) malos.push('se cerró con Escape o tocando afuera');
        await ley.click(); await p.waitForTimeout(300);
        if (!(await ley.count())) malos.push('aceptó sin marcar la casilla');
        await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1200);
        if (await ley.count()) malos.push('no se cerró al aceptar');
        const r = await t.sim.su('select version from public.cfx_legal');
        if (r.length !== 1 || r[0].version !== 2) malos.push('no quedó guardado en cfx_legal: ' + JSON.stringify(r));
        await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(4000);
        if (await ley.count()) malos.push('volvió a salir después de aceptar');
        const pv = await p.evaluate(() => { CFX_LEGAL.privacidad(); const d = document.querySelector('dialog.cfx-ayuda[open]'); return d ? d.innerText : ''; });
        if (!/Agencia de Protección de Datos/.test(pv) || !/portabilidad/.test(pv)) malos.push('Política de privacidad incompleta');
      }
      const e = t.errores.filter((x) => !/404|Failed to load resource|net::/.test(x)); if (e.length) malos.push('errores: ' + e.join(' | ').slice(0, 300));
    } catch (x) { malos.push(x.message.slice(0, 300)); }
    console.log((malos.length ? '✗ ' : '✓ ') + app + (malos.length ? ': ' + malos.join(' · ') : ': términos versionados OK'));
    if (malos.length) fallas++;
    await t.cerrar();
  }
  console.log(fallas ? 'HAY FALLAS: ' + fallas : 'TODO OK'); process.exit(fallas ? 1 : 0);
})();
