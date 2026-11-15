// G52 · Análisis final (como Josué, 320 px). FALLA con el código viejo:
//  b) 💬 avisos propios en vez de los de Chrome: Pedidos → Cupones → ✕ abre la ventana de la app (Cancelar no borra, Eliminar sí); alert() también.
//  c) 💈 Barbería: "Cuenta y ayuda" NO sale abajo de Clientes (solo en Más).
//  d) 🎟️ Guardar cupón vacío avisa en la app sin error 400 del servidor.
// Uso: ./base.sh /home/user/Aplicaciones && (cd /home/user/Barberia/supabase/pruebas && ./correr.sh "-h /var/tmp/pgb -p 54329 -U postgres") && node g52_final.js
const { abrir } = require('./h');
let fallas = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fallas++; };
(async () => {
  let t = await abrir('/home/user/Aplicaciones', 'p_aplicaciones', { dialogosApp: true, dialogo: (d) => { nativos.push(d.message()); d.accept(); } });
  const nativos = [];
  let p = t.page;
  try {
    await p.setViewportSize({ width: 320, height: 680 });
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.su('update public.profiles set terms_at = now()');
    await t.sim.su("insert into public.cfx_descuentos (owner_id, codigo, porcentaje) values ($1, 'VERANO10', 10)", [u.id]);
    await p.goto(t.base + '/'); await p.waitForTimeout(800); await p.evaluate(() => localStorage.setItem('cfx:tour:orbita-inicio', '1'));
    await p.fill('input[type=email]:visible', 'tienda@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(3000);
    await p.emulateMedia({ colorScheme: 'dark' });
    await p.goto(t.base + '/apps/pedidos/?v=cupones'); await p.waitForTimeout(2500); await t.sinModales();
    await p.click('[data-c]'); await p.waitForTimeout(500);
    const dlg = await p.evaluate(() => { const c = document.querySelector('.cfx-dlg .cfx-dlg-c'); return c && { txt: c.textContent, fondo: getComputedStyle(c).backgroundColor, ancho: c.getBoundingClientRect().right <= innerWidth }; });
    ok(dlg && /Eliminar este cupón/.test(dlg.txt) && dlg.ancho && !nativos.length, 'b) ✕ cupón abre la ventana de la app, no la de Chrome ' + JSON.stringify(dlg) + ' nativos=' + nativos.length);
    await t.foto('g52_dialogo', p);
    await p.click('.cfx-dlg-no').catch(() => {}); await p.waitForTimeout(800);
    ok((await t.sim.su("select count(*)::int n from public.cfx_descuentos"))[0].n === 1, 'b) Cancelar no borra');
    await p.click('[data-c]'); await p.waitForTimeout(400); await p.click('.cfx-dlg-si').catch(() => {}); await p.waitForTimeout(1200);
    ok((await t.sim.su("select count(*)::int n from public.cfx_descuentos"))[0].n === 0, 'b) Eliminar (botón rojo) borra');
    const antes = t.errores.length;
    await p.click('#bCupon'); await p.waitForTimeout(800);
    ok(!t.errores.slice(antes).some((x) => /cfx_desc_guardar|400/.test(x)), 'd) Guardar cupón vacío no va al servidor (sin error 400)');
    await p.evaluate(() => alert('Hola')); await p.waitForTimeout(300);
    ok(await p.locator('.cfx-dlg', { hasText: 'Hola' }).count() === 1 && nativos.length === 0, 'b) alert() usa la ventana de la app');
  } catch (e) { fallas++; console.log('✗ ' + e.message.split('\n')[0]); }
  await t.cerrar();
  // c) Barbería
  t = await abrir('/home/user/barberia', 'barberia_prueba', { dialogosApp: true }); p = t.page;
  try {
    await t.sim.su("create table if not exists auth.claves (email text primary key, pass text not null)");
    await t.sim.su("insert into auth.claves select email, 'clave123' from auth.users on conflict do nothing");
    await t.sim.su("delete from cfx_exentos").catch(() => {});
    await p.setViewportSize({ width: 320, height: 680 });
    await p.goto(t.base + '/'); await p.waitForTimeout(1500); await p.click('text=Entrar').catch(() => {}); await p.waitForTimeout(500);
    await p.fill('input[type=email]:visible', 'dueno@test.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(3500);
    for (const v of ['mas', 'clientes']) { await p.evaluate((v) => document.querySelector('[data-v="' + v + '"]').click(), v); await p.waitForTimeout(1800); }
    const g = await p.evaluate(() => [...document.querySelectorAll('.cfx-cuenta-g')].filter((x) => x.offsetParent).length);
    ok(g === 0, 'c) Barbería → Clientes sin "Cuenta y ayuda" abajo (' + g + ')');
    await t.foto('g52_bar_clientes', p);
  } catch (e) { fallas++; console.log('✗ ' + e.message.split('\n')[0]); }
  await t.cerrar();
  console.log(fallas ? 'FALLAS: ' + fallas : 'TODO OK');
  process.exitCode = fallas ? 1 : 0;
})();
