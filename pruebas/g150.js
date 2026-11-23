// G150 · 📌 Los títulos YA NO se quedan fijos: bajan con la página (como vienen de fábrica). 🔔 El aviso emergente sigue bajo la barra.
// Recorre cada pestaña del menú de las 6 apps: ningún título es sticky/fixed ni lleva .cfx-fijo; al bajar, el título sube lo mismo que la página.
// Uso: ANCHO=320 node g150.js [cm despega barberia billetera bicitaller estaciona]
const { abrir } = require('./h'); const { APPS, entrar, execSync } = require('./apps6');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  const pedidas = process.argv.slice(2);
  for (const [n, [repo, db, prep]] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(n)) continue;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db);
    try {
      const [url, email, sel, tab] = await prep(t); const p = t.page;
      await entrar(p, t.base, url, email, 'clave123', sel, tab); await t.sinModales(p);
      const nNav = await p.evaluate(() => document.querySelectorAll('nav.cfx-barra > :is(a,button):not(.cfx-mas)').length);
      let titulos = 0, fijos = [], quietos = [], movidos = 0, pantallas = 0;
      for (let i = -1; i < nNav; i++) {
        if (i >= 0) { await p.evaluate((i) => { scrollTo(0, 0); document.querySelectorAll('nav.cfx-barra > :is(a,button):not(.cfx-mas)')[i].click(); }, i); await p.waitForTimeout(1500); await t.sinModales(p); }
        await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 0); }); await p.waitForTimeout(700);
        pantallas++;
        const r = await p.evaluate(async () => {
          const L = [...document.querySelectorAll('h1, h2, h3, .cfx-aj-g, .cfx-mm-cab')].filter((s) => s.getClientRects().length && !s.closest('dialog, header, .cfx-pila'));
          const malos = L.filter((s) => s.classList.contains('cfx-fijo') || /sticky|fixed/.test(getComputedStyle(s).position) || (s.parentElement && s.parentElement.classList.contains('cfx-fijo'))).map((s) => s.textContent.trim().slice(0, 25));
          // Alargar la página y bajar 200 px: el primer título debe subir 200 px (no quedarse pegado).
          const enVentana = (x) => { for (let y = x.parentElement; y && y !== document.body; y = y.parentElement) if (getComputedStyle(y).position === 'fixed') return true; return false; };
          const s = L.find((x) => !x.closest('.cfx-hm-zona') && !enVentana(x));  // título de una ventana: la ventana está quieta, no se mide
          if (!s) return { n: L.length, malos, d: null };
          const r = document.createElement('div'); r.style.height = '2000px'; r.dataset.g150 = ''; document.body.appendChild(r);
          const a = s.getBoundingClientRect().top; scrollBy(0, 200); await new Promise((z) => setTimeout(z, 500));
          const d = Math.round(a - s.getBoundingClientRect().top); r.remove(); scrollTo(0, 0);
          return { n: L.length, malos, d, tx: s.textContent.trim().slice(0, 25) };
        });
        titulos += r.n; fijos.push(...r.malos);
        if (r.d != null) { if (Math.abs(r.d - 200) <= 2) movidos++; else quietos.push(r.tx + ' subió ' + r.d); }
      }
      ok(titulos >= 2, n + ': títulos revisados en ' + pantallas + ' pantallas → ' + titulos);
      ok(!fijos.length, n + ': ningún título fijo' + (fijos.length ? ' → ' + fijos.slice(0, 4).join(' · ') : ''));
      ok(movidos > 0 && !quietos.length, n + ': al bajar, los títulos se van con la página (' + movidos + ')' + (quietos.length ? ' → ' + quietos.join(' · ') : ''));
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
      const e = await p.evaluate(async () => { window.CFX_ANIM.emergente({ titulo: 'Nuevo pedido', cuerpo: 'Prueba' }); await new Promise((r) => setTimeout(r, 500));
        const h = document.querySelector('.cfx-cab'); const hb = h ? Math.round((h.closest('header') || h).getBoundingClientRect().bottom) : 0;
        return { y: Math.round(document.querySelector('.cfx-emerg').getBoundingClientRect().top), hb }; });
      ok(e.hb > 0 && e.y >= e.hb, n + ': el aviso baja debajo de la barra (aviso y=' + e.y + ', barra hasta ' + e.hb + ')');
      if (n === 'despega' || n === 'cm') await t.foto('g150-' + n);
    } catch (e) { ok(false, n + ': ' + e.message.split('\n')[0]); }
    await t.cerrar();
  }
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
