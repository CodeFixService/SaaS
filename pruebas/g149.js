// G149 · 📌 Todos los títulos se quedan fijos al llegar a la barra de arriba (sin correr nada) + 🔔 el aviso emergente baja DEBAJO de la barra.
// Recorre cada pestaña del menú de las 6 apps: cuenta títulos fijos, revisa que no se corran, baja hasta pegar uno y lo mide; luego lanza un aviso.
// Uso: ANCHO=320 node g149.js [cm despega barberia billetera bicitaller estaciona]
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
      let mmVisto = false, mmFijo = false, fijos = 0, corridos = [], pegoBien = 0, pegoMal = [], pantallas = 0;
      for (let i = -1; i < nNav; i++) {
        if (i >= 0) { await p.evaluate((i) => { scrollTo(0, 0); document.querySelectorAll('nav.cfx-barra > :is(a,button):not(.cfx-mas)')[i].click(); }, i); await p.waitForTimeout(1500); await t.sinModales(p); }
        await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
        const r = await p.evaluate(() => {
          const L = [...document.querySelectorAll('.cfx-fijo')].filter((s) => s.getClientRects().length);
          // No se corre: mismo lugar con y sin la clase.
          const corr = [];
          L.forEach((s) => { if (s.classList.contains('cfx-pegado')) return; const c = s.parentElement, a = s.getBoundingClientRect().top - c.getBoundingClientRect().top, ah = c.offsetHeight;
            const cl = s.className; s.classList.remove('cfx-fijo', 'cfx-fijo-fila'); const b = s.getBoundingClientRect().top - c.getBoundingClientRect().top, bh = c.offsetHeight; s.className = cl;
            if (Math.abs(a - b) > 1.5 || Math.abs(ah - bh) > 1.5) corr.push(s.textContent.trim().slice(0, 25) + ' Δ' + Math.round(a - b) + '/' + Math.round(ah - bh)); });
          return { n: L.length, corr, hash: location.hash };
        });
        pantallas++; fijos += r.n; corridos.push(...r.corr);
        const mm = await p.evaluate(() => { const c = [...document.querySelectorAll('.cfx-mm-cab')].find((x) => x.getClientRects().length); return c ? c.classList.contains('cfx-fijo') : null; });
        if (mm !== null) { mmVisto = true; mmFijo = mm; }
        // Bajar hasta que el primer título fijo de la página (caja con espacio) llegue a la barra.
        const m = await p.evaluate(async () => {
          const top = window.CFX_FIJO.arriba();
          const L = [...document.querySelectorAll('.cfx-fijo')].filter((s) => s.getClientRects().length && s._cfxOff != null && s.parentElement.offsetHeight - s._cfxOff - s.offsetHeight > 120);
          const s = L.find((s) => !s._cfxCaja) || L[0];
          if (!s) return 'sin';
          const z = s._cfxCaja, c = s.parentElement, baja = 60;
          document.documentElement.style.scrollBehavior = 'auto';
          // Lugar natural del título → justo sobre la barra (baja px más arriba): debe quedar pegado.
          const meta = (z ? Math.max(top, z.getBoundingClientRect().top + 8) : top + 8) - baja;
          const dy = c.getBoundingClientRect().top + s._cfxOff - meta;
          if (z) z.scrollTop += dy; else scrollBy(0, dy);
          await new Promise((r) => setTimeout(r, 450));
          if (Math.abs(c.getBoundingClientRect().top + s._cfxOff - meta) > 3) return null;  // no alcanza a bajar tanto
          const ref = z ? Math.max(top, z.getBoundingClientRect().top + 8) : top + 8;
          return { tx: s.textContent.trim().slice(0, 25), y: Math.round(s.getBoundingClientRect().top), top: Math.round(ref), peg: s.classList.contains('cfx-pegado') };
        });
        if (m === 'sin' && !pegoBien) {  // cuenta nueva con poco contenido: se alarga la caja del primer título fijo para poder bajar
          const hay = await p.evaluate(() => { const s = [...document.querySelectorAll('.cfx-fijo')].find((x) => x.getClientRects().length); if (!s) return false;
            const r = document.createElement('div'); r.style.height = '1600px'; r.dataset.g149 = ''; s.parentElement.appendChild(r); return true; });
          if (hay) { await p.waitForTimeout(700); i--; pantallas--; fijos -= r.n; continue; }
        }
        if (m && m !== 'sin') { if (Math.abs(m.y - m.top) <= 2 && m.peg) pegoBien++; else pegoMal.push(m.tx + ' y=' + m.y + ' barra=' + m.top + ' peg=' + m.peg); if (pantallas <= 3) await t.foto('g149-' + n + '-' + pantallas); }
      }
      ok(fijos >= 2, n + ': títulos fijos en ' + pantallas + ' pantallas → ' + fijos);
      ok(!corridos.length, n + ': nada se corre al fijarlos' + (corridos.length ? ' → ' + corridos.slice(0, 4).join(' · ') : ''));
      ok(pegoBien > 0 && !pegoMal.length, n + ': al bajar se pegan justo bajo la barra (' + pegoBien + ')' + (pegoMal.length ? ' → ' + pegoMal.join(' · ') : ''));
      // ☰ Más: la fila de pestañas (categorías) se queda fija arriba.
      ok(mmVisto && mmFijo, n + ': ☰ Más: pestañas fijas' + (mmVisto ? '' : ' (no se vio el Más)'));
      // 🔔 Aviso emergente: debajo de la barra de arriba.
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
      const e = await p.evaluate(async () => { window.CFX_ANIM.emergente({ titulo: 'Nuevo pedido', cuerpo: 'Prueba' }); await new Promise((r) => setTimeout(r, 500));
        const h = document.querySelector('.cfx-cab'); const hb = h ? Math.round((h.closest('header') || h).getBoundingClientRect().bottom) : 0;
        return { y: Math.round(document.querySelector('.cfx-emerg').getBoundingClientRect().top), hb }; });
      await t.foto('g149-' + n + '-aviso');
      ok(e.hb > 0 && e.y >= e.hb, n + ': el aviso baja debajo de la barra (aviso y=' + e.y + ', barra hasta ' + e.hb + ')');
    } catch (e) { ok(false, n + ': ' + e.message.split('\n')[0]); }
    await t.cerrar();
  }
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
