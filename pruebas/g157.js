// G157 · CM → Mensajes → 🐞 Fallas en tarjetas ordenadas + 🔎 CFX_FILTRO (núcleo: buscar en la pantalla, filtros por app/estado/fecha y orden).
// Falla con código viejo: el nombre "CodeFix" quedaba aplastado (una letra por línea) junto a "🔧 Lista para revisar". Uso: ANCHO=384 node g157.js
const { abrir } = require('./h'); const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const login = async (p, base, em, pw) => { await p.goto(base + '/'); await p.waitForTimeout(800); await p.fill('input[type=email]:visible', em); await p.fill('input[type=password]:visible', pw); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(3000); };
(async () => {
  execSync(__dirname + '/base.sh /home/user/saas p_g157', { stdio: 'ignore' });
  const t = await abrir('/home/user/saas', 'p_g157', { dialogosApp: true }); const p = t.page;
  try {
    await p.setViewportSize({ width: +(process.env.ANCHO || 384), height: 760 });
    await p.emulateMedia({ colorScheme: 'dark' });
    const em = (await t.sim.su('select public.admin_email() e'))[0].e;
    await t.sim.crearUsuario(em, 'admin123'); const u = await t.sim.crearUsuario('cf@x.cl', 'clave123');
    const ins = (id, nom, txt, est, dias) => t.sim.su("insert into public.cfx_fallas (id, cuenta, email, nombre, rol, texto, estado, creado) values ($1, $2, 'cf@x.cl', $3, 'negocio', $4, $5, now() - ($6 || ' days')::interval)", [id, u.id, nom, txt, est, String(dias)]);
    await ins(1, 'CodeFix', 'Y mi botón de restablecer los ajustes está muy pegado no tiene separación quitarle el núcleo', 'listo', 0);
    await ins(2, 'CodeFix', 'Cuando agrego una categoría que recargar la página para que se agregue la idea que se actualice sola', 'listo', 0);
    await ins(3, 'Josué', 'Símbolo rojo de notificación que salga solamente en la campanita y el pedido no en ajustes', 'nuevo', 20);
    await login(p, t.base, em, 'admin123');
    await p.goto(t.base + '/admin/#mensajes'); await p.waitForTimeout(800); await p.reload(); await p.waitForTimeout(3000); await t.sinModales();
    const cards = p.locator('[data-l-fallas] [data-f]');
    ok(await cards.count() === 3, '3 fallas en tarjetas');
    const anchos = await p.$$eval('[data-l-fallas] .cfx-fa-nom', (L) => L.map((x) => x.getBoundingClientRect().width));
    ok(anchos.every((w) => w > 150), 'el nombre usa todo el ancho (no una letra por línea): ' + anchos.map(Math.round).join(', '));
    const altos = await p.$$eval('[data-l-fallas] .cfx-fa-nom', (L) => L.map((x) => x.getBoundingClientRect().height));
    ok(altos.every((h) => h < 30), 'nombre en una sola línea');
    ok(await t.anchoOk(), 'ancho sin scroll de lado');
    ok(await p.locator('[data-fx-fallas] .cfx-fx-q').count() === 1, 'barra 🔎 Buscar en Fallas');
    await p.screenshot({ path: __dirname + '/capturas/g157-fallas.png' });
    await p.fill('[data-fx-fallas] .cfx-fx-q', 'campanita'); await p.waitForTimeout(400);
    ok(await p.locator('[data-l-fallas] [data-f]:visible').count() === 1, 'buscar "campanita" deja 1');
    ok(/1 de 3/.test(await p.locator('[data-fx-fallas] .cfx-fx-cuenta').textContent()), 'cuenta "1 de 3"');
    await p.fill('[data-fx-fallas] .cfx-fx-q', 'zzzz'); await p.waitForTimeout(400);
    ok(await p.locator('[data-l-fallas] .cfx-fx-vacio:visible').count() === 1, 'sin resultados: aviso "Ninguna falla coincide"');
    await p.click('[data-fx-fallas] .cfx-fx-x'); await p.waitForTimeout(300);
    ok(await p.locator('[data-l-fallas] [data-f]:visible').count() === 3, '✕ borra la búsqueda');
    await p.click('[data-fx-fallas] .cfx-fx-btn');
    await p.click('[data-fx-fallas] .cfx-fx-chip[data-fx-k="g:estado"][data-fx-v="nuevo"]'); await p.waitForTimeout(300);
    ok(await p.locator('[data-l-fallas] [data-f]:visible').count() === 1, 'filtro Estado = Nuevo');
    ok((await p.locator('[data-fx-fallas] .cfx-fx-n').textContent()) === '1', 'contador de filtros activos');
    await p.click('[data-fx-fallas] .cfx-fx-chip[data-fx-k="g:estado"][data-fx-v=""]');
    await p.click('[data-fx-fallas] .cfx-fx-chip[data-fx-k="f"][data-fx-v="7"]'); await p.waitForTimeout(300);
    ok(await p.locator('[data-l-fallas] [data-f]:visible').count() === 2, 'fecha 7 días deja las 2 de hoy');
    await p.click('[data-fx-fallas] .cfx-fx-chip[data-fx-k="o"][data-fx-v="antiguo"]'); await p.waitForTimeout(300);
    ok(await t.anchoOk(), 'panel de filtros sin scroll de lado');
    await p.screenshot({ path: __dirname + '/capturas/g157-filtros.png' });
    await p.click('[data-fx-fallas] .cfx-fx-lim'); await p.waitForTimeout(300);
    ok(await p.locator('[data-l-fallas] [data-f]:visible').count() === 3, 'Limpiar filtros');
    await cards.first().click(); await p.waitForTimeout(1200);
    ok(await p.locator('dialog[open]').count() >= 1, 'tocar la tarjeta abre la falla');
    // Modo datos
    const r = await p.evaluate(() => CFX_FILTRO.aplicar([{ n: 'Ána', t: 'x', d: '2026-01-01' }, { n: 'beto', t: 'y', d: '2026-02-01' }], { q: 'ana', g: {} }, { nombre: (x) => x.n, fecha: (x) => x.d }).length);
    ok(r === 1, 'CFX_FILTRO.aplicar busca sin tildes');
    ok(!t.errores.filter((e) => !/404/.test(e)).length, 'sin errores en consola');
  } catch (e) { console.error(e); f++; }
  await t.cerrar(); console.log(f ? '✗ ' + f + ' fallas' : '✓ G157 ok'); process.exit(f ? 1 : 0);
})();
