// Prueba central: abre las 7 apps (sin errores de JS, carga unificada activa) y en Órbita revisa precios en pesos chilenos.
const { abrir } = require('./h');
const ok = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  let fallas = 0;
  // La versión del código debe ser la de version.json (si no, el botón Actualizar dice "aún se está publicando").
  const fs = require('fs'), CODIGO = { saas: ['shared/config.js', /VERSION: '([\d.]+)'/], emprendedor: ['js/core.js', /VERSION = '([\d.]+)'/], Aplicaciones: ['shared/core.js', /APP_VERSION = '([\d.]+)'/],
    barberia: ['shared/core.js', /VERSION = '([\d.]+)'/], contenido: ['shared/config.js', /VERSION: '([\d.]+)'/] };
  for (const [app, [f, re]] of Object.entries(CODIGO)) {
    const v = JSON.parse(fs.readFileSync('/home/user/' + app + '/version.json')).version, m = fs.readFileSync('/home/user/' + app + '/' + f, 'utf8').match(re);
    if (!m || m[1] !== v) { fallas++; console.log('FALLA: ' + app + ': ' + f + ' dice ' + (m && m[1]) + ' y version.json ' + v); } else console.log('ok', app + ': versión del código = version.json');
  }
  for (const app of ['saas', 'emprendedor', 'Aplicaciones', 'barberia', 'taller', 'estacionamiento', 'contenido']) {
    const db = app === 'barberia' ? 'barberia_prueba' : 'p_' + app.toLowerCase();
    if (app !== 'barberia') require('child_process').execSync(__dirname + '/base.sh /home/user/' + app, { stdio: 'ignore' });
    const t = await abrir('/home/user/' + app, db); const p = t.page;
    try {
      await p.goto(t.base + '/'); await p.waitForTimeout(1500);
      ok(await p.evaluate(() => !!window.CFX_CARGA && !!document.querySelector('style') && typeof fetch === 'function'), app + ': carga unificada activa');
      // La barra aparece con una consulta lenta y se va al terminar.
      const barra = await p.evaluate(async () => { CFX_CARGA.barra(true); await new Promise((r) => setTimeout(r, 400)); const on = document.querySelector('.cfx-carga-b.on') !== null; CFX_CARGA.barra(false); return on && !document.querySelector('.cfx-carga-b.on'); });
      ok(barra, app + ': barra de carga aparece y se va');
      // Reparar la app (núcleo): está en Configuración del menú común.
      ok(await p.evaluate(() => { const d = document.createElement('div'); document.body.append(d); try { CFX_MENU.montar(d, []); return d.textContent.includes('Reparar la app'); } catch (e) { return fetch(document.querySelector('script[src*="ayuda.js"]').src).then((r) => r.text()).then((t) => t.includes("t: 'Reparar la app'")); } finally { d.remove(); } }), app + ': botón Reparar la app');
      if (app === 'Aplicaciones') {
        const r = await p.evaluate(() => [Core.money(10000), Core.money(19.99), Core.precioNum('10.000'), Core.precioNum('$ 25.990'), Core.precioNum('Consultar')]);
        ok(r[0] === '$10.000' && r[1] === '$20' && r[2] === 10000 && r[3] === 25990 && Number.isNaN(r[4]), 'Órbita: precios en pesos chilenos ' + JSON.stringify(r));
        await p.goto(t.base + '/apps/fichas/'); await p.waitForTimeout(1500);
        ok(await p.evaluate(() => { const e = document.getElementById('f-precio'); return !e || e.placeholder === '10.000'; }), 'Órbita: editor de anuncio pide precio sin decimales');
        // U14: el pill PRO no se parte y no hay línea amarilla bajo la cabecera.
        ok(await p.evaluate(() => { const x = document.querySelector('.pill.pro'); const c = document.querySelector('.cfx-cinta'); return (!x || getComputedStyle(x).whiteSpace === 'nowrap') && (!c || getComputedStyle(c).display === 'none'); }), 'Órbita: PRO entero y sin línea amarilla');
        // Vitrina (núcleo): la página pública luce el perfil de la tienda.
        const id = '00000000-0000-0000-0000-0000000000aa';
        await t.sim.su('set session_replication_role = replica');
        await t.sim.su('insert into auth.users (id, email) values ($1, $2) on conflict do nothing', [id, 'vitrina@x.cl']);
        await t.sim.su("insert into public.profiles (id, email, role, empresa, slug, telefono, horario, rubro, perfil) values ($1, 'vitrina@x.cl', 'user', 'Vitrina Prueba', 'vitrina', '56912345678', 'Lun a Vie 9 a 18', 'Ropa', $2) on conflict do nothing",
          [id, JSON.stringify({ descripcion: 'Ropa hecha a mano', comuna: 'Ñuñoa', instagram: '@vitrina' })]);
        await t.sim.su('set session_replication_role = origin');
        await p.goto(t.base + '/t/?s=vitrina'); await p.waitForTimeout(1500);
        const v = await p.evaluate(() => { const s = document.querySelector('#perfil .pf'); return s && [s.querySelector('h2').textContent, s.textContent.includes('Ropa hecha a mano'), !!s.querySelector('a[href*="instagram.com/vitrina"]'), !!s.querySelector('a[href*="wa.me/56912345678"]'), document.documentElement.scrollWidth <= innerWidth + 1]; });
        ok(v && v[0] === 'Vitrina Prueba' && v.slice(1).every(Boolean), 'Órbita: tienda pública con perfil ' + JSON.stringify(v));
        await t.foto('vitrina');
        // Variantes + ficha: la opción "L" cuesta distinto y "S" está agotada; la ficha muestra la barra Agregar y el carrito cobra el precio de la opción.
        await t.sim.su("insert into public.catalog_items (owner_id, client_key, nombre, precio, categoria, opciones) values ($1, 'pol', 'Polera', 10000, 'Ropa', 'S, L')", [id]);
        await t.sim.su("insert into public.variantes (owner_id, clave, nombre, precio, stock, orden) values ($1, 'pol', 'S', null, 0, 0), ($1, 'pol', 'L', 12000, null, 1)", [id]);
        await p.goto(t.base + '/t/?s=vitrina'); await p.waitForTimeout(2000);
        await p.click('#grid .item > b'); await p.waitForTimeout(400);
        const f = await p.evaluate(() => [!!document.querySelector('.t-ficha .t-barra [data-f-add]'), !!document.querySelector('.t-ficha [data-f-op="S"].agot')]);
        await p.click('.t-ficha [data-f-op="L"]'); await p.click('.t-ficha [data-f-add]'); await p.waitForTimeout(300);
        const tot = await p.evaluate(() => document.getElementById('barTotal').textContent);
        ok(f[0] && f[1] && tot.replace(/\D/g, '') === '12000', 'Órbita: ficha con barra Agregar y precio por opción ' + JSON.stringify([f, tot]));
        await t.foto('ficha');
      }
      const e = t.errores.filter((x) => !/404|Failed to load resource|net::/.test(x));
      ok(!e.length, app + ': sin errores ' + e.join(' | ').slice(0, 200));
    } catch (x) { fallas++; console.log(x.message); await t.foto(app + '-central-error'); }
    await t.cerrar();
  }
  console.log(fallas ? 'HAY FALLAS: ' + fallas : 'TODO OK'); process.exit(fallas ? 1 : 0);
})();
