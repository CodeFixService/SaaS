// G126: menú de páginas (☰ Más): el vertical diagonal sobre el menú baja la pantalla; deslizar de lado bajo los puntitos cambia de página (sin cambiar de pantalla).
const D = __dirname + '/';
const g = require('fs').readFileSync(D + 'g66.js', 'utf8');
const APPS = eval(g.slice(g.indexOf('const APPS ='), g.indexOf('(async () =>')).replace('const APPS =', '(').replace(/;\s*$/, ')'));
const { abrir } = require(D + 'h'); const { execSync } = require('child_process');
const entrar = async (p, base, url, email, pass, sel, tab) => {
  await p.goto(base + url); await p.waitForTimeout(1500); if (tab) { await p.click(tab); await p.waitForTimeout(300); }
  const e = sel ? sel[0] : 'input[type=email]:visible', c = sel ? sel[1] : 'input[type=password]:visible';
  await p.fill(e, email); await p.fill(c, pass); await p.press(c, 'Enter'); await p.waitForTimeout(3500);
};
async function swipe(cdp, x0, y0, x1, y1) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / 12, y: y0 + (y1 - y0) * i / 12 }] }); await new Promise((r) => setTimeout(r, 16)); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
let malos = 0; const ok = (t, v) => { console.log((v ? '✅ ' : '❌ ') + t); if (!v) malos++; };
(async () => {
  const L = process.argv.slice(2); for (const n of (L.length ? L : ['despega', 'barberia', 'billetera', 'cm'])) {
    if (!APPS[n]) continue;
    const [repo, db, prep] = APPS[n];
    execSync(D + 'base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db, { tactil: true });
    try {
      const [url, email, sel, tab] = await prep(t); const p = t.page;
      await entrar(p, t.base, url, email, 'clave123', sel, tab); await t.sinModales(p);
      await p.evaluate(() => { const L = [...document.querySelectorAll('nav.cfx-barra > *')].filter((b) => b.offsetParent); L[L.length - 1].click(); }); await p.waitForTimeout(1200);
      const cdp = await p.context().newCDPSession(p);
      const est = () => p.evaluate(() => { const P = [...document.querySelectorAll('.cfx-mm-pags')].find((x) => x.offsetParent); if (!P) return null;
        const sc = (e) => { for (let x = P.parentElement; x; x = x.parentElement) if (x.scrollHeight > x.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(x).overflowY)) return x; return document.scrollingElement; };
        const s = sc(); const r = P.getBoundingClientRect(), pt = document.querySelector('.cfx-mm-pts').getBoundingClientRect();
        return { top: s.scrollTop, cont: s.className || s.tagName, pag: Math.round(P.scrollLeft / P.clientWidth), pr: [r.top, r.bottom, r.height].map(Math.round), pts: Math.round(pt.bottom), alto: innerHeight, sh: s.scrollHeight, ch: s.clientHeight }; });
      for (let i = 0; i < 9 && await p.locator('.cfx-tour [data-t=x]').count(); i++) { await p.click('.cfx-tour [data-t=x]'); await p.waitForTimeout(400); }  // el tour de bienvenida no es parte de esta prueba  // el tour de bienvenida no es parte de esta prueba
      let a = await est(); if (!a) { console.log(n, 'sin menú de páginas'); continue; }
      const h0 = await p.evaluate(() => location.hash + location.pathname);
      const y = Math.min(a.pr[1] - 30, 600);
      await swipe(cdp, 160, y, 200, y - 200); await p.waitForTimeout(800);   // dedo real: algo diagonal
      let b = await est(); const bajo = b.top - a.top;
      ok(n + ' diagonal sobre el menú baja la pantalla (' + bajo + ' px) y no cambia de página', bajo >= Math.min(60, a.sh - a.ch - 5) && b.pag === a.pag);
      await p.evaluate(() => { document.scrollingElement.scrollTop = 0; }); await p.waitForTimeout(600);
      a = await est();
      const barra = await p.evaluate(() => { const b = document.querySelector('nav.cfx-barra'); return b && b.getClientRects().length ? Math.round(b.getBoundingClientRect().top) : innerHeight; });
      const yv = Math.round((a.pts + barra) / 2); if (barra - a.pts < 16) { console.log('ℹ️ ' + n + ': sin espacio bajo los puntitos'); continue; }
      await swipe(cdp, 300, yv, 80, yv + 6); await p.waitForTimeout(1000);
      b = await est(); const h1 = await p.evaluate(() => location.hash + location.pathname);
      ok(n + ' de lado bajo los puntitos (y=' + yv + ', puntitos ' + a.pts + ', barra ' + barra + ') pasa de página ' + a.pag + '→' + b.pag + ' sin cambiar de pantalla', b.pag === a.pag + 1 && h1 === h0);
      await swipe(cdp, 80, 400, 300, 404); await p.waitForTimeout(1000);
      const c = await est(); ok(n + ' de lado sobre el menú vuelve ' + b.pag + '→' + c.pag, c.pag === b.pag - 1);
      await t.foto('g126-' + n, p);
    } catch (e) { ok(n + ' ERROR ' + e.message.split('\n')[0], false); }
    await t.cerrar();
  }
  console.log(malos ? 'FALLAN ' + malos : 'TODO OK'); process.exit(malos ? 1 : 0);
})();
