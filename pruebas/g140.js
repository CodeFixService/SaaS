// G140 · 🎨 Personalizar (núcleo): temas listos, barra de abajo (tipo, tamaño, nombre de cada botón) con vista previa,
//        ↩️ todo de fábrica y guardado en la base (cfx_personal: en otro celular queda igual).
// FALLA con el código viejo (sin CFX_PERSONAL ni [data-pe-tipo]). Uso: node g140.js   (ANCHO=320 opcional)
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  execSync(__dirname + '/base.sh /home/user/emprendedor p_g140', { stdio: 'ignore' });
  const t = await abrir('/home/user/emprendedor', 'p_g140'); const p = t.page;
  try {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123'); const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()'); await c.query("select public.crear_negocio('Almacén Ana','almacen',true)"); c.release();
    await p.goto(t.base + '/#ingresar'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'dueno@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(p);
    ok(await p.evaluate(() => !!(window.CFX_PERSONAL && window.CodeFixBarra.personal)), 'CFX_PERSONAL y CodeFixBarra.personal existen');
    const H = '.cfx-hoja-m';
    const abrirP = async () => { await t.sinModales(p); await p.evaluate(() => window.CFX_PERFIL.abrir('estilo')); await p.waitForTimeout(900); };
    await abrirP();
    ok(await p.locator(H + ' [data-pe-tipo]').count() === 5 && await p.locator(H + ' [data-pe-tam]').count() === 3 && await p.locator(H + ' [data-pe-tema]').count() === 7 && await p.locator(H + ' .cfx-pe-prev').count() === 1,
      '🎨 Personalizar: 7 temas, 5 tipos de barra, 3 tamaños y vista previa');
    ok(await t.anchoOk(p), '📱 la pantalla no se sale del ancho');
    await t.foto('g140-personalizar'); await p.evaluate(() => { const z = document.querySelector('.cfx-hoja-m [data-pe-barra]'); z.scrollIntoView(); }); await t.foto('g140-barra');
    // ---------- 📍 tipo y tamaño ----------
    await p.click(H + ' [data-pe-tipo=flotante]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.documentElement.dataset.cfxBtipo === 'flotante' && getComputedStyle(document.querySelector('nav.cfx-barra')).borderTopLeftRadius === '24px'), '📍 flotante: barra redondeada');
    ok(await p.locator(H + ' .cfx-pe-prev[data-tipo=flotante]').count() === 1, '👀 la vista previa cambia al tiro');
    await p.click(H + ' [data-pe-tam=grande]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.documentElement.dataset.cfxBtam === 'grande'), '📏 tamaño grande');
    // ---------- ✏️ nombre de un botón ----------
    const k0 = await p.evaluate(() => window.CodeFixBarra.personal.botones()[0].k);
    await p.click(H + ' .cfx-pe-nombres summary');
    const inp = p.locator(H + ' [data-pe-txt="' + k0 + '"]');
    await inp.fill('Mi casa'); await inp.dispatchEvent('change'); await p.waitForTimeout(300);
    const txt = () => p.evaluate((k) => { const b = window.CodeFixBarra.personal.botones().find((x) => x.k === k); return b && [...document.querySelectorAll('nav.cfx-barra > *')].find((e) => e.dataset.cfxT0 === b.t0).textContent.trim(); }, k0);
    ok(/Mi casa$/.test(await txt()), '✏️ el botón de la barra se llama "Mi casa" (' + await txt() + ')');
    await p.click(H + ' [data-pe-tipo=iconos]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => { const b = [...document.querySelectorAll('nav.cfx-barra > :not(.cfx-mas):not(.cfx-oculto)')][0]; return getComputedStyle(b).fontSize === '0px' && !!b.getAttribute('aria-label'); }), '◉ solo íconos: sin texto y con aria-label');
    await t.foto('g140-iconos');
    // ---------- 💾 en la base ----------
    await p.waitForTimeout(1800);
    const d = (await t.sim.su("select datos from public.cfx_personal where cuenta = $1", [u.id]))[0];
    ok(d && d.datos.barra.tipo === 'iconos' && d.datos.barra.tam === 'grande' && d.datos.barra.textos[k0] === 'Mi casa', '💾 guardado en la base (cfx_personal) ' + JSON.stringify(d && d.datos.barra));
    // Otro celular: sin nada guardado aquí, se trae lo de la base.
    await t.sim.su("update public.cfx_personal set datos = jsonb_set(jsonb_set(datos, '{barra,tipo}', '\"pildora\"'), '{v}', to_jsonb((extract(epoch from now()) * 1000 + 99999)::bigint)) where cuenta = $1", [u.id]);
    await p.evaluate(() => Object.keys(localStorage).filter((k) => /^cfx-(barra|pe-v|col|letra):/.test(k)).forEach((k) => localStorage.removeItem(k)));
    await p.reload(); await p.waitForTimeout(3500);
    ok(await p.evaluate(() => document.documentElement.dataset.cfxBtipo === 'pildora' && document.documentElement.dataset.cfxBtam === 'grande'), '📲 otro celular: se trae de la base (píldora, grande)');
    ok(/Mi casa$/.test(await txt()), '📲 y el nombre del botón también');
    // ---------- 🎨 tema listo ----------
    await abrirP();
    await p.click(H + ' [data-pe-tema=oceano]'); await p.waitForTimeout(400);
    const fondo = await p.evaluate(() => document.documentElement.style.getPropertyValue('--cfx-fondo').trim());
    ok(fondo === '#eaf4fb' || fondo === '#071824', '🌊 tema Océano aplicado (' + fondo + ')');
    // ---------- ↩️ todo de fábrica ----------
    await p.click(H + ' [data-pe-fab]'); await p.waitForTimeout(400); if (await p.locator('.cfx-dlg-si').count()) await p.click('.cfx-dlg-si'); await p.waitForTimeout(600);
    ok(await p.evaluate(() => !document.documentElement.dataset.cfxBtipo && !document.documentElement.dataset.cfxBtam && !document.documentElement.style.getPropertyValue('--cfx-fondo')), '↩️ todo de fábrica: barra y colores normales');
    ok(!/Mi casa/.test(await txt()), '↩️ el botón vuelve a su nombre (' + await txt() + ')');
    ok(!t.errores.filter((e) => !/favicon|ERR_|Failed to load/.test(e)).length, 'sin errores: ' + t.errores.slice(0, 3).join(' | '));
  } finally { await t.cerrar(); }
  // ---------- 2.ª app (Centro de Mando): lo mismo del núcleo ----------
  execSync(__dirname + '/base.sh /home/user/saas p_g140cm', { stdio: 'ignore' });
  const t2 = await abrir('/home/user/saas', 'p_g140cm'); const q = t2.page;
  try {
    await t2.sim.crearUsuario('ana@x.cl', 'clave123');
    await q.goto(t2.base + '/'); await q.waitForTimeout(1200);
    await q.fill('input[type=email]:visible', 'ana@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter');
    await q.waitForTimeout(3000); await t2.sinModales(q);
    await q.evaluate(() => window.CFX_PERFIL.abrir('estilo')); await q.waitForTimeout(900);
    ok(await q.locator('.cfx-hoja-m [data-pe-tema]').count() === 7, 'CM: 🎨 Personalizar con temas');
    const hayBarra = await q.locator('.cfx-hoja-m [data-pe-tipo]').count();
    if (hayBarra) { await q.click('.cfx-hoja-m [data-pe-tipo=pildora]'); await q.waitForTimeout(1800); }
    const d2 = (await t2.sim.su("select datos from public.cfx_personal"))[0];
    ok(!hayBarra || (d2 && d2.datos.barra.tipo === 'pildora'), 'CM: barra píldora guardada en la base (' + (hayBarra ? 'con barra' : 'sin barra en esta pantalla') + ')');
    ok(await t2.anchoOk(q), 'CM: no se sale del ancho');
    ok(!t2.errores.filter((e) => !/favicon|ERR_|Failed to load/.test(e)).length, 'CM sin errores: ' + t2.errores.slice(0, 3).join(' | '));
  } finally { await t2.cerrar(); }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ todo ok'); process.exit(f ? 1 : 0);
})();
