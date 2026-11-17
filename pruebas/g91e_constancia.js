// G91 e · 🚲 BiciTaller G86 extras: 📄 Constancia para Carabineros (hoja con la bici, el reporte y cada escaneo con hora y coordenadas)
// en el pasaporte del taller y en la ficha del dueño + 📲 Avisar al dueño por WhatsApp (sin cuenta) con la última ubicación y su link.
// FALLA con el código viejo (no existen #paK, #paAv ni #bConst).
// Uso: ./base.sh /home/user/taller p_g91e && ANCHO=320 node g91e_constancia.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g91e');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    const dueno = (await su("select id from auth.users where email = 'taller@x.cl'"))[0].id;
    await su("insert into public.cfx_modulos_negocio (negocio, modulo, hasta) values ($1, 'pasaporte', now() + interval '30 days')", [dueno]);
    const pid = await como('taller@x.cl', "public.taller_pasaporte_guardar('{\"bici\":\"Trek Marlin 7\",\"serie\":\"WTU123456789\",\"dueno\":\"Pedro Pérez\",\"telefono\":\"+56911112222\"}')");
    const pa = (await su('select * from public.pasaportes where id = $1', [pid]))[0];
    await su("select public.pasaporte_reportar($1, $2, true, 'Afuera del metro', true)", [pa.token, pa.clave]);
    await su("select public.pasaporte_rastro($1, $2, -33.4489, -70.6693, 12)", [pa.token, 'a'.repeat(32)]);
    await su("select public.pasaporte_rastro($1, $2, -33.4400, -70.6500, 20)", [pa.token, 'b'.repeat(32)]);

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await p.evaluate(() => { location.hash = 'mas/pasaporte'; }); await p.waitForTimeout(2500);
    await p.click('[data-pa="' + pid + '"]'); await p.waitForTimeout(2000);
    ok(await p.locator('dialog[open] #paK').count() === 1 && await p.locator('dialog[open] #paAv').count() === 1, '📄 Constancia y 📲 Avisar al dueño en el pasaporte robado');
    const [hoja] = await Promise.all([t.ctx.waitForEvent('page'), p.click('dialog[open] #paK')]);
    await hoja.waitForLoadState(); const h = await hoja.locator('body').innerText();
    ok(/Constancia/.test(h) && /WTU123456789/.test(h) && /Afuera del metro/.test(h) && /-33\.448900, -70\.669300/.test(h) && /-33\.440000, -70\.650000/.test(h) && /Escaneos del QR \(2\)/.test(h), '📄 constancia: serie, nota y los 2 puntos con coordenadas');
    await hoja.screenshot({ path: __dirname + '/capturas/taller/g91e_constancia.png' }); await hoja.close();
    await p.evaluate(() => { window.open = (u) => { window.__wa = u; return null; }; });
    await p.click('dialog[open] #paAv'); await p.waitForTimeout(1500);
    const wu = decodeURIComponent(await p.evaluate(() => window.__wa || ''));
    ok(/56911112222/.test(wu) && /google\.com\/maps\?q=-33\.440000,-70\.650000/.test(wu) && /&c=/.test(wu), '📲 WhatsApp al dueño con la última ubicación y su link para seguirla');

    // Dueño en su ficha
    const q = await t.ctx.newPage();
    await q.goto(t.base + '/p/?t=' + pa.token + '&c=' + pa.clave); await q.waitForTimeout(4000);
    ok(await q.locator('#bConst').isVisible(), '🔐 el dueño también tiene 📄 Constancia');
    const [h2] = await Promise.all([t.ctx.waitForEvent('page'), q.click('#bConst')]);
    await h2.waitForLoadState(); ok(/Escaneos del QR \(2\)/.test(await h2.locator('body').innerText()), 'la del dueño trae los 2 escaneos'); await h2.close();
  } catch (x) { f++; console.log('✗ ' + x.message.split('\n')[0]); await t.foto('g91e_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
