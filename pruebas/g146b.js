// G146 b · 💈 Barbería: la barra de servicios elegidos ("🛒 1 servicio · $… · Vaciar") sigue al menú (núcleo --cfx-carro-b) y ↑ queda encima
// (data-cfx-sobre-menu). Con el menú visible o escondido nada se tapa. Uso: ANCHO=320 node g146b.js
const { abrir } = require('./h'); const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
(async () => {
  execSync(__dirname + '/base.sh /home/user/barberia p_g146b', { stdio: 'ignore' });
  const t = await abrir('/home/user/barberia', 'p_g146b'); const p = t.page, su = t.sim.su;
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    await su('select public.preparar_invitacion((select id from public.profiles where email = $1), $2, $3, $4, $5, $6)', [ADM, 'dueno@x.cl', 'Rodrigo', 'owner', '+56911111111', 'Barbería Hermanos']);
    await t.sim.crearUsuario('dueno@x.cl', 'clave123'); await su('update public.profiles set clave_temporal = false, tour_visto = true where true').catch(() => {});
    const cod = (await su('select codigo from public.barberias limit 1'))[0].codigo;
    await su('update public.barberias set abono = 0');  // sin abono: la página deja reservar (recibe)
    const ns = (await su('select count(*)::int n from public.servicios'))[0].n;
    if (ns < 12) for (let i = ns; i < 12; i++) await su("insert into public.servicios (barberia_id, nombre, precio, duracion) select id, 'Servicio ' || $1, 8000, 30 from public.barberias limit 1", [i]).catch((e) => console.log('· servicio:', e.message.slice(0, 80)));
    await t.sim.crearUsuario('cli@x.cl', 'clave123', { rol: 'cliente', barberia: cod, nombre: 'Pepe', telefono: '+56912345672' });
    await su('update public.profiles set clave_temporal = false, tour_visto = true where true').catch(() => {});
    const caja = (sel) => p.evaluate((s) => { const e = [...document.querySelectorAll(s)].find((x) => { const r = x.getBoundingClientRect(), cs = getComputedStyle(x); return r.width && r.height && +cs.opacity > 0.5 && r.top < innerHeight && r.bottom > 0; });
      if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, sel);
    const choca = (a, b) => a && b && a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
    const ver = async (et) => {
      await p.waitForTimeout(800);
      const bar = await caja('#carroBarra:not(.hidden)'), menu = await caja('nav.cfx-barra:not(.cfx-escondida)'), sube = await caja('.cfx-subir.on');
      ok(!!bar, et + ': se ve la barra de servicios');
      ok(!choca(bar, menu), et + ': la barra NO queda bajo el menú');
      ok(!choca(bar, sube), et + ': ↑ NO tapa la barra');
      ok(!choca(sube, menu), et + ': ↑ NO queda bajo el menú');
    };
    for (const [nom, url, login] of [['🌐 /b/', '/b/?b=' + cod, false], ['👤 cliente', '/cliente/', true]]) {
      if (login) { await p.goto(t.base + '/'); await p.waitForTimeout(1500); await p.fill('input[type=email]:visible', 'cli@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(3500); }
      await p.goto(t.base + url); await p.waitForTimeout(3000); await t.sinModales(p);
      const s = p.locator('.serv:visible').first();
      if (!(await s.count())) { const tab = p.locator('nav.cfx-barra .cfx-mas').first(); if (await tab.count()) { await tab.click(); await p.waitForTimeout(1200); } }
      await p.locator('.serv:visible').first().click().catch((e) => console.log('· sin .serv en', nom, e.message.slice(0, 60))); await p.waitForTimeout(600);
      await p.evaluate(() => scrollTo(0, 0)); await ver(nom + ' arriba');
      await p.mouse.wheel(0, 1200); await ver(nom + ' bajando (menú escondido)');
      await p.mouse.wheel(0, -200); await ver(nom + ' subiendo (menú vuelve)');
      await p.screenshot({ path: __dirname + '/capturas/g146b-' + (login ? 'cliente' : 'b') + '.png' }).catch(() => {});
    }
  } catch (e) { console.log('✗ ERROR', e.message); f++; }
  await t.cerrar(); console.log(f ? '✗ ' + f + ' fallas' : '✓ G146 b OK'); process.exit(f ? 1 : 0);
})();
