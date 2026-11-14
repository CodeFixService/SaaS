// G42g/h/i · CM: Resumen → Empresas solo con 🧹 Limpiar (Ver app, Panel, Respaldo → Apps), Control con ícono propio
// y textos que no se salen en 320 px (Negocios con módulos, Planes, Negocios). FALLA con el código viejo.
// Uso: ./base.sh /home/user/saas g42_cm && ./base.sh /home/user/Aplicaciones g42_apl && ANCHO=320 node g42_cm.js
const fs = require('fs');
const { abrir } = require('./h');
const { crear } = require('./sim');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const LARGO = 'tienda.de.ana.con.un.nombre.muy.largo.para.probar@correo-larguisimo.cl';
const REPOS = { SaaS: '/home/user/SaaS', Aplicaciones: '/home/user/Aplicaciones', Barberia: '/home/user/Barberia', Emprendedor: '/home/user/Emprendedor', Taller: '/home/user/Taller', Estacionamiento: '/home/user/Estacionamiento', Contenido: '/home/user/Contenido' };
// Textos que se salen de su caja o de la pantalla (lo que Josué ve "corrido/cortado").
const salidos = (sel) => [(s) => [...document.querySelectorAll(s)].filter((n) => { const r = n.getBoundingClientRect(), w = document.documentElement.clientWidth;
  return r.width && (r.right > w + 1 || r.left < -1 || (getComputedStyle(n).overflow === 'visible' && n.scrollWidth > n.clientWidth + 1)); }).map((n) => n.textContent.trim().slice(0, 40)), sel];
// Cuántas líneas ocupa un texto en pantalla (1 = no está partido).
const LINEAS = () => { window.lineas = (txt) => { const w = document.createTreeWalker(document.querySelector('dialog[open]') || document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const i = n.textContent.indexOf(txt); if (i < 0) continue; const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + txt.length);
    return new Set([...r.getClientRects()].filter((x) => x.width).map((x) => Math.round(x.top))).size; } return 0; }; };
