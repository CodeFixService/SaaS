// G116 · ⋯ Más directo a Ajustes, menú de Ajustes visible (no alto 0), Cupones no se esconde, pie abajo,
//        deslizar entre categorías con el dedo y listas con scroll propio dentro de una hoja. Falla con núcleo 3.22.
const { abrir } = require('./h'); const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const deslizar = async (p, x1, x2, y) => { const cdp = await p.context().newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + (x2 - x1) * i / 8, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(900); };
(async () => {
  // 1) Despega (negocio)
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g116_apl', { stdio: 'ignore' });
  let t = await abrir('/home/user/Aplicaciones', 'p_g116_apl', { tactil: true });
  try {
    await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' }); await t.sim.su('update public.profiles set terms_at = now()');
    const p = t.page; await p.goto(t.base + '/'); await p.waitForTimeout(1500);
    await p.fill('input[type=email]:visible', 'tienda@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(4000);
    await t.sinModales(p); await p.click('text=Saltar').catch(() => {});
    await p.evaluate(() => { const L = [...document.querySelectorAll('nav.cfx-barra > *')].filter((b) => b.offsetParent); L[L.length - 1].click(); }); await p.waitForTimeout(1200);
    ok(/#ajustes/.test(p.url()) && !(await p.$('.cfx-mh.on')), 'Despega: ⋯ Más abre Ajustes directo');
    const P = await p.evaluate(() => { const P = [...document.querySelectorAll('.cfx-mm-pags')].find((x) => x.offsetParent); return P ? { h: P.offsetHeight, h0: P.children[0].offsetHeight } : null; });
    ok(P && P.h > 100 && Math.abs(P.h - P.h0) < 3, 'Despega: el menú de Ajustes se ve (alto ' + (P && P.h) + ' px)');
    ok(await p.locator('.cfx-mm-pag >> text=Cupones y sellos').count() === 1, 'Despega: "Cupones y sellos" sigue en el menú (no se confunde con Pedidos)');
    const pie = await p.evaluate(async () => { const se = document.scrollingElement; se.scrollTop = se.scrollHeight; await new Promise((r) => setTimeout(r, 300)); const x = document.querySelector('footer.marca'); return x && Math.round(innerHeight - x.getBoundingClientRect().bottom); });
    await p.evaluate(() => { document.scrollingElement.scrollTop = 0; }); await p.waitForTimeout(300);
    ok(pie !== null && pie >= 0 && pie < 110, 'Despega: el pie queda abajo (a ' + pie + ' px del fondo)');
    const y = await p.evaluate(() => { const r = document.querySelector('.cfx-mm-pag .cfx-fila').getBoundingClientRect(); return Math.round(r.top + r.height / 2); });
    await deslizar(p, 300, 60, y);
    const pag = await p.evaluate(() => { const P = [...document.querySelectorAll('.cfx-mm-pags')].find((x) => x.offsetParent); return { i: Math.round(P.scrollLeft / P.clientWidth), h: P.offsetHeight, h1: P.children[1].offsetHeight, tab: document.querySelector('.cfx-mm-tab.on').textContent }; });
    ok(pag.i === 1 && Math.abs(pag.h - pag.h1) < 3, 'Despega: deslizar con el dedo pasa a "' + pag.tab + '" y se ve entera');
    await t.foto('g116-despega', p);
    // Hoja con una lista que tiene su propio scroll: arrastrar sobre la lista no mueve la hoja.
    const mov = await p.evaluate(async () => {
      const h = window.CFX_MENU.hoja('Prueba'); h.zona.innerHTML = '<div id="lis" style="height:120px;overflow:auto">' + Array.from({ length: 40 }, (x, i) => '<p>Comuna ' + i + '</p>').join('') + '</div>';
      await new Promise((r) => setTimeout(r, 300)); const c = h.d.firstChild, l = document.getElementById('lis'), r = l.getBoundingClientRect();
      const ev = (tp, y) => l.dispatchEvent(new PointerEvent(tp, { bubbles: true, clientX: r.left + 20, clientY: y, pointerId: 1 }));
      ev('pointerdown', r.top + 10); ev('pointermove', r.top + 90); const tr = c.style.transform; ev('pointerup', r.top + 90); h.cerrar(); return tr;
    });
    ok(!mov, 'Despega: una lista con scroll dentro de una hoja sube y baja sola (la hoja no se mueve: "' + mov + '")');
    ok(!t.errores.length, 'Despega sin errores ' + t.errores.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'Despega: ' + e.message.split('\n')[0]); }
  await t.cerrar();
  // 2) Barbería (dueño): Más va directo y "Clientes" (que no cabe en la barra) está dentro del menú.
  execSync(__dirname + '/base.sh /home/user/barberia p_g116_bar', { stdio: 'ignore' });
  t = await abrir('/home/user/barberia', 'p_g116_bar', { tactil: true });
  try {
    const ADM = 'juanjosuecastilloloyola@gmail.com'; await t.sim.crearUsuario(ADM, 'admin123');
    await t.sim.su('select public.preparar_invitacion((select id from public.profiles where email = $1), $2, $3, $4, $5, $6)', [ADM, 'dueno@x.cl', 'Rodrigo', 'owner', '+56911111111', 'Barbería Hermanos']);
    await t.sim.crearUsuario('dueno@x.cl', 'clave123'); await t.sim.su('update public.profiles set clave_temporal = false, tour_visto = true where true').catch(() => {});
    const p = t.page; await p.goto(t.base + '/'); await p.waitForTimeout(1500);
    await p.fill('input[type=email]:visible', 'dueno@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(4000); await t.sinModales(p);
    await p.evaluate(() => { const L = [...document.querySelectorAll('nav.cfx-barra > *')].filter((b) => b.offsetParent); L[L.length - 1].click(); }); await p.waitForTimeout(1200);
    ok(!(await p.$('.cfx-mh.on')) && /#mas/.test(p.url()), 'Barbería: ⋯ Más abre Ajustes directo, sin ventanita (' + p.url().split('/').pop() + ')');
    const cli = p.locator('.cfx-mm-pag .cfx-fila >> text=Clientes').first();
    ok(await cli.count() > 0, 'Barbería: "Clientes" está dentro del menú Más');
    await cli.click(); await p.waitForTimeout(1000);
    ok(await p.evaluate(() => [...document.querySelectorAll('nav.cfx-barra > *')].some((b) => /Clientes/.test(b.textContent) && b.classList.contains('on'))) || /clientes/.test(p.url()), 'Barbería: tocar "Clientes" abre Clientes');
    await t.foto('g116-barberia', p);
    ok(!t.errores.length, 'Barbería sin errores ' + t.errores.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'Barbería: ' + e.message.split('\n')[0]); }
  await t.cerrar();
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
