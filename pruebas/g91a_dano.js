// G91 a · 🚲 BiciTaller 📸 Foto del daño por ítem: el taller saca la foto en el ítem, el cliente la ve al aprobar el presupuesto en /r/,
// y si se quita el ítem la foto se borra. FALLA con el código viejo (no hay [data-fi], tipo 'dano' no existe).
// Uso: ./base.sh /home/user/taller p_g91a && ANCHO=320 node g91a_dano.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g91a');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const toca = async (sel, pg) => { pg = pg || p; await pg.evaluate((x) => document.querySelector(x).scrollIntoView({ block: 'center' }), sel); await pg.waitForTimeout(300); await pg.click(sel); };
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    const hoy = (await su("select (now() at time zone 'America/Santiago')::date::text d"))[0].d;
    await su(`select public.taller_reserva_manual($1::date, '10:00', null, 'Pedro Pérez', '+56911112222', 'Trek Marlin', '', true)
      from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = 'taller@x.cl'), true)) x`, [hoy]);
    await su(`update public.reservas set estado = 'recibida', total = 27000,
      items = '[{"nombre":"Cambio de cadena","cant":1,"precio":18000},{"nombre":"Pastillas de freno","cant":1,"precio":9000}]'`);
    const id = (await su("select id from public.reservas where nombre = 'Pedro Pérez'"))[0].id;
    const tok = (await su('select token from public.reservas where id = $1', [id]))[0].token;

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await toca('#hTablero [data-tj="' + id + '"] b'); await p.waitForTimeout(2500);
    ok(await p.locator('#dItems [data-fi]').count() === 2, '📷 cada ítem tiene "Foto del daño"');
    await p.setInputFiles('#dItems [data-fi="1"]', __dirname + '/bici.png'); await p.waitForTimeout(3000);
    let r = (await su('select items from public.reservas where id = $1', [id]))[0];
    const fid = r.items[1].foto;
    ok(/^[0-9a-f-]{36}$/.test(fid || ''), 'el ítem "Pastillas" guarda su foto (' + fid + ')');
    ok((await su("select count(*)::int n from public.fotos_trabajo where reserva_id = $1 and tipo = 'dano'", [id]))[0].n === 1, 'la foto queda como tipo daño');
    ok(await p.locator('#dItems .fd img').count() === 1, 'la miniatura sale en el ítem');
    ok(await p.locator('#dFotos figure').count() === 0, 'no se mezcla con las fotos de Llegada/Entrega');
    await p.evaluate(() => document.querySelector('#dItems').scrollIntoView({ block: 'center' })); await t.foto('g91a_taller');
    await toca('#dGuardar'); await p.waitForTimeout(1500);
    r = (await su('select items from public.reservas where id = $1', [id]))[0];
    ok(r.items[1].foto === fid, '💾 guardar mantiene la foto del ítem');

    // El cliente la ve al aprobar
    await su(`update public.reservas set presupuesto = '{"estado":"enviado"}', items = (select jsonb_agg(x || '{"aprob":"pend"}') from jsonb_array_elements(items) x) where id = $1`, [id]);
    const c = await t.nuevo(); const cp = c.page;
    await cp.goto(t.base + '/r/?t=' + tok); await cp.waitForTimeout(3500);
    ok(await cp.locator('#cPres:not(.hidden) .pi img.fdi[src^="data:image"]').count() === 1, '👤 el cliente ve la foto del daño en "Pastillas de freno"');
    await cp.evaluate(() => document.querySelector('#cPres').scrollIntoView({ block: 'center' })); await t.foto('g91a_cliente', cp);
    ok(await cp.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'cliente sin scroll horizontal');

    // Quitar el ítem borra la foto
    await p.reload(); await p.waitForTimeout(3500); await t.sinModales();
    await toca('#hTablero [data-tj="' + id + '"] b'); await p.waitForTimeout(2500);
    await toca('#dItems [data-x="1"]'); await toca('#dGuardar'); await p.waitForTimeout(1500);
    ok((await su("select count(*)::int n from public.fotos_trabajo where reserva_id = $1 and tipo = 'dano'", [id]))[0].n === 0, '🗑️ al quitar el ítem su foto se borra');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'taller sin scroll horizontal a 320 px');
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); await t.foto('g91a_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
