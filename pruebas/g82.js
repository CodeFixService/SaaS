// G82 · Menús que se deslizan al lado (CM → Más → Control: Negocios · Avisar · … · Registro) = PESTAÑAS, distintas de chips/botones.
// FALLA con el código viejo (sin .cfx-tira-pest: la tira se ve igual que el selector de app).
// Uso: ANCHO=320 node g82.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
(async () => {
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  execSync(__dirname + '/base.sh /home/user/saas p_g82', { stdio: 'ignore' });
  const t = await abrir('/home/user/saas', 'p_g82'); const p = t.page;
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    await p.goto(t.base + '/'); await p.fill('input[type=email]', 'juanjosuecastilloloyola@gmail.com'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800); await t.sinModales();
    for (const modo of ['light', 'dark']) {
      await p.emulateMedia({ colorScheme: modo });
      await p.goto(t.base + '/admin/#control'); await p.waitForTimeout(4000); await t.sinModales();
      await p.click('[data-s=seguridad]'); await p.waitForTimeout(1500);
      const r = await p.evaluate(() => {
        const tira = document.querySelector('.chips [data-s]').parentElement, sel = document.querySelector('[data-app]').parentElement;
        const on = tira.querySelector('.on'), off = tira.querySelector('[data-s]:not(.on)'), cs = (e) => getComputedStyle(e);
        const vis = on.getBoundingClientRect(), tr = tira.getBoundingClientRect();
        return { pest: tira.classList.contains('cfx-tira-pest'), selPest: sel.classList.contains('cfx-tira-pest'), fondoTira: cs(tira).backgroundColor,
          offFondo: cs(off).backgroundColor, offBorde: cs(off).borderTopWidth, onFondo: cs(on).backgroundColor, onSombra: /inset/.test(cs(on).boxShadow),
          selFondo: cs(sel.querySelector('button')).backgroundColor, onVisible: vis.left >= tr.left - 1 && vis.right <= tr.right + 1,
          ancho: document.documentElement.scrollWidth <= innerWidth + 1 };
      });
      ok(r.pest && !r.selPest, modo + ': la tira de secciones es pestaña y el selector de app sigue como chips ' + JSON.stringify({ p: r.pest, s: r.selPest }));
      ok(r.offFondo === 'rgba(0, 0, 0, 0)' && r.offBorde === '0px' && r.onSombra && r.onFondo !== r.offFondo && r.fondoTira !== 'rgba(0, 0, 0, 0)', modo + ': banda con fondo, opciones sin borde, elegida con subrayado ' + JSON.stringify(r));
      ok(r.onVisible && r.ancho, modo + ': la pestaña elegida (Seguridad) se ve y no hay desborde');
      await t.foto('g82-control-' + modo);
    }
  } catch (e) { console.log('✗ ' + e.message); f++; }
  await t.cerrar(); console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
