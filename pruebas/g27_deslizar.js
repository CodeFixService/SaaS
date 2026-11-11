// G27 S1 · Como Josué (celular, dedo): en Mi Caja el menú de pestañas de arriba (Vender · Productos · Reporte · Finanzas) es el modelo.
// Deslizar ese menú mueve SOLO ese menú: nunca "Día / 7 días / 30 días" ni otra cosa de la página (antes quedaba pegado ahí).
// Deslizar dentro de la página pasa de pestaña en el menú de arriba; deslizar un selector de adentro mueve solo ese selector.
// Uso: node g27_deslizar.js [bd]  (antes ./base.sh /home/user/Aplicaciones <bd>)
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/Aplicaciones', process.argv[2] || 'p_g27', { tactil: true });
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  try {
    await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Codex' }).catch(() => {});
    await t.sim.su('update public.profiles set terms_at = now()');
    const q = t.page, cdp = await t.ctx.newCDPSession(q);
    // Un dedo real: toca, se mueve de a poco y suelta (el navegador hace el scroll nativo).
    const desliza = async (x1, y, x2) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y }] });
      for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + (x2 - x1) * i / 8, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await q.waitForTimeout(500);
    };
    const estado = () => q.evaluate(() => ({
      tab: (document.querySelector('#subtabs .on') || {}).dataset.v, rango: (document.querySelector('#r-rango .on') || {}).dataset.r,
      navX: Math.round(document.querySelector('#subtabs').scrollLeft), y: Math.round(scrollY) }));
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.evaluate(() => { localStorage.clear(); localStorage.setItem('cfx:tour:orbita-inicio', '1'); });
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.fill('input[type=email]:visible', 'tienda@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3000);
    for (const ancho of [320, 360]) {
      await q.setViewportSize({ width: ancho, height: 700 });
      const ir = async () => {
        await q.goto(t.base + '/apps/caja/'); await q.waitForTimeout(2500); await t.sinModales(q);
        await q.tap('#subtabs [data-v=reporte]'); await q.waitForTimeout(400);
        // La página baja: "Día / 7 días / 30 días" queda debajo del menú de arriba (el caso que quedaba pegado).
        await q.evaluate(() => { document.body.style.paddingBottom = '1600px'; scrollTo(0, document.querySelector('#r-rango').getBoundingClientRect().top + scrollY - 70); });
        await q.waitForTimeout(400);
      };
      await ir();
      const nav = await q.evaluate(() => { const r = document.querySelector('#subtabs').getBoundingClientRect(); return { y: r.top + r.height / 2, corre: document.querySelector('#subtabs').scrollWidth > document.querySelector('#subtabs').clientWidth + 4 }; });
      const a0 = await estado();
      // 1) Deslizar el menú de arriba (varias veces, ida y vuelta).
      for (let i = 0; i < 3; i++) await desliza(ancho - 40, nav.y, 40);
      const a1 = await estado();
      ok(a1.rango === a0.rango, ancho + ' px · deslizar el menú de arriba NO mueve "Día / 7 días / 30 días" ' + JSON.stringify([a0, a1]));
      ok(nav.corre ? a1.navX > a0.navX && a1.tab === 'reporte' : a1.tab !== a0.tab, ancho + ' px · se mueve solo el menú tocado (' + (nav.corre ? 'se corre de lado' : 'pasa de pestaña') + ')');
      ok(Math.abs(a1.y - a0.y) < 5, ancho + ' px · la página no se movió');
      for (let i = 0; i < 3; i++) await desliza(40, nav.y, ancho - 40);
      const a2 = await estado();
      ok(a2.rango === a0.rango && a2.tab === 'reporte' && a2.navX <= a1.navX, ancho + ' px · de vuelta: el menú vuelve y no queda pegado ' + JSON.stringify(a2));
      await t.foto('g27-deslizar-menu-' + ancho, q);
      // 2) Deslizar dentro de la página: cambia la pestaña del menú de arriba, nunca el selector de adentro.
      await ir();
      const yP = await q.evaluate((x) => {  // un lugar de la página sin botones, campos ni menús bajo el dedo
        const tope = document.querySelector('#subtabs').getBoundingClientRect().bottom + 16;
        const libre = (y) => { const e = document.elementFromPoint(x, y); return e && !e.closest('input, select, textarea, button, a, label, nav, header, .seg, [role=tablist]') && e.closest('#v-reporte'); };
        for (let y = tope; y < innerHeight - 120; y += 4) if (libre(y) && libre(y + 8) && libre(y + 16)) return y + 8;
        return -1;
      }, ancho - 40);
      ok(yP > 0, ancho + ' px · hay un lugar libre en la página para deslizar');
      await desliza(ancho - 40, yP, 40);
      const b1 = await estado();
      ok(b1.tab === 'finanzas' && b1.rango === a0.rango, ancho + ' px · deslizar en la página → pestaña siguiente del menú de arriba ' + JSON.stringify(b1));
      await desliza(40, yP, ancho - 40);
      ok((await estado()).tab === 'reporte', ancho + ' px · y vuelve a Reporte');
      // 3) Tocar y deslizar el selector de adentro mueve solo ese selector.
      await ir();
      const rg = await q.evaluate(() => { const e = document.querySelector('#r-rango'); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { y: r.top + r.height / 2, x1: r.right - 30, x2: r.left + 20 }; });
      await q.waitForTimeout(300);
      if (rg.x1 - rg.x2 >= 90) {
        await desliza(rg.x1, rg.y, rg.x2);
        const c1 = await estado();
        ok(c1.tab === 'reporte' && c1.rango !== a0.rango, ancho + ' px · deslizar "Día / 7 días…" mueve solo ese selector ' + JSON.stringify(c1));
      }
    }
    // 4) Los demás menús de arriba de Órbita son del mismo tipo (núcleo barra.js + tema.css).
    for (const p of ['/apps/pedidos/', '/apps/fichas/']) {
      await q.goto(t.base + p); await q.waitForTimeout(2500);
      const m = await q.evaluate(() => { const n = document.querySelector('nav.tabs.sub'); return n ? getComputedStyle(n).overscrollBehaviorX : 'sin menú'; });
      ok(m === 'contain', p + ' · menú de arriba igual al de Productos (' + m + ')');
    }
    const err = t.errores.filter((e) => !/subir respaldos|409 \(Conflict\)/.test(e));  // respaldo automático del simulador (no es de esta prueba)
    ok(!err.length, 'sin errores ' + JSON.stringify(err.slice(0, 3)));
  } finally { await t.cerrar(); }
})();
