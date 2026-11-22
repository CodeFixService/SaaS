// G147 · 📱 "Síguenos" en el QR/afiche: núcleo vitrina.js redes.siguenos/mias/bajoQR + Barbería (🔗 Enlace y QR, 🔳 Mi link: primero las
// del barbero) + BiciTaller (QR y 🖨️ afiche). FALLA con lo viejo (no existe bajoQR ni el texto). Uso: ANCHO=320 node g147.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const como = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const ADM = 'juanjosuecastilloloyola@gmail.com';
const entrar = async (t, p, mail) => {
  await p.goto(t.base + '/'); await p.waitForTimeout(1200);
  await p.fill('input[type=email]:visible', mail); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
  await p.waitForTimeout(3500); await t.sinModales(p);
};
(async () => {
  // 💈 Barbería
  execSync(__dirname + '/base.sh /home/user/barberia p_g147', { stdio: 'ignore' });
  let t = await abrir('/home/user/barberia', 'p_g147'); let p = t.page, su = t.sim.su, C = como(su);
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    await su('select public.preparar_invitacion((select id from public.profiles where email = $1), $2, $3, $4, $5, $6)', [ADM, 'dueno@x.cl', 'Rodrigo', 'owner', '+56911111111', 'Barbería Hermanos']);
    await t.sim.crearUsuario('dueno@x.cl', 'clave123'); await su('update public.profiles set clave_temporal = false, tour_visto = true where true').catch(() => {});
    await C('dueno@x.cl', 'public.cfx_redes_guardar($2)', [JSON.stringify([{ red: 'tiktok', url: 'https://www.tiktok.com/@barberiahnos' }, { red: 'whatsapp', url: 'https://wa.me/56911111111' }])]);
    await entrar(t, p, 'dueno@x.cl');
    const tx = await p.evaluate(() => window.CodeFixVitrina && CodeFixVitrina.redes.siguenos ? CodeFixVitrina.redes.siguenos([{ red: 'instagram', url: 'https://instagram.com/x.y' }, { red: 'whatsapp', url: 'https://wa.me/56911111111' }]) : 'sin siguenos');
    ok(tx === 'Instagram @x.y · WhatsApp', '🧩 núcleo siguenos (sin mostrar el número): ' + tx);
    await p.goto(t.base + '/equipo/#enlace'); await p.waitForTimeout(3000); await t.sinModales(p);
    let s = await p.locator('[data-siguenos]:visible').last().innerText().catch(() => '');
    ok(s === 'Síguenos: TikTok @barberiahnos · WhatsApp', '🔗 Enlace y QR: ' + JSON.stringify(s));
    ok(await t.anchoOk(p), '🖥️ ancho ok'); await t.foto('g147-enlace');
    // 🔳 Mi link: sin redes propias → las de la barbería; con redes propias → las del barbero
    await p.goto(t.base + '/equipo/#milink'); await p.waitForTimeout(2500);
    s = await p.locator('[data-siguenos]:visible').last().innerText().catch(() => '');
    ok(/TikTok @barberiahnos/.test(s), '🔳 Mi link sin redes propias → las del negocio: ' + JSON.stringify(s));
    await C('dueno@x.cl', 'public.cfx_redes_persona_guardar($2)', [JSON.stringify([{ red: 'instagram', url: 'https://instagram.com/rodrigo.cortes' }])]);
    await p.goto(t.base + '/equipo/#hoy'); await p.waitForTimeout(800); await p.goto(t.base + '/equipo/#milink'); await p.reload(); await p.waitForTimeout(3000); await t.sinModales(p);
    s = await p.locator('[data-siguenos]:visible').last().innerText().catch(() => '');
    ok(s === 'Síguenos: Instagram @rodrigo.cortes', '🔳 Mi link con redes propias: ' + JSON.stringify(s));
    await t.foto('g147-milink');
  } catch (e) { ok(false, e.message.split('\n')[0]); }
  await t.cerrar();
  // 🚲 BiciTaller
  execSync(__dirname + '/base.sh /home/user/taller p_g147t', { stdio: 'ignore' });
  t = await abrir('/home/user/taller', 'p_g147t'); p = t.page; su = t.sim.su; C = como(su);
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    await C('taller@x.cl', 'public.cfx_redes_guardar($2)', [JSON.stringify([{ red: 'instagram', url: 'https://instagram.com/biciana' }])]);
    await entrar(t, p, 'taller@x.cl');
    await p.goto(t.base + '/taller/#hoy'); await p.waitForTimeout(2500); await t.sinModales(p);
    await p.click('#hQR'); await p.waitForTimeout(1500);
    const s = await p.locator('.qr + p.sub').first().innerText().catch(() => '');
    ok(s === 'Síguenos: Instagram @biciana', '🚲 QR del taller: ' + JSON.stringify(s));
    ok(await t.anchoOk(p), '🖥️ ancho ok'); await t.foto('g147-taller-qr');
    const [w] = await Promise.all([p.context().waitForEvent('page'), p.click('[data-afiche]')]);
    await w.waitForLoadState(); const a = await w.evaluate(() => document.body.innerText);
    ok(/Síguenos: Instagram @biciana/.test(a), '🖨️ afiche con "Síguenos"');
  } catch (e) { ok(false, e.message.split('\n')[0]); }
  await t.cerrar();
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
