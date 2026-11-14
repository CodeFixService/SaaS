// G43 · Tarjeta del núcleo "🚀 Termina de armar tu negocio" en una app sin tarjeta propia (BiciTaller): en el inicio, no encima;
// "Hacerlo" lleva al campo; ✕ hasta el próximo inicio de sesión. Uso: ./base.sh /home/user/taller p_g43t && node g43_taller.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g43t', { conHola: true });
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await t.sim.su('update public.perfiles set terminos_at = now()').catch(() => {});
    const q = t.page;
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.fill('input[type=email]:visible', 'taller@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter');
    await q.waitForTimeout(4000);
    await q.evaluate(() => document.querySelectorAll('dialog[open]:not(.cfx-ayuda)').forEach((d) => d.close()));
    const ley = q.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await q.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); }
    await q.waitForTimeout(5000);
    await q.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
    ok(await q.locator('#bienvenida .card').count() === 1 && await q.locator('.cfx-gt').count() === 0, 'usa su lista "Para empezar" sin tarjeta repetida del núcleo');
    ok(!(await q.evaluate(() => [...document.querySelectorAll('dialog[open]')].some((d) => /Guía para partir/.test(d.textContent)))), 'sin ventana de la guía encima');
    await q.evaluate(() => window.CFX_AYUDA.guia()); await q.waitForTimeout(500);
    await q.click('dialog[open] [data-i]'); await q.waitForTimeout(3500);
    const d = await q.evaluate(() => ({ url: location.pathname + location.hash, marcado: (document.querySelector('.cfx-guia-foco') || {}).outerHTML || '', tip: (document.querySelector('.cfx-guia-tip') || {}).textContent || '' }));
    ok(!!d.marcado && !!d.tip, '🧭 Guía del menú → campo marcado con Cómo se hace ' + JSON.stringify(d).slice(0, 300));
    await t.foto('g43_taller_campo');
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); await t.foto('g43t_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
