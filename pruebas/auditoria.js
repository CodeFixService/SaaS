// Auditoría visual: como recorrido.js (cada app, cada cuenta, cada pestaña y hoja) y además revisa en cada pantalla:
//  grave: círculo vacío en la cabecera, botones encimados · medio: lo último tapado por la barra o el +, título repetido en la hoja,
//  campo de archivo en inglés · bajo: letra < 12 px.  ANCHO=360|1280 node auditoria.js [app…]  → capturas/auditoria/<app>/ e informe.
const { abrir } = require('./h');
const fs = require('fs');
const ADM = 'juanjosuecastilloloyola@gmail.com';
const ANCHO = Number(process.env.ANCHO) || 360;
// Revisa la pantalla actual (con la página y las zonas con scroll bajadas hasta el final). Devuelve [[nivel, texto]].
async function revisar(p, donde) {
  return p.evaluate(async (donde) => {
    const out = [], vis = (e) => { if (e.closest('details:not([open]) > :not(summary)')) return false; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && !e.closest('.cfx-oc,[hidden]'); };
    const nom = (e) => (e.getAttribute('aria-label') || e.textContent || e.value || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 30);
    // 1) círculo vacío en la cabecera
    document.querySelectorAll('.cfx-cab > *').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width > 2 && getComputedStyle(e).visibility !== 'hidden' && !e.textContent.trim() && !e.querySelector('svg,img') && !e.matches('[data-cfx-campana]')) out.push(['grave', 'círculo vacío en la cabecera']); });
    const hoja = [...document.querySelectorAll('.cfx-hoja-m')].pop();
    const raiz = hoja || document.body;
    // 2) lo último tapado por la barra de abajo / el + / botones flotantes (solo sin hoja abierta)
    if (!hoja) {
      const sc = [document.scrollingElement, ...[...document.querySelectorAll('main, .view, section, div')].filter((e) => { const s = getComputedStyle(e); return /auto|scroll/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 20 && e.clientHeight > innerHeight * 0.5; })];
      sc.forEach((e) => { e.scrollTop = e.scrollHeight; }); await new Promise((r) => setTimeout(r, 350));
      const mas = document.querySelector('nav.cfx-barra > .cfx-mas > :first-child');
      const fijos = [...(mas && vis(mas) ? [mas] : []), ...[...document.querySelectorAll('body *')].filter((e) => { if (!vis(e)) return false; const s = getComputedStyle(e); return s.position === 'fixed' && e.getBoundingClientRect().top > innerHeight * 0.55 && !e.closest('.cfx-emerg,.cfx-toast,dialog,.toast,#toast,.cfx-hoja-m') && !(e.parentElement && getComputedStyle(e.parentElement).position === 'fixed'); })];
      const tapa = (r) => fijos.find((f) => { const q = f.getBoundingClientRect(); return r.left < q.right - 2 && r.right > q.left + 2 && r.top < q.bottom - 2 && r.bottom > q.top + 4; });
      [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, .chip')].filter((e) => vis(e) && !e.closest('nav.cfx-barra, header, .cfx-cab') && !fijos.some((f) => f.contains(e)))
        .forEach((e) => { const r = e.getBoundingClientRect(); const f = tapa(r); if (f) out.push(['medio', 'tapado por ' + (f.closest('nav.cfx-barra') ? (f.closest('.cfx-mas') ? 'el +' : 'la barra') : 'flotante "' + nom(f) + '"') + ': "' + nom(e) + '"']); });
    }
    // 3) botones encimados
    const bs = [...raiz.querySelectorAll('button, a.btn, .btn')].filter((e) => vis(e) && !e.closest('nav.cfx-barra, .cfx-cab, .cfx-pila, header'));
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], b = bs[j]; if (a.contains(b) || b.contains(a)) continue;
      const r = a.getBoundingClientRect(), q = b.getBoundingClientRect(), w = Math.min(r.right, q.right) - Math.max(r.left, q.left), h = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
      if (w > 4 && h > 4 && w * h > 0.25 * Math.min(r.width * r.height, q.width * q.height)) out.push(['grave', 'botones encimados: "' + nom(a) + '" y "' + nom(b) + '"']);
    }
    // 4) título repetido en la hoja
    if (hoja) {
      const n = (x) => String(x || '').replace(/[\p{Extended_Pictographic}️‍]/gu, '').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
      const t = n(hoja.querySelector('.cfx-hm-cab h2').textContent), h = [...hoja.querySelectorAll('.cfx-hm-zona h1, .cfx-hm-zona h2, .cfx-hm-zona h3')].find(vis);
      if (h && t && n(h.textContent) === t) out.push(['medio', 'título repetido en la hoja "' + t + '"']);
    }
    // 5) campos nativos en inglés
    raiz.querySelectorAll('input[type=file]').forEach((e) => { if (vis(e)) out.push(['medio', 'campo de archivo nativo (Choose File)']); });
    // 6) letra chica
    const chicas = new Set(); raiz.querySelectorAll('body *').forEach((e) => { if (e.children.length || !e.textContent.trim() || !vis(e) || e.closest('nav.cfx-barra, .cfx-cab, svg')) return; const f = parseFloat(getComputedStyle(e).fontSize); if (f < 11.5) chicas.add(nom(e) + ' ' + f + 'px'); });
    if (chicas.size) out.push(['bajo', 'letra chica: ' + [...chicas].slice(0, 4).join(', ')]);
    return [...new Set(out.map((x) => x.join('|')))].map((x) => x.split('|')).map((x) => [x[0], donde + ': ' + x[1]]);
  }, donde);
}

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
    return [{ rol: 'admin', url: '/', email: ADM, pass: 'admin123' }, { rol: 'negocio', url: '/', email: 'dueno@test.cl', pass: 'clave123' }, { rol: 'cliente', url: '/', email: 'carlos@test.cl', pass: 'clave123' }, { rol: 'socio', url: '/', email: 'socio@test.cl', pass: 'clave123' }];
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
  contenido: { repo: 'contenido', db: 'p_contenido', sh: '/home/user/contenido/pruebas/base.sh', async cuentas(t) {
    await t.sim.crearUsuario(ADM, 'admin123'); const u = await t.sim.crearUsuario('redes@x.cl', 'clave123');
    await t.sim.su('alter table public.empresas disable trigger empresas_antes'); await t.sim.su("insert into public.empresas (owner, nombre) values ($1, 'Bici Ana')", [u.id]); await t.sim.su('alter table public.empresas enable trigger empresas_antes');
    await t.sim.su(`update public.perfiles set prefs = coalesce(prefs, '{}') || '{"guia":{"n":9}}'`).catch(() => {});
    return [{ rol: 'admin', url: '/', email: ADM, pass: 'admin123' }, { rol: 'negocio', url: '/', email: 'redes@x.cl', pass: 'clave123' }];
  } },
};

