// G123 · 🎬 Estudio: (a) 🔄 Cambiar todo en la idea + 🔄 Otra en copy y hashtags (CM y núcleo de las 5)
// (b) CM: Espacio ligado a una app → ✨ Base de fábrica (temas + 🧩 módulos de esa app, sin duplicar) y al cambiar de Espacio la idea se rehace.
// FALLA con el código viejo (sin data-act=todo, sin #eApp ni fabrica).  Uso: node g123.js   (ANCHO=320 opcional)
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const caja = (p, k) => p.locator('[data-caja=' + k + '] .est-txt').innerText();
(async () => {
  execSync(__dirname + '/base.sh /home/user/saas p_g123', { stdio: 'ignore' });
  const t = await abrir('/home/user/saas', 'p_g123'); const p = t.page, su = t.sim.su;
  try {
    const ADM = require('fs').readFileSync(__dirname + '/g112d.js', 'utf8').match(/const ADM = '([^']+)'/)[1]; // el admin real (súper admin)
    const u = await t.sim.crearUsuario(ADM, 'admin123');
    await su("update public.perfiles set rol = 'admin' where id = $1", [u.id]);
    await su("insert into public.espacios (owner, nombre, color, modo) values ($1, 'Despega', '#ff6600', 'trabajo'), ($1, 'Barbería', '#0066ff', 'trabajo')", [u.id]);
    await p.goto(t.base + '/'); await p.waitForTimeout(800);
    if (await p.locator('input[type=email]').count()) { await p.fill('input[type=email]', ADM); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter'); }
    await p.waitForTimeout(2000);
    await p.goto(t.base + '/app/#cerebro'); await p.waitForTimeout(1800); await t.sinModales(p);
    await p.click('[data-sub=estudio]'); await p.waitForTimeout(1800);
    const espDe = async (nom) => (await su('select id from public.espacios where nombre = $1', [nom]))[0].id;
    const actual = () => p.evaluate(() => window.CM.mod.estudio._ui.esp);
    // asegura estar en "Despega"
    if (await actual() !== await espDe('Despega')) { await p.evaluate((id) => { window.CM.mod.estudio._ui.esp = id; window.CM.pintar(); }, await espDe('Despega')); await p.waitForTimeout(800); }
    // ---------- (b) App del espacio + ✨ Base de fábrica ----------
    await p.click('[data-cfx-pestanas] [data-v=espacio]'); await p.waitForTimeout(800);
    ok(await p.locator('#eApp option').count() === 7, '📱 se elige la app del espacio (6 apps + ninguna)');
    await p.selectOption('#eApp', 'despega'); await p.click('[data-act=fabrica]'); await p.waitForTimeout(1800);
    const nb = async () => (await su("select count(*)::int n from public.items where owner = $1 and tipo = 'est_base' and espacio_id = $2", [u.id, await espDe('Despega')]))[0].n;
    const n1 = await nb();
    ok(n1 >= 30, '✨ base de fábrica de Despega cargada (' + n1 + ' filas)');
    const temas = (await su("select array_agg(distinct datos->>'tema') a from public.items where tipo = 'est_base' and espacio_id = $1", [await espDe('Despega')]))[0].a;
    ok(temas.includes('Catálogo online') && temas.includes('Módulos'), 'trae temas de la app y sus 🧩 módulos');
    const cf = (await su("select datos from public.items where tipo = 'est_conf' and espacio_id = $1", [await espDe('Despega')]))[0];
    ok(cf && cf.datos.app === 'despega' && /pyme/.test(cf.datos.tags) && cf.datos.publico, '💾 el espacio queda ligado a Despega (público y hashtags de fábrica)');
    await p.click('[data-cfx-pestanas] [data-v=espacio]'); await p.waitForTimeout(800);
    await p.click('[data-act=fabrica]'); await p.waitForTimeout(1500);
    ok(await nb() === n1, 'apretar 2 veces no duplica');
    // ---------- (a) idea: 🔄 Cambiar todo + 🔄 copy/hashtags ----------
    await p.click('[data-cfx-pestanas] [data-v=idea]'); await p.waitForTimeout(800);
    await p.click('[data-act=generar]'); await p.waitForTimeout(1000);
    ok(await p.locator('.est-caja').count() === 8, '💡 idea con 8 cajas desde la base de fábrica');
    ok(await p.locator('[data-caja=copy] [data-act=refrescar]').count() === 1 && await p.locator('[data-caja=tags] [data-act=refrescar]').count() === 1, '✍️ copy y #️⃣ hashtags ahora con 🔄 Otra');
    const c0 = await caja(p, 'copy'); await p.click('[data-caja=copy] [data-act=refrescar]'); await p.waitForTimeout(500);
    ok(await caja(p, 'copy') !== c0, '🔄 copy cambia');
    const h0 = await caja(p, 'tags'); await p.click('[data-caja=tags] [data-act=refrescar]'); await p.waitForTimeout(500);
    ok(await caja(p, 'tags') !== h0, '🔄 hashtags cambian');
    const antes = { g: await caja(p, 'gancho'), c: await caja(p, 'copy'), t: await caja(p, 'toma') };
    ok(await p.locator('[data-act=todo]').count() === 1, 'botón 🔄 Cambiar todo');
    let cambio = false;
    for (let k = 0; k < 3 && !cambio; k++) { await p.click('[data-act=todo]'); await p.waitForTimeout(600); cambio = (await caja(p, 'gancho')) !== antes.g && (await caja(p, 'copy')) !== antes.c; }
    ok(cambio, '🔄 Cambiar todo rehace gancho y copy (y el resto) de una vez');
    await p.click('[data-act=guardar]'); await p.waitForTimeout(1200);
    const gi = (await su("select datos from public.items where tipo = 'est_idea' and espacio_id = $1", [await espDe('Despega')]))[0];
    ok(gi && gi.datos.vc >= 1, '💾 la idea guardada recuerda su variante de copy/hashtags');
    // ---------- (b) cambiar de Espacio → se rehace con esa app ----------
    const b = await espDe('Barbería');
    await su("insert into public.items (owner, tipo, estado, espacio_id, titulo, datos) values ($1, 'est_base', 'abierto', $2, 'cortarse en casa con máquina', '{\"tema\":\"Corte\",\"cat\":\"error\"}'), ($1, 'est_base', 'abierto', $2, 'el corte dura 3 semanas', '{\"tema\":\"Corte\",\"cat\":\"dato\"}'), ($1, 'est_base', 'abierto', $2, 'pica la nuca', '{\"tema\":\"Corte\",\"cat\":\"sintoma\"}')", [u.id, b]);
    await p.goto(t.base + '/app/#cerebro'); await p.reload(); await p.waitForTimeout(1800); await t.sinModales(p);
    await p.click('[data-sub=estudio]'); await p.waitForTimeout(1500);
    await p.evaluate((id) => { window.CM.mod.estudio._ui.esp = id; window.CM.pintar(); }, await espDe('Despega')); await p.waitForTimeout(600);
    await p.click('[data-cfx-pestanas] [data-v=idea]'); await p.waitForTimeout(600); await p.click('[data-act=generar]'); await p.waitForTimeout(800);
    await p.click('#estEsp button, #estEsp [role=button]'); await p.waitForTimeout(600);
    await p.click('text=Barbería >> visible=true'); await p.waitForTimeout(1200);
    ok(await actual() === b && await p.locator('.est-caja').count() === 8 && /Corte|corte/.test(await p.locator('#v-cerebro').innerText()), '🗂️ al cambiar de Espacio la idea se rehace con la base de ese espacio');
    ok(await t.anchoOk(p), 'sin scroll horizontal');
    const err = t.errores.filter((e) => !/favicon|realtime|websocket|Failed to load resource/i.test(e));
    ok(err.length === 0, 'sin errores en consola' + (err.length ? ' · ' + err.slice(0, 3).join(' | ') : ''));
  } catch (e) { ok(false, e.stack || e.message); }
  await t.cerrar();
  console.log(f ? '❌ ' + f + ' fallas' : '✅ G123 OK'); process.exit(f ? 1 : 0);
})();
