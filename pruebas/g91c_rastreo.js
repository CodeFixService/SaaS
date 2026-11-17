// G91 c · 📍 BiciTaller RASTREO v2 (G87 B): el cliente registra su bici GRATIS en su app (🚲 Mis bicis + QR), el QR solo rastrea si el dueño
// la reporta, escanear = solo seguridad (sin historial), historial solo para el dueño con su clave, mapa Leaflet + OSM con el recorrido,
// y reportar/rastrear NO depende del módulo del taller. FALLA con el código viejo (no existen cliente_bicis, #cBicis, .bt-mapa, rastrear).
// Uso: ./base.sh /home/user/taller p_g91c && ANCHO=320 node g91c_rastreo.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g91c');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const toca = async (sel, pg) => { pg = pg || p; await pg.evaluate((x) => document.querySelector(x).scrollIntoView({ block: 'center' }), sel); await pg.waitForTimeout(300); await pg.click(sel); };
  const n = async (q, a) => (await su('select count(*)::int n from ' + q, a))[0].n;
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    const tid = (await su('select id from public.talleres'))[0].id;
    await t.sim.crearUsuario('cli@x.cl', 'clave123', { rol: 'cliente', taller: tid, nombre: 'Pedro' });
    await su("update public.perfiles set telefono = '+56911112222'");
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    // Venta de módulos prendida y el taller SIN el módulo pasaporte: la seguridad igual funciona
    await su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");

    // 1) Cliente: 🚲 Mis bicis → Registrar
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'cli@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    ok(/\/cliente\//.test(p.url()) && await p.locator('#cBicis').isVisible(), '🚲 la app del cliente muestra "Mis bicis · Seguridad gratis"');
    await toca('#bNuevaBici'); await p.waitForTimeout(600);
    await p.fill('dialog[open] #nbB', 'Trek Marlin 7'); await p.fill('dialog[open] #nbC', 'Rojo'); await p.fill('dialog[open] #nbS', 'WTU999');
    await p.click('dialog[open] #nbG'); await p.waitForTimeout(2000);
    const pa = (await su('select * from public.pasaportes'))[0] || {};
    ok(pa.bici === 'Trek Marlin 7' && pa.cliente_id && pa.taller_id === tid && !pa.robada, 'registrada: pasaporte del cliente en su taller, sin reporte');
    ok(await p.locator('#bicis li').count() === 1 && /Sin reporte · el QR no rastrea/.test(await p.locator('#bicis').innerText()), 'la lista dice "el QR no rastrea"');
    await toca('#bicis [data-bqr]'); await p.waitForTimeout(1500);
    ok(await p.locator('dialog[open]').count() >= 1, '🖨️ QR de seguridad para pegar en el cuadro');
    await t.foto('g91c_mis_bicis'); await t.sinModales();
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'cliente sin scroll horizontal a 320 px');

    // 2) Alguien escanea sin reporte: no se pide ubicación ni se ve el historial
    const { ctx: c2, page: e } = await t.nuevo();
    await c2.grantPermissions(['geolocation']); await c2.setGeolocation({ latitude: -33.4489, longitude: -70.6693, accuracy: 9 });
    await e.goto(t.base + '/p/?t=' + pa.token); await e.waitForTimeout(4500);
    ok(await e.locator('#cUbi').isHidden() && await e.locator('#cHist').isHidden(), '🔍 sin reporte: no pide ubicación ni muestra mantenciones');
    ok(/Sin reporte de robo/.test(await e.locator('#todo').innerText()), 'muestra solo "✅ Sin reporte de robo"');
    ok(await n('public.pasaporte_rastros') === 0, 'sin reporte NO se guardó nada');

    // 3) El dueño reporta desde su link (botón de su app) — sin módulo
    await toca('#bicis a[href*="&c="]'); await p.waitForTimeout(3500);
    ok(/\/p\/\?t=/.test(p.url()) && await p.locator('#cHist').isVisible(), '🔐 el dueño abre su ficha (con clave) y ve su historial');
    await toca('#bRobo'); await p.waitForTimeout(2500);
    ok((await su('select robada from public.pasaportes'))[0].robada === true, '🚨 reportó sin que el taller tenga el módulo');

    // 4) Escanean con reporte: ahora sí se comparte la ubicación
    await e.reload(); await e.waitForTimeout(6000);
    ok(await e.locator('#cUbi').isVisible(), '📍 con reporte, quien escanea comparte su ubicación');
    ok(await n('public.pasaporte_rastros where lat is not null') >= 1, 'ubicación guardada');
    await c2.setGeolocation({ latitude: -33.4400, longitude: -70.6500, accuracy: 9 });
    await su("update public.pasaporte_rastros set created_at = created_at - interval '2 minutes'");
    await e.waitForTimeout(4000);
    const pts = await n('public.pasaporte_rastros where lat is not null');

    // 5) Dueño: mapa Leaflet con el recorrido
    await p.reload(); await p.waitForTimeout(5000);
    ok(await p.locator('#ras .bt-mapa.leaflet-container').count() === 1, '🗺️ el dueño ve el mapa Leaflet (' + pts + ' punto/s)');
    ok(await p.locator('#ras .leaflet-interactive').count() >= 1, 'con el punto de la última ubicación');
    await p.evaluate(() => document.querySelector('#cRas').scrollIntoView({ block: 'center' })); await t.foto('g91c_mapa_dueno');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'ficha del dueño sin scroll horizontal');
    ok(await n("public.notificaciones where para = (select id from auth.users where email = 'cli@x.cl')") >= 1, '🔔 al cliente le llega el aviso');
  } catch (x) { f++; console.log('✗ ' + x.message.split('\n')[0]); await t.foto('g91c_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404|tile\.openstreetmap/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
