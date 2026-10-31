// Perfil común (núcleo → CFX_PERFIL): desde el menú de la foto guarda nombre, color, modo y contraseña con el adaptador de cada app.
// Uso: node perfil_ui.js [saas|emprendedor|barberia]   (sin nada: las tres)
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };

const APPS = {
  saas: { db: 'p_saas', url: '/', async cuenta(t) { await t.sim.crearUsuario('ana@x.cl', 'clave123'); return 'ana@x.cl'; },
    nombre: async (t) => (await t.sim.su("select nombre from perfiles where email='ana@x.cl'"))[0].nombre,
    color: async (t) => (await t.sim.su("select prefs->>'color' c from perfiles where email='ana@x.cl'"))[0].c,
    modo: async (t) => (await t.sim.su("select prefs->>'tema' m from perfiles where email='ana@x.cl'"))[0].m },
  emprendedor: { db: 'p_emprendedor', url: '/#ingresar', async cuenta(t) {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123'); const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()'); await c.query("select public.crear_negocio('Almacén Ana','almacen',true)"); c.release();
    return 'dueno@x.cl';
  }, color: async (t) => (await t.sim.su('select color c from negocios'))[0].c, modo: async (t, p) => p.evaluate(() => localStorage.getItem('lc-tema')) },
  barberia: { db: 'barberia_prueba', base: false, url: '/', async cuenta() { return 'carlos@test.cl'; },
    nombre: async (t) => (await t.sim.su("select nombre from profiles where email='carlos@test.cl'"))[0].nombre,
    color: async (t) => (await t.sim.su("select color c from profiles where email='carlos@test.cl'"))[0].c, modo: async (t, p) => p.evaluate(() => localStorage.getItem('barb:tema')) }
};

(async () => {
  const pedidas = process.argv.slice(2);
  for (const [app, A] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(app)) continue;
    if (A.base !== false) require('child_process').execSync(__dirname + '/base.sh /home/user/' + app, { stdio: 'ignore' });
    const t = await abrir('/home/user/' + app, A.db);
    const p = t.page;
    try {
      const email = await A.cuenta(t);
      if (app === 'barberia') await t.sim.su("update profiles set clave_temporal = false, is_premium = true, premium_hasta = now() + interval '30 days' where email = $1", [email]).catch(() => {});
      await p.goto(t.base + A.url); await p.waitForTimeout(1200);
      await p.fill('input[type=email]:visible', email); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
      await p.waitForTimeout(3000); await t.sinModales(p);
      const menu = async () => { await t.sinModales(p); await p.locator('.cfx-av:visible').first().click(); await p.waitForTimeout(500); await p.click('dialog [data-a=perfil]'); await p.waitForTimeout(700); };
      const seccion = async (n) => { await p.locator('dialog .cfx-aj > button').nth(n).click(); await p.waitForTimeout(500); };
      await menu(); assert(await p.locator('dialog .cfx-aj > button').count() >= 3, app + ': perfil con sus 3 secciones');
      // Foto y nombre
      await seccion(0);
      const nom = p.locator('dialog [data-k=nombre]');
      if (A.nombre) { await nom.fill('Ana Prueba'); await p.click('dialog [data-pf=guardar]'); await p.waitForTimeout(1200); assert(await A.nombre(t) === 'Ana Prueba', app + ': nombre guardado'); }
      else assert(await nom.getAttribute('readonly') !== null, app + ': nombre solo se lee (se cambia en Ajustes)');
      await t.foto(app + '-perfil-yo');
      // Color y modo
      await p.click('dialog .cfx-aj-volver'); await p.waitForTimeout(300); await seccion(1);
      const col = p.locator('dialog .cfx-pf-cols > button:not(.on):not(.cfx-pf-lock)').nth(1), c = await col.getAttribute('data-c');
      await col.click(); await p.waitForTimeout(1200);
      assert(String(await A.color(t)).toLowerCase() === c.toLowerCase(), app + ': color guardado ' + c);
      await p.click('dialog [data-m=oscuro]'); await p.waitForTimeout(1000);
      assert(await p.evaluate(() => document.documentElement.dataset.theme) === 'dark', app + ': modo oscuro aplicado');
      assert(/oscuro|dark/.test(await A.modo(t, p)), app + ': modo guardado');
      await t.foto(app + '-perfil-estilo');
      await p.click('dialog [data-m=auto]'); await p.waitForTimeout(800);
      // Avanzado: contraseña
      await p.click('dialog .cfx-aj-volver'); await p.waitForTimeout(300); await seccion(2);
      assert(/Activas|Apagadas/.test(await p.locator('dialog [data-push]').textContent()), app + ': estado de notificaciones');
      await p.fill('dialog [data-c1]', 'NuevaClave9'); await p.fill('dialog [data-c2]', 'NuevaClave9'); await p.click('dialog [data-pf=clave]'); await p.waitForTimeout(1000);
      assert((await t.sim.su('select pass from auth.claves where email = $1', [email]))[0].pass === 'NuevaClave9', app + ': contraseña cambiada');
      await t.foto(app + '-perfil-avanzado');
      assert(await t.anchoOk(p), app + ': ancho');
    } catch (e) { console.log(e.message); await t.foto(app + '-error'); }
    console.log(app + ' ERRORES:', t.errores.filter((e) => !/404/.test(e)).join('\n') || 'ninguno');
    await t.cerrar();
  }
})();
