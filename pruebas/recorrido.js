// Recorrido de venta: entra a cada app como admin, negocio y cliente, abre cada pestaña de la barra, la cabecera (avatar) y Ajustes,
// saca capturas y revisa errores de consola y que nada se salga del ancho.  ANCHO=360|768|1280 node recorrido.js [app…]
const { abrir } = require('./h');
const fs = require('fs');
const ADM = 'juanjosuecastilloloyola@gmail.com';
const ANCHO = Number(process.env.ANCHO) || 360;

async function login(t, p, url, email, pass, sel) {
  await p.goto(t.base + url); await p.waitForTimeout(1000);
  if (sel) { await p.click(sel).catch(() => {}); await p.waitForTimeout(300); }
  await p.fill('input[type=email]:visible', email); await p.fill('input[type=password]:visible', pass); await p.press('input[type=password]:visible', 'Enter');
  await p.waitForTimeout(3000); await t.sinModales(p);
}

const APPS = {
  saas: { repo: 'saas', db: 'p_saas', async cuentas(t) {
    await t.sim.crearUsuario(ADM, 'admin123'); await t.sim.crearUsuario('ana@x.cl', 'clave123');
    return [{ rol: 'admin', url: '/', email: ADM, pass: 'admin123' }, { rol: 'negocio', url: '/', email: 'ana@x.cl', pass: 'clave123' }];
  } },
  emprendedor: { repo: 'emprendedor', db: 'p_emprendedor', async cuentas(t) {
    await t.sim.crearUsuario(ADM, 'admin123'); await t.sim.su('select privado.fijar_admin()');
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123');
    const c = await t.sim.pool.connect();
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]);
    await c.query('select public.aceptar_terminos()'); await c.query("select public.crear_negocio('Almacén Ana','almacen',true)"); c.release();
    return [{ rol: 'admin', url: '/#ingresar', email: ADM, pass: 'admin123' }, { rol: 'negocio', url: '/#ingresar', email: 'dueno@x.cl', pass: 'clave123' }];
  } },
  Aplicaciones: { repo: 'Aplicaciones', db: 'p_aplicaciones', async cuentas(t) {
    await t.sim.crearUsuario(ADM, 'admin123');
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Pepe','client',$1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await t.sim.su('update public.profiles set terms_at = now()');
    return [{ rol: 'admin', url: '/', email: ADM, pass: 'admin123' }, { rol: 'negocio', url: '/', email: 'tienda@x.cl', pass: 'clave123' }, { rol: 'cliente', url: '/', email: 'cli@x.cl', pass: 'clave123' }];
  } },
  barberia: { repo: 'barberia', db: 'barberia_prueba', base: false, async cuentas(t) {
    await t.sim.crearUsuario(ADM, 'admin123').catch(() => {});
    await t.sim.su("insert into auth.claves values ($1, 'admin123') on conflict (email) do update set pass = excluded.pass", [ADM]);
    await t.sim.su('update public.profiles set clave_temporal = false where true').catch(() => {});
    await t.sim.su("delete from cfx_exentos").catch(() => {});
    return [{ rol: 'admin', url: '/', email: ADM, pass: 'admin123' }, { rol: 'negocio', url: '/', email: 'dueno@test.cl', pass: 'clave123' }, { rol: 'cliente', url: '/', email: 'carlos@test.cl', pass: 'clave123' }];
  } },
  taller: { repo: 'taller', db: 'p_taller', async cuentas(t) {
    await t.sim.crearUsuario(ADM, 'admin123');
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await t.sim.su("insert into public.invitaciones (email, nombre, rol, taller_id) select 'ciclista@x.cl','Pepe','cliente', id from talleres limit 1");
    await t.sim.crearUsuario('ciclista@x.cl', 'clave123');
    await t.sim.su('update public.perfiles set terminos_at = now()').catch(() => {});
    return [{ rol: 'admin', url: '/', email: ADM, pass: 'admin123' }, { rol: 'negocio', url: '/', email: 'taller@x.cl', pass: 'clave123' }, { rol: 'cliente', url: '/', email: 'ciclista@x.cl', pass: 'clave123' }];
  } },
  estacionamiento: { repo: 'estacionamiento', db: 'p_estacionamiento', async cuentas(t) {
    const a = await t.sim.crearUsuario(ADM, 'admin123'); const u = await t.sim.crearUsuario('b@x.cl', 'clave123'); await t.sim.crearUsuario('c@x.cl', 'clave123');
    await t.sim.su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = split_part(email, '@', 1)");
    await t.sim.su('update public.perfiles set es_admin = true where id = $1', [a.id]);
    await t.sim.su("insert into public.estacionamientos (dueno, titulo, direccion, lat, lng) values ($1,'Est 1','Calle 1',-33.44,-70.65)", [u.id]);
    const e = { url: '/#/mas', sel: 'button[data-t=in]' };
    return [{ rol: 'admin', email: ADM, pass: 'admin123', ...e }, { rol: 'negocio', email: 'b@x.cl', pass: 'clave123', ...e }, { rol: 'cliente', email: 'c@x.cl', pass: 'clave123', ...e }];
  } },
};

