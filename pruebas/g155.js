// G155 · 🔧 Túnel de fallas: CM → Mensajes → 🐞 Fallas. Una falla 🔧 Lista (la marcó Claude) muestra la nota y SOLO el admin la cierra
// (✅ Revisada) o la devuelve (↩️ Sigue fallando). 🔧 Túnel para Claude crea la llave (la base guarda solo su sha256) y la cierra.
// Uso: ANCHO=320 node g155.js   (el SQL de las 6 bases se prueba en g155.sql)
const { abrir } = require('./h'); const { execSync } = require('child_process'); const crypto = require('crypto');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const login = async (p, base, em, pw) => { await p.goto(base + '/'); await p.waitForTimeout(800); await p.fill('input[type=email]:visible', em); await p.fill('input[type=password]:visible', pw); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(3000); };
(async () => {
  execSync(__dirname + '/base.sh /home/user/saas p_g155', { stdio: 'ignore' });
  const t = await abrir('/home/user/saas', 'p_g155', { dialogosApp: true }); const p = t.page;
  try {
    await p.setViewportSize({ width: +(process.env.ANCHO || 320), height: 680 });
    const em = (await t.sim.su('select public.admin_email() e'))[0].e;
    await t.sim.crearUsuario(em, 'admin123'); const u = await t.sim.crearUsuario('ana@x.cl', 'clave123');
    await t.sim.su("insert into public.cfx_fallas (id, cuenta, email, nombre, rol, texto, estado, arreglo, listo) values (77, $1, 'ana@x.cl', 'Ana', 'cliente', 'El carrito no suma', 'listo', '🔧 24-11 10:00 · el total ahora suma el despacho (7.00)', now())", [u.id]);
    await login(p, t.base, em, 'admin123');
    const abrirM = async () => { await p.goto(t.base + '/admin/#mensajes'); await p.waitForTimeout(800); await p.reload(); await p.waitForTimeout(3000); await t.sinModales(); };
    await abrirM();
    const card = p.locator('[data-f]').first();
    ok(/Lista para revisar/.test(await card.textContent()), 'tarjeta 🔧 Lista para revisar');
    ok(await p.locator('.pill', { hasText: 'por revisar' }).count() === 1, 'contador 🔧 por revisar');
    ok(await t.anchoOk(), 'ancho sin scroll de lado');
    await card.click(); await p.waitForTimeout(1200);
    let md = p.locator('dialog[open]').last();
    ok(/el total ahora suma el despacho/.test(await md.textContent()), 'muestra lo que arregló Claude');
    ok(await md.locator('[data-re]').count() === 1 && /Revisada/.test(await md.locator('[data-si]').textContent()), 'botones ↩️ Sigue fallando y ✅ Revisada');
    ok((await t.sim.su('select estado from public.cfx_fallas where id = 77'))[0].estado === 'listo', 'abrirla no la cierra ni la cambia');
    await t.foto('g155-lista', p);
    await md.locator('[data-t]').fill('en oscuro no se ve'); await md.locator('[data-re]').click(); await p.waitForTimeout(1500);
    let r = (await t.sim.su('select estado, arreglo from public.cfx_fallas where id = 77'))[0];
    ok(r.estado === 'revisando' && /Sigue fallando: en oscuro no se ve/.test(r.arreglo), '↩️ vuelve a Revisando con la nota para Claude');
    await t.sim.su("update public.cfx_fallas set estado = 'listo' where id = 77");
    await abrirM(); await p.locator('[data-f]').first().click(); await p.waitForTimeout(1200);
    md = p.locator('dialog[open]').last(); await md.locator('[data-si]').click(); await p.waitForTimeout(1500);
    r = (await t.sim.su('select estado, resuelto from public.cfx_fallas where id = 77'))[0];
    ok(r.estado === 'real' && r.resuelto, '✅ Revisada la cierra (solo el admin)');
    // 📥 Descargar fallas: .html con tabla, foto, texto y descripción; sin correo ni nombre; NO cambia el estado.
    const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    await t.sim.su("insert into public.cfx_fallas (id, cuenta, email, nombre, rol, texto, foto, datos) values (78, $1, 'ana@x.cl', 'Ana', 'negocio', 'El precio sale <b>mal</b>', $2, '{\"version\":\"5.85\",\"pantalla\":\"/#caja\",\"errores\":[{\"m\":\"x is undefined\"}]}')", [u.id, PNG]);
    await abrirM();
    const bj = p.locator('[data-bajar]');
    ok(await bj.count() === 1 && /Descargar fallas \(1\)/.test(await bj.textContent()), 'botón 📥 Descargar fallas (1)');
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), bj.click()]);
    const html = require('fs').readFileSync(await dl.path(), 'utf8');
    ok(/^fallas-\d{4}-\d{2}-\d{2}\.html$/.test(dl.suggestedFilename()), 'archivo ' + dl.suggestedFilename());
    ok(html.includes('<img src="' + PNG) && html.includes('El precio sale &lt;b&gt;mal&lt;/b&gt;') && /Versión:<\/b> 5\.85/.test(html) && html.includes('x is undefined'), 'tabla con foto, texto (escapado) y descripción');
    ok(!html.includes('ana@x.cl') && !html.includes('>Ana<'), 'sin correo ni nombre');
    const js = JSON.parse(/<script type="application\/json" id="fallas">([\s\S]*?)<\/script>/.exec(html)[1]);
    ok(js.length === 1 && js[0].id === 78 && js[0].app === 'cm', 'datos para Claude dentro del archivo');
    ok((await t.sim.su('select estado from public.cfx_fallas where id = 78'))[0].estado === 'nuevo', 'descargar no cambia el estado');
    { const q = await t.nuevo(); await q.page.setViewportSize({ width: 320, height: 680 }); await q.page.setContent(html); await q.page.waitForTimeout(300);
      ok(await q.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'el archivo se lee a 320 px'); await q.page.screenshot({ path: __dirname + '/capturas/saas/g155-archivo.png' }); }
    // 🔧 Túnel para Claude
    await abrirM(); await p.locator('[data-tunel]').click(); await p.waitForTimeout(1500);
    md = p.locator('dialog[open]').last();
    ok(/cerrado/.test(await md.textContent()), 'túnel parte cerrado');
    await md.locator('[data-n]').click(); await p.waitForTimeout(500);
    if (await p.locator('.cfx-dlg-si').count()) await p.click('.cfx-dlg-si');
    await p.waitForTimeout(2000);
    const k = (await md.locator('[data-k]').textContent() || '').trim();
    const h = (await t.sim.su('select hash from public.cfx_tunel'))[0];
    ok(/^cfx_[0-9a-f]{64}$/.test(k) && h && h.hash === crypto.createHash('sha256').update(k).digest('hex'), 'llave creada: la base guarda solo su huella');
    ok(/abierto/.test(await md.textContent()), 'estado 🟢 abierto');
    ok(await t.anchoOk(), 'ventana del túnel sin scroll de lado');
    await t.foto('g155-tunel', p);
    await md.locator('[data-x]').click(); await p.waitForTimeout(500);
    if (await p.locator('.cfx-dlg-si').count()) await p.click('.cfx-dlg-si');
    await p.waitForTimeout(1500);
    ok((await t.sim.su('select count(*)::int n from public.cfx_tunel'))[0].n === 0, '🚫 Cerrar túnel borra la llave');
  } catch (e) { ok(false, e.message.split('\n')[0]); await t.foto('g155-error', p); }
  const E = t.errores.filter((x) => !/favicon|push|Notification|404.*\.png/i.test(x));
  console.log('ERRORES:', E.join('\n') || 'ninguno');
  await t.cerrar(); console.log(f ? 'G155 FALLA (' + f + ')' : 'G155 OK'); process.exit(f ? 1 : 0);
})();
