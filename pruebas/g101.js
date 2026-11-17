// G101 · 🛒 MERCADO LIBRE en Despega (módulo 'mercadolibre'): el admin pone la app de desarrollador (CM → Control → 🛒),
//   la tienda conecta SU cuenta (OAuth: state al azar + canje del código en el servidor), une productos con publicaciones,
//   y el stock queda igual: venta pagada en ML → se descuenta aquí 1 sola vez; stock distinto → PUT a ML. Token se renueva solo.
// FALLA con el código viejo (no existen ml_app_guardar, ml_conectar, ml_volver, ml_sincronizar ni la hoja #mercadolibre).
// Uso: ANCHO=320 node g101.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const ML = 'https://api.mercadolibre.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g101', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g101'); const su = t.sim.su, como = comoDe(su);
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.crearUsuario('otra@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Otra' });
    await su('update public.profiles set terms_at = now()');
    await su("insert into public.catalog_items (owner_id, client_key, nombre, precio, categoria, stock) values ($1, 'polera', 'Polera negra', 10000, 'Ropa', 20), ($1, 'gorro', 'Gorro', 5000, 'Ropa', 7)", [u.id]);
    await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
    const T = await como('tienda@x.cl', 'public.cfx_modulos_tienda()');
    ok(T.modulos.some((m) => m.clave === 'mercadolibre' && m.vende && /Mercado Libre/.test(m.nombre)), 'Tienda de módulos ofrece 🛒 Mercado Libre');
    ok(/módulo/.test(await falla(() => como('tienda@x.cl', 'public.ml_estado()')) || ''), '🔒 Sin módulo: ml_estado rechazado');
    await como('tienda@x.cl', "public.cfx_modulo_probar('mercadolibre')");
    let e = await como('tienda@x.cl', 'public.ml_estado()');
    ok(e.app === false && e.conectado === false, 'Sin la app del admin: "CodeFix aún lo está activando"');
    ok(/CodeFix/.test(await falla(() => como('tienda@x.cl', 'public.ml_conectar()')) || ''), 'Conectar sin app → aviso claro');
    // Admin
    ok(/administrador/.test(await falla(() => como('tienda@x.cl', "public.ml_app_guardar('123456', 'secretosecreto', 'https://x.cl/')")) || ''), '🔒 Solo el admin pone la app');
    ok(/https/.test(await falla(() => como(ADM, "public.ml_app_guardar('123456', 'secretosecreto', 'http://x.cl/')")) || ''), 'Redirect sin https rechazado');
    let a = await como(ADM, "public.ml_app_guardar('123456', 'secretosecreto', 'https://despega.test/')");
    ok(a.id === '123456' && a.secreto === true && !JSON.stringify(a).includes('secretosecreto'), 'Admin guarda la app; el secreto no se vuelve a leer');
    a = await como(ADM, "public.ml_app_guardar('123456', '', 'https://despega.test/')");
    ok(a.secreto === true, 'Guardar sin secreto no lo borra');
    // OAuth
    await su("insert into extensions.http_respuestas values ($1, 200, $2), ($3, 200, $4), ($5, 200, $6), ($7, 200, $8), ($9, 200, '{\"id\":\"MLC123456\"}'), ($10, 200, $11)",
      [ML + '/oauth/token', JSON.stringify({ access_token: 'APP_USR-tok1', refresh_token: 'TG-ref1', expires_in: 21600, user_id: 777 }),
        ML + '/users/me', JSON.stringify({ id: 777, nickname: 'TIENDA_ANA' }),
        ML + '/users/777/items/search%', JSON.stringify({ results: ['MLC123456', 'MLC999999'] }),
        ML + '/items?ids=%', JSON.stringify([{ code: 200, body: { id: 'MLC123456', title: 'Polera negra talla M', price: 12990, available_quantity: 15, thumbnail: 'https://http2.mlstatic.com/a.jpg' } },
          { code: 200, body: { id: 'MLC999999', title: 'Gorro lana', price: 6990, available_quantity: 3, thumbnail: 'javascript:alert(1)' } }]),
        ML + '/items/MLC%', ML + '/orders/search%', JSON.stringify({ results: [{ id: 2000001, date_created: new Date().toISOString(), order_items: [{ item: { id: 'MLC123456' }, quantity: 2, unit_price: 12990 }, { item: { id: 'MLC555' }, quantity: 1 }] }] })]);
    const url = await como('tienda@x.cl', 'public.ml_conectar()');
    const st = (/[?&]state=(ml[0-9a-f]{32})/.exec(url) || [])[1];
    ok(/^https:\/\/auth\.mercadolibre\.cl\/authorization\?response_type=code&client_id=123456&redirect_uri=https%3A%2F%2Fdespega\.test%2F&state=ml/.test(url) && st, 'Conectar arma el link de ML con state al azar');
    ok(/no es de esta tienda|venció/.test(await falla(() => como('otra@x.cl', "public.cfx_modulo_probar('mercadolibre')").then(() => como('otra@x.cl', 'public.ml_volver($2, $3)', [st, 'TG-abc123']))) || ''), '🔒 Otra tienda no puede usar ese state');
    ok(/no válido/.test(await falla(() => como('tienda@x.cl', 'public.ml_volver($2, $3)', ['xx', 'TG-abc123'])) || ''), 'State inventado rechazado');
    // 📱 Vuelta real por la pantalla: /?code=…&state=… → hoja #mercadolibre → servidor canjea
    const { page: p } = await t.nuevo();
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'tienda@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(p);
    await p.goto(t.base + '/?code=TG-abc123&state=' + st); await p.waitForTimeout(4500);
    const tx0 = await p.evaluate(() => [...document.querySelectorAll('.cfx-hoja-m')].map((x) => x.innerText).join(' '));
    ok(/Conectado como\s*TIENDA_ANA/.test(tx0) && !/code=/.test(await p.evaluate(() => location.href)), '📱 Vuelve de ML: hoja abierta, "Conectado como TIENDA_ANA" y la URL sin el código');
    const log = (await su("select string_agg(content, ' | ') c from extensions.http_log where uri like '%/oauth/token'"))[0].c || '';
    ok(/grant_type=authorization_code/.test(log) && /client_secret=secretosecreto/.test(log) && /code=TG-abc123/.test(log), 'El código se canjea en el servidor (con la clave secreta)');
    ok((await su('select count(*)::int n from public.ml_estados'))[0].n === 0, 'El state se usa 1 sola vez');
    ok(/venció|no es de esta/.test(await falla(() => como('tienda@x.cl', 'public.ml_volver($2, $3)', [st, 'TG-abc123'])) || ''), 'Repetir el mismo link → rechazado');
    ok((await su("select has_table_privilege('authenticated', 'public.ml_cuentas', 'select') s"))[0].s === false, '🔒 Los tokens no se leen desde la app');
    // Publicaciones y unir
    const P = await como('tienda@x.cl', 'public.ml_publicaciones()');
    ok(P.length === 2 && P[0].titulo === 'Polera negra talla M' && P[1].foto === null, 'Trae tus publicaciones (foto rara → sin foto)');
    ok(/no encontrado/.test(await falla(() => como('tienda@x.cl', "public.ml_vincular('MLC123456', 'no-existe')")) || ''), 'Unir a un producto que no es tuyo → rechazado');
    ok(/no válida/.test(await falla(() => como('tienda@x.cl', "public.ml_vincular('x; drop', 'polera')")) || ''), 'Publicación inventada rechazada');
    await como('tienda@x.cl', "public.ml_vincular('MLC123456', 'polera', 'Polera negra talla M')");
    ok(/Conecta/.test(await falla(() => como('otra@x.cl', 'public.ml_publicaciones()')) || ''), '🔒 Otra tienda no ve las publicaciones de esta');
    // Sincronizar: venta 2 × en ML → 20 - 2 = 18 aquí; PUT a ML con 18
    await su('delete from extensions.http_log');
    let n = await como('tienda@x.cl', 'public.ml_sincronizar_mio()');
    let s = (await su("select stock from public.catalog_items where client_key = 'polera'"))[0].stock;
    ok(s === 18, '🛒 Venta pagada en ML descuenta aquí: 20 → ' + s);
    const put = (await su("select content from extensions.http_log where method = 'PUT' and uri = $1", [ML + '/items/MLC123456']))[0];
    ok(put && JSON.parse(put.content).available_quantity === 18, 'Stock aquí → ML: PUT available_quantity 18');
    ok((await su("select count(*)::int n from public.notifications where target_id = $1 and title like '%Mercado Libre%'", [u.id]))[0].n === 1, '🔔 Aviso "Vendiste en Mercado Libre"');
    n = await como('tienda@x.cl', 'public.ml_sincronizar_mio()');
    s = (await su("select stock from public.catalog_items where client_key = 'polera'"))[0].stock;
    ok(s === 18, 'La misma orden NO se descuenta 2 veces (' + s + ')');
    // Cambio aquí → se manda
    await su('delete from extensions.http_log');
    await su("update public.catalog_items set stock = 30 where client_key = 'polera'");
    await su('select public.ml_sincronizar()');
    ok((await su("select count(*)::int n from extensions.http_log where method = 'PUT' and content like '%30%'"))[0].n === 1, 'Cron: cambias el stock aquí → ML recibe 30');
    // Token vencido → se renueva solo
    await su("update public.ml_cuentas set expira = now() - interval '1 minute'"); await su('delete from extensions.http_log');
    await su('select public.ml_sincronizar()');
    ok(/grant_type=refresh_token/.test((await su("select string_agg(content, ' ') c from extensions.http_log where uri like '%/oauth/token'"))[0].c || ''), '🔁 Token vencido → se renueva solo');
    // Error de ML → se ve
    await su("update extensions.http_respuestas set status = 400, content = '{\"message\":\"item is closed\"}' where url_like = $1", [ML + '/items/MLC%']);
    await su("update public.catalog_items set stock = 31 where client_key = 'polera'"); await su('select public.ml_sincronizar()');
    e = await como('tienda@x.cl', 'public.ml_estado()');
    ok(e.vinculos[0].error === 'item is closed' && e.ventas_mes === 2, 'Si ML rechaza, la tienda ve el motivo · ventas del mes: ' + e.ventas_mes);
    // Pausa / desconectar (las uniones quedan 🛡️)
    await como('tienda@x.cl', 'public.ml_pausar(false)'); await su('delete from extensions.http_log'); await su('select public.ml_sincronizar()');
    ok((await su('select count(*)::int n from extensions.http_log'))[0].n === 0, '⏸️ En pausa no se llama a ML');
    // 📱 Hoja conectada (320 px)
    await p.goto(t.base + '/#mercadolibre'); await p.reload(); await p.waitForTimeout(3500);
    const tx = await p.evaluate(() => [...document.querySelectorAll('.cfx-hoja-m')].map((x) => x.innerText).join(' '));
    const ancho = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    ok(/Polera negra/.test(tx) && /item is closed/.test(tx) && /Reanudar/.test(tx) && ancho, '📱 Hoja: unidas, motivo del error, ▶️ Reanudar y cabe en 320 px');
    await p.screenshot({ path: __dirname + '/capturas/aplicaciones/g101_ml.png' }).catch(() => {});
    await p.click('.cfx-hoja-m [data-ml=pausa]'); await p.waitForTimeout(1500);
    await p.click('.cfx-hoja-m [data-ml=traer]'); await p.waitForTimeout(2000);
    ok(await p.evaluate(() => document.querySelectorAll('.cfx-hoja-m select[data-unir]').length === 2), '📥 Unir publicaciones: lista con selector de producto');
    await p.selectOption('.cfx-hoja-m select[data-unir="MLC999999"]', 'gorro'); await p.waitForTimeout(1500);
    ok((await su("select count(*)::int n from public.ml_vinculos where item_id = 'MLC999999' and clave = 'gorro'"))[0].n === 1, '📱 Elegir el producto en la lista lo une');
    await p.click('.cfx-hoja-m [data-ml=salir]'); await p.waitForTimeout(600);
    await p.click('[data-si], .cfx-dlg button.ok, .cfx-dialogo button.ok').catch(() => {}); await p.waitForTimeout(1500);
    const cu = (await su('select count(*)::int n from public.ml_cuentas'))[0].n, vi = (await su('select count(*)::int n from public.ml_vinculos'))[0].n;
    ok(cu === 0 && vi === 2, 'Desconectar borra los tokens; las 2 uniones quedan guardadas 🛡️');
    const tx2 = await p.evaluate(() => [...document.querySelectorAll('.cfx-hoja-m')].map((x) => x.innerText).join(' '));
    ok(/Conectar Mercado Libre/.test(tx2) && /2 publicaciones unidas guardadas/.test(tx2), '📱 Desconectado: botón Conectar + "2 publicaciones unidas guardadas"');
    await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await p.screenshot({ path: __dirname + '/capturas/aplicaciones/g101_ml_oscuro.png' }).catch(() => {});
  } catch (x) { console.log('✗ ERROR', x.message); f++; }
  await t.cerrar();
  console.log(f ? '✗ ' + f + ' fallas' : '✓ todo ok'); process.exit(f ? 1 : 0);
})();
