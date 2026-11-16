// G74 b · 🎁 Campaña de lanzamiento de módulos (núcleo, las 6).
// CM → Apps → 🧩 → 🎁 Campaña: módulos + meses de regalo + fecha de término → 🎁 Lanzar campaña.
// Negocio: Más → 🧩 Módulos → "🎁 GRATIS 3 meses" + 🎁 Activar gratis → queda AL TIRO (origen 'regalo', hasta = hoy + 3 meses), una vez por módulo.
// Al pasar la fecha (o ⏹️ Terminar hoy) se apaga sola: los nuevos ven el precio; los que activaron siguen con su regalo. Aviso 7 días antes de que venza.
// FALLA con el código viejo (no existen cfx_campana, cfx_modulo_campana, #campCard ni [data-regalo]).
// Uso: ANCHO=320 node g74b_campana.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
(async () => {
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  // ---------- 1) Centro de Mando ----------
  execSync(__dirname + '/base.sh /home/user/saas p_g74b_cm', { stdio: 'ignore' });
  let t = await abrir('/home/user/saas', 'p_g74b_cm'); let p = t.page, su = t.sim.su;
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  const err = async (email, expr) => { try { await como(email, expr); return ''; } catch (x) { return x.message; } };
  const dlg = () => p.evaluate(() => [...document.querySelectorAll('dialog')].pop());
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123'); await t.sim.crearUsuario('tienda@x.cl', 'clave123');
    await su("create or replace function public.cfx_modulos_app() returns text[] language sql immutable as $$ select array['chat', 'cupones'] $$");
    await su("update public.cfx_config set valor = valor || '{\"activo\": true, \"precio\": 1490}' where clave = 'modulos_venta'");
    await p.goto(t.base + '/'); await p.fill('input[type=email]', 'juanjosuecastilloloyola@gmail.com'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800); await t.sinModales();
    await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(5000); await t.sinModales();
    await p.click('[data-app=cm] [data-a=rec]'); await p.waitForTimeout(2500);
    await p.click('[data-app=cm] [data-a=mod]'); await p.waitForTimeout(2000);
    const c0 = await p.evaluate(() => { const d = [...document.querySelectorAll('dialog')].pop(), c = d.querySelector('#campCard');
      return c && [c.textContent, c.querySelectorAll('[data-camp]').length, d.querySelector('#cMeses').value, d.querySelector('#cHasta').value, document.documentElement.scrollWidth <= innerWidth + 1]; });
    ok(c0 && /Campaña de lanzamiento/.test(c0[0]) && c0[1] === 2 && c0[2] === '3' && /^\d{4}-\d{2}-\d{2}$/.test(c0[3]) && c0[4], 'CM: 🎁 Campaña con módulos, 3 meses sugerido y fecha ' + JSON.stringify(c0 && c0.slice(1)));
    await p.evaluate(() => { const d = [...document.querySelectorAll('dialog')].pop(); d.querySelector('#cOk').click(); }); await p.waitForTimeout(1200);
    ok(/al menos un módulo/.test(await p.evaluate(() => [...document.querySelectorAll('dialog')].pop().querySelector('#cErr').textContent)), 'CM: sin módulos no lanza');
    await p.evaluate(() => { const d = [...document.querySelectorAll('dialog')].pop(); d.querySelector('[data-camp=chat]').checked = true; d.querySelector('#cOk').click(); }); await p.waitForTimeout(1500);
    const v1 = (await su("select valor -> 'campana' c from cfx_config where clave = 'modulos_venta'"))[0].c;
    const t1 = await p.evaluate(() => [...document.querySelectorAll('dialog')].pop().querySelector('#campCard').textContent);
    await p.evaluate(() => [...document.querySelectorAll('dialog')].pop().querySelector('#campCard').scrollIntoView()); await p.waitForTimeout(400);
    await t.foto('g74b_cm_campana');
    ok(v1 && v1.meses === 3 && JSON.stringify(v1.modulos) === '["chat"]' && /Activa hasta/.test(t1) && /Terminar hoy/.test(t1), 'CM: 🎁 Lanzar campaña guarda chat · 3 meses ' + JSON.stringify(v1));
    ok(/hoy a un año/.test(await err('juanjosuecastilloloyola@gmail.com', "public.cfx_venta_guardar('{\"campana\": {\"modulos\": [\"chat\"], \"meses\": 3, \"hasta\": \"2020-01-01\"}}')")), 'CM: fecha pasada no se acepta');
    ok(/Solo|admin|permiso/i.test(await err('tienda@x.cl', "public.cfx_venta_guardar('{\"campana\": {}}')")), 'Un negocio no puede cambiar la campaña');

    // Negocio (base): ve el regalo y lo activa al tiro
    const td = await como('tienda@x.cl', 'public.cfx_modulos_tienda()');
    const ch = td.modulos.find((m) => m.clave === 'chat'), cu = td.modulos.find((m) => m.clave === 'cupones');
    ok(td.campana && td.campana.meses === 3 && ch.regalo === true && cu.regalo === false && !ch.activo, 'Negocio: chat 🎁 GRATIS 3 meses (cupones no) ' + JSON.stringify(td.campana));
    const r = await como('tienda@x.cl', "public.cfx_modulo_campana('chat')");
    const m1 = (await su("select origen, round(extract(epoch from hasta - now()) / 86400) d from cfx_modulos_negocio where modulo = 'chat'"))[0];
    ok(r.ok && m1.origen === 'regalo' && m1.d >= 88 && m1.d <= 93, '🎁 Activar: chat al tiro por 3 meses ' + JSON.stringify(m1));
    ok((await como('tienda@x.cl', "public.cfx_modulo_de('chat', auth.uid())")) === true, 'El negocio ya puede usar el chat');
    ok(/Ya activaste/.test(await err('tienda@x.cl', "public.cfx_modulo_campana('chat')")), 'Una sola vez por módulo');
    ok(/no está en la campaña/.test(await err('tienda@x.cl', "public.cfx_modulo_campana('cupones')")), 'Cupones (fuera de la campaña) no se regala');
    // Aviso 7 días antes de que venza el regalo
    await su("update cfx_modulos_negocio set hasta = now() + interval '6 days', avisado = null where modulo = 'chat'");
    await su('select public.cfx_modulos_avisar()');
    ok((await su("select avisado is not null a from cfx_modulos_negocio where modulo = 'chat'"))[0].a, '🔔 Regalo: aviso 7 días antes (pagados: 3 días)');

    // ⏹️ Terminar hoy desde el CM: se apaga; quien activó sigue
    await p.evaluate(() => { const d = [...document.querySelectorAll('dialog')].pop(); d.querySelector('#cFin').click(); }); await p.waitForTimeout(800);
    await p.click('dialog[open] [data-si]').catch(() => {}); await p.waitForTimeout(1500);
    const t2 = await p.evaluate(() => [...document.querySelectorAll('dialog')].pop().querySelector('#campCard').textContent);
    await su("delete from cfx_modulos_pruebas where item = 'campana:chat'");  // como si fuera otro negocio nuevo
    const td2 = await como('tienda@x.cl', 'public.cfx_modulos_tienda()');
    ok(/Terminó el/.test(t2) && !td2.campana && !td2.modulos.find((m) => m.clave === 'chat').regalo, '⏹️ Terminar hoy: la campaña se apaga y los nuevos ven el precio ' + JSON.stringify(t2.slice(0, 90)));
    ok(/terminó/.test(await err('tienda@x.cl', "public.cfx_modulo_campana('chat')")) && (await como('tienda@x.cl', "public.cfx_modulo_de('chat', auth.uid())")), 'Quien activó sigue con su regalo hasta su fecha');
    // Se apaga sola al pasar la fecha (sin cron)
    await su("update cfx_config set valor = jsonb_set(valor, '{campana}', jsonb_build_object('modulos', '[\"chat\"]'::jsonb, 'meses', 3, 'hasta', to_char((now() at time zone 'America/Santiago')::date, 'YYYY-MM-DD'))) where clave = 'modulos_venta'");
    const hoyOn = (await su('select public.cfx_campana() is not null x'))[0].x;
    await su("update cfx_config set valor = jsonb_set(valor, '{campana,hasta}', to_jsonb(to_char((now() at time zone 'America/Santiago')::date - 1, 'YYYY-MM-DD'))) where clave = 'modulos_venta'");
    ok(hoyOn && (await su('select public.cfx_campana() is null x'))[0].x, '📅 Activa hasta el día de término incluido; al día siguiente se apaga sola');
    ok(!(await su("select has_function_privilege('anon', 'public.cfx_modulo_campana(text)', 'execute') a"))[0].a, 'anon no puede activar regalos');
  } catch (x) { f++; console.log('✗ ERROR', x.message); await t.foto('g74b_error_cm').catch(() => {}); }
  await t.cerrar();

  // ---------- 2) BiciTaller: Más → 🧩 Módulos (320 px) ----------
  execSync(__dirname + '/base.sh /home/user/taller p_g74b', { stdio: 'ignore' });
  t = await abrir('/home/user/taller', 'p_g74b'); p = t.page; su = t.sim.su;
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    await su("update public.talleres set premium_hasta = now() - interval '1 day'");
    await su("update public.cfx_config set valor = valor || jsonb_build_object('activo', true, 'campana', jsonb_build_object('modulos', '[\"stock\", \"garantias\"]'::jsonb, 'meses', 3, 'hasta', to_char((now() at time zone 'America/Santiago')::date + 10, 'YYYY-MM-DD'))) where clave = 'modulos_venta'");
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await p.evaluate(() => { location.hash = 'mas/modulos'; }); await p.waitForTimeout(3000);
    const b0 = await p.evaluate(() => ({ camp: (document.querySelector('.cfxm-camp') || {}).textContent || '', tags: [...document.querySelectorAll('.cfxm-gratis')].map((x) => x.textContent),
      reg: [...document.querySelectorAll('[data-regalo]')].map((x) => x.dataset.regalo), primero: (document.querySelector('.cfxm-mods .cfxm-mod [data-regalo]') ? 1 : 0), ancho: document.documentElement.scrollWidth <= innerWidth + 1 }));
    await t.foto('g74b_taller_modulos');
    ok(/Lanzamiento: 2 módulos GRATIS por 3 meses/.test(b0.camp) && b0.tags.length === 2 && /GRATIS 3 meses/.test(b0.tags[0]) && b0.reg.sort().join() === 'garantias,stock' && b0.primero && b0.ancho,
      'BiciTaller: Más → 🧩 Módulos muestra 🎁 GRATIS 3 meses + 🎁 Activar gratis (primero, 320 px) ' + JSON.stringify(b0));
    await p.evaluate(() => document.querySelector('[data-regalo=stock]').scrollIntoView({ block: 'center' })); await p.click('[data-regalo=stock]'); await p.waitForTimeout(7000);  // la app recarga para prender el módulo
    await p.evaluate(() => { location.hash = 'mas/modulos'; }); await p.waitForTimeout(2500);
    const s1 = (await su("select origen from cfx_modulos_negocio where modulo = 'stock'"))[0];
    const b1 = await p.evaluate(() => ({ reg: [...document.querySelectorAll('[data-regalo]')].map((x) => x.dataset.regalo), txt: document.body.innerText }));
    ok(s1 && s1.origen === 'regalo' && b1.reg.join() === 'garantias' && /Regalo hasta el/.test(b1.txt), '🎁 Activar gratis: 📦 Stock activo al tiro y dice "🎁 Regalo hasta el…" ' + JSON.stringify(b1.reg));
    // La demo (▶️ Probar) también ofrece 🎁 Activar gratis
    await p.evaluate(() => document.querySelector('[data-probar=garantias]').click()); await p.waitForTimeout(1200);
    const dm = await p.evaluate(() => { const d = document.querySelector('dialog.cfxd[open]'); return d && [!!d.querySelector('[data-regalo]'), !d.querySelector('[data-comprar]')]; });
    await p.click('dialog.cfxd[open] [data-regalo]'); await p.waitForTimeout(7000);
    const g1 = (await su("select origen from cfx_modulos_negocio where modulo = 'garantias'"))[0];
    ok(dm && dm[0] && dm[1] && g1 && g1.origen === 'regalo', '▶️ Probar → 🎁 Activar gratis desde la demo ' + JSON.stringify(dm));
    await p.evaluate(() => { location.hash = 'mas/garantias'; }); await p.waitForTimeout(2500);
    ok(!(await p.locator('[data-ofrecer="garantias"]').count()), '🛡️ Garantías ya se puede usar (sin candado)');
  } catch (x) { f++; console.log('✗ ERROR', x.message); await t.foto('g74b_error_taller').catch(() => {}); }
  await t.cerrar();
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
