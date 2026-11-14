// G42i · Despega: el correo del saludo (Inicio) va en 1 línea con … (antes salía partido a mitad, "corrido"). FALLA con el código viejo.
// Uso: ./base.sh /home/user/Aplicaciones g42_apl2 && ANCHO=320 node g42_apl.js
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const L = 'tienda.de.ana.con.un.nombre.muy.largo.para.probar@correo-larguisimo.cl';
(async () => {
  const t = await abrir('/home/user/Aplicaciones', 'g42_apl2'); const p = t.page;
  await t.ctx.addInitScript(() => { try { localStorage.setItem('cfx:tour:orbita-inicio', '1'); } catch (e) { /* */ } });
  try {
    await t.sim.crearUsuario(L, 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana de Ropa Hecha a Mano y Más Cosas' });
    await t.sim.su('update public.profiles set terms_at = now()');
    await p.goto(t.base + '/'); await p.fill('input[type=email]', L); await p.fill('input[type=password]', 'clave123'); await p.press('input[type=password]', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(); await p.goto(t.base + '/'); await p.waitForTimeout(2500); await t.sinModales();
    const r = await p.evaluate((L) => { const e = document.getElementById('estadoPlan'), w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { const i = n.textContent.indexOf(L); if (i < 0) continue; const g = document.createRange(); g.setStart(n, i); g.setEnd(n, i + L.length);
        return { lineas: new Set([...g.getClientRects()].filter((x) => x.width).map((x) => Math.round(x.top))).size, plan: /Versión/.test(e.textContent) }; } return {}; }, L);
    await t.foto('g42_inicio');
    assert(r.lineas === 1 && r.plan && await t.anchoOk(), 'G42i Despega: correo del saludo en 1 línea ' + JSON.stringify(r));
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|workers\.dev/.test(x)).join('\n') || 'ninguno');
  await t.cerrar();
})();
