// G146 · 🛒 Carrito FLOTANTE del núcleo (CFX_CARRITO): con el menú de abajo visible o escondido, el 🛒, el ↑ (subir) y el menú
// no se tapan entre sí (bounding boxes). ✕ lo pasa a un 🛒 chico en la cabecera; tocarlo abre el pedido; el pedido NO se borra.
// FALLA con el código viejo (barra "Ver pedido" a lo ancho abajo, tapada por el menú y por ↑). Uso: ANCHO=320 node g146.js
const { abrir } = require('./h'); const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g146', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g146'); const su = t.sim.su;
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])));
  try {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Pepe','client',$1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123'); await su("update public.profiles set terms_at = now()");
    for (let i = 1; i <= 14; i++) await como('tienda@x.cl', 'public.catalog_upsert($2, $3, $4, null, $5)', ['p' + i, 'Producto ' + i, 20000, '']);
    const p = t.page;
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'cli@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(3000);
    for (const oscuro of [false, true]) {
      await p.emulateMedia({ colorScheme: oscuro ? 'dark' : 'light' });
      await p.goto(t.base + '/apps/catalogo/'); await p.waitForTimeout(3000); await t.sinModales(p);
      if (!oscuro) { await p.locator('#grid button:has-text("Agregar"), #grid [data-add]').first().click().catch(() => {}); await p.waitForTimeout(800); }
      const caja = (sel) => p.evaluate((s) => { const e = [...document.querySelectorAll(s)].find((x) => { const r = x.getBoundingClientRect(), cs = getComputedStyle(x); return r.width && r.height && cs.visibility !== 'hidden' && +cs.opacity > 0.5 && r.top < innerHeight && r.bottom > 0; });
        if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, t: (e.innerText || '').trim().slice(0, 40) }; }, sel);
      const choca = (a, b) => a && b && a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
      const ver = async (et) => {
        await p.waitForTimeout(700);
        const carro = await caja('.cfx-carro-f, #barra:not(.hidden)'), menu = await caja('nav.cfx-barra:not(.cfx-escondida)'), sube = await caja('.cfx-subir.on');
        ok(!!carro, (oscuro ? '🌙 ' : '') + et + ': el 🛒 se ve' + (carro ? ' (' + Math.round(carro.w) + 'x' + Math.round(carro.h) + ')' : ''));
        ok(!choca(carro, menu), (oscuro ? '🌙 ' : '') + et + ': el 🛒 NO queda bajo el menú');
        ok(!choca(carro, sube), (oscuro ? '🌙 ' : '') + et + ': el ↑ NO tapa el 🛒');
        ok(!choca(sube, menu), (oscuro ? '🌙 ' : '') + et + ': el ↑ NO queda bajo el menú');
        if (carro) ok(carro.y + carro.h <= (await p.evaluate(() => innerHeight)) + 1, (oscuro ? '🌙 ' : '') + et + ': el 🛒 queda dentro de la pantalla');
        return { carro, menu, sube };
      };
      await p.evaluate(() => scrollTo(0, 0)); await ver('arriba (menú visible)');
      await p.mouse.wheel(0, 900); await p.waitForTimeout(300); await p.mouse.wheel(0, 600);
      const b = await ver('bajando (menú escondido, ↑ visible)');
      await p.mouse.wheel(0, -200); const c = await ver('subiendo un poco (menú vuelve, ↑ visible)');
      ok(!!c.menu || !(await caja('nav.cfx-barra')), (oscuro ? '🌙 ' : '') + 'el menú volvió a aparecer (o la página no tiene menú)');
      if (!oscuro) await p.screenshot({ path: __dirname + '/capturas/g146.png' }).catch(() => {});
      if (!oscuro) {
        // ✕ → 🛒 chico en la cabecera; el pedido sigue; tocar el chico abre el pedido.
        const x = p.locator('.cfx-carro-x');
        ok(await x.count() > 0, 'el 🛒 flotante tiene ✕');
        if (await x.count()) {
          await x.click(); await p.waitForTimeout(500);
          ok(!(await caja('.cfx-carro-f')), '✕ quita el flotante de la vista');
          const mini = await caja('.cfx-carro-mini');
          ok(!!mini && mini.y < 80, '🛒 chico en la cabecera' + (mini ? ' (y=' + Math.round(mini.y) + ', "' + mini.t + '")' : ''));
          ok(/1/.test(mini ? mini.t : ''), 'el 🛒 chico muestra el contador (1)');
          const n = await p.evaluate(() => JSON.stringify(localStorage).includes('Producto') || JSON.stringify(localStorage).includes('p1'));
          ok(n, 'el pedido NO se borró al quitar el flotante');
          await p.locator('.cfx-carro-mini').click(); await p.waitForTimeout(900);
          ok(await p.locator('#cCarro:visible, #vPedido:visible').count() > 0 || await p.evaluate(() => { const e = document.getElementById('cCarro'); return !!e && e.getBoundingClientRect().top < innerHeight && e.getBoundingClientRect().bottom > 0; }), 'tocar el 🛒 chico abre el pedido');
        }
      }
    }
  } catch (e) { console.log('✗ ERROR', e.message); f++; }
  await t.cerrar(); console.log(f ? '✗ ' + f + ' fallas' : '✓ G146 OK'); process.exit(f ? 1 : 0);
})();
