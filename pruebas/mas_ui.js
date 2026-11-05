// U10: el + del teléfono debe partir con su color final y centrado desde la primera carga (no blanco ni corrido).
// Uso: node mas_ui.js [app…]   Mide el + apenas aparece y otra vez a los 3 s; si cambia color o posición, falla.
const { abrir } = require('./h');
const fs = require('fs');
const s = fs.readFileSync(__dirname + '/legal_ui.js', 'utf8');
const CUENTAS = new Function('return (() => {' + s.slice(s.indexOf('const APPS'), s.indexOf('(async () =>')) + '; return APPS; })()')();
const TODAS = Object.keys(CUENTAS);
const MEDIR = () => {
  const m = document.querySelector('nav.cfx-barra > .cfx-mas'); if (!m) return null;
  const c = m.querySelector(':scope > :first-child') || m; const r = c.getBoundingClientRect(); const nr = m.getBoundingClientRect();
  return { bg: getComputedStyle(c).backgroundColor, ink: getComputedStyle(c).color, cx: Math.round(r.left + r.width / 2), ncx: Math.round(nr.left + nr.width / 2), w: Math.round(r.width) };
};
(async () => {
  const pedidas = process.argv.slice(2); let fallas = 0;
  for (const app of TODAS) {
    if (pedidas.length && !pedidas.includes(app)) continue;
    require('child_process').execSync(__dirname + '/base.sh /home/user/' + app, { stdio: 'ignore' });
    const t = await abrir('/home/user/' + app, CUENTAS[app].db); const malos = [];
    try {
      const { page: p } = await t.nuevo(); const c = await CUENTAS[app].cuenta(t);
      await p.goto(t.base + c.url); await p.waitForTimeout(1200); if (c.sel) { await p.click(c.sel).catch(() => {}); await p.waitForTimeout(300); }
      await p.fill('input[type=email]:visible', c.email); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
      await p.waitForSelector('nav.cfx-barra > .cfx-mas', { timeout: 12000 });
      const a = await p.evaluate(MEDIR); await p.waitForTimeout(3000); const b = await p.evaluate(MEDIR);
      if (!a || !b) malos.push('sin +');
      else {
        if (a.bg !== b.bg || a.ink !== b.ink) malos.push('cambia de color ' + a.bg + '/' + a.ink + ' → ' + b.bg + '/' + b.ink);
        if (Math.abs(a.cx - a.ncx) > 2 || Math.abs(a.cx - b.cx) > 2) malos.push('descentrado ' + JSON.stringify([a, b]));
        if (/255, 255, 255/.test(b.bg)) malos.push('+ blanco');
      }
      await t.foto('mas', p);
    } catch (x) { malos.push(x.message.slice(0, 200)); }
    console.log((malos.length ? '✗ ' : '✓ ') + app + (malos.length ? ': ' + malos.join(' · ') : ''));
    if (malos.length) fallas++;
    await t.cerrar();
  }
  process.exit(fallas ? 1 : 0);
})();
