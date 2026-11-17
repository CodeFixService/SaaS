// G87 A · 🐞 1) CM → Control: el menú de secciones se desliza (dedo en la página = sección vecina; mouse = rueda y arrastre).
//          🐞 2) Control → Negocios: BiciTaller, Billetera, Estaciona y el CM ahora tienen su lista (cfx_cuentas_app).
// FALLA con el código viejo ("aún no tiene la lista de negocios"; deslizar la página no cambia de sección; la rueda no corre la tira).
// Uso: ANCHO=320 node g87a.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
(async () => {
  // ---------- 1) BiciTaller: el taller de prueba aparece en la lista ----------
  execSync(__dirname + '/base.sh /home/user/taller p_g87t', { stdio: 'ignore' });
  let t = await abrir('/home/user/taller', 'p_g87t'); let su = t.sim.su, como = comoDe(su);
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    const tid = (await su('select id from public.talleres'))[0].id;
    await t.sim.crearUsuario('cli@x.cl', 'clave123', { rol: 'cliente', taller: tid, nombre: 'Pedro' });
    let L = await como(ADM, "public.cfx_negocios('', 'negocio')");
    ok(Array.isArray(L) && L.length === 1 && L[0].nombre === 'Bici Ana' && L[0].email === 'taller@x.cl' && L[0].id, 'BiciTaller: el taller sale en Negocios con el correo del dueño ' + JSON.stringify(L).slice(0, 160));
    ok((await como(ADM, "public.cfx_negocios('TALLER@x', 'negocio')")).length === 1 && (await como(ADM, "public.cfx_negocios('zzz', 'negocio')")).length === 0, 'BiciTaller: busca por correo o nombre');
    L = await como(ADM, "public.cfx_negocios('', 'cliente')");
    ok(L.length === 1 && L[0].email === 'cli@x.cl', 'BiciTaller: el cliente con cuenta sale en Clientes');
    await como(ADM, "public.cfx_premium_cuenta($2::uuid, 'negocio', 30)", [(await su("select id from auth.users where email = 'taller@x.cl'"))[0].id]);
    const r = await como(ADM, "public.cfx_premium_cuenta($2::uuid, 'negocio', 0)", [(await su("select id from auth.users where email = 'taller@x.cl'"))[0].id]);
    ok(r && !r.error && (await su('select premium_hasta from public.talleres'))[0].premium_hasta === null, 'BiciTaller: se puede quitar el Premium desde el CM ' + JSON.stringify(r));
    let neg = null; try { await como('taller@x.cl', "public.cfx_negocios('', 'negocio')"); } catch (e) { neg = e.message; }
    ok(!!neg, 'BiciTaller: quien no es admin no puede ver la lista (' + String(neg).slice(0, 40) + ')');
  } catch (e) { console.log('✗ ' + e.message); f++; }
  await t.cerrar();

  // ---------- 2) Billetera ----------
  execSync(__dirname + '/base.sh /home/user/emprendedor p_g87b', { stdio: 'ignore' });
  t = await abrir('/home/user/emprendedor', 'p_g87b'); su = t.sim.su; como = comoDe(su);
  try {
    await t.sim.crearUsuario(ADM, 'admin123'); await su('select privado.fijar_admin()'); await t.sim.crearUsuario('dueno@x.cl', 'clave123');
    await su("insert into public.negocios (dueno, nombre) select id, 'Almacén Ana' from auth.users where email = 'dueno@x.cl' on conflict do nothing");
    const L = await como(ADM, "public.cfx_negocios('', 'negocio')");
    ok(Array.isArray(L) && L.length === 1 && L[0].nombre === 'Almacén Ana' && L[0].email === 'dueno@x.cl', 'Billetera: la billetera sale en Negocios ' + JSON.stringify(L).slice(0, 160));
    ok((await como(ADM, "public.cfx_negocios('', 'cliente')")).length === 0, 'Billetera: Clientes vacío sin error (entran por portal, sin cuenta)');
  } catch (e) { console.log('✗ ' + e.message); f++; }
  await t.cerrar();

  // ---------- 3) Estaciona ----------
  execSync(__dirname + '/base.sh /home/user/estacionamiento p_g87e', { stdio: 'ignore' });
  t = await abrir('/home/user/estacionamiento', 'p_g87e'); su = t.sim.su; como = comoDe(su);
  try {
    await t.sim.crearUsuario(ADM, 'admin123'); await t.sim.crearUsuario('b@x.cl', 'clave123'); await t.sim.crearUsuario('c@x.cl', 'clave123');
    await su("insert into public.estacionamientos (dueno, titulo, direccion, lat, lng) select id, 'Mi estacionamiento', 'Calle 1', -33.45, -70.66 from public.perfiles where email = 'b@x.cl'");
    const N = await como(ADM, "public.cfx_negocios('', 'negocio')"), C = await como(ADM, "public.cfx_negocios('', 'cliente')");
    ok(N.length === 1 && N[0].email === 'b@x.cl', 'Estaciona: quien publicó sale en Negocios ' + JSON.stringify(N).slice(0, 140));
    ok(C.length === 1 && C[0].email === 'c@x.cl', 'Estaciona: quien no ha publicado sale en Clientes (sin el admin)');
  } catch (e) { console.log('✗ ' + e.message); f++; }
  await t.cerrar();

  // ---------- 4) CM: lista propia + deslice del menú ----------
  execSync(__dirname + '/base.sh /home/user/saas p_g87a', { stdio: 'ignore' });
  t = await abrir('/home/user/saas', 'p_g87a', { tactil: true }); let p = t.page;
  try {
    await t.sim.crearUsuario(ADM, 'admin123'); await t.sim.crearUsuario('ana@x.cl', 'clave123');
    await p.goto(t.base + '/'); await p.fill('input[type=email]', ADM); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800); await t.sinModales();
    await p.goto(t.base + '/admin/#control'); await p.waitForTimeout(4000); await t.sinModales();
    const txt = await p.locator('#ngL').innerText();
    ok(/ana@x\.cl/.test(txt) && !/aún no tiene la lista/.test(txt), 'CM: Control → Negocios muestra las cuentas (antes: "aún no tiene la lista") ' + JSON.stringify(txt.slice(0, 60)));
    const cdp = await t.ctx.newCDPSession(p);
    const arrastre = async (x0, x1, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
      for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / 8, y }] }); await p.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(1500); };
    const est = () => p.evaluate(() => { const x = document.querySelector('#v-control .chips'); return { sl: x.scrollLeft, on: x.querySelector('.on').dataset.s, ancho: document.documentElement.scrollWidth <= innerWidth + 1 }; });
    const w = await p.evaluate(() => innerWidth), yT = (await p.locator('#v-control .chips').boundingBox()).y + 20, yP = (await p.locator('#v-control .titulo-v').boundingBox()).y + 12;  // sobre el título: sin campos ni tiras
    await arrastre(w - 40, 40, yT); let e = await est();
    ok(e.sl > 100 && e.on === 'negocios' && e.ancho, 'dedo sobre el menú: se corre el menú y no cambia de sección ' + JSON.stringify(e));
    await arrastre(w - 40, 40, yP); e = await est();
    ok(e.on === 'avisar', 'dedo en la página hacia la izquierda: pasa a 📣 Avisar ' + JSON.stringify(e));
    await arrastre(40, w - 40, yP); e = await est();
    ok(e.on === 'negocios', 'dedo en la página hacia la derecha: vuelve a 🏪 Negocios');
    await t.foto('g87a-control');
  } catch (x) { console.log('✗ ' + x.message); f++; }
  if (t.errores.length) console.log('ERRORES:', t.errores.slice(0, 5).join('\n'));
  await t.cerrar();
  // Computador (mouse): la rueda y el arrastre corren la tira; arrastrar no cuenta como toque.
  process.env.ANCHO = '1100'; t = await abrir('/home/user/saas', 'p_g87a'); p = t.page;
  try {
    await p.goto(t.base + '/'); await p.fill('input[type=email]', ADM); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800); await t.sinModales();
    await p.goto(t.base + '/admin/#control'); await p.waitForTimeout(4000); await t.sinModales();
    const b = await p.locator('#v-control .chips').boundingBox();
    const est = () => p.evaluate(() => { const x = document.querySelector('#v-control .chips'); return { sl: Math.round(x.scrollLeft), on: x.querySelector('.on').dataset.s, cabe: x.scrollWidth <= x.clientWidth + 4 }; });
    let e = await est();
    if (e.cabe) ok(true, 'computador: el menú cabe entero (no necesita correrse)');
    else {
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.wheel(0, 300); await p.waitForTimeout(400); e = await est();
      ok(e.sl > 100, 'computador: la rueda del mouse corre el menú ' + JSON.stringify(e));
      const s0 = e.sl; await p.mouse.move(b.x + b.width - 60, b.y + b.height / 2); await p.mouse.down(); await p.mouse.move(b.x + b.width - 260, b.y + b.height / 2, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(600); e = await est();
      ok(e.sl > s0 + 100 && e.on === 'negocios', 'computador: arrastrar con el mouse corre el menú y no cambia de sección ' + JSON.stringify(e));
      await p.locator('#v-control [data-s=cupones]').click(); await p.waitForTimeout(1200); e = await est();
      ok(e.on === 'cupones', 'computador: un clic normal sigue eligiendo la sección');
    }
  } catch (x) { console.log('✗ ' + x.message); f++; }
  if (t.errores.length) console.log('ERRORES:', t.errores.slice(0, 5).join('\n'));
  await t.cerrar(); console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
