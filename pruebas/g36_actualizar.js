// G36 · 🔄 Actualizaciones (núcleo auto.js): el admin/socio recibe la versión sola apenas se PUBLICA (sin botón);
// el usuario, solo cuando se LIBERA, ve "🔄 Hay una versión nueva" con el botón "🔄 Actualizar" (no se instala sola).
// FALLA con el código viejo (al usuario se le instalaba sola y el admin veía un aviso para probar).
// Uso: ./base.sh /home/user/Estacionamiento g36_est && node g36_actualizar.js
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const NUEVA = '9.99.1';
(async () => {
  const t = await abrir('/home/user/Estacionamiento', 'g36_est');
  try {
    await t.sim.crearUsuario('socio@x.cl', 'clave123');
    await t.sim.su("insert into public.cfx_socios (email) values ('socio@x.cl') on conflict do nothing");
    const u = await t.sim.crearUsuario('ana@x.cl', 'clave123'); await t.sim.su("update public.perfiles set acepto_terminos = now(), nombre = 'Ana' where id = $1", [u.id]);
    const ctx = async () => {
      const c = await t.browser.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: 'block' }); await t.sim.conectar(c);
      await c.addInitScript(() => { window.CFX_SIN_HOLA = true; window.CFX_SIN_OBLIGAR = true; });
      await c.route(/\/version\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: NUEVA, bd: 27 }) }));
      return c;
    };
    const entrar = async (p, e) => { await p.goto(t.base + '/#/avisos'); await p.waitForTimeout(1500); await p.click('button[data-t=in]'); await p.waitForTimeout(300); await p.fill('#lEmail', e); await p.fill('#lClave', 'clave123'); await p.press('#lClave', 'Enter'); await p.waitForTimeout(3000); };
    const intentos = (p) => p.evaluate((v) => { try { return JSON.parse(localStorage.getItem('cfx:auto:n:' + v) || '[]').length; } catch (e) { return -1; } }, NUEVA);

    // 1) Publicada pero NO liberada: el usuario no ve nada; el socio (rol admin) la recibe sola.
    const cu = await ctx(), pu = await cu.newPage(); await entrar(pu, 'ana@x.cl');
    await pu.goto(t.base + '/#/'); await pu.reload(); await pu.waitForTimeout(3500);
    assert(await pu.locator('#cfxAutoUpd').count() === 0 && (await intentos(pu)) === 0, 'usuario: sin liberar no ve nada ni se instala');
    const cs = await ctx(), ps = await cs.newPage(); await entrar(ps, 'socio@x.cl');
    await ps.goto(t.base + '/#/'); await ps.reload(); await ps.waitForTimeout(5000);
    assert((await intentos(ps)) >= 1, 'socio/admin: la versión publicada se instala sola (sin botón)');
    assert(await ps.locator('#cfxAutoUpd').count() === 0, 'socio/admin: sin tarjeta con botón');
    // 2) Liberada: el usuario ve la tarjeta con "🔄 Actualizar" y NO se instala sola.
    await t.sim.su("update public.textos set valor = $1 where clave = 'version_liberada'", [NUEVA]);
    await pu.goto(t.base + '/#/'); await pu.reload(); await pu.waitForTimeout(4000);
    assert(await pu.locator('#cfxAutoUpd [data-si]').isVisible(), 'usuario: tarjeta "🔄 Versión nueva" con botón');
    assert((await intentos(pu)) === 0 && !/[?&]v=/.test(pu.url()), 'usuario: no se instala sola');
    await pu.screenshot({ path: __dirname + '/capturas/Estacionamiento/g36_tarjeta.png' });
    await pu.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await pu.setViewportSize({ width: 320, height: 640 }); await pu.waitForTimeout(300);
    assert(await pu.evaluate(() => { const r = document.getElementById('cfxAutoUpd').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), 'tarjeta cabe en 320 px');
    await pu.screenshot({ path: __dirname + '/capturas/Estacionamiento/g36_tarjeta_320_oscuro.png' });
    await Promise.all([pu.waitForURL(/[?&]v=/, { timeout: 15000 }), pu.click('#cfxAutoUpd [data-si]')]);
    assert(true, 'usuario: al tocar "🔄 Actualizar" se actualiza');
    // ✕ Después: no vuelve a salir en la sesión
    await pu.goto(t.base + '/#/'); await pu.reload(); await pu.waitForTimeout(3500);
    if (await pu.locator('#cfxAutoUpd [data-no]').count()) { await pu.click('#cfxAutoUpd [data-no]'); await pu.reload(); await pu.waitForTimeout(3500); assert(await pu.locator('#cfxAutoUpd').count() === 0, '✕ Después: no vuelve a salir en esta sesión'); }
  } catch (e) { console.log(e.message); await t.foto('g36_error'); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon/.test(x)).join('\n') || 'ninguno');
  await t.cerrar();
})();
