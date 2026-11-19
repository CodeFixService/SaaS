// G130 · Más termina solo en ⚙️ Ajustes (Configuración) en las 6: "Cuenta y ayuda" ya no se pega suelta al final de Más ni bajo las pantallas
// abiertas desde Más (Billetera: Billeteras conectadas); 🛟 soporte, guía, falla, términos y cerrar sesión quedan DENTRO de Ajustes.
// FALLA con el código viejo (Billetera #conexiones muestra .cfx-cuenta-g; el Más no trae Chat con soporte en Configuración).
// Uso: node g130.js [app…]
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
      process.env.ANCHO = '360';
      const { ctx, page: p } = await t.nuevo();
      await entrar(p, t.base, url, email, 'clave123', sel, tab); await t.sinModales(p);
      // Ir a Más (último botón de la barra).
      const mas = await p.evaluate(() => { const b = [...document.querySelectorAll('nav.cfx-barra > a, nav.cfx-barra > button')].filter((x) => x.offsetParent).pop(); b.click(); return b.textContent.trim(); });
      await p.waitForTimeout(1500);
      const vis = () => p.evaluate(() => [...document.querySelectorAll('.cfx-cuenta-g')].filter((x) => x.offsetParent).map((x) => x.innerText.replace(/\s+/g, ' ').slice(0, 80)));
      const info = await p.evaluate(() => ({ hash: location.hash, grupos: [...document.querySelectorAll('.cfx-mm-tab, .cfx-aj-g')].filter((x) => x.offsetParent || x.closest('.cfx-mmas')).map((x) => x.textContent.trim()),
        filas: [...document.querySelectorAll('.cfx-mmas [data-k]')].map((x) => x.dataset.k) }));
      console.log('· ' + n + ' Más(' + mas + ') ' + info.hash + ' grupos=' + info.grupos.join('|') + ' filas=' + info.filas.join(','));
      const suelta = await vis(); ok(!suelta.length, n + ': Más sin "Cuenta y ayuda" suelta ' + suelta.join(' / '));
      const tabs = await p.evaluate(() => [...document.querySelectorAll('.cfx-mmas .cfx-mm-tab')].map((x) => x.textContent.trim()));
      ok(tabs.length && /Ajustes/.test(tabs[tabs.length - 1]) && !tabs.some((x) => /Cuenta y ayuda/.test(x)), n + ': el Más termina en ⚙️ Ajustes (' + tabs.join(' | ') + ')');
      const ajustes = await p.evaluate(() => [...document.querySelectorAll('.cfx-mmas .cfx-mm-pag[data-cfx-oi="Configuración"] [data-k]')].map((x) => x.dataset.k));
      ok(['chat', 'falla', 'terminos', 'salir'].every((k) => ajustes.includes(k)) && ajustes[ajustes.length - 1] === 'salir', n + ': 🛟 soporte, falla, términos y 🚪 cerrar sesión (al final) dentro de Ajustes: ' + ajustes.join(','));
      // Mostrar dónde quedó: abre la página ⚙️ Ajustes y la fotografía.
      await p.evaluate(() => { const t = [...document.querySelectorAll('.cfx-mmas .cfx-mm-tab')].pop(); if (t) t.click(); }); await p.waitForTimeout(900);
      await p.screenshot({ path: __dirname + '/capturas/g130-' + n + '-ajustes.png', fullPage: true });
      await p.screenshot({ path: __dirname + '/capturas/g130-' + n + '-mas.png', fullPage: true });
      // Cada pantalla que se abre por dirección desde Más: sin "Cuenta y ayuda" abajo.
      const dirs = await p.evaluate(() => [...new Set([...document.querySelectorAll('.cfx-mmas [data-k]')].map((x) => x.dataset.k))]);
      for (const k of (process.env.TODAS ? dirs : ['conexiones', 'comprobantes', 'reportes', 'modulos', 'clientes', 'productos'])) {
        await p.evaluate((k) => { location.hash = k; }, k); await p.waitForTimeout(1200);
        const v = await vis(); if (v.length) ok(false, n + ' #' + k + ': "Cuenta y ayuda" pegada abajo');
      }
      await ctx.close();
    } catch (e) { ok(false, n + ': ' + e.message.split('\n')[0]); }
    await t.cerrar();
  }
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