(async () => {
  const pedidas = process.argv.slice(2);
  const informe = [];
  for (const [nombre, A] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(nombre)) continue;
    if (A.base !== false) require('child_process').execSync(A.sh || __dirname + '/base.sh /home/user/' + A.repo, { stdio: 'ignore' });
    const t = await abrir('/home/user/' + A.repo, A.db);
    try {
      for (const c of await A.cuentas(t)) {
        const { ctx, page: p } = await t.nuevo();
        const malos = [], hall = [];
        const dir = __dirname + '/capturas/auditoria/' + nombre; fs.mkdirSync(dir, { recursive: true });
        const foto = (n) => p.screenshot({ path: dir + '/' + ANCHO + '-' + c.rol + '-' + n + '.png' });
        try {
          await login(t, p, c.url, c.email, c.pass, c.sel);
          hall.push(...await revisar(p, 'inicio')); await foto('0inicio');
          if (!(await t.anchoOk(p))) malos.push('se sale del ancho: inicio');
          // ⇄ Panel: solo el admin; en las apps lleva al panel del Centro de Mando, en el CM cambia Panel ⇄ App.
          const at = await p.evaluate(() => { const a = document.querySelector('.cfx-atajo'); return a && !a.classList.contains('cfx-oc') && a.getBoundingClientRect().width ? a.href : null; });
          if (c.rol === 'admin' && !at) malos.push('falta el botón ⇄ Panel');
          if (c.rol === 'admin' && at && nombre !== 'saas' && !/^https:\/\/saas\.[^/]+\/admin\/$/.test(at)) malos.push('⇄ Panel no va al CM: ' + at);
          if (c.rol !== 'admin' && at && nombre !== 'saas') malos.push('⇄ Panel visible para ' + c.rol);
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
            hall.push(...await revisar(p, tx)); await foto('1-' + i + '-' + tx);
            if (!(await t.anchoOk(p))) malos.push('se sale del ancho: ' + tx);
            // Ajustes / Más en lista (núcleo): cada opción que se abre en hoja; adentro puede haber otra lista (p. ej. Mi perfil) que abre una segunda hoja encima.
            const aj = p.locator('.cfx-aj:visible > .cfx-fila[data-tipo=hoja]');
            if (/ajustes|mas|más|control|cuenta|empresa/i.test(tx) && await aj.count()) {
              const k = await aj.count();
              for (let j = 0; j < k; j++) {
                await p.locator('.cfx-aj:visible > .cfx-fila[data-tipo=hoja]').nth(j).evaluate((b) => b.click()); await p.waitForTimeout(900);
                if (await p.locator('.cfx-hoja-m').count() !== 1) malos.push('hojas al abrir ' + tx + ' ' + j + ': ' + await p.locator('.cfx-hoja-m').count());
                else { await p.waitForTimeout(900); if (await p.$eval('.cfx-hoja-m .cfx-hm-zona', (z) => !z.textContent.trim() && !z.querySelector('img,canvas,input,button'))) malos.push('hoja vacía: ' + tx + ' sección ' + j); }
                if (await p.locator('dialog[open], .sheet, .velo, .modal:not([hidden])').count()) malos.push('se abrió otra ventana encima: ' + tx + ' sección ' + j);
                hall.push(...await revisar(p, tx + '›' + await p.$eval('.cfx-hoja-m .cfx-hm-cab h2', (h) => h.textContent.trim()).catch(() => j))); await foto('2-' + tx + '-' + j);
                if (!(await t.anchoOk(p))) malos.push('se sale del ancho: ' + tx + ' sección ' + j);
                const den = p.locator('.cfx-hoja-m .cfx-aj > .cfx-fila[data-tipo=hoja]');
                if (await den.count()) {
                  await den.first().evaluate((b) => b.click()); await p.waitForTimeout(700);
                  if (await p.locator('.cfx-hoja-m').count() !== 2) malos.push('hoja de adentro no se apiló: ' + tx + ' sección ' + j);
                  await p.locator('.cfx-hoja-m').last().locator('.cfx-hm-x').click(); await p.waitForTimeout(400);
                  if (await p.locator('.cfx-hoja-m').count() !== 1) malos.push('✕ no volvió un paso: ' + tx + ' sección ' + j);
                }
                while (await p.locator('.cfx-hoja-m').count()) { await p.locator('.cfx-hoja-m').last().locator('.cfx-hm-x').click(); await p.waitForTimeout(400); }
              }
            }
          }
          // Cabecera común
          const campanas = await p.locator('header .cfx-cab [data-cfx-campana]:visible').count();
          if (campanas > 1) malos.push('campanas: ' + campanas);
          await p.waitForTimeout(1000); await t.sinModales(p); const av = p.locator('.cfx-av:visible');
          if (await av.count() !== 1) malos.push('avatar visibles: ' + await av.count());
          else {
            await av.click(); await p.waitForTimeout(500); await foto('9-menu');
            // Perfil común (núcleo): Mi perfil en el menú de la foto, con sus secciones.
            const mp = p.locator('dialog [data-a=perfil]');
            if (!(await mp.count())) malos.push('menú sin Mi perfil');
            else {
              await mp.click(); await p.waitForTimeout(800);
              const filas = p.locator('.cfx-hoja-m .cfx-aj > .cfx-fila');
              const k = await filas.count();
              if (k < 3) malos.push('perfil con ' + k + ' secciones');
              for (let j = 0; j < k; j++) {
                await p.locator('.cfx-hoja-m').first().locator('.cfx-aj > .cfx-fila').nth(j).evaluate((b) => b.click()); await p.waitForTimeout(700);
                await foto('9-perfil-' + j);
                if (!(await t.anchoOk(p))) malos.push('se sale del ancho: perfil ' + j);
                await p.locator('.cfx-hoja-m').last().locator('.cfx-hm-x').click(); await p.waitForTimeout(400);
              }
              while (await p.locator('.cfx-hoja-m').count()) { await p.locator('.cfx-hoja-m').last().locator('.cfx-hm-x').click(); await p.waitForTimeout(400); }
            }
          }
          const plan = await p.locator('.cfx-plan:visible').first().textContent().catch(() => '');
          const nv = { grave: 0, medio: 0, bajo: 0 }; hall.forEach((h) => nv[h[0]]++);
          informe.push(nombre + ' · ' + c.rol + ' · grave ' + nv.grave + ' · medio ' + nv.medio + ' · bajo ' + nv.bajo + (malos.length ? ' · ⚠️ ' + malos.join(' | ') : ''));
          [...new Set(hall.filter((h) => h[0] !== 'bajo' || process.env.BAJO).map((h) => '   ' + h[0] + ' · ' + h[1]))].forEach((x) => informe.push(x));
        } catch (e) { informe.push(nombre + ' · ' + c.rol + ' · FALLA ' + e.message.split('\n').slice(0, 6).join(' ')); await foto('error').catch(() => {}); }
        await ctx.close();
      }
    } finally {
      const err = t.errores.filter((e) => !/TUNNEL|ERR_NAME|ERR_INTERNET|ERR_CONNECTION/.test(e));
      if (err.length) informe.push(nombre + ' · ERRORES: ' + [...new Set(err)].slice(0, 8).join(' || '));
      await t.cerrar();
    }
  }
  console.log(informe.join('\n'));
  fs.writeFileSync(__dirname + '/capturas/auditoria-' + ANCHO + '.txt', informe.join('\n') + '\n');
})();
