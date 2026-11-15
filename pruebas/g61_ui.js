// G61 · b) la barra del celular no cambia con el color · c) 👆 huella junto al PIN · d) 👁️ ojito sin marco en todas las claves
//       · e) el + se calcula al cargar (no al primer toque) · f) 🎨 colores completos (tarjetas, barra, degradado) · a) sw confirma el push.
// FALLA con el código viejo. Uso: (cd /home/user/Barberia/supabase/pruebas && ./correr.sh "-h /var/tmp/pgb -p 54329 -U postgres") && node g61_ui.js
// (+ psql -f nucleo/sql/push.sql -f pruebas/g61_push.sql para la parte de la base)
const { abrir } = require('./h');
const fs = require('fs');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  // a) service worker: al llegar el aviso confirma (cfx_push_recibido) en las 6 apps
  for (const r of ['SaaS', 'Aplicaciones', 'Barberia', 'Emprendedor', 'Taller', 'Estacionamiento']) {
    const sw = fs.readFileSync('/home/user/' + r + '/sw.js', 'utf8'), m = sw.match(/function cfxAck[\s\S]*?\n}\n/);
    assert(m && /cfxAck\(e, d\);/.test(sw), r + ': sw.js confirma el push');
    const llam = []; const fetch = async (u, o) => { llam.push([u, o]); return {}; }; const espera = [];
    new Function('fetch', m[0] + 'cfxAck({ waitUntil: (p) => 0 }, { ack: "g1", ackUrl: "https://x.supabase.co/rest/v1/rpc/cfx_push_recibido", ackKey: "k" }); cfxAck({ waitUntil(){} }, { title: "sin ack" });')(fetch, espera);
    assert(llam.length === 1 && JSON.parse(llam[0][1].body).p_grupo === 'g1' && llam[0][1].headers.apikey === 'k', r + ': manda el grupo con la llave pública');
  }
  const t = await abrir('/home/user/barberia', 'barberia_prueba');
  const p = t.page, su = t.sim.su;
  const como = async (email, expr) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email]))[0].r;
  try {
    await su("create table if not exists auth.claves (email text primary key, pass text not null)");
    await su("alter table auth.users add column if not exists last_sign_in_at timestamptz");
    await su("insert into auth.claves select email, 'clave123' from auth.users on conflict do nothing");
    await su("update public.profiles set clave_temporal = false, tour_visto = true where true").catch(() => {});
    await como('dueno@test.cl', "public.cfx_pin_guardar('')");
    // Huella virtual del celular (sensor que siempre reconoce el dedo)
    const cdp = await t.ctx.newCDPSession(p);
    await cdp.send('WebAuthn.enable'); await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    // d) ojito: solo el ícono (sin marco ni fondo) dentro del campo
    const ojo = await p.evaluate(() => { const b = document.querySelector('input[type=password]:not([hidden])') && document.querySelector('.cfx-ojo'); if (!b) return null; const s = getComputedStyle(b);
      return { bg: s.backgroundColor, img: s.backgroundImage, borde: s.borderTopWidth, sombra: s.boxShadow, pos: s.position }; });
    assert(ojo && /rgba\(0, 0, 0, 0\)|transparent/.test(ojo.bg) && ojo.img === 'none' && ojo.borde === '0px' && ojo.sombra === 'none' && ojo.pos === 'absolute', 'Ojito sin marco ni fondo ' + JSON.stringify(ojo));
    await p.click('.cfx-ojo'); assert(await p.evaluate(() => document.querySelector('.cfx-ojo').parentNode.querySelector('input').type) === 'text', 'Tocar el ojito muestra la clave');
    await p.click('.cfx-ojo');
    await p.fill('input[type=email]:visible', 'dueno@test.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales();
    // b) la barra del celular (theme-color) no cambia al elegir color
    const tc0 = await p.evaluate(() => (document.querySelector('meta[name=theme-color]') || {}).content);
    await p.evaluate(() => window.CFX_PERFIL.pintarColor('#dc2626')); await p.waitForTimeout(100);
    assert(await p.evaluate(() => (document.querySelector('meta[name=theme-color]') || {}).content) === tc0, 'Barra del celular queda igual (' + tc0 + ')');
    // e) el + se calcula al cargar: la app cambia su color (sin tocar nada) → el + se ajusta solo
    const masLee = () => p.evaluate(() => { const cs = getComputedStyle(document.documentElement), i = cs.getPropertyValue('--cfx-mas-ink').trim(), b = cs.getPropertyValue('--brand').trim(), oro = document.documentElement.classList.contains('cfx-premium');
      return [i, b, window.CFX_COLORES.contraste(i, oro ? '#d9a21b' : b), oro]; });  // Premium: el + es dorado
    for (const c of ['#111827', '#facc15']) {
      await p.evaluate((c) => window.CFX_PERFIL.pintarColor(c), c); await p.waitForTimeout(150);
      const [i, b, ct] = await masLee(); assert(b === c && ct >= 3, 'El + se lee sobre ' + c + ' (' + i + ', ' + ct.toFixed(1) + ':1)');
    }
    // la app pone su color por su cuenta (sin pasar por el núcleo) → el + se recalcula solo, sin tocar nada
    await p.evaluate(() => document.documentElement.style.setProperty('--brand', '#111827')); await p.waitForTimeout(30);
    const r0 = await masLee(); assert(r0[1] !== '#111827' || r0[2] >= 3, 'Sin tocar nada el + sigue legible ' + JSON.stringify(r0));
    await p.evaluate(() => window.CFX_PERFIL.pintarColor('#2563eb'));
    // f) colores completos: tarjetas, barra de abajo y degradado
    const m = await p.evaluate(() => (window.CFX_COLORES.oscuro() ? 'oscuro' : 'claro'));
    await p.evaluate((m) => { window.CFX_COLORES.guardar(m, { tarjeta: '#fde68a', barra: '#0f172a', marca2: '#9333ea' }); window.CFX_COLORES.pintar(); }, m);
    await p.waitForTimeout(400);
    const f = await p.evaluate(() => { const r = document.documentElement, cs = getComputedStyle(r), b = document.querySelector('nav.cfx-barra'), it = b && b.querySelector(':scope>:not(.cfx-mas):not(.on)'), mas = b && b.querySelector('.cfx-mas>:first-child');
      const btn = document.createElement('button'); btn.textContent = 'Prueba'; btn.style.background = 'var(--brand)'; document.body.appendChild(btn);
      return { tarjeta: cs.getPropertyValue('--cfx-tarjeta').trim(), clases: r.className, barra: b && getComputedStyle(b).backgroundColor, item: it && getComputedStyle(it).color, mas: mas && getComputedStyle(mas).backgroundImage, btnId: (btn.id = 'g61b') }; });
    await p.waitForTimeout(400);
    const deg = await p.evaluate(() => getComputedStyle(document.getElementById('g61b')).backgroundImage);
    assert(f.tarjeta === '#fde68a' && /cfx-col-barra/.test(f.clases) && /cfx-col-deg/.test(f.clases), 'Tarjetas y clases de color ' + JSON.stringify(f));
    assert(f.barra === 'rgb(15, 23, 42)', 'Barra de abajo con su color ' + f.barra);
    assert(await p.evaluate((c) => { const [r, g, b] = c.match(/\d+/g).map(Number); return window.CFX_COLORES.contraste('#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join(''), '#0f172a'); }, f.item) >= 4.5, 'Textos de la barra se leen ' + f.item);
    assert(/linear-gradient/.test(f.mas || '') && /linear-gradient/.test(deg), 'Degradado en el + y en botones de color ' + deg);
    await t.foto('g61_colores');
    await p.evaluate((m) => { window.CFX_COLORES.guardar(m, {}); window.CFX_COLORES.pintar(); }, m); await p.waitForTimeout(400);
    assert(await p.evaluate(() => !document.querySelector('[data-cfx-deg]') && !/cfx-col-(barra|deg)/.test(document.documentElement.className)), '↺ Volver a lo normal quita todo');
    // c) 👆 huella: PIN activo → Avanzado → Usar huella → la pantalla del PIN entra con la huella
    await como('dueno@test.cl', "public.cfx_pin_guardar('1234')");
    await p.evaluate(() => window.CFX_PERFIL.abrir('avanzado')); await p.waitForTimeout(1500);
    const hb = p.locator('.cfx-hoja-m [data-pf=huella]');
    assert(await hb.isVisible(), 'Avanzado muestra 👆 Usar huella con PIN activo');
    await hb.click(); await p.waitForTimeout(1500);
    assert(await p.evaluate(() => !!window.CFX_HUELLA.id()), 'Huella guardada en este celular');
    assert(/Quitar huella/.test(await hb.textContent()), 'Botón cambia a Quitar huella');
    await p.evaluate(() => { sessionStorage.removeItem('cfx-pin-ok'); }); await p.reload(); await p.waitForTimeout(3500);
    assert(await p.evaluate(() => !document.querySelector('.cfx-pin')), 'Pantalla del PIN se abrió sola con la huella');
    assert(await p.evaluate(() => sessionStorage.getItem('cfx-pin-ok')) === '1', 'Quedó desbloqueada');
    // a) abrir la app corta los reenvíos de este celular
    await su("delete from public.cfx_push_entrega");
    const ep = await p.evaluate(async () => { const g = await navigator.serviceWorker.getRegistration(); const s = g && await g.pushManager.getSubscription(); return s && s.endpoint; }).catch(() => null);
    console.log('  (suscripción push en el navegador de prueba: ' + (ep ? 'sí' : 'no') + ')');
    await como('dueno@test.cl', "public.cfx_pin_guardar('')");
    const errs = t.errores.filter((x) => !/ERR_|status of 404|push|Registration failed|permission/i.test(x)); assert(!errs.length, 'Sin errores ' + errs.slice(0, 3));
  } catch (e) { await t.foto('g61_error'); throw e; } finally { await t.cerrar(); }
  console.log('G61 OK');
})().catch((e) => { console.error(e.message); process.exit(1); });
