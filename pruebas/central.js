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
      const resp = await p.goto(t.base + '/'); await p.waitForTimeout(1500);
      // A8: encabezados de seguridad del núcleo (_headers) y A7: sin cuenta no se llaman funciones de admin.
      const hd = resp.headers();
      ok(/frame-ancestors 'self'/.test(hd['content-security-policy'] || '') && /camera=\(self\)/.test(hd['permissions-policy'] || '') && hd['x-content-type-options'] === 'nosniff', app + ': encabezados de seguridad');
      const [an] = await t.sim.su("select has_function_privilege('anon', 'public.cfx_humano_guardar(text, text)', 'execute') g, has_function_privilege('anon', 'public.cfx_seguridad()', 'execute') s, has_function_privilege('anon', 'public.cfx_humano()', 'execute') h, has_function_privilege('anon', 'public.cfx_humano_ok(text)', 'execute') k, (select count(*) from storage.buckets where public and (file_size_limit is null or allowed_mime_types is null))::int b");
      ok(!an.g && !an.s && an.h && !an.k && an.b === 0, app + ': anon sin funciones de admin y buckets públicos con límite ' + JSON.stringify(an));
      ok(await p.evaluate(() => fetch(document.querySelector('script[src*="humano.js"]').src).then((r) => r.text()).then((x) => /recover\|otp\|resend/.test(x))), app + ': Turnstile también al recuperar la contraseña');
      ok(await p.evaluate(() => !!window.CFX_CARGA && !!document.querySelector('style') && typeof fetch === 'function'), app + ': carga unificada activa');
      // G8: los errores de JS se anotan en la base (cfx_error_anotar, sin cuenta) y el ping anti-pausa responde.
      await p.evaluate(() => { window.CFX_ERRORES_LOCAL = true; CFX_CARGA.anotarError('prueba G8 error', '/x.js:1:1'); setTimeout(() => { throw new Error('G8 lanzado'); }, 0); });
      await p.waitForTimeout(1500);
      const pg = await p.evaluate(() => { for (const k of Object.keys(window)) if (/_CONFIG$/.test(k) && window[k] && window[k].SUPABASE_URL) { const c = window[k];
        return fetch(c.SUPABASE_URL + '/rest/v1/rpc/cfx_ping', { method: 'POST', headers: { apikey: c.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: '{}' }).then((r) => r.json()); } });
      const [er] = await t.sim.su("select count(*) filter (where mensaje = 'prueba G8 error')::int a, count(*) filter (where mensaje like '%G8 lanzado%')::int b, (select count(*) from cfx_salud where clave = 'ping')::int c, has_function_privilege('anon', 'public.cfx_salud()', 'execute') s from cfx_errores");
      ok(er.a === 1 && er.b === 1 && er.c === 1 && !er.s && pg === 'ok', app + ': errores anotados y ping anti-pausa ' + JSON.stringify(er));
      // B13: el tiempo de carga real se anota (1 vez por página y sesión) y el CM lo ve en 🩺 Salud.
      await p.evaluate(() => { sessionStorage.clear(); CFX_CARGA.anotarCarga(); CFX_CARGA.anotarCarga(); }); await p.waitForTimeout(1200);
      const [cg] = await t.sim.su("select coalesce(sum(veces), 0)::int n, count(*)::int f, bool_and(ms > 0) m, has_function_privilege('anon', 'public.cfx_carga_anotar(text, int, int, boolean)', 'execute') a from cfx_cargas");
      const [cs] = await t.sim.su("select jsonb_array_length(c) n from (select (select jsonb_agg(c order by c.veces desc) from (select pagina, sum(veces)::int veces from public.cfx_cargas where dia > current_date - 7 group by pagina) c) c) x");
      ok(cg.n >= 1 && cg.n <= 2 && cg.f === 1 && cg.m && cg.a && cs.n === 1, app + ': B13 carga anotada ' + JSON.stringify(cg));
      // La barra aparece con una consulta lenta y se va al terminar.
      const barra = await p.evaluate(async () => { CFX_CARGA.barra(true); await new Promise((r) => setTimeout(r, 400)); const on = document.querySelector('.cfx-carga-b.on') !== null; CFX_CARGA.barra(false); return on && !document.querySelector('.cfx-carga-b.on'); });
      ok(barra, app + ': barra de carga aparece y se va');
      // Reparar la app (núcleo): está en Configuración del menú común.
      ok(await p.evaluate(() => { const d = document.createElement('div'); document.body.append(d); try { CFX_MENU.montar(d, []); return d.textContent.includes('Reparar la app'); } catch (e) { return fetch(document.querySelector('script[src*="ayuda.js"]').src).then((r) => r.text()).then((t) => t.includes("t: 'Reparar la app'")); } finally { d.remove(); } }), app + ': botón Reparar la app');
      // Fotos (núcleo fotos.js): una foto grande se achica a WebP y queda bajo el peso del comprobante.
      const fz = await p.evaluate(async () => { if (!window.CFX_ACHICAR) return null; const c = document.createElement('canvas'); c.width = 3000; c.height = 2000; const g = c.getContext('2d');
        for (let i = 0; i < 4000; i++) { g.fillStyle = 'hsl(' + (i * 37 % 360) + ',70%,50%)'; g.fillRect((i * 97) % 3000, (i * 53) % 2000, 60, 40); }
        const d = await CFX_ACHICAR(c.toDataURL('image/png'), 'comprobante'); return [d.slice(0, 15), d.length, CFX_FOTO.comprobante.kb * 1400]; });
      ok(fz && fz[0] === 'data:image/webp' && fz[1] <= fz[2], app + ': foto achicada a WebP ' + JSON.stringify(fz));
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
        // G17 · F32: el Worker de /t/ (worker.js) pone título, og:* y schema.org de la tienda y del producto; /t/og entrega la imagen; si Supabase no responde, la página sale igual.
        const g17png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        await t.sim.su("insert into public.catalog_items (owner_id, client_key, nombre, precio, categoria, descripcion, foto, foto_at) values ($1, 'g17p', 'Polerón <Lana>', 18990, 'Polerones', 'Tejido a mano', $2, now()) on conflict do nothing", [id, g17png]);
        const g17w = await import('/home/user/Aplicaciones/worker.js'), g17f0 = global.fetch, g17dir = '/home/user/Aplicaciones';
        const g17env = { ASSETS: { fetch: async (r) => { const u = new URL(r.url || r), f = g17dir + (u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname);
          if (!fs.existsSync(f)) return new Response('no', { status: 404 });
          return new Response(fs.readFileSync(f), { headers: { 'content-type': /\.html$/.test(f) ? 'text/html; charset=utf-8' : /\.png$/.test(f) ? 'image/png' : 'application/javascript' } }); } } };
        let g17lento = false;
        global.fetch = async (u, o) => { const m = String(u).match(/\/rest\/v1\/rpc\/(\w+)$/); const a = JSON.parse(o.body);
          if (g17lento) await new Promise((z, mal) => o.signal.addEventListener('abort', () => mal(new Error('abort'))));
          const r = m[1] === 'tienda_publica' ? (await t.sim.su('select public.tienda_publica($1) r', [a.p_slug]))[0].r
            : m[1] === 'catalogo_publico' ? await t.sim.su('select * from public.catalogo_publico($1)', [a.p_slug]) : await t.sim.su('select * from public.fotos_publicas($1, $2)', [a.p_slug, a.p_claves]);
          return new Response(JSON.stringify(r), { headers: { 'content-type': 'application/json' } }); };
        const g17get = async (q) => { const r = await g17w.default.fetch(new Request('https://x.dev' + q), g17env); return [r, /^image/.test(r.headers.get('content-type')) ? Buffer.from(await r.arrayBuffer()) : await r.text()]; };
        const g17ld = (h) => JSON.parse((h.match(/<script type="application\/ld\+json">(.*?)<\/script>/) || [, 'null'])[1]);
        const [, g17h] = await g17get('/t/?s=vitrina'), [, g17hp] = await g17get('/t/?s=vitrina&p=g17p'), [g17ri, g17img] = await g17get('/t/og?s=vitrina&p=g17p'), [g17rl] = await g17get('/t/og?s=vitrina');
        const g17a = g17ld(g17h), g17b = g17ld(g17hp);
        ok(/<title>Vitrina Prueba · Ropa · Tienda en línea<\/title>/.test(g17h) && /property="og:image" content="https:\/\/x\.dev\/t\/og\?s=vitrina&amp;v=/.test(g17h) && /name="description" content="Ropa hecha a mano"/.test(g17h) &&
          g17a['@type'] === 'Store' && g17a.address.addressLocality === 'Ñuñoa' && g17a.hasOfferCatalog.itemListElement[0].price === 18990 && g17a.hasOfferCatalog.itemListElement[0].priceCurrency === 'CLP',
          'Órbita G17: Worker pone título, descripción, og:image y schema.org Store de la tienda ' + JSON.stringify((g17h.match(/<title>.*?<\/title>/) || [])[0]));
        ok(/<title>Polerón &lt;Lana&gt; · \$18\.990 · Vitrina Prueba<\/title>/.test(g17hp) && /og:type" content="product"/.test(g17hp) && /og:image" content="[^"]*p=g17p/.test(g17hp) &&
          g17b['@type'] === 'Product' && g17b.offers.price === 18990 && g17b.offers.availability === 'https://schema.org/InStock' && !/<Lana>/.test(g17hp),
          'Órbita G17: link de producto con su título, precio, foto y schema.org Product (escapado)');
        ok(g17ri.headers.get('content-type') === 'image/png' && g17img[0] === 0x89 && g17img.length > 20 && g17rl.headers.get('content-type') === 'image/png' && g17rl.status === 200,
          'Órbita G17: /t/og entrega la foto del producto y, sin logo, el ícono de la app ' + g17img.length);
        // G18 · G36: /t/feed arma el catálogo para Google e Instagram (RSS con g:*) y en JSON; sin tienda 404; si Supabase no responde, 503 sin caché.
        const [g18r, g18x] = await g17get('/t/feed?s=vitrina'), [g18rj, g18j] = await g17get('/t/feed?s=vitrina&f=json'), [g18rn] = await g17get('/t/feed?s=noexiste');
        g17lento = true; const [g18rl] = await g17get('/t/feed?s=lenta-feed'); g17lento = false;
        const g18p = JSON.parse(g18j).productos.find((i) => i.id === 'g17p');
        ok(/^application\/xml/.test(g18r.headers.get('content-type')) && /xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/.test(g18x) && /<g:id>g17p<\/g:id><g:title>Polerón &lt;Lana&gt;<\/g:title>/.test(g18x) &&
          /<g:price>18990 CLP<\/g:price>/.test(g18x) && /<g:availability>in_stock<\/g:availability>/.test(g18x) && /<g:image_link>https:\/\/x\.dev\/t\/og\?s=vitrina&amp;p=g17p&amp;v=\d+<\/g:image_link>/.test(g18x) &&
          /<g:link>https:\/\/x\.dev\/t\/\?s=vitrina&amp;p=g17p<\/g:link>/.test(g18x) && g18r.headers.get('cache-control') === 'public, max-age=3600' &&
          g18p && g18p.precio === 18990 && g18p.moneda === 'CLP' && g18p.disponible && g18rj.headers.get('access-control-allow-origin') === '*' &&
          g18rn.status === 404 && g18rl.status === 503 && g18rl.headers.get('cache-control') === 'no-store',
          'Órbita G18: catálogo para Google e Instagram (feed XML y JSON) ' + JSON.stringify([g18r.status, g18rj.status, g18rn.status, g18rl.status, g18p]));
        g17lento = true; const g17t0 = Date.now(), [, g17hl] = await g17get('/t/?s=lenta'); g17lento = false;
        const [, g17hn] = await g17get('/t/?s=noexiste');
        global.fetch = g17f0;
        ok(/<title>Tienda · Órbita<\/title>/.test(g17hl) && Date.now() - g17t0 < 2500 && /<title>Tienda · Órbita<\/title>/.test(g17hn) && fs.readFileSync(g17dir + '/robots.txt', 'utf8').includes('Allow: /t/'),
          'Órbita G17: si Supabase tarda o la tienda no existe, la página sale igual (y robots deja ver /t/) ' + (Date.now() - g17t0) + ' ms');
        // F32 + F31: ?p= abre la ficha del producto con 🔗 Compartir; las tarjetas animan solo la primera vez (sin parpadeo al llegar fotos).
        await p.goto(t.base + '/t/?s=vitrina&p=g17p'); await p.waitForTimeout(2500);
        const g17fi = await p.evaluate(() => { const f = document.querySelector('.t-ficha'); return f && [f.querySelector('h3').textContent, !!f.querySelector('[data-f-comp]'), !!f.querySelector('img'),
          document.getElementById('grid').classList.contains('t-visto'), document.querySelectorAll('#grid .t-sk, #grid .foto-esq').length, CFX_LINK_PRODUCTO('g17p').endsWith('/t/?s=vitrina&p=g17p')]; });
        ok(g17fi && g17fi[0] === 'Polerón <Lana>' && g17fi[1] && g17fi[2] && g17fi[3] && g17fi[4] === 0 && g17fi[5], 'Órbita G17: link de producto abre su ficha con 🔗 Compartir ' + JSON.stringify(g17fi));
        // G18 · G35: la ficha trae 💬 Pedir por WhatsApp (producto, precio y link) y el botón de la portada llega con el mensaje listo.
        const g18wa = await p.evaluate(() => [(document.querySelector('.t-ficha [data-f-wa]') || {}).href || '', (document.querySelector('#perfil .pf-acc a[href*="wa.me"]') || {}).href || '']);
        const g18m = decodeURIComponent((g18wa[0].split('?text=')[1] || ''));
        ok(/^https:\/\/wa\.me\/56912345678\?text=/.test(g18wa[0]) && g18m.includes('Polerón <Lana>') && g18m.includes('$18.990') && g18m.includes('Vitrina Prueba') && /\/t\/\?s=vitrina&p=g17p$/.test(g18m) &&
          /^https:\/\/wa\.me\/56912345678\?text=Hola/.test(g18wa[1]) && decodeURIComponent(g18wa[1]).includes('Vi tu tienda Vitrina Prueba'),
          'Órbita G18: Pedir por WhatsApp con el mensaje listo ' + JSON.stringify([g18m, g18wa[1].slice(0, 60)]));
        await t.foto('vitrina-producto');
        await p.emulateMedia({ colorScheme: 'dark' }); await p.goto(t.base + '/t/?s=vitrina'); await p.waitForTimeout(1500);
        const g17os = await p.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()]);
        ok(g17os[0] !== 'rgb(243, 245, 247)' && g17os[1] === '#7c8088', 'Órbita G17: vitrina en modo oscuro con el color de su rubro (Ropa, negro aclarado para que se lea) ' + JSON.stringify(g17os));
        await t.foto('vitrina-oscuro'); await p.emulateMedia({ colorScheme: 'light' });
        await t.sim.su("delete from public.catalog_items where owner_id = $1 and client_key = 'g17p'", [id]);
        // F31: mientras llega el catálogo (red lenta) se ven tarjetas esqueleto.
        await p.route(/rpc\/catalogo_publico/, async (r) => { await new Promise((z) => setTimeout(z, 1500)); r.fallback(); });
        await p.goto(t.base + '/t/?s=vitrina'); await p.waitForTimeout(700);
        const g17sk = await p.evaluate(() => document.querySelectorAll('#grid .t-sk').length);
        await p.waitForTimeout(2000); await p.unroute(/rpc\/catalogo_publico/);
        ok(g17sk === 4 && await p.evaluate(() => !document.querySelector('#grid .t-sk')), 'Órbita G17: esqueleto de tarjetas mientras carga el catálogo ' + g17sk);
        // Turnstile en compras sin cuenta: con secret key, humano.js pone el token y la base lo revisa con Cloudflare.
        await t.sim.su("update public.cfx_config set valor = '{\"site_key\": \"0x4AAAAAAAprueba\"}' where clave = 'humano'");
        await t.sim.su("insert into public.cfx_secretos (clave, valor) values ('turnstile', '0x4AAAAAAAsecreto') on conflict (clave) do update set valor = excluded.valor");
        await t.sim.su("insert into extensions.http_respuestas (url_like, content) values ('%turnstile/v0/siteverify%', '{\"success\": false}') on conflict (url_like) do update set content = excluded.content");
        const pedir = () => p.evaluate(() => Cuenta.rpc('crear_pedido_invitado', { p_slug: 'vitrina', p_nombre: 'Robot', p_tel: '56911112222', p_items: [], p_entrega: 'retiro', p_direccion: '', p_nota: '' }).then((r) => JSON.stringify(r), (e) => 'ERR ' + e.message));
        await p.reload(); await p.waitForTimeout(1200);
        const robot = await pedir();
        await t.sim.su("update extensions.http_respuestas set content = '{\"success\": true}' where url_like = '%turnstile/v0/siteverify%'");
        const humano = await pedir();
        const [lg] = await t.sim.su("select count(*)::int n, bool_and(content like '%response=token-prueba%') t from extensions.http_log where uri like '%siteverify%'");
        ok(/robot/.test(robot) && !/robot/.test(humano) && lg.n === 2 && lg.t, 'Órbita: Turnstile en compra sin cuenta ' + JSON.stringify([robot, humano, lg]));
        await t.sim.su("delete from public.cfx_secretos; update public.cfx_config set valor = '{\"site_key\": \"\"}' where clave = 'humano'");
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
        // "Te puede gustar": la ficha sugiere otro producto de la misma categoría y al tocarlo cambia de producto.
        await t.sim.su("insert into public.catalog_items (owner_id, client_key, nombre, precio, categoria) values ($1, 'sho', 'Short', 8000, 'Ropa')", [id]);
        await p.goto(t.base + '/t/?s=vitrina'); await p.waitForTimeout(2000);
        await p.click('#grid .item > b'); await p.waitForTimeout(400);
        const g = await p.evaluate(() => { const b = document.querySelector('.t-ficha [data-f-mas]'); if (!b) return null; const n = b.textContent; b.click(); return [n, document.querySelector('.t-ficha h3').textContent]; });
        ok(g && g[1] !== 'Polera' && g[0].includes(g[1]), 'Órbita: Te puede gustar ' + JSON.stringify(g));
        // Volvió el stock por opción: "S" pasa de 0 a 3 y avisa al cliente que pidió "Avísame".
        const cli = '00000000-0000-0000-0000-0000000000ab';
        await t.sim.su('set session_replication_role = replica');
        await t.sim.su('insert into auth.users (id, email) values ($1, $2) on conflict do nothing', [cli, 'cli@x.cl']);
        await t.sim.su("insert into public.profiles (id, email, role) values ($1, 'cli@x.cl', 'user') on conflict do nothing", [cli]);
        await t.sim.su("insert into public.avisos_stock (cliente_id, negocio_id, clave) values ($1, $2, 'pol')", [cli, id]);
        await t.sim.su('set session_replication_role = origin');
        await t.sim.su("update public.variantes set stock = 3 where owner_id = $1 and clave = 'pol' and nombre = 'S'", [id]);
        const av = await t.sim.su("select (select count(*) from public.notifications where target_id = $1 and title like '%Polera (S)%')::int n, (select count(*) from public.avisos_stock where cliente_id = $1)::int q", [cli]);
        ok(JSON.stringify(av).includes('"n":1') && JSON.stringify(av).includes('"q":0'), 'Órbita: volvió el stock por opción avisa ' + JSON.stringify(av));
        // Pedido nuevo en vivo: con Pedidos abierto, un pedido que entra se marca (y suena/vibra) sin recargar.
        await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' }); await t.sim.su('update public.profiles set terms_at = now()');
        const [{ id: tid }] = await t.sim.su("select id from public.profiles where email = 'tienda@x.cl'");
        const { page: q } = await t.nuevo(); await q.goto(t.base + '/'); await q.waitForTimeout(1200);
        await q.fill('input[type=email]:visible', 'tienda@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3000);
        // Tienda en 5 min: barra de progreso con pasos; al compartir se marca ese paso.
        const t5 = async () => q.evaluate(() => [!document.getElementById('hoyFalta').classList.contains('hidden'), document.getElementById('hoyFaltaN').textContent, document.getElementById('hoyFaltaB').style.width]);
        const a5 = await t5(); await q.evaluate(() => { navigator.share = null; window.open = () => null; document.getElementById('hoyCompartir').click(); location.reload(); }); await q.waitForTimeout(3000); const b5 = await t5();
        ok(a5[0] && / de 7$/.test(a5[1]) && parseInt(b5[1]) === parseInt(a5[1]) + 1 && parseFloat(b5[2]) > parseFloat(a5[2]), 'Órbita: tienda en 5 min con barra ' + JSON.stringify([a5, b5]));
        await t.foto('tienda5', q);
        // G9: recorrido guiado la 1ª vez (se salta y no vuelve), ✅ Qué hacer hoy y ❓ Ayuda con preguntas frecuentes.
        await t.sinModales(q); await q.waitForTimeout(1700);
        const tr = await q.evaluate(() => { const c = document.querySelector('.cfx-tour-caja'); if (!c) return [null]; const a = c.querySelector('small').textContent; c.querySelector('[data-t=s]').click();
          const b = c.querySelector('small').textContent; c.querySelector('[data-t=x]').click(); return [a, b, !document.querySelector('.cfx-tour'), localStorage.getItem('cfx:tour:orbita-inicio')]; });
        await t.sim.su("insert into public.cfx_mensajes (de, para, texto) values ($1, $2, 'Hola, ¿tienen talla M?')", [cli, tid]);
        await q.reload(); await q.waitForTimeout(3000); await t.sinModales(q); await q.waitForTimeout(1700);
        const qh = await q.evaluate(() => [!!document.querySelector('.cfx-tour'), document.getElementById('hoyHacerL').textContent]);
        await q.evaluate(() => document.getElementById('hoyAyuda').click()); await q.waitForTimeout(300);
        await q.click('.elegir button:has-text("Preguntas frecuentes")'); await q.waitForTimeout(300);
        const fq = await q.locator('.faq details').count(); await q.click('.faq button[data-x]');
        await q.evaluate(() => document.getElementById('hoyAyuda').click()); await q.waitForTimeout(300);
        await q.click('.elegir button:has-text("Ver el recorrido")'); await q.waitForTimeout(500); await t.foto('recorrido', q);
        const tr2 = await q.evaluate(() => { const c = document.querySelector('.cfx-tour-caja'); const r = !!c && /^1 de/.test(c.querySelector('small').textContent); if (c) c.querySelector('[data-t=x]').click(); return r; });
        ok(tr[0] && /^1 de 5/.test(tr[0]) && /^2 de/.test(tr[1]) && tr[2] && tr[3] === '1' && !qh[0] && /Responde 1 mensaje/.test(qh[1]) && fq === 9 && tr2,
          'Órbita: qué hacer hoy + ayuda y recorrido ' + JSON.stringify([tr, qh, fq, tr2]));
        await t.foto('hoy_hacer', q);
        // G15 · E24/E27: el análisis nocturno (Python) encuentra clientes que dejaron de venir y productos quietos; el stock que se mueve cuenta.
        const g15py = () => require('child_process').execSync('python3 ' + __dirname + '/../analisis/analisis.py "host=/var/tmp/pgb port=54329 user=postgres dbname=' + db + '"',
          { env: { ...process.env, PATH: '/usr/lib/postgresql/16/bin:' + process.env.PATH } }).toString();
        require('child_process').execSync('psql -h /var/tmp/pgb -p 54329 -U postgres -q -v ON_ERROR_STOP=1 -d ' + db + ' -f ' + __dirname + '/analisis_datos.sql', { env: { ...process.env, PATH: '/usr/lib/postgresql/16/bin:' + process.env.PATH } });
        const g15out = g15py();
        const [g15a] = await t.sim.su("select datos -> 'riesgo_total' r, datos -> 'quietos_total' q, datos #>> '{riesgo,0,nombre}' n, datos #>> '{mov,an2,0}' m, (select datos #>> '{ventas,pedidos30}' from cfx_analisis where clave = 'app') p, (select valor ->> 'negocios' from cfx_salud where clave = 'analisis') s from cfx_analisis where clave = '00000000-0000-0000-0000-0000000000e1'");
        await t.sim.su("update public.catalog_items set stock = 4 where client_key = 'an2'"); g15py();
        const [g15b] = await t.sim.su("select datos -> 'quietos_total' q, has_function_privilege('authenticated', 'public.cfx_analisis_datos()', 'execute') d, has_function_privilege('authenticated', 'public.cfx_analisis_guardar(jsonb)', 'execute') g, has_function_privilege('anon', 'public.cfx_analisis_mio()', 'execute') a from cfx_analisis where clave = '00000000-0000-0000-0000-0000000000e1'");
        // G16 · E28 predicción (stock que se acaba + venta de la semana) y E29 segmentos, del mismo análisis.
        const [g16a] = await t.sim.su("select datos -> 'acaba_total' a, datos #>> '{acaba,0,nombre}' an, (datos #>> '{semana,monto}')::int sm, datos #>> '{semana,mejor_dia}' md, datos #>> '{segmentos,riesgo,total}' sr, datos #>> '{segmentos,perdidos,total}' sp, datos #>> '{segmentos,nuevos,lista,0,nombre}' sn, jsonb_array_length(datos #> '{mov,an5}') ml from cfx_analisis where clave = '00000000-0000-0000-0000-0000000000e1'");
        ok(g16a.a === 1 && g16a.an === 'Café molido' && g16a.sm > 0 && !!g16a.md && g16a.sr === '2' && g16a.sp === '1' && g16a.sn === 'Beto' && g16a.ml === 5, 'Órbita: G16 predicción y segmentos en el análisis ' + JSON.stringify(g16a));
        ok(g15a.r === 2 && g15a.q === 2 && g15a.n === 'Ana Pérez' && g15a.m === '5' && g15a.p === '3' && +g15a.s >= 1 && /Negocios analizados: \d/.test(g15out) && g15b.q === 1 && !g15b.d && !g15b.g && !g15b.a,
          'Órbita: G15 análisis nocturno en Python (riesgo, quietos y stock que se mueve) ' + JSON.stringify([g15a, g15b]));
        // En Hoy: 🔎 Para vender más con 💬 WhatsApp listo y la tarea en ✅ Qué hacer hoy. Con el módulo apagado no se ve.
        await t.sim.su("select public.cfx_analisis_guardar(jsonb_build_object('negocios', jsonb_build_object($1::text, '{\"riesgo\": [{\"nombre\": \"Ana Pérez\", \"tel\": \"912345678\", \"dias\": 40, \"cada\": 10, \"compras\": 4, \"total\": 40000}], \"riesgo_total\": 1, \"quietos\": [{\"nombre\": \"Queque viejo\", \"stock\": 5, \"dias\": 60}], \"quietos_total\": 1, \"mov\": {}}'::jsonb)))", [tid]);
        await q.reload(); await q.waitForTimeout(3000); await t.sinModales(q); await q.waitForTimeout(800);
        const g15c = await q.evaluate(() => { const c = document.getElementById('hoyRecuperar'); const w = c.querySelector('[data-wa]');
          return [!c.classList.contains('hidden'), c.textContent, w && w.href, document.getElementById('hoyHacerL').textContent, !!document.querySelector('#hoyHacerL [data-ir=hoyRecuperar]')]; });
        await q.evaluate(() => document.getElementById('hoyRecuperar').scrollIntoView()); await t.foto('hoy_recuperar', q);
        await t.sim.su("update cfx_config set valor = valor || '{\"analisis\": false}' where clave = 'modulos'");
        const [g15d] = await t.sim.su("select set_config('request.jwt.claim.sub', $1, false), public.cfx_analisis_mio() m", [tid]); await t.sim.su("select set_config('request.jwt.claim.sub', '', false)");
        await t.sim.su("update cfx_config set valor = valor - 'analisis' where clave = 'modulos'");
        ok(g15c[0] && /Ana Pérez/.test(g15c[1]) && /Queque viejo/.test(g15c[1]) && /^https:\/\/wa\.me\/56912345678\?text=Hola%20Ana/.test(g15c[2]) && /Escríbele a 1 cliente/.test(g15c[3]) && /1 producto no se vende/.test(g15c[3]) && g15c[4] && g15d.m === null,
          'Órbita: G15 clientes en riesgo y productos quietos en Hoy + módulo ' + JSON.stringify([g15c.slice(0, 1), g15c[2], g15d]));
        // G12 · C14 chat del núcleo: 3 mensajes seguidos y se bloquea el envío; reportar llega al admin. C19: con el módulo apagado no hay chat.
        const c2 = '00000000-0000-0000-0000-0000000000c2';
        await t.sim.su('set session_replication_role = replica');
        await t.sim.su('insert into auth.users (id, email) values ($1, $2) on conflict do nothing', [c2, 'cli2@x.cl']);
        await t.sim.su("insert into public.profiles (id, email, role, empresa, negocio_id) values ($1, 'cli2@x.cl', 'client', 'Cliente Dos', $2) on conflict do nothing", [c2, tid]);
        await t.sim.su('set session_replication_role = origin');
        await t.sim.su("insert into public.cfx_mensajes (de, para, texto) values ($1, $2, 'Hola G12')", [c2, tid]);
        await q.goto(t.base + '/apps/mensajes/?con=' + c2); await q.waitForTimeout(2500); await t.sinModales(q);
        for (const m of ['uno', 'dos', 'tres']) { await q.fill('#texto', m); await q.click('#bEnviar'); await q.waitForTimeout(1200); }
        const ch = await q.evaluate(() => [document.getElementById('bEnviar').disabled, document.getElementById('tip').textContent, document.querySelectorAll('#msgs .b.mio').length]);
        await q.evaluate(() => { window.prompt = () => 'spam'; document.querySelector('#msgs .rep').click(); }); await q.waitForTimeout(1200);
        const [cr] = await t.sim.su("select (select count(*) from cfx_mensajes where de = $1)::int n, (select count(*) from cfx_reportes where motivo = 'spam')::int r, (select count(*) from notifications where title like '%reporte%')::int a", [tid]);
        await t.foto('chat_g12', q);
        await t.sim.su("update public.cfx_config set valor = '{\"chat\": false}' where clave = 'modulos'");
        await q.goto(t.base + '/'); await q.waitForTimeout(2500);
        const off = await q.evaluate(() => [document.body.classList.contains('sin-chat'), [...document.querySelectorAll('a[href*="apps/mensajes/"]')].every((x) => !x.offsetParent)]);
        await q.goto(t.base + '/apps/mensajes/'); await q.waitForTimeout(2000);
        off.push(await q.evaluate(() => /no está disponible/.test(document.querySelector('main').textContent)));
        await t.sim.su("update public.cfx_config set valor = '{}' where clave = 'modulos'");
        ok(ch[0] && /Ya enviaste 3/.test(ch[1]) && ch[2] === 3 && cr.n === 3 && cr.r === 1 && off.every(Boolean), 'Órbita: chat del núcleo (3 seguidos, reportar) y módulo apagado ' + JSON.stringify([ch, cr, off]));
        // G12b · C15 calificaciones en 2 direcciones y C16 cupones + tarjeta de sellos del núcleo (Pro). Con los módulos apagados no se usan ni se ven.
        await t.sim.su("update public.profiles set plan = 'pro', pro_until = now() + interval '30 days' where id = $1", [tid]);
        await q.goto(t.base + '/apps/pedidos/?v=cupones'); await q.waitForTimeout(2500); await t.sinModales(q);
        await q.fill('#cCodigo', 'g12-b'); await q.fill('#cPct', '10'); await q.click('#bCupon'); await q.waitForTimeout(1500);
        const cu = await q.evaluate(() => document.getElementById('cupones').textContent);
        await t.foto('cupones_g12b', q);
        await q.evaluate(() => Cuenta.rpc('set_mi_tienda', { p_datos_pago: '', p_horario: '', p_abierto: true, p_sellos_meta: 2, p_sellos_premio: 'Café gratis' }));
        await t.sim.su("insert into public.catalog_items (owner_id, client_key, nombre, precio, categoria) values ($1, 'g12', 'Gorro', 10000, 'Ropa')", [tid]);
        const [gp] = await t.sim.su("select public.guardar_pedido($1, $2, null, null, '[{\"clave\":\"g12\",\"cant\":1}]', 'retiro', '', '', 'g12b') r", [tid, c2]);
        const [pz] = await t.sim.su("select id, descuento from public.pedidos where id = $1", [gp.r.id]);
        const [pz2] = await t.sim.su("insert into public.pedidos (negocio_id, cliente_id, lineas, subtotal, total, entrega, estado) values ($1, $2, '[]', 5000, 5000, 'retiro', 'listo') returning id", [tid, c2]);
        await t.sim.su("update public.pedidos set estado = 'listo', subtotal = 5000, total = 5000 where id = $1", [pz.id]);
        const stG = [];
        for (const x of [pz.id, pz2.id]) stG.push(await q.evaluate((i) => Cuenta.rpc('actualizar_pedido', { p_id: i, p_estado: 'entregado' }).then((r) => r.ok, (e) => e.message), x));
        const r1 = await q.evaluate((i) => Cuenta.rpc('cfx_calificar', { p_ref: i, p_estrellas: 5 }), pz.id);
        const r2 = await q.evaluate((i) => Cuenta.rpc('cfx_calificar', { p_ref: i, p_estrellas: 4 }), pz.id);
        const [fd] = await t.sim.su("select (select usos from cfx_descuentos where owner_id = $1 and codigo = 'G12B') u, (select row(cantidad, premios)::text from cfx_sellos where negocio_id = $1 and cliente_id = $2) s, (select count(*) from notifications where target_id = $2 and title like '%tarjeta de sellos%')::int n", [tid, c2]);
        const pt = await q.evaluate(() => Cuenta.rpc('pedidos_tienda', { p_estado: 'historial' }));
        const p1 = pt.find((x) => x.id === pz.id), p2 = pt.find((x) => x.id === pz2.id);
        await t.sim.su("update public.cfx_config set valor = '{\"cupones\": false, \"sellos\": false, \"calificaciones\": false}' where clave = 'modulos'");
        const [gp2] = await t.sim.su("select public.guardar_pedido($1, $2, null, null, '[{\"clave\":\"g12\",\"cant\":1}]', 'retiro', '', '', 'G12B') r, public.cfx_sellos_cfg_de($1) ti, public.estrellas_tienda($1) e", [tid, c2]);
        await q.goto(t.base + '/apps/pedidos/?v=cupones'); await q.waitForTimeout(2500);
        const mo = await q.evaluate(() => [document.body.classList.contains('sin-cupones'), !document.querySelector('[data-v=cupones]').offsetParent, document.getElementById('v-pedidos').classList.contains('on')]);
        const pt2 = await q.evaluate(() => Cuenta.rpc('pedidos_tienda', { p_estado: 'historial' }));
        await t.sim.su("update public.cfx_config set valor = '{}' where clave = 'modulos'");
        ok(/G12B/.test(cu) && Number(pz.descuento) === 1000 && gp.r.ok && stG.every((x) => x === true) && r1.ok && !r2.ok && /Ya fue/.test(r2.error) && fd.u === 1 && fd.s === '(0,1)' && fd.n === 1 &&
          p1.calificado && Number(p1.cliente_estrellas) === 5 && !p2.calificado && !gp2.r.ok && /Cupón/.test(gp2.r.error) && gp2.ti === null && gp2.e === null && mo.every(Boolean) && pt2.every((x) => x.calificado),
          'Órbita: calificaciones, cupones y sellos del núcleo + módulos apagados ' + JSON.stringify([cu, gp.r.ok, stG, r1, r2, fd, p1 && [p1.calificado, p1.cliente_estrellas], gp2.r, gp2.ti, gp2.e, mo]));
        // G13 · C17 carrito y despacho del núcleo: el cliente guarda su carrito, recibe 1 recordatorio, el despacho por comuna se cobra y el pedido vacía el carrito. C18: auditar → cfx_registro.
        const como = (u) => t.sim.su("select set_config('request.jwt.claim.sub', $1, false)", [u]);
        await como(tid); await t.sim.su("select public.guardar_despacho('{\"retiro\": true, \"gratis_desde\": 0, \"zonas\": [{\"comuna\": \"Ñuñoa\", \"precio\": 2500}]}')");
        await como(c2); await t.sim.su("select public.guardar_carrito($1, '[{\"clave\":\"g12\",\"cant\":2,\"nombre\":\"Gorro\"}]')", [tid]);
        const [k1] = await t.sim.su("select (select count(*) from public.cfx_carritos where cliente = $1 and negocio = $2)::int n, public.cfx_carrito_aviso($1, $2, 1) av", [c2, tid]);
        [{ pu: k1.pu }] = await t.sim.su("select count(*)::int pu from public.notifications where target_id = $1 and title like '🛒%'", [c2]);
        const [k2] = await t.sim.su("select public.crear_pedido($1, '[{\"clave\":\"g12\",\"cant\":1}]', 'despacho', 'Calle 1, nunoa', '', '') r", [tid]);
        await como('');
        const [k3] = await t.sim.su("select (select count(*) from public.cfx_carritos where cliente = $1)::int n, (select costo_despacho from public.pedidos where id = ($2::jsonb ->> 'id')::uuid)::int d, to_regclass('public.carritos') v, to_regclass('public.auditoria') au", [c2, JSON.stringify(k2.r)]);
        await t.sim.su("select public.auditar('Prueba G13', 'registro único')");
        const [k4] = await t.sim.su("select count(*)::int n from public.cfx_registro where accion = 'Prueba G13'");
        ok(k1.n === 1 && k1.av === true && k1.pu === 1 && k2.r.ok && k3.n === 0 && k3.d === 2500 && !k3.v && !k3.au && k4.n === 1, 'Órbita: carrito + despacho + registro del núcleo ' + JSON.stringify([k1, k2.r.ok, k3, k4]));
        // G16 · F30 Estadísticas en vivo (hoy + gráficos por día y hora) + E28 esta semana + E29 grupos con campaña (cupón + WhatsApp) + Hoy.
        await t.sim.su("select public.cfx_analisis_guardar(jsonb_build_object('negocios', jsonb_build_object($1::text, '{\"riesgo\": [], \"riesgo_total\": 0, \"quietos\": [], \"quietos_total\": 0, \"acaba\": [{\"nombre\": \"Café molido\", \"stock\": 4, \"dias\": 6, \"semana\": 4.5}], \"acaba_total\": 1, \"semana\": {\"monto\": 35000, \"pedidos\": 3, \"pasada\": 30000, \"pedidos_pasada\": 2, \"mejor_dia\": \"viernes\"}, \"segmentos\": {\"riesgo\": {\"total\": 1, \"lista\": [{\"nombre\": \"Ana Pérez\", \"tel\": \"912345678\", \"dias\": 40, \"compras\": 4, \"total\": 40000}]}, \"vip\": {\"total\": 0, \"lista\": []}, \"nuevos\": {\"total\": 0, \"lista\": []}, \"perdidos\": {\"total\": 0, \"lista\": []}, \"frecuentes\": {\"total\": 0, \"lista\": []}}, \"mov\": {}}'::jsonb)))", [tid]);
        await q.goto(t.base + '/apps/pedidos/?v=stats'); await q.waitForTimeout(3000); await t.sinModales(q);
        const g16b = await q.evaluate(() => [document.getElementById('sHoyM').textContent, document.querySelectorAll('#gDias rect.b').length, document.querySelectorAll('#gHoras rect.b').length,
          !document.getElementById('sSemana').classList.contains('hidden') && document.getElementById('sSemana').textContent, !document.getElementById('sSeg').classList.contains('hidden'), document.getElementById('gHorasL').textContent]);
        await t.foto('estadisticas_g16', q);
        await q.click('#gDias', { position: { x: 5, y: 60 } }); const g16l = await q.textContent('#gDiasL');
        await q.click('[data-seg=riesgo]'); await q.waitForTimeout(300); await q.click('#bCampCupon'); await q.waitForTimeout(1500);
        const g16c = await q.evaluate(() => { const w = document.querySelector('#sSegL [data-wa]'); return [w && decodeURIComponent(w.href), document.getElementById('sSegL').textContent]; });
        await q.evaluate(() => document.getElementById('sSeg').scrollIntoView()); await t.foto('segmentos_g16', q);
        const [g16d] = await t.sim.su("select porcentaje p, hasta - public.hoy_cl() d from cfx_descuentos where owner_id = $1 and codigo = 'VUELVE15'", [tid]);
        await q.goto(t.base + '/'); await q.waitForTimeout(3000); await t.sinModales(q); await q.waitForTimeout(800);
        const g16e = await q.evaluate(() => [document.getElementById('hoyRecuperar').textContent, document.getElementById('hoyHacerL').textContent]);
        ok(g16b[0] !== '$0' && g16b[1] === 30 && g16b[2] === 24 && /~\$35\.000/.test(g16b[3]) && /Café molido/.test(g16b[3]) && g16b[4] && /Tu mejor hora/.test(g16b[5]) && /hace|\d/.test(g16l) && /pedido/.test(g16l) &&
          /^https:\/\/wa\.me\/56912345678\?text=Hola Ana Pérez/.test(g16c[0]) && /VUELVE15/.test(g16c[0]) && /Cupón VUELVE15 listo/.test(g16c[1]) && g16d && g16d.p === 15 && g16d.d === 14 &&
          /Se acaba pronto/.test(g16e[0]) && /Café molido/.test(g16e[0]) && /1 producto se acaba/.test(g16e[1]),
          'Órbita: G16 Estadísticas en vivo + esta semana + grupos con campaña + Hoy ' + JSON.stringify([g16b, g16l, g16c[0], g16d, g16e[1]]));
        await t.sim.su("update public.profiles set plan = 'free', pro_until = null where id = $1", [tid]);
        await q.goto(t.base + '/apps/pedidos/'); await q.waitForTimeout(2500);
        await t.sim.su("insert into public.pedidos (negocio_id, cliente_id, lineas, subtotal, total, entrega, estado) values ($1, $2, '[{\"nombre\":\"Polera\",\"cant\":1,\"precio\":10000,\"subtotal\":10000}]', 10000, 10000, 'retiro', 'recibido')", [tid, cli]);
        await q.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await q.waitForTimeout(1500);
        ok(await q.locator('.card.nuevo').count() === 1, 'Órbita: pedido nuevo en vivo en Pedidos');
        // G10: 🧾 Comprobante del pedido (ítems, total, medio de pago) → WhatsApp al teléfono del cliente.
        await t.sim.su("update public.pedidos set comprobante_at = now() where negocio_id = $1 and estado = 'recibido'", [tid]);
        await q.evaluate(() => { window.__abrio = []; window.open = (u) => { window.__abrio.push(u); return null; }; document.dispatchEvent(new Event('visibilitychange')); }); await q.waitForTimeout(1500);
        const [{ rid }] = await t.sim.su("select id rid from public.pedidos where negocio_id = $1 and estado = 'recibido' order by created_at desc limit 1", [tid]);
        await q.locator('[data-recibo="' + rid + '"]').click(); await q.waitForTimeout(400);
        const cpP = await q.evaluate(() => { const d = document.querySelector('.cfx-comp'); const r = [d && d.querySelector('pre').textContent]; d.querySelector('#compTel').value = '9 1234 5678';
          d.querySelector('[data-a=wsp]').click(); return r.concat(window.__abrio[0] || '', !document.querySelector('.cfx-comp')); });
        ok(/1 × Polera — \$10\.000/.test(cpP[0]) && /TOTAL: \$10\.000/.test(cpP[0]) && /Pago: Transferencia/.test(cpP[0]) && /No es boleta electrónica/.test(cpP[0]) &&
          /^https:\/\/wa\.me\/56912345678\?text=/.test(cpP[1]) && cpP[2], 'Órbita: comprobante de pedido por WhatsApp ' + JSON.stringify(cpP));
        // Push de pedido abre ESE pedido: el aviso lleva ?p=<id> y la página lo busca y lo marca.
        await t.sim.su("begin; insert into public.pedidos (negocio_id, cliente_id, lineas, subtotal, total, entrega, estado) values ('" + tid + "', '" + cli + "', '[]', 5000, 5000, 'retiro', 'entregado'); select public.notify_user('" + tid + "', 'p', 'p', 'apps/pedidos/'); commit;");
        const [{ pid, url }] = await t.sim.su("select url, substr(url, 17) pid from public.notifications where title = 'p' order by created_at desc limit 1");
        await q.goto(t.base + '/apps/pedidos/?p=' + pid); await q.waitForTimeout(3500);
        ok(/^apps\/pedidos\/\?p=/.test(url) && await q.locator('[data-ped="' + pid + '"].nuevo').count() === 1, 'Órbita: push de pedido abre el pedido exacto ' + url);
        // Inventario: la Caja pide la opción, la venta descuenta producto y opción en el servidor, y ➕ Entró suma.
        await t.sim.su("insert into public.catalog_items (owner_id, client_key, nombre, precio, stock, opciones) values ($1, 'cam', 'Camisa', 9000, 10, 'Rojo, Azul')", [tid]);
        await t.sim.su("insert into public.variantes (owner_id, clave, nombre, precio, stock, orden) values ($1, 'cam', 'Rojo', 9500, 5, 0), ($1, 'cam', 'Azul', null, 5, 1)", [tid]);
        await q.evaluate((k) => localStorage.setItem('caja:migrado', '1') || localStorage.setItem('caja:' + k + ':productos', JSON.stringify([{ id: 'cam', nombre: 'Camisa', precio: 9000, costo: 4000, stock: 10, categoria: '', publicado: true, ops: 'Rojo, Azul', vars: [] }])), tid);
        await q.goto(t.base + '/apps/caja/'); await q.waitForTimeout(3000);
        await q.click('#prods .prod[data-id="cam"]'); await q.waitForTimeout(300);
        await q.click('.elegir button:has-text("Rojo")'); await q.waitForTimeout(200);
        const tk = await q.evaluate(() => [document.getElementById('ticket').textContent.includes('Camisa (Rojo)'), document.getElementById('ticketTotal').textContent]);
        await q.click('#bCobrar'); await q.waitForTimeout(1500);
        const st = await t.sim.su("select (select stock from public.catalog_items where client_key = 'cam')::int p, (select stock from public.variantes where clave = 'cam' and nombre = 'Rojo')::int r");
        await q.evaluate(() => document.querySelector('[data-v=productos]').click()); await q.waitForTimeout(300);
        await q.evaluate(() => { window.prompt = () => '4'; });
        await q.click('#invLista [data-inv="cam"][data-op="Azul"]'); await q.waitForTimeout(1500);
        const az = await t.sim.su("select stock::int a from public.variantes where clave = 'cam' and nombre = 'Azul'");
        const inv = await q.evaluate(() => document.getElementById('invKpis').textContent);
        ok(tk[0] && tk[1].replace(/\D/g, '') === '9500' && st[0].p === 9 && st[0].r === 4 && az[0].a === 9 && inv.includes('unidades'), 'Órbita: inventario y venta por opción ' + JSON.stringify([tk, st, az, inv]));
        // G10: 🧾 Comprobante de la venta de Caja (botón tras cobrar y 🧾 en el reporte).
        await q.evaluate(() => document.querySelector('[data-v=vender]').click()); await q.waitForTimeout(200);
        const cpC = await q.evaluate(() => { const b = document.getElementById('bComp'); const vis = !b.hidden; b.click(); const d = document.querySelector('.cfx-comp');
          const r = [vis, d && d.querySelector('pre').textContent]; if (d) d.querySelector('[data-a=x]').click(); return r; });
        ok(cpC[0] && /1 × Camisa \(Rojo\) — \$9\.500/.test(cpC[1]) && /Pago: Efectivo/.test(cpC[1]) && !/\(Rojo\) \(Rojo\)/.test(cpC[1]), 'Órbita: comprobante de venta en Caja ' + JSON.stringify(cpC));
        await t.foto('inventario', q);
        // G14 · D21 + D22: cargar muchos productos (lista de WhatsApp, Excel y plantilla del rubro) y publicarlos de una vez.
        await q.evaluate(() => document.querySelector('[data-v=productos]').click()); await q.waitForTimeout(300);
        const [{ n: antes }] = await t.sim.su('select count(*)::int n from public.catalog_items where owner_id = $1', [tid]);
        await q.click('#impPegar'); await q.fill('#impTxt', '*TORTAS:*\nTorta de chocolate - $15.000\nKuchen de manzana\n$8.000\nhttps://wa.me/p/123/56912345678\nVaso 300 ml 1.990\nCamisa 9000');
        await q.click('#impLeer'); await q.waitForTimeout(300);
        const d21 = await q.evaluate(() => [...document.querySelectorAll('#impLista .impF')].map((f) => [f.querySelector('[data-k=ok]').checked, f.querySelector('[data-k=nombre]').value, f.querySelector('[data-k=precio]').value, (f.querySelector('small') || {}).textContent || '']));
        ok(JSON.stringify(d21) === JSON.stringify([[true, 'Torta de chocolate', '15000', 'TORTAS'], [true, 'Kuchen de manzana', '8000', 'TORTAS'], [true, 'Vaso 300 ml', '1990', 'TORTAS'], [false, 'Camisa', '9000', 'TORTAS']]), 'Órbita: D21 lista de WhatsApp ' + JSON.stringify(d21));
        await t.foto('importar', q);
        await q.click('#impAgregar'); await q.waitForTimeout(2500);
        const [im] = await t.sim.su("select count(*)::int n, count(*) filter (where nombre = 'Kuchen de manzana' and precio = 8000 and categoria = 'TORTAS')::int k from public.catalog_items where owner_id = $1", [tid]);
        ok(im.n === antes + 3 && im.k === 1, 'Órbita: D21 agregados y publicados ' + JSON.stringify(im));
        const xl = await q.evaluate(async () => { const b = CFX_RESPALDO.libro({ Hoja: [{ Producto: 'Polera', 'Precio venta': 12990, Categoría: 'Ropa', Stock: 5, Tallas: 'S, M' }, { Producto: 'Gorro', 'Precio venta': '5.990', Categoría: 'Ropa', Stock: '', Tallas: '' }] });
          const f = await CFX_RESPALDO.leer(new File([b], 'lista.xlsx')); const c = CFX_RESPALDO.csv('nombre;precio\n"Té; verde";1.500\n'); return [f, c]; });
        ok(JSON.stringify(xl[0][1]) === '["Polera","12990","Ropa","5","S, M"]' && xl[0].length === 3 && JSON.stringify(xl[1]) === '[["nombre","precio"],["Té; verde","1.500"]]', 'Órbita: D21 leer Excel y CSV ' + JSON.stringify(xl));
        await q.evaluate(() => { window.CFX_RESPALDO.leer = async () => [['Producto', 'Precio venta', 'Categoría', 'Stock', 'Tallas'], ['Polera', '12990', 'Ropa', '5', 'S, M']]; });
        await q.setInputFiles('#impArch', { name: 'l.csv', mimeType: 'text/csv', buffer: Buffer.from('x') }); await q.waitForTimeout(400);
        const ex = await q.evaluate(() => [document.querySelectorAll('#impLista .impF').length, document.querySelector('#impLista small').textContent]);
        ok(ex[0] === 1 && /Ropa · .*S, M · stock 5/.test(ex[1]), 'Órbita: D21 columnas del Excel ' + JSON.stringify(ex));
        await q.click('#impCancelar');
        await q.click('#impPlant'); await q.waitForTimeout(800);
        if (!(await q.locator('#impLista .impF').count())) await q.selectOption('#impRubro', 'Ropa y accesorios');
        await q.waitForTimeout(300);
        const d22 = await q.evaluate(() => [document.querySelectorAll('#impLista .impF').length, document.querySelector('#impLista [data-k=nombre]').value, !document.getElementById('impRubroW').classList.contains('hidden'), document.documentElement.scrollWidth <= innerWidth + 1]);
        ok(d22[0] >= 5 && d22[1] && d22[2] && d22[3], 'Órbita: D22 plantilla del rubro ' + JSON.stringify(d22));
        await t.foto('plantilla', q);
        await q.click('#impCancelar');
        // G10: 🔔 Probar aviso en Mi perfil → Avanzado (lo muestra el service worker, vibra y vuelve a sonar).
        await q.evaluate(() => localStorage.setItem('cfx:tour:orbita-inicio', '1')); await q.goto(t.base + '/'); await q.waitForTimeout(3000);
        await q.evaluate(() => { window.__notif = null; CodeFixInstalar.pushActiva = async () => true; Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
          navigator.serviceWorker.getRegistration = async () => ({ scope: location.origin + '/', showNotification: async (ti, o) => { window.__notif = [ti, o]; } }); });
        await t.sinModales(q); await q.evaluate(() => CFX_PERFIL.abrir('avanzado')); await q.waitForTimeout(1000);
        await q.locator('.cfx-hoja-m [data-pf=probar]').click(); await q.waitForTimeout(800);
        const pa = await q.evaluate(() => window.__notif);
        ok(pa && /prueba/.test(pa[0]) && pa[1].renotify && pa[1].vibrate && /icons\/icon-192\.png$/.test(pa[1].icon), 'Órbita: 🔔 Probar aviso ' + JSON.stringify(pa));
        await t.foto('probar-aviso', q);
        // G11: un solo filtro de texto (seguro.js del núcleo) y keys viejas canjeadas con cfx_key_canjear.
        const g11 = await q.evaluate(async () => [CFX_ESC('<b>"x"</b>'), String(CFX_HTML`<i>${'<s>'}</i>`), CFX_URL('javascript:alert(1)'), Core.esc === undefined ? 'sin' : Core.esc('<'),
          (await Cuenta.rpc('redeem_license', { p_key: 'CFX-NADA' })).error]);
        ok(g11[0] === '&lt;b&gt;&quot;x&quot;&lt;/b&gt;' && g11[1] === '<i>&lt;s&gt;</i>' && g11[2] === '#' && g11[3] === '&lt;' && /no válida/.test(g11[4]), 'Órbita: G11 seguro.js + key ' + JSON.stringify(g11));
        // núcleo 2.48: la key mala queda anotada (antes el raise la deshacía) → al 11º intento se bloquea.
        const g48 = await q.evaluate(async () => { let r; for (let i = 0; i < 10; i++) r = await Cuenta.rpc('redeem_license', { p_key: 'CFX-NADA' }); return r.error; });
        ok(/Demasiados intentos/.test(g48), 'Órbita: núcleo 2.48 límite de keys ' + g48);
        await t.sim.su("delete from public.cfx_registro where accion = 'key fallida'");
        await q.goto(t.base + '/apps/caja/'); await q.waitForTimeout(2500);
        // Equipo con roles: el dueño cambia el rol en Mi equipo; Bodega ve Inventario (sin Vender) y el servidor no la deja vender.
        const eid = '00000000-0000-0000-0000-0000000000eb';
        await t.sim.su('set session_replication_role = replica');
        await t.sim.su("insert into auth.users (id, email) values ($1, 'bodega@x.cl') on conflict do nothing", [eid]);
        await t.sim.su("insert into auth.claves (email, pass) values ('bodega@x.cl', 'clave123') on conflict do nothing");
        await t.sim.su("insert into public.profiles (id, email, role, empresa, negocio_id) values ($1, 'bodega@x.cl', 'equipo', 'Bodeguero', $2) on conflict do nothing", [eid, tid]);
        await t.sim.su('set session_replication_role = origin');
        await t.sim.su("update public.profiles set plan = 'pro' where id = $1", [tid]);
        await q.goto(t.base + '/#equipo'); await q.waitForTimeout(2500);
        await q.evaluate(() => document.getElementById('cEquipo').scrollIntoView());
        await q.selectOption('select[data-rol="bodega@x.cl"]', 'bodega'); await q.waitForTimeout(1200);
        const [{ r: rolBd }] = await t.sim.su("select equipo_rol r from public.profiles where email = 'bodega@x.cl'");
        const { page: w } = await t.nuevo(); await w.goto(t.base + '/'); await w.waitForTimeout(1200);
        await w.fill('input[type=email]:visible', 'bodega@x.cl'); await w.fill('input[type=password]:visible', 'clave123'); await w.press('input[type=password]:visible', 'Enter'); await w.waitForTimeout(3000);
        await w.goto(t.base + '/apps/caja/'); await w.waitForTimeout(3000);
        const bo = await w.evaluate(async () => { const vis = (s) => { const e = document.querySelector(s); return !!e && !e.classList.contains('hidden') && e.offsetParent !== null; };
          let vender = 'ok'; try { await Cuenta.rpc('caja_descontar', { p_items: [{ clave: 'cam', cant: 1 }] }); vender = 'vendió'; } catch (e) { vender = e.message; }
          return [vis('#invCard'), vis('nav.tabs button[data-v="vender"]'), vis('#bGuardarProd'), document.getElementById('invLista').textContent.includes('Camisa'), vender]; });
        await w.evaluate(() => { window.prompt = () => '2'; });
        await w.click('#invLista [data-inv="cam"][data-op="Azul"]'); await w.waitForTimeout(1500);
        const [{ a: az2 }] = await t.sim.su("select stock::int a from public.variantes where clave = 'cam' and nombre = 'Azul'");
        ok(rolBd === 'bodega' && bo[0] && !bo[1] && !bo[2] && bo[3] && /permiso/i.test(bo[4]) && az2 === 11, 'Órbita: equipo con roles (bodega) ' + JSON.stringify([rolBd, bo, az2]));
        await t.foto('equipo-bodega', w);
        // Vitrina también en el catálogo con cuenta: el cliente ve la portada y "Compartir" da el link público.
        const vc = '00000000-0000-0000-0000-0000000000ac';
        await t.sim.su('set session_replication_role = replica');
        await t.sim.su("insert into auth.users (id, email) values ($1, 'clivit@x.cl') on conflict do nothing", [vc]);
        await t.sim.su("insert into auth.claves (email, pass) values ('clivit@x.cl', 'clave123') on conflict do nothing");
        await t.sim.su("insert into public.profiles (id, email, role, empresa, negocio_id, terms_at) values ($1, 'clivit@x.cl', 'client', 'Cliente', $2, now()) on conflict do nothing", [vc, id]);
        await t.sim.su('set session_replication_role = origin');
        const { page: c } = await t.nuevo(); await c.goto(t.base + '/'); await c.waitForTimeout(1200);
        await c.fill('input[type=email]:visible', 'clivit@x.cl'); await c.fill('input[type=password]:visible', 'clave123'); await c.press('input[type=password]:visible', 'Enter'); await c.waitForTimeout(3000);
        await c.goto(t.base + '/apps/catalogo/'); await c.waitForTimeout(2500);
        const vt = await c.evaluate(async () => { const s = document.querySelector('#vProductos #perfil .pf'); if (!s) return null; let u = ''; navigator.share = async (d) => { u = d.url; };
          s.querySelector('[data-pf="compartir"]').click(); await new Promise((r) => setTimeout(r, 200));
          return [s.querySelector('h2').textContent, s.textContent.includes('Ropa hecha a mano'), !!s.querySelector('a[href*="wa.me/56912345678"]'), /\/t\/\?s=vitrina$/.test(u), document.documentElement.scrollWidth <= innerWidth + 1]; });
        ok(vt && vt[0] === 'Vitrina Prueba' && vt.slice(1).every(Boolean), 'Órbita: vitrina en catálogo con cuenta ' + JSON.stringify(vt));
        await t.foto('vitrina-catalogo', c);
        // Vista previa del dueño: productos con los mismos botones que ve el cliente (al tocar solo avisa).
        await q.goto(t.base + '/apps/catalogo/'); await q.waitForTimeout(2500);
        const pv = await q.evaluate(() => [document.querySelectorAll('#grid [data-add]').length, document.querySelectorAll('#grid [data-prev]').length, document.querySelectorAll('#grid .opc-ch').length]);
        await q.click('#grid [data-add]'); await q.waitForTimeout(300);
        const pc = await q.evaluate(() => document.body.textContent.includes('Vista previa'));
        ok(pv.every((n) => n > 0) && pc, 'Órbita: vista previa con botones ' + JSON.stringify([pv, pc]));
        // Mercado Pago automático: el dueño conecta su Access Token; el cliente paga en Mercado Pago y al volver el pedido se aprueba solo.
        await t.sim.su("insert into extensions.http_respuestas (url_like, content) values ('%/users/me', '{\"nickname\":\"TIENDAANA\"}') on conflict do nothing");
        await q.goto(t.base + '/'); await q.waitForTimeout(2500);
        await q.evaluate(() => { document.getElementById('mpTok').value = 'APP_USR-1234567890-abcdefghijklmnopqrstuvwxyz'; document.querySelector('#mpBody [data-mp="guardar"]').click(); }); await q.waitForTimeout(1500);
        const mc = await q.evaluate(() => [document.getElementById('mpBody').textContent.includes('TIENDAANA'), !!document.getElementById('mpOn')]);
        const mk = 'mp' + 'x'.repeat(22);
        const [{ id: mpid }] = await t.sim.su("insert into public.pedidos (negocio_id, invitado_nombre, invitado_tel, lineas, subtotal, total, entrega, estado, retenido_hasta, token) values ($1, 'Rosa', '56911112222', '[{\"nombre\":\"Polera\",\"cant\":1,\"precio\":10000,\"subtotal\":10000}]', 10000, 10000, 'retiro', 'pagando', now() + interval '30 minutes', $2) returning id", [tid, mk]);
        await t.sim.su("insert into extensions.http_respuestas (url_like, content) values ('%/checkout/preferences', $1), ('%/v1/payments/search%', $2) on conflict (url_like) do update set content = excluded.content",
          [JSON.stringify({ init_point: t.base + '/r/?t=' + mk + '&payment_id=99&status=approved' }), JSON.stringify({ results: [{ id: 99, status: 'approved', external_reference: mpid, transaction_amount: 10000, currency_id: 'CLP' }] })]);
        const { page: m } = await t.nuevo(); await m.goto(t.base + '/r/?t=' + mk); await m.waitForTimeout(2000);
        const mv = await m.evaluate(() => [!document.getElementById('rowMp').classList.contains('hidden'), document.getElementById('rowComp').classList.contains('hidden'), document.getElementById('bMp').textContent]);
        await t.foto('mp-pagar', m);
        await m.click('#bMp'); await m.waitForTimeout(3500);
        const [md] = await t.sim.su("select estado, mp_pago, (select count(*) from public.notifications where target_id = $2 and title like '%Mercado Pago%')::int n, (select content from extensions.http_log where uri like '%preferences' order by n desc limit 1) body from public.pedidos where id = $1", [mpid, tid]);
        const me = await m.evaluate(() => [document.getElementById('estado').textContent, location.search]);
        ok(mc.every(Boolean) && mv[0] && mv[1] && /Mercado Pago/.test(mv[2]) && md.estado === 'preparando' && md.mp_pago === '99' && md.n === 1 &&
          JSON.parse(md.body).external_reference === mpid && JSON.parse(md.body).items[0].unit_price === 10000 && /Preparando/.test(me[0]) && !/payment_id/.test(me[1]),
          'Órbita: Mercado Pago automático ' + JSON.stringify([mc, mv, md.estado, md.mp_pago, md.n, me]));
        await t.foto('mp-pagado', m);
        // Boleta SII: el dueño guarda sus datos (manual) y anota el folio; el cliente lo ve. Luego automática con OpenFactura (cada 5 min).
        await q.goto(t.base + '/#boleta'); await q.waitForTimeout(2500);
        await q.evaluate(() => { const f = (i, v) => { document.getElementById(i).value = v; }; f('bRut', '76.795.561-8'); f('bRazon', 'Tienda Ana SpA'); f('bGiro', 'Venta de ropa'); f('bDir', 'Calle 1'); f('bComuna', 'Santiago');
          document.querySelector('#boletaBody [data-bo="guardar"]').click(); }); await q.waitForTimeout(1500);
        await q.goto(t.base + '/apps/pedidos/?f=activos'); await q.waitForTimeout(2500);
        await q.evaluate(() => { window.prompt = () => '1234'; });
        await q.click('[data-bol="' + mpid + '"]'); await q.waitForTimeout(1500);
        const bq = await q.evaluate(() => document.getElementById('lista').textContent.includes('Boleta N° 1234'));
        await m.reload(); await m.waitForTimeout(2500);
        const bm = await m.evaluate(() => document.getElementById('boleta').textContent);
        await t.sim.su("insert into extensions.http_respuestas (url_like, content) values ('%haulmer.com/v2/dte/document', '{\"FOLIO\":555,\"SELF_SERVICE\":{\"url\":\"https://of.cl/b/555\"}}') on conflict (url_like) do update set content = excluded.content");
        await q.goto(t.base + '/#boleta'); await q.waitForTimeout(2500);
        await q.evaluate(() => { document.querySelector('[name=bModo][value=openfactura]').click(); document.getElementById('bKey').value = '928e15a2d14d4a6292345f04960f4bd3';
          document.querySelector('#boletaBody [data-bo="guardar"]').click(); }); await q.waitForTimeout(1500);
        const [{ id: bid }] = await t.sim.su("insert into public.pedidos (negocio_id, invitado_nombre, invitado_tel, lineas, subtotal, descuento, total, entrega, estado, pagado_at, token) values ($1, 'Rosa', '56911112222', '[{\"nombre\":\"Polera\",\"cant\":2,\"precio\":5000,\"subtotal\":10000}]', 10000, 1000, 9000, 'retiro', 'preparando', now(), $2) returning id", [tid, 'bo' + 'x'.repeat(22)]);
        const [{ n: bn }] = await t.sim.su('select public.boleta_pendientes() n');
        const [bd] = await t.sim.su("select boleta_folio f, boleta_url u, (select content from extensions.http_log where uri like '%haulmer%' order by n desc limit 1) body, (select rut from public.boleta_cuentas where owner_id = $2) rut from public.pedidos where id = $1", [bid, tid]);
        const dte = JSON.parse(bd.body).dte;
        ok(bq && /1234/.test(bm) && /Tienda Ana SpA/.test(bm) && bn >= 1 && bd.f === '555' && bd.u === 'https://of.cl/b/555' && bd.rut === '76795561-8' &&
          dte.Encabezado.IdDoc.TipoDTE === 39 && dte.Encabezado.Totales.MntTotal === 9000 && dte.Encabezado.Totales.MntNeto + dte.Encabezado.Totales.IVA === 9000 && dte.DscRcgGlobal[0].ValorDR === 1000,
          'Órbita: boleta SII ' + JSON.stringify([bq, bm, bn, bd.f, bd.u, bd.rut]));
        await t.foto('boleta', m);
        // G18 · G35-G37: Ajustes → 📲 Vender en redes. Links listos, catálogo y (Pro) avisos firmados de cada pedido a otro sistema.
        const [g18pl] = await t.sim.su('select plan, pro_until from public.profiles where id = $1', [tid]);
        await t.sim.su("update public.profiles set plan = 'free', pro_until = null where id = $1", [tid]);
        await q.goto(t.base + '/#redes'); await q.reload(); await q.waitForTimeout(2500);
        const g18u0 = await q.evaluate(() => { const b = document.getElementById('redesBody'); return [!!b.offsetParent, /t\/\?s=/.test(b.querySelector('input').value), [...b.querySelectorAll('input')].some((i) => /\/t\/feed\?s=/.test(i.value)),
          !document.getElementById('whUrl'), !!b.querySelector('[data-rd-ir="premium"]'), document.documentElement.scrollWidth <= innerWidth + 1]; });
        await t.sim.su("update public.profiles set plan = 'pro', pro_until = null where id = $1", [tid]);
        await t.sim.su("insert into extensions.http_respuestas (url_like, status, content) values ('%hooks.ejemplo.cl%', 200, 'ok') on conflict (url_like) do update set status = 200, content = 'ok'");
        await q.reload(); await q.waitForTimeout(2500);
        await q.evaluate(() => { document.getElementById('whUrl').value = 'http://127.0.0.1/x'; document.querySelector('#redesBody [data-rd="guardar"]').click(); }); await q.waitForTimeout(1200);
        const g18malo = await q.evaluate(() => !document.getElementById('whSec'));
        await q.evaluate(() => { document.getElementById('whUrl').value = 'https://hooks.ejemplo.cl/orbita'; document.querySelector('#redesBody [data-rd="guardar"]').click(); }); await q.waitForTimeout(1500);
        await q.evaluate(() => document.querySelector('#redesBody [data-rd="probar"]').click()); await q.waitForTimeout(1500);
        const g18u1 = await q.evaluate(() => [document.getElementById('whSec').value, document.getElementById('redesBody').textContent.includes('Prueba'), document.getElementById('redesBody').textContent.includes('Funcionando')]);
        await t.foto('redes', q);
        await q.evaluate(() => document.getElementById('whUrl').scrollIntoView({ block: 'start' })); await q.waitForTimeout(300); await t.foto('redes-avisos', q);
        const [{ id: g18id }] = await t.sim.su("insert into public.pedidos (negocio_id, invitado_nombre, invitado_tel, lineas, subtotal, total, entrega, estado, token) values ($1, 'Rosa', '56911112222', '[{\"nombre\":\"Polera\",\"cant\":2,\"precio\":5000,\"subtotal\":10000,\"clave\":\"p1\"}]', 10000, 10000, 'retiro', 'recibido', $2) returning id", [tid, 'wh' + 'x'.repeat(22)]);
        await t.sim.su("update public.pedidos set estado = 'preparando' where id = $1", [g18id]);
        await t.sim.su("update public.pedidos set nota = 'sin cambio de estado' where id = $1", [g18id]);
        const [{ n: g18n }] = await t.sim.su('select public.webhook_enviar() n');
        const g18log = await t.sim.su("select content, headers from extensions.http_log where uri = 'https://hooks.ejemplo.cl/orbita' order by n");
        const g18ev = g18log.map((l) => JSON.parse(l.content)).filter((x) => x.evento !== 'ping');
        const g18firma = g18log.every((l) => { const m = /X-CodeFix-Firma,\\?"?t=(\d+),v1=([0-9a-f]{64})/.exec(l.headers);
          return m && require('crypto').createHmac('sha256', g18u1[0]).update(m[1] + '.' + l.content).digest('hex') === m[2] && l.headers.includes('X-CodeFix-Id,' + JSON.parse(l.content).id); });
        // Si la URL falla, queda para reintentar (no se pierde) y el pedido sigue igual.
        await t.sim.su("update extensions.http_respuestas set status = 500 where url_like = '%hooks.ejemplo.cl%'");
        await t.sim.su("update public.pedidos set estado = 'listo' where id = $1", [g18id]);
        await t.sim.su('select public.webhook_enviar()');
        const [g18f] = await t.sim.su("select v.estado, v.intentos, v.proximo > now() + interval '50 seconds' p, w.fallos, w.activo, (select estado from public.pedidos where id = $2) pe from public.webhook_envios v join public.webhooks w on w.owner_id = v.owner_id where v.owner_id = $1 and v.cuerpo #>> '{pedido,estado}' = 'listo'", [tid, g18id]);
        const [g18s] = await t.sim.su("select has_function_privilege('anon', 'public.conexiones_estado()', 'execute') a, has_function_privilege('authenticated', 'public.webhook_enviar(uuid)', 'execute') e, has_function_privilege('authenticated', 'public.webhook_guardar(text, boolean)', 'execute') g, (select count(*) from cron.job where jobname = 'webhooks')::int c");
        ok(g18u0.every(Boolean) && g18malo && /^whsec_[0-9a-f]{48}$/.test(g18u1[0]) && g18u1[1] && g18u1[2] && g18n === 2 && g18ev.length === 2 &&
          g18ev[0].evento === 'pedido.creado' && g18ev[1].evento === 'pedido.estado' && g18ev[1].pedido.estado === 'preparando' && g18ev[1].pedido.estado_anterior === 'recibido' &&
          g18ev[0].pedido.lineas[0].cantidad === 2 && g18ev[0].pedido.cliente.telefono === '56911112222' && g18ev[0].tienda.nombre === 'Tienda Ana' && g18firma &&
          g18f && g18f.estado === 'pendiente' && g18f.intentos === 1 && g18f.p && g18f.fallos === 1 && g18f.activo && g18f.pe === 'listo' && !g18s.a && !g18s.e && g18s.g && g18s.c === 1,
          'Órbita G18: avisos firmados de cada pedido a otro sistema (webhooks) con reintento ' + JSON.stringify([g18u0, g18malo, g18u1.slice(1), g18n, g18ev.map((x) => x.evento), g18firma, g18f, g18s]));
        await q.emulateMedia({ colorScheme: 'dark' }); await q.reload(); await q.waitForTimeout(2500); await t.foto('redes-oscuro', q); await q.emulateMedia({ colorScheme: 'light' });
        await t.sim.su('delete from public.webhooks where owner_id = $1', [tid]);
        await t.sim.su('update public.profiles set plan = $2, pro_until = $3 where id = $1', [tid, g18pl.plan, g18pl.pro_until]);
        // G19 · 🧩 Módulos de pago por negocio: con la venta prendida, la tienda Free ve packs y sueltos, prueba un pack 7 días,
        // compra un módulo (Mi equipo) con transferencia y, al aprobarlo, se activa solo ese módulo. Las funciones del Pro pasan a ser módulos.
        const [g19pg] = await t.sim.su("select valor v from public.cfx_config where clave = 'pagos'");
        await t.sim.su("update public.cfx_config set valor = jsonb_set(valor, '{transferencia,numero}', '\"123456\"') where clave = 'pagos'");
        await t.sim.su("update public.profiles set plan = 'free', pro_until = null where id = $1", [tid]);
        await t.sim.su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
        await t.sim.su('delete from public.cfx_modulos_negocio where negocio = $1', [tid]); await t.sim.su('delete from public.cfx_modulos_pruebas where negocio = $1', [tid]);
        const [g19w0] = await t.sim.su("select set_config('request.jwt.claim.sub', $1, false), public.conexiones_estado() c, public.mis_modulos($1::uuid) m", [tid]); await t.sim.su("select set_config('request.jwt.claim.sub', '', false)");
        await q.goto(t.base + '/#modulos'); await q.reload(); await q.waitForTimeout(3000);
        const g19u0 = await q.evaluate(() => { const b = document.getElementById('modTienda'); return [!!b.offsetParent, b.querySelectorAll('.cfxm-pack').length, !!b.querySelector('.cfxm-pack.top .cfxm-tag'),
          b.querySelectorAll('.cfxm-mod').length, !!b.querySelector('[data-probar="crecer"]'), /\$990\/mes/.test(b.textContent), document.documentElement.scrollWidth <= innerWidth + 1, Cuenta.puede('estadisticas')]; });
        await t.foto('modulos', q);
        await q.evaluate(() => document.querySelector('#modTienda [data-probar="crecer"]').click()); await q.waitForTimeout(1500);
        await q.evaluate(() => { document.querySelector('dialog.cfxd .cfxd-x').click(); return Cuenta.rpc('cfx_modulo_probar', { p_item: 'crecer' }); }); await q.reload(); await q.waitForTimeout(4500);  // G25: sin botón gratis (la prueba sigue existiendo en la base)
        const g19u1 = await q.evaluate(() => [Cuenta.puede('estadisticas'), Cuenta.puede('equipo'), !!document.querySelector('#modTienda [data-probar="crecer"]'), !!document.querySelector('#modTienda [data-probar="completo"]'),
          document.getElementById('modTienda').textContent.includes('Prueba gratis hasta')]);
        await q.evaluate(() => document.querySelector('#modTienda [data-per="a"]').click()); await q.waitForTimeout(300);
        const g19an = await q.evaluate(() => /\$9\.900\/año/.test(document.getElementById('modTienda').textContent));
        await q.evaluate(() => document.querySelector('#modTienda [data-per="m"]').click());
        await q.evaluate(() => document.querySelector('#modTienda [data-comprar="equipo"]').click()); await q.waitForTimeout(1500);
        const g19d = await q.evaluate(() => { const d = document.querySelector('dialog.cfx-pago'); return [d.querySelector('h2').textContent, d.querySelectorAll('.cp-plan').length, (d.querySelector('#cpMonto') || {}).textContent, !d.querySelector('#cpCupon'), !d.querySelector('#cpKey')]; });
        await t.foto('modulos-pagar', q);
        await q.setInputFiles('#cpFoto', __dirname + '/comprobante.png'); await q.waitForTimeout(1500);
        await q.evaluate(() => document.querySelector('dialog.cfx-pago [data-enviar]').click()); await q.waitForTimeout(1500);
        const [g19p] = await t.sim.su("select id, producto, periodo, monto, rol from public.cfx_pagos where cuenta = $1 and producto is not null order by creado desc limit 1", [tid]);
        // El administrador aprueba (aquí una cuenta admin de prueba): se activa Mi equipo 30 días y no el Premium.
        const g19adm = await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'clave123');
        await t.sim.su("update public.profiles set role = 'admin' where id = $1", [g19adm.id]); await t.sim.su('update auth.users set email_confirmed_at = now() where id = $1', [g19adm.id]);
        const [g19r] = await t.sim.su("select set_config('request.jwt.claim.sub', $1, false), public.cfx_pago_resolver($2, true) r", [g19adm.id, g19p.id]); await t.sim.su("select set_config('request.jwt.claim.sub', '', false)");
        const [g19e] = await t.sim.su("select (select origen from public.cfx_modulos_negocio where negocio = $1 and modulo = 'equipo') o, round(extract(epoch from (select hasta from public.cfx_modulos_negocio where negocio = $1 and modulo = 'equipo') - now()) / 86400)::int d, " +
          "public.is_pro($1) pro, public.limite_equipo($1) eq, public.pro_o_modulo($1, 'webhooks') wh, (select count(*) from public.cfx_modulos_negocio where negocio = $1 and origen = 'prueba')::int pr", [tid]);
        await q.reload(); await q.waitForTimeout(2500);
        const g19u2 = await q.evaluate(() => [Cuenta.puede('equipo'), document.getElementById('modTienda').textContent.includes('Activo hasta')]);
        await q.emulateMedia({ colorScheme: 'dark' }); await q.reload(); await q.waitForTimeout(2500); await t.foto('modulos-oscuro', q); await q.emulateMedia({ colorScheme: 'light' });
        // Seguridad: anon no ve la tienda de módulos ni puede regalar; un cliente no es negocio.
        const [g19s] = await t.sim.su("select has_function_privilege('anon', 'public.cfx_modulos_tienda()', 'execute') a, has_function_privilege('authenticated', 'public.cfx_modulos_dar(uuid, text, int, text)', 'execute') d, " +
          "has_function_privilege('anon', 'public.cfx_modulo_regalar(text, text, int)', 'execute') r, public.cfx_negocio_cuenta($1) is null c", [c2]);
        await t.sim.su("update public.cfx_config set valor = valor || '{\"activo\": false}' where clave = 'modulos_venta'");
        await t.sim.su('update public.cfx_config set valor = $1 where clave = $2', [g19pg.v, 'pagos']);
        await t.sim.su('delete from public.cfx_modulos_negocio where negocio = $1', [tid]); await t.sim.su('delete from public.cfx_pagos where producto is not null');
        await t.sim.su('update public.profiles set plan = $2, pro_until = $3 where id = $1', [tid, g18pl.plan, g18pl.pro_until]);
        await t.sim.su('delete from auth.users where id = $1', [g19adm.id]);
        ok(!g19w0.c.pro && g19w0.c.modulo && g19w0.m.estadisticas === false && g19u0.slice(0, 3).join() === 'true,3,true' && g19u0[3] >= 8 && g19u0[4] && g19u0[5] && g19u0[6] && !g19u0[7] &&
          g19u1[0] && !g19u1[1] && !g19u1[2] && g19u1[3] && g19u1[4] && g19an && /Mi equipo/.test(g19d[0]) && g19d[1] === 2 && /990/.test(g19d[2]) && g19d[3] && g19d[4] &&
          g19p && g19p.producto === 'equipo' && g19p.periodo === 'mensual' && g19p.monto === 990 && g19r.r.estado === 'aprobado' && g19e.o === 'pago' && g19e.d === 30 && !g19e.pro && g19e.eq > 0 && !g19e.wh && g19e.pr >= 5 &&
          g19u2.every(Boolean) && !g19s.a && !g19s.d && !g19s.r && g19s.c,
          'Órbita G19: 🧩 módulos de pago por negocio (prueba, compra y activación) ' + JSON.stringify([g19w0.m && g19w0.m.estadisticas, g19u0, g19u1, g19an, g19d, g19p, g19r.r, g19e, g19u2, g19s]));
      }
      if (app === 'saas') {
        // Mis datos y privacidad (núcleo): consentimiento de ofertas, copia de los datos y solicitud de rectificación; el admin responde y registra una brecha.
        await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123'); await t.sim.crearUsuario('titular@x.cl', 'clave123');
        const { page: u } = await t.nuevo(); await u.goto(t.base + '/'); await u.waitForTimeout(800);
        await u.fill('input[type=email]', 'titular@x.cl'); await u.fill('input[type=password]', 'clave123'); await u.press('input[type=password]', 'Enter'); await u.waitForTimeout(3000);
        await t.sinModales(u); await u.evaluate(() => CFX_LEGAL.misDatos()); await u.waitForTimeout(1200);
        await u.click('dialog [data-c="ofertas"]'); await u.waitForTimeout(800);
        const [dl] = await Promise.all([u.waitForEvent('download'), u.click('dialog [data-bajar]')]);
        const copia = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
        await u.click('dialog [data-t="rectificacion"]'); await u.fill('dialog [data-txt]', 'Mi nombre es Ana Pérez'); await u.click('dialog [data-enviar]'); await u.waitForTimeout(1200);
        const ul = await u.evaluate(() => document.querySelector('dialog [data-lista]').textContent);
        await t.foto('mis-datos', u);
        // Núcleo 2.53: después de pasar por Más, Hoy no queda con "Cuenta y ayuda" pegado abajo (antes se pegaba a <main>).
        await u.route(/rpc\/mi_uso/, async (r) => { await new Promise((z) => setTimeout(z, 1500)); r.fallback(); });  // red lenta como en el teléfono
        await u.goto(t.base + '/app/#hoy'); await u.waitForTimeout(2500); await t.sinModales(u);
        const cg0 = await u.evaluate(() => document.querySelectorAll('.cfx-cuenta-g').length);
        await u.evaluate(() => CM.ir('mas')); await u.waitForTimeout(1000);
        const cgL = await u.evaluate(() => document.querySelectorAll('.cfx-cuenta-g').length); await u.waitForTimeout(1500);
        const cgM = await u.evaluate(() => [document.querySelectorAll('#v-mas .cfx-mmas').length, document.querySelectorAll('.cfx-cuenta-g').length]);
        await u.evaluate(() => CM.ir('hoy')); await u.waitForTimeout(1500);
        const cgH = await u.evaluate(() => [...document.querySelectorAll('.cfx-cuenta-g')].filter((x) => x.offsetParent).length);
        ok(cg0 === 0 && cgL === 0 && cgM[0] === 1 && cgM[1] === 0 && cgH === 0, 'CM: Hoy sin menú de cuenta extra tras volver de Más ' + JSON.stringify([cg0, cgL, cgM, cgH]));
        await p.goto(t.base + '/'); await p.fill('input[type=email]', 'juanjosuecastilloloyola@gmail.com'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
        await p.waitForURL(/admin/); await p.waitForTimeout(800); await t.sinModales();
        await p.goto(t.base + '/admin/#control'); await p.waitForTimeout(3000); await t.sinModales();
        await p.click('[data-s=datos]'); await p.waitForTimeout(1500);
        const vio = await p.evaluate(() => document.getElementById('ctlCuerpo').textContent.includes('titular@x.cl'));
        await p.click('[data-dr=responder]'); await p.fill('#drT', 'Listo, lo corregimos.'); await p.click('#drG'); await p.waitForTimeout(1200);
        await p.click('[data-br=nueva]'); await p.fill('#brD', 'Acceso indebido de prueba'); await p.fill('#brN', '3'); await p.click('#brG'); await p.waitForTimeout(1200);
        await p.click('[data-br=avisar]'); await p.click('#baG'); await p.waitForTimeout(1200);
        await t.foto('control-datos');
        const [dd] = await t.sim.su("select (select si from cfx_consent where tipo = 'ofertas')::text c, (select estado from cfx_derechos where tipo = 'rectificacion') r, (select count(*) from cfx_derechos where tipo = 'portabilidad')::int po, (select avisados from cfx_brechas limit 1) b, (select count(*) from notificaciones where titulo like '%solicitud de datos%')::int n");
        // A7: Control → 🛡️ Seguridad y secret key de Turnstile guardada desde 🤖 Humano.
        await p.click('[data-s=seguridad]'); await p.waitForTimeout(1500);
        const sg = await p.evaluate(() => document.getElementById('ctlCuerpo').textContent);
        await t.foto('control-seguridad');
        await p.click('[data-s=humano]'); await p.waitForTimeout(1000);
        await p.uncheck('#huTodas'); await p.fill('#huK', '0x4AAAAAAAprueba'); await p.fill('#huS', '0x4AAAAAAAsecreto'); await p.click('#huG'); await p.waitForTimeout(1500);
        const [hs] = await t.sim.su("select (select valor from cfx_secretos where clave = 'turnstile') s, public.cfx_humano() h");
        // G8: Control → 🩺 Salud muestra ping, respaldo y errores, y se borran.
        await t.sim.su("select public.cfx_salud_marca('respaldo', '{\"mb\": 1.5, \"tablas\": 40}')");
        await p.click('[data-s=salud]'); await p.waitForTimeout(1500);
        const sl = await p.evaluate(() => document.getElementById('ctlCuerpo').textContent);
        await t.foto('control-salud');
        await p.click('#ctlCuerpo [data-er]:not([data-er=todos])'); await p.waitForTimeout(1200);
        const [sb] = await t.sim.su("select count(*)::int n from cfx_errores");
        // G15 · E25: 📊 Analítica (lo calculó Python en la base del CM) y "Análisis nocturno" en 🩺 Salud.
        require('child_process').execSync('python3 ' + __dirname + '/../analisis/analisis.py "host=/var/tmp/pgb port=54329 user=postgres dbname=' + db + '"', { env: { ...process.env, PATH: '/usr/lib/postgresql/16/bin:' + process.env.PATH } });
        await p.click('[data-s=salud]'); await p.waitForTimeout(1500);
        const sl2 = await p.evaluate(() => document.getElementById('ctlCuerpo').textContent);
        await p.goto(t.base + '/admin/#analitica'); await p.waitForTimeout(3500); await t.sinModales();
        const anl = await p.evaluate(() => [document.getElementById('v-analitica').textContent, document.querySelectorAll('#v-analitica [data-an]').length, document.querySelectorAll('#anDet svg rect').length]);
        await t.foto('cm_analitica');
        ok(/Análisis nocturno: recién/.test(sl2) && /Analítica/.test(anl[0]) && /Cuentas nuevas por día/.test(anl[0]) && /Activas 7 d/.test(anl[0]) && /cuentas entró esta semana/.test(anl[0]) && anl[1] >= 1 && anl[2] >= 60,
          'CM: 📊 Analítica + análisis en 🩺 Salud ' + JSON.stringify([anl[1], anl[2]]));
        ok(/Salud de/.test(sl) && /Ping anti-pausa/.test(sl) && /1.5 MB/.test(sl) && /prueba G8 error/.test(sl) && sb.n === 1, 'CM: Control → Salud ' + JSON.stringify(sb));
        ok(/Seguridad de la app/.test(sg) && /Tablas sin reglas \(RLS\): ninguna/.test(sg) && hs.s === '0x4AAAAAAAsecreto' && hs.h.invitados === true && !('secreto' in hs.h), 'CM: Control → Seguridad y secret key ' + JSON.stringify(hs.h));
        ok(copia.cuenta.email === 'titular@x.cl' && copia.consentimientos.ofertas === true && Object.keys(copia.datos).length > 0 && /Corregir un dato/.test(ul) && vio &&
          dd.c === 'true' && dd.r === 'respondida' && dd.po === 1 && dd.b >= 1 && dd.n === 1, 'Mis datos y privacidad + Control → Datos ' + JSON.stringify([Object.keys(copia.datos), dd]));
        // 🧪 Probar: si la rama "pruebas" de un repo trae una versión más nueva, Mis aplicaciones muestra el link a su vista previa.
        const DIR = { SaaS: 'saas', Emprendedor: 'emprendedor', Aplicaciones: 'Aplicaciones', Barberia: 'barberia', Taller: 'taller', Estacionamiento: 'estacionamiento', Contenido: 'contenido' };
        await p.route(/raw\.githubusercontent\.com\/CodeFixService\//, (r) => { const [, repo, rama, ruta] = new URL(r.request().url()).pathname.match(/^\/CodeFixService\/([^/]+)\/([^/]+)\/(.+)$/);
          if (rama === 'pruebas') return repo === 'Aplicaciones' && ruta === 'version.json' ? r.fulfill({ contentType: 'application/json', body: '{"version":"99.1","notas":"prueba rama"}' }) : r.fulfill({ status: 404, body: '' });
          const f = '/home/user/' + DIR[repo] + '/' + ruta; return fs.existsSync(f) ? r.fulfill({ body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); });
        // G26: ramas de prueba apagadas → Apps sin 🧪 Probar y 🧹 Limpiar y abrir en Resumen → Empresas (no en el CM).
        await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(5000); await t.sinModales();
        const g26 = await p.evaluate(() => ({ probar: document.querySelectorAll('[data-a=probar]').length, enApps: document.querySelectorAll('#v-apps a[href*="cfx-cero"]').length }));
        await p.goto(t.base + '/admin/#resumen'); await p.waitForTimeout(5000); await t.sinModales();
        Object.assign(g26, await p.evaluate(() => ({ limpia: (document.querySelector('[data-emp=barberia] a[data-limpia]') || {}).href, cm: !!document.querySelector('[data-emp=cm] a[href*="cfx-cero"]'), ancho: document.documentElement.scrollWidth <= innerWidth + 1 })));
        await t.foto('cm_resumen_limpiar');
        ok(g26.probar === 0 && g26.enApps === 0 && g26.limpia === 'https://barberia.juanjosuecastilloloyola.workers.dev/?cfx-limpio=1&cfx-cero=1' && !g26.cm && g26.ancho, 'CM G26: 🧹 Limpiar y abrir en Resumen, ramas apagadas ' + JSON.stringify(g26));
        await p.evaluate(() => localStorage.setItem('cm-ramas', '1'));
        await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(5000); await t.sinModales();
        const pr = await p.evaluate(() => ({ h: (document.querySelector('[data-app=aplicaciones] [data-a=probar]') || {}).href, t: (document.querySelector('[data-app=aplicaciones] [data-prueba]') || {}).textContent,
          otras: document.querySelectorAll('[data-a=probar]').length, bd: !!document.querySelector('[data-app=cm] [data-a=bd]'),
        }));
        await t.foto('apps-probar');
        ok(pr.h === 'https://pruebas-aplicaciones.juanjosuecastilloloyola.workers.dev/?cfx-limpio=99.1&cfx-cero=1' && /v99\.1/.test(pr.t) && pr.otras === 1 && pr.bd, 'CM: Mis aplicaciones (cm-ramas=1) → 🧪 Probar (rama pruebas, abre limpio) y ⚡ Actualizar base siempre ' + JSON.stringify(pr));
        // ✅ Confirmar: deshabilitado hasta abrir 🧪 Probar; con el token guardado, la base del CM mueve main a pruebas en GitHub (simulado con stub.sql).
        await t.sim.su("insert into extensions.http_respuestas (url_like, content) values ('%/repos/CodeFixService/Aplicaciones/git/ref/heads/main', '{\"object\":{\"sha\":\"aaa111\"}}'), ('%/repos/CodeFixService/Aplicaciones/git/ref/heads/pruebas', '{\"object\":{\"sha\":\"bbb222\"}}'), ('%/repos/CodeFixService/Aplicaciones/git/refs/heads/main', '{\"ref\":\"refs/heads/main\"}')");
        await p.click('#appsGh'); await p.waitForTimeout(600); await p.fill('dialog #ghT', 'github_pat_prueba'); await p.click('dialog [data-si]'); await p.waitForTimeout(1200);
        const antes = await p.evaluate(() => document.querySelector('[data-app=aplicaciones] [data-a=pconf]').disabled);
        await p.evaluate(() => document.addEventListener('click', (ev) => { if (ev.target.closest('[data-a=probar]')) ev.preventDefault(); }));
        await p.click('[data-app=aplicaciones] [data-a=probar]'); await p.waitForTimeout(600);
        const despues = await p.evaluate(() => document.querySelector('[data-app=aplicaciones] [data-a=pconf]').disabled);
        await p.click('[data-app=aplicaciones] [data-a=pconf]'); await p.waitForTimeout(600); await p.click('dialog [data-si]'); await p.waitForTimeout(2500);
        const [gh] = await t.sim.su("select (select valor from cfx_secretos where clave = 'github') tk, (select count(*) from extensions.http_log where method = 'PATCH' and uri like '%Aplicaciones/git/refs/heads/main' and content like '%bbb222%' and content like '%false%')::int pm, has_function_privilege('anon', 'public.cm_pruebas(text, text)', 'execute') an, has_function_privilege('authenticated', 'public.gh_api(text, text, jsonb)', 'execute') au");
        await t.foto('apps-confirmar');
        ok(antes && !despues && gh.tk === 'github_pat_prueba' && gh.pm === 1 && !gh.an && !gh.au, 'CM: ✅ Confirmar tras 🧪 Probar (pruebas → main) ' + JSON.stringify([antes, despues, gh]));
        // G12 · C19: 🧩 Módulos en la tarjeta de una app que los tiene (aquí el CM con un gancho de prueba): apagar el chat.
        await t.sim.su("create or replace function public.cfx_modulos_app() returns text[] language sql immutable as $$ select array['chat'] $$");
        await p.click('[data-app=cm] [data-a=rec]'); await p.waitForTimeout(2500);
        await p.click('[data-app=cm] [data-a=mod]'); await p.waitForTimeout(600);
        const md = await p.evaluate(() => [document.querySelector('dialog #mods').textContent, document.querySelector('dialog [data-m=chat]').checked]);
        await p.click('dialog [data-m=chat]'); await p.waitForTimeout(1500);
        const [mc] = await t.sim.su("select public.cfx_modulos() m, (select count(*) from cfx_registro where accion = 'módulo')::int r");
        await t.foto('cm_modulos');
        // G19: 💰 vender módulos por negocio desde el CM: prender la venta, poner precio, guardar y regalar el chat 30 días a una cuenta.
        await p.evaluate(() => [...document.querySelectorAll('dialog')].pop().querySelector('#vOn').click()); await p.waitForTimeout(1500);
        await p.evaluate(() => { const d = [...document.querySelectorAll('dialog')].pop(); d.querySelector('[data-pr=chat]').value = '1490'; d.querySelector('#vGuardar').click(); }); await p.waitForTimeout(1500);
        await p.evaluate(() => { const d = [...document.querySelectorAll('dialog')].pop(); d.querySelector('#rEmail').value = 'juanjosuecastilloloyola@gmail.com'; d.querySelector('#rItem').value = 'chat'; d.querySelector('#rDias').value = '30'; d.querySelector('#rOk').click(); });
        await p.waitForTimeout(1500);
        const g19c = await p.evaluate(() => { const d = [...document.querySelectorAll('dialog')].pop(); const li = (d.querySelector('ul.list') || {}).textContent || ''; return [/Negocios con módulos/.test(d.textContent), /chat\s*\S*\s*hasta/.test(li), /Básico/.test(d.textContent), document.documentElement.scrollWidth <= innerWidth + 1]; });
        const [g19cm] = await t.sim.su("select (select valor from cfx_config where clave = 'modulos_venta') v, (select count(*) from cfx_modulos_negocio where modulo = 'chat' and origen = 'regalo')::int n");
        await t.foto('cm_modulos_venta');
        await t.sim.su("update cfx_config set valor = valor || '{\"activo\": false}' where clave = 'modulos_venta'"); await t.sim.su('delete from cfx_modulos_negocio');
        ok(g19c.every(Boolean) && g19cm.v.activo && g19cm.v.precios.chat === 1490 && g19cm.n === 1, 'CM G19: 💰 vender módulos (precio, guardar y regalar) ' + JSON.stringify([g19c, g19cm.v.precios, g19cm.n]));
        await t.sim.su('drop function public.cfx_modulos_app()');
        ok(/Chat/.test(md[0]) && md[1] && mc.m.chat === false && mc.r === 1, 'CM: 🧩 Módulos apaga el chat de una app ' + JSON.stringify([md, mc]));
        // G13 · C18: 🧹 Respaldo y limpieza junta lo del núcleo (🌙 auto) con lo de la app, y la limpieza automática se apaga y se prende.
        await t.sim.su("insert into cfx_registro (quien, accion, detalle, creado) values ('x', 'viejo', 'G13', now() - interval '200 days')");
        await p.evaluate(() => MisApps.limpieza(MisApps.APPS.find((x) => x.id === 'cm'))); await p.waitForTimeout(2500);
        const lm = await p.evaluate(() => { const d = [...document.querySelectorAll('dialog')].pop(); return [d.textContent, d.querySelector('[data-auto]').checked, !!d.querySelector('[data-c=n_registro]:not([disabled])')]; });
        await t.foto('cm_limpieza');
        await p.evaluate(() => [...document.querySelectorAll('dialog')].pop().querySelector('[data-auto]').click()); await p.waitForTimeout(1200);
        const [la] = await t.sim.su("select (select valor #>> '{}' from cfx_config where clave = 'limpieza_auto') v, public.cfx_limpieza_auto() n, (select count(*) from cfx_registro where accion = 'viejo')::int q");
        await t.sim.su("update cfx_config set valor = 'true' where clave = 'limpieza_auto'");
        const [lb] = await t.sim.su("select public.cfx_limpieza_auto() n, has_function_privilege('authenticated', 'public.cfx_limpieza_auto()', 'execute') au");
        [{ q: lb.q }] = await t.sim.su("select count(*)::int q from cfx_registro where accion = 'viejo'");
        await p.evaluate(() => [...document.querySelectorAll('dialog')].pop().close());
        ok(/Limpieza automática cada noche/.test(lm[0]) && /auto/.test(lm[0]) && /Carritos abandonados/.test(lm[0]) && lm[1] && lm[2] && la.v === 'false' && la.n === 0 && la.q === 1 && lb.n >= 1 && lb.q === 0 && !lb.au,
          'CM: 🧹 limpieza del núcleo + 🌙 automática (apagar/prender) ' + JSON.stringify([lm.slice(1), la, lb]));
      }
      const e = t.errores.filter((x) => !/404|Failed to load resource|net::|Sin permiso para vender|G8 lanzado|dominio público \(sin IP/.test(x));
      ok(!e.length, app + ': sin errores ' + e.join(' | ').slice(0, 200));
    } catch (x) { fallas++; console.log(x.message); await t.foto(app + '-central-error'); }
    await t.cerrar();
  }
  console.log(fallas ? 'HAY FALLAS: ' + fallas : 'TODO OK'); process.exit(fallas ? 1 : 0);
})();
