// G42f · Despega: cada tienda pone SU Gmail (Mi tienda → ✉️ Correo) y lo que manda a SUS clientes sale con él; lo de CodeFix, con el de Control.
// La clave nunca vuelve a la pantalla ni se puede leer desde la app. FALLA con el código viejo.
// Uso: ./base.sh /home/user/Aplicaciones g42f_apl2 && ANCHO=320 node g42f_apl.js
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const N = 'tienda@x.cl';
(async () => {
  const t = await abrir('/home/user/Aplicaciones', 'g42f_apl2'); const p = t.page;
  await t.ctx.addInitScript(() => { try { localStorage.setItem('cfx:tour:orbita-inicio', '1'); } catch (e) { /* */ } });
  // Más → 🏪 Mi tienda (como lo abre Josué)
  const tienda = async () => { await p.goto(t.base + '/#tienda'); await p.waitForTimeout(2000); if (!(await p.locator('#cTienda').isVisible())) { await t.sinModales(); await p.click('.cfx-aj [data-k=tienda]'); await p.waitForTimeout(1200); } await p.locator('#dCorreo summary').scrollIntoViewIfNeeded(); };
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    await t.sim.crearUsuario(N, 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.su('update public.profiles set terms_at = now()');
    await p.goto(t.base + '/'); await p.fill('input[type=email]', N); await p.fill('input[type=password]', 'clave123'); await p.press('input[type=password]', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(); await tienda();
    await p.click('#dCorreo summary'); await p.waitForTimeout(300);
    assert(/sin configurar/.test(await p.textContent('#coEst')), 'Mi tienda → ✉️ Correo: sin configurar');
    await p.fill('#coU', 'ana.tienda@gmail.com'); await p.fill('#coP', 'abcd efgh ijkl'); await p.click('#bCorreo'); await p.waitForTimeout(1200);
    assert(!(await t.sim.su('select count(*)::int n from public.negocio_correo'))[0].n, 'Clave corta: no se guarda');
    await p.fill('#coP', 'abcd efgh ijkl mnop'); await p.fill('#coN', 'Tienda Ana'); await p.click('#bCorreo'); await p.waitForTimeout(1500);
    await p.reload(); await p.waitForTimeout(2500); await t.sinModales(); await tienda(); await p.click('#dCorreo summary'); await p.waitForTimeout(300);
    const v = await p.evaluate(() => ({ est: document.getElementById('coEst').textContent, clave: document.getElementById('coP').value, quitar: !document.getElementById('bCorreoX').classList.contains('hidden') }));
    assert(/a•••@gmail\.com/.test(v.est) && !v.clave && v.quitar, 'Tras recargar: ✅ a•••@gmail.com (tapado) y sin la clave ' + JSON.stringify(v));
    await p.locator('#dCorreo').scrollIntoViewIfNeeded(); await t.foto('g42f_tienda_correo');
    assert(await t.anchoOk(), 'Mi tienda sin salirse en ' + (process.env.ANCHO || 'normal'));
    const priv = await t.sim.su("select has_table_privilege('authenticated', 'public.negocio_correo', 'select') a, has_function_privilege('authenticated', 'public.notif_correo(uuid)', 'execute') b, has_function_privilege('anon', 'public.mi_correo_guardar(text,text,text)', 'execute') c");
    assert(!priv[0].a && !priv[0].b && !priv[0].c, 'Nadie lee la clave desde la app ' + JSON.stringify(priv));
    // Con qué Gmail sale cada notificación
    await t.sim.su("insert into public.app_secrets (name, value) values ('gmail_user', 'codefix@gmail.com'), ('gmail_app_password', 'zzzzzzzzzzzzzzzz') on conflict (name) do update set value = excluded.value");
    await t.sim.su("insert into public.notifications (owner_id, audience, channels, title) select id, case when role = 'admin' then 'all_businesses' else 'correo' end, '{email}', case when role = 'admin' then 'y' else 'x' end from public.profiles where role in ('user', 'admin')");
    const r = await t.sim.su("select public.notif_correo((select id from public.notifications where title = 'x')) neg, public.notif_correo((select id from public.notifications where title = 'y')) adm");
    assert(r[0].neg.usuario === 'ana.tienda@gmail.com' && r[0].neg.propio && r[0].neg.nombre === 'Tienda Ana', 'Lo de la tienda sale con SU Gmail ' + JSON.stringify(r[0].neg));
    assert(r[0].adm.usuario === 'codefix@gmail.com' && !r[0].adm.propio, 'Lo de CodeFix sale con el Gmail de Control');
    // Quitar → ya no hay correo para sus clientes (nunca cae al de CodeFix)
    await p.click('#bCorreoX'); await p.waitForTimeout(1500);
    const q = await t.sim.su("select public.notif_correo(id) c from public.notifications where title = 'x'");
    assert(q[0].c === null && /sin configurar/.test(await p.textContent('#coEst')), 'Sin su Gmail no usa el de CodeFix');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|workers\.dev/.test(x)).join('\n') || 'ninguno');
  await t.cerrar();
})();
