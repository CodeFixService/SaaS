// G42a/b/c/k · Núcleo universal en el CM: Ajustes → ✋ ordenar opciones (queda al recargar), 🪟 ✕ + Cerrar, ⬆️ subir. FALLA con el código viejo.
// Uso: ./base.sh /home/user/saas g42_cm && ANCHO=320 node g42_nucleo_cm.js
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const ADM = 'juanjosuecastilloloyola@gmail.com';
(async () => {
  const t = await abrir('/home/user/saas', process.env.BD || 'g42_cm'); const p = t.page;
  const filas = () => p.evaluate(() => [...document.querySelectorAll('#v-ajustes .cfx-aj [data-k], #ajustes .cfx-aj [data-k]')].filter((x) => x.getClientRects().length).map((x) => x.dataset.k));
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    await p.goto(t.base + '/'); await p.fill('input[type=email]', ADM); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800);
    await p.goto(t.base + '/admin/#ajustes'); await p.waitForTimeout(2500); await t.sinModales();
    const f0 = await filas();
    assert(f0.length >= 4 && await p.locator('[data-cfx-orden] > [data-k]').count() >= 4, 'Ajustes con opciones ordenables ' + f0.join(','));
    const ult = p.locator('.cfx-aj [data-k=' + f0[f0.length - 1] + ']'), pri = p.locator('.cfx-aj [data-k=' + f0[0] + ']');
    await ult.scrollIntoViewIfNeeded(); const u = await ult.boundingBox(), a = await pri.boundingBox();
    await p.mouse.move(u.x + 30, u.y + u.height / 2); await p.mouse.down(); await p.waitForTimeout(650);
    for (let i = 1; i <= 10; i++) { await p.mouse.move(u.x + 30, u.y + u.height / 2 - (u.y - a.y + 10) * i / 10); await p.waitForTimeout(40); }
    await p.mouse.up(); await p.waitForTimeout(400);
    assert(!(await p.locator('.cfx-hoja-m').count()), 'Soltar no abre la opción');
    await p.reload(); await p.waitForTimeout(2500); await t.sinModales();
    const f1 = await filas();
    assert(f1[0] === f0[f0.length - 1], 'Tras recargar: ' + f0[f0.length - 1] + ' quedó primero → ' + f1.join(','));
    await p.click('.cfx-aj [data-k=generales]'); await p.waitForTimeout(1200);
    const v = await p.evaluate(() => { const d = document.querySelector('.cfx-hoja-m'); return { x: !!d.querySelector('.cfx-hm-cab .cfx-hm-x'), c: !!d.querySelector('.cfx-hm-zona > .cfx-hm-pie:last-child .cfx-hm-cerrar') }; });
    assert(v.x && v.c, '🪟 Ajustes generales: ✕ arriba y Cerrar abajo');
    await t.foto('g42_cm_ventana');
    await p.click('.cfx-hm-cerrar'); await p.waitForTimeout(500);
    assert(!(await p.locator('.cfx-hoja-m').count()), 'Cerrar cierra');
    await p.goto(t.base + '/admin/#resumen'); await p.waitForTimeout(2500); await t.sinModales();
    await p.evaluate(() => { const e = document.createElement('div'); e.style.height = '300vh'; document.querySelector('main').appendChild(e); scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.5); });
    await p.waitForTimeout(500);
    assert(await p.locator('.cfx-subir.on').isVisible(), '⬆️ Aparece al bajar');
    await p.click('.cfx-subir'); await p.waitForTimeout(1200);
    assert(await p.evaluate(() => scrollY) < 5, '⬆️ Sube');
    assert(await t.anchoOk(), 'Sin salirse en ' + (process.env.ANCHO || 'normal'));
    const err = t.errores.filter((e) => !/ERR_TUNNEL|ERR_|status of 404/.test(e)); assert(!err.length, 'Sin errores ' + err.join(' | '));
  } catch (e) { console.log(e.message); await t.foto('error_cm'); }
  await t.cerrar();
})();
