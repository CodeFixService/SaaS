// G27 S2 · Como Josué: Productos → escribir en un campo → borrar → bajar → el 🎤 se va con el campo (no queda flotando
// sobre la cabecera, el menú de arriba ni la barra) y se apaga al salir. Micrófono simulado (el navegador de prueba no trae).
// Uso: node g27_micro.js [bd]  (antes ./base.sh /home/user/Aplicaciones <bd>)
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/Aplicaciones', process.argv[2] || 'p_g27', { tactil: true });
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  try {
    await t.ctx.addInitScript(() => { window.webkitSpeechRecognition = function () { this.start = () => {}; this.stop = () => {}; this.abort = () => {}; }; });
    await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Codex' });
    await t.sim.su('update public.profiles set terms_at = now()');
    const q = t.page;
    await q.setViewportSize({ width: 360, height: 740 });
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.evaluate(() => { localStorage.clear(); localStorage.setItem('cfx:tour:orbita-inicio', '1'); });
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.fill('input[type=email]:visible', 'tienda@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3000);
    // ¿El micrófono se ve encima de algo que no es su campo? (cabecera, menú de arriba, barra de abajo)
    const mira = (sel) => q.evaluate((s) => {
      const b = document.querySelector('.cfx-voz'), c = document.querySelector(s), rc = c.getBoundingClientRect();
      if (!b || b.hidden || !b.isConnected) return { visible: false, campo: [rc.top | 0, rc.bottom | 0] };
      const r = b.getBoundingClientRect(), L = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const i = L.findIndex((e) => e === b || b.contains(e)), tapa = L.slice(0, Math.max(0, i)).find((e) => e.closest('header, nav'));
      return { visible: true, dentro: r.top >= rc.top - 2 && r.bottom <= rc.bottom + 2 && r.right <= rc.right + 1, enPantalla: r.bottom > 0 && r.top < innerHeight,
        tapado: !!tapa, cab: Math.max(0, ...[...document.querySelectorAll('header.top, nav.tabs.sub')].map((e) => e.getBoundingClientRect().bottom)) | 0, campo: [rc.top | 0, rc.bottom | 0], boton: r.top | 0 };
    }, sel);
    for (const [pag, sel, antes] of [['/apps/caja/#productos', '#p-nombre'], ['/apps/caja/#productos', '#impTxt', '#impPegar'], ['/apps/caja/#productos', '#pq']]) {
      await q.goto(t.base + pag); await q.reload(); await q.waitForTimeout(2500); await t.sinModales(q);
      if (antes) await q.tap(antes);
      await q.locator(sel).scrollIntoViewIfNeeded(); await q.tap(sel); await q.waitForTimeout(300);
      await q.keyboard.type('Torta'); for (let i = 0; i < 5; i++) await q.keyboard.press('Backspace'); await q.waitForTimeout(200);
      const a = await mira(sel);
      ok(a.visible && a.dentro, sel + ': 🎤 dentro de su campo al escribir ' + JSON.stringify(a));
      let mal = null;
      for (let k = 0; k < 14; k++) {
        await q.mouse.wheel(0, 45); await q.waitForTimeout(120);
        const m = await mira(sel);
        if (m.visible && m.enPantalla && (!m.dentro || (!m.tapado && m.boton < m.cab))) { mal = m; break; }  // fuera del campo, o encima de la cabecera
      }
      ok(!mal, sel + ': al bajar se va con el campo y queda debajo de la cabecera/menú ' + (mal ? JSON.stringify(mal) : ''));
      await t.foto('g27-micro-' + sel.slice(1), q);
      await q.tap('header.top h1'); await q.waitForTimeout(400);
      ok(!(await mira(sel)).visible, sel + ': al salir del campo el 🎤 se apaga');
    }
    // Las demás pantallas con campos de texto usan el mismo micrófono del núcleo (voz.js) y ninguno propio que flote.
    const propios = await q.evaluate(() => [...document.querySelectorAll('button')].filter((b) => !b.classList.contains('cfx-voz') && getComputedStyle(b).position === 'fixed' && /micr|voz/i.test(b.getAttribute('aria-label') || '')).length);
    ok(propios === 0, 'sin micrófonos propios fijos en la pantalla');
    ok(!t.errores.length, 'sin errores ' + JSON.stringify(t.errores.slice(0, 3)));
  } finally { await t.cerrar(); }
})();
