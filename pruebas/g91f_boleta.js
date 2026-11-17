// G91 f · 🚲 BiciTaller 🧾 Boleta en 💵 Caja: cada cobro tiene 🧾 → anotar el N° de la boleta del SII (queda en el cierre) + 🧾 Comprobante
// (núcleo comprobante.js: imprimir, PDF, WhatsApp) con la boleta. FALLA con el código viejo (no existen [data-bol] ni taller_caja_boleta).
// Uso: ./base.sh /home/user/taller p_g91f && ANCHO=320 node g91f_boleta.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g91f');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    await su(`select public.taller_caja_vender('[{"nombre":"Cámara 29","cant":2,"precio":5000}]', 'efectivo', 'Pedro')
      from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = 'taller@x.cl'), true)) x`);
    const kid = (await su('select id from public.caja'))[0].id;
    let e = ''; try { await su("select public.taller_caja_boleta($1, '123')", [kid]); } catch (x) { e = x.message; }
    ok(/Sin acceso/.test(e), '🔒 sin sesión del taller no se puede anotar');

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await p.evaluate(() => { location.hash = 'mas/caja'; }); await p.waitForTimeout(2500);
    ok(await p.locator('[data-bol]:visible').count() === 1, '🧾 el cobro tiene su botón de boleta');
    await p.locator('[data-bol]:visible').click(); await p.waitForTimeout(800);
    await p.fill('dialog[open] #boF', 'N° 4567'); await t.foto('g91f_boleta');
    await p.click('dialog[open] #boG'); await p.waitForTimeout(2000);
    ok((await su('select boleta from public.caja'))[0].boleta === '4567', '💾 N° 4567 guardado (solo dígitos)');
    ok(/Boleta N° 4567/.test(await p.locator('#kLista:visible').innerText()), 'el cierre muestra "🧾 Boleta N° 4567"');
    await p.locator('[data-bol]:visible').click(); await p.waitForTimeout(800);
    await p.click('dialog[open] #boC'); await p.waitForTimeout(2500);
    const txt = await p.evaluate(() => document.body.innerText);
    ok(/Cámara 29/.test(txt) && /10\.000/.test(txt) && /4567/.test(txt), '🧾 comprobante con ítems, total y N° de boleta');
    await t.foto('g91f_comprobante');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin scroll horizontal a 320 px');
  } catch (x) { f++; console.log('✗ ' + x.message.split('\n')[0]); await t.foto('g91f_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
