// G113 · 🎨 Uniformidad (núcleo): a) diálogo con LISTA (filas redondeadas) · b) 🗂️ CFX_CAJA (CM: espacios en caja, no chips) ·
// d) ☰ Más en PÁGINAS deslizables (pestañas, ⇅ ordenar ↑↓ y ✏️ nombre, queda guardado) · e) 🖥️ ≥ 900 px opciones en grilla pareja.
// FALLA con el código viejo (no hay .cfx-mm-pags, CFX_CAJA ni opción lista). Uso: ANCHO=320 node g113.js [estaciona barberia cm]
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const sinScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const APPS = {
  estaciona: ['/home/user/estacionamiento', 'p_g113_est', async (t, p) => {
    await t.sim.crearUsuario('d@x.cl', 'clave123'); await t.sim.su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = 'Beto'");
    await p.goto(t.base + '/#/avisos'); await p.waitForTimeout(1200); await p.click('button[data-t=in]'); await p.fill('#lEmail', 'd@x.cl'); await p.fill('#lClave', 'clave123'); await p.press('#lClave', 'Enter');
    await p.waitForTimeout(2500); await t.sinModales();
  }, async (p) => { await p.evaluate(() => { const b = [...document.querySelectorAll('nav.cfx-barra > a, nav.cfx-barra > button')].pop(); if (b) b.click(); }); await p.waitForTimeout(1500); }],
  barberia: ['/home/user/barberia', 'p_g113_bar', async (t, p) => {
    await t.sim.crearUsuario('d@x.cl', 'clave123', { rol: 'barberia', barberia: 'Barbería Juan', nombre: 'Juan', telefono: '+56912345671' });
    await t.sim.su('update public.profiles set clave_temporal = false, tour_visto = true where true').catch(() => {});
    await p.goto(t.base + '/'); await p.waitForTimeout(1500); await p.fill('input[type=email]:visible', 'd@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3500); await t.sinModales();
  }, async (p) => { await p.evaluate(() => { const b = [...document.querySelectorAll('nav.cfx-barra > a, nav.cfx-barra > button')].pop(); if (b) b.click(); }); await p.waitForTimeout(1500); }],
  despega: ['/home/user/Aplicaciones', 'p_g113_apl', async (t, p) => {
    await t.sim.crearUsuario('d@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' }); await t.sim.su('update public.profiles set terms_at = now()');
    await p.goto(t.base + '/'); await p.waitForTimeout(1500); await p.fill('input[type=email]:visible', 'd@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3500); await t.sinModales();
  }, async (p) => { await p.evaluate(() => { document.querySelectorAll('.cfx-tour').forEach((x) => x.remove()); const b = [...document.querySelectorAll('nav.cfx-barra > a, nav.cfx-barra > button')].pop(); if (b) b.click(); }); await p.waitForTimeout(1500);
    await p.evaluate(() => document.querySelectorAll('.cfx-tour').forEach((x) => x.remove())); }],
  billetera: ['/home/user/emprendedor', 'p_g113_emp', async (t, p) => {
    const u = await t.sim.crearUsuario('d@x.cl', 'clave123'); const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()'); await c.query("select public.crear_negocio('Almacén Ana','almacen',true)"); c.release();
    await p.goto(t.base + '/#ingresar'); await p.waitForTimeout(1500); await p.fill('input[type=email]:visible', 'd@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3500); await t.sinModales();
  }, async (p) => { await p.evaluate(() => { const b = [...document.querySelectorAll('nav.cfx-barra > a, nav.cfx-barra > button')].pop(); if (b) b.click(); }); await p.waitForTimeout(1500); }],
  bicitaller: ['/home/user/taller', 'p_g113_tal', async (t, p) => {
    await t.sim.crearUsuario('d@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Sur', nombre: 'Ana' }); await t.sim.su('update public.perfiles set terminos_at = now()').catch(() => {});
    await p.goto(t.base + '/'); await p.waitForTimeout(1500); await p.fill('input[type=email]:visible', 'd@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3500); await t.sinModales();
  }, async (p) => { await p.evaluate(() => { const b = [...document.querySelectorAll('nav.cfx-barra > a, nav.cfx-barra > button')].pop(); if (b) b.click(); }); await p.waitForTimeout(1500); }]
};

async function mas(t, n, hoja) {
  const p = t.page;
  await hoja(p);
  let r = await p.evaluate(() => { const P = document.querySelector('.cfx-mm-pags'); return P ? { pags: P.children.length, tabs: document.querySelectorAll('.cfx-mm-tab').length, on: (document.querySelector('.cfx-mm-tab.on') || {}).textContent,
    nombres: [...document.querySelectorAll('.cfx-mm-tab')].map((b) => b.textContent), ancho: P.clientWidth, pag0: P.children[0].getBoundingClientRect().width } : null; });
  ok(r && r.pags >= 2 && r.tabs === r.pags, n + ': ☰ Más en páginas (' + (r && r.pags) + ') con su pestaña cada una ' + JSON.stringify(r && r.nombres));
  if (!r) return;
  ok(Math.abs(r.pag0 - r.ancho) < 3, n + ': cada página ocupa el ancho entero (una categoría por página)');
  ok(await sinScroll(p), n + ': la página no se corre de lado');
  const n0 = r.nombres;
  await p.click('.cfx-mm-tab[data-mm-i="1"]'); await p.waitForTimeout(900);
  r = await p.evaluate(() => { const P = document.querySelector('.cfx-mm-pags'); return { x: P.scrollLeft, w: P.clientWidth, on: document.querySelector('.cfx-mm-tab.on').dataset.mmI }; });
  ok(Math.abs(r.x - r.w) < 4 && r.on === '1', n + ': tocar la 2.ª pestaña desliza a su página');
  // deslizar con la página (scroll nativo) marca la pestaña
  await p.evaluate(() => { const P = document.querySelector('.cfx-mm-pags'); P.scrollTo({ left: 0 }); }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelector('.cfx-mm-tab.on').dataset.mmI === '0'), n + ': deslizar de vuelta marca la 1.ª pestaña');
  // ⇅ Ordenar: bajar la 1.ª y cambiarle el nombre
  await p.click('[data-mm-ord]'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.querySelectorAll('.cfx-mm-of').length) === n0.length, n + ': ⇅ abre la lista de categorías');
  await p.click('[data-mm-baja="0"]'); await p.waitForTimeout(200);
  await p.click('[data-mm-nom="0"]'); await p.waitForTimeout(400); await p.fill('.cfx-dlg-i', 'Lo mío'); await p.click('.cfx-dlg-si'); await p.waitForTimeout(300);
  await p.click('.cfx-hoja-m .cfx-hm-x'); await p.waitForTimeout(900);
  r = await p.evaluate(() => [...document.querySelectorAll('.cfx-mm-tab')].map((b) => b.textContent));
  ok(r[0] === 'Lo mío' && r[1] === n0[0], n + ': quedó bajada la 1.ª y con el nombre nuevo ' + JSON.stringify(r.slice(0, 2)));
  await p.reload(); await p.waitForTimeout(3000); await t.sinModales(); await hoja(p);
  r = await p.evaluate(() => [...document.querySelectorAll('.cfx-mm-tab')].map((b) => b.textContent));
  ok(r[0] === 'Lo mío' && r[1] === n0[0], n + ': al volver a entrar sigue igual (guardado para esta persona)');
  // de fábrica
  await p.click('[data-mm-ord]'); await p.waitForTimeout(500); await p.click('[data-mm-fab]'); await p.waitForTimeout(900);
  r = await p.evaluate(() => [...document.querySelectorAll('.cfx-mm-tab')].map((b) => b.textContent));
  ok(JSON.stringify(r) === JSON.stringify(n0), n + ': "Volver al orden de fábrica" deja todo como estaba');
  // a) diálogo con lista · b) CFX_CAJA
  r = await p.evaluate(async () => { const pr = window.CFX_DIALOGO.confirmar('Se liberan 2', { lista: [{ t: 'Barbería', d: 'v3.41' }, 'Estaciona'] }); await new Promise((x) => setTimeout(x, 200));
    const li = [...document.querySelectorAll('.cfx-dlg-l li')], st = li[0] && getComputedStyle(li[0]); const out = { n: li.length, radio: st && parseFloat(st.borderRadius), fondo: st && st.backgroundColor, txt: li.map((x) => x.textContent) };
    document.querySelector('.cfx-dlg-no').click(); out.r = await pr; return out; });
  ok(r.n === 2 && r.radio >= 10 && r.fondo !== 'rgba(0, 0, 0, 0)' && r.txt[0] === 'Barberíav3.41' && r.r === false, n + ': 💬 diálogo con lista: cada una en su fila redondeada con fondo ' + JSON.stringify(r.txt));
  r = await p.evaluate(async () => { const c = document.createElement('div'); c.id = 'pCaja'; document.querySelector('.cfx-mm-pags').before(c); let el = null;
    window.CFX_CAJA.montar(c, { opciones: [1, 2, 3, 4, 5, 6].map((i) => ({ id: 'o' + i, t: 'Opción ' + i, color: '#22aa66' })), actual: 'o1', alElegir: (id) => { el = id; } });
    const a = c.querySelector('.ca-btn b').textContent; c.querySelector('.ca-btn').click(); const n2 = c.querySelectorAll('.ca-op').length; c.querySelector('[data-ca-op=o4]').click();
    const out = { a, n2, el, b: c.querySelector('.ca-btn b').textContent, cerrada: !c.querySelector('.ca-lista') }; c.remove(); return out; });
  ok(r.a === 'Opción 1' && r.n2 === 6 && r.el === 'o4' && r.b === 'Opción 4' && r.cerrada, n + ': 🗂️ CFX_CAJA: muestra la elegida, abre la lista hacia abajo y elige otra');
}

