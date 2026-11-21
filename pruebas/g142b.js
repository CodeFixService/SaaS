// G142 b · 🚲 BiciTaller: recibir bici con INGRESO COMPLETO (núcleo CFX_INGRESO + CFX_CATALOGO) + 🧾 documento + 👤 cliente sin cuenta que se
// asocia SOLO al confirmar su correo (núcleo reclamar.sql + gancho cfx_reclamar_app). FALLA con el código viejo (no existen
// taller_ingreso_nueva, cfx_catalogo_*, el disparador ni la pantalla). Uso: ANCHO=320 node g142b.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const como = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
(async () => {
  execSync(__dirname + '/base.sh /home/user/taller p_g142b', { stdio: 'ignore' });
  const t = await abrir('/home/user/taller', 'p_g142b'); const p = t.page, su = t.sim.su, C = como(su);
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    const tid = (await su("select taller_id from public.perfiles where id = (select id from auth.users where email = 'taller@x.cl')"))[0].taller_id;
    // 📚 catálogo propio
    await C('taller@x.cl', "public.cfx_catalogo_sumar('bici', 'Bici Pepe 3000')");
    await C('taller@x.cl', "public.cfx_catalogo_sumar('bici', 'bici pepe 3000')");
    await C('taller@x.cl', "public.cfx_catalogo_sumar('Mala Lista!', 'x')");
    const mio = await C('taller@x.cl', "public.cfx_catalogo_mio('bici')");
    ok(JSON.stringify(mio) === '["Bici Pepe 3000"]', '📚 lo escrito queda en SU lista, sin repetir (' + JSON.stringify(mio) + ')');
    ok(/permission|denied/i.test(await falla(() => su("set role anon; select public.cfx_catalogo_mio('bici'); reset role")) || ''), '🔒 anon no lee catálogos');
    await su('reset role').catch(() => {});
    // 👤 cliente con cuenta SIN confirmar el correo
    await t.sim.crearUsuario('lu@x.cl', 'clave123', { rol: 'cliente', taller: tid, nombre: 'Lu' }).catch(async () => t.sim.crearUsuario('lu@x.cl', 'clave123', { rol: 'cliente', nombre: 'Lu' }));
    await su("update auth.users set email_confirmed_at = null where email = 'lu@x.cl'");
    const ing = { ficha: { bici: 'Trek Marlin 5', aro: '29', color: 'Negro', 'MALA KEY': 'x' }, accesorios: ['Luces', 'Candado'], estado: { Marco: 'ok', Frenos: 'rev', Ruedas: 'hackeo' }, serie: 'wtu123abc', notas: 'rayón', firma: '' };
    const id1 = await C('taller@x.cl', 'public.taller_ingreso_nueva($2)', [JSON.stringify({ nombre: 'Lu', telefono: '+56911112222', email: 'LU@x.cl', nota: 'frena mal', ingreso: ing })]);
    let r = (await su('select * from public.reservas where id = $1', [id1]))[0];
    ok(r.cliente_id === null && r.email === 'lu@x.cl', '🛡️ correo SIN confirmar → la orden NO se asocia');
    ok(r.bici === 'Trek Marlin 5 · aro 29 · Negro' && r.ingreso.serie === 'WTU123ABC' && !r.ingreso.ficha['MALA KEY'] && r.ingreso.estado.Ruedas === undefined && r.ingreso.estado.Frenos === 'rev',
      '📋 ingreso limpio (bici, serie, sin claves ni estados raros) ' + r.bici);
    await su("update auth.users set email_confirmed_at = now() where email = 'lu@x.cl'");
    r = (await su('select r.cliente_id, u.id from public.reservas r, auth.users u where r.id = $1 and u.email = $2', [id1, 'lu@x.cl']))[0];
    ok(r.cliente_id === r.id, '👤 al CONFIRMAR su correo, la orden pasa a su cuenta');
    const id2 = await C('taller@x.cl', 'public.taller_ingreso_nueva($2)', [JSON.stringify({ nombre: 'Lu', email: 'lu@x.cl', ingreso: {} })]);
    ok((await su('select cliente_id from public.reservas where id = $1', [id2]))[0].cliente_id === r.id, '👤 correo ya verificado → se asocia al tiro');
    const id3 = await C('taller@x.cl', 'public.taller_ingreso_nueva($2)', [JSON.stringify({ nombre: 'Otro', email: 'taller@x.cl', ingreso: {} })]);
    ok((await su('select cliente_id from public.reservas where id = $1', [id3]))[0].cliente_id === null, '🛡️ correo de un TALLER no se asocia como cliente');
    ok(/Firma no válida/.test(await falla(() => C('taller@x.cl', 'public.taller_ingreso_guardar($2, $3)', [id1, JSON.stringify({ firma: 'javascript:alert(1)' })])) || ''), '🛡️ firma que no es PNG → rechazada');
    ok(/Revisa el correo/.test(await falla(() => C('taller@x.cl', 'public.taller_ingreso_nueva($2)', [JSON.stringify({ nombre: 'X', email: 'no-es-correo' })])) || ''), '🛡️ correo mal escrito → rechazado');
    ok(/Sin acceso/.test(await falla(() => C('lu@x.cl', 'public.taller_ingreso_guardar($2, $3)', [id1, '{}'])) || ''), '🔒 un cliente no edita ingresos');
    // 🖥️ Pantalla: Recibir bici con ingreso completo
    await p.goto(t.base + '/'); await p.waitForTimeout(1500);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3500); await t.sinModales(p);
    await p.click('#hOrden'); await p.waitForSelector('#oIng .cfxi', { timeout: 8000 });
    await p.fill('#oN', 'Pedro'); await p.fill('#oT', '+56933334444'); await p.fill('#oE', 'pedro@x.cl');
    await p.click('#oB'); await p.keyboard.type('tre ma', { delay: 30 }); await p.waitForTimeout(300);
    const sug = await p.locator('.cfx-cat-l:visible button').allInnerTexts();
    ok(sug.length >= 3 && sug.every((x) => /^Trek Ma/.test(x)), '📚 "tre ma" → ' + sug.slice(0, 3).join(' | '));
    await p.locator('.cfx-cat-l:visible button', { hasText: 'Trek Marlin 7' }).click();
    ok(await p.inputValue('#oB') === 'Trek Marlin 7', '📚 tocar sugerencia = elegir');
    await p.fill('#oIng [data-f=aro]', '29'); await p.fill('#oIng [data-f=color]', 'Rojo');
    await p.click('#oIng [data-a="Luces"]'); await p.click('#oIng [data-a="Bombín"]');
    await p.click('#oIng [data-z="Marco"]'); await p.click('#oIng [data-z="Frenos"]'); await p.click('#oIng [data-z="Frenos"]');
    await p.fill('#oIng [data-serie]', 'abc987xyz');
    await p.setInputFiles('#oIng label:has-text("De la galería") input', __dirname + '/bici.png'); await p.waitForTimeout(800);
    ok(await p.locator('#oIng .cfxi-fotos img').count() === 1, '📸 foto al recibir (vista previa)');
    await p.locator('#oIng .cfxi-firma canvas').scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    const c = await p.locator('#oIng .cfxi-firma canvas').boundingBox();
    await p.mouse.move(c.x + 20, c.y + 40); await p.mouse.down(); await p.mouse.move(c.x + 80, c.y + 90, { steps: 8 }); await p.mouse.move(c.x + 150, c.y + 30, { steps: 8 }); await p.mouse.up();
    ok(await t.anchoOk(p), '🖥️ ancho ok del formulario'); await t.foto('g142b-recibir');
    await p.click('#oOk'); await p.waitForTimeout(3000);
    const r2 = (await su("select * from public.reservas where nombre = 'Pedro'"))[0];
    ok(r2 && r2.ingreso.accesorios.join() === 'Luces,Bombín' && r2.ingreso.estado.Marco === 'ok' && r2.ingreso.estado.Frenos === 'rev' && r2.ingreso.serie === 'ABC987XYZ' && /^data:image\/png/.test(r2.ingreso.firma) && r2.bici === 'Trek Marlin 7 · aro 29 · Rojo',
      '💾 se guardó todo: ' + JSON.stringify(r2 && Object.assign({}, r2.ingreso, { firma: (r2.ingreso.firma || '').length })));
    ok((await su("select count(*)::int n from public.fotos_trabajo where reserva_id = $1 and tipo = 'antes'", [r2.id]))[0].n === 1, '📸 la foto quedó como "Llegada"');
    const card = await p.locator('#dIngC').innerText().catch(() => '');
    ok(/Luces/.test(card) && /ABC987XYZ/.test(card) && /Frenos \(revisar\)/.test(card), '📋 la orden muestra el ingreso ' + JSON.stringify(card.slice(0, 160)));
    await t.foto('g142b-orden');
    await p.click('#dDoc'); await p.waitForTimeout(600);
    const doc = await p.locator('dialog[open]').innerText();
    ok(/Orden de trabajo N° [0-9A-F]{8}/.test(doc) && /Pedro/.test(doc) && /Firma del cliente/.test(doc), '🧾 documento de la orden con ingreso y firma');
    ok(await t.anchoOk(p), '🖥️ ancho ok del documento'); await t.foto('g142b-documento');
    await p.locator('dialog[open] [data-cerrar]').click();
    // ✏️ Editar ingreso
    await p.click('#dIng'); await p.waitForSelector('#iIng .cfxi'); await p.click('#iIng [data-a="Candado"]'); await p.click('#iOk'); await p.waitForTimeout(1500);
    ok((await su('select ingreso from public.reservas where id = $1', [r2.id]))[0].ingreso.accesorios.includes('Candado'), '✏️ editar ingreso guarda');
    // 🧾 Más → Órdenes y presupuestos
    await p.goto(t.base + '/taller/#mas'); await p.waitForTimeout(1500); await t.sinModales(p);
    await p.locator('text=Órdenes y presupuestos >> visible=true').first().click(); await p.waitForTimeout(1500);
    const lo = await p.locator('#oLista').innerText().catch(() => '');
    if (!/Pedro/.test(lo)) console.log('DBG', JSON.stringify((await p.locator('body').innerText()).slice(0, 500)));
    ok(/Pedro/.test(lo) && /Ingreso/.test(lo), '🧾 Más → Órdenes y presupuestos lista las bicis en el taller ' + JSON.stringify(lo.slice(0, 300)));
    await t.foto('g142b-ordenes');
  } catch (e) { ok(false, e.message.split('\n')[0]); }
  await t.cerrar();
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
