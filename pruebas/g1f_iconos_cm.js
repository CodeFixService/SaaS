// 1f · CM → Apps: los íconos que no están en la lista propia del CM (shared/app.js) se toman del núcleo (iconos.js).
// Antes "Respaldar todas" (bajar) y "Respaldo y limpieza" (escoba) salían sin ícono. FALLA con el código viejo.
// Uso: ./base.sh /home/user/saas g1f_cm && ANCHO=320 node g1f_iconos_cm.js
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  const t = await abrir('/home/user/saas', 'g1f_cm'); const p = t.page;
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    await p.emulateMedia({ colorScheme: 'dark' }); await p.goto(t.base + '/'); await p.waitForTimeout(800);
    await p.fill('input[type=email]', 'juanjosuecastilloloyola@gmail.com'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(2500); await t.sinModales();
    const r = await p.evaluate(() => ({ res: document.querySelector('#resTodo svg').childElementCount, esc: (window.App.ico('escoba', 15).match(/<path|<circle|<rect/g) || []).length,
      no: window.App.ico('noexiste', 15).includes('<path') }));
    assert(r.res > 0 && r.esc > 0 && !r.no, 'Respaldar todas y 🧹 con ícono del núcleo; nombre inexistente sigue vacío ' + JSON.stringify(r));
    await p.locator('.btns-s').first().screenshot({ path: 'capturas/saas/g1f_iconos.png' });
  } finally { await t.cerrar(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
