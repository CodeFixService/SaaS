// G141 a · 📱 Mis redes en las otras 4 apps: el dueño guarda (servidor valida) y su página pública muestra los botones con ícono.
//   Despega /t/?s= (y las de antes del perfil siguen saliendo) · Barbería /b/?b= · BiciTaller /t/?s= (y el Instagram de antes) · Estaciona ficha #/e/.
// FALLA con el código viejo (no existe cfx_redes_guardar / cfx_redes_llave_app). Uso: node g141b.js [despega barberia bicitaller estaciona]
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const REDES = JSON.stringify([{ red: 'instagram', url: 'https://instagram.com/minegocio' }, { red: 'tiktok', url: 'https://www.tiktok.com/@minegocio' }, { red: 'youtube', url: 'https://www.youtube.com/@minegocio' }]);
// [repo, bd, preparar → { dueno (uuid), url pública }]
const APPS = {
  despega: ['/home/user/Aplicaciones', 'p_g141_apl', async (t) => {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.su("update public.profiles set perfil = '{\"instagram\":\"@antes\"}'::jsonb where id = $1", [u.id]).catch(() => {});
    const slug = (await t.sim.su('select slug from public.profiles where id = $1', [u.id]))[0].slug;
    return { dueno: u.id, url: '/t/?s=' + slug, antes: true };
  }],
  barberia: ['/home/user/barberia', 'p_g141_bar', async (t) => {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'barberia', barberia: 'Barbería Juan', nombre: 'Juan', telefono: '+56912345671' });
    return { dueno: u.id, url: '/b/?b=' + (await t.sim.su('select codigo from public.barberias limit 1'))[0].codigo };
  }],
  bicitaller: ['/home/user/taller', 'p_g141_tal', async (t) => {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Sur', nombre: 'Ana' });
    await t.sim.su("update public.talleres set instagram = '@bicisur_antes'");
    return { dueno: u.id, url: '/t/?s=' + (await t.sim.su('select slug from public.talleres limit 1'))[0].slug, antes: true };
  }],
  estaciona: ['/home/user/estacionamiento', 'p_g141_est', async (t) => {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123');
    await t.sim.su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = 'Beto'");
    const id = (await t.sim.su("insert into public.estacionamientos (dueno, titulo, direccion, lat, lng, precio_hora) values ($1,'Lugar centro','Calle 1',-33.44,-70.65,2000) returning id", [u.id]))[0].id;
    return { dueno: u.id, url: '/#/e/' + id };
  }]
};
(async () => {
  const pedidas = process.argv.slice(2);
  for (const [n, [repo, db, prep]] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(n)) continue;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db); const p = t.page, su = t.sim.su;
    try {
      const d = await prep(t);
      const como = async (expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', $1, true)) x", [d.dueno].concat(args || [])))[0].r;
      if (d.antes) {
        await p.goto(t.base + d.url); await p.waitForTimeout(3500);
        ok(await p.locator('.cfx-red').count() === 1, n + ': sin guardar nada, el Instagram de antes sale con ícono (🛡️ no se pierde)');
      }
      const mias = await como('public.cfx_redes_mias()');
      ok(mias && mias.dueno === true, n + ': cfx_redes_mias → es el dueño');
      await como('public.cfx_redes_guardar($2::jsonb)', [REDES]);
      await p.goto(t.base + d.url); await p.reload(); await p.waitForTimeout(3500);
      ok(await p.locator('.cfx-red svg').count() === 3, n + ': la página pública muestra las 3 redes con ícono (' + await p.locator('.cfx-red').count() + ')');
      ok(await p.locator('.cfx-red[href="https://www.youtube.com/@minegocio"][target=_blank]').count() === 1, n + ': el botón abre su perfil en otra pestaña');
      ok(await t.anchoOk(p), n + ': no se sale del ancho');
      await t.foto('g141b-' + n);
      ok(!t.errores.filter((e) => !/favicon|ERR_|Failed to load|404/.test(e)).length, n + ': sin errores ' + t.errores.slice(0, 2).join(' | '));
    } catch (e) { ok(false, n + ': ' + e.message); } finally { await t.cerrar(); }
  }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ todo bien'); process.exit(f ? 1 : 0);
})();
