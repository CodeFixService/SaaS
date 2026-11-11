// G25 · Como Josué: Ajustes agrupado (Tu tienda / Vender más / Mi plan y módulos), 🌐 Mi dominio en su fila, despacho "Resto de Chile"
// guarda → recarga → sigue (B1), 🧾 Detalle de compra en Pedidos y en Mis pedidos del cliente (B4), Invita y gana → n/?ref (B3).
// Uso: node g25_ui.js [bd]  (antes ./base.sh /home/user/Aplicaciones <bd>)
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/Aplicaciones', process.argv[2] || 'p_g25');
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  try {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Codex' });
    await t.sim.su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Ana','client',$1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await t.sim.su('update public.profiles set terms_at = now()');
    const [{ id }] = await t.sim.su("select id from public.profiles where email = 'tienda@x.cl'");
    const [{ id: cid }] = await t.sim.su("select id from public.profiles where email = 'cli@x.cl'");
    await t.sim.su("update public.profiles set slug = 'codex', telefono = '56912345678' where id = $1", [id]);
    await t.sim.su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
    await t.sim.su("insert into public.pedidos (negocio_id, cliente_id, lineas, subtotal, total, entrega, direccion, estado) values ($1, $2, '[{\"nombre\":\"Polera\",\"cant\":2,\"precio\":5000,\"subtotal\":10000,\"clave\":\"p1\"}]', 10000, 10000, 'despacho', 'Calle 1, Ñuñoa', 'preparando')", [id, cid]);
    const q = t.page;
    await q.setViewportSize({ width: 360, height: 740 });
    const entrar = async (mail) => {
      await q.goto(t.base + '/'); await q.waitForTimeout(1200);
      await q.evaluate(() => { localStorage.clear(); localStorage.setItem('cfx:tour:orbita-inicio', '1'); });
      await q.goto(t.base + '/'); await q.waitForTimeout(1200);
      await q.fill('input[type=email]:visible', mail); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3000);
    };
    await entrar('tienda@x.cl');

    // 1) Menú de Ajustes agrupado.
    await q.goto(t.base + '/#ajustes'); await q.reload(); await q.waitForTimeout(3000); await t.sinModales(q);
    const txt0 = await q.evaluate(() => document.getElementById('miPerfil').innerText.toLowerCase()); const txt = txt0.slice(txt0.indexOf('tu tienda\n'));
    const orden = ['tu tienda', 'pagos', 'despacho', 'boletas', 'mi dominio', 'mi equipo', 'vender más', 'vender en redes', 'mi plan y módulos'].map((x) => txt.indexOf(x));
    ok(orden.every((n, i) => n >= 0 && (i === 0 || n > orden[i - 1])), 'Ajustes: Tu tienda (Pagos, Despacho, Boletas, Mi dominio, Equipo) · Vender más · Mi plan y módulos ' + JSON.stringify(orden));
    ok(!/^módulos$/m.test(txt) && !txt.includes('boleta sii\n'), 'sin fila suelta de Módulos ni "Boleta SII"');
    await t.foto('g25-ajustes', q);

    // 2) 🌐 Mi dominio: su propia hoja.
    await q.goto(t.base + '/#dominio'); await q.reload(); await q.waitForTimeout(3000);
    const dm = await q.evaluate(() => { const b = document.getElementById('dominioBody'); return b && b.offsetParent ? b.innerText : ''; });
    ok(/Hoy tu tienda está en/.test(dm) && /(Ver módulo|Tu dominio)/.test(dm), '#dominio abre Mi dominio con el link de hoy ' + JSON.stringify(dm.slice(0, 80)));
    ok(await q.evaluate(() => !document.getElementById('redesBody').innerText.includes('Dominio propio')), 'Vender en redes ya no trae el dominio');
    await t.foto('g25-dominio', q);
    await t.sim.su("insert into public.cfx_modulos_negocio (negocio, modulo, origen, hasta) values ($1, 'dominio', 'pago', now() + interval '30 days') on conflict do nothing", [id]);
    await q.reload(); await q.waitForTimeout(3000);
    await q.fill('#mdDom', 'mitienda.cl'); await q.click('#dominioBody [data-rd="dominio"]'); await q.waitForTimeout(1500);
    await q.reload(); await q.waitForTimeout(3000);
    ok(await q.evaluate(() => document.getElementById('mdDom') && document.getElementById('mdDom').value === 'mitienda.cl'), 'dominio guardado → recarga → sigue');

    // 3) Mi plan y módulos: una sola hoja, Free arriba y módulos aparte; ▶️ Probar sin prueba gratis.
    await q.goto(t.base + '/#modulos'); await q.reload(); await q.waitForTimeout(3500);
    const pl = await q.evaluate(() => { const p = document.getElementById('cPlan'), m = document.getElementById('modTienda'); return [!!p.offsetParent, p.contains(m), !!m.querySelector('[data-probar]'), !document.getElementById('planFree').classList.contains('hidden')]; });
    ok(pl.every(Boolean), '#modulos → Mi plan con Free y 🧩 Módulos dentro ' + JSON.stringify(pl));
    await q.evaluate(() => document.querySelector('#modTienda [data-probar]').click()); await q.waitForTimeout(600);
    ok(await q.evaluate(() => !!document.querySelector('dialog.cfxd') && !document.querySelector('dialog.cfxd [data-gratis]') && !!document.querySelector('dialog.cfxd [data-comprar]')), '▶️ Probar: ejemplo + Comprar, sin 🎁 gratis');
    await t.foto('g25-plan-modulos', q);
    await q.click('dialog.cfxd .cfxd-x');

    // 4) B1 despacho resto de Chile: guarda → recarga → sigue.
    await q.goto(t.base + '/#despacho'); await q.reload(); await q.waitForTimeout(3000);
    await q.selectOption('#dResto', 'fijo'); await q.fill('#dRestoPrecio', '6990');
    await q.evaluate(() => [...document.querySelectorAll('#despachoBody button')].find((b) => /Guardar/.test(b.textContent)).click()); await q.waitForTimeout(1500);
    await q.reload(); await q.waitForTimeout(3000);
    const rs = await q.evaluate(() => [document.getElementById('dResto').value, document.getElementById('dRestoPrecio').value]);
    ok(rs[0] === 'fijo' && rs[1] === '6990', 'Resto de Chile: guardar → recargar → sigue ' + JSON.stringify(rs));

    // 5) B4 Pedidos: 🧾 Detalle de compra (y 📷 Foto del pago aparte).
    await q.goto(t.base + '/apps/pedidos/'); await q.waitForTimeout(3000); await t.sinModales(q);
    const bt = await q.evaluate(() => [...document.querySelectorAll('#lista button')].map((b) => b.textContent.trim()));
    ok(bt.some((x) => /Detalle de compra/.test(x)) && !bt.some((x) => /^.?.?\s*Comprobante$/.test(x)) && bt.some((x) => /Seguimiento/.test(x)), 'Pedidos: 🧾 Detalle de compra y 🚚 Seguimiento ' + JSON.stringify(bt));
    await q.evaluate(() => document.querySelector('[data-recibo]').click()); await q.waitForTimeout(400);
    const dc = await q.evaluate(() => { const d = document.querySelector('.cfx-comp'); return d ? d.innerText : ''; });
    ok(/Detalle de compra/.test(dc) && /2 × Polera/.test(dc) && /No es boleta electrónica/.test(dc), 'Detalle de compra con productos (sin folio: "no es boleta") ');
    await t.foto('g25-detalle-negocio', q);
    await t.sim.su("update public.pedidos set boleta_folio = '1234', boleta_url = 'https://ejemplo.cl/b.pdf', boleta_at = now() where negocio_id = $1", [id]);

    // 6) Cliente: Mis pedidos → 🧾 Detalle de compra con N° de boleta.
    await entrar('cli@x.cl');
    await q.goto(t.base + '/apps/catalogo/?v=pedidos'); await q.waitForTimeout(3500); await t.sinModales(q);
    const hay = await q.evaluate(() => !!document.querySelector('[data-det]'));
    if (hay) {
      await q.evaluate(() => document.querySelector('[data-det]').click()); await q.waitForTimeout(400);
      const dk = await q.evaluate(() => { const d = document.querySelector('.cfx-comp'); return d ? [d.innerText, !d.querySelector('#compTel')] : ['', false]; });
      ok(/Detalle de compra/.test(dk[0]) && /N° 1234/.test(dk[0]) && dk[1], 'cliente: Detalle de compra con boleta N° 1234 y sin WhatsApp ' + JSON.stringify(dk[0].slice(0, 60)));
      await t.foto('g25-detalle-cliente', q);
    } else ok(false, 'cliente: no aparece 🧾 Detalle de compra en Mis pedidos');

    // 7) B3 Invita y gana: el link lleva a n/ (crear tienda), no al ingreso.
    const ln = await q.evaluate(() => (window.CFX_REF_RUTA || ''));
    ok(ln === 'n/', 'Invita y gana → ' + t.base + '/' + ln + '?ref=…');
    await q.goto(t.base + '/n/?ref=ABCD12'); await q.waitForTimeout(2000);
    ok(await q.evaluate(() => localStorage.getItem('cfx-ref') === 'ABCD12' && !!document.getElementById('rTerm')), 'n/?ref guarda el código y muestra el registro de tienda');
    const errs = t.errores.filter((e) => !/fichapro\.json|favicon/.test(e));
    ok(!errs.length, 'sin errores de consola ' + JSON.stringify(errs.slice(0, 5)));
  } catch (e) { console.log('✗ ' + e.stack); process.exitCode = 1; }
  await t.cerrar();
})();
