// G59 · 🚲 BiciTaller FREE: 🚦 tablero del taller en Hoy (‹ › mueve la bici), 📸 fotos de llegada/entrega GRATIS, 🧾 checklist de revisión (lo ve el cliente en /r/).
// FALLA con el código viejo (no existen #hTablero, taller_checklist ni reservas.checklist; las fotos eran Premium).
// Uso: ./base.sh /home/user/taller p_g59 && ANCHO=320 node g59_taller.js
const { abrir } = require('./h');
const fs = require('fs');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g59');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const toca = async (sel) => { await p.evaluate((x) => document.querySelector(x).scrollIntoView({ block: 'center' }), sel); await p.waitForTimeout(300); await p.click(sel); };
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    const hoy = (await su("select (now() at time zone 'America/Santiago')::date::text d"))[0].d;
    for (const [n, h] of [['Pedro Pérez', '10:00'], ['Luisa Soto', '11:00']])
      await como('taller@x.cl', "public.taller_reserva_manual($2::date, $3, null, $4, '+56911112222', 'Trek Marlin', '', true)", [hoy, h, n]);
    await su("update public.reservas set estado = 'recibida'");
    const id = (await su("select id from public.reservas where nombre = 'Pedro Pérez'"))[0].id;

    // Base: checklist validado
    let e = ''; try { await como('taller@x.cl', "public.taller_checklist($2, '{\"motor\": \"ok\"}')", [id]); } catch (x) { e = x.message; }
    ok(/no válido/.test(e), 'checklist rechaza puntos inventados (' + e + ')');

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await su('update public.talleres set premium_hasta = null');
    await p.reload(); await p.waitForTimeout(3500); await t.sinModales();

    // 🚦 Tablero
    const col = await p.evaluate(() => [...document.querySelectorAll('#hTablero .col')].map((c) => c.dataset.col + ':' + c.querySelectorAll('.tj').length).join(','));
    ok(col === 'recibida:2,en_reparacion:0,esperando_repuesto:0,lista:0', '🚦 tablero con 4 pasos y las 2 bicis en Recibida (' + col + ')');
    ok(!(await su('select public.taller_es_premium(id) p from public.talleres'))[0].p, 'el taller está en plan GRATIS');
    await p.evaluate(() => document.querySelector('#cTablero').scrollIntoView()); await t.foto('g59_tablero');
    await toca('#hTablero [data-tj="' + id + '"] [data-a="en_reparacion"]'); await p.waitForTimeout(1800);
    ok((await su('select estado from public.reservas where id = $1', [id]))[0].estado === 'en_reparacion', '› mueve la bici a En reparación');
    ok(await p.locator('#hTablero [data-col="en_reparacion"] [data-tj="' + id + '"]').count() === 1, 'la tarjeta quedó en su nueva columna');
    await toca('#hTablero [data-tj="' + id + '"] [data-a="recibida"]'); await p.waitForTimeout(1800);
    ok((await su('select estado from public.reservas where id = $1', [id]))[0].estado === 'recibida', '‹ la devuelve a Recibida');
    const ancho = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    ok(ancho, 'sin scroll horizontal de la página (el tablero se desliza dentro de su tarjeta)');

    // Abrir la orden desde el tablero
    await toca('#hTablero [data-tj="' + id + '"] b'); await p.waitForTimeout(2000);
    ok(await p.locator('#dCheck [data-ck]').count() === 10, '🧾 la orden muestra 10 puntos de revisión');
    await toca('#dCheck [data-ck="frenos"]'); await p.waitForTimeout(800);
    await toca('#dCheck [data-ck="frenos"]'); await p.waitForTimeout(800);
    await toca('#dCheck [data-ck="cadena"]'); await p.waitForTimeout(800);
    await toca('#dCheck [data-ck="cadena"]'); await p.waitForTimeout(800);
    await toca('#dCheck [data-ck="cadena"]'); await p.waitForTimeout(1200);
    const ck = (await su('select checklist c from public.reservas where id = $1', [id]))[0].c;
    ok(ck.frenos === 'ajuste' && ck.cadena === 'cambio' && Object.keys(ck).length === 2, 'toques guardan ✅ → 🔧 → 🔁 ' + JSON.stringify(ck));

    // 📸 Fotos gratis
    ok(!(await p.locator('#dFotos [data-plan]').count()), '📸 fotos sin candado Premium');
    await p.setInputFiles('#dFotos [data-ft="antes"]', __dirname + '/comprobante.png'); await p.waitForTimeout(2500);
    const nf = (await su('select count(*)::int n from public.fotos_trabajo where reserva_id = $1', [id]))[0].n;
    ok(nf === 1, 'foto de llegada guardada en plan gratis (' + nf + ')');
    ok(/Llegada/.test(await p.locator('#dFotos').innerText()), 'dice "Llegada" (no Antes/Después)');
    await p.evaluate(() => document.querySelector('#dCheck').scrollIntoView()); await t.foto('g59_orden');

    // Cliente: /r/ muestra la revisión
    const tok = (await su('select token from public.reservas where id = $1', [id]))[0].token;
    const c = await t.nuevo();
    await c.page.goto(t.base + '/r/?t=' + tok); await c.page.waitForTimeout(3000);
    const txt = await c.page.locator('#cCheck:not(.hidden)').innerText().catch(() => '');
    ok(/Frenos[\s\S]*Ajustado/.test(txt) && /Cadena[\s\S]*Cambiar/.test(txt), '👤 el cliente ve la revisión en su enlace');
    ok(await c.page.locator('#cFotos:not(.hidden) figcaption').count() === 1, '👤 el cliente ve la foto de llegada');
    await t.foto('g59_cliente', c.page);
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); await t.foto('g59_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
