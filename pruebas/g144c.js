// G144 c · 🎨 SOLO íconos de línea (iconos.js): barrido de las 6 apps (inicio + menú Más) buscando emojis sueltos que quedaron a color
// y botones/insignias redondos estirados (G144 b: círculo perfecto). Uso: ANCHO=360 node g144c.js [app…]
const { abrir } = require('./h'); const { APPS, entrar, execSync } = require('./apps6');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const barrer = (p) => p.evaluate(() => {
  const FUERA = '.no-ico, [data-emoji], textarea, input, select, option, code, pre, [contenteditable], .logo-mini, .logo, .avatar, .app-ico, .emoji, .chat, .mensajes, .burbuja, .msg, .lp-tel, svg, script, style, noscript, .cfx-emoji-ok';
  const RE = /(\p{Extended_Pictographic})/u, emo = [], est = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const e = n.parentElement; if (!e || !RE.test(n.nodeValue) || e.closest(FUERA)) continue;
    const r = e.getBoundingClientRect(); if (!r.width || !e.offsetParent && getComputedStyle(e).position !== 'fixed') continue;
    const m = n.nodeValue.match(/\p{Extended_Pictographic}/gu).filter((c) => !/[©®™↔↕▶◀☑✔✖➕➖➗✳✴❇‼⁉〰〽]/.test(c));
    if (m.length) emo.push(m.join('') + ' «' + (e.textContent || '').trim().slice(0, 30) + '» <' + e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + '>');
  }
  document.querySelectorAll('button, a, span, i, b, div').forEach((e) => {
    const r = e.getBoundingClientRect(); if (!r.width || r.width > 64 || r.height > 64 || r.width < 14 || r.height < 14 || !e.offsetParent) return;
    const cs = getComputedStyle(e), rad = parseFloat(cs.borderTopLeftRadius); if (!rad) return;
    const redondo = cs.borderTopLeftRadius.endsWith('%') ? rad >= 50 : rad >= Math.min(r.width, r.height) / 2 - 0.5;
    const tx = (e.textContent || '').trim().replace(/\p{Extended_Pictographic}|\uFE0F/gu, ''), conTexto = tx.length > 2 || /\p{L}{2}/u.test(tx);
    const visible = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0;
    if (redondo && visible && !conTexto && Math.abs(r.width - r.height) > 2) est.push(Math.round(r.width) + 'x' + Math.round(r.height) + ' <' + e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + '> ' + (e.getAttribute('aria-label') || e.textContent.trim().slice(0, 12)));
  });
  return { emo: [...new Set(emo)], est: [...new Set(est)] };
});
(async () => {
  const pedidas = process.argv.slice(2);
  for (const [n, [repo, db, prep]] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(n)) continue;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db);
    try {
      const [url, email, sel, tab] = await prep(t); const p = t.page;
      await entrar(p, t.base, url, email, 'clave123', sel, tab); await t.sinModales(p);
      // Recorre cada pestaña de la barra de abajo y al final el menú Más.
      const tabs = await p.evaluate(() => [...document.querySelectorAll('nav.cfx-barra > a, nav.cfx-barra > button')].filter((b) => b.offsetParent).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean));
      const R = [await barrer(p)];
      for (const tx of tabs) {
        await t.sinModales(p).catch(() => {}); await p.locator('nav.cfx-barra > :is(a,button)', { hasText: tx }).first().click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(1200);
        R.push(await barrer(p)); await p.screenshot({ path: __dirname + '/capturas/g144c-' + n + '-' + tx.replace(/\W+/g, '') + '.png' });
        await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(300);
      }
      const a = { emo: R.flatMap((x) => x.emo), est: R.flatMap((x) => x.est) }, b = { emo: [], est: [] };
      const emo = [...new Set(a.emo.concat(b.emo))], est = [...new Set(a.est.concat(b.est))];
      ok(!emo.length, n + ': sin emojis a color sueltos' + (emo.length ? ' → ' + emo.slice(0, 12).join(' | ') : ''));
      ok(!est.length, n + ': redondos = círculo perfecto' + (est.length ? ' → ' + est.slice(0, 10).join(' | ') : ''));
    } catch (e) { ok(false, n + ': ' + e.message.split('\n')[0]); }
    await t.cerrar();
  }
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
