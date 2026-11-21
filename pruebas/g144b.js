// G144 b · 🛍️ Tienda ❤️ favorito: el corazón se pone ROJO (relleno), sin óvalo rojo detrás, y el botón es un círculo perfecto (nada estirado).
// FALLA con el código viejo (fondo rojizo detrás del corazón). Uso: ANCHO=320 node g144b.js
const { abrir } = require('./h'); const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g144b', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g144b'); const su = t.sim.su;
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  try {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Pepe','client',$1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123'); await su("update public.profiles set terms_at = now()");
    await como('tienda@x.cl', 'public.catalog_upsert($2, $3, $4, null, $5)', ['polera', 'Polera', 10000, '']);
    const p = t.page;
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'cli@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(3000);
    for (const oscuro of [false, true]) {
      await p.emulateMedia({ colorScheme: oscuro ? 'dark' : 'light' });
      await p.goto(t.base + '/apps/catalogo/'); await p.waitForTimeout(3000); await t.sinModales(p);
      const med = () => p.evaluate(() => { const b = document.querySelector('.fav'), r = b.getBoundingClientRect(), cs = getComputedStyle(b), v = b.querySelector('svg');
        const f0 = cs.backgroundColor.match(/[\d.]+/g).map(Number), fondo = /^color\(/.test(cs.backgroundColor) ? f0.map((x) => x * 255) : f0, rojizo = fondo[0] - Math.max(fondo[1], fondo[2]) > 25;
        return { w: Math.round(r.width), h: Math.round(r.height), rad: cs.borderRadius, rojizo, fondo: cs.backgroundColor, fill: v ? getComputedStyle(v).fill : 'sin svg', color: v ? getComputedStyle(v).color : '' }; });
      for (const vista of ['', 'v3']) {
        if (vista) await p.evaluate(() => document.getElementById('grid').classList.add('v3'));
        const a = await med();
        ok(a.w === a.h && a.w > 0, (oscuro ? '🌙 ' : '') + (vista || 'v2') + ': ❤️ sin marcar = círculo ' + a.w + 'x' + a.h);
        await p.locator('.fav').first().click(); await p.waitForTimeout(600);
        if (vista) await p.evaluate(() => document.getElementById('grid').classList.add('v3'));
        const b = await med();
        ok(b.w === b.h && !b.rojizo, (oscuro ? '🌙 ' : '') + (vista || 'v2') + ': marcado sin óvalo rojo detrás (' + b.fondo + ', ' + b.w + 'x' + b.h + ')');
        ok(/239, 68, 68|225, 29, 72|220, 38, 38/.test(b.fill), (oscuro ? '🌙 ' : '') + (vista || 'v2') + ': el corazón se pone ROJO (' + b.fill + ')');
        if (!oscuro && !vista) await p.screenshot({ path: __dirname + '/capturas/g144b.png', clip: { x: 0, y: 0, width: 360, height: 520 } }).catch(() => {});
        await p.locator('.fav').first().click(); await p.waitForTimeout(600);
      }
    }
  } catch (e) { console.log('✗ ERROR', e.message); f++; }
  await t.cerrar(); console.log(f ? '✗ ' + f + ' fallas' : '✓ G144 b OK'); process.exit(f ? 1 : 0);
})();
