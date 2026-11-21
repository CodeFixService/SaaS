// G143 🔤 UNA letra y UNA barra para las 7 apps: cada ícono de la barra mide lo mismo (23 px, centrado: el de emoji .ic-e ya no se aplasta),
// letra CFX Inter de fábrica (alojada en la app), 🔤 tipo de letra elegible, grosor que SÍ cambia (delgada < normal < gruesa) y tamaño que
// agranda el TEXTO (sin zoom). FALLA con el código viejo (ícono 18 px en BiciTaller/Barbería, sin CFX Inter, sin FAM). Uso: node g143.js [app…]
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
        const m = await p.evaluate(() => [...document.querySelectorAll('nav.cfx-barra > a, nav.cfx-barra > button')].filter((b) => b.offsetParent && !b.classList.contains('cfx-mas')).map((b) => {
          const r = b.getBoundingClientRect(), v = b.querySelector('svg'), q = v ? v.getBoundingClientRect() : { width: 0, height: 0, left: 0, right: 0 };
          return { w: Math.round(q.width), h: Math.round(q.height), d: +Math.abs((q.left + q.right) / 2 - (r.left + r.right) / 2).toFixed(1) };
        }));
        ok(m.length >= 3 && m.every((x) => x.w === 23 && x.h === 23 && x.d < 1.5), n + ' ' + ancho + 'px: íconos iguales y centrados ' + m.map((x) => x.w + 'x' + x.h + '/' + x.d).join(' '));
        if (ancho === 360) {
          const L = await p.evaluate(async () => {
            const sel = 'nav.cfx-barra > :is(a,button):not(.cfx-mas)', b = () => document.querySelector(sel), cs = () => getComputedStyle(b());
            await document.fonts.ready; const fam0 = getComputedStyle(document.body).fontFamily, inter = document.fonts.check('600 12px "CFX Inter"');
            const L = window.CFX_LETRA, o = { fam0, inter, fam: !!(L && L.FAM && L.FAM.length === 6) }; if (!o.fam) return o;
            const pint = (x) => { L.pintar(Object.assign(L.leer(), x)); return { w: +cs().fontWeight, fs: parseFloat(cs().fontSize) }; };
            o.del = pint({ g: 'delgada', t: 100 }); o.nor = pint({ g: 'normal', t: 100 }); o.gru = pint({ g: 'gruesa', t: 100 });
            o.big = pint({ g: 'delgada', t: 125 }); o.zoom = getComputedStyle(document.documentElement).zoom; o.ancho = document.documentElement.scrollWidth <= innerWidth + 1;
            pint({ f: 'montserrat', t: 100 }); o.mont = getComputedStyle(document.body).fontFamily; pint({ f: 'inter' });
            return o;
          });
          ok(/^"?CFX Inter/.test(L.fam0) && L.inter, n + ': letra CFX Inter de fábrica, cargada (' + L.fam0.slice(0, 24) + ')');
          ok(L.fam && L.del.w < L.nor.w && L.nor.w < L.gru.w, n + ': grosor delgada < normal < gruesa ' + (L.del ? [L.del.w, L.nor.w, L.gru.w].join('<') : '(sin CFX_LETRA.FAM)'));
          ok(L.fam && L.big.fs > L.del.fs * 1.15 && L.zoom === '1' && L.ancho, n + ': tamaño 125 % agranda el texto ' + (L.del ? L.del.fs + '→' + L.big.fs + 'px' : '') + ' sin zoom ni salirse');
          ok(L.fam && /^"?CFX Montserrat/.test(L.mont), n + ': 🔤 cambiar a Montserrat se aplica');
        }
        await p.screenshot({ path: __dirname + '/capturas/g143-' + n + '-' + ancho + '.png' });
        await ctx.close();
      }
    } catch (e) { ok(false, n + ': ' + e.message.split('\n')[0]); }
    await t.cerrar();
  }
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
