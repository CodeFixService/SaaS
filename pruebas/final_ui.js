// Etapa final (detalles): Panel ⇄ App en el CM, tira de Control que no salta, registro con botones de borrar, flechas centradas y notificaciones.
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  const t = await abrir('/home/user/saas', 'p_saas');
  const p = t.page;
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    await p.goto(t.base + '/');
    await p.fill('input[type=email]', 'juanjosuecastilloloyola@gmail.com'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(1500); await t.sinModales();
    // Panel ⇄ App
    assert(await p.locator('.cfx-atajo:visible').count() === 1, 'botón App en el panel');
    await p.click('.cfx-atajo'); await p.waitForURL(/\/app\//); await p.waitForTimeout(1500); await t.sinModales();
    assert(/Panel/.test(await p.locator('.cfx-atajo').textContent()), 'botón Panel en la app');
    await p.click('.cfx-atajo'); await p.waitForURL(/\/admin\//); await p.waitForTimeout(1200); await t.sinModales();
    // + al centro (barra con 5 lugares)
    const cx = await p.evaluate(() => { const r = document.querySelector('nav.cfx-barra > .cfx-mas').getBoundingClientRect(); return Math.round(r.left + r.width / 2 - innerWidth / 2); });
    assert(Math.abs(cx) <= 3, '+ al centro de la barra (' + cx + ')');
    // Control: la tira de secciones no vuelve al inicio al tocar una opción
    await p.goto(t.base + '/admin/#control'); await p.waitForTimeout(1500); await t.sinModales();
    const chips = p.locator('#v-control .chips');
    await chips.evaluate((c) => { c.scrollLeft = c.scrollWidth; }); await p.waitForTimeout(200);
    const antes = await chips.evaluate((c) => c.scrollLeft);
    await p.locator('#v-control .chips [data-s=registro]').click(); await p.waitForTimeout(1200);
    const despues = await p.locator('#v-control .chips').evaluate((c) => c.scrollLeft);
    assert(antes > 20 && despues > antes - 80, 'la tira queda donde estaba (' + antes + ' → ' + despues + ')');
    // Registro: botones para borrar
    assert(await p.locator('.cfx-reg-b [data-d="30"]').count() === 1, 'botón borrar registro antiguo');
    await p.locator('.cfx-reg-b [data-d="0"]').click(); await p.locator('dialog.cfx-ayuda [data-si]').click(); await p.waitForTimeout(800);
    assert((await t.sim.su("select count(*)::int n from cfx_registro where accion <> 'registro borrado'"))[0].n === 0, 'registro borrado');
    await t.foto('final-control-registro');
    // Notificaciones de las apps
    await p.locator('#v-control .chips [data-s=push]').click(); await p.waitForTimeout(1200);
    assert(/Notificaciones de las apps/.test(await p.locator('#v-control').innerText()), 'sección notificaciones');
    await t.foto('final-control-push');
    // Flecha de volver centrada en Ajustes
    await p.goto(t.base + '/admin/#ajustes'); await p.waitForTimeout(1200); await t.sinModales();
    await p.locator('.cfx-aj > [data-k=generales]').click(); await p.waitForTimeout(500);
    const d = await p.evaluate(() => { const b = document.querySelector('.cfx-aj-volver'), s = b.querySelector('svg'); const rb = b.getBoundingClientRect(), rs = s.getBoundingClientRect();
      return [Math.round((rs.left + rs.width / 2) - (rb.left + rb.width / 2)), Math.round((rs.top + rs.height / 2) - (rb.top + rb.height / 2))]; });
    assert(Math.abs(d[0]) <= 1 && Math.abs(d[1]) <= 1, 'flecha centrada ' + d);
    await t.foto('final-ajustes');
    const e = t.errores.filter((x) => !/TUNNEL|ERR_NAME|ERR_INTERNET|ERR_CONNECTION/.test(x));
    console.log('ERRORES:', e.length ? [...new Set(e)].join(' || ') : 'ninguno');
  } catch (e) { console.log(e.message); await t.foto('final-falla'); } finally { await t.cerrar(); }
})();
