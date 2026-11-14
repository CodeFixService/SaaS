// G34 · 🧭 Panel universal: el panel de administrador de Despega Pyme vive en CM → Apps → 🧭 Panel (contra la base de Despega),
// y el admin que entra a Despega va directo al CM. FALLA con el código viejo (no hay botón 🧭 Panel ni desvío).
// Uso: ./base.sh /home/user/saas g34_cm && ./base.sh /home/user/Aplicaciones g34_apl && node g34_panel.js
const fs = require('fs');
const { abrir } = require('./h');
const { crear } = require('./sim');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const REPOS = { SaaS: '/home/user/SaaS', Aplicaciones: '/home/user/Aplicaciones', Barberia: '/home/user/Barberia', Emprendedor: '/home/user/Emprendedor', Taller: '/home/user/Taller', Estacionamiento: '/home/user/Estacionamiento', Contenido: '/home/user/Contenido' };
(async () => {
  const t = await abrir('/home/user/saas', 'g34_cm');
  const ap = crear({ db: 'g34_apl', funciones: { enviar: (b) => b && b.accion === 'ping' ? { version: '9.9', servicio: true } : { ok: true } }, log: (m) => t.errores.push(m) });
  const p = t.page;
  try {
    // GitHub (version.json, config.js, nucleo.json) se lee del disco.
    await t.ctx.route(/raw\.githubusercontent\.com\/CodeFixService\//, (r) => {
      const u = new URL(r.request().url()), [, , repo, , ...ruta] = u.pathname.split('/'), f = (REPOS[repo] || '') + '/' + ruta.join('/');
      return fs.existsSync(f) ? r.fulfill({ status: 200, body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    });
    await ap.conectar(t.ctx, /https:\/\/gilsamacgappycibcqhq\.supabase\.co\//);
    await t.sim.crearUsuario(ADM, 'admin123');
    await ap.crearUsuario(ADM, 'admin123');
    const neg = await ap.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await ap.su("update public.profiles set terms_at = now()");
    // 1) CM → Apps → Despega → Conectar → 🧭 Panel
    await p.goto(t.base + '/');
    await p.fill('input[type=email]', ADM); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800);
    await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(3000); await t.sinModales();
    const card = p.locator('[data-app=aplicaciones]');
    await card.locator('[data-a=con]').click(); await p.waitForTimeout(400);
    await p.fill('dialog #ce', ADM); await p.fill('dialog #cp', 'admin123'); await p.click('dialog #cok'); await p.waitForTimeout(2500);
    assert(await card.locator('[data-a=panel]').count() === 1, 'botón 🧭 Panel en Despega');
    assert(await p.locator('[data-app=contenido] [data-a=panel]').count() === 0, 'Cerebro sin panel');
    await card.locator('[data-a=panel]').click(); await p.waitForTimeout(1200);
    const filas = await p.locator('.cfx-aj [data-k]').evaluateAll((l) => l.map((x) => x.dataset.k));
    assert(['resumen', 'actividad', 'negocios', 'registro_abierto', 'inactivas', 'clientes', 'reglas', 'servidor', 'marca', 'auditoria', 'link'].every((k) => filas.includes(k)), 'secciones: ' + filas.join(','));
    await t.foto('g34_panel_grilla'); await p.screenshot({ path: __dirname + '/capturas/saas/g34_panel_arriba.png' });
    const app_url = (await ap.su("select value from public.app_settings where key = 'app_url'").catch(() => [{}]))[0] || {};
    console.log('  app_url =', JSON.stringify(app_url.value || null));
    const hoja = async (k) => { await t.sinModales(); await p.evaluate(() => document.querySelectorAll('.cfx-hoja-m').forEach((x) => x.remove())); await p.click('.cfx-aj [data-k=' + k + ']'); await p.waitForTimeout(1500); };
    // Resumen
    await hoja('resumen');
    assert(await p.locator('.cfx-hm-zona .stats .card').count() >= 10, 'resumen con números');
    await t.foto('g34_resumen');
    // Negocios: dar +7 días de Pro → queda en la base → recargar y ver PRO
    await hoja('negocios');
    assert(await p.locator('.cfx-hm-zona', { hasText: 'Tienda Ana' }).count() === 1, 'negocio listado');
    await p.evaluate((id) => { const s = document.querySelector('.cfx-hm-zona select[data-acc="' + id + '"]'); s.value = '7'; s.dispatchEvent(new Event('change', { bubbles: true })); }, neg.id); await p.waitForTimeout(400);
    await p.locator('dialog[open] [data-si]').click(); await p.waitForTimeout(1500);
    const pro = (await ap.su('select pro_until from public.profiles where id = $1', [neg.id]))[0].pro_until;
    assert(pro && new Date(pro) > new Date(Date.now() + 5 * 864e5), 'Pro guardado en la base de Despega');
    assert(await p.locator('.cfx-hm-zona .pill.pro').count() >= 1, 'se ve PRO al recargar la lista');
    await t.foto('g34_negocios');
    await p.click('.cfx-hm-zona #ngMas'); assert(await p.isVisible('.cfx-hm-zona #ngN'), '➕ Crear negocio abre el formulario');
    // 💬 Mensaje directo → chat de soporte del negocio
    await p.click('.cfx-hm-zona [data-msg="' + neg.id + '"]'); await p.waitForTimeout(300);
    await p.fill('dialog[open] #pd', 'Hola Ana, ¿te ayudo con tu tienda?'); await p.click('dialog[open] #pdOk'); await p.waitForTimeout(1200);
    const chat = await ap.su("select count(*)::int n from public.cfx_chat where cuenta = $1 and de = 'soporte' and texto like 'Hola Ana%'", [neg.id]);
    assert(chat[0].n === 1, '💬 mensaje en el chat de soporte del negocio');
    // Reglas: cambiar días de regalo → guardar → reabrir → sigue
    await hoja('reglas');
    await p.fill('.cfx-hm-zona [data-rg=dias_regalo]', '9'); await p.click('.cfx-hm-zona #rgOk'); await p.waitForTimeout(1500);
    await hoja('reglas');
    assert(await p.inputValue('.cfx-hm-zona [data-rg=dias_regalo]') === '9', 'regla guardada y se ve al reabrir');
    // Registro abierto: link n/ + QR
    await hoja('registro_abierto');
    assert(/\/n\/$/.test(await p.inputValue('.cfx-hm-zona input[readonly]')), 'link de registro n/');
    await p.waitForFunction(() => /^data:image/.test((document.querySelector('.cfx-hm-zona img') || {}).src || ''), null, { timeout: 5000 });
    assert(true, 'QR de registro dibujado');
    await t.foto('g34_registro_qr');
    // Servidor y correo: probar la función "enviar"
    await hoja('servidor');
    await p.click('.cfx-hm-zona #svP'); await p.waitForTimeout(1200);
    assert(/Conectado/.test(await p.textContent('.cfx-hm-zona #svR')), 'ping a la función enviar');
    for (const k of ['actividad', 'clientes', 'auditoria', 'marca', 'link', 'inactivas']) { await hoja(k); assert(!(await p.locator('.cfx-hm-zona .warn').count()), k + ' abre sin error'); }
    assert(await t.anchoOk(), 'sin scroll horizontal (360 px)');
    await t.sinModales(); await p.evaluate(() => document.querySelectorAll('.cfx-hoja-m').forEach((x) => x.remove())); await p.click('#pnVolver'); await p.waitForTimeout(800);
    assert(await p.locator('[data-app=aplicaciones]').count() === 1, '← Apps vuelve a las tarjetas');
    // 2) Admin entra a Despega → va directo al CM. Negocio → se queda en su app.
    const D = await (async () => { const s = await require('./h').servir('/home/user/Aplicaciones'); return { s, base: 'http://localhost:' + s.address().port }; })();
    const ctx2 = await t.browser.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: 'block' });
    await ap.conectar(ctx2);
    await ctx2.addInitScript(() => { window.CFX_SIN_HOLA = true; window.CFX_SIN_OBLIGAR = true; try { localStorage.setItem('cfx:tour:orbita-inicio', '1'); } catch (e) { /* nada */ } });
    await ctx2.route(/saas\.juanjosuecastilloloyola\.workers\.dev/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>CM</title><h1>Centro de Mando</h1>' }));
    const q = await ctx2.newPage();
    const entrar = async (em, pw) => { await q.goto(D.base + '/'); await q.waitForTimeout(1200); await q.fill('input[type=email]:visible', em); await q.fill('input[type=password]:visible', pw); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(4000); };
    await entrar(ADM, 'admin123');
    assert(/saas\.juanjosuecastilloloyola\.workers\.dev\/admin\//.test(q.url()), 'admin en Despega → CM (' + q.url() + ')');
    await q.goto(D.base + '/apps/admin/'); await q.waitForTimeout(1500);
    assert(/workers\.dev\/admin\//.test(q.url()), 'apps/admin/ viejo → CM');
    const ctx3 = await t.browser.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: 'block' });
    await ap.conectar(ctx3);
    await ctx3.addInitScript(() => { window.CFX_SIN_HOLA = true; window.CFX_SIN_OBLIGAR = true; try { localStorage.setItem('cfx:tour:orbita-inicio', '1'); } catch (e) { /* nada */ } });
    const r3 = await ctx3.newPage();
    await r3.goto(D.base + '/'); await r3.waitForTimeout(1200); await r3.fill('input[type=email]:visible', 'tienda@x.cl'); await r3.fill('input[type=password]:visible', 'clave123'); await r3.press('input[type=password]:visible', 'Enter'); await r3.waitForTimeout(4000);
    assert(r3.url().startsWith(D.base), 'negocio se queda en Despega (' + r3.url() + ')');
    await r3.screenshot({ path: __dirname + '/capturas/saas/g34_negocio.png' });
    D.s.close();
  } catch (e) { console.log(e.message); await t.foto('g34_error'); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon/.test(x)).join('\n') || 'ninguno');
  await ap.cerrar(); await t.cerrar();
})();
