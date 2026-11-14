// G44b · 🏷️ Avisos de actualización SOLO con categoría: CM → Apps → 🚀 Liberar pide casillas (🔒 ⚙️ 🖥️ ✏️ 🎁) y un detalle
// que solo ve el admin; al usuario le llega "🔄 Nueva versión: 🔒 Seguridad · ✏️ Mejoras", nunca qué se hizo. FALLA con el código viejo.
// Uso: ./base.sh /home/user/saas g44b_cm && ./base.sh /home/user/Aplicaciones g44b_apl && ANCHO=320 node g44b.js
const fs = require('fs');
const { abrir } = require('./h');
const { crear } = require('./sim');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const REPOS = { SaaS: '/home/user/SaaS', Aplicaciones: '/home/user/Aplicaciones', Barberia: '/home/user/Barberia', Emprendedor: '/home/user/Emprendedor', Taller: '/home/user/Taller', Estacionamiento: '/home/user/Estacionamiento' };
(async () => {
  const t = await abrir('/home/user/saas', 'g44b_cm');
  const ap = crear({ db: 'g44b_apl', funciones: { enviar: () => ({ version: '3.5', servicio: true, ok: true }) }, log: (m) => t.errores.push(m) });
  const p = t.page;
  try {
    await t.ctx.route(/raw\.githubusercontent\.com\/CodeFixService\//, (r) => {
      const u = new URL(r.request().url()), [, , repo, , ...ruta] = u.pathname.split('/'), f = (REPOS[repo] || '') + '/' + ruta.join('/');
      if (repo === 'Aplicaciones' && ruta.join('/') === 'version.json') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Object.assign(JSON.parse(fs.readFileSync(f, 'utf8')), { version: '9.9', notas: '🔒 Seguridad · ✏️ Mejoras' })) });
      return fs.existsSync(f) ? r.fulfill({ status: 200, body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    });
    await ap.conectar(t.ctx, /https:\/\/gilsamacgappycibcqhq\.supabase\.co\//);
    await t.sim.crearUsuario(ADM, 'admin123');
    await ap.crearUsuario(ADM, 'admin123'); await ap.crearUsuario('ana@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await ap.su("update public.profiles set terms_at = now()");
    await p.goto(t.base + '/');
    await p.fill('input[type=email]', ADM); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800);
    await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(3000); await t.sinModales();
    const card = p.locator('[data-app=aplicaciones]');
    await card.locator('[data-a=con]').click(); await p.waitForTimeout(400);
    await p.fill('dialog #ce', ADM); await p.fill('dialog #cp', 'admin123'); await p.click('dialog #cok'); await p.waitForTimeout(2500); await t.sinModales();
    await card.locator('[data-a=lib]').click(); await p.waitForTimeout(600);
    const cats = await p.evaluate(() => [...document.querySelectorAll('dialog [data-cat]')].map((x) => x.dataset.cat + (x.checked ? '+' : '')));
    assert(cats.join(',') === 'seg+,func,sis,mej+,pre', 'Liberar: 5 casillas, marcadas las de version.json ' + cats.join(','));
    assert(await t.anchoOk(), 'ancho 320'); await t.foto('g44b_liberar');
    await p.click('dialog [data-cat=func]'); await p.fill('dialog #libDet', 'arreglé el campo de dominio');
    await p.click('dialog [data-si]'); await p.waitForTimeout(2500);
    const av = await ap.su("select title as titulo, body as cuerpo from public.notifications where body like '%v9.9%'");
    const txt = av.map((x) => x.titulo + ' | ' + x.cuerpo).join('\n');
    assert(av.length >= 1 && /🔒 Seguridad · ⚙️ Funcionamiento · ✏️ Mejoras/.test(txt) && !/dominio/.test(txt), 'Aviso solo con categorías ' + JSON.stringify(av[0]));
    const [v] = await ap.su("select notas, detalle from public.cfx_versiones where version = '9.9'");
    assert(v && v.detalle === 'arreglé el campo de dominio', 'Detalle guardado solo para el admin ' + JSON.stringify(v));
    const [r] = await ap.su("select detalle from public.cfx_registro where accion = 'version' order by 1 desc limit 1");
    assert(r && /dominio/.test(r.detalle), '📜 Registro con el detalle ' + (r && r.detalle));
    const [x] = await ap.su("select public.cfx_version_categorias('✉️ Nuevo: pon el Gmail de tu tienda') c");
    assert(x.c === '', 'Texto libre viejo no llega al usuario');
  } catch (e) { console.log(e.message); await t.foto('g44b_error'); process.exitCode = 1; }
  const errs = t.errores.filter((x) => !/raw\.githubusercontent|Failed to load resource|ERR_|db_version/.test(x));
  console.log('ERRORES:', errs.join('\n') || 'ninguno');
  await t.cerrar();
})();
