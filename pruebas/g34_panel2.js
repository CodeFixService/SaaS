// G34 parte 2 · 🧭 Paneles de Barbería, BiciTaller, Estaciona y Billetera en CM → Apps → 🧭 Panel (contra la base de cada app),
// y el admin que entra a Barbería va directo al CM (el socio se queda). FALLA con el código viejo (no hay 🧭 Panel en esas apps).
// Uso: ./base.sh /home/user/saas g34_cm && ./base.sh /home/user/Barberia g34_bar && ./base.sh /home/user/Taller g34_tal && ./base.sh /home/user/Estacionamiento g34_est && ./base.sh /home/user/Emprendedor g34_emp && node g34_panel2.js
const fs = require('fs');
const { abrir, servir } = require('./h');
const { crear } = require('./sim');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const REPOS = { SaaS: '/home/user/SaaS', Aplicaciones: '/home/user/Aplicaciones', Barberia: '/home/user/Barberia', Emprendedor: '/home/user/Emprendedor', Taller: '/home/user/Taller', Estacionamiento: '/home/user/Estacionamiento', Contenido: '/home/user/Contenido' };
(async () => {
  const t = await abrir('/home/user/saas', 'g34_cm');
  const log = (m) => t.errores.push(m), llamadas = [];
  const fun = (n) => (b) => { llamadas.push([n, b]); return b && b.accion === 'ping' ? { ok: true, version: '9.9', servicio: true } : b && b.accion === 'crear_usuario' ? { ok: true, codigo: 'abc123' } : { ok: true, borrados: 0, enviados: 0 }; };
  const bar = crear({ db: 'g34_bar', funciones: { enviar: fun('bar') }, log });
  const tal = crear({ db: 'g34_tal', funciones: { servidor: fun('tal') }, log });
  const est = crear({ db: 'g34_est', funciones: { enviar: fun('est') }, log });
  const emp = crear({ db: 'g34_emp', funciones: { enviar: fun('emp') }, log });
  const p = t.page;
  try {
    await t.ctx.route(/raw\.githubusercontent\.com\/CodeFixService\//, (r) => {
      const u = new URL(r.request().url()), [, , repo, , ...ruta] = u.pathname.split('/'), f = (REPOS[repo] || '') + '/' + ruta.join('/');
      return fs.existsSync(f) ? r.fulfill({ status: 200, body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    });
    await bar.conectar(t.ctx, /https:\/\/gxlabxuttnxvzkucckef\.supabase\.co\//);
    await tal.conectar(t.ctx, /https:\/\/iwvjthcmufirbnotgixi\.supabase\.co\//);
    await est.conectar(t.ctx, /https:\/\/wphxtspicejywwzlbuux\.supabase\.co\//);
    await emp.conectar(t.ctx, /https:\/\/zbgfvxsqajtixjzxoxeu\.supabase\.co\//);
    await t.sim.crearUsuario(ADM, 'admin123');
    // Datos de cada app
    await bar.crearUsuario(ADM, 'admin123');
    await bar.su("insert into public.user_invites (email, nombre, role, extra) values ('due@x.cl', 'Ana', 'owner', '{\"barberia\": \"Barbería Ana\"}')");
    await bar.crearUsuario('due@x.cl', 'clave123');
    await bar.su("insert into public.user_invites (email, nombre, role) values ('soc@x.cl', 'Socio Uno', 'socio')").catch(() => {});
    const soc = await bar.crearUsuario('soc@x.cl', 'clave123');
    await bar.su("update public.profiles set role = 'socio' where id = $1", [soc.id]).catch(() => {});
    const due = (await bar.su("select id, barberia_id from public.profiles where email = 'due@x.cl'"))[0];
    await tal.crearUsuario(ADM, 'admin123');
    await tal.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    const tid = (await tal.su("select id from public.talleres where nombre = 'Bici Ana'"))[0].id;
    const ea = await est.crearUsuario(ADM, 'admin123'); await est.su('update public.perfiles set es_admin = true where id = $1', [ea.id]);
    const eu = await est.crearUsuario('eu@x.cl', 'clave123'); await est.su("update public.perfiles set acepto_terminos = now(), nombre = 'Pedro' where id = $1", [eu.id]);
    await emp.crearUsuario(ADM, 'admin123'); await emp.su('select privado.fijar_admin()');
    const nu = await emp.crearUsuario('dueno@x.cl', 'clave123');
    const cn = await emp.pool.connect(); await cn.query("select set_config('request.jwt.claim.sub', $1, false)", [nu.id]);
    await cn.query('select public.aceptar_terminos()'); const neg = (await cn.query("select public.crear_negocio('Almacén Ana','almacen',true) ->> 'id' as id")).rows[0].id; cn.release();

    // CM → Apps
    await p.goto(t.base + '/');
    await p.fill('input[type=email]', ADM); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800);
    await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(3000); await t.sinModales();
    const conectar = async (id) => { const c = p.locator('[data-app=' + id + ']'); await c.locator('[data-a=con]').click(); await p.waitForTimeout(400);
      await p.fill('dialog #ce', ADM); await p.fill('dialog #cp', 'admin123'); await p.click('dialog #cok'); await p.waitForTimeout(2500); await t.sinModales(); return c; };
    const hoja = async (k) => { await t.sinModales(); await p.evaluate(() => document.querySelectorAll('.cfx-hoja-m').forEach((x) => x.remove())); await p.click('.cfx-aj [data-k=' + k + ']'); await p.waitForTimeout(1500); };
    const volver = async () => { await t.sinModales(); await p.evaluate(() => document.querySelectorAll('.cfx-hoja-m').forEach((x) => x.remove())); await p.click('#pnVolver'); await p.waitForTimeout(800); };
    const panel = async (id, secciones) => {
      const c = await conectar(id);
      assert(await c.locator('[data-a=panel]').count() === 1, '🧭 Panel en ' + id);
      await c.locator('[data-a=panel]').click(); await p.waitForTimeout(1200);
      const filas = await p.locator('.cfx-aj [data-k]').evaluateAll((l) => l.map((x) => x.dataset.k));
      assert(secciones.concat('link').every((k) => filas.includes(k)), id + ' secciones: ' + filas.join(','));
      assert(!/todavía tiene su panel propio/.test(await p.textContent('#pnZ')), id + ' sin aviso de panel propio');
      for (const k of secciones) { await hoja(k); const w = await p.locator('.cfx-hm-zona p.warn').allTextContents(); assert(!w.filter((x) => !/base es la|registro está cerrado|apagado|Falta generar|tareas automáticas|por revisar/.test(x)).length, id + ' · ' + k + ' abre sin error ' + w.join(' ')); }
      await t.foto('g34b_' + id);
    };
    const pedirOk = async (v) => { await p.fill('dialog[open] #pd', v); await p.click('dialog[open] #pdOk'); await p.waitForTimeout(1500); };

    // 💈 Barbería
    await panel('barberia', ['resumen', 'barberias', 'usuarios', 'registro_abierto', 'limpieza', 'reglas', 'push', 'calificaciones', 'socios', 'auditoria']);
    await hoja('barberias');
    assert(await p.locator('.cfx-hm-zona', { hasText: 'Barbería Ana' }).count() === 1, 'barbería listada');
    await p.click('.cfx-hm-zona [data-ver]'); await p.waitForTimeout(1500);
    assert(await p.locator('dialog[open] #fbD h3').count() >= 4, 'ficha con detalle (ventas, equipo, catálogo…)');
    await p.click('dialog[open] [data-p=dias]'); await p.waitForTimeout(300); await pedirOk('7');
    const pu = (await bar.su('select premium_until from public.profiles where id = $1', [due.id]))[0].premium_until;
    assert(pu && new Date(pu) > new Date(Date.now() + 5 * 864e5), '🎁 7 días de Premium guardados en la base de Barbería');
    await t.sinModales();
    await hoja('barberias'); assert(await p.locator('.cfx-hm-zona .pill.pro').count() >= 1, 'se ve ⭐ PREMIUM al recargar');
    await p.click('.cfx-hm-zona [data-ver]'); await p.waitForTimeout(1200); await p.click('dialog[open] [data-x=agenda]'); await p.waitForTimeout(1500);
    assert(await p.locator('dialog[open] #agL h3').count() >= 1, '📅 agenda por barbero');
    await t.sinModales();
    await hoja('barberias'); await p.click('.cfx-hm-zona #bbMas'); await p.fill('.cfx-hm-zona #bbB', 'Barbería Dos'); await p.fill('.cfx-hm-zona #bbN', 'Beto'); await p.fill('.cfx-hm-zona #bbE', 'beto@x.cl');
    await p.click('.cfx-hm-zona #bbOk'); await p.waitForTimeout(1500);
    assert(llamadas.some(([n, b]) => n === 'bar' && b.accion === 'crear_usuario' && b.barberia === 'Barbería Dos' && b.tipo === 'owner'), '➕ crear barbería llama a la función "enviar"');
    assert(/Corte\d{4}/.test(await p.inputValue('dialog[open] textarea')), 'mensaje de acceso con clave');
    await t.sinModales();
    await hoja('reglas'); await p.fill('.cfx-hm-zona [data-rg=dias_regalo]', '9'); await p.click('.cfx-hm-zona #rgOk'); await p.waitForTimeout(1500);
    await hoja('reglas'); assert(await p.inputValue('.cfx-hm-zona [data-rg=dias_regalo]') === '9', 'regla de Barbería guardada y se ve al reabrir');
    await hoja('registro_abierto'); assert(/\/registro\/$/.test(await p.inputValue('.cfx-hm-zona input[readonly]')), 'link de registro de barberías');
    await hoja('push'); await p.click('.cfx-hm-zona #puP'); await p.waitForTimeout(1000); assert(/Conectado/.test(await p.textContent('.cfx-hm-zona #puR')), 'ping a la función "enviar" de Barbería');
    assert(await t.anchoOk(), 'Barbería sin scroll horizontal (360 px)');
    await volver();

    // 🚲 BiciTaller
    await panel('bicitaller', ['resumen', 'talleres', 'clientes', 'registro_abierto', 'limpieza', 'reglas', 'push', 'calificaciones', 'socios', 'auditoria']);
    await hoja('talleres');
    await p.evaluate((id) => { const s = document.querySelector('.cfx-hm-zona select[data-prem="' + id + '"]'); s.value = '30'; s.dispatchEvent(new Event('change', { bubbles: true })); }, tid); await p.waitForTimeout(1500);
    const ph = (await tal.su('select premium_hasta from public.talleres where id = $1', [tid]))[0].premium_hasta;
    assert(ph && new Date(ph) > new Date(Date.now() + 40 * 864e5), '⭐ +30 días guardados en la base de BiciTaller (regalo + 30)');
    await p.click('.cfx-hm-zona [data-chat="' + tid + '"]'); await p.waitForTimeout(800); await p.fill('dialog[open] #chT', 'Hola Ana 👋'); await p.click('dialog[open] #chE'); await p.waitForTimeout(1200);
    assert((await tal.su("select count(*)::int n from public.mensajes where taller_id = $1 and texto = 'Hola Ana 👋'", [tid]))[0].n === 1, '💬 mensaje al chat del taller');
    await t.sinModales();
    await hoja('reglas'); await p.fill('.cfx-hm-zona [data-c=dias_saldo]', '45'); await p.click('.cfx-hm-zona #rgOk'); await p.waitForTimeout(1500);
    await hoja('reglas'); assert(await p.inputValue('.cfx-hm-zona [data-c=dias_saldo]') === '45', 'regla de BiciTaller guardada y se ve al reabrir');
    await hoja('push'); await p.click('.cfx-hm-zona #puP'); await p.waitForTimeout(1000); assert(/Conectado/.test(await p.textContent('.cfx-hm-zona #puR')), 'ping a la función "servidor" de BiciTaller');
    await volver();

    // 🅿️ Estaciona
    await panel('estaciona', ['resumen', 'verificaciones', 'denuncias', 'usuarios', 'estacionamientos', 'reglas', 'push', 'mant', 'auditoria']);
    await hoja('usuarios'); assert(await p.locator('.cfx-hm-zona', { hasText: 'Pedro' }).count() === 1, 'usuario listado');
    await p.evaluate((id) => { const s = document.querySelector('.cfx-hm-zona [data-id="' + id + '"] select[data-prem]'); s.value = '30'; s.dispatchEvent(new Event('change', { bubbles: true })); }, eu.id); await p.waitForTimeout(1500);
    const eph = (await est.su('select premium_hasta from public.perfiles where id = $1', [eu.id]))[0].premium_hasta;
    assert(eph && new Date(eph) > new Date(Date.now() + 20 * 864e5), '⭐ +30 días guardados en la base de Estaciona');
    await hoja('reglas'); await p.fill('.cfx-hm-zona [data-rg=dias_saldo]', '77'); await p.click('.cfx-hm-zona #rgOk'); await p.waitForTimeout(1500);
    await hoja('reglas'); assert(await p.inputValue('.cfx-hm-zona [data-rg=dias_saldo]') === '77', 'regla de Estaciona guardada y se ve al reabrir');
    await volver();

    // 👛 Billetera
    await panel('billetera', ['resumen', 'negocios', 'limpieza', 'conexiones', 'reglas', 'push', 'auditoria']);
    await hoja('negocios'); assert(await p.locator('.cfx-hm-zona', { hasText: 'Almacén Ana' }).count() === 1, 'billetera listada');
    await p.click('.cfx-hm-zona [data-id="' + neg + '"]'); await p.waitForTimeout(1200);
    await p.click('dialog[open] [data-a=dias]'); await p.waitForTimeout(300); await pedirOk('30');
    const bph = (await emp.su('select premium_hasta from public.negocios where id = $1', [neg]))[0].premium_hasta;
    assert(bph && new Date(bph) > new Date(Date.now() + 25 * 864e5), '⭐ Pro 30 días guardado en la base de Billetera');
    await t.sinModales();
    await hoja('reglas'); await p.fill('.cfx-hm-zona [data-rg=dias_gracia]', '6'); await p.click('.cfx-hm-zona #rgOk'); await p.waitForTimeout(1500);
    await hoja('reglas'); assert(await p.inputValue('.cfx-hm-zona [data-rg=dias_gracia]') === '6', 'regla de Billetera guardada y se ve al reabrir');
    await p.fill('.cfx-hm-zona #feF', '2027-09-18'); await p.fill('.cfx-hm-zona #feN', 'Fiestas Patrias'); await p.click('.cfx-hm-zona #feOk'); await p.waitForTimeout(1200);
    assert(await p.locator('.cfx-hm-zona #feL', { hasText: 'Fiestas Patrias' }).count() === 1, '📅 feriado agregado');
    assert(await t.anchoOk(), 'Billetera sin scroll horizontal (360 px)');
    await volver();

    // Admin en Barbería → CM; socio se queda en su panel.
    const B = await servir('/home/user/Barberia'), bb = 'http://localhost:' + B.address().port;
    const entrar = async (em, pw) => {
      const cx = await t.browser.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: 'block' }); await bar.conectar(cx);
      await cx.addInitScript(() => { window.CFX_SIN_HOLA = true; window.CFX_SIN_OBLIGAR = true; });
      await cx.route(/saas\.juanjosuecastilloloyola\.workers\.dev/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>CM</title><h1>Centro de Mando</h1>' }));
      const q = await cx.newPage(); await q.goto(bb + '/'); await q.waitForTimeout(1200);
      await q.fill('input[type=email]:visible', em); await q.fill('input[type=password]:visible', pw); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(4500); return q;
    };
    const qa = await entrar(ADM, 'admin123');
    assert(/saas\.juanjosuecastilloloyola\.workers\.dev\/admin\//.test(qa.url()), 'admin en Barbería → CM (' + qa.url() + ')');
    const rol = (await bar.su('select role from public.profiles where id = $1', [soc.id]))[0].role;
    if (rol === 'socio') { const qs = await entrar('soc@x.cl', 'clave123'); assert(qs.url().startsWith(bb), 'socio se queda en Barbería (' + qs.url() + ')'); await qs.screenshot({ path: __dirname + '/capturas/saas/g34b_socio.png' }); }
    else console.log('  (socio no se pudo crear en la base local: rol ' + rol + ')');
    B.close();
  } catch (e) { console.log(e.message); await t.foto('g34b_error'); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon/.test(x)).join('\n') || 'ninguno');
  for (const s of [bar, tal, est, emp]) await s.cerrar();
  await t.cerrar();
})();
