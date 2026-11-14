// G42f · 🧭 Paneles sin repetir Control + ✉️ Correo: el panel de cada app trae solo lo suyo + "↗ Abrir app";
// las claves push, el Gmail y el registro viven en Control; cada tienda pone SU Gmail para SUS clientes. FALLA con el código viejo.
// Uso: ./base.sh /home/user/saas g42f_cm && ./base.sh /home/user/Aplicaciones g42f_apl && ANCHO=320 node g42f.js
const fs = require('fs');
const { abrir } = require('./h');
const { crear } = require('./sim');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const REPOS = { SaaS: '/home/user/SaaS', Aplicaciones: '/home/user/Aplicaciones', Barberia: '/home/user/Barberia', Emprendedor: '/home/user/Emprendedor', Taller: '/home/user/Taller', Estacionamiento: '/home/user/Estacionamiento', Contenido: '/home/user/Contenido' };
(async () => {
  const t = await abrir('/home/user/saas', 'g42f_cm');
  const ap = crear({ db: 'g42f_apl', funciones: { enviar: (b) => b && b.accion === 'ping' ? { version: '3.5', servicio: true } : { ok: true } }, log: (m) => t.errores.push(m) });
  const p = t.page;
  try {
    await t.ctx.route(/raw\.githubusercontent\.com\/CodeFixService\//, (r) => {
      const u = new URL(r.request().url()), [, , repo, , ...ruta] = u.pathname.split('/'), f = (REPOS[repo] || '') + '/' + ruta.join('/');
      return fs.existsSync(f) ? r.fulfill({ status: 200, body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    });
    await ap.conectar(t.ctx, /https:\/\/gilsamacgappycibcqhq\.supabase\.co\//);
    await t.sim.crearUsuario(ADM, 'admin123');
    await ap.crearUsuario(ADM, 'admin123');
    await ap.su("update public.profiles set terms_at = now()");
    await ap.su("insert into public.cfx_registro (quien, accion, detalle) values ('yo', 'Prueba del panel', 'hecho en el panel')");
    await p.goto(t.base + '/');
    await p.fill('input[type=email]', ADM); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800);
    await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(3000); await t.sinModales();
    const card = p.locator('[data-app=aplicaciones]');
    await card.locator('[data-a=con]').click(); await p.waitForTimeout(400);
    await p.fill('dialog #ce', ADM); await p.fill('dialog #cp', 'admin123'); await p.click('dialog #cok'); await p.waitForTimeout(2500); await t.sinModales();
    // 1) 🧭 Panel: ↗ Abrir app, sin 📜 registro ni Gmail ni claves push (están en Control)
    await card.locator('[data-a=panel]').click(); await p.waitForTimeout(1500);
    const pn = await p.evaluate(() => ({ abrir: (document.querySelector('#pnAbrir') || {}).href || '', filas: [...document.querySelectorAll('.cfx-aj [data-k]')].map((x) => x.dataset.k), alto: document.querySelector('#pnVolver').parentElement.querySelector('h2').getBoundingClientRect().height }));
    assert(pn.alto < 40, 'Título del panel en 1 línea (' + Math.round(pn.alto) + ' px)');
    assert(/^https?:\/\//.test(pn.abrir), 'Panel con ↗ Abrir app ' + pn.abrir);
    assert(!pn.filas.includes('auditoria') && !pn.filas.includes('push') && pn.filas.includes('servidor'), 'Panel sin 📜 ni 🔔 repetidos ' + pn.filas.join(','));
    await t.foto('g42f_panel');
    await p.click('.cfx-aj [data-k=servidor]'); await p.waitForTimeout(1200);
    assert(!(await p.locator('#gmU').count()), 'Servidor sin formulario de Gmail');
    await t.foto('g42f_servidor');
    await p.keyboard.press('Escape'); await t.sinModales();
    // 2) Control → ✉️ Correo: 1 Gmail para todas → queda en Despega
    await p.goto(t.base + '/admin/#control'); await p.waitForTimeout(2500); await t.sinModales();
    await p.click('[data-s=correo]'); await p.waitForTimeout(1500);
    await p.fill('#coU', 'codefix@gmail.com'); await p.fill('#coP', 'abcd efgh ijkl mnop'); await p.click('#coOk'); await p.waitForTimeout(2500);
    const sec = await ap.su("select string_agg(name || '=' || value, ',' order by name) s from public.app_secrets where name like 'gmail%' or name = 'mail_from_name'");
    assert(/gmail_app_password=abcdefghijklmnop/.test(JSON.stringify(sec)) && /gmail_user=codefix@gmail.com/.test(JSON.stringify(sec)), 'Gmail guardado en Despega ' + JSON.stringify(sec));
    const est = await p.textContent('#coL'); console.log('estado:', est.replace(/\s+/g, ' '));
    assert(/Despega Pyme\s*Listo/.test(est) && !(await p.inputValue('#coP')), 'Estado: Despega ✅ y la clave se borra de la pantalla');
    const altos = await p.evaluate(() => [...document.querySelectorAll('#coL b')].map((x) => Math.round(x.getBoundingClientRect().height)));
    assert(altos.length >= 5 && altos.every((h) => h < 30), 'Nombres de app en 1 línea ' + altos.join(','));
    await p.locator('#coL').scrollIntoViewIfNeeded();
    await t.foto('g42f_correo');
    assert(await t.anchoOk(), 'Correo sin salirse en ' + (process.env.ANCHO || 'normal'));
    // 3) Control → 📜 Registro de Despega incluye lo del panel
    await p.click('[data-app=aplicaciones]'); await p.waitForTimeout(1500); await p.click('[data-s=registro]'); await p.waitForTimeout(2000);
    const veces = ((await p.textContent('#ctlCuerpo')).match(/Prueba del panel/g) || []).length;
    assert(veces === 1, 'Registro de Control trae lo del 🧭 Panel 1 sola vez (' + veces + ')');
    await t.foto('g42f_registro');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|workers\.dev/.test(x)).join('\n') || 'ninguno');
  await t.cerrar();
})();
