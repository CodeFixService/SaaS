// G94 a · 🎬 Estudio de contenido en el CM (G74 d): solo la cuenta admin · base CSV → idea con 8 cajas 📋 · semana · métricas → 📊 Qué funciona.
// FALLA con el código viejo (sin m-estudio.js ni tipos est_*). Uso: node g94a.js   (ANCHO=320 opcional)
const { abrir } = require('./h');
const { execSync } = require('child_process');
const fs = require('fs');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  execSync(__dirname + '/base.sh /home/user/saas p_g94a', { stdio: 'ignore' });
  const t = await abrir('/home/user/saas', 'p_g94a'); const p = t.page, su = t.sim.su;
  try {
    // Una cuenta normal NO ve el Estudio
    await t.sim.crearUsuario('ana@x.cl', 'clave123');
    await p.goto(t.base + '/'); await p.fill('input[type=email]', 'ana@x.cl'); await p.fill('input[type=password]', 'clave123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/app/); await p.waitForTimeout(1200);
    await p.goto(t.base + '/app/#cerebro'); await p.waitForTimeout(1500); await t.sinModales(p);
    ok(await p.locator('[data-sub=ideas]').count() === 1 && await p.locator('[data-sub=estudio]').count() === 0, '🔒 usuario normal: Cerebro sin 🎬 Estudio');
    await p.evaluate(() => { localStorage.clear(); }); await p.context().clearCookies();
    // Josué (admin)
    const u = await t.sim.crearUsuario('jefe@x.cl', 'admin123');
    await su("update public.perfiles set rol = 'admin' where id = $1", [u.id]);
    await su("insert into public.espacios (owner, nombre, color, modo) values ($1, 'Ciclaselfie', '#ff6600', 'trabajo')", [u.id]);
    await p.goto(t.base + '/'); await p.waitForTimeout(800);
    if (await p.locator('input[type=email]').count()) { await p.fill('input[type=email]', 'jefe@x.cl'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter'); }
    await p.waitForTimeout(2000);
    await p.goto(t.base + '/app/#cerebro'); await p.waitForTimeout(1800); await t.sinModales(p);
    ok(await p.locator('[data-sub=estudio]').count() === 1, '🎬 Estudio visible para el admin');
    await p.click('[data-sub=estudio]'); await p.waitForTimeout(1800);
    const txt = await p.locator('#v-cerebro').innerText();
    ok(/Ciclaselfie/.test(txt) && /base de temas/.test(txt), 'espacio elegido + aviso de base vacía con botón');
    // 🎯 objetivo del espacio
    await p.click('[data-cfx-pestanas] [data-v=espacio]'); await p.waitForTimeout(800);
    await p.click('[data-obj=compartidos]'); await p.fill('#ePub', 'ciclistas de Santiago'); await p.fill('#eTags', '#bicis #taller');
    await p.fill('[data-ritmo=tiktok]', '3'); await p.fill('[data-ritmo=instagram]', '3'); await p.fill('[data-ritmo=facebook]', '0'); await p.fill('[data-ritmo=historias]', '0');
    await p.click('[data-act=guardarConf]'); await p.waitForTimeout(1200);
    let r = (await su("select datos from public.items where owner = $1 and tipo = 'est_conf'", [u.id]))[0];
    ok(r && r.datos.obj === 'compartidos' && r.datos.ritmo.tiktok === 3, '💾 objetivo + ritmo guardados (' + (r && r.datos.obj) + ')');
    // 📚 Base: plantilla y subir CSV
    await p.click('[data-cfx-pestanas] [data-v=base]'); await p.waitForTimeout(800);
    const csv = 'tema,categoria,texto\nFrenos,error,apretar solo el freno delantero\nFrenos,sintoma,el freno chilla\nFrenos,dato,las pastillas duran menos con barro\nFrenos,mito,si frena está bien\n' +
      'Cadena,error,no lubricar la cadena\nCadena,sintoma,la cadena suena al pedalear\nCadena,costo,cambiar piñones cuesta 3 veces más\nCadena,parte,cadena estirada\nCambios,error,cambiar con fuerza\nCambios,sintoma,los cambios saltan\n';
    const ruta = '/tmp/g94a_base.csv'; fs.writeFileSync(ruta, csv);
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-act=subirBase]')]);
    await fc.setFiles(ruta); await p.waitForTimeout(2000);
    let n = (await su("select count(*)::int n from public.items where owner = $1 and tipo = 'est_base'", [u.id]))[0].n;
    ok(n === 10, '⬆️ CSV de base subido (' + n + ' filas)');
    const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-act=subirBase]')]);
    await fc2.setFiles(ruta); await p.waitForTimeout(1500);
    n = (await su("select count(*)::int n from public.items where owner = $1 and tipo = 'est_base'", [u.id]))[0].n;
    ok(n === 10, 'subir 2 veces no duplica');
    ok(/3 temas/.test(await p.locator('#v-cerebro').innerText()), 'resumen: 3 temas + ideas sin repetir');
    // 💡 Idea con 8 cajas
    await p.click('[data-cfx-pestanas] [data-v=idea]'); await p.waitForTimeout(800);
    await p.click('[data-act=generar]'); await p.waitForTimeout(1000);
    ok(await p.locator('.est-caja').count() === 8, '8 cajas (' + await p.locator('.est-caja').count() + ')');
    ok(await p.locator('.est-caja [data-act=copiar]').count() === 8, 'cada caja con 📋 Copiar');
    const cajas = await p.locator('#v-cerebro').innerText();
    ok(/\d+ · \S/.test(cajas) && /2 ganchos más/.test(cajas) && await p.locator('.est-alt').count() === 2, 'gancho con puntaje + 2 alternativas');
    ok(/0-3 s · GANCHO/.test(cajas) || /Lámina 1|Historia 1/.test(cajas), '🎬 guión por segundos');
    ok(/#bicis/.test(cajas), '#️⃣ hashtags fijos del espacio');
    ok(/Guárdalo|Compártelo|Mándaselo/.test(cajas), '📣 CTA según objetivo 🔁 compartidos');
    await p.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await p.click('.est-caja[data-caja=gancho] [data-act=copiar]'); await p.waitForTimeout(400);
    const cp = await p.evaluate(() => navigator.clipboard.readText());
    ok(cp.length > 5 && cajas.includes(cp.split('\n')[0]), '📋 Copiar copia el gancho');
    await p.click('[data-act=prompt]'); await p.waitForTimeout(300);
    ok(/Eres experto en contenido/.test(await p.evaluate(() => navigator.clipboard.readText())), '📋 prompt para Claude');
    const g1 = await p.locator('.est-caja[data-caja=toma] .est-txt').innerText();
    await p.click('.est-caja[data-caja=toma] [data-act=refrescar]'); await p.waitForTimeout(500);
    ok(await p.locator('.est-caja').count() === 8, '🔄 Otra toma (antes: ' + g1.slice(0, 30) + ')');
    await t.foto('g94a-idea'); ok(await t.anchoOk(p), 'ancho ok idea');
    await p.click('[data-act=guardar]'); await p.waitForTimeout(1200);
    n = (await su("select count(*)::int n from public.items where owner = $1 and tipo = 'est_idea'", [u.id]))[0].n;
    ok(n === 1, '💾 idea guardada');
    // 📅 Semana según ritmo (3 TikTok + 3 Instagram)
    await p.click('[data-cfx-pestanas] [data-v=semana]'); await p.waitForTimeout(800);
    await p.click('[data-act=semana]'); await p.waitForTimeout(900);
    ok(/6 ideas nuevas/.test(await p.locator('#v-cerebro').innerText()), '📅 semana con 6 ideas (ritmo)');
    await p.click('[data-act=guardarSemana]'); await p.waitForTimeout(1500);
    const L = await su("select id, datos from public.items where owner = $1 and tipo = 'est_idea' order by created_at", [u.id]);
    ok(L.length === 7 && new Set(L.map((x) => x.datos.combo)).size === 7, 'guardadas sin repetir combinación (' + L.length + ')');
    // Métricas → publicada
    await p.click('[data-act=abrir] >> nth=0'); await p.waitForTimeout(800);
    await p.fill('dialog[open] [data-m=vistas]', '5000'); await p.fill('dialog[open] [data-m=clientes]', '2');
    await p.click('dialog[open] [data-act=guardarM]'); await p.waitForTimeout(1200);
    r = (await su("select estado, datos from public.items where owner = $1 and tipo = 'est_idea' and estado = 'publicada'", [u.id]))[0];
    ok(r && r.datos.m.vistas === 5000, '✅ métricas guardadas → publicada');
    // 📊 Qué funciona + historial CSV
    await p.click('[data-cfx-pestanas] [data-v=bi]'); await p.waitForTimeout(800);
    fs.writeFileSync('/tmp/g94a_hist.csv', 'fecha de publicacion,red,descripcion,visualizaciones,guardados,compartidos,comentarios,clientes generados\n2026-11-02 19:00,tiktok,Video uno,800,3,1,0,0\n2026-11-03 20:00,instagram,Video dos,3000,40,12,5,1\n');
    await p.evaluate(() => document.querySelectorAll('#v-cerebro details').forEach((d) => { d.open = true; }));  // G141: el CSV quedó en "Avanzado"
    const [fc3] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-act=subirHist]')]);
    await fc3.setFiles('/tmp/g94a_hist.csv'); await p.waitForTimeout(2000);
    n = (await su("select count(*)::int n from public.items where owner = $1 and tipo = 'est_idea' and estado = 'publicada'", [u.id]))[0].n;
    ok(n === 3, '⬆️ historial importado (' + n + ' publicadas)');
    await p.evaluate(() => document.querySelectorAll('#v-cerebro details').forEach((d) => { d.open = true; }));
    const bi = await p.locator('#v-cerebro').innerText();
    ok(/3 publicaciones/.test(bi) && /Temas/.test(bi) && /▲ \d+ %/.test(bi) && /Redes/.test(bi) && /Horas/.test(bi), '📊 BI por tema/red/hora con 🏆');
    await t.foto('g94a-bi'); ok(await t.anchoOk(p), 'ancho ok BI');
    // 🔒 servidor: tipo inventado se rechaza
    let rech = false; try { await su("insert into public.items (owner, tipo, titulo) values ($1, 'est_otra', 'x')", [u.id]); } catch (e) { rech = true; }
    ok(rech, '🔒 servidor rechaza tipos no permitidos');
    await p.emulateMedia({ colorScheme: 'dark' }); await p.click('[data-cfx-pestanas] [data-v=idea]'); await p.waitForTimeout(500); await p.click('[data-act=generar]'); await p.waitForTimeout(700); await t.foto('g94a-oscuro');
    ok(await t.anchoOk(p), 'ancho ok oscuro');
  } catch (e) { ok(false, e.message); }
  await t.cerrar(); console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
