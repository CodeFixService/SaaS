// G95 · 🎁 Prueba 7 días por BOTÓN (módulos y Premium), una vez por CORREO: todos parten FREE; cfx_pruebas_usadas guarda el hash
//        del correo y no se borra al eliminar la cuenta → con el mismo correo ya no hay botón y el servidor rechaza. CM → Control → 🎁 Pruebas.
// FALLA con el código viejo (no existe cfx_pro_probar; BiciTaller/Billetera/Estaciona/Despega/Barbería regalaban Premium al registrarse;
// la prueba de módulos era por negocio y G25 había quitado el botón). Uso: ANCHO=320 node g95.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
// Cada app: cómo se crea su negocio (2.ª vez con el mismo correo = vuelve tras borrar su cuenta).
const APPS = [
  ['Aplicaciones', 'Despega', async (t, n) => t.sim.crearUsuario('dueno@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda ' + n })],
  ['barberia', 'Barbería', async (t, n) => t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'barberia', barberia: 'Barbería ' + n, nombre: 'Ana', telefono: '+5691234567' + n })],
  ['emprendedor', 'Billetera', async (t, n, su) => {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123'); const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()');
    await c.query("select public.crear_negocio('Almacén " + n + "','almacen',true)"); c.release(); return u;
  }],
  ['taller', 'BiciTaller', async (t, n) => t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici ' + n, nombre: 'Ana' })],
  ['estacionamiento', 'Estaciona', async (t) => t.sim.crearUsuario('dueno@x.cl', 'clave123')],
];
(async () => {
  for (const [repo, nombre, crear] of APPS) {
    const bd = 'p_g95_' + repo.toLowerCase();
    execSync(__dirname + '/base.sh /home/user/' + repo + ' ' + bd, { stdio: 'ignore' });
    const t = await abrir('/home/user/' + repo, bd); const su = t.sim.su, como = comoDe(su);
    try {
      await t.sim.crearUsuario(ADM, 'admin123'); if (repo === 'emprendedor') await su('select privado.fijar_admin()');
      await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
      const u1 = await crear(t, 1, su);
      let e = await como('dueno@x.cl', 'public.cfx_pago_estado()');
      const prem = (y) => !!(y.premium_hasta && new Date(y.premium_hasta) > new Date());
      ok(!prem(e.yo) && e.prueba_pro && e.prueba_pro.puede === true && e.prueba_pro.dias === 7, nombre + ': parte FREE y ve 🎁 Probar Premium 7 días ' + JSON.stringify(e.prueba_pro));
      // 🧩 módulos: los 2 primeros que se venden
      let T = await como('dueno@x.cl', 'public.cfx_modulos_tienda()');
      const M = T.modulos.filter((m) => m.vende && !m.activo && !m.plan).map((m) => m.clave);
      ok(M.length >= 2 && T.prueba_dias === 7 && T.modulos.every((m) => !m.prueba_usada), nombre + ': tienda con módulos para probar (' + M.slice(0, 2).join(', ') + ')');
      const r = await como('dueno@x.cl', 'public.cfx_modulo_probar($2)', [M[0]]);
      T = await como('dueno@x.cl', 'public.cfx_modulos_tienda()');
      const m0 = T.modulos.find((m) => m.clave === M[0]);
      ok(r.ok && m0.activo && m0.origen === 'prueba' && Math.round((new Date(m0.hasta) - Date.now()) / 864e5) === 7, nombre + ': 🎁 módulo ' + M[0] + ' activo 7 días');
      ok(!!(await falla(() => como('dueno@x.cl', 'public.cfx_modulo_probar($2)', [M[0]]))), nombre + ': 🔒 el mismo módulo no se prueba 2 veces');
      // ⭐ Premium
      const p = await como('dueno@x.cl', 'public.cfx_pro_probar()');
      e = await como('dueno@x.cl', 'public.cfx_pago_estado()');
      const enPrueba = repo === 'emprendedor' ? (await su("select privado.estado_plan(id) s from public.negocios where dueno = $1", [u1.id]))[0].s === 'prueba' : prem(e.yo);
      ok(p.ok && p.dias === 7 && enPrueba && e.prueba_pro.puede === false, nombre + ': 🎁 Premium de prueba activo 7 días y el botón desaparece');
      ok(/Ya (usaste|tienes)/.test(await falla(() => como('dueno@x.cl', 'public.cfx_pro_probar()')) || ''), nombre + ': 🔒 no se prueba Premium 2 veces');
      if (repo === 'estacionamiento') ok((await su('select plan_origen from public.perfiles where id = $1', [u1.id]))[0].plan_origen === 'prueba', 'Estaciona: queda como plan_origen prueba (no pago)');
      // 🗑️ Borra su cuenta (el correo deja de existir) y vuelve a registrarse con el MISMO correo (en mayúsculas)
      await su("update auth.users set email = 'borrada-' || id || '@x.cl' where id = $1", [u1.id]);
      await su("delete from auth.claves where email = 'dueno@x.cl'").catch(() => {});
      if (repo === 'barberia' || repo === 'Aplicaciones' || repo === 'taller' || repo === 'estacionamiento') await su("update public." + (repo === 'taller' || repo === 'estacionamiento' ? 'perfiles' : 'profiles') + " set email = 'borrada@x.cl' where id = $1", [u1.id]).catch(() => {});
      if (repo === 'emprendedor') await su("update public.negocios set estado = 'eliminado' where dueno = $1", [u1.id]);
      const u2 = await crear(t, 2, su);
      ok(u2.id !== u1.id, nombre + ': cuenta nueva con el mismo correo');
      e = await como('dueno@x.cl', 'public.cfx_pago_estado()');
      ok(!prem(e.yo) && e.prueba_pro.puede === false && e.prueba_pro.usada === true, nombre + ': cuenta nueva FREE y SIN botón de Premium (ya lo usó ese correo)');
      ok(/con este correo/.test(await falla(() => como('dueno@x.cl', 'public.cfx_pro_probar()')) || ''), nombre + ': 🔒 el servidor rechaza la 2.ª prueba Premium con ese correo');
      T = await como('dueno@x.cl', 'public.cfx_modulos_tienda()');
      ok(T.modulos.find((m) => m.clave === M[0]).prueba_usada === true && T.modulos.find((m) => m.clave === M[1]).prueba_usada === false, nombre + ': módulo ya probado sin botón; el otro sí');
      ok(/con este correo/.test(await falla(() => como('dueno@x.cl', 'public.cfx_modulo_probar($2)', [M[0]])) || ''), nombre + ': 🔒 el servidor rechaza el módulo ya probado');
      ok((await como('dueno@x.cl', 'public.cfx_modulo_probar($2)', [M[1]])).ok, nombre + ': puede probar otro módulo (' + M[1] + ')');
      const A = await como(ADM, 'public.cfx_pruebas_admin()');
      ok(A.total === 3 && A.items.pro === 1 && A.ultimas[0].email === 'dueno@x.cl', nombre + ': admin ve quién probó qué ' + JSON.stringify(A.items));
      ok(!!(await falla(() => como('dueno@x.cl', 'public.cfx_pruebas_admin()'))), nombre + ': 🔒 solo el admin ve la lista');
      await su("update public.cfx_config set valor = jsonb_set(valor, '{prueba_dias}', '0') where clave = 'modulos_venta'");
      ok(/no está disponible/.test(await falla(() => como('dueno@x.cl', 'public.cfx_modulo_probar($2)', [M[2] || M[0]])) || ''), nombre + ': días de prueba = 0 → sin prueba');
      // 🖥️ Pantalla (Billetera): tienda con 🎁 Probar 7 días + hoja ⭐ Premium con 🎁, 320 px
      if (repo === 'emprendedor') {
        await su("update public.cfx_config set valor = jsonb_set(valor, '{prueba_dias}', '7') where clave = 'modulos_venta'");
        const u3 = await t.sim.crearUsuario('nueva@x.cl', 'clave123'); const c = await t.sim.pool.connect();
        await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u3.id]); await c.query('select public.aceptar_terminos()');
        await c.query("select public.crear_negocio('Feria Lu','feria',true)"); c.release();
        const pg = t.page;
        await pg.goto(t.base + '/#ingresar'); await pg.waitForTimeout(1200);
        await pg.fill('input[type=email]:visible', 'nueva@x.cl'); await pg.fill('input[type=password]:visible', 'clave123'); await pg.press('input[type=password]:visible', 'Enter');
        await pg.waitForTimeout(3000); await t.sinModales(pg);
        await pg.goto(t.base + '/app/#modulos'); await pg.waitForTimeout(2200); await t.sinModales(pg);
        const nb = await pg.locator('[data-gratis]').count();
        ok(nb >= 4 && /Probar 7 días/.test(await pg.locator('main').innerText()), '🖥️ Billetera: cada módulo trae 🎁 Probar 7 días (' + nb + ')');
        ok(await t.anchoOk(pg), '🖥️ ancho ok tienda'); await t.foto('g95-tienda');
        await pg.locator('.cfxm-mod [data-gratis]').first().click();  // un módulo suelto (el pack prende varios)
        await pg.waitForFunction((n) => document.querySelectorAll('[data-gratis]').length < n, nb, { timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(500);
        const nb2 = await pg.locator('[data-gratis]').count(), tx2 = await pg.locator('main').innerText();
        ok(nb2 === nb - 1 && /Prueba gratis hasta/.test(tx2), '🖥️ al tocarlo queda activo y ese botón desaparece (' + nb2 + ') ' + JSON.stringify(tx2.slice(0, 200)));
        await pg.goto(t.base + '/app/#plan'); await pg.waitForTimeout(1800); await t.sinModales(pg);
        await pg.locator('button:has-text("Pasar a Pro")').first().click(); await pg.waitForTimeout(1800);
        ok(await pg.locator('dialog.cfx-pago [data-propro]').count() === 1, '🖥️ hoja ⭐ Premium con 🎁 Probar 7 días gratis');
        await t.foto('g95-premium');
        await pg.locator('dialog.cfx-pago [data-propro]').click(); await pg.waitForTimeout(1500);
        ok(/Premium gratis hasta/.test(await pg.locator('dialog.cfx-pago').innerText()), '🖥️ ¡Listo! Premium gratis hasta …');
        await pg.locator('dialog.cfx-pago [data-x]').first().click(); await pg.waitForTimeout(2500); await t.sinModales(pg);
        ok(/probando Pro/.test(await pg.locator('body').innerText()), '🖥️ al continuar, la app muestra que está probando Pro');
        await pg.goto(t.base + '/app/#plan'); await pg.waitForTimeout(1800); await t.sinModales(pg);
        await pg.locator('button:has-text("Pasar a Pro")').first().click(); await pg.waitForTimeout(1800);
        ok(await pg.locator('dialog.cfx-pago [data-propro]').count() === 0, '🖥️ la 2.ª vez la hoja ya no ofrece la prueba');
      }
    } catch (x) { console.log('✗ ' + nombre + ': ' + x.message); f++; }
    await t.cerrar();
  }
  // ---------- CM → Control → 🎁 Pruebas ----------
  execSync(__dirname + '/base.sh /home/user/saas p_g95_cm', { stdio: 'ignore' });
  const t = await abrir('/home/user/saas', 'p_g95_cm'); const p = t.page, su = t.sim.su;
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    await su("insert into public.cfx_pruebas_usadas (hash, item) values (public.cfx_hash_correo('ana@x.cl'), 'pro'), (public.cfx_hash_correo('ana@x.cl'), 'chat')");
    await p.goto(t.base + '/'); await p.fill('input[type=email]', ADM); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800); await t.sinModales();
    await p.goto(t.base + '/admin/#control'); await p.waitForTimeout(3500); await t.sinModales();
    await p.click('[data-s="pruebas"]'); await p.waitForTimeout(2000);
    const txt = await p.locator('#ctlCuerpo').innerText();
    ok(/Pruebas gratis usadas/.test(txt) && /Premium · 1/.test(txt) && /\(cuenta borrada\)/.test(txt) && /Total: 2/.test(txt), 'CM: Control → 🎁 Pruebas muestra quién probó qué ' + JSON.stringify(txt.slice(0, 600)));
    ok(await t.anchoOk(p), 'CM: ancho ok'); await t.foto('g95-cm');
  } catch (x) { console.log('✗ CM: ' + x.message); f++; }
  await t.cerrar();
  console.log(f ? '✗ ' + f + ' fallaron' : '✓ G95 todo ok'); process.exit(f ? 1 : 0);
})();
