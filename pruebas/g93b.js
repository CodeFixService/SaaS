// G93 b · Bloque CM-B (G87 D): 📢 Anuncios. CM → Control → Anuncios: Campaña → Conjuntos → Anuncios → 🚀 Publicar; en la app sale
//         una tarjeta con ✕ (no vuelve), cuenta vistas/clics/cierres 1 vez por persona; solo admin publica; links/imágenes validados.
// FALLA con el código viejo (sin cfx_anuncios_*, cm_campana_*, admin/anuncios.js). Uso: node g93b.js   (ANCHO=320 opcional)
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const como = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return false; } catch (e) { return true; } };
(async () => {
  // ---------- 1) servidor en otra app (Estaciona: la que más permisos revoca) ----------
  execSync(__dirname + '/base.sh /home/user/estacionamiento p_g93b', { stdio: 'ignore' });
  let t = await abrir('/home/user/estacionamiento', 'p_g93b'); let su = t.sim.su, c = como(su);
  try {
    const a = await t.sim.crearUsuario(ADM, 'admin123'); await su('update public.perfiles set es_admin = true where id = $1', [a.id]);
    const an0 = await t.sim.crearUsuario('ana@x.cl', 'clave123'); await su('update public.perfiles set premium_hasta = null where id = $1', [an0.id]);
    const camp = '11111111-1111-4111-8111-111111111111', L = [{ id: '22222222-2222-4222-8222-222222222222', publico: 'todos', titulo: 'Hola', texto: 'Promo', boton: 'Ver', link: '#premium' },
      { id: '33333333-3333-4333-8333-333333333333', publico: 'premium', titulo: 'Solo Premium' }];
    ok(await c(ADM, 'public.cfx_anuncios_publicar($2, $3, $4)', [camp, 'Lanzamiento', JSON.stringify(L)]) === 2, '🚀 admin publica 2 anuncios');
    ok(await falla(() => c('ana@x.cl', 'public.cfx_anuncios_publicar($2, $3, $4)', [camp, 'X', '[]'])), '🔒 una persona normal NO puede publicar');
    ok(await falla(() => c(ADM, 'public.cfx_anuncios_publicar($2, $3, $4)', [camp, 'X', JSON.stringify([{ id: L[0].id, titulo: 'x', link: 'javascript:alert(1)' }])])), '🔒 link javascript: rechazado');
    ok(await falla(() => c(ADM, 'public.cfx_anuncios_publicar($2, $3, $4)', [camp, 'X', JSON.stringify([{ id: L[0].id, titulo: 'x', imagen: 'http://x.cl/a.png' }])])), '🔒 imagen sin https rechazada');
    let v = await c('ana@x.cl', 'public.cfx_anuncios_ver()');
    ok(v.length === 1 && v[0].titulo === 'Hola', '👤 Ana (gratis) ve solo el de "Todos" (' + v.length + ')');
    await c('ana@x.cl', "public.cfx_anuncio_marcar($2, 'vista')", [L[0].id]); await c('ana@x.cl', "public.cfx_anuncio_marcar($2, 'vista')", [L[0].id]);
    await c('ana@x.cl', "public.cfx_anuncio_marcar($2, 'clic')", [L[0].id]); await c('ana@x.cl', "public.cfx_anuncio_marcar($2, 'cierre')", [L[0].id]);
    const r = (await c(ADM, 'public.cfx_anuncios_admin()')).find((x) => x.id === L[0].id);
    ok(r.vistas === 1 && r.clics === 1 && r.cierres === 1, '📊 cuenta 1 vez por persona (vistas ' + r.vistas + ', clics ' + r.clics + ', cierres ' + r.cierres + ')');
    ok((await c('ana@x.cl', 'public.cfx_anuncios_ver()')).length === 0, '✕ cerrado no vuelve a salir');
    ok(await c(ADM, 'public.cfx_anuncios_publicar($2, $3, $4)', [camp, 'Lanzamiento', JSON.stringify([L[1]])]) === 1 && (await su('select count(*)::int n from public.cfx_anuncios'))[0].n === 1, 'republicar quita el que ya no viene');
    ok(await c(ADM, 'public.cfx_anuncios_quitar($2)', [camp]) === 1, 'quitar la campaña');
    const dir = (await su("select not has_table_privilege('authenticated', 'public.cfx_anuncios', 'select') and not has_table_privilege('anon', 'public.cfx_anuncio_vistos', 'select') r"))[0].r;
    ok(dir, '🔒 la tabla no se lee directo (solo por funciones)');
  } catch (e) { ok(false, e.message); }
  await t.cerrar();

  // ---------- 2) CM: admin arma la campaña y la publica; Ana la ve en la app con ✕ ----------
  execSync(__dirname + '/base.sh /home/user/saas p_g93b2', { stdio: 'ignore' });
  t = await abrir('/home/user/saas', 'p_g93b2'); su = t.sim.su; const p = t.page;
  try {
    await t.sim.crearUsuario(ADM, 'admin123'); const ana = await t.sim.crearUsuario('ana@x.cl', 'clave123');
    await p.goto(t.base + '/'); await p.fill('input[type=email]', ADM); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800); await t.sinModales();
    await p.goto(t.base + '/admin/#control'); await p.waitForTimeout(3500); await t.sinModales();
    await p.click('[data-s=anuncios]'); await p.waitForTimeout(1200);
    ok(/Promos propias/.test(await p.locator('#ctlCuerpo').innerText()), '📢 Control → Anuncios');
    await p.click('#anN'); await p.waitForTimeout(700);
    await p.fill('[data-c=nombre]', 'Lanzamiento CM');
    for (const id of ['aplicaciones', 'barberia', 'billetera', 'bicitaller', 'estaciona']) await p.uncheck('[data-c=app][value=' + id + ']');
    await p.check('[data-c=app][value=cm]');
    await p.click('dialog [data-mas="0"]'); await p.waitForTimeout(400);
    await p.click('#anG'); await p.waitForTimeout(500);
    ok(/título/.test(await p.locator('#anErr').innerText()), 'pide título al anuncio');
    await p.fill('[data-c="0.0.titulo"]', 'Nuevo: Checklists'); await p.fill('[data-c="0.0.texto"]', 'Ordena tu día paso a paso');
    await p.fill('[data-c="0.0.boton"]', 'Probar'); await p.fill('[data-c="0.0.link"]', 'javascript:alert(1)'); await p.click('#anG'); await p.waitForTimeout(500);
    ok(/link/.test(await p.locator('#anErr').innerText()), '🔒 link raro no se guarda');
    await p.fill('[data-c="0.0.link"]', '#tablero');
    await t.foto('g93b-editor');
    ok(await t.anchoOk(), 'ancho ok editor');
    await p.click('#anG'); await p.waitForTimeout(1200);
    const cm = (await su('select * from public.cm_campanas'))[0];
    ok(cm && cm.nombre === 'Lanzamiento CM' && JSON.stringify(cm.apps) === '["cm"]' && cm.conjuntos[0].anuncios.length === 1, '💾 campaña guardada (campaña → conjunto → anuncio)');
    await p.locator('dialog[open] button', { hasText: 'Publicar' }).last().click(); await p.waitForTimeout(2000);
    ok(/1 anuncio/.test(await p.locator('dialog[open]').last().innerText()), '🚀 publicada en el CM: 1 anuncio');
    ok((await su('select count(*)::int n from public.cfx_anuncios'))[0].n === 1, 'anuncio copiado a la base de la app');
    await t.sinModales(); await t.foto('g93b-lista');
    // Ana entra a la app: ve la tarjeta y la cierra
    const { page: q } = await t.nuevo();
    await q.goto(t.base + '/'); await q.fill('input[type=email]', 'ana@x.cl'); await q.fill('input[type=password]', 'clave123'); await q.press('input[type=password]', 'Enter');
    await q.waitForURL(/app/); await q.waitForTimeout(5000);
    ok(await q.locator('.cfx-anuncio').count() === 0 || await q.locator('dialog[open]').count() === 0, 'no sale encima de una ventana abierta');
    await t.sinModales(q); await q.waitForTimeout(6000);
    ok(await q.locator('.cfx-anuncio').count() === 1 && /Checklists/.test(await q.locator('.cfx-anuncio').innerText()), '📣 Ana ve la tarjeta del anuncio');
    ok(await t.anchoOk(q), 'ancho ok tarjeta');
    await t.foto('g93b-tarjeta', q);
    await q.click('.cfx-anuncio .cfx-an-x'); await q.waitForTimeout(1000);
    ok(await q.locator('.cfx-anuncio').count() === 0, '✕ la tarjeta se va');
    ok((await su('select count(*)::int n from public.cfx_anuncio_vistos where cuenta = $1 and cerrado is not null', [ana.id]))[0].n === 1, 'cierre guardado (no vuelve)');
    await q.reload(); await q.waitForTimeout(3000); await t.sinModales(q); await q.waitForTimeout(6000);
    ok(await q.locator('.cfx-anuncio').count() === 0, 'al volver a entrar no sale de nuevo');
    // Resultados en el CM
    await p.reload(); await p.waitForTimeout(3000); await t.sinModales(); await p.click('[data-s=anuncios]'); await p.waitForTimeout(1000);
    await p.click('[data-res]'); await p.waitForTimeout(1500);
    const res = await p.locator('#anRes').innerText();
    ok(/Checklists\s+1\s+0\s+✕ 1/.test(res), '📊 resultados: 1 vista, 1 cerrado');
    await t.sinModales();
    await p.emulateMedia({ colorScheme: 'dark' }); await t.foto('g93b-oscuro');
    // Borrar: se quita de las apps
    await p.click('[data-bo]'); await p.waitForTimeout(400); await p.locator('dialog[open] button', { hasText: 'Borrar' }).last().click(); await p.waitForTimeout(1800);
    ok((await su('select count(*)::int n from public.cm_campanas'))[0].n === 0 && (await su('select count(*)::int n from public.cfx_anuncios'))[0].n === 0, '🗑️ borrar la campaña la quita de las apps');
  } catch (e) { ok(false, e.message); }
  await t.cerrar(); console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