async function computador(t, n, hoja) {
  const p = t.page; await p.setViewportSize({ width: 1280, height: 800 }); await p.reload(); await p.waitForTimeout(3000); await t.sinModales(); await hoja(p);
  const r = await p.evaluate(() => { const l = document.querySelector('.cfx-mm-pag .cfx-aj.cfx-lista'); if (!l) return null; const F = [...l.children].filter((x) => x.classList.contains('cfx-fila'));
    const W = F.map((x) => Math.round(x.getBoundingClientRect().width)), H = F.map((x) => Math.round(x.getBoundingClientRect().height)), tops = new Set(F.map((x) => Math.round(x.getBoundingClientRect().top)));
    return { grid: getComputedStyle(l).display, W: [...new Set(W)], H: [...new Set(H)], filas: tops.size, n: F.length, linea: F[0] && getComputedStyle(F[0]).borderBottomWidth === getComputedStyle(F[0]).borderTopWidth }; });
  await t.foto('g113_' + n + '_pc');
  ok(r && r.grid === 'grid' && r.W.length === 1 && r.H.length === 1 && (r.n < 2 || r.filas < r.n) && r.linea, n + ': 🖥️ ≥ 900 px: opciones lado a lado, todas del mismo ancho y alto, en tarjeta ' + JSON.stringify(r));
  await p.setViewportSize({ width: Number(process.env.ANCHO) || 360, height: 740 });
}

