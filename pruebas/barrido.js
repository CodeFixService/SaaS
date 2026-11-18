// 🧹 Barrido largo (18/11): 🐞 4.º aviso con el más viejo saliendo colgaba la página (cm_apps.js tras el Excel) · 🐞 comprobante sin estilo en Estaciona.
// Falla con el código viejo. Uso: node barrido.js
const { abrir } = require('./h');
const ok = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const to = (pr, ms) => Promise.race([pr.then(() => true, () => true), new Promise((r) => setTimeout(() => r(false), ms))]);
(async () => {
  const t = await abrir('/home/user/estacionamiento', 'p_estacionamiento');
  const p = t.page;
  try {
    await p.goto(t.base + '/'); await p.waitForTimeout(1500);
    // 1) Avisos: 3 en pantalla, el 1.º empieza a salir y llega un 4.º → antes: while sin fin
    await p.evaluate(() => { CFX_AVISO('uno'); CFX_AVISO('dos'); CFX_AVISO('tres'); document.querySelector('.cfx-tsts').firstElementChild._cerrar(); setTimeout(() => CFX_AVISO('cuatro'), 0); });
    await p.waitForTimeout(100);
    ok(await to(p.evaluate(() => 1), 4000), '🐞 4.º aviso con uno saliendo no cuelga la página');
    ok(await p.evaluate(() => document.querySelectorAll('.cfx-tsts > div').length) <= 3, 'quedan máximo 3 avisos');
    // 2) Comprobante en Estaciona: botones con estilo (antes: botón gris de Chrome, la app usa .btn)
    await p.evaluate(() => new Promise((r) => { const s = document.createElement('script'); s.src = 'js/comprobante.js'; s.onload = r; document.head.appendChild(s); }));
    await p.evaluate(() => CFX_COMPROBANTE.abrir({ negocio: 'Estaciona', fecha: new Date().toISOString(), numero: 1, items: [{ cant: 1, nombre: 'Premium', precio: 2990 }], total: 2990, medio: 'mp' }));
    await p.waitForTimeout(500);
    const est = await p.evaluate(() => [...document.querySelectorAll('.cfx-comp button')].map((b) => { const c = getComputedStyle(b); return { t: b.textContent.trim().slice(0, 30), alto: b.offsetHeight, radio: parseFloat(c.borderRadius), fondo: c.backgroundColor }; }));
    const copiar = est.find((x) => /Copiar/.test(x.t)), wsp = est.find((x) => /WhatsApp/.test(x.t));
    ok(copiar && copiar.alto >= 40 && copiar.radio >= 8, '🧾 botón Copiar con estilo ' + JSON.stringify(copiar));
    ok(wsp && /22, 163, 74|rgb\(22/.test(wsp.fondo), '🧾 WhatsApp en verde ' + JSON.stringify(wsp));
    for (const tema of ['light', 'dark']) { await p.emulateMedia({ colorScheme: tema }); await p.waitForTimeout(200); await t.foto('comprobante-' + tema); }
    ok(await t.anchoOk(), 'ancho 360');
  } catch (e) { console.log(e.message); }
  console.log('ERRORES:', t.errores.filter((x) => !/raw\.githubusercontent|Failed to load resource|ERR_|db_version/.test(x)).join('\n') || 'ninguno');
  process.exit(0);
})();