(async () => {
  const t = await abrir('/home/user/saas', 'g42_cm');
  const ap = crear({ db: 'g42_apl', funciones: { enviar: () => ({ ok: true }) }, log: (m) => t.errores.push(m) });
  const p = t.page;
  try {
    await t.ctx.route(/raw\.githubusercontent\.com\/CodeFixService\//, (r) => {
      const u = new URL(r.request().url()), [, , repo, , ...ruta] = u.pathname.split('/'), f = (REPOS[repo] || '') + '/' + ruta.join('/');
      return fs.existsSync(f) ? r.fulfill({ status: 200, body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    });
    await ap.conectar(t.ctx, /https:\/\/gilsamacgappycibcqhq\.supabase\.co\//);
    await t.sim.crearUsuario(ADM, 'admin123');
    await ap.crearUsuario(ADM, 'admin123');
    await ap.crearUsuario(LARGO, 'clave123', { tipo: 'negocio', empresa: 'Tienda de Ana con un nombre bien largo' });
    await ap.su("update public.profiles set terms_at = now()");
    await p.goto(t.base + '/');
    await p.fill('input[type=email]', ADM); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800);
    // Conectar Despega en Apps
    await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(3000); await t.sinModales();
    const card = p.locator('[data-app=aplicaciones]');
    await card.locator('[data-a=con]').click(); await p.waitForTimeout(400);
    await p.fill('dialog #ce', ADM); await p.fill('dialog #cp', 'admin123'); await p.click('dialog #cok'); await p.waitForTimeout(2500); await t.sinModales();
    // G42g: en Apps están Ver app, Respaldo y limpieza y Respaldar todas
    const ap1 = await p.evaluate(() => ({ ver: document.querySelectorAll('#v-apps [data-a=ver]').length, limp: !!document.querySelector('[data-app=aplicaciones] [data-a=limp]'), todo: !!document.querySelector('#v-apps #resTodo') }));
    assert(ap1.ver === 7 && ap1.limp && ap1.todo, 'G42g Apps: Ver app, Respaldo y limpieza, Respaldar todas ' + JSON.stringify(ap1));
    await t.foto('g42_apps');
    // G42i: Módulos → vender + regalar a un negocio de correo largo → "Negocios con módulos" sin texto corrido
    await card.locator('[data-a=mod]').click(); await p.waitForTimeout(1500);
    await p.check('dialog #vOn'); await p.waitForTimeout(1500);
    await p.fill('dialog #rEmail', LARGO); await p.click('dialog #rOk'); await p.waitForTimeout(1500);
    await p.evaluate(LINEAS);
    const neg = await p.evaluate((LARGO) => { const d = document.querySelector('dialog[open]'), h = [...d.querySelectorAll('h3')].find((x) => /Negocios con/.test(x.textContent)), c = h && h.closest('.card');
      return { hay: !!(c && c.querySelector('li')), dentro: c ? [...c.querySelectorAll('li *')].every((n) => { const r = n.getBoundingClientRect(), rc = c.getBoundingClientRect(); return !r.width || r.right <= rc.right + 1; }) : false, ancho: d.scrollWidth <= d.clientWidth + 1, partido: lineas(LARGO) }; }, LARGO);
    if (neg.hay) { await p.locator('dialog h3', { hasText: 'Negocios con' }).scrollIntoViewIfNeeded(); }
    await t.foto('g42_modulos');
    assert(neg.hay && neg.dentro && neg.ancho && neg.partido === 1, 'G42i Negocios con módulos: correo largo dentro de la tarjeta ' + JSON.stringify(neg));
    await p.keyboard.press('Escape'); await t.sinModales();
    // G42g: Resumen → Empresas solo 🧹 Limpiar
    await p.goto(t.base + '/admin/#resumen'); await p.waitForTimeout(4000); await t.sinModales();
    const r = await p.evaluate(() => ({ limpia: document.querySelectorAll('#rEmp [data-limpia]').length, otros: [...document.querySelectorAll('#rEmp .emp a, #rEmp .emp button, #rEmp .titulo-v button')].filter((b) => !b.hasAttribute('data-limpia')).map((b) => b.textContent.trim()),
      txt: [...document.querySelectorAll('#rEmp [data-limpia]')].map((b) => b.textContent.trim())[0], cm: !!document.querySelector('[data-emp=cm] a') }));
    assert(r.limpia === 6 && !r.otros.length && /Limpiar$/.test(r.txt) && !r.cm, 'G42g Empresas: solo 🧹 Limpiar ' + JSON.stringify(r));
    await p.click('[data-emp=aplicaciones] h3'); await p.waitForTimeout(1500);
    const dl = await p.evaluate(() => { const d = document.querySelector('dialog[open]'); return [...d.querySelectorAll('.btns a, .btns button')].map((b) => b.textContent.trim()); });
    await t.foto('g42_empresa');
    assert(dl.length === 1 && /Limpiar$/.test(dl[0]), 'G42g detalle: solo 🧹 Limpiar ' + JSON.stringify(dl));
    await p.keyboard.press('Escape'); await t.sinModales();
    // G42h: Control con ícono distinto al de Ajustes
    const ic = await p.evaluate(() => { const g = (v) => (document.querySelector('nav.tabs [data-v=' + v + '] svg') || {}).innerHTML; return { c: g('control'), a: g('ajustes') }; });
    assert(ic.c && ic.a && ic.c !== ic.a, 'G42h Control ≠ Ajustes');
    // G42i: Control → Planes y Negocios (Despega) en 320 px
    await p.goto(t.base + '/admin/#control'); await p.waitForTimeout(3000); await t.sinModales();
    await p.click('#v-control [data-app=aplicaciones]'); await p.waitForTimeout(1500);
    await p.waitForTimeout(1500);
    const ng = await p.evaluate(...salidos('#ctlCuerpo .ng-f *')); await p.evaluate(LINEAS); const ngL = await p.evaluate((x) => lineas(x), LARGO);
    await t.foto('g42_negocios');
    await p.click('#v-control [data-s=planes]'); await p.waitForTimeout(2000);
    const pl = await p.evaluate(...salidos('#ctlCuerpo .fila, #ctlCuerpo .fila > *'));
    // Palabra partida en 2 líneas (ej. "Contact|os") = desordenado.
    const plTxt = await p.evaluate(() => [...document.querySelectorAll('#ctlCuerpo .fila[data-c] > .grow')].filter((n) => { const t = n.firstChild; if (!t) return false; let i = 0;
      return t.textContent.split(' ').some((w) => { const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + w.length); i += w.length + 1; return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size > 1; }); }).map((n) => n.textContent));
    await t.foto('g42_planes');
    assert(!ng.length && ngL === 1, 'G42i Control → Negocios: correo en 1 línea ' + JSON.stringify([ng, ngL]));
    assert(!pl.length && !plTxt.length, 'G42i Control → Planes ordenado (nombre con espacio) ' + JSON.stringify([pl, plTxt]));
    assert(await t.anchoOk(), 'ancho');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.filter((x) => !/raw\.githubusercontent|Failed to load resource|ERR_|db_version|workers\.dev/.test(x)).join('\n') || 'ninguno');
  await t.cerrar();
})();
