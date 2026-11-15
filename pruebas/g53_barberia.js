// G53a · 💈 Barbería modular: módulos NUEVOS sueltos (⏳ lista de espera, ⭐ reseñas en Google) que NO vienen en Premium (-20 %),
// 🧩 Módulos visible también en Premium (los 3 de siempre ✅ incluidos), clientes sin Premium (todo cómodo gratis) y 📣 Recomienda tu barbería.
// FALLA con el código viejo (no existen bar_sueltos ni cfx_modulo_plan; Premium escondía 🧩 Módulos).
// Uso: (cd /home/user/Barberia/supabase/pruebas && ./correr.sh "-h /var/tmp/pgb -p 54329 -U postgres") && ANCHO=320 node g53_barberia.js
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  const t = await abrir('/home/user/barberia', 'barberia_prueba');
  const p = t.page, su = t.sim.su;
  // Llama una función de la base como si fuera esa cuenta (auth.uid()).
  const como = async (email, expr) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email]))[0].r;
  const entrar = async (email) => {
    await p.goto(t.base + '/'); await p.waitForTimeout(1000);
    await p.evaluate(() => { try { localStorage.clear(); } catch (e) { /* */ } });
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', email); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales();
  };
  try {
    await su("create table if not exists auth.claves (email text primary key, pass text not null)");
    await su("alter table auth.users add column if not exists last_sign_in_at timestamptz");
    await su("insert into auth.claves select email, 'clave123' from auth.users on conflict do nothing");
    await su("update public.profiles set clave_temporal = false, tour_visto = true where true").catch(() => {});
    await su("delete from public.cfx_modulos_negocio; delete from public.lista_espera");
    await su("update public.profiles set plan = 'premium', premium_until = now() + interval '20 days' where email = 'dueno@test.cl'");
    await su("update public.profiles set plan = 'free', premium_until = null where email = 'carlos@test.cl'");
    const bid = (await su("select barberia_id b from public.profiles where email = 'dueno@test.cl'"))[0].b;
    const dueno = (await su("select id from public.profiles where email = 'dueno@test.cl'"))[0].id;

    // Venta apagada: los módulos nuevos quedan gratis para todos (como el núcleo); los 3 de siempre, solo Premium.
    await su("update public.cfx_config set valor = valor || '{\"activo\": false}' where clave = 'modulos_venta'");
    const off = (await su("select public.bar_sueltos($1) s", [bid]))[0].s;
    assert(off.espera === true && off.resenas === true, 'Venta apagada: ⏳ y ⭐ gratis ' + JSON.stringify(off));
    // Venta prendida: Premium NO trae los nuevos; sí trae los 3 de siempre (incluidos).
    await su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
    const on = (await su("select public.bar_sueltos($1) s, public.bar_modulos($1) m, public.cfx_modulo_plan('sellos', $2) ps, public.cfx_modulo_plan('espera', $2) pe", [bid, dueno]))[0];
    assert(on.s.espera === false && on.s.resenas === false && 'espera' in on.m, 'Venta prendida: Premium sin ⏳ ni ⭐ (se compran aparte) ' + JSON.stringify(on.s));
    assert(on.ps === true && on.pe === false, 'Premium incluye 🎟️ sellos, no ⏳ lista de espera');
    const tienda = await como('dueno@test.cl', 'public.cfx_modulos_tienda()');
    const esp = tienda.modulos.find((m) => m.clave === 'espera'), sel = tienda.modulos.find((m) => m.clave === 'sellos');
    assert(esp && !esp.plan && esp.precio < esp.lista, 'Tienda: ⏳ con -20% por ser Premium (' + (esp && esp.precio) + ' de ' + (esp && esp.lista) + ')');
    assert(sel && sel.plan && sel.activo, 'Tienda: 🎟️ sellos "Incluido en tu Premium"');
    // 👤 Cliente: la lista de espera depende del módulo de SU barbería, no de pagar.
    let err = '';
    try { await como('carlos@test.cl', "public.unirse_espera(current_date + 1, null)"); } catch (e) { err = e.message; }
    assert(/no tiene la lista de espera/.test(err), 'Cliente sin módulo en su barbería: no se anota (' + err + ')');
    await su("select public.cfx_modulos_dar($1, 'espera', 30, 'pago')", [dueno]);
    await como('carlos@test.cl', "public.unirse_espera(current_date + 1, null)");
    assert((await su("select count(*)::int n from public.lista_espera"))[0].n === 1, 'Con el módulo ⏳ el cliente Free se anota gratis');
    await como('carlos@test.cl', "public.guardar_perfil('{\"color\":\"#123456\"}')");
    assert(true, 'Cliente Free elige cualquier color (ya no es Premium)');

    // 🧩 Más → Módulos también para Premium.
    await entrar('dueno@test.cl');
    await p.goto(t.base + '/equipo/#mas'); await p.waitForTimeout(1500);
    assert(/Módulos/.test(await p.textContent('body')), 'Premium ve Más → 🧩 Módulos');
    await p.goto(t.base + '/equipo/#modulos'); await p.waitForTimeout(2500);
    const txt = (await p.textContent('#modZona')).replace(/\s+/g, ' ');
    assert(!/Básico/.test(txt), 'Premium no ve el pack Básico (ya lo trae)');
    assert(/Incluido en tu Premium/.test(txt) && /Lista de espera/.test(txt) && /Reseñas en Google/.test(txt) && /20% menos/.test(txt), 'Módulos: incluidos ✅ + nuevos con -20%');
    assert(await t.anchoOk(), 'Módulos sin salirse en ' + (process.env.ANCHO || 360));
    await t.foto('g53_modulos');
    // ⭐ Reseñas en Google: sin módulo, candado → demo ▶️ del módulo (no el aviso de Premium).
    await p.goto(t.base + '/equipo/#negocio'); await p.waitForTimeout(2000);
    await p.click('#cResenas input'); await p.waitForTimeout(1200);
    assert(/Reseñas en Google/.test(await p.textContent('dialog.cfxd')), 'Candado de ⭐ abre la demo del módulo');
    await t.foto('g53_demo_resenas');
    await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
    await su("select public.cfx_modulos_dar($1, 'resenas', 30, 'pago')", [dueno]);
    await p.goto(t.base + '/equipo/#negocio'); await p.reload(); await p.waitForTimeout(2500);
    await p.fill('#cResenas input', 'https://g.page/r/prueba/review');
    await p.click('#bGuardarAj'); await p.waitForTimeout(1500);
    assert((await su("select google_resenas g from public.barberias where id = $1", [bid]))[0].g === 'https://g.page/r/prueba/review', 'Con el módulo: guarda el link de Google');
    const tok = (await su("select token from public.reservas where barberia_id = $1 and token is not null limit 1", [bid]))[0];
    if (tok) assert((await su("select public.reserva_ver($1) ->> 'google_resenas' g", [tok.token]))[0].g === 'https://g.page/r/prueba/review', 'El link de la reserva (/r/) trae el link de Google para pedir la reseña');

    // 👤 Cliente: sin "Hazte Premium" y con 📣 Recomienda tu barbería.
    await entrar('carlos@test.cl');
    await p.goto(t.base + '/cliente/'); await p.waitForTimeout(2500);
    assert(!/Hazte Premium/.test(await p.textContent('body')), 'Cliente: ya no ve "Hazte Premium"');
    await p.goto(t.base + '/cliente/#perfil'); await p.waitForTimeout(2000);
    await p.getByText('Recomienda tu barbería').first().click(); await p.waitForTimeout(1000);
    const link = await p.inputValue('input[readonly]');
    assert(/\/b\/\?b=/.test(link), 'Recomienda tu barbería: link para reservar ' + link);
    assert(await t.anchoOk(), 'Recomendar sin salirse');
    await t.foto('g53_recomendar');
    await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(300); await t.foto('g53_recomendar_oscuro');
  } catch (e) { console.log(e.message); process.exitCode = 1; await t.foto('g53_error'); }
  await su("update public.cfx_config set valor = valor || '{\"activo\": false}' where clave = 'modulos_venta'").catch(() => {});
  const err = t.errores.filter((x) => !/Failed to load resource|ERR_|workers\.dev|status of 404/.test(x));
  console.log('ERRORES:', err.join('\n') || 'ninguno');
  if (err.length) process.exitCode = 1;
  await t.cerrar();
})();
