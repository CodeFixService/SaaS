// U1-U3 (núcleo 2.31): micrófono que se apaga solo, barra de abajo que se esconde sola y cabecera con ☰ (sin PRO repetido).
// Uso: node u_ui.js [app…]   (voz en las 7 apps; barra y cabecera con sesión en CM, Billetera, Órbita, BiciTaller y Estaciona)
const { abrir } = require('./h');
const fs = require('fs');
const s = fs.readFileSync(__dirname + '/legal_ui.js', 'utf8');
const CUENTAS = new Function('return (() => {' + s.slice(s.indexOf('const APPS'), s.indexOf('(async () =>')) + '; return APPS; })()')();
const TODAS = ['saas', 'emprendedor', 'Aplicaciones', 'barberia', 'taller', 'estacionamiento', 'contenido'];
// Reconocimiento de voz falso: dice "hola mundo" y se queda callado (el navegador no termina solo: debe apagarlo el núcleo).
const VOZ_FALSA = () => {
  window.__voz = { paradas: 0 };
  window.webkitSpeechRecognition = function () {
    const r = this; r.start = () => { setTimeout(() => r.onresult && r.onresult({ results: [[{ transcript: 'hola mundo' }]] }), 300); };
    r.stop = () => { window.__voz.paradas++; setTimeout(() => r.onend && r.onend(), 50); }; r.abort = () => r.onend && r.onend();
  };
};
(async () => {
  const pedidas = process.argv.slice(2); let fallas = 0;
  for (const app of TODAS) {
    if (pedidas.length && !pedidas.includes(app)) continue;
    const db = 'p_' + app.toLowerCase();
    require('child_process').execSync(__dirname + '/base.sh /home/user/' + app, { stdio: 'ignore' });
    const t = await abrir('/home/user/' + app, db); const malos = [];
    try {
      await t.ctx.addInitScript(VOZ_FALSA);
      const { page: p } = await t.nuevo();
      const A = CUENTAS[app];
      if (A) {
        const c = await A.cuenta(t);
        await p.goto(t.base + c.url); await p.waitForTimeout(1200); if (c.sel) { await p.click(c.sel).catch(() => {}); await p.waitForTimeout(300); }
        await p.fill('input[type=email]:visible', c.email); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
        await p.waitForTimeout(2500);
        await p.check('dialog.cfx-ayuda[open] [data-ok]').catch(() => {}); await p.click('dialog.cfx-ayuda[open] [data-acepto]').catch(() => {});
        await p.waitForTimeout(800); await t.sinModales(p);
        // ---- U3 cabecera ----
        const cab = await p.evaluate(() => {
          const v = (x) => !!x && getComputedStyle(x).display !== 'none' && x.getClientRects().length > 0;
          const b = document.querySelector('.cfx-cab'); if (!b) return { sin: true };
          const av = b.querySelector('.cfx-av'), cam = b.querySelector('[data-cfx-campana]');
          return { plan: v(b.querySelector('.cfx-plan')), ham: v(b.querySelector('.cfx-ham')), av: av && Math.round(av.getBoundingClientRect().width), cam: cam && Math.round(cam.getBoundingClientRect().width),
            pro: [...document.querySelectorAll('header *, .cfx-cab *')].filter((x) => x.childElementCount === 0 && /^\s*PRO\s*$/.test(x.textContent) && v(x)).length };
        });
        if (cab.sin) malos.push('sin cabecera común');
        else {
          if (cab.plan || cab.pro) malos.push('PRO sigue arriba en el teléfono');
          if (!cab.ham) malos.push('falta ☰ en el teléfono');
          if (cab.av !== 32 || (cab.cam && cab.cam !== 32)) malos.push('foto/campana no miden 32: ' + cab.av + '/' + cab.cam);
          await p.click('.cfx-cab .cfx-ham'); await p.waitForTimeout(400);
          const txt = await p.locator('dialog.cfx-ayuda[open]').innerText().catch(() => '');
          if (!/Mi perfil/.test(txt) || !/Cerrar sesión/.test(txt)) malos.push('☰ no abre el menú: ' + txt.slice(0, 80));
          await t.foto('u-ham-' + app, p);
          await p.keyboard.press('Escape'); await p.waitForTimeout(300);
          await p.setViewportSize({ width: 1280, height: 800 }); await p.waitForTimeout(500);
          if (await p.evaluate(() => { const h = document.querySelector('.cfx-cab .cfx-ham'); return h && getComputedStyle(h).display !== 'none'; })) malos.push('☰ visible en PC');
          await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(500);
        }
        await t.foto('u-cab-' + app, p);
        // ---- U2 barra ----
        const nav = 'nav.cfx-barra';
        if (await p.locator(nav).count()) {
          await p.evaluate(() => CodeFixBarra.ver()); await p.waitForTimeout(300);
          if (await p.evaluate(() => document.querySelector('nav.cfx-barra').classList.contains('cfx-escondida'))) malos.push('barra escondida al cargar');
          await p.waitForTimeout(4800);
          if (!(await p.evaluate(() => document.querySelector('nav.cfx-barra').classList.contains('cfx-escondida')))) malos.push('la barra no se escondió sola');
          await p.click('.cfx-barra-asa').catch(() => malos.push('sin asa para mostrarla')); await p.waitForTimeout(400);
          if (await p.evaluate(() => document.querySelector('nav.cfx-barra').classList.contains('cfx-escondida'))) malos.push('el asa no la muestra');
          await p.evaluate(() => { location.hash = '#x' + Date.now(); }); await p.waitForTimeout(300);
          if (await p.evaluate(() => document.querySelector('nav.cfx-barra').classList.contains('cfx-escondida'))) malos.push('al navegar no aparece');
          await p.setViewportSize({ width: 1280, height: 800 }); await p.waitForTimeout(5000);
          if (await p.evaluate(() => document.querySelector('nav.cfx-barra').classList.contains('cfx-escondida'))) malos.push('se esconde en PC');
          await p.setViewportSize({ width: 360, height: 740 });
        } else malos.push('sin barra de abajo');
      } else { await p.goto(t.base + '/'); await p.waitForTimeout(1500); }
      // ---- U1 micrófono ----
      await p.evaluate(() => {
        const d = document.createElement('div'); d.id = 'uvoz'; d.style.cssText = 'position:fixed;top:80px;left:10px;right:10px;z-index:99999;background:#fff';
        d.innerHTML = '<input id="vT" type="text"><input id="vE" type="text" name="email"><input id="vN" type="text" inputmode="numeric"><input id="vF" type="text" name="telefono"><input id="vP" type="text" data-cfx-ojo="1"><input id="vC" type="password">';
        document.body.appendChild(d);
      });
      const mic = () => p.evaluate(() => { const b = document.querySelector('.cfx-voz'); return !!b && !b.hidden; });
      await p.focus('#vT'); await p.waitForTimeout(250);
      if (!(await mic())) malos.push('no aparece el micrófono en un texto');
      for (const id of ['vE', 'vN', 'vF', 'vP', 'vC']) { await p.focus('#' + id); await p.waitForTimeout(250); if (await mic()) malos.push('micrófono en ' + id); }
      await p.focus('#vT'); await p.waitForTimeout(3600);
      if (await mic()) malos.push('el micrófono no se escondió solo');
      await p.click('#vT'); await p.waitForTimeout(300);
      if (!(await mic())) malos.push('tocar el campo no lo vuelve a mostrar');
      await p.click('.cfx-voz'); await p.waitForTimeout(3500);
      const r = await p.evaluate(() => ({ v: document.getElementById('vT').value, on: !!document.querySelector('.cfx-voz.on'), paradas: window.__voz.paradas }));
      if (r.v !== 'hola mundo') malos.push('no dictó: ' + r.v);
      if (r.on || !r.paradas) malos.push('el dictado no se apagó solo al callar');
      await p.waitForTimeout(3500);
      if (await mic()) malos.push('el micrófono quedó pegado tras dictar');
      const e = t.errores.filter((x) => !/404|Failed to load resource|net::/.test(x)); if (e.length) malos.push('errores: ' + e.join(' | ').slice(0, 300));
    } catch (x) { malos.push(x.message.slice(0, 300)); }
    console.log((malos.length ? '✗ ' : '✓ ') + app + (malos.length ? ': ' + malos.join(' · ') : ': micrófono, barra y cabecera OK'));
    if (malos.length) fallas++;
    await t.cerrar();
  }
  console.log(fallas ? 'HAY FALLAS: ' + fallas : 'TODO OK'); process.exit(fallas ? 1 : 0);
})();
