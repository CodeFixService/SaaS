// G142 a · 🎁 Prueba de módulos UNIFORME en las 5: dueño FREE abre la hoja de cada módulo que se vende → 🎁 Probar 7 días a la vista
// (sin desplazar, 360x640), y si ya lo probó con ese correo, lo DICE (no desaparece en silencio). Barbería: candado ⭐ de un módulo
// que viene en Premium también ofrece 🎁 Probar el módulo. Uso: node g142a.js [despega barberia billetera bicitaller estaciona]
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const entrar = async (p, base, url, email, sel, tab) => {
  await p.goto(base + url); await p.waitForTimeout(1500); if (tab) { await p.click(tab); await p.waitForTimeout(300); }
  const e = sel ? sel[0] : 'input[type=email]:visible', c = sel ? sel[1] : 'input[type=password]:visible';
  await p.fill(e, email); await p.fill(c, 'clave123'); await p.press(c, 'Enter'); await p.waitForTimeout(3500);
};
const APPS = {
  despega: ['/home/user/Aplicaciones', async (t) => { await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' }); await t.sim.su('update public.profiles set terms_at = now()'); return ['/', 'tienda@x.cl']; }],
  barberia: ['/home/user/barberia', async (t) => {
    await t.sim.crearUsuario(ADM, 'admin123');
    await t.sim.su('select public.preparar_invitacion((select id from public.profiles where email = $1), $2, $3, $4, $5, $6)', [ADM, 'dueno@x.cl', 'Rodrigo', 'owner', '+56911111111', 'Barbería Hermanos']);
    await t.sim.crearUsuario('dueno@x.cl', 'clave123'); await t.sim.su('update public.profiles set clave_temporal = false, tour_visto = true where true').catch(() => {});
    return ['/', 'dueno@x.cl'];
  }],
  billetera: ['/home/user/emprendedor', async (t) => {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123'); const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()'); await c.query("select public.crear_negocio('Almacén Ana','almacen',true)"); c.release();
    return ['/#ingresar', 'dueno@x.cl'];
  }],
  bicitaller: ['/home/user/taller', async (t) => { await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' }); await t.sim.su('update public.perfiles set terminos_at = now()').catch(() => {}); return ['/', 'taller@x.cl']; }],
  estaciona: ['/home/user/estacionamiento', async (t) => {
    await t.sim.crearUsuario('b@x.cl', 'clave123'); await t.sim.su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = 'Beto'");
    return ['/#/avisos', 'b@x.cl', ['#lEmail', '#lClave'], 'button[data-t=in]'];
  }],
};
// rpc de la página: cada app expone el suyo
const RPC0 = "(window.Cuenta && Cuenta.rpc ? Cuenta.rpc : window.LC && LC.rpc ? LC.rpc : window.App && App.rpc ? App.rpc : window.Api && Api.rpc ? (f,a)=>Api.rpc(f,a) : null)";
const RPC = RPC0;
(async () => {
  const pedidas = process.argv.slice(2);
  process.env.ANCHO = '360';
  for (const [n, [repo, prep]] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(n)) continue;
    const db = 'p_g142a_' + n;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db); const p = t.page, su = t.sim.su;
    try {
      await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
      const [url, email, sel, tab] = await prep(t);
      await p.setViewportSize({ width: 360, height: 640 });
      await entrar(p, t.base, url, email, sel, tab); await t.sinModales(p);
      await p.evaluate((x) => { window.__RPC = x; }, RPC);
      if (n === 'billetera') { await p.goto(t.base + '/app/#inicio'); await p.waitForTimeout(2500); await t.sinModales(p); await p.evaluate((x) => { window.__RPC = x; }, RPC); }
      const hay = await p.evaluate(RPC + ' !== null && !!window.CFX_MODULOS_TIENDA');
      ok(hay, n + ': página con rpc y CFX_MODULOS_TIENDA');
      const T = await p.evaluate('(' + RPC + ')("cfx_modulos_tienda")');
      const M = T.modulos.filter((m) => m.vende && !m.activo);
      ok(T.dueno && M.length >= 2, n + ': dueño ve ' + M.length + ' módulos para probar');
      const malos = [];
      for (const m of M) {
        await p.evaluate((k) => { const r = eval(window.__RPC); CFX_MODULOS_TIENDA.probar(k, { rpc: r }); }, m.clave).catch(() => {});
        await p.waitForSelector('dialog.cfxd', { timeout: 5000 }).catch(() => {});
        await p.waitForTimeout(250);
        const v = await p.evaluate(() => { const b = document.querySelector('dialog.cfxd [data-gratis]'); if (!b) return 'sin botón'; const r = b.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0 ? 'ok' : 'fuera de vista (' + Math.round(r.top) + ')'; });
        if (v !== 'ok') malos.push(m.clave + ': ' + v);
        await p.evaluate(() => document.querySelectorAll('dialog.cfxd').forEach((d) => d.remove()));
      }
      ok(!malos.length, n + ': 🎁 Probar 7 días a la vista en cada módulo ' + JSON.stringify(malos));
      // Ya probado con ese correo → la hoja lo dice
      await su("insert into public.cfx_pruebas_usadas (hash, item) values (public.cfx_hash_correo($1), $2) on conflict do nothing", [email, M[0].clave]);
      await p.evaluate((k) => CFX_MODULOS_TIENDA.probar(k, { rpc: eval(window.__RPC) }), M[0].clave).catch(() => {});
      await p.waitForSelector('dialog.cfxd', { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(250);
      const tx = await p.locator('dialog.cfxd').innerText().catch(() => '');
      ok(!/data-gratis/.test(await p.locator('dialog.cfxd').innerHTML().catch(() => '')) && /Ya usaste tu prueba gratis/.test(tx), n + ': ya probado → lo dice ' + JSON.stringify(tx.slice(0, 160)));
      await p.evaluate(() => document.querySelectorAll('dialog.cfxd').forEach((d) => d.remove()));
      if (n === 'barberia') {
        // Candado ⭐ de un módulo que viene en Premium (recordatorios): 🎁 Probar ese módulo al tiro
        const k = (T.modulos.find((m) => m.clave === 'campanas' && m.vende && !m.activo) || {}).clave;
        if (k) {
          await p.evaluate(() => Perfil.upsell('Clientes que no vuelven', 'campanas'));
          await p.waitForTimeout(1500);
          const g = await p.locator('[data-gratis]:visible').count();
          ok(g >= 1, 'barberia: candado ⭐ Premium de "campanas" trae 🎁 Probar el módulo (' + g + ')');
          await p.locator('[data-gratis]:visible').first().click(); await p.waitForTimeout(2500);
          const A = await p.evaluate('(' + RPC + ')("cfx_modulos_tienda")').catch(() => null);
          const c = A && A.modulos.find((m) => m.clave === 'campanas');
          ok(c && c.activo && c.origen === 'prueba', 'barberia: al tocarlo, campanas queda activo 7 días');
          await t.foto('g142a-barberia-candado');
        } else ok(false, 'barberia: recordatorios no se vende en la base de prueba');
      }
      await t.foto('g142a-' + n);
    } catch (e) { ok(false, n + ': ' + e.message.split('\n')[0]); }
    await t.cerrar();
  }
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
