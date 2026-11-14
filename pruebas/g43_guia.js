// G43 · Como Josué (empresa nueva en Despega, celular):
//  1) "🚀 Tu tienda en 5 minutos": cada "Hacerlo" lleva DIRECTO al campo (no al menú) y abajo sale "💡 Cómo se hace".
//  2) Sale 1 vez por inicio de sesión: ✕ la esconde (recargar no la vuelve a sacar); al cerrar sesión y entrar de nuevo, vuelve.
//     "No mostrar más" → no vuelve nunca (ni al iniciar sesión). Ya no salta la ventana de la guía encima.
//  3) La 🧭 Guía del menú también lleva al campo (pasos del núcleo afinados por la app) y entre páginas (Caja → Nombre del producto).
//  4) 👆 Pistas animadas de deslizar (núcleo barra.js), máx. 2 veces. 5) Sin tarjetas repetidas de Instalar / Notificaciones.
// FALLA con el código viejo (los pasos iban a #ajustes = menú, sin ✕ ni "No mostrar más", sin pistas).
// Uso: ./base.sh /home/user/Aplicaciones p_g43 && node g43_guia.js
const { abrir } = require('./h');
const CAP = __dirname + '/capturas/Aplicaciones/';
(async () => {
  const t = await abrir('/home/user/Aplicaciones', process.argv[2] || 'p_g43', { conHola: true });
  let fallas = 0;
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fallas++; };
  try {
    await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Dulces Ana' }).catch(() => {});
    await t.sim.su('update public.profiles set terms_at = now()');
    const q = t.page;
    const entrar = async () => {
      await q.goto(t.base + '/'); await q.waitForTimeout(1500);
      await q.fill('input[type=email]:visible', 'tienda@x.cl'); await q.fill('input[type=password]:visible', 'clave123');
      await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3500);
      // Cuenta nueva: acepta Términos y privacidad (como haría Josué)
      await q.evaluate(() => document.querySelectorAll('dialog.cfx-hola[open]').forEach((d) => d.close()));
      const ley = q.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await q.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await q.waitForTimeout(1200); }
    };
    const salir = async () => { await q.evaluate(async () => { const k = Object.keys(localStorage).filter((x) => /auth/.test(x)); k.forEach((x) => localStorage.removeItem(x)); }); await q.goto(t.base + '/'); await q.waitForTimeout(800); };
    await q.goto(t.base + '/'); await q.waitForTimeout(800);
    await q.evaluate(() => { localStorage.clear(); localStorage.setItem('cfx:tour:orbita-inicio', '1'); });
    await entrar();
    const tarjeta = () => q.evaluate(() => { const c = document.getElementById('hoyFalta'); return !!c && !c.classList.contains('hidden') && c.getClientRects().length > 0; });
    ok(await tarjeta(), 'inicio: "🚀 Tu tienda en 5 minutos" en el Resumen');
    await q.waitForTimeout(4500);
    ok(!(await q.evaluate(() => [...document.querySelectorAll('dialog[open]')].some((d) => /Guía para partir/.test(d.textContent)))), 'no salta la ventana de la guía encima');
    ok(await q.locator('.cfx-gt').count() === 0, 'no hay tarjeta repetida del núcleo (la app tiene la suya)');
    ok(await q.locator('#hoyFalta [data-g]').count() >= 5 && await q.locator('#hoyFalta [data-nunca]').count() === 1 && await q.locator('#hoyFaltaX').count() === 1, 'pasos con "Hacerlo", ✕ y "No mostrar más"');
    await q.evaluate(() => document.getElementById('hoyFalta').scrollIntoView({ block: 'center' }));
    await t.foto('g43_tarjeta');
    // 1) Logo → hoja "Mi tienda" con el campo marcado + Cómo se hace
    const destino = async (g, id) => {
      await q.goto(t.base + '/'); await q.waitForTimeout(2500);
      await q.click('#hoyFalta [data-g="' + g + '"]'); await q.waitForTimeout(1600);
      return q.evaluate((id) => {
        const el = document.getElementById(id), lab = document.querySelector('label[for="' + id + '"]');
        const marcado = !!(el && (el.classList.contains('cfx-guia-foco') || (lab && lab.classList.contains('cfx-guia-foco'))));
        const tip = document.querySelector('.cfx-guia-tip'); const r = el && (el.getClientRects().length ? el : lab).getBoundingClientRect();
        return { hash: location.hash, marcado, tip: tip ? tip.textContent : '', enPantalla: !!r && r.top >= 0 && r.bottom <= innerHeight, hoja: !!document.querySelector('.cfx-hoja-m') };
      }, id);
    };
    const d1 = await destino(1, 'tLogo');
    ok(d1.hash === '#tienda' && d1.hoja && d1.marcado && /Cómo se hace/.test(d1.tip) && d1.enPantalla, 'Logo → directo al campo Logo (no al menú) con 💡 Cómo se hace ' + JSON.stringify(d1));
    await t.foto('g43_logo', q);
    await q.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await q.setViewportSize({ width: 320, height: 640 }); await q.waitForTimeout(300);
    ok(await t.anchoOk(), '320 px: sin correrse hacia el lado');
    await q.screenshot({ path: CAP + 'g43_logo_320_oscuro.png' });
    await q.setViewportSize({ width: 360, height: 740 }); await q.evaluate(() => document.documentElement.removeAttribute('data-theme'));
    const d2 = await destino(2, 'eTel');
    ok(d2.marcado && /912345678/.test(d2.tip), 'WhatsApp → directo al campo con su ayuda ' + JSON.stringify(d2));
    const d3 = await destino(3, 'tHorario');
    ok(d3.marcado && /Lun a Vie/.test(d3.tip), 'Horario → directo al campo ' + JSON.stringify(d3));
    // Entre páginas: Productos → Caja → Nombre del producto
    await q.goto(t.base + '/'); await q.waitForTimeout(2500);
    await q.click('#hoyFalta [data-g="4"]'); await q.waitForTimeout(4000);
    const d4 = await q.evaluate(() => ({ url: location.pathname + location.hash, marcado: !!document.querySelector('#p-nombre.cfx-guia-foco, label[for="p-nombre"].cfx-guia-foco'), tip: (document.querySelector('.cfx-guia-tip') || {}).textContent || '' }));
    ok(/apps\/caja\/#productos/.test(d4.url) && d4.marcado && /producto/i.test(d4.tip), 'Productos → Caja → campo Nombre marcado ' + JSON.stringify(d4));
    await t.foto('g43_producto', q);
    // 3) Guía del menú (núcleo) → WhatsApp también va al campo
    await q.goto(t.base + '/'); await q.waitForTimeout(2500);
    await q.evaluate(() => window.CFX_AYUDA.guia()); await q.waitForTimeout(500);
    const iw = await q.evaluate(() => { const b = [...document.querySelectorAll('dialog[open] .ca-it')].findIndex((x) => /WhatsApp/.test(x.textContent)); return b; });
    await q.click('dialog[open] .ca-it:nth-child(' + (iw + 1) + ') [data-i]'); await q.waitForTimeout(1600);
    ok(await q.evaluate(() => !!document.querySelector('#eTel.cfx-guia-foco')), '🧭 Guía del menú → WhatsApp directo al campo');
    // Políticas: RUT obligatorio (lo pide la ley) → la guía abre el campo RUT
    await q.goto(t.base + '/'); await q.waitForTimeout(2500);
    await q.evaluate(() => window.CFX_AYUDA.guia()); await q.waitForTimeout(500);
    const ip = await q.evaluate(() => [...document.querySelectorAll('dialog[open] .ca-it')].findIndex((x) => /Políticas/.test(x.textContent)));
    await q.click('dialog[open] .ca-it:nth-child(' + (ip + 1) + ') [data-i]'); await q.waitForTimeout(2500);
    const pr = await q.evaluate(() => ({ m: !!document.querySelector('#pf-rut.cfx-guia-foco'), tip: (document.querySelector('.cfx-guia-tip') || {}).textContent || '' }));
    ok(pr.m && /obligatorio/.test(pr.tip), 'Políticas → campo RUT marcado y dice que es obligatorio');
    await t.foto('g43_rut', q);
    // 2) ✕: recargar no la vuelve a sacar; cerrar sesión y entrar → vuelve
    await q.goto(t.base + '/'); await q.waitForTimeout(2500);
    await q.click('#hoyFaltaX'); await q.waitForTimeout(300);
    ok(!(await tarjeta()), '✕ la esconde');
    await q.reload(); await q.waitForTimeout(3000);
    ok(!(await tarjeta()), 'recargar: no vuelve (misma sesión)');
    await salir(); await entrar();
    ok(await tarjeta(), 'cerrar sesión y entrar: vuelve a salir');
    // "No mostrar más": ni al recargar ni al iniciar sesión otra vez
    await q.click('#hoyFalta [data-nunca]'); await q.waitForTimeout(300);
    ok(!(await tarjeta()), '"No mostrar más" la esconde');
    await salir(); await entrar();
    ok(!(await tarjeta()) && await q.locator('.cfx-gt').count() === 0, '"No mostrar más": no vuelve ni al iniciar sesión');
    // 5) Instalar / Notificaciones: sin tarjetas propias repetidas
    ok(await q.evaluate(() => document.getElementById('cInstalar').classList.contains('hidden') && document.getElementById('cPush').classList.contains('hidden') && !document.getElementById('cfxPush')), 'sin tarjetas repetidas de Instalar / Notificaciones');
    // 4) Pistas de deslizar (Caja: menú de pestañas o pantallas)
    await q.evaluate(() => Object.keys(localStorage).filter((k) => /^cfx:pista:/.test(k)).forEach((k) => localStorage.removeItem(k)));
    await q.goto(t.base + '/apps/caja/'); await q.waitForTimeout(800);
    let vio = false;
    for (let i = 0; i < 24 && !vio; i++) { vio = await q.locator('.cfx-pz').count() > 0; if (!vio) await q.waitForTimeout(250); }
    ok(vio, '👆 sale la pista animada de deslizar');
    if (vio) await t.foto('g43_pista', q);
    const veces = await q.evaluate(() => Object.keys(localStorage).filter((k) => /^cfx:pista:/.test(k)).map((k) => k + '=' + localStorage.getItem(k)));
    ok(veces.length >= 1, 'la pista queda contada (máx. 2 veces) ' + veces.join(','));
    await q.evaluate(() => ['barra', 'pantallas', 'pila', 'borrar'].forEach((k) => localStorage.setItem('cfx:pista:' + k, '2')));
    await q.reload(); await q.waitForTimeout(6000);
    ok(await q.locator('.cfx-pz').count() === 0, 'después de 2 veces ya no sale');
  } catch (e) { fallas++; console.log('✗ ' + e.message); await t.foto('g43_error').catch(() => {}); }
  const err = t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x));
  console.log('ERRORES:', err.join('\n') || 'ninguno');
  console.log(fallas ? 'FALLAS: ' + fallas : 'TODO OK');
  await t.cerrar();
  process.exit(fallas ? 1 : 0);
})();
