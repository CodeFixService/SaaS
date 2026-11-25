// G162 b · 🔁 Compras recurrentes en Barbería, Billetera, BiciTaller y Estaciona (núcleo recurrente.sql + recurrente.js). FALLA con el código viejo.
//   Servidor: módulo en la app, solo el dueño, cada 7…365, el nombre del negocio en los avisos, cron deja "por cobrar" y avisa, ✅ pagado.
//   Pantalla: Más → 🔁 se abre, ➕ Nueva (nombre + WhatsApp + qué + precio), se guarda y sale en la lista con el resumen.
// Uso: ANCHO=360 node g162b.js [barberia billetera bicitaller estaciona]
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const HOJA = { barberia: 'Compras recurrentes', billetera: 'Cobros recurrentes', bicitaller: 'Compras recurrentes', estaciona: 'Arriendos recurrentes' };
const NOMBRE = { barberia: 'Barbería Juan', billetera: 'Almacén Ana', bicitaller: 'Bici Sur', estaciona: 'Beto' };
const entrar = async (p, base, url, email, sel, tab) => {
  await p.goto(base + url); await p.waitForTimeout(1500); if (tab) { await p.click(tab); await p.waitForTimeout(300); }
  const e = sel ? sel[0] : 'input[type=email]:visible', c = sel ? sel[1] : 'input[type=password]:visible';
  await p.fill(e, email); await p.fill(c, 'clave123'); await p.press(c, 'Enter'); await p.waitForTimeout(3500);
};
// [repo, bd, preparar → { dueno, otro (otro dueño), nadie (sin negocio o cliente) }, login, abrir la hoja]
const APPS = {
  barberia: ['/home/user/barberia', 'p_g162b_bar', async (t) => {
    await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'barberia', barberia: 'Barbería Juan', nombre: 'Juan', telefono: '+56912345671' });
    await t.sim.crearUsuario('otro@x.cl', 'clave123', { rol: 'barberia', barberia: 'Otra', nombre: 'Leo', telefono: '+56912345673' });
    await t.sim.crearUsuario('cli@x.cl', 'clave123', { rol: 'cliente', barberia: (await t.sim.su('select codigo from public.barberias order by created_at limit 1'))[0].codigo, nombre: 'Pepe', telefono: '+56912345672' });
    await t.sim.su('update public.profiles set clave_temporal = false, tour_visto = true where true').catch(() => {});
    return { nadie: 'cli@x.cl' };
  }, ['/'], async (p) => { await p.evaluate(() => { const b = [...document.querySelectorAll('nav.cfx-barra > a, nav.cfx-barra > button')].find((x) => /Más/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(1200);
    await p.click('text=Compras recurrentes >> visible=true'); await p.waitForTimeout(3000); }],
  billetera: ['/home/user/emprendedor', 'p_g162b_emp', async (t) => {
    for (const [e, n] of [['dueno@x.cl', 'Almacén Ana'], ['otro@x.cl', 'Otro']]) {
      const u = await t.sim.crearUsuario(e, 'clave123'); const c = await t.sim.pool.connect();
      await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()'); await c.query("select public.crear_negocio($1,'almacen',true)", [n]); c.release();
    }
    await t.sim.crearUsuario('cli@x.cl', 'clave123');
    return { nadie: 'cli@x.cl' };
  }, ['/#ingresar'], async (p, base) => { await p.goto(base + '/app/#recurrentes'); await p.reload(); await p.waitForTimeout(3500); }],
  bicitaller: ['/home/user/taller', 'p_g162b_tal', async (t) => {
    await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Sur', nombre: 'Ana' });
    await t.sim.crearUsuario('otro@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Otro', nombre: 'Leo' });
    await t.sim.crearUsuario('cli@x.cl', 'clave123', { rol: 'cliente', nombre: 'Pepe', taller: (await t.sim.su('select id from public.talleres order by created_at limit 1'))[0].id });
    await t.sim.su('update public.perfiles set terminos_at = now()').catch(() => {});
    return { nadie: 'cli@x.cl' };
  }, ['/'], async (p, base) => { await p.goto(base + '/taller/#mas'); await p.reload(); await p.waitForTimeout(3000); await p.click('text=Compras recurrentes >> visible=true'); await p.waitForTimeout(3000); }],
  estaciona: ['/home/user/estacionamiento', 'p_g162b_est', async (t) => {
    await t.sim.crearUsuario('dueno@x.cl', 'clave123'); await t.sim.crearUsuario('otro@x.cl', 'clave123');
    await t.sim.su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = 'Beto'");
    return { nadie: null };
  }, ['/#/avisos', ['#lEmail', '#lClave'], 'button[data-t=in]'], async (p) => { await p.evaluate(() => { const b = [...document.querySelectorAll('nav.cfx-barra > a, nav.cfx-barra > button')].pop(); if (b) b.click(); }); await p.waitForTimeout(1200);
    await p.click('text=Arriendos recurrentes >> visible=true'); await p.waitForTimeout(3000); }]
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
      const hoy = (await su("select (now() at time zone 'America/Santiago')::date::text d"))[0].d;
      ok((await su("select 'suscripciones' = any(public.cfx_modulos_de_app()) a"))[0].a, n + ': 🧩 🔁 es módulo de la app');
      await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
      const P = (x) => JSON.stringify(Object.assign({ nombre: 'Pepe', whatsapp: '912345678', items: [{ nombre: 'Mensualidad', precio: 30000, cant: 1 }], cada: 30, aviso: 1 }, x));
      ok(/módulo/.test((await como('dueno@x.cl', 'public.cfx_recurrente_guardar($2::jsonb)', [P({})])).error || ''), n + ': 🔒 sin el módulo no se crea');
      await como('dueno@x.cl', "public.cfx_modulo_probar('suscripciones')");
      if (nadie) ok(!(await como(nadie, 'public.cfx_recurrente_guardar($2::jsonb)', [P({})])).ok, n + ': 🔒 quien no es dueño no crea');
      ok(!(await como('dueno@x.cl', 'public.cfx_recurrente_guardar($2::jsonb)', [P({ cada: 3 })])).ok, n + ': ⛔ cada 3 días no');
      const r = await como('dueno@x.cl', 'public.cfx_recurrente_guardar($2::jsonb)', [P({ cada: 90 })]);
      ok(r.ok && r.rec.total === 30000 && r.rec.whatsapp === '56912345678' && r.rec.tienda === NOMBRE[n], n + ': 🔁 cada 90 días · $30.000 · WhatsApp +56 · nombre del negocio (' + (r.rec && r.rec.tienda) + ')');
      ok((await como('otro@x.cl', 'public.cfx_recurrente_lista()')).items.length === 0, n + ': 🔒 otro negocio no la ve');
      await su('update public.cfx_recurrentes set proxima = $1::date', [hoy]); await su('select public.cfx_recurrentes_correr()');
      const c = (await su('select * from public.cfx_recurrente_cobros'))[0];
      ok(c && c.estado === 'pendiente' && c.monto === 30000, n + ': 📅 el día que toca queda "por cobrar"');
      const L = await como('dueno@x.cl', 'public.cfx_recurrente_lista()');
      ok(L.resumen.por_cobrar === 30000 && L.resumen.al_mes === 10000, n + ': 📊 resumen: $10.000 al mes · $30.000 por cobrar');
      ok((await como('dueno@x.cl', 'public.cfx_recurrente_pagado($2)', [c.id])).ok, n + ': ✅ el dueño lo marca pagado');
      // ---------- pantalla ----------
      const { page: p } = await t.nuevo();
      await entrar(p, t.base, login[0], 'dueno@x.cl', login[1], login[2]); await t.sinModales(p);
      await hoja(p, t.base);
      await p.waitForSelector('.cfx-rc', { timeout: 12000 }).catch(() => {});
      ok(await p.locator('.cfx-rc').count() === 1, n + ': Más → 🔁 se abre');
      if (!await p.locator('.cfx-rc').count()) { await p.screenshot({ path: __dirname + '/capturas/g162b-' + n + '-falla.png' }); console.log('  url', p.url(), (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 300)); }
      ok(/Al mes/.test(await p.locator('.cfx-rc').innerText().catch(() => '')) && /Pepe/.test(await p.locator('.cfx-rc').innerText().catch(() => '')), n + ': 📊 resumen y la de Pepe a la vista');
      await p.click('.cfx-rc [data-a=nueva]'); await p.waitForTimeout(400);
      if (await p.locator('.cfx-rc #rcCli').count()) await p.selectOption('.cfx-rc #rcCli', '');
      await p.fill('.cfx-rc #rcNom', 'Lucía'); await p.fill('.cfx-rc #rcWa', '+56 9 8765 4321');
      const sel = p.locator('.cfx-rc [data-l] select');
      if (await sel.count()) await sel.first().selectOption('');
      await p.fill('.cfx-rc [data-l] [data-nom]', 'Plan mensual'); await p.fill('.cfx-rc [data-l] [data-pre]', '12000');
      await p.selectOption('.cfx-rc #rcCada', '7');
      await p.screenshot({ path: __dirname + '/capturas/g162b-' + n + '.png' }).catch(() => {});
      await p.click('.cfx-rc [data-a=guardar]'); await p.waitForTimeout(2500);
      const L2 = await como('dueno@x.cl', 'public.cfx_recurrente_lista()');
      ok(L2.items.some((x) => x.nombre === 'Lucía' && x.cada === 7 && x.total === 12000 && x.whatsapp === '56987654321'), n + ': ➕ se guarda desde la pantalla (Lucía, cada semana, $12.000)');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), n + ': cabe a ' + (process.env.ANCHO || 360) + ' px');
      const err = t.errores.filter((e) => !/favicon|404|status of 400|módulo/.test(e));
      ok(!err.length, n + ': sin errores en la consola ' + err.slice(0, 2).join(' | '));
    } catch (e) { ok(false, n + ' error: ' + (e.stack || e).toString().slice(0, 400)); }
    await t.cerrar();
  }
  console.log(f ? '✗ ' + f + ' fallaron' : '✓ todo bien'); process.exit(f ? 1 : 0);
})();
