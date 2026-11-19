// G122 · 🖼️ Fotos de vitrina a Storage (núcleo fotos.js CFX_NUBE + fotos.sql: bucket 'vitrina', cfx_foto_nube/cfx_foto_ok).
// Servidor: bucket público con límite y solo imágenes; cada uno sube a SU carpeta; la app acepta URL de la nube (solo de su carpeta) y base64.
// Pantalla: el dueño entra y sus fotos viejas (base64) pasan solas a Storage; se siguen viendo (la URL responde); nada se pierde.
// FALLA con el código viejo (no existe cfx_fotos_viejas ni el bucket vitrina).  Uso: node g122.js [despega barberia bicitaller]
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
      // ---------- servidor ----------
      const b = (await su("select public, file_size_limit l, allowed_mime_types m from storage.buckets where id = 'vitrina'"))[0];
      ok(b && b.public && b.l > 0 && b.l <= 1048576 && b.m.join() === 'image/webp,image/jpeg,image/png', n + ': 📦 bucket vitrina público, ≤ 1 MB y solo imágenes');
      const nb = (await su('select public.cfx_foto_nube($1, $2) mia, public.cfx_foto_nube($1, $3) ajena, public.cfx_foto_ok($4, 100) mala, public.cfx_foto_ok($5, 100) js', [URL_DE(uid), uid, otro, PNG + 'A'.repeat(200), 'https://x.supabase.co/storage/v1/object/public/vitrina/a/b.webp"onerror=1']))[0];
      ok(nb.mia && !nb.ajena && !nb.mala && !nb.js, n + ': 🔒 URL de la nube: la mía sí, la de otro no; base64 pesado y URL rara no');
      const pr = (await su("select has_function_privilege('anon', 'public.cfx_fotos_viejas()', 'execute') a, has_function_privilege('anon', 'public.cfx_foto_pasar(text, text, int, int, text)', 'execute') b"))[0];
      ok(!pr.a && !pr.b, n + ': 🔒 sin cuenta no se listan ni cambian fotos');
      const vj = await como('dueno@x.cl', 'array(select row_to_json(x) from public.cfx_fotos_viejas() x)');
      ok(vj.length === 2, n + ': el dueño ve sus 2 fotos viejas');
      ok((await como('otro@x.cl', 'array(select row_to_json(x) from public.cfx_fotos_viejas() x)')).length === 0, n + ': 🔒 otro negocio no ve esas fotos');
      const x = vj[0];
      ok(!(await como('otro@x.cl', 'public.cfx_foto_pasar($2, $3, $4, $5, $6)', [x.t, x.id, x.i, x.foto.length, URL_DE(otro)])), n + ': 🔒 otro negocio no puede cambiarlas');
      ok(!(await como('dueno@x.cl', 'public.cfx_foto_pasar($2, $3, $4, $5, $6)', [x.t, x.id, x.i, x.foto.length, URL_DE(otro)])), n + ': 🔒 no acepta una URL de la carpeta de otro');
      ok(!(await como('dueno@x.cl', 'public.cfx_foto_pasar($2, $3, $4, $5, $6)', [x.t, x.id, x.i, x.foto.length + 1, URL_DE(uid)])), n + ': si la foto cambió (otro largo), no la toca');
      if (n === 'despega') {
        ok(/no válida/.test(await falla(() => como('dueno@x.cl', "public.set_foto_producto('p1', $2)", [URL_DE(otro)])) || ''), n + ': 🔒 producto no acepta foto de la carpeta de otro');
        ok(!(await falla(() => como('dueno@x.cl', "public.set_foto_producto('p1', $2)", [PNG]))), n + ': producto sigue aceptando base64 (base vieja)');
      }
      // ---------- pantalla: entra el dueño y sus fotos pasan solas ----------
      const p = t.page; await entrar(p, t.base, 'dueno@x.cl');
      let fotos = [];
      for (let k = 0; k < 20; k++) { await p.waitForTimeout(1000); fotos = (await su(leer))[0].a; if (fotos.every((u) => /^https:/.test(u || ''))) break; }
      ok(fotos.length === 2 && fotos.every((u) => /\/vitrina\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/.test(u || '') && u.includes('/' + uid + '/')), n + ': 🖼️ al entrar, las 2 fotos viejas pasaron a Storage (carpeta del dueño)');
      const obj = (await su("select count(*)::int c from storage.objects where bucket_id = 'vitrina' and name like $1", [uid + '/%']))[0].c;
      ok(obj === 2, n + ': 📦 2 archivos en el bucket vitrina');
      const st = await p.evaluate(async (u) => { try { const r = await fetch(u); return r.status + ' ' + (r.headers.get('content-type') || ''); } catch (e) { return e.message; } }, fotos[0] || '');
      ok(/^200 image\/png/.test(st), n + ': la foto se sigue viendo (la URL responde la imagen) · ' + st);
      ok(await p.evaluate((u) => !!(window.CFX_NUBE && window.CFX_NUBE.es(u)) && !window.CFX_NUBE.es(u + '"x'), fotos[0] || ''), n + ': CFX_NUBE.es reconoce la URL (y no una con comillas)');
      if (n === 'barberia') ok(await p.evaluate((u) => /background-image:url\('https:/.test(window.Core.fondo(u)) && window.Core.fondo(u + "')x") === '', fotos[0]), n + ': 💈 la portada de la nube se pinta (fondo) y una URL rara no');
      if (n === 'barberia') { // foto nueva elegida en la app (Core.elegirImagen('vitrina')) → sale ya en la nube
        const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.evaluate(() => { window._img = window.Core.elegirImagen('vitrina'); })]);
        await fc.setFiles(__dirname + '/bici.png');
        const u = await p.evaluate(() => window._img);
        ok(/^https:.*\/vitrina\//.test(u || '') && u.includes('/' + uid + '/'), n + ': 📷 foto nueva de vitrina sube directo a Storage');
        const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.evaluate(() => { window._img = window.Core.elegirImagen('comprobante'); })]);
        await fc2.setFiles(__dirname + '/bici.png');
        ok(/^data:image\//.test(await p.evaluate(() => window._img) || ''), n + ': 🔒 el comprobante NO va a la nube pública (queda en la base)');
        await p.evaluate((x) => window.CFX_NUBE.borrar(x), u);
      }
      // subir directo: base64 → URL de mi carpeta
      const sub = await p.evaluate((d) => window.CFX_NUBE.subir(d), PNG);
      ok(/^https:/.test(sub) && sub.includes('/' + uid + '/'), n + ': CFX_NUBE.subir devuelve la URL de mi carpeta');
      await p.evaluate((u) => window.CFX_NUBE.borrar(u), sub); await p.waitForTimeout(500);
      ok((await su("select count(*)::int c from storage.objects where bucket_id = 'vitrina' and name like $1", [uid + '/%']))[0].c === 2, n + ': CFX_NUBE.borrar la saca de Storage');
      ok(await p.evaluate((d) => window.CFX_NUBE.subir(d, { storage: null }), 'no-es-foto') === 'no-es-foto', n + ': lo que no es foto vuelve igual (nada se pierde)');
      const err = t.errores.filter((e) => !/favicon|realtime|websocket|Failed to load resource/i.test(e));
      ok(err.length === 0, n + ': sin errores en consola' + (err.length ? ' · ' + err.slice(0, 3).join(' | ') : ''));
    } catch (e) { ok(false, n + ': ' + (e.stack || e.message)); }
    await t.cerrar();
  }
  console.log(f ? '❌ ' + f + ' fallas' : '✅ G122 OK'); process.exit(f ? 1 : 0);
})();
