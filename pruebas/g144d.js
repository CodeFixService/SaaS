// G144 d · 💬 El WhatsApp del registro pasa SOLO a 📱 Mis redes; en la página pública se OCULTA el botón antiguo (uno solo, con su mensaje listo)
// y no deja agregar otro WhatsApp repetido (editor y servidor). Si el dueño lo quita, no vuelve solo. FALLA con el código viejo.
// Uso: ANCHO=320 node g144d.js
const { abrir } = require('./h'); const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g144d', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g144d'); const su = t.sim.su;
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  const reds = (L) => (L || []).map((x) => x.red + ':' + x.url).join(' ');
  try {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await su("update public.profiles set terms_at = now(), slug = 'ana', telefono = '+56 9 1234 5678' where id = $1", [u.id]);
    let m = await como('tienda@x.cl', 'public.cfx_redes_mias()');
    ok(/whatsapp:https:\/\/wa\.me\/56912345678/.test(reds(m.lista)), 'El WhatsApp del registro ya está en Mis redes (' + reds(m.lista) + ')');
    ok(/whatsapp/.test(reds(await como('tienda@x.cl', "public.cfx_redes_publicas('ana')"))), 'Y en las redes públicas');
    // Redes de antes (perfil.instagram) + WhatsApp automático: se ven las dos (nada se pierde)
    await su("update public.profiles set perfil = '{\"instagram\":\"@anaviejo\"}'::jsonb where id = $1", [u.id]);
    await t.page.goto(t.base + '/t/?s=ana'); await t.page.waitForTimeout(3500);
    const v0 = await t.page.evaluate(() => [...document.querySelectorAll('[data-pf-redes] a.cfx-red')].map((a) => a.dataset.red).join(','));
    ok(/whatsapp/.test(v0) && /instagram/.test(v0), 'Sin redes guardadas: WhatsApp del registro + Instagram de antes (' + v0 + ')');
    let e = ''; try { await como('tienda@x.cl', "public.cfx_redes_guardar('[{\"red\":\"whatsapp\",\"url\":\"https://wa.me/56912345678\"},{\"red\":\"whatsapp\",\"url\":\"https://wa.me/56999999999\"}]')"); } catch (x) { e = x.message; }
    ok(/uno solo/.test(e), 'Servidor: no deja 2 WhatsApp (' + e + ')');
    await como('tienda@x.cl', "public.cfx_redes_guardar('[{\"red\":\"instagram\",\"url\":\"https://instagram.com/ana\"}]')");
    m = await como('tienda@x.cl', 'public.cfx_redes_mias()');
    ok(!/whatsapp/.test(reds(m.lista)) && /instagram/.test(reds(m.lista)), 'Si el dueño lo quita, no vuelve solo (' + reds(m.lista) + ')');
    await como('tienda@x.cl', "public.cfx_redes_guardar('[{\"red\":\"instagram\",\"url\":\"https://instagram.com/ana\"},{\"red\":\"whatsapp\",\"url\":\"https://wa.me/56912345678\"}]')");
    const p = t.page;
    await p.goto(t.base + '/t/?s=ana'); await p.waitForTimeout(3500); await t.sinModales(p);
    const pub = await p.evaluate(() => { const v = document.querySelector('.pf-acc a.btn.ok'), a = document.querySelector('[data-pf-redes] a.cfx-red[data-red="whatsapp"]');
      return { viejo: v ? getComputedStyle(v).display : 'no hay', red: a ? a.getAttribute('href') : '', n: [...document.querySelectorAll('a[href*="wa.me/56912345678"]')].filter((x) => x.offsetParent).length }; });
    ok(pub.viejo === 'none' && /wa\.me\/56912345678/.test(pub.red) && pub.n === 1, 'Página pública: UN solo WhatsApp (el de las redes), el botón antiguo oculto ' + JSON.stringify(pub));
    await p.screenshot({ path: __dirname + '/capturas/g144d-publica.png' });
    // Sin WhatsApp en redes → el botón antiguo se ve como siempre
    await como('tienda@x.cl', "public.cfx_redes_guardar('[{\"red\":\"instagram\",\"url\":\"https://instagram.com/ana\"}]')");
    await p.reload(); await p.waitForTimeout(3500);
    ok(await p.evaluate(() => { const v = document.querySelector('.pf-acc a.btn.ok'); return !!v && getComputedStyle(v).display !== 'none'; }), 'Sin WhatsApp en redes: el botón antiguo se ve');
    // Editor: no deja agregar un 2.º WhatsApp
    await como('tienda@x.cl', "public.cfx_redes_guardar('[{\"red\":\"whatsapp\",\"url\":\"https://wa.me/56912345678\"}]')");
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'tienda@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(3500); await t.sinModales(p);
    const ed = await p.evaluate(async () => {
      const z = document.createElement('div'); document.body.appendChild(z);
      await CodeFixVitrina.redes.editor(z, { rpc: (f, x) => Cuenta.rpc(f, x) });
      const i = z.querySelector('#cfxReIn'); i.value = '+56 9 8888 7777'; i.dispatchEvent(new Event('input')); z.querySelector('[data-re="suma"]').click();
      return z.querySelectorAll('.cfx-re-fila').length + '|' + [...z.querySelectorAll('.cfx-re-fila b')].map((b) => b.textContent).join(',');
    });
    ok(/^1\|WhatsApp/.test(ed), 'Editor: no agrega un 2.º WhatsApp (' + ed + ')');
  } catch (e) { console.log('✗ ERROR', e.message); f++; }
  await t.cerrar(); console.log(f ? '✗ ' + f + ' fallas' : '✓ G144 d OK'); process.exit(f ? 1 : 0);
})();
