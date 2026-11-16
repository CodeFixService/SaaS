// G75 · 👁️ ojito sin marco también en Ajustes → Avanzado (🔑 Cambiar contraseña). FALLA con el código viejo. Uso: node g75_ojo.js [ruta ayuda.js]
const { chromium } = require('playwright'); const fs = require('fs');
const N = '/home/user/SaaS/nucleo/', ay = process.argv[2] || N + 'ayuda.js';
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  await p.setContent('<html><head></head><body><div class="cfx-pf-w"><div class="cfx-pf"><div class="cfx-pf-caja"><input data-c1 type="password"><input data-c2 type="password"></div></div></div></body></html>');
  for (const f of [N + 'carga.js', ay]) await p.addScriptTag({ content: fs.readFileSync(f, 'utf8') }).catch((e) => console.log('aviso', f, e.message));
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => [...document.querySelectorAll('.cfx-ojo')].map((x) => { const s = getComputedStyle(x); return [s.borderTopWidth, s.backgroundColor, s.boxShadow, s.height, s.position, !!x.querySelector('svg')].join(' '); }));
  console.log(r); await b.close();
  const ok = r.length === 2 && r.every((x) => x === '0px rgba(0, 0, 0, 0) none 34px absolute true');
  console.log(ok ? 'ok Ojito sin marco en Cambiar contraseña' : 'FALLA: ojito con marco'); process.exit(ok ? 0 : 1);
})();
