// G90 · CM: 💰 Dinero en Resumen (admin) · + Cuenta pregunta la app · socio: Planes/Textos/Ajustes solo para mirar. Uso: node g90c.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const entrar = async (t, e, c) => { const p = t.page; await p.goto(t.base + '/'); await p.fill('input[type=email]', e); await p.fill('input[type=password]', c); await p.press('input[type=password]', 'Enter'); await p.waitForURL(/admin/); await p.waitForTimeout(800); await t.sinModales(); };
(async () => {
  execSync(__dirname + '/base.sh /home/user/saas p_g90c', { stdio: 'ignore' });
  const t = await abrir('/home/user/saas', 'p_g90c'); const p = t.page, su = t.sim.su;
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    const s = await t.sim.crearUsuario('socio@x.cl', 'clave123'); await su("update public.perfiles set rol = 'socio' where id = $1", [s.id]);
    await su("insert into public.cfx_pagos (cuenta, email, rol, periodo, monto, medio, estado, dias, resuelto) values ($1, 'socio@x.cl', 'negocio', 'mensual', 4900, 'link', 'aprobado', 30, now())", [s.id]);
    await entrar(t, ADM, 'admin123');
    await p.goto(t.base + '/admin/#resumen'); await p.waitForTimeout(6000); await t.sinModales();
    const din = await p.evaluate(() => (document.querySelector('#rDin') || {}).textContent || '');
    ok(/Dinero/.test(din) && /Morosos/.test(din) && /\$4\.900/.test(din), '💰 Dinero en Resumen: ' + din.replace(/\s+/g, ' ').slice(0, 120));
    await p.locator('#rDin').scrollIntoViewIfNeeded(); await t.foto('g90c-dinero');
    ok(await t.anchoOk(), 'Resumen sin scroll de lado');
    await p.goto(t.base + '/admin/#usuarios'); await p.waitForTimeout(1500); await t.sinModales();
    await p.click('#uN'); await p.waitForTimeout(600);
    const apps = await p.$$eval('dialog [data-nap]', (l) => l.map((b) => b.dataset.nap));
    ok(apps.includes('cm') && apps.includes('barberia') && apps.includes('bicitaller') && apps.length === 5, '+ Cuenta pregunta la app: ' + apps.join(', '));
    await t.foto('g90c-cuenta');
    await p.click('dialog [data-nap=cm]'); await p.waitForTimeout(500);
    ok(await p.$('dialog #nw') !== null, 'Centro de Mando → formulario con WhatsApp');
    await p.keyboard.press('Escape');
    // socio
    await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await t.ctx.clearCookies();
    await entrar(t, 'socio@x.cl', 'clave123');
    await p.goto(t.base + '/admin/#resumen'); await p.waitForTimeout(3000); await t.sinModales();
    ok(!(await p.$('#rDin')), 'socio: no ve 💰 Dinero');
    await p.goto(t.base + '/admin/#control'); await p.waitForTimeout(4000); await t.sinModales();
    ok(!(await p.$('[data-s=planes]')) && !(await p.$('[data-s=textos]')) && !!(await p.$('[data-s=negocios]')), 'socio: no ve las pestañas Planes ni Textos (el servidor se las rechaza)');
    await t.foto('g90c-socio');
  } catch (e) { console.log('✗ ' + e.message); f++; }
  if (t.errores.length) console.log('ERRORES:', t.errores.slice(0, 5).join('\n'));
  await t.cerrar();
  console.log(f ? '❌ ' + f + ' fallas' : '✅ g90c todo ok'); process.exit(f ? 1 : 0);
})();
