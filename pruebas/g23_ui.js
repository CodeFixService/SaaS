// G23 · Lanzamiento de la tienda: políticas, despacho a todo Chile, correo del comprador, seguimiento y medir/dominio en Ajustes.
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/Aplicaciones', process.argv[2] || 'p_g23ui');
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  try {
    await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' }); await t.sim.su('update public.profiles set terms_at = now()');
    const [{ id }] = await t.sim.su("select id from public.profiles where email = 'tienda@x.cl'");
    await t.sim.su("update public.profiles set slug = 'ana', telefono = '56912345678', plan = 'pro', pro_until = now() + interval '30 days', despacho = $2, perfil = $3 where id = $1",
      [id, JSON.stringify({ retiro: true, gratis_desde: 0, zonas: [{ comuna: 'Ñuñoa', precio: 2500 }], resto: { modo: 'fijo', precio: 6000 } }), JSON.stringify({ rut: '11111111-1', razon: 'Ana SpA', cambios: 'Cambios hasta 30 días con boleta.' })]);
    await t.sim.su("insert into public.app_secrets (name, value) values ('gmail_user', 'x@gmail.com') on conflict (name) do update set value = excluded.value");
    await t.sim.su("insert into public.catalog_items (owner_id, client_key, nombre, precio, stock) values ($1, 'pol', 'Polera estampada de algodón orgánico', 12990, 10)", [id]);
    const p = t.page;
    await p.goto(t.base + '/t/?s=ana'); await p.waitForTimeout(2500);
    const pol = await p.evaluate(() => { const d = document.getElementById('politicas'); return d && [d.textContent.includes('10 días'), d.textContent.includes('6 meses'), d.textContent.includes('RUT 11111111-1'), d.textContent.includes('30 días con boleta')]; });
    ok(pol && pol.every(Boolean), 'políticas en la vitrina ' + JSON.stringify(pol));
    await p.click('[data-add="pol"]'); await p.click('.seg [data-t="pedido"]'); await p.waitForTimeout(300);
    await p.click('#lPol'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.getElementById('politicas').open), 'link "políticas de la tienda" abre las políticas');
    await p.click('.seg [data-t="pedido"]'); await p.click('[data-e="despacho"]');
    await p.selectOption('#dComuna', '__otra'); await p.selectOption('#dRegion', 'Biobío'); await p.fill('#dOtra', 'Concepción');
    const costo = await p.textContent('#dCosto');
    ok(/6\.000/.test(costo), 'despacho a regiones con precio fijo: ' + costo.trim());
    await t.foto('g23-pedido-regiones');
    await p.fill('#nom', 'Lucía Pérez'); await p.fill('#tel', '56922222222'); await p.fill('#mail', 'lucia@correo.cl'); await p.fill('#dir', 'Barros Arana 123');
    await p.click('#bPedir'); await p.waitForURL(/\/r\/\?t=/, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(2000);
    const [ped] = await t.sim.su("select id, token, costo_despacho, direccion, invitado_correo, total from public.pedidos where invitado_nombre = 'Lucía Pérez'");
    ok(ped && +ped.costo_despacho === 6000 && /Región Biobío, Concepción$/.test(ped.direccion) && ped.invitado_correo === 'lucia@correo.cl', 'pedido a regiones con correo ' + JSON.stringify(ped && [ped.costo_despacho, ped.direccion, ped.invitado_correo]));
    const [c1] = await t.sim.su("select count(*)::int n from public.notifications where audience = 'correo' and email_directo = 'lucia@correo.cl'");
    ok(c1.n === 1, 'correo "recibimos tu pedido" en cola: ' + c1.n);
    ok(await p.evaluate(() => document.getElementById('cCorreo').classList.contains('hidden')), 'r/ no vuelve a pedir el correo');
    // La tienda anota el seguimiento en Pedidos
    const { page: q } = await t.nuevo(); await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.evaluate(() => localStorage.setItem('cfx:tour:orbita-inicio', '1'));
    await q.fill('input[type=email]:visible', 'tienda@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3000);
    await q.goto(t.base + '/apps/pedidos/'); await q.waitForTimeout(2500); await t.sinModales(q);
    const hay = await q.$('[data-env]');
    ok(!!hay, 'Pedidos: botón 🚚 Seguimiento');
    q.removeAllListeners('dialog'); q.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'ab 98765' : undefined));
    await q.click('[data-env]'); await q.waitForTimeout(300);
    await q.click('.elegir button:has-text("Starken")'); await q.waitForTimeout(2500);
    const [e2] = await t.sim.su("select estado, envio_codigo from public.pedidos where id = $1", [ped.id]);
    ok(e2.estado === 'en_camino' && e2.envio_codigo === 'AB98765', 'seguimiento guardado y pedido en camino ' + JSON.stringify(e2));
    const txt = await q.evaluate((i) => document.querySelector('[data-ped="' + i + '"]').textContent, ped.id);
    ok(txt.includes('Starken') && txt.includes('AB98765'), 'la tienda ve el courier y el código');
    await t.foto('g23-pedidos-seguimiento', q);
    await p.reload(); await p.waitForTimeout(2000);
    const env = await p.evaluate(() => [!document.getElementById('cEnvio').classList.contains('hidden'), (document.querySelector('#envio a') || {}).href]);
    ok(env[0] && /starken\.cl\/seguimiento\?codigo=AB98765/.test(env[1]), 'el comprador ve "Seguir mi envío" ' + JSON.stringify(env));
    await t.foto('g23-r-envio');
    const [c2] = await t.sim.su("select count(*)::int n from public.notifications where audience = 'correo' and title like '🚚%'");
    ok(c2.n === 1, 'correo "va en camino" con el código');
    // Ajustes: políticas en el perfil + medir anuncios y dominio (Pro)
    await q.goto(t.base + '/#redes'); await q.waitForTimeout(3000);
    const aj = await q.evaluate(() => [!!document.getElementById('mdMeta'), !!document.getElementById('mdDom')]);
    ok(aj.every(Boolean), 'Ajustes → Vender en redes: medir anuncios y dominio ' + JSON.stringify(aj));
    await q.fill('#mdMeta', '123456789012'); await q.fill('#mdGa', 'G-AB12CD34'); await q.click('[data-rd="medir"]'); await q.waitForTimeout(1200);
    await q.fill('#mdDom', 'mitienda.cl'); await q.click('[data-rd="dominio"]'); await q.waitForTimeout(1200);
    const [m] = await t.sim.su('select medicion, dominio from public.profiles where id = $1', [id]);
    ok(m.medicion.meta === '123456789012' && m.medicion.ga === 'G-AB12CD34' && m.dominio === 'mitienda.cl', 'medición y dominio guardados ' + JSON.stringify(m));
    await t.foto('g23-redes', q);
    await q.goto(t.base + '/#despacho'); await q.waitForTimeout(2500);
    ok(await q.evaluate(() => document.getElementById('dResto') && document.getElementById('dResto').value === 'fijo'), 'Ajustes → Despacho: resto de Chile');
    await t.foto('g23-despacho', q);
    await q.goto(t.base + '/#ajustes'); await q.waitForTimeout(2500);
    ok(await q.evaluate(() => !!document.querySelector('#tPerfil [data-pf="rut"]') && !!document.querySelector('#tPerfil [data-pf="sin_retracto"]')), 'Ajustes → Mi tienda: campos de políticas');
    await q.emulateMedia({ colorScheme: 'dark' }); await q.goto(t.base + '/#redes'); await q.waitForTimeout(2500); await t.foto('g23-redes-oscuro', q);
    const errs = t.errores.filter((e) => !/fichapro\.json|favicon/.test(e));
    ok(!errs.length, 'sin errores de consola ' + JSON.stringify(errs.slice(0, 5)));
  } catch (e) { console.log('✗ ' + e.stack); process.exitCode = 1; }
  await t.cerrar();
})();
