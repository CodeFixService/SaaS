// G158 · CM → Más → Ajustes como el ⚙️ Ajustes de las otras apps (secciones + Cuenta y ayuda) y 🐞 Reportar una falla desde el CM.
// Falla con código viejo: no había fila "Reportar una falla" en Ajustes del CM. Uso: ANCHO=384 node g158.js
const { abrir } = require('./h'); const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  execSync(__dirname + '/base.sh /home/user/saas p_g158', { stdio: 'ignore' });
  const t = await abrir('/home/user/saas', 'p_g158', { dialogosApp: true }); const p = t.page;
  try {
    await p.setViewportSize({ width: +(process.env.ANCHO || 384), height: 800 });
    const em = (await t.sim.su('select public.admin_email() e'))[0].e; await t.sim.crearUsuario(em, 'admin123');
    await p.goto(t.base + '/'); await p.waitForTimeout(800); await p.fill('input[type=email]:visible', em); await p.fill('input[type=password]:visible', 'admin123'); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(3000);
    await p.goto(t.base + '/admin/#ajustes'); await p.waitForTimeout(800); await p.reload(); await p.waitForTimeout(3000); await t.sinModales();
    const g = await p.$$eval('#v-ajustes .cfx-aj-g', (L) => L.map((x) => x.textContent.trim()));
    ok(g.join('|') === 'Centro de Mando|Configuración|Cuenta y ayuda', 'secciones como las otras apps: ' + g.join(' · '));
    ok(await p.locator('#v-ajustes [data-k="falla"]').count() === 1, 'fila 🐞 Reportar una falla');
    ok(await p.locator('#v-ajustes [data-k="salir"]').count() === 1 && await p.locator('#v-ajustes [data-k="reparar"]').count() === 1, 'Reparar la app y Cerrar sesión');
    ok(await t.anchoOk(), 'ancho sin scroll de lado');
    await p.click('#v-ajustes [data-k="generales"]'); await p.waitForTimeout(1200);
    ok(await p.locator('.cfx-hm-zona .card h3').count() === 2, 'Ajustes generales en 2 bloques');
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    await p.click('#v-ajustes [data-k="falla"]'); await p.waitForTimeout(1000);
    await p.fill('[data-t]:visible', 'Prueba desde el Centro de Mando'); await p.click('[data-enviar]'); await p.waitForTimeout(1500);
    const r = await t.sim.su("select count(*)::int n from public.cfx_fallas where texto = 'Prueba desde el Centro de Mando'");
    ok(r[0].n === 1, 'el reporte llega a cfx_fallas (CM → Mensajes → 🐞 Fallas)');
    ok(!t.errores.filter((e) => !/404/.test(e)).length, 'sin errores en consola');
  } catch (e) { console.error(e); f++; }
  await t.cerrar(); console.log(f ? '✗ ' + f + ' fallas' : '✓ G158 ok'); process.exit(f ? 1 : 0);
})();
