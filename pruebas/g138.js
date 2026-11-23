// G138 · Errores de Josué (21/11) en Despega, núcleo 3.34:
//  1) Cliente Premium → Mi Caja (apps/caja/) → Finanzas: NO aparece "Cuenta y ayuda" suelta (la barra marcaba "Cuenta" de otra página).
//  2) Chat: el 🎙️ queda DENTRO del campo, en la esquina de abajo a la derecha, también cuando el texto pasa a 2 líneas.
//  3) Teclado: las páginas piden interactive-widget=resizes-content; con el teclado abierto (pantalla más baja + escribiendo) la barra de abajo se esconde.
// FALLA con el código viejo (Cuenta y ayuda en Mi Caja · sin interactive-widget · sin html.cfx-teclado).
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g138', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g138');
  try {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'CodeFix' });
    await t.sim.su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Josue','client',$1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123'); await t.sim.su('update public.profiles set terms_at = now()');
    await t.sim.su("update public.profiles set plan = 'pro' where email = 'cli@x.cl'");
    process.env.ANCHO = '412';
    const { page: p } = await t.nuevo();
    await p.goto(t.base + '/'); await p.waitForTimeout(1500);
    await p.fill('input[type=email]:visible', 'cli@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3500); await t.sinModales(p);
    // 1) Mi Caja
    await p.goto(t.base + '/apps/caja/'); await p.waitForTimeout(2500); await t.sinModales(p);
    for (const v of ['reporte', 'finanzas']) {
      await p.evaluate((v) => document.querySelector('#subtabs [data-v=' + v + ']').click(), v); await p.waitForTimeout(1500);
      const n = await p.evaluate(() => [...document.querySelectorAll('.cfx-cuenta-g')].filter((x) => x.offsetParent).length);
      ok(n === 0, '1) Mi Caja → ' + v + ': sin "Cuenta y ayuda" suelta (' + n + ')');
    }
    await p.screenshot({ path: __dirname + '/capturas/g138-caja.png', fullPage: true });
    // 4) 📌 Título fijo de una tarjeta larga: al bajar queda con fondo sólido (antes transparente, encima del texto: "Mi pedido" sobre "Total").
    await p.evaluate(() => { const c = document.createElement('div'); c.className = 'card'; c.id = 'g138c'; c.innerHTML = '<h2>🛒 Mi pedido</h2>' + '<p>Total $20.000</p>'.repeat(80); (document.querySelector('main') || document.body).prepend(c); });
    await p.waitForTimeout(900);
    await p.evaluate(() => { const h = document.querySelector('#g138c > h2'), sc = (function f(x) { for (; x; x = x.parentElement) { const o = getComputedStyle(x).overflowY; if (/auto|scroll/.test(o) && x.scrollHeight > x.clientHeight) return x; } return null; })(h);
      const y = h.parentElement.getBoundingClientRect().top + 600; if (sc) sc.scrollBy(0, y); else scrollBy(0, y); });
    await p.waitForTimeout(900);
    const fj = await p.evaluate(() => { const h = document.querySelector('#g138c > h2'); const r = h.getBoundingClientRect(), x = document.elementFromPoint(r.left + 40, r.top + r.height / 2); return { fijo: h.classList.contains('cfx-fijo'), pegado: h.classList.contains('cfx-pegado'), bg: getComputedStyle(h).backgroundColor, visible: !!x && h.contains(x) }; });
    ok(!fj.fijo && !fj.pegado, '4) 📌 G150: el título ya no se queda fijo al bajar ' + JSON.stringify(fj));
    await p.screenshot({ path: __dirname + '/capturas/g138-titulo.png' });
    // Y en la propia Cuenta del shell sigue el menú normal (no se rompió).
    await p.goto(t.base + '/#cuenta'); await p.waitForTimeout(2500); await t.sinModales(p);
    ok(/Reportar una falla/.test(await p.evaluate(() => document.body.innerText)), '1) Cuenta (inicio) sigue con Reportar una falla');
    // 3a) meta viewport
    const vp = await p.evaluate(() => document.querySelector('meta[name=viewport]').content);
    ok(/interactive-widget=resizes-content/.test(vp), '3) viewport con interactive-widget=resizes-content');
    // 2) micrófono del chat
    await p.goto(t.base + '/apps/mensajes/?con=' + u.id); await p.waitForTimeout(2500); await t.sinModales(p);
    await p.addInitScript(() => {});
    const hayVoz = await p.evaluate(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
    await p.focus('#texto'); await p.fill('#texto', 'Hola, me interesa: Gestión red social y otra cosa más larga para dos líneas');
    await p.waitForTimeout(900);
    const m = await p.evaluate(() => { const b = document.querySelector('.cfx-voz'); const c = document.getElementById('texto'); if (!b || b.hidden) return null;
      const r = b.getBoundingClientRect(), q = c.getBoundingClientRect(); return { dentro: r.left >= q.left && r.right <= q.right + 1 && r.top >= q.top && r.bottom <= q.bottom + 1, abajo: q.bottom - r.bottom, derecha: q.right - r.right }; });
    if (hayVoz) ok(m && m.dentro && m.abajo < 12 && m.derecha < 12, '2) 🎙️ dentro del campo, esquina de abajo a la derecha ' + JSON.stringify(m));
    else console.log('· sin SpeechRecognition en este Chromium: 2) no aplica');
    await p.screenshot({ path: __dirname + '/capturas/g138-chat.png' });
    // 3b) teclado: la pantalla se achica escribiendo → html.cfx-teclado y la barra de abajo no se ve
    await p.setViewportSize({ width: 412, height: 480 }); await p.waitForTimeout(800);
    const k = await p.evaluate(() => ({ cls: document.documentElement.classList.contains('cfx-teclado'), nav: [...document.querySelectorAll('nav.cfx-barra')].some((x) => getComputedStyle(x).display !== 'none' && x.getBoundingClientRect().height > 0), d: [...document.querySelectorAll('nav.cfx-barra')].map((x) => getComputedStyle(x).display + '|' + x.getAttribute('style')) }));
    ok(k.cls && !k.nav, '3) con el teclado abierto se esconde la barra de abajo ' + JSON.stringify(k));
    await p.screenshot({ path: __dirname + '/capturas/g138-teclado.png' });
    await p.evaluate(() => document.activeElement.blur()); await p.setViewportSize({ width: 412, height: 860 }); await p.waitForTimeout(800);
    ok(!(await p.evaluate(() => document.documentElement.classList.contains('cfx-teclado'))), '3) al cerrar el teclado vuelve la barra');
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); }
  await t.cerrar();
  console.log(f ? '✗ ' + f + ' fallas' : '✓ G138 OK'); process.exit(f ? 1 : 0);
})();
