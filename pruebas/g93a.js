// G93 a · Bloque CM-B (G87 D): ✅ Checklists en el Tablero del CM · rubro en el perfil → plantillas de fábrica editables + crear desde cero.
// FALLA con el código viejo (sin m-checklist.js ni tipos 'checklist'/'plantilla'). Uso: node g93a.js   (ANCHO=320 opcional)
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  execSync(__dirname + '/base.sh /home/user/saas p_g93a', { stdio: 'ignore' });
  const t = await abrir('/home/user/saas', 'p_g93a'); const p = t.page, su = t.sim.su;
  try {
    const u = await t.sim.crearUsuario('ana@x.cl', 'clave123');
    await p.goto(t.base + '/'); await p.fill('input[type=email]', 'ana@x.cl'); await p.fill('input[type=password]', 'clave123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/app/); await p.waitForTimeout(1500);
    await p.goto(t.base + '/app/#tablero'); await p.waitForTimeout(1500); await t.sinModales(p);
    ok(await p.locator('[data-cfx-pestanas] [data-tv=check]').count() === 1, '📋/✅ pestañas en el Tablero');
    ok(await p.locator('.col').count() === 4, 'Kanban sigue igual (4 columnas)');
    await p.click('[data-tv=check]'); await p.waitForTimeout(1200);
    ok(/Plantillas ·[\s\S]{0,4}General/.test(await p.locator('#v-tablero').innerText()), 'rubro General de entrada con sus plantillas');
    await p.selectOption('#clR', 'barberia'); await p.waitForTimeout(1500);
    const pr = (await su('select prefs ->> \'rubro\' r from public.perfiles where id = $1', [u.id]))[0].r;
    ok(pr === 'barberia', '🏷️ rubro guardado en el perfil (' + pr + ')');
    ok(/Atención de cliente/.test(await p.locator('#v-tablero').innerText()), 'plantillas de Barbería a la vista');
    await t.foto('g93a-plantillas');
    ok(await t.anchoOk(p), 'ancho ok plantillas');
    // Usar una plantilla → checklist con pasos
    await p.click('[data-usar="1"]'); await p.waitForTimeout(1200);
    let r = (await su("select titulo, datos from public.items where owner = $1 and tipo = 'checklist'", [u.id]))[0];
    ok(r && r.titulo === 'Atención de cliente' && r.datos.p.length === 6, '✅ checklist creada desde la plantilla (6 pasos)');
    await p.click('dialog input[data-k="0"]'); await p.waitForTimeout(700); await p.click('dialog input[data-k="1"]'); await p.waitForTimeout(900);
    r = (await su("select datos, estado from public.items where owner = $1 and tipo = 'checklist'", [u.id]))[0];
    ok(JSON.stringify(r.datos.ok) === '[0,1]' && r.estado === 'abierto', 'tachar pasos se guarda (2/6)');
    for (let k = 2; k < 6; k++) { await p.click('dialog input[data-k="' + k + '"]'); await p.waitForTimeout(600); }
    r = (await su("select estado from public.items where owner = $1 and tipo = 'checklist'", [u.id]))[0];
    ok(r.estado === 'hecho', '🎉 todos los pasos → completa');
    ok(/Completa/.test(await p.locator('dialog[open]').innerText()), 'muestra 🎉 ¡Completa!');
    await t.foto('g93a-ficha');
    await p.click('dialog [data-a=reini]'); await p.waitForTimeout(900);
    r = (await su("select datos, estado from public.items where owner = $1 and tipo = 'checklist'", [u.id]))[0];
    ok(r.estado === 'abierto' && r.datos.ok.length === 0, '↺ reiniciar la deja lista para reusar');
    await p.click('dialog [data-cerrar]'); await p.waitForTimeout(600);
    // Editar plantilla de fábrica → queda tu copia
    await p.click('[data-edp="0"]'); await p.waitForTimeout(700);
    await p.fill('#clP', 'Limpiar sillas\n- Música\n3) Abrir puerta'); await p.click('#clOk'); await p.waitForTimeout(1200);
    r = (await su("select titulo, datos from public.items where owner = $1 and tipo = 'plantilla'", [u.id]))[0];
    ok(r && r.datos.base === 'b-abre' && JSON.stringify(r.datos.p) === '["Limpiar sillas","Música","Abrir puerta"]', '✏️ editar plantilla de fábrica crea tu copia (limpia viñetas)');
    const txt = await p.locator('#v-tablero').innerText();
    ok((txt.match(/Apertura del local/g) || []).length === 1 && /tuya/.test(txt), 'tu versión reemplaza a la de fábrica (no se repite)');
    // Crear desde cero
    await p.click('[data-a=nueva]'); await p.waitForTimeout(600);
    await p.fill('#clT', 'Inventario mensual'); await p.fill('#clP', 'Contar tinturas\nContar navajas'); await p.click('#clOk'); await p.waitForTimeout(1200);
    ok((await su("select count(*)::int n from public.items where owner = $1 and tipo = 'checklist' and titulo = 'Inventario mensual'", [u.id]))[0].n === 1, '+ crear desde cero');
    await p.click('dialog[open] .cl-btns [data-cerrar]'); await p.waitForTimeout(500);
    // ↺ volver a la de fábrica
    await p.click('[data-bop="0"]'); await p.waitForTimeout(600); await p.click('dialog[open] [data-si]'); await p.waitForTimeout(1200);
    ok((await su("select count(*)::int n from public.items where owner = $1 and tipo = 'plantilla'", [u.id]))[0].n === 0 && /de fábrica/.test(await p.locator('#v-tablero').innerText()), '↺ vuelve a la plantilla de fábrica');
    // Servidor: datos demasiado largos se rechazan
    let rech = false; try { await su("insert into public.items (owner, tipo, titulo, datos) values ($1, 'checklist', 'x', jsonb_build_object('p', repeat('a', 3100)))", [u.id]); } catch (e) { rech = true; }
    ok(rech, '🔒 servidor rechaza checklist demasiado grande');
    rech = false; try { await su("select public.mi_perfil_guardar('Ana', '', '{\"rubro\":\"taller\",\"es_admin\":true}') from (select set_config('request.jwt.claim.sub', $1, true)) x", [u.id]); } catch (e) { console.log(e.message); }
    const pf = (await su('select prefs from public.perfiles where id = $1', [u.id]))[0].prefs;
    ok(pf.rubro === 'taller' && !('es_admin' in pf), '🔒 perfil solo guarda claves permitidas');
    await p.click('[data-tv=tablero]'); await p.waitForTimeout(800);
    ok(await p.locator('.col').count() === 4, 'volver a 📋 Tablero');
    await p.emulateMedia({ colorScheme: 'dark' }); await p.click('[data-tv=check]'); await p.waitForTimeout(800); await t.foto('g93a-oscuro');
    ok(await t.anchoOk(p), 'ancho ok oscuro');
  } catch (e) { ok(false, e.message); }
  await t.cerrar(); console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
