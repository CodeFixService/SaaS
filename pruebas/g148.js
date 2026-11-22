// G148 · 🙂 Perfiles sin ícono: en las 6 apps "Foto y nombre" ya no ofrece íconos y el círculo muestra la foto o la LETRA del nombre.
// También las fichas propias de cada app (Barbería C.avatar, Estaciona U.avatar, Billetera LC.iniciales, Despega #avatar).
// Uso: ANCHO=320 node g148.js [cm despega barberia billetera bicitaller estaciona]
const { abrir } = require('./h'); const { APPS, entrar, execSync } = require('./apps6');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const EMO = /\p{Extended_Pictographic}/u;
const PROPIO = {
  barberia: () => window.Core.avatar({ nombre: 'rodrigo', avatar: '😎' }).replace(/<[^>]+>/g, ''),
  estaciona: () => window.U.avatar({ nombre: 'beto', icono: '🚗' }).replace(/<[^>]+>/g, ''),
  billetera: () => window.LC.iniciales('Ana María'),
  despega: () => document.getElementById('avatar').textContent,
};
(async () => {
  const pedidas = process.argv.slice(2);
  for (const [n, [repo, db, prep]] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(n)) continue;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db);
    try {
      const [url, email, sel, tab] = await prep(t); const p = t.page;
      await entrar(p, t.base, url, email, 'clave123', sel, tab); await t.sinModales(p);
      if (n === 'despega') await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('cfx:cuenta') || 'null'); for (const k of Object.keys(localStorage)) if (k.startsWith('cfx:icono:')) localStorage.setItem(k, '🦊'); });
      await p.evaluate(() => window.CFX_PERFIL.abrir()); await p.waitForTimeout(900);
      await p.locator('.cfx-hoja-m').first().locator('.cfx-aj > .cfx-fila').first().evaluate((b) => b.click()); await p.waitForTimeout(900);
      const r = await p.evaluate(() => {
        const h = [...document.querySelectorAll('.cfx-hoja-m')].pop();
        return { icos: h.querySelectorAll('[data-ico], .cfx-pf-icos').length, txt: h.innerText, av: [...h.querySelectorAll('.cfx-pf-av')].map((a) => a.querySelector('img') ? 'IMG' : a.textContent.trim()) };
      });
      await t.foto('g148-' + n);
      ok(!r.icos && !/Tu ícono/.test(r.txt), n + ': "Foto y nombre" sin elegir ícono');
      ok(r.av.length && r.av.every((a) => a === 'IMG' || /^\p{L}$/u.test(a)), n + ': el círculo muestra foto o 1 letra → ' + r.av.join(' '));
      if (n === 'despega') await p.goto(t.base + '/#home').then(() => p.waitForTimeout(1500));
      if (PROPIO[n]) { const v = (await p.evaluate(PROPIO[n])).trim(); ok(/^\p{L}$/u.test(v) && !EMO.test(v), n + ': ficha propia de la app = letra → ' + v); }
    } catch (e) { ok(false, n + ': ' + e.message.split('\n')[0]); }
    await t.cerrar();
  }
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
