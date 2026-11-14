// G42a/b/k/c/d · Núcleo universal en Despega (como Josué): ⬆️ subir, 🪟 ventanas (✕ + Cerrar / ← Volver), 📌 títulos fijos,
// ✋ ordenar manteniendo presionado (queda tras recargar) y 🔐 datos tapados. FALLA con el código viejo.
// Uso: ./base.sh /home/user/Aplicaciones g42_apl && ANCHO=320 node g42_nucleo.js   (OSCURO=1 para modo oscuro)
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const N = 'tienda@x.cl';
(async () => {
  const t = await abrir('/home/user/Aplicaciones', process.env.BD || 'g42_apl'); const p = t.page;
  await t.ctx.addInitScript(() => { try { localStorage.setItem('cfx:tour:orbita-inicio', '1'); } catch (e) { /* */ } });
  const mas = async () => { await p.goto(t.base + '/'); await p.waitForTimeout(2200); await t.sinModales(); await p.locator('nav.cfx-barra > *', { hasText: 'Más' }).last().click(); await p.waitForTimeout(1200); };
  const secs = () => p.evaluate(() => [...document.querySelectorAll('#v-ajustes .cfx-aj-sec')].filter((x) => x.getClientRects().length).map((x) => x.dataset.cfxOi));
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    await t.sim.crearUsuario(N, 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.su('update public.profiles set terms_at = now()');
    await p.goto(t.base + '/'); await p.fill('input[type=email]', N); await p.fill('input[type=password]', 'clave123'); await p.press('input[type=password]', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(); await mas();
    // ✋ Ordenar: mantener presionado la 2ª sección y llevarla arriba de la 1ª → queda así al recargar
    const s0 = await secs();
    assert(s0.length >= 2, 'Más con secciones ordenables ' + s0.join(' | '));
    const a = await p.locator('#v-ajustes .cfx-aj-sec').nth(0).boundingBox(), b = p.locator('#v-ajustes .cfx-aj-sec').nth(1).locator('.cfx-aj-g');
    await b.scrollIntoViewIfNeeded(); const bb = await b.boundingBox(); const a2 = await p.locator('#v-ajustes .cfx-aj-sec').nth(0).boundingBox();
    await p.mouse.move(bb.x + 20, bb.y + 5); await p.mouse.down(); await p.waitForTimeout(650);
    for (let i = 1; i <= 8; i++) { await p.mouse.move(bb.x + 20, bb.y + 5 - (bb.y - a2.y + 10) * i / 8); await p.waitForTimeout(40); }
    await p.mouse.up(); await p.waitForTimeout(400);
    assert(!a || (await secs())[0] === s0[1], 'Arrastrada arriba: ' + (await secs()).join(' | '));
    assert(!(await p.locator('.cfx-hoja-m').count()), 'Soltar no abre ninguna opción');
    await p.reload(); await p.waitForTimeout(2500); await t.sinModales(); await mas();
    assert((await secs())[0] === s0[1], 'Tras recargar sigue en su orden: ' + (await secs()).join(' | '));
    // 📌 Títulos fijos: al bajar, el título de la sección queda pegado bajo la cabecera
    const f = await p.evaluate(async () => {
      const L = [...document.querySelectorAll('#v-ajustes .cfx-aj-sec')].filter((x) => x.getClientRects().length), s = L[L.length - 1], g = s.querySelector('.cfx-aj-g');
      const h = document.querySelector('header.top').getBoundingClientRect().bottom;
      const esp = document.createElement('div'); esp.style.height = '150vh'; document.querySelector('#v-ajustes').appendChild(esp);
      scrollTo(0, s.getBoundingClientRect().top + scrollY - h + 30); await new Promise((r) => setTimeout(r, 300));
      const r = g.getBoundingClientRect(), bg = getComputedStyle(g).backgroundColor;
      esp.remove(); scrollTo(0, 0);
      return { fijo: g.classList.contains('cfx-fijo'), top: Math.round(r.top), h: Math.round(h), alto: Math.round(r.height), bg };
    });
    assert(f.fijo && Math.abs(f.top - f.h) <= 2 && f.alto < 40 && !/rgba\(0, 0, 0, 0\)|transparent/.test(f.bg), '📌 Título pegado bajo la cabecera, 1 línea y opaco ' + JSON.stringify(f));
    // 🪟 Ventana principal: ✕ arriba + Cerrar abajo
    await p.click('#v-ajustes .cfx-aj [data-k=tienda]'); await p.waitForTimeout(1200);
    const v1 = await p.evaluate(() => { const d = document.querySelector('.cfx-hoja-m'), z = d.querySelector('.cfx-hm-zona'); return { x: !!d.querySelector('.cfx-hm-cab .cfx-hm-x:not(.cfx-hm-volver)'), cerrar: !!z.lastElementChild.querySelector('.cfx-hm-cerrar'), volver: !!d.querySelector('.cfx-hm-volver') }; });
    assert(v1.x && v1.cerrar && !v1.volver, '🪟 Mi tienda: ✕ arriba y Cerrar abajo ' + JSON.stringify(v1));
    // ⬆️ Subir dentro de la ventana
    await p.evaluate(() => { const z = document.querySelector('.cfx-hoja-m .cfx-hm-zona'); z.scrollTop = (z.scrollHeight - z.clientHeight) * 0.6; z.dispatchEvent(new Event('scroll')); });
    await p.waitForTimeout(500);
    assert(await p.locator('.cfx-subir.on').isVisible(), '⬆️ Aparece al pasar el 30%');
    await t.foto('g42_subir_ventana');
    await p.click('.cfx-subir'); await p.waitForTimeout(900);
    assert(await p.evaluate(() => document.querySelector('.cfx-hoja-m .cfx-hm-zona').scrollTop) < 5, '⬆️ Toca → sube arriba');
    // Subventana: reemplaza a la principal y muestra ← Volver (sin ✕ ni Cerrar)
    await p.evaluate(() => { const h = CFX_MENU.hoja('Detalle'); h.zona.innerHTML = '<p>Subventana</p>'; });
    await p.waitForTimeout(500);
    const v2 = await p.evaluate(() => { const L = [...document.querySelectorAll('.cfx-hoja-m')], s = L[L.length - 1]; return { ven: L.filter((x) => x.getClientRects().length).length, volver: !!s.querySelector('.cfx-hm-volver'), x: !!s.querySelector('.cfx-hm-cab .cfx-hm-x:not(.cfx-hm-volver)'), cerrar: !!s.querySelector('.cfx-hm-cerrar') }; });
    assert(v2.ven === 1 && v2.volver && !v2.x && !v2.cerrar, '🪟 Subventana: reemplaza y muestra ← Volver ' + JSON.stringify(v2));
    await t.foto('g42_subventana');
    // 📌 dentro de una ventana: el título de la tarjeta larga queda pegado arriba de la ventana, opaco
    const fv = await p.evaluate(async () => {
      const L = [...document.querySelectorAll('.cfx-hoja-m')], z = L[L.length - 1].querySelector('.cfx-hm-zona');
      z.innerHTML = '<div class="card"><h2>📦 Una sección con un título largo que no cabe</h2><div style="height:1800px"></div></div><div class="card"><h2>Otra</h2><div style="height:900px"></div></div>';
      await new Promise((r) => setTimeout(r, 700)); z.scrollTop = 500; z.dispatchEvent(new Event('scroll')); await new Promise((r) => setTimeout(r, 300));
      const h = z.querySelector('h2'), r = h.getBoundingClientRect();
      return { d: Math.round(r.top - z.getBoundingClientRect().top), alto: Math.round(r.height), pegado: h.classList.contains('cfx-pegado'), bg: getComputedStyle(h).backgroundColor };
    });
    assert(Math.abs(fv.d) <= 2 && fv.alto < 50 && fv.pegado && !/rgba\(0, 0, 0, 0\)/.test(fv.bg), '📌 En ventana: pegado arriba, 1 línea y opaco ' + JSON.stringify(fv));
    await t.foto('g42_fijo_ventana');
    await p.click('.cfx-hm-volver'); await p.waitForTimeout(500);
    assert(await p.evaluate(() => document.querySelectorAll('.cfx-hoja-m').length === 1 && document.querySelector('.cfx-hoja-m').getClientRects().length > 0 && !!document.querySelector('#cTienda')), '← Volver regresa a Mi tienda');
    await p.click('.cfx-hm-cerrar'); await p.waitForTimeout(500);
    assert(!(await p.locator('.cfx-hoja-m').count()), 'Cerrar (abajo) cierra la ventana');
    // ⬆️ en la página: aparece al bajar y sube
    await p.evaluate(() => { const e = document.createElement('div'); e.id = 'espT'; e.style.height = '250vh'; document.querySelector('#v-ajustes').appendChild(e); scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.5); }); await p.waitForTimeout(500);
    assert(await p.locator('.cfx-subir.on').isVisible(), '⬆️ En la página también');
    const sb = await p.evaluate(() => { const b = document.querySelector('.cfx-subir').getBoundingClientRect(), n = document.querySelector('nav.cfx-barra'); return { b: b.bottom, n: n && n.getClientRects().length ? n.getBoundingClientRect().top : 9999 }; });
    assert(sb.b <= sb.n, '⬆️ No tapa la barra de abajo ' + JSON.stringify(sb));
    await p.click('.cfx-subir'); await p.waitForTimeout(1200);
    assert(await p.evaluate(() => scrollY) < 5, '⬆️ Sube la página');
    await p.evaluate(() => document.getElementById('espT').remove());
    // 🔐 Datos tapados
    const tp = await p.evaluate(() => [CFX_TAPAR.correo('juan@gmail.com'), CFX_TAPAR.tel('+56 9 1234 5612'), CFX_TAPAR.rut('76.123.456-0')].join(' '));
    assert(tp === 'j•••@gmail.com +56 9 ••••12 ••.•••.456-0', '🔐 ' + tp);
    assert(await t.anchoOk(), 'Sin salirse en ' + (process.env.ANCHO || 'normal'));
    await t.foto('g42_mas');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  await t.cerrar();
})();
