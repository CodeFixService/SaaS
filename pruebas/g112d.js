// G112 d · 🎬 Estudio de contenido como 🧩 módulo de las 5 apps con negocios (núcleo estudio.sql + estudio.js + est-motor.js).
// Servidor: solo el dueño, datos aislados por negocio, sin el módulo no crea pero sus datos siguen a la vista, nadie lee la tabla directo,
// entra en ⭐ Normal y 💎 Completo. Pantalla: desde Más se abre, se arma la base, sale la idea con 8 cajas, se guarda, métricas y 📊.
// FALLA con el código viejo (no existe cfx_estudio_mio ni el módulo 'estudio').  Uso: ANCHO=320 node g112d.js [despega barberia billetera bicitaller estaciona]
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
const BASE = "public.cfx_estudio_guardar('[{\"tipo\":\"base\",\"titulo\":\"el corte se ve disparejo\",\"datos\":{\"tema\":\"Corte\",\"cat\":\"error\"}},{\"tipo\":\"base\",\"titulo\":\"pica la nuca\",\"datos\":{\"tema\":\"Corte\",\"cat\":\"sintoma\"}},{\"tipo\":\"base\",\"titulo\":\"cada 3 semanas se nota\",\"datos\":{\"tema\":\"Corte\",\"cat\":\"dato\"}}]'::jsonb)";
const entrar = async (p, base, url, email, sel, tab) => {
  await p.goto(base + url); await p.waitForTimeout(1500); if (tab) { await p.click(tab); await p.waitForTimeout(300); }
  const e = sel ? sel[0] : 'input[type=email]:visible', c = sel ? sel[1] : 'input[type=password]:visible';
  await p.fill(e, email); await p.fill(c, 'clave123'); await p.press(c, 'Enter'); await p.waitForTimeout(3500);
};
// [repo, bd, preparar → { dueno, otro (otro dueño), nadie (sin negocio o cliente) }, login, abrir la hoja]
const APPS = {
  despega: ['/home/user/Aplicaciones', 'p_g112d_apl', async (t) => {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.crearUsuario('otro@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Otra' });
    await t.sim.su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl', 'Pepe', 'client', $1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123'); await t.sim.su('update public.profiles set terms_at = now()');
    return { nadie: 'cli@x.cl' };
  }, ['/'], async (p, base) => { await p.goto(base + '/#estudio'); await p.reload(); await p.waitForTimeout(3500); }],
  barberia: ['/home/user/barberia', 'p_g112d_bar', async (t) => {
    await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'barberia', barberia: 'Barbería Juan', nombre: 'Juan', telefono: '+56912345671' });
    await t.sim.crearUsuario('otro@x.cl', 'clave123', { rol: 'barberia', barberia: 'Otra', nombre: 'Leo', telefono: '+56912345673' });
    await t.sim.crearUsuario('cli@x.cl', 'clave123', { rol: 'cliente', barberia: (await t.sim.su('select codigo from public.barberias order by created_at limit 1'))[0].codigo, nombre: 'Pepe', telefono: '+56912345672' });
    await t.sim.su('update public.profiles set clave_temporal = false, tour_visto = true where true').catch(() => {});
    return { nadie: 'cli@x.cl' };
  }, ['/'], async (p) => { await p.evaluate(() => { const b = [...document.querySelectorAll('nav.cfx-barra > a, nav.cfx-barra > button')].pop(); if (b) b.click(); }); await p.waitForTimeout(1200);
    await p.click('text=Estudio de contenido >> visible=true'); await p.waitForTimeout(3000); }],
  billetera: ['/home/user/emprendedor', 'p_g112d_emp', async (t) => {
    for (const [e, n] of [['dueno@x.cl', 'Almacén Ana'], ['otro@x.cl', 'Otro']]) {
      const u = await t.sim.crearUsuario(e, 'clave123'); const c = await t.sim.pool.connect();
      await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()'); await c.query("select public.crear_negocio($1,'almacen',true)", [n]); c.release();
    }
    await t.sim.crearUsuario('cli@x.cl', 'clave123');
    return { nadie: 'cli@x.cl' };
  }, ['/#ingresar'], async (p, base) => { await p.goto(base + '/app/#estudio'); await p.reload(); await p.waitForTimeout(3500); }],
  bicitaller: ['/home/user/taller', 'p_g112d_tal', async (t) => {
    await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Sur', nombre: 'Ana' });
    await t.sim.crearUsuario('otro@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Otro', nombre: 'Leo' });
    await t.sim.crearUsuario('cli@x.cl', 'clave123', { rol: 'cliente', nombre: 'Pepe', taller: (await t.sim.su('select id from public.talleres order by created_at limit 1'))[0].id });
    await t.sim.su('update public.perfiles set terminos_at = now()').catch(() => {});
    return { nadie: 'cli@x.cl' };
  }, ['/'], async (p, base) => { await p.goto(base + '/taller/#mas'); await p.reload(); await p.waitForTimeout(3000); await p.click('text=Estudio de contenido >> visible=true'); await p.waitForTimeout(3000); }],
  estaciona: ['/home/user/estacionamiento', 'p_g112d_est', async (t) => {
    await t.sim.crearUsuario('dueno@x.cl', 'clave123'); await t.sim.crearUsuario('otro@x.cl', 'clave123');
    await t.sim.su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = 'Beto'");
    return { nadie: null };
  }, ['/#/avisos', ['#lEmail', '#lClave'], 'button[data-t=in]'], async (p) => { await p.evaluate(() => { const b = [...document.querySelectorAll('nav.cfx-barra > a, nav.cfx-barra > button')].pop(); if (b) b.click(); }); await p.waitForTimeout(1200);
    await p.click('text=Estudio de contenido >> visible=true'); await p.waitForTimeout(3000); }]
};

