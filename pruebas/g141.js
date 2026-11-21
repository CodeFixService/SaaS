// G141 · 📱 Mis redes con ícono + 🎬 Estudio por link (núcleo 3.37). Se prueba en Billetera como Josué:
//   💡 "No sé qué publicar" → ideas al tiro sin base · 🔗 link de TikTok → red, tipo y fecha exacta · 📸 pantallazo de estadísticas
//   leído con OCR EN el teléfono (Tesseract servido local) · 📊 gráficos vs SU promedio + qué hacer · 📱 Mis redes: pega link → ícono,
//   validado en el servidor · el cliente las ve en su link (c/). FALLA con el código viejo (no hay EstLinks ni cfx_redes_*).
// Uso: node g141.js   (ANCHO=320 opcional)
const { abrir } = require('./h');
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const OCR = process.env.OCR_DIR || '/tmp/claude-0/-home-user/da8d1fa7-0336-5893-b209-46468260fa81/scratchpad/ocr/node_modules';
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
(async () => {
  execSync(__dirname + '/base.sh /home/user/emprendedor p_g141', { stdio: 'ignore' });
  const t = await abrir('/home/user/emprendedor', 'p_g141'); const p = t.page, su = t.sim.su;
  try {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123'); const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()');
    await c.query("select public.crear_negocio('Almacén Ana','almacen',true)");
    await c.query("select public.crear_cliente('Juan Pérez', '', '+56912345678', null, null, null, '1234', 90000, true, true)");
    c.release();
    const codigo = (await su('select link_codigo from public.clientes limit 1'))[0].link_codigo;
    const como = async (expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', $1, true)) x", [u.id].concat(args || [])))[0].r;
    // Tesseract (cdn.jsdelivr.net) servido desde node_modules: el mismo archivo que baja el teléfono.
    const MAPA = [[/tesseract\.js@v?5\.1\.1\/dist\/(.+)$/, 'tesseract.js/dist/'], [/tesseract\.js-core@[^/]+\/(.+)$/, 'tesseract.js-core/'], [/@tesseract\.js-data\/spa\/(?:[^/]+\/)?(4\.0\.0_best_int\/.+)$/, '@tesseract.js-data/spa/']];
    let pidioTess = 0;
    await p.context().route(/cdn\.jsdelivr\.net\/npm\/(tesseract|@tesseract)/, (r) => {
      const url = r.request().url().split('?')[0]; pidioTess++;
      for (const [re, dir] of MAPA) { const m = re.exec(url); if (m) { const fp = path.join(OCR, dir, m[1]); if (fs.existsSync(fp)) return r.fulfill({ status: 200, body: fs.readFileSync(fp), headers: { 'access-control-allow-origin': '*', 'content-type': /\.wasm$/.test(fp) ? 'application/wasm' : /\.js$/.test(fp) ? 'application/javascript' : 'application/octet-stream' } }); } }
      return r.fulfill({ status: 404, body: 'no' });
    });
    await p.goto(t.base + '/#ingresar'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'dueno@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(p);
    // ---------- 🎬 Estudio: 💡 sin base ----------
    await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
    await como("public.cfx_modulo_probar('estudio')");
    await p.goto(t.base + '/app/#estudio'); await p.reload(); await p.waitForTimeout(3500);
    ok(await p.evaluate(() => !!window.EstLinks), '🎬 Estudio carga est-links.js (núcleo)');
    ok(await p.locator('text=¿No sabes qué publicar?').count() === 1, '💡 sin base: "¿No sabes qué publicar?" con 1 botón');
    ok(await t.anchoOk(p), '📱 no se sale del ancho');
    await p.fill('#cfxEstQue', 'empanadas'); await p.click('[data-e=fabrica]'); await p.waitForTimeout(2500);
    const nb = +(await su("select count(*) n from public.cfx_estudio where tipo = 'base'"))[0].n;
    ok(nb >= 20, '✨ base de fábrica guardada (' + nb + ' filas, tema Empanadas)');
    const gancho = await p.evaluate(() => (document.querySelector('.cfx-est .e-card .e-txt, .cfx-est .e-card p') || {}).textContent || '');
    ok(await p.locator('.cfx-est [data-e=copiar]').count() >= 5, '✨ salió la idea al tiro con sus cajas 📋 (' + gancho.slice(0, 60) + ')');
    await t.foto('g141-idea-sin-base');
    // ---------- 🔗 por link + 📸 pantallazo ----------
    await p.click('.cfx-est [data-v=bi]'); await p.waitForTimeout(600);
    await p.click('[data-e=link]'); await p.waitForTimeout(600);
    await p.fill('[data-el=link]', 'https://www.tiktok.com/@almacenana/video/7311234567890123456?is_from_webapp=1');
    const det = await p.textContent('[data-el=det]');
    ok(/TikTok/.test(det) && /Video/.test(det) && /11\/12\/2023/.test(det) && !/aprox/.test(det), '🔗 link de TikTok → red, tipo y fecha exacta (' + det.trim() + ')');
    ok(await p.inputValue('[data-el=fecha]') === '2023-12-11', '📅 la fecha se llena sola');
    // pantallazo de "Estadísticas" (como lo muestra TikTok), hecho imagen
    const pg = await p.context().newPage(); await pg.setViewportSize({ width: 390, height: 520 });
    await pg.setContent('<body style="font:22px Arial;padding:24px;background:#fff;color:#111"><h2>Estadísticas del video</h2>' +
      [['Visualizaciones del video', '12,5 mil'], ['Me gusta', '842'], ['Comentarios', '37'], ['Compartidos', '64'], ['Guardados', '128'], ['Nuevos seguidores', '23']].map(([a, b]) => '<div style="display:flex;justify-content:space-between;margin:14px 0"><span>' + a + '</span><b>' + b + '</b></div>').join('') + '</body>');
    const img = path.join(__dirname, 'capturas', 'g141-estadisticas.png'); fs.mkdirSync(path.dirname(img), { recursive: true }); await pg.screenshot({ path: img }); await pg.close();
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-el=foto]')]);
    await fc.setFiles(img);
    await p.waitForFunction(() => /Leí|No encontré|⚠️/.test((document.querySelector('[data-el=estado]') || {}).textContent || ''), null, { timeout: 120000 }).catch(() => {});
    const est = await p.textContent('[data-el=estado]'); console.log('   OCR:', JSON.stringify(await p.evaluate(() => window.EstLinks.ultimoTexto)));
    const M = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-elm]')].map((i) => [i.dataset.elm, i.value])));
    ok(pidioTess > 0 && M.vistas === '12500' && M.me_gusta === '842' && M.comentarios === '37' && M.compartidos === '64' && M.guardados === '128' && M.seguidores === '23',
      '📸 OCR en el teléfono leyó los 6 números (' + est.trim() + ' ' + JSON.stringify(M) + ')');
    await t.foto('g141-link-pantallazo');
    await p.fill('[data-elm=clientes]', '2'); await p.fill('[data-el=titulo]', 'Empanadas de pino recién salidas'); await p.fill('[data-el=tema]', 'Empanadas');
    await p.click('[data-el=guardar]'); await p.waitForTimeout(1500);
    const g = (await su("select fecha, datos from public.cfx_estudio where tipo = 'idea' and estado = 'publicada'"))[0];
    ok(g && String(g.fecha.toISOString ? g.fecha.toISOString() : g.fecha).slice(0, 10) <= '2023-12-11' && g.datos.red === 'tiktok' && g.datos.m.vistas === 12500 && g.datos.m.clientes === 2 && /7311234567890123456/.test(g.datos.link),
      '💾 guardada publicada con link, red y métricas');
    // ---------- 📊 análisis con más publicaciones (SU promedio) ----------
    const filas = [];
    const F = [['Reel educativo (problema → solución)', '2025-01-06', '19:00', 9000, 60, 40, 1], ['Reel educativo (problema → solución)', '2025-01-13', '20:00', 11000, 90, 60, 2], ['Reel educativo (problema → solución)', '2025-01-20', '19:00', 10000, 80, 50, 2],
      ['Carrusel', '2025-01-08', '09:00', 3000, 3, 2, 0], ['Carrusel', '2025-01-15', '10:00', 2800, 2, 1, 0], ['Carrusel', '2025-01-22', '09:00', 3200, 4, 2, 0]];
    F.forEach(([fm, fe, h, v, gu, co, cl], i) => filas.push({ tipo: 'idea', estado: 'publicada', titulo: 'Publicación ' + i, fecha: fe, datos: { red: 'instagram', formato: fm, hora: h, fecha_plan: fe, tema: 'Empanadas', m: { vistas: v, guardados: gu, compartidos: co, comentarios: 3, seguidores: 2, clientes: cl } } }));
    await como('public.cfx_estudio_guardar($2::jsonb)', [JSON.stringify(filas)]);
    await p.reload(); await p.waitForTimeout(3500); await p.click('.cfx-est [data-v=bi]'); await p.waitForTimeout(800);
    ok(await p.locator('.el-kpi').count() === 4 && await p.locator('svg.el-linea polyline').count() === 1, '📊 4 cifras + 📈 línea semanal');
    ok(await p.locator('.el-bar').count() >= 4, '📊 barras vs tu promedio (' + await p.locator('.el-bar').count() + ')');
    const que = await p.evaluate(() => [...document.querySelectorAll('.el .e-card')].find((x) => /Qué hacer ahora/.test(x.textContent)).textContent);
    ok(/Haz más de\s+Reel educativo/.test(que) && /Deja o cambia\s+Carrusel/.test(que), que.slice(0, 300) + ' 🧭 "Haz más de Reel educativo" y "Deja o cambia Carrusel" (por 1.000 vistas, según 💰 vender)');
    await p.locator('.el-bar').first().click(); await p.waitForTimeout(200);
    ok(/% de lo normal/.test(await p.evaluate(() => document.querySelector('.el-bar').closest('.el-graf').querySelector('.el-det').textContent)), '👆 tocar una barra muestra su detalle (sin hover)');
    ok(await t.anchoOk(p), '📱 gráficos no se salen del ancho');
    await p.locator('.el-graf').first().scrollIntoViewIfNeeded(); await t.foto('g141-analisis');
    // ---------- 📱 Mis redes ----------
    await p.goto(t.base + '/app/#misredes'); await p.waitForTimeout(2500);
    ok(await p.locator('#cfxReIn').count() === 1, '📱 Más → Mis redes: 1 caja "Pega el link de tu perfil"');
    await p.fill('#cfxReIn', 'instagram.com/almacenana?igsh=abc123'); await p.dispatchEvent('#cfxReIn', 'input');
    ok(/Instagram/.test(await p.textContent('#cfxReDet')) && /@almacenana/.test(await p.textContent('#cfxReDet')), '🔎 reconoce Instagram @almacenana');
    await p.click('[data-re=suma]');
    await p.fill('#cfxReIn', '@almacenana'); await p.dispatchEvent('#cfxReIn', 'input'); await p.click('#cfxReCh [data-r=tiktok]');
    await p.fill('#cfxReIn', '+56 9 1234 5678'); await p.dispatchEvent('#cfxReIn', 'input'); await p.click('[data-re=suma]');
    ok(await p.locator('.cfx-re-fila').count() === 3 && await p.locator('.cfx-redes .cfx-red svg').count() === 3, '➕ 3 redes con ícono y vista previa');
    await t.foto('g141-mis-redes');
    await p.click('[data-re=guarda]'); await p.waitForTimeout(1200);
    const L = (await su('select lista from public.cfx_redes'))[0].lista;
    ok(L.length === 3 && L[0].url === 'https://instagram.com/almacenana' && L[1].url === 'https://www.tiktok.com/@almacenana' && L[2].url === 'https://wa.me/56912345678', '💾 guardadas limpias ' + JSON.stringify(L.map((x) => x.url)));
    // 🛡️ servidor
    ok(/no válido/.test(await falla(() => como("public.cfx_redes_guardar('[{\"red\":\"web\",\"url\":\"javascript:alert(1)\"}]')")) || ''), '🛡️ servidor rechaza javascript:');
    ok(/no válido/.test(await falla(() => como("public.cfx_redes_guardar('[{\"red\":\"instagram\",\"url\":\"https://malo.com/x\"}]')")) || ''), '🛡️ servidor rechaza Instagram con otro dominio');
    const otro = await t.sim.crearUsuario('nadie@x.cl', 'clave123');
    ok(/dueño/.test(await falla(() => su("select public.cfx_redes_guardar('[]') from (select set_config('request.jwt.claim.sub', $1, true)) x", [otro.id])) || ''), '🛡️ sin negocio no guarda');
    ok(JSON.stringify(await su("select public.cfx_redes_publicas('NOEXISTE') r").then((r) => r[0].r)) === '[]', '🛡️ llave que no existe → [] sin error');
    // 👀 el cliente las ve en su link
    const { page: p2 } = await t.nuevo(); await p2.goto(t.base + '/c/#' + codigo); await p2.waitForTimeout(3000);
    ok(await p2.locator('.cfx-red').count() === 3, '👀 el cliente ve las 3 redes con ícono en su link (c/)');
    ok(!t.errores.filter((e) => !/favicon|ERR_|Failed to load|404/.test(e)).length, 'sin errores: ' + t.errores.slice(0, 3).join(' | '));
  } finally { await t.cerrar(); }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ todo bien'); process.exit(f ? 1 : 0);
})();
