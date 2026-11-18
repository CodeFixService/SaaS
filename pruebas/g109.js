// G109 · 💈 MEMBRESÍA QUE SE PAGA SOLA (Barbería): el cliente autoriza su tarjeta 1 vez en el Mercado Pago PROPIO de la barbería
//   (suscripción "preapproval", motor G106 del núcleo, ref 'memb:<id>') → cada cobro aprobado → +1 mes + entra a la Caja.
// FALLA con el código viejo (no existen membresia_mp_auto ni el botón "⚡ Pagar sola cada mes").
// Uso: ANCHO=320 node g109.js   (OSCURO=1 para tema oscuro)
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const MP = 'https://api.mercadopago.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
const sinScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
(async () => {
  execSync(__dirname + '/base.sh /home/user/Barberia p_g109', { stdio: 'ignore' });
  let pidio = null;  // texto por defecto del correo (h.js cambia los diálogos por prompt de Chrome)
  const t = await abrir('/home/user/Barberia', 'p_g109', { dialogo: (d) => { if (d.type() === 'prompt') { pidio = d.defaultValue(); d.accept(pidio); } else d.accept(); } }); const su = t.sim.su, como = comoDe(su);
  try {
    await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'barberia', barberia: 'Barbería Juan', nombre: 'Juan', telefono: '+56912345671' });
    const cod = (await su('select codigo from public.barberias limit 1'))[0].codigo;
    await t.sim.crearUsuario('cli@x.cl', 'clave123', { rol: 'cliente', barberia: cod, nombre: 'Pepe', telefono: '+56912345672' });
    await t.sim.crearUsuario('otro@x.cl', 'clave123', { rol: 'cliente', barberia: cod, nombre: 'Otro', telefono: '+56912345673' });
    await su("update public.profiles set clave_temporal = false, tour_visto = true, terms_at = coalesce(terms_at, now()) where true").catch(() => {});
    const B = (await su('select b.id, b.owner_id from public.barberias b limit 1'))[0];
    const cli = (await su("select id from public.profiles where email = 'cli@x.cl'"))[0].id;
    await su("select public.cfx_modulos_dar($1, 'membresia', 30, 'pago')", [B.owner_id]);
    const stub = (url, st, body) => su('insert into extensions.http_respuestas values ($1, $2, $3) on conflict (url_like) do update set status = excluded.status, content = excluded.content', [MP + url, st, JSON.stringify(body)]);
    const cobros = (pre, res) => stub('/authorized_payments/search?preapproval_id=' + pre, 200, { results: res });
    const viejo = () => su("update public.cfx_mp_neg_subs set revisado_at = now() - interval '2 hours'");
    const aviso = async (u, tit) => (await su('select count(*)::int n from public.avisos where para = $1 and titulo = $2', [u, tit]))[0].n;
    const M = async (id) => (await su('select hasta::text, activa, cliente_id from public.bar_membresias where id = $1', [id]))[0];
    await stub('/users/me', 200, { nickname: 'JUAN' });
    await stub('/preapproval', 201, { id: 'PRE1', init_point: 'https://mp.test/sus', status: 'pending' });
    await stub('/preapproval/PRE1', 200, { id: 'PRE1', status: 'pending' });
    await cobros('PRE1', []);
    // membresía por TELÉFONO (sin cuenta enlazada), vigente 10 días más, $20.000
    const m0 = await como('dueno@x.cl', "public.membresia_guardar('{\"nombre\":\"Pepe\",\"tel\":\"+56912345672\",\"cortes\":4,\"precio\":20000,\"meses\":1,\"medio\":\"efectivo\"}')");
    await su("update public.bar_membresias set hasta = (now() at time zone 'America/Santiago')::date + 10 where id = $1", [m0.id]);
    let mm = await como('cli@x.cl', 'public.mi_membresia()');
    ok(mm && mm.mp === false && mm.auto === null, 'Sin ⚡ MP de la barbería: no se ofrece');
    ok(/Mercado Pago conectado/.test(await falla(() => como('cli@x.cl', "public.membresia_mp_auto($2, 'cli@x.cl', 'https://a.cl/')", [m0.id])) || ''), '🔒 Sin MP conectado → no se crea');
    await como('dueno@x.cl', "public.cfx_mp_neg_guardar('APP_USR-1234567890123456789012345-ef01', true)");
    mm = await como('cli@x.cl', 'public.mi_membresia()');
    ok(mm.mp === true && mm.auto === null, 'Con ⚡ MP: el cliente ve la opción de pagarla sola');
    ok(/no encontrada/.test(await falla(() => como('otro@x.cl', "public.membresia_mp_auto($2, 'o@x.cl', 'https://a.cl/')", [m0.id])) || ''), '🔒 Otro cliente no puede activarla');
    ok(/no encontrada/.test(await falla(() => como('dueno@x.cl', "public.membresia_mp_auto($2, 'o@x.cl', 'https://a.cl/')", [m0.id])) || ''), '🔒 El dueño no la activa por el cliente');
    let x = await como('cli@x.cl', "public.membresia_mp_auto($2, 'malo', 'https://a.cl/')", [m0.id]);
    ok(x.ok === false && /correo/.test(x.error), 'Correo no válido → no se crea');
    x = await como('cli@x.cl', "public.membresia_mp_auto($2, 'Cli@X.cl', 'https://a.cl/cliente/?mpm=1')", [m0.id]);
    ok(x.ok && x.url === 'https://mp.test/sus', '⚡ Activar → abre Mercado Pago para autorizar la tarjeta');
    const req = JSON.parse((await su("select content from extensions.http_log where method = 'POST' and uri = $1 order by n desc limit 1", [MP + '/preapproval']))[0].content);
    ok(req.auto_recurring.transaction_amount === 20000 && req.auto_recurring.currency_id === 'CLP' && req.auto_recurring.frequency_type === 'months' && req.payer_email === 'cli@x.cl',
      'Suscripción: $20.000 CLP cada mes con el correo del cliente');
    const venc = new Date((await M(m0.id)).hasta + 'T12:00:00-03:00'), ini = new Date(req.auto_recurring.start_date);
    ok(ini < venc && venc - ini < 2 * 864e5, 'Primer cobro: 1 día antes de que venza');
    ok((await M(m0.id)).cliente_id === cli, 'La membresía por teléfono queda enlazada a su cuenta (para avisarle)');
    mm = await como('cli@x.cl', 'public.mi_membresia()');
    ok(mm.auto && mm.auto.estado === 'pendiente', 'Sin autorizar → ⏳ pendiente');
    await stub('/preapproval/PRE1', 200, { id: 'PRE1', status: 'authorized' });
    x = await como('cli@x.cl', 'public.membresia_mp_auto_revisar($2)', [m0.id]);
    ok(x && x.estado === 'activa', 'Al volver de MP: ✅ activa');
    ok(await aviso(B.owner_id, '⚡ Membresía que se paga sola') === 1 && await aviso(cli, '⚡ Listo: tu membresía se paga sola') === 1, '🔔 Dueño y cliente reciben el aviso de activada');
    x = await como('cli@x.cl', "public.membresia_mp_auto($2, 'cli@x.cl', 'https://a.cl/')", [m0.id]);
    ok(x.ok === false && /Ya tienes/.test(x.error), 'No se crea una 2.ª suscripción');
    const l = await como('dueno@x.cl', 'public.membresia_lista()');
    ok(l[0].auto && l[0].auto.estado === 'activa', 'El dueño la ve "⚡ se paga sola" en su lista');
    // 💳 MP cobra → +1 mes + Caja
    const h0 = (await M(m0.id)).hasta;
    await cobros('PRE1', [{ id: 9001, preapproval_id: 'PRE1', currency_id: 'CLP', transaction_amount: 20000, payment: { id: 8001, status: 'approved' } },
      { id: 9002, preapproval_id: 'PRE1', currency_id: 'CLP', transaction_amount: 500, payment: { id: 8002, status: 'approved' } },
      { id: 9003, preapproval_id: 'PRE1', currency_id: 'CLP', transaction_amount: 20000, payment: { id: 8003, status: 'rejected' } }]);
    await viejo();
    ok((await su('select public.cfx_mp_neg_subs_revisar() n'))[0].n === 1, '⏱️ El cron encuentra 1 cobro válido (ignora monto menor y rechazado)');
    const h1 = (await M(m0.id)).hasta;
    ok(new Date(h1) - new Date(h0) > 27 * 864e5, '✅ Cobro aprobado → +1 mes (' + h0 + ' → ' + h1 + ')');
    const cj = await su("select monto, medio, nota from public.caja where barberia_id = $1 and nota like '⚡%'", [B.id]);
    ok(cj.length === 1 && cj[0].monto === 20000 && cj[0].medio === 'transferencia', '💵 Entra a la Caja ($20.000, transferencia)');
    ok(await aviso(B.owner_id, '⚡ Membresía pagada sola') === 1 && await aviso(cli, '✅ Membresía pagada') === 1, '🔔 Avisos de membresía pagada');
    await viejo(); await su('select public.cfx_mp_neg_subs_revisar()');
    ok((await M(m0.id)).hasta === h1 && (await su("select count(*)::int n from public.caja where nota like '⚡%'"))[0].n === 1, '🔒 El mismo cobro no suma 2 veces');
    // ⚠️ MP caído al quitar
    await stub('/preapproval/PRE1', 500, { message: 'error' });
    ok(/no respondió/.test(await falla(() => como('cli@x.cl', 'public.membresia_mp_auto_quitar($2)', [m0.id])) || ''), 'MP caído al quitar → avisa y no lo marca apagado');
    await stub('/preapproval/PRE1', 200, { id: 'PRE1', status: 'authorized' });
    await como('cli@x.cl', 'public.membresia_mp_auto_quitar($2)', [m0.id]);
    const put = (await su("select count(*)::int n from extensions.http_log where method = 'PUT' and uri = $1 and content like '%cancelled%'", [MP + '/preapproval/PRE1']))[0].n;
    mm = await como('cli@x.cl', 'public.mi_membresia()');
    ok(put >= 1 && mm.auto === null && mm.activa && await aviso(B.owner_id, '⚡ Pago automático apagado') === 1, '⚡ Quitar → se apaga EN Mercado Pago, la membresía sigue y el dueño recibe aviso');
    // 💲 el dueño cambia el precio → se apaga sola
    await stub('/preapproval', 201, { id: 'PRE2', init_point: 'https://mp.test/sus2', status: 'pending' });
    await stub('/preapproval/PRE2', 200, { id: 'PRE2', status: 'authorized' });
    await cobros('PRE2', []);
    await como('cli@x.cl', "public.membresia_mp_auto($2, 'cli@x.cl', 'https://a.cl/')", [m0.id]);
    await como('cli@x.cl', 'public.membresia_mp_auto_revisar($2)', [m0.id]);
    await como('dueno@x.cl', "public.membresia_guardar(jsonb_build_object('id', $2::text, 'precio', 25000))", [m0.id]);
    ok((await su("select estado from public.cfx_mp_neg_subs where preapproval = 'PRE2'"))[0].estado === 'cancelada', '💲 El dueño cambia el precio → el pago automático se apaga (se reactiva con el precio nuevo)');
    // ⏸️ pausada cuando llega un cobro → no suma, se apaga, "revísalo"
    await stub('/preapproval', 201, { id: 'PRE3', init_point: 'https://mp.test/sus3', status: 'pending' });
    await stub('/preapproval/PRE3', 200, { id: 'PRE3', status: 'authorized' });
    await cobros('PRE3', []);
    await como('cli@x.cl', "public.membresia_mp_auto($2, 'cli@x.cl', 'https://a.cl/')", [m0.id]);
    await como('cli@x.cl', 'public.membresia_mp_auto_revisar($2)', [m0.id]);
    ok((await su("select monto from public.cfx_mp_neg_subs where preapproval = 'PRE3'"))[0].monto === 25000, '…y vuelve a activarse con $25.000');
    await su('update public.bar_membresias set activa = false where id = $1', [m0.id]);
    const h2 = (await M(m0.id)).hasta;
    await cobros('PRE3', [{ id: 9101, preapproval_id: 'PRE3', currency_id: 'CLP', transaction_amount: 25000, payment: { id: 8101, status: 'approved' } }]);
    await viejo(); await su('select public.cfx_mp_neg_subs_revisar()');
    ok((await M(m0.id)).hasta === h2 && await aviso(B.owner_id, '⚡ Pago automático recibido: revísalo') === 1, '⏸️ Pausada al llegar un cobro → no suma, el dueño recibe "revísalo"');
    ok((await su("select estado from public.cfx_mp_neg_subs where preapproval = 'PRE3'"))[0].estado === 'cancelada', '…y la suscripción se apaga sola');
    ok(/pausada/.test(await falla(() => como('cli@x.cl', "public.membresia_mp_auto($2, 'cli@x.cl', 'https://a.cl/')", [m0.id])) || ''), 'Pausada → no se puede activar');
    const P = (await su("select has_function_privilege('anon', 'public.membresia_mp_auto(uuid, text, text)', 'execute') a, has_function_privilege('authenticated', 'public.cfx_mp_neg_sub_app(text, text, text, integer)', 'execute') b"))[0];
    ok(!P.a && !P.b, '🔒 Nadie de fuera llama el gancho ni activa sin sesión');

    // 📱 Pantallas
    await su('update public.bar_membresias set activa = true where id = $1', [m0.id]);
    await stub('/preapproval', 201, { id: 'PRE4', init_point: 'https://mp.test/sus4', status: 'pending' });
    await stub('/preapproval/PRE4', 200, { id: 'PRE4', status: 'pending' });
    await cobros('PRE4', []);
    let p = t.page;
    await p.context().route(/mp\.test/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>MP prueba</h1>' }));
    const entrar = async (pg, mail) => {
      await pg.goto(t.base + '/'); await pg.waitForTimeout(1200);
      await pg.fill('input[type=email]:visible', mail); await pg.fill('input[type=password]:visible', 'clave123'); await pg.press('input[type=password]:visible', 'Enter');
      await pg.waitForTimeout(3000); await t.sinModales(pg);
    };
    if (process.env.OSCURO) await p.emulateMedia({ colorScheme: 'dark' });
    await entrar(p, 'cli@x.cl');
    await p.goto(t.base + '/cliente/#inicio'); await p.reload(); await p.waitForTimeout(3000); await t.sinModales(p);
    await p.waitForSelector('#mbAuto', { timeout: 8000 }).catch(() => {});
    let txt = await p.evaluate(() => (document.querySelector('#membresia') || {}).innerText || '');
    ok(/Pagar sola cada mes/.test(txt) && /25\.000/.test(txt), '📱 Cliente: Inicio → Tu membresía → "⚡ Pagar sola cada mes ($25.000)"');
    ok(await sinScroll(p), '📱 Sin scroll horizontal');
    await p.evaluate(() => document.querySelector('#membresia').scrollIntoView());
    await p.screenshot({ path: __dirname + '/capturas/barberia/g109_cliente' + (process.env.OSCURO ? '_oscuro' : '') + '.png' }).catch(() => {});
    let volvio = '';
    await p.route('**/rpc/membresia_mp_auto', (r) => { const b = JSON.parse(r.request().postData()); volvio = b.p_volver; b.p_volver = b.p_volver.replace(/^http:\/\/[^/]+/, 'https://barberia.test'); r.fallback({ postData: JSON.stringify(b) }); });
    await p.click('#mbAutoSi'); await p.waitForTimeout(800);
    if (await p.$('[data-v]')) { pidio = await p.evaluate(() => [...document.querySelectorAll('[data-v]')].map((v) => v.value).filter(Boolean).join('|')); await p.click('[data-si]'); }
    await p.waitForTimeout(2500);
    ok(pidio === 'cli@x.cl', '📱 Pide el correo de Mercado Pago (viene escrito el de su cuenta): ' + pidio);
    ok(/\?mpm=/.test(volvio) && /cliente\//.test(volvio), '📱 Vuelve a su app (?mpm=)');
    ok(/mp\.test\/sus4/.test(p.url()), '📱 Tocar → va a Mercado Pago');
    await stub('/preapproval/PRE4', 200, { id: 'PRE4', status: 'authorized' });
    await p.goto(t.base + '/cliente/?mpm=' + m0.id + '#inicio'); await p.waitForTimeout(3500); await t.sinModales(p);
    txt = await p.evaluate(() => (document.querySelector('#membresia') || {}).innerText || '');
    ok(/Se paga sola cada mes/.test(txt) && /Quitar/.test(txt) && !/mpm=/.test(p.url()), '📱 Al volver: "⚡ Se paga sola cada mes" + Quitar (y limpia la dirección)');
    await p.evaluate(() => document.querySelector('#membresia').scrollIntoView());
    await p.screenshot({ path: __dirname + '/capturas/barberia/g109_activa' + (process.env.OSCURO ? '_oscuro' : '') + '.png' }).catch(() => {});
    const p2 = (await t.nuevo()).page;
    if (process.env.OSCURO) await p2.emulateMedia({ colorScheme: 'dark' });
    await entrar(p2, 'dueno@x.cl');
    await p2.goto(t.base + '/equipo/#membresias'); await p2.reload(); await p2.waitForTimeout(3000); await t.sinModales(p2);
    txt = await p2.evaluate(() => document.body.innerText);
    ok(/Se paga sola con tarjeta/.test(txt), '📱 Dueño: Membresías → "⚡ Se paga sola con tarjeta"');
    ok(await sinScroll(p2), '📱 Dueño: sin scroll horizontal');
    await p2.screenshot({ path: __dirname + '/capturas/barberia/g109_dueno' + (process.env.OSCURO ? '_oscuro' : '') + '.png' }).catch(() => {});
    await p2.click('[data-e]'); await p2.waitForTimeout(800);
    await p2.click('[data-noauto]'); await p2.waitForTimeout(500); await p2.click('[data-si]'); await p2.waitForTimeout(2000);
    ok((await su("select estado from public.cfx_mp_neg_subs where preapproval = 'PRE4'"))[0].estado === 'cancelada', '📱 Dueño: Editar → Quitar pago automático → se apaga en MP');
    ok(!t.errores.filter((m) => !/favicon|404|status of 400|mp\.test/i.test(m)).length, 'Sin errores en la consola ' + t.errores.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'Error: ' + (e.stack || e).toString().slice(0, 600)); }
  await t.cerrar();
  console.log(f ? '✗ ' + f + ' fallas' : 'TODO OK'); process.exit(f ? 1 : 0);
})();
