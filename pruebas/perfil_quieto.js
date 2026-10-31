// Perfil dentro de la pantalla de la app: abrir una sección y tocar color/modo no mueve la pantalla ni recarga.
// Uso: node perfil_quieto.js [saas|estacionamiento]
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const APPS = {
  saas: { db: 'p_saas', login: '/', mas: '/', tab: 'Más', sel: '#miPerfil', async cuenta(t) { await t.sim.crearUsuario('ana@x.cl', 'clave123'); return 'ana@x.cl'; } },
  estacionamiento: { db: 'p_estacionamiento', login: '/#/mas', btn: 'button[data-t=in]', mas: '/#/mas/perfil', sel: '#miPerfil', async cuenta(t) {
    await t.sim.crearUsuario('b@x.cl', 'clave123'); await t.sim.su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = 'Beto'"); return 'b@x.cl'; } }
};
(async () => {
  const pedidas = process.argv.slice(2);
  for (const [app, A] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(app)) continue;
    require('child_process').execSync(__dirname + '/base.sh /home/user/' + app, { stdio: 'ignore' });
    const t = await abrir('/home/user/' + app, A.db), p = t.page;
    try {
      const email = await A.cuenta(t);
      await p.goto(t.base + A.login); await p.waitForTimeout(1200);
      if (A.btn) { await p.click(A.btn); await p.waitForTimeout(300); }
      await p.fill('input[type=email]:visible', email); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
      await p.waitForTimeout(3000); await t.sinModales(p);
      await p.goto(t.base + A.mas); await p.waitForTimeout(2000); await t.sinModales(p);
      if (A.tab) { await p.evaluate(() => window.CM.ir('mas')); await p.waitForTimeout(2500); await t.sinModales(p); }
      await t.foto(app + '-mas');
      await p.evaluate((s) => { const e = document.querySelector(s); scrollTo(0, Math.max(0, e.getBoundingClientRect().top + scrollY - 200)); window.__marca = 1; }, A.sel);
      await p.waitForTimeout(300);
      const y0 = await p.evaluate(() => scrollY);
      await p.locator(A.sel + ' .cfx-aj > button').nth(1).click(); await p.waitForTimeout(800);
      const top = await p.evaluate((s) => document.querySelector(s).getBoundingClientRect().top, A.sel);
      assert(top > 0 && top < 500, app + ': al abrir Color y modo la sección queda a la vista (top ' + Math.round(top) + ', antes y=' + y0 + ')');
      const y1 = await p.evaluate(() => scrollY);
      for (const m of ['oscuro', 'claro', 'auto']) {
        await p.click(A.sel + ' [data-m=' + m + ']'); await p.waitForTimeout(1200);
        assert(Math.abs(await p.evaluate(() => scrollY) - y1) <= 2, app + ': modo ' + m + ' sin mover la pantalla');
        assert(await p.evaluate(() => window.__marca === 1), app + ': modo ' + m + ' sin recargar');
        assert(await p.locator(A.sel + ' [data-m=' + m + '].on').count() === 1, app + ': ' + m + ' marcado');
      }
      await p.locator(A.sel + ' .cfx-pf-cols > button:not(.on)').nth(2).click(); await p.waitForTimeout(1500);
      assert(Math.abs(await p.evaluate(() => scrollY) - y1) <= 2, app + ': color sin mover la pantalla');
      const altos = await p.$$eval(A.sel + ' .cfx-pf-modos button', (b) => b.map((x) => x.getBoundingClientRect().height));
      assert(altos.every((h) => h < 90), app + ': botones de modo en una línea (' + altos.map(Math.round) + ')');
      await t.foto(app + '-quieto');
      await p.click(A.sel + ' .cfx-aj-volver'); await p.waitForTimeout(500);
      const top2 = await p.evaluate((s) => document.querySelector(s).getBoundingClientRect().top, A.sel);
      assert(top2 > -5 && top2 < 500, app + ': al volver no salta arriba');
    } catch (e) { console.log(e.message); await t.foto(app + '-quieto-error'); }
    console.log(app + ' ERRORES:', t.errores.filter((e) => !/404/.test(e)).join('\n') || 'ninguno');
    await t.cerrar();
  }
})();
