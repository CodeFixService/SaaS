// G35 · Billetera, BiciTaller y Estaciona con núcleo 2.71: 🔒 3 claves malas → se pausa la clave (enlace al correo),
// el admin que entra va directo al CM (su panel vive en CM → Apps → 🧭 Panel) y el socio se queda en la app. Trae qr.js y modulos.js.
// FALLA con el código viejo (núcleo 2.54: sin qr.js ni desvío).
// Uso: node g35_nucleo.js tal|est|emp   (antes ./base.sh /home/user/Taller g35_tal · /home/user/Estacionamiento g35_est · /home/user/Emprendedor g35_emp)
const fs = require('fs');
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const APPS = {
  tal: { repo: '/home/user/Taller', bd: 'g35_tal', js: 'shared', socio: false,
    admin: async (s) => { await s.crearUsuario(ADM, 'admin123'); },
    entrar: async (p, b, e, c) => { await p.goto(b + '/'); await p.waitForTimeout(1200); await p.fill('input[type=email]:visible', e); await p.fill('input[type=password]:visible', c); await p.press('input[type=password]:visible', 'Enter'); } },
  est: { repo: '/home/user/Estacionamiento', bd: 'g35_est', js: 'js', socio: true,
    admin: async (s) => { const u = await s.crearUsuario(ADM, 'admin123'); await s.su('update public.perfiles set es_admin = true where id = $1', [u.id]); },
    entrar: async (p, b, e, c) => { await p.goto(b + '/#/avisos'); await p.waitForTimeout(1500); await p.click('button[data-t=in]'); await p.waitForTimeout(300); await p.fill('#lEmail', e); await p.fill('#lClave', c); await p.press('#lClave', 'Enter'); } },
  emp: { repo: '/home/user/Emprendedor', bd: 'g35_emp', js: 'js', socio: true,
    admin: async (s) => { await s.crearUsuario(ADM, 'admin123'); await s.su('select privado.fijar_admin()'); },
    entrar: async (p, b, e, c) => { await p.goto(b + '/#ingresar'); await p.waitForTimeout(1000); await p.fill('input[type=email]', e); await p.fill('input[type=password]', c); await p.press('input[type=password]', 'Enter'); } }
};
const k = process.argv[2] || 'tal', A = APPS[k];
const limpio = (p) => p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => { try { d.close(); } catch (e) { /* nada */ } d.remove(); })).catch(() => {});
(async () => {
  const t = await abrir(A.repo, A.bd);
  const p = t.page;
  try {
    assert(JSON.parse(fs.readFileSync(A.repo + '/nucleo.json')).nucleo === '2.71', 'núcleo 2.71');
    assert(fs.existsSync(A.repo + '/' + A.js + '/qr.js') && fs.existsSync(A.repo + '/' + A.js + '/modulos.js'), 'trae qr.js y modulos.js');
    await t.ctx.route(/saas\.juanjosuecastilloloyola\.workers\.dev/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>CM</title><h1>Centro de Mando</h1>' }));
    await A.admin(t.sim);
    await t.sim.crearUsuario('ana@x.cl', 'clave123', k === 'tal' ? { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' } : undefined);
    // 🔒 3 claves malas → pausa con enlace al correo (queda en la base)
    for (let i = 0; i < 3; i++) { await limpio(p); await A.entrar(p, t.base, 'ana@x.cl', 'mala' + i + 'xyz9'); await p.waitForTimeout(1800); }
    assert(await p.evaluate(() => !!window.CFX_QR && window.CFX_QR.listo()), 'qr.js cargado e iniciado');
    const bloq = (await t.sim.su("select public.cfx_login_bloqueado('ana@x.cl') b"))[0].b;
    assert(bloq === true, '🔒 la clave quedó pausada en la base tras 3 intentos');
    assert(/🔒|enlace|correo/i.test(await p.textContent('body')), 'avisa que entre con el enlace del correo');
    await t.foto('g35_' + k + '_bloqueo');
    // Con la clave pausada, ni la clave buena entra
    await limpio(p); await A.entrar(p, t.base, 'ana@x.cl', 'clave123'); await p.waitForTimeout(2000);
    const ses = await p.evaluate(() => Object.keys(localStorage).some((x) => /auth/.test(x) && /access_token/.test(localStorage.getItem(x) || '')));
    assert(!ses, 'con la clave pausada no entra ni con la clave buena');
    // Admin → CM
    const c2 = await t.browser.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: 'block' }); await t.sim.conectar(c2);
    await c2.addInitScript(() => { window.CFX_SIN_HOLA = true; window.CFX_SIN_OBLIGAR = true; });
    await c2.route(/saas\.juanjosuecastilloloyola\.workers\.dev/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>CM</title><h1>Centro de Mando</h1>' }));
    const q = await c2.newPage(); await A.entrar(q, t.base, ADM, 'admin123'); await q.waitForTimeout(5000);
    assert(/saas\.juanjosuecastilloloyola\.workers\.dev\/admin\//.test(q.url()), 'admin → CM (' + q.url() + ')');
    // Socio del núcleo (cfx_socios) → se queda en la app
    if (A.socio) {
      await t.sim.crearUsuario('socio@x.cl', 'clave123');
      await t.sim.su("insert into public.cfx_socios (email) values ('socio@x.cl') on conflict do nothing");
      const c3 = await t.browser.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: 'block' }); await t.sim.conectar(c3);
      await c3.addInitScript(() => { window.CFX_SIN_HOLA = true; window.CFX_SIN_OBLIGAR = true; });
      await c3.route(/saas\.juanjosuecastilloloyola\.workers\.dev/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>CM</title>' }));
      const r3 = await c3.newPage(); await A.entrar(r3, t.base, 'socio@x.cl', 'clave123'); await r3.waitForTimeout(5000);
      assert(r3.url().startsWith(t.base), 'socio se queda en la app (' + r3.url() + ')');
    }
  } catch (e) { console.log(e.message); await t.foto('g35_' + k + '_error'); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon/.test(x)).join('\n') || 'ninguno');
  await t.cerrar();
})();
