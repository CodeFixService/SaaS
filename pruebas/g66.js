// 🧹 Barrido · G66 🎯 barra de abajo en las 6 (+ CM): cada ícono centrado en su botón, sin salirse, a 320 y 360 px.
// Uso: node g66.js [app…]   (apps: cm despega barberia billetera bicitaller estaciona)
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const entrar = async (p, base, url, email, pass, sel, tab) => {
  await p.goto(base + url); await p.waitForTimeout(1500); if (tab) { await p.click(tab); await p.waitForTimeout(300); }
  const e = sel ? sel[0] : 'input[type=email]:visible', c = sel ? sel[1] : 'input[type=password]:visible';
  await p.fill(e, email); await p.fill(c, pass); await p.press(c, 'Enter'); await p.waitForTimeout(3500);
};
const APPS = {
  cm: ['/home/user/saas', 'p_g66_cm', async (t) => { await t.sim.crearUsuario('socio@x.cl', 'clave123'); await t.sim.su('update public.profiles set terms_at = now()').catch(() => {}); return ['/', 'socio@x.cl']; }],
  despega: ['/home/user/Aplicaciones', 'p_g66_apl', async (t) => { await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' }); await t.sim.su('update public.profiles set terms_at = now()'); return ['/', 'tienda@x.cl']; }],
  barberia: ['/home/user/barberia', 'p_g66_bar', async (t) => {
    const ADM = 'juanjosuecastilloloyola@gmail.com'; await t.sim.crearUsuario(ADM, 'admin123');
    await t.sim.su('select public.preparar_invitacion((select id from public.profiles where email = $1), $2, $3, $4, $5, $6)', [ADM, 'dueno@x.cl', 'Rodrigo', 'owner', '+56911111111', 'Barbería Hermanos']);
    await t.sim.crearUsuario('dueno@x.cl', 'clave123'); await t.sim.su('update public.profiles set clave_temporal = false, tour_visto = true where true').catch(() => {});
    return ['/', 'dueno@x.cl'];
  }],
  billetera: ['/home/user/emprendedor', 'p_g66_emp', async (t) => {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123'); const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()'); await c.query("select public.crear_negocio('Almacén Ana','almacen',true)"); c.release();
    return ['/#ingresar', 'dueno@x.cl'];
  }],
  bicitaller: ['/home/user/taller', 'p_g66_tal', async (t) => { await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' }); await t.sim.su('update public.perfiles set terminos_at = now()').catch(() => {}); return ['/', 'taller@x.cl']; }],
  estaciona: ['/home/user/estacionamiento', 'p_g66_est', async (t) => {
    await t.sim.crearUsuario('b@x.cl', 'clave123'); await t.sim.su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = 'Beto'");
    return ['/#/avisos', 'b@x.cl', ['#lEmail', '#lClave'], 'button[data-t=in]'];
  }],
};
(async () => {
  const pedidas = process.argv.slice(2);
  for (const [n, [repo, db, prep]] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(n)) continue;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db);
    try {
      const [url, email, sel, tab] = await prep(t);
      for (const ancho of [320, 360]) {
        process.env.ANCHO = String(ancho);
        const { ctx, page: p } = await t.nuevo();
        await entrar(p, t.base, url, email, 'clave123', sel, tab); await t.sinModales(p);
        const m = await p.evaluate(() => [...document.querySelectorAll('nav.cfx-barra > a, nav.cfx-barra > button')].filter((b) => b.offsetParent).map((b) => {
          const r = b.getBoundingClientRect(), i = b.querySelector('.cfx-ico, svg, img, span'); const q = i ? i.getBoundingClientRect() : r;
          return { d: +Math.abs((q.left + q.right) / 2 - (r.left + r.right) / 2).toFixed(1), fuera: r.right > innerWidth + 1 || r.left < -1 };
        }));
        ok(m.length >= 3 && m.every((x) => x.d < 1.5 && !x.fuera), n + ' ' + ancho + 'px: ' + m.length + ' botones, desvío ' + m.map((x) => x.d).join('/'));
        await p.screenshot({ path: __dirname + '/capturas/g66-' + n + '-' + ancho + '.png' });
        await ctx.close();
      }
    } catch (e) { ok(false, n + ': ' + e.message.split('\n')[0]); }
    await t.cerrar();
  }
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