(async () => {
  const pedidas = process.argv.slice(2);
  for (const [n, [repo, db, prep, login, hoja]] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(n)) continue;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db); const su = t.sim.su, como = comoDe(su);
    try {
      await t.sim.crearUsuario(ADM, 'admin123').catch(() => {});
      const { nadie } = await prep(t);
      // ---------- servidor ----------
      const cat = (await su("select public.cfx_modulos_de_app() a, (select nombre from public.cfx_modulos_catalogo() where clave = 'estudio') nom, public.cfx_venta_modulos('crecer') cre, public.cfx_venta_modulos('completo') com"))[0];
      ok(cat.a.includes('estudio') && /Estudio/.test(cat.nom || ''), n + ': 🧩 módulo 🎬 en la app y en el catálogo');
      ok(cat.cre.includes('estudio') && cat.com.includes('estudio'), n + ': entra en ⭐ Normal y 💎 Completo');
      const pr = (await su("select has_table_privilege('authenticated', 'public.cfx_estudio', 'select') t, has_table_privilege('anon', 'public.cfx_estudio', 'select') a, has_function_privilege('anon', 'public.cfx_estudio_mio()', 'execute') fa, has_function_privilege('authenticated', 'public.cfx_estudio_guardar(jsonb)', 'execute') fg"))[0];
      ok(!pr.t && !pr.a && !pr.fa && pr.fg, n + ': 🔒 nadie lee la tabla directo; anon no llama; la cuenta sí');
      await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
      ok((await como('dueno@x.cl', 'public.cfx_estudio_mio()')).puede === false, n + ': sin el módulo la hoja dice que no puede');
      ok(/módulo/.test(await falla(() => como('dueno@x.cl', BASE)) || ''), n + ': 🔒 sin el módulo no se crea');
      if (nadie) ok(/dueño/.test(await falla(() => como(nadie, 'public.cfx_estudio_mio()')) || ''), n + ': 🔒 quien no es dueño no entra');
      await como('dueno@x.cl', "public.cfx_modulo_probar('estudio')");
      ok((await como('dueno@x.cl', BASE)).length === 3, n + ': 🎁 con la prueba guarda 3 filas de base');
      const otra = await como('otro@x.cl', 'public.cfx_estudio_mio()');
      ok(otra.lista.length === 0, n + ': 🔒 otro negocio no ve esas filas');
      const id = (await como('dueno@x.cl', 'public.cfx_estudio_mio()')).lista[0].id;
      await su("update public.cfx_modulos_negocio set hasta = now() + interval '1 day' where modulo = 'estudio'");
      await como('otro@x.cl', "public.cfx_modulo_probar('estudio')");
      ok(/No encontrada/.test(await falla(() => como('otro@x.cl', "public.cfx_estudio_guardar($2::jsonb)", [JSON.stringify({ id, titulo: 'hack' })])) || ''), n + ': 🔒 otro negocio no cambia una fila ajena');
      ok(/Tipo/.test(await falla(() => como('dueno@x.cl', "public.cfx_estudio_guardar('{\"tipo\":\"x\"}'::jsonb)")) || ''), n + ': tipo inválido se rechaza');
      // ---------- pantalla ----------
      const { page: p } = await t.nuevo();
      await entrar(p, t.base, login[0], 'dueno@x.cl', login[1], login[2]); await t.sinModales(p);
      await hoja(p, t.base);
      await p.waitForSelector('.cfx-est', { timeout: 12000 }).catch(() => {});
      ok(await p.locator('.cfx-est').count() === 1, n + ': Más → 🎬 Estudio se abre');
      if (!await p.locator('.cfx-est').count()) { await p.screenshot({ path: __dirname + '/capturas/g112d-' + n + '-falla.png' }); console.log('  url', p.url(), (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 300)); }
      await p.click('.cfx-est [data-v=idea]').catch(() => {}); await p.waitForTimeout(400);
      await p.click('.cfx-est [data-e=generar]'); await p.waitForTimeout(800);
      const cajas = await p.locator('.cfx-est [data-caja]').count();
      ok(cajas === 8, n + ': ✨ Generar idea → 8 cajas (' + cajas + ')');
      const ancho = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
      ok(ancho, n + ': cabe a ' + (process.env.ANCHO || 360) + ' px');
      await p.screenshot({ path: __dirname + '/capturas/g112d-' + n + '-idea.png' }).catch(() => {});
      await p.click('.cfx-est [data-e=guardar]'); await p.waitForTimeout(1200);
      const L = (await como('dueno@x.cl', 'public.cfx_estudio_mio()')).lista.filter((x) => x.tipo === 'idea');
      ok(L.length === 1 && L[0].estado === 'pendiente', n + ': 💾 la idea queda guardada en la base');
      if (n === 'despega' || n === 'billetera') {
        await p.click('.cfx-est [data-v=base]'); await p.click('.cfx-est [data-e=agregar]'); await p.waitForTimeout(300);
        await p.fill('.cfx-est #cfxEstT', 'Corte'); await p.fill('.cfx-est #cfxEstX', 'el degradado dura 2 semanas'); await p.click('.cfx-est [data-e=sumar]'); await p.waitForTimeout(1200);
        ok(/4 filas/.test(await p.locator('.cfx-est').innerText()), n + ': 📚 ＋ Agregar suma a la base (4 filas)');
        await p.click('.cfx-est [data-v=semana]'); await p.click('.cfx-est [data-e=abrir]'); await p.waitForTimeout(400);
        await p.fill('.cfx-est [data-m=vistas]', '1500'); await p.fill('.cfx-est [data-m=clientes]', '2'); await p.click('.cfx-est [data-e=guardarM]'); await p.waitForTimeout(1200);
        await p.click('.cfx-est [data-v=bi]'); await p.waitForTimeout(400);
        ok(/1 publicaciones[\s\S]*1\.500 vistas/.test(await p.locator('.cfx-est').innerText()), n + ': 📊 Qué funciona usa sus métricas');
        await p.screenshot({ path: __dirname + '/capturas/g112d-' + n + '-bi.png' }).catch(() => {});
        await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(300);
        await p.screenshot({ path: __dirname + '/capturas/g112d-' + n + '-oscuro.png' }).catch(() => {});
      }
      // 🛡️ módulo vencido: no crea, pero todo sigue a la vista y se puede borrar
      await su("update public.cfx_modulos_negocio set hasta = now() - interval '1 minute' where modulo = 'estudio'");
      const M = await como('dueno@x.cl', 'public.cfx_estudio_mio()');
      ok(!M.puede && M.lista.length >= 4, n + ': 🛡️ vencido el módulo sus datos siguen a la vista (' + M.lista.length + ')');
      ok((await como('dueno@x.cl', 'public.cfx_estudio_borrar($2::uuid[])', ['{' + id + '}'])) === 1, n + ': 🗑️ y puede borrarlos');
      await p.reload(); await p.waitForTimeout(2500); await t.sinModales(p);
      await hoja(p, t.base); await p.waitForSelector('.cfx-est', { timeout: 12000 }).catch(() => {});
      ok(/Probar módulo/.test(await p.locator('.cfx-est').innerText().catch(() => '')), n + ': sin el módulo muestra ▶️ Probar módulo');
      const err = t.errores.filter((e) => !/favicon|404|status of 400|módulo/.test(e));
      ok(!err.length, n + ': sin errores en la consola ' + err.slice(0, 2).join(' | '));
    } catch (e) { ok(false, n + ' error: ' + (e.stack || e).toString().slice(0, 400)); }
    await t.cerrar();
  }
  console.log(f ? '✗ ' + f + ' fallaron' : '✓ todo bien'); process.exit(f ? 1 : 0);
})();
