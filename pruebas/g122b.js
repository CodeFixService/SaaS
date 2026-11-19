// G122 b · 🧹 Fotos huérfanas en Storage (núcleo CFX_NUBE.limpiar + fotos.sql cfx_fotos_libres).
// Servidor: de MIS archivos, devuelve solo los que no aparecen en NINGUNA tabla (texto o json). Ante la duda, nada.
// Pantalla: el dueño entra y se borran sus fotos huérfanas de más de 7 días; las en uso y las recientes siguen. 1 vez por semana.
// FALLA con el código viejo (no existe cfx_fotos_libres ni CFX_NUBE.limpiar).  Uso: node g122b.js [despega barberia bicitaller]
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG2 = PNG.replace('Jggg==', 'JgggA=');
const URL_DE = (uid) => 'https://abc.supabase.co/storage/v1/object/public/vitrina/' + uid + '/22222222-2222-4222-8222-222222222222.webp';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
const entrar = async (p, base, email) => {
  await p.goto(base + '/'); await p.waitForTimeout(1500);
  await p.fill('input[type=email]:visible', email); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
};
// [repo, bd, preparar (deja fotos viejas), cómo leer las fotos (SQL → text[])]
const APPS = {
  despega: ['/home/user/Aplicaciones', 'p_g122_apl', async (t) => {
    const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.crearUsuario('otro@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Otra' });
    await t.sim.su('update public.profiles set terms_at = now()');
    await t.sim.su("insert into public.catalog_items (owner_id, client_key, nombre, precio, foto, foto_at) values ($1, 'p1', 'Pan', 1000, $2, now()), ($1, 'p2', 'Leche', 900, $3, now())", [u.id, PNG, PNG2]);
  }, "select array_agg(foto order by client_key) a from public.catalog_items"],
  barberia: ['/home/user/barberia', 'p_g122_bar', async (t) => {
    await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'barberia', barberia: 'Barbería Juan', nombre: 'Juan', telefono: '+56912345671' });
    await t.sim.crearUsuario('otro@x.cl', 'clave123', { rol: 'barberia', barberia: 'Otra', nombre: 'Leo', telefono: '+56912345673' });
    await t.sim.su('update public.profiles set clave_temporal = false, tour_visto = true where true').catch(() => {});
    const b = (await t.sim.su("select barberia_id from public.profiles where id = (select id from auth.users where email = 'dueno@x.cl')"))[0].barberia_id;
    await t.sim.su('update public.barberias set portada = $2 where id = $1', [b, PNG]);
    await t.sim.su('insert into public.bar_portafolio (barberia_id, foto) values ($1, $2)', [b, PNG2]);
  }, "select array[(select portada from public.barberias b join public.profiles p on p.barberia_id = b.id join auth.users u on u.id = p.id where u.email = 'dueno@x.cl'), (select foto from public.bar_portafolio limit 1)] a"],
  bicitaller: ['/home/user/taller', 'p_g122_tal', async (t) => {
    await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Sur', nombre: 'Ana' });
    await t.sim.crearUsuario('otro@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Otro', nombre: 'Leo' });
    await t.sim.su('update public.perfiles set terminos_at = now()').catch(() => {});
    const tid = (await t.sim.su("select public.taller_de((select id from auth.users where email = 'dueno@x.cl')) t"))[0].t;
    await t.sim.su("insert into public.bicis_usadas (taller_id, titulo, fotos) values ($1, 'Trek', jsonb_build_array($2::text, $3::text))", [tid, PNG, PNG2]);
  }, "select array(select jsonb_array_elements_text(fotos) from public.bicis_usadas) a"]
};


