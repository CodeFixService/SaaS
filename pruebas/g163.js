// G163 · 🧩 NO SE OFRECE LO QUE NO FUNCIONA (núcleo modulos_venta.sql cfx_modulo_nota/cfx_modulo_pronto + gancho cfx_modulo_listo_app). FALLA con el código viejo.
//   Despega: 🌐 Dominio (sin dominio de CodeFix) y 🛒 Mercado Libre (sin app de CodeFix) salen 🔜 deshabilitados con su nota:
//   el servidor no deja probarlos, regalarlos ni pagarlos; lo ya activo sigue a la vista; el pack se vende igual (sin prender lo 🔜).
// Uso: node g163.js
const { abrir } = require('./h'); const { execSync } = require('./apps6');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (pr) => { try { await pr; return ''; } catch (e) { return e.message; } };
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g163', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g163'); const su = t.sim.su, como = comoDe(su);
  try {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.crearUsuario('dos@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Dos' });
    await su('update public.profiles set terms_at = now()');
    await su("update public.cfx_config set valor = valor || '{\"activo\": true, \"precio\": 990}' where clave = 'modulos_venta'");
    await su("delete from public.app_secrets where name in ('cf_token', 'ml_client_id')");
    await su("delete from public.cfx_config where clave = 'dominio'");
    // 1) La tienda de módulos dice qué no funciona todavía
    const D = await como('tienda@x.cl', 'public.cfx_modulos_tienda()');
    const m = (k) => D.modulos.find((x) => x.clave === k) || {};
    ok(m('dominio').nota && /dominio/i.test(m('dominio').nota), '🔜 🌐 Dominio: nota "CodeFix está terminando…"');
    ok(m('mercadolibre').nota && /Mercado Libre/.test(m('mercadolibre').nota), '🔜 🛒 Mercado Libre: nota');
    ok(!m('chat').nota && !m('courier').nota && !m('cupones').nota, '✅ chat, courier y cupones funcionan (sin nota)');
    const pc = D.packs.find((p) => p.clave === 'completo');
    ok(pc && !pc.nota && pc.pronto.includes('dominio') && pc.pronto.includes('mercadolibre') && !pc.pronto.includes('chat'), '📦 pack Completo se vende, marcando 🔜 dominio y Mercado Libre');
    // 2) El servidor no deja probar / regalar / pagar lo que no funciona
    ok(/no disponible/.test(await falla(como('tienda@x.cl', 'public.cfx_modulo_probar($2)', ['dominio']))), '⛔ 🎁 probar 🌐 Dominio: no');
    const comp = 'x'.repeat(300);
    ok(/no disponible/.test(await falla(como('tienda@x.cl', "public.cfx_pago_pedir('mensual', 990, 'transferencia', $2, '', null, null, 'mercadolibre')", [comp]))), '⛔ 🏦 pagar 🛒 Mercado Libre: no');
    await su("insert into public.cfx_config (clave, valor) values ('mp', '{\"token\": \"TEST-1\", \"activo\": true}') on conflict (clave) do update set valor = excluded.valor");
    const ap = await falla(como('tienda@x.cl', "public.cfx_auto_pagar('mp', 'mensual', null, 'dominio', null, 'https://x.cl', false)")); ok(/no disponible/.test(ap), '⛔ ⚡ pagar 🌐 Dominio con Mercado Pago: no (' + ap + ')');
    await su("update public.cfx_config set valor = valor || jsonb_build_object('campana', jsonb_build_object('modulos', jsonb_build_array('dominio', 'chat'), 'meses', 3, 'hasta', (current_date + 10)::text)) where clave = 'modulos_venta'");
    ok(/no disponible/.test(await falla(como('tienda@x.cl', 'public.cfx_modulo_campana($2)', ['dominio']))), '⛔ 🎁 regalo de campaña con 🌐 Dominio: no');
    ok((await como('tienda@x.cl', 'public.cfx_modulo_probar($2)', ['chat'])).ok, '✅ 🎁 probar 💬 Chat: sí');
    // 3) Prueba del pack: prende lo que funciona, no lo 🔜
    const r = await como('dos@x.cl', 'public.cfx_modulo_probar($2)', ['completo']);
    const prend = (await su("select array_agg(modulo) a from public.cfx_modulos_negocio where negocio = (select id from auth.users where email = 'dos@x.cl')"))[0].a || [];
    ok(r.ok && prend.includes('chat') && !prend.includes('dominio') && !prend.includes('mercadolibre'), '📦 prueba del pack: prende chat…, no 🌐 ni 🛒');
    // 4) 🛡️ Lo que ya tenía activo sigue a la vista (con la nota)
    await su("insert into public.cfx_modulos_negocio (negocio, modulo, hasta, origen) values ($1, 'mercadolibre', now() + interval '20 days', 'pago')", [u.id]);
    const D2 = await como('tienda@x.cl', 'public.cfx_modulos_tienda()');
    const ml = D2.modulos.find((x) => x.clave === 'mercadolibre');
    ok(ml && ml.activo && ml.nota, '🛡️ 🛒 comprado antes: sigue a la vista y activo, con su nota');
    // 5) Al configurarlo CodeFix, se ofrece solo
    await su("insert into public.app_secrets (name, value) values ('ml_client_id', '123'), ('cf_token', 'tok') on conflict (name) do update set value = excluded.value");
    await su("insert into public.cfx_config (clave, valor) values ('dominio', '{\"cname\": \"tiendas.codefix.cl\"}') on conflict (clave) do update set valor = excluded.valor");
    const D3 = await como('tienda@x.cl', 'public.cfx_modulos_tienda()');
    ok(D3.modulos.every((x) => !x.nota), '✅ con dominio y Mercado Libre configurados: todo se ofrece');
    // 6) Centro de Mando ve la nota
    await su("delete from public.app_secrets where name = 'ml_client_id'");
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'clave123', {}).catch(() => {});
    await su("update public.profiles set role = 'admin' where email = 'juanjosuecastilloloyola@gmail.com'").catch(() => {});
    const A = await como('juanjosuecastilloloyola@gmail.com', 'public.cfx_modulos_admin()').catch((e) => ({ e: e.message }));
    ok(Array.isArray(A) && (A.find((x) => x.clave === 'mercadolibre') || {}).nota && !(A.find((x) => x.clave === 'dominio') || {}).nota, '🧭 CM → 🧩 Módulos: ve la nota 🔜 de Mercado Libre' + (A.e ? ' (' + A.e + ')' : ''));
    // 7) 📱 Pantalla: 🧩 Módulos de la tienda
    await su("delete from public.cfx_config where clave = 'dominio'");
    const { page: p } = await t.nuevo();
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'tienda@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(p);
    await p.goto(t.base + '/#modulos'); await p.reload(); await p.waitForTimeout(4000); await t.sinModales(p);
    const v = await p.evaluate(() => {
      const cards = [...document.querySelectorAll('#modTienda .cfxm-mod')];
      const de = (re) => cards.find((c) => re.test(c.querySelector('h3').textContent));
      const dom = de(/Dominio/), chat = de(/Cupones/);
      return { n: cards.length, dom: dom && { nota: !!dom.querySelector('.cfxm-pronto'), comprar: !!dom.querySelector('[data-comprar]'), gratis: !!dom.querySelector('[data-gratis]'), off: !!dom.querySelector('button[disabled]') },
        chat: chat && { comprar: !!chat.querySelector('[data-comprar]'), nota: !!chat.querySelector('.cfxm-pronto') } };
    });
    ok(v.dom && v.dom.nota && v.dom.off && !v.dom.comprar && !v.dom.gratis, '📱 🌐 Dominio: a la vista, 🔜 deshabilitado con nota, sin Comprar ni 🎁');
    ok(v.chat && !v.chat.nota && v.chat.comprar, '📱 🏷️ Cupones: normal, con Comprar');
    await p.locator('#modTienda .cfxm-pronto').first().scrollIntoViewIfNeeded().catch(() => {});
    await p.screenshot({ path: __dirname + '/capturas/aplicaciones/g163_modulos.png' }).catch(() => {});
    ok(await t.anchoOk(p), '📱 sin scroll de lado');
  } catch (e) { console.log('ERROR', e); f++; } finally { await t.cerrar(); }
  console.log(f ? '✗ ' + f + ' fallaron' : '✓ todo ok'); process.exit(f ? 1 : 0);
})();
