// G74c · 🧩 BiciTaller módulo ⭐ Reseñas en Google (reusa 'resenas' de Barbería).
// Sin módulo: Más → Perfil ofrece el módulo y la base NO entrega el link. Con él: el dueño pega el link (valida https) →
// orden entregada: ⭐ Pedir reseña (WhatsApp con el link) → cliente /r/ califica 5 ★ → ventana "⭐ Dejar reseña en Google"; con 3 ★ no.
// FALLA con el código viejo (no existen talleres.google_resenas, taller_google_guardar, #pGoo, #dGoo ni la ventana en /r/).
// Uso: ./base.sh /home/user/taller p_g74c && ANCHO=320 node g74c_resenas.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g74c');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const toca = async (sel, pg) => { pg = pg || p; await pg.evaluate((x) => document.querySelector(x).scrollIntoView({ block: 'center' }), sel); await pg.waitForTimeout(300); await pg.click(sel); };
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  const dialogo = (pg) => (pg || p).evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => d.innerText).join(' '));
  const cerrarDialogos = () => p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  const sinScroll = (pg) => (pg || p).evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const ir = async (h) => { await p.evaluate(() => { history.replaceState(null, '', '#hoy'); }); await p.reload(); await p.waitForTimeout(3500); await t.sinModales(); await p.evaluate((x) => { location.hash = x; }, h); await p.waitForTimeout(2000); };
  const LINK = 'https://g.page/r/BiciAna123/review';
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    await su("update public.talleres set premium_hasta = now() - interval '1 day', telefono = '+56955556666'");
    const dueno = (await su("select id from auth.users where email = 'taller@x.cl'"))[0].id;
    const hoy = (await su("select (now() at time zone 'America/Santiago')::date::text d"))[0].d;
    const nueva = async (nombre, hora) => {
      await como('taller@x.cl', "public.taller_reserva_manual($2::date, $3, null, $4, '+56911112222', 'Trek Marlin 7', '', true)", [hoy, hora, nombre]);
      const r = (await su('select id, token from public.reservas where nombre = $1', [nombre]))[0];
      await su("update public.reservas set items = $1::jsonb, total = 20000, estado = 'completada' where id = $2", [JSON.stringify([{ nombre: 'Mantención completa', cant: 1, precio: 20000 }]), r.id]);
      return r;
    };
    const r = await nueva('Pedro Pérez', '10:00');
    const r3 = await nueva('Juan Soto', '11:00');
    const r4 = await nueva('Luis Rojas', '12:00');

    // Venta prendida y sin comprar
    await su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
    ok((await su("select 'resenas' = any (public.cfx_modulos_app()) x"))[0].x, '🧩 BiciTaller vende ⭐ Reseñas en Google');
    await su('update public.talleres set google_resenas = $1', [LINK]);
    const sin = (await su('select public.reserva_calificar($1, 5, $2) r', [r4.token, '']))[0].r;
    ok(sin.ok && !sin.google, '🔒 sin módulo: calificar 5 ★ NO entrega el link de Google');
    await su('update public.talleres set google_resenas = null');

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await p.evaluate(() => { location.hash = 'mas/perfil'; }); await p.waitForTimeout(2000);
    ok(await p.locator('#pGoo [data-ofrecer="resenas"]').count() === 1, '🏪 Perfil sin módulo: "⭐ Reseñas en Google" → 🧩 Ver el módulo');
    ok(await p.locator('#pGLink').count() === 0, '🔒 sin módulo no aparece el campo del link');
    await toca('#pGoo [data-ofrecer="resenas"]'); await p.waitForTimeout(1500);
    ok(/Google/i.test(await dialogo()) && !/corte/i.test(await dialogo()), '▶️ abre la demo de ⭐ (sin hablar de "corte")');
    await cerrarDialogos();

    // Con el módulo: el dueño pega el link
    await su("insert into public.cfx_modulos_negocio (negocio, modulo, hasta) values ($1, 'resenas', now() + interval '30 days')", [dueno]);
    await ir('mas/perfil');
    ok(await p.locator('#pGLink').count() === 1, '⭐ con módulo: campo "Link para dejar reseña"');
    await p.fill('#pGLink', 'javascript:alert(1)'); await toca('#pGGuardar'); await p.waitForTimeout(1500);
    ok(/https/.test(await p.locator('#pGErr').innerText()), '🔐 link que no es https:// → error claro');
    await p.fill('#pGLink', LINK); await toca('#pGGuardar'); await p.waitForTimeout(2000);
    ok((await su('select google_resenas g from public.talleres'))[0].g === LINK, '💾 link guardado');
    ok(await sinScroll(), 'sin scroll horizontal a 320 px (perfil)');
    let err = ''; await su("insert into auth.users (id, email) values (gen_random_uuid(), 'otro@x.cl')").catch(() => {});
    await como('otro@x.cl', "public.taller_google_guardar('https://x.cl')").catch((e) => { err = e.message; });
    ok(/dueño/.test(err), '🔒 solo el dueño puede cambiar el link');

    // Orden entregada → ⭐ Pedir reseña por WhatsApp
    await ir('reservas');
    await p.evaluate((x) => { const e = document.querySelector('[data-tj="' + x + '"], [data-r="' + x + '"]'); e.scrollIntoView(); e.click(); }, r.id); await p.waitForTimeout(2500);
    const href = await p.locator('#dGoo').getAttribute('href').catch(() => '');
    ok(/wa\.me|whatsapp/.test(href || '') && decodeURIComponent(href || '').includes(LINK), '📲 orden entregada: "⭐ Pedir reseña" con el link por WhatsApp');
    ok(await sinScroll(), 'sin scroll horizontal a 320 px (orden)');
    await t.foto('g74c_orden');

    // 👤 Cliente: 5 ★ → ventana Google · 3 ★ → nada
    const q = await t.ctx.newPage();
    const calificar = async (tok, n) => {
      await q.goto(t.base + '/r/?t=' + tok); await q.waitForTimeout(3500);
      await toca('#est [data-n="' + n + '"]', q); await toca('#bCal', q); await q.waitForTimeout(2500);
    };
    await calificar(r.token, 5);
    ok((await q.locator('dialog[open] #bGoogle').getAttribute('href').catch(() => '')) === LINK, '⭐ /r/: tras 5 ★ sale "Dejar reseña en Google" con el link');
    ok(await sinScroll(q), 'sin scroll horizontal a 320 px (/r/ ventana)');
    await t.foto('g74c_cliente', q).catch(() => {});
    await calificar(r3.token, 3);
    ok(await q.locator('dialog[open] #bGoogle').count() === 0, '🙊 con 3 ★ no se le pide reseña en Google');
    ok((await su('select count(*)::int n from public.calificaciones'))[0].n === 3, '⭐ las 3 calificaciones quedaron guardadas');
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); await t.foto('g74c_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
