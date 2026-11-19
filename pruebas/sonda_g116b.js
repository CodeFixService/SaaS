// Sonda G116 b: en cada app, qué hace "Más" de la barra y si el menú de Ajustes queda con alto 0.
const g = require('fs').readFileSync(__dirname + '/g66.js', 'utf8');
const APPS = eval(g.slice(g.indexOf('const APPS ='), g.indexOf('(async () =>')).replace('const APPS =', '(') .replace(/;\s*$/, ')'));
const { abrir } = require('./h'); const { execSync } = require('child_process');
const entrar = async (p, base, url, email, pass, sel, tab) => {
  await p.goto(base + url); await p.waitForTimeout(1500); if (tab) { await p.click(tab); await p.waitForTimeout(300); }
  const e = sel ? sel[0] : 'input[type=email]:visible', c = sel ? sel[1] : 'input[type=password]:visible';
  await p.fill(e, email); await p.fill(c, pass); await p.press(c, 'Enter'); await p.waitForTimeout(3500);
};
(async () => {
  const pedidas = process.argv.slice(2);
  for (const [n, [repo, db, prep]] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(n)) continue;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db, { tactil: true });
    try {
      const [url, email, sel, tab] = await prep(t); const p = t.page;
      await entrar(p, t.base, url, email, 'clave123', sel, tab); await t.sinModales(p);
      const info = await p.evaluate(() => ({ barra: [...document.querySelectorAll('nav.cfx-barra > *')].filter((b) => b.offsetParent).map((b) => (b.textContent || '').trim().slice(0, 12) + (b.classList.contains('cfx-menu') ? '[menu]' : '')),
        ocultos: [...document.querySelectorAll('nav.cfx-barra > .cfx-oculto')].map((b) => (b.textContent || '').trim().slice(0, 14)) }));
      await p.evaluate(() => { const L = [...document.querySelectorAll('nav.cfx-barra > *')].filter((b) => b.offsetParent); L[L.length - 1].click(); }); await p.waitForTimeout(1200);
      const r = await p.evaluate(() => { const h = document.querySelector('.cfx-hoja-m'); const P = [...document.querySelectorAll('.cfx-mm-pags')].find((x) => x.offsetParent);
        return { hoja: h ? [...h.querySelectorAll('button,a')].map((b) => b.textContent.trim().slice(0, 14)).join('|') : 'no', pags: P ? P.offsetHeight : '-', url: location.hash || location.pathname }; });
      console.log(n, JSON.stringify(info), JSON.stringify(r));
      await t.foto('g116b-' + n, p);
    } catch (e) { console.log(n, 'ERROR', e.message.split('\n')[0]); }
    await t.cerrar();
  }
  process.exit(0);
})();
