// G153 · 🤝 CM → Usuarios: el súper admin pasa una cuenta de Usuario a Socio (y de vuelta). Al entrar, el socio va a admin/ y el usuario a app/.
// Uso: ANCHO=320 node g153.js   (base p_g153 · el SQL se prueba en g153.sql)
const { abrir } = require('./h'); const { execSync } = require('child_process');
const ADM = 'juanjosuecastilloloyola@gmail.com';
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const entrar = async (q, base, e, c) => { await q.goto(base + '/'); await q.fill('input[type=email]', e); await q.fill('input[type=password]', c); await q.press('input[type=password]', 'Enter'); await q.waitForTimeout(3000); };
(async () => {
  execSync(__dirname + '/base.sh /home/user/saas p_g153', { stdio: 'ignore' });
  const t = await abrir('/home/user/saas', 'p_g153'); const p = t.page;
  try {
    await t.sim.crearUsuario(ADM, 'admin123'); const u = await t.sim.crearUsuario('ana@x.cl', 'clave123');
    // La cuenta entra como usuario → app/ (deja su perfil guardado con el rol viejo).
    const { page: q } = await t.nuevo();
    await entrar(q, t.base, 'ana@x.cl', 'clave123'); ok(/\/app\//.test(q.url()), 'usuario entra a app/');
    await entrar(p, t.base, ADM, 'admin123'); await t.sinModales();
    await p.goto(t.base + '/admin/#usuarios'); await p.waitForTimeout(1500); await t.sinModales();
    const b = p.locator('[data-a=rol][data-id="' + u.id + '"]');
    ok(await b.count() === 1 && /Pasar a socio/.test(await b.textContent()), 'botón 🤝 Pasar a socio');
    ok(await p.locator('[data-a=rol]').count() === 1, 'sin botón para el admin');
    await b.click(); await p.waitForTimeout(400);
    await p.locator('dialog[open] button', { hasText: 'Pasar a socio' }).last().click(); await p.waitForTimeout(400);
    await p.fill('dialog[open] #mo', 'vende demos'); await p.click('dialog[open] #mok'); await p.waitForTimeout(1500);
    const r = (await t.sim.su('select rol, premium_hasta from public.perfiles where id = $1', [u.id]))[0];
    ok(r.rol === 'socio' && r.premium_hasta === null, 'quedó socio sin prueba');
    ok((await t.sim.su("select count(*)::int n from public.auditoria where accion = 'cambiar_rol' and detalle = 'usuario→socio ana@x.cl' and motivo = 'vende demos'"))[0].n === 1, 'registro con motivo');
    ok((await t.sim.su("select count(*)::int n from public.notificaciones where para = $1 and url = '/admin/'", [u.id]))[0].n === 1, 'aviso a la cuenta');
    ok(/Pasar a usuario/.test(await p.locator('[data-a=rol][data-id="' + u.id + '"]').textContent()), 'lista recargada: Pasar a usuario');
    ok(await t.anchoOk(), 'ancho ' + (process.env.ANCHO || 360));
    await t.foto('g153-usuarios');
    // Sesión con el rol viejo: al abrir app/ de nuevo refresca el perfil; entrar de nuevo → admin/.
    await q.goto(t.base + '/'); await q.waitForTimeout(3000);
    ok(/\/admin\//.test(q.url()), 'misma sesión: el inicio la manda a admin/');
    await q.goto(t.base + '/admin/'); await q.waitForTimeout(2500);
    ok(/\/admin\//.test(q.url()) && await q.locator('#v-resumen').count() === 1, 'socio entra al panel');
    // De vuelta a usuario.
    await p.locator('[data-a=rol][data-id="' + u.id + '"]').click(); await p.waitForTimeout(400);
    await p.locator('dialog[open] button', { hasText: 'Pasar a usuario' }).last().click(); await p.waitForTimeout(400);
    await p.click('dialog[open] #mok'); await p.waitForTimeout(1500);
    ok((await t.sim.su('select rol from public.perfiles where id = $1', [u.id]))[0].rol === 'usuario', 'volvió a usuario');
    await q.goto(t.base + '/admin/'); await q.waitForTimeout(3000);
    ok(/\/app\//.test(q.url()), 'sesión abierta en admin/ con rol viejo → la manda a app/');
  } catch (e) { ok(false, e.message); await t.foto('g153-error'); }
  const E = t.errores.filter((x) => !/favicon|push|Notification|404.*\.png/i.test(x));
  console.log('ERRORES:', E.join('\n') || 'ninguno');
  await t.cerrar(); console.log(f ? 'G153 FALLA (' + f + ')' : 'G153 OK'); process.exit(f ? 1 : 0);
})();