(async () => {
  const pedidas = process.argv.slice(2);
  for (const [n, [repo, db, prep, leer]] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(n)) continue;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db); const su = t.sim.su, como = comoDe(su);
    try {
      await prep(t);
      const uid = (await su("select id from auth.users where email = 'dueno@x.cl'"))[0].id, otro = (await su("select id from auth.users where email = 'otro@x.cl'"))[0].id;
      const N = (k) => k + '1111111-1111-4111-8111-11111111111' + k + '.webp';
      const U = (id, k) => 'https://abc.supabase.co/storage/v1/object/public/vitrina/' + id + '/' + N(k);
      // ---------- servidor ----------
      const pr = (await su("select has_function_privilege('anon', 'public.cfx_fotos_libres(text[])', 'execute') a"))[0];
      ok(!pr.a, n + ': 🔒 sin cuenta no se consulta');
      // la foto 'a' se usa en una tabla de la app (portada/producto), 'b' no la usa nadie, 'c' es de otro dueño
      await su("create table if not exists public.z_prueba_g122b (t text, j jsonb)");
      await su("insert into public.z_prueba_g122b values ($1, $2)", [U(uid, 'a'), JSON.stringify({ fotos: [U(otro, 'b')] })]);
      const lib = await como('dueno@x.cl', 'public.cfx_fotos_libres($2)', [[N('a'), N('b')]]);
      ok(JSON.stringify(lib) === JSON.stringify([N('b')]), n + ': 🧹 solo la foto que nadie usa sale libre · ' + JSON.stringify(lib));
      ok((await como('otro@x.cl', 'public.cfx_fotos_libres($2)', [[N('b')]])).length === 0, n + ': 🛡️ foto usada dentro de un json no sale libre');
      ok((await como('dueno@x.cl', 'public.cfx_fotos_libres($2)', [[N('b'), '../x.webp']])).length === 0, n + ': 🔒 un nombre raro → no se borra nada');
      // ---------- pantalla: el dueño entra; sus fotos viejas pasan y las huérfanas (> 7 días) se borran ----------
      const sube = async (k, dias) => su("insert into storage.objects (bucket_id, name, owner, owner_id, metadata, created_at) values ('vitrina', $1, $2::uuid, $2::text, '{}', now() - make_interval(days => $3))", [uid + '/' + N(k), uid, dias]);
      await sube('a', 30); await sube('b', 30); await sube('d', 1);  // a: en uso · b: huérfana vieja · d: huérfana reciente (puede estar en un borrador)
      const p = t.page; await entrar(p, t.base, 'dueno@x.cl');
      let quedan = [];
      for (let k = 0; k < 25; k++) {
        await p.waitForTimeout(1000);
        quedan = (await su("select array_agg(split_part(name, '/', 2) order by name) a from storage.objects where bucket_id = 'vitrina' and name like $1", [uid + '/%']))[0].a || [];
        if (!quedan.includes(N('b'))) break;
      }
      ok(!quedan.includes(N('b')), n + ': 🧹 al entrar, la foto huérfana vieja se borró de Storage');
      ok(quedan.includes(N('a')) && quedan.includes(N('d')), n + ': 🛡️ la foto en uso y la reciente siguen');
      const fotos = (await su(leer))[0].a;
      ok(fotos.length === 2 && fotos.every((u) => quedan.includes(u.split('/').pop())), n + ': 🛡️ las fotos del catálogo (recién pasadas a Storage) siguen');
      const otra = await p.evaluate(() => window.CFX_NUBE.limpiar(window.CFX_NUBE_SB && ((f, a) => window.CFX_NUBE_SB.rpc(f, a).then((r) => r.data))));
      ok(otra === 0, n + ': 1 vez por semana (no repite al tiro)');
      const err = t.errores.filter((e) => !/favicon|realtime|websocket|Failed to load resource/i.test(e));
      ok(err.length === 0, n + ': sin errores en consola' + (err.length ? ' · ' + err.slice(0, 3).join(' | ') : ''));
    } catch (e) { ok(false, n + ': ' + (e.stack || e.message)); }
    await t.cerrar();
  }
  console.log(f ? '❌ ' + f + ' fallas' : '✅ G122 b OK'); process.exit(f ? 1 : 0);
})();