(async () => {
  const pedidas = process.argv.slice(2);
  const informe = [];
  for (const [nombre, A] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(nombre)) continue;
    if (A.base !== false) require('child_process').execSync(__dirname + '/base.sh /home/user/' + A.repo, { stdio: 'ignore' });
    const t = await abrir('/home/user/' + A.repo, A.db);
    try {
      for (const c of await A.cuentas(t)) {
        const { ctx, page: p } = await t.nuevo();
        const malos = [];
        const foto = (n) => t.foto(ANCHO + '-' + c.rol + '-' + n, p);
        try {
          await login(t, p, c.url, c.email, c.pass, c.sel);
          await foto('0inicio');
          if (!(await t.anchoOk(p))) malos.push('se sale del ancho: inicio');
          // El + al medio de la barra (celular y tablet).
          if (ANCHO < 900) {
            const cx = await p.evaluate(() => { const m = document.querySelector('nav.cfx-barra > .cfx-mas'); if (!m) return null; const r = m.getBoundingClientRect(); return Math.round(r.left + r.width / 2 - innerWidth / 2); });
            if (cx !== null && Math.abs(cx) > 3) malos.push('+ corrido ' + cx + 'px');
          }
          // Cada pestaña de la barra (también las de "Más").
          const n = await p.locator('nav.cfx-barra > :not(.cfx-menu):not(.cfx-mas)').count();
          for (let i = 0; i < n; i++) {
            const b = p.locator('nav.cfx-barra > :not(.cfx-menu):not(.cfx-mas)').nth(i);
            const tx = ((await b.textContent()) || '').trim().replace(/\W+/g, '').slice(0, 12) || 'b' + i;
            await b.evaluate((x) => x.click()); await p.waitForTimeout(1300); await t.sinModales(p);
            await foto('1-' + i + '-' + tx);
            if (!(await t.anchoOk(p))) malos.push('se sale del ancho: ' + tx);
            const aj = p.locator('.cfx-aj:visible > button');
            if (/ajustes|mas|más|control|cuenta/i.test(tx) && await aj.count()) {
              const k = await aj.count();
              for (let j = 0; j < k; j++) {
                await p.locator('.cfx-aj:visible > button').nth(j).click(); await p.waitForTimeout(900); await t.sinModales(p);
                await foto('2-' + tx + '-' + j);
                if (!(await t.anchoOk(p))) malos.push('se sale del ancho: ' + tx + ' sección ' + j);
                const v = p.locator('.cfx-aj-volver:visible'); if (await v.count()) { await v.first().click(); await p.waitForTimeout(400); }
              }
            }
          }
          // Cabecera común
          const campanas = await p.locator('header .cfx-cab [data-cfx-campana]:visible').count();
          if (campanas > 1) malos.push('campanas: ' + campanas);
          const av = p.locator('.cfx-av:visible');
          if (await av.count() !== 1) malos.push('avatar visibles: ' + await av.count());
          else { await av.click(); await p.waitForTimeout(500); await foto('9-menu'); }
          const plan = await p.locator('.cfx-plan:visible').first().textContent().catch(() => '');
          informe.push(nombre + ' · ' + c.rol + ' · plan ' + (plan || '—') + (malos.length ? ' · ⚠️ ' + malos.join(' | ') : ' · ok'));
        } catch (e) { informe.push(nombre + ' · ' + c.rol + ' · FALLA ' + e.message.split('\n')[0]); }
        await ctx.close();
      }
    } finally {
      const err = t.errores.filter((e) => !/TUNNEL|ERR_NAME|ERR_INTERNET|ERR_CONNECTION/.test(e));
      if (err.length) informe.push(nombre + ' · ERRORES: ' + [...new Set(err)].slice(0, 8).join(' || '));
      await t.cerrar();
    }
  }
  console.log(informe.join('\n'));
  fs.writeFileSync(__dirname + '/capturas/recorrido-' + ANCHO + '.txt', informe.join('\n') + '\n');
})();