(async () => {
  const pedidas = process.argv.slice(2);
  for (const [n, [repo, db, entrar, hoja]] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(n)) continue;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db, { dialogosApp: true });
    try {
      await entrar(t, t.page);
      for (const modo of ['light', 'dark']) { await t.page.emulateMedia({ colorScheme: modo }); console.log('— ' + n + ' ' + modo); await mas(t, n + ' ' + modo, hoja); await t.page.reload(); await t.page.waitForTimeout(2500); await t.sinModales(); }
      await t.foto('g113_' + n + '_mas'); await computador(t, n, hoja);
    } catch (e) { ok(false, n + ': ' + e.message.split('\n').filter((l) => /intercept|waiting|Timeout/.test(l)).slice(-3).join(' | ')); } finally { await t.cerrar(); }
  }
  // ---------- CM: espacios en la caja del núcleo (antes chips que se salían a la derecha) ----------
  if (!pedidas.length || pedidas.includes('cm')) {
    execSync(__dirname + '/base.sh /home/user/saas p_g113_cm', { stdio: 'ignore' });
    const t = await abrir('/home/user/saas', 'p_g113_cm'); const p = t.page;
    try {
      const u = await t.sim.crearUsuario('a@x.cl', 'clave123');
      await t.sim.su("insert into public.espacios (owner, nombre, color, modo, orden) values ($1,'Trabajo CodeFix','#2255ee','trabajo',1),($1,'Personal','#22aa55','personal',2),($1,'Cicloservice','#ee8822','trabajo',3)", [u.id]);
      await p.goto(t.base + '/'); await p.fill('input[type=email]', 'a@x.cl'); await p.fill('input[type=password]', 'clave123'); await p.press('input[type=password]', 'Enter');
      await p.waitForURL(/app/); await p.waitForTimeout(1500); await t.sinModales();
      await p.goto(t.base + '/app/#tablero'); await p.waitForTimeout(2500); await t.sinModales();
      let r = await p.evaluate(() => ({ caja: !!document.querySelector('#v-tablero #segEsp .ca-btn'), b: (document.querySelector('#v-tablero #segEsp .ca-btn b') || {}).textContent, chips: document.querySelectorAll('#v-tablero #segEsp > button').length }));
      ok(r.caja && r.b === 'Todo' && !r.chips, 'cm: 🗂️ el espacio se elige en la caja (no en chips) ' + JSON.stringify(r));
      await p.click('#v-tablero #segEsp .ca-btn'); await p.waitForTimeout(300);
      r = await p.evaluate(() => [...document.querySelectorAll('#v-tablero #segEsp .ca-op b')].map((b) => b.textContent));
      ok(r.length >= 6 && r[0] === 'Todo' && r.includes('Cicloservice') && r.includes('Trabajo'), 'cm: la lista trae Todo · Trabajo · Personal · cada espacio ' + JSON.stringify(r));
      ok(await sinScroll(p), 'cm: nada se sale a la derecha');
      await t.foto('g113_cm_esp');
      await p.click('#v-tablero #segEsp .ca-op:has-text("Cicloservice")'); await p.waitForTimeout(800);
      r = await p.evaluate(() => ({ b: (document.querySelector('#v-tablero #segEsp .ca-btn b') || {}).textContent, esp: window.CM.ui.esp }));
      ok(r.b === 'Cicloservice' && r.esp && r.esp.length > 30, 'cm: elegir Cicloservice filtra por ese espacio');
    } catch (e) { ok(false, 'cm: ' + e.message.split('\n').filter((l) => /intercept|waiting|Timeout/.test(l)).slice(-3).join(' | ')); } finally { await t.cerrar(); }
  }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ todo ok'); process.exit(f ? 1 : 0);
})();
