// Análisis final Despega (como Josué, 360 px): venta de punta a punta + todos los botones de cada pantalla.
// 1) Negocio crea un producto en Caja → Productos (UI) · 2) vende en Caja · 3) público compra en la vitrina /t/ · 4) el pedido llega a Pedidos,
// el negocio lo avanza y el seguimiento /r/ lo muestra · 5) cliente invitado ve Tienda/Pedidos/Mensajes · 6) en cada pantalla toca CADA botón
// visible y anota errores de JS o cosas que se salen del ancho.  node final_apl.js  → capturas/final_apl/ + informe
const { abrir } = require('./h');
const fs = require('fs');
const res = []; const ok = (c, m) => { res.push((c ? '✅ ' : '❌ ') + m); console.log((c ? 'ok ' : 'FALLA ') + m); };
const PANT = ['/', '/#tienda', '/#links', '/#equipo', '/#despacho', '/#boleta', '/#redes', '/#modulos', '/#plan', '/#ajustes', '/#avisos',
  '/apps/caja/', '/apps/caja/#productos', '/apps/pedidos/', '/apps/pedidos/?v=stats', '/apps/pedidos/?v=cupones', '/apps/fichas/', '/apps/fichas/#clientes',
  '/apps/mensajes/', '/apps/contactos/', '/apps/legal/'];
const PANT_CLI = ['/', '/apps/catalogo/', '/apps/pedidos/', '/apps/mensajes/'];
const PELIGRO = /eliminar|borrar|cerrar sesi|salir|cancelar pedido|limpiar|restaurar|quitar|darme de baja|✕$/i;

async function entrar(t, p, email, pass) {
  await p.goto(t.base + '/'); await p.waitForTimeout(800);
  await p.evaluate(() => { localStorage.setItem('cfx:tour:orbita-inicio', '1'); });
  await p.fill('input[type=email]:visible', email); await p.fill('input[type=password]:visible', pass); await p.press('input[type=password]:visible', 'Enter');
  await p.waitForTimeout(3000); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
}
// Toca cada botón visible de la pantalla (uno por carga) y junta lo que se rompe.
async function botones(t, p, url, quien) {
  const malos = [];
  await p.goto(t.base + url); await p.waitForTimeout(1800); await t.sinModales(p);
  const n = await p.evaluate((re) => { const R = new RegExp(re, 'i'); let i = 0;
    document.querySelectorAll('button, [role=button], summary').forEach((b) => { const r = b.getBoundingClientRect(), tx = (b.textContent || b.getAttribute('aria-label') || '').trim();
      if (r.width > 0 && r.height > 0 && !b.disabled && !R.test(tx) && !b.closest('.cfx-barra,nav.cfx-barra')) b.dataset.fin = i++; }); return i; }, PELIGRO.source);
  for (let i = 0; i < n; i++) {
    const antes = t.errores.length;
    // Solo recarga si el botón anterior cambió de página o dejó algo abierto que no se cierra.
    const sucio = i && (p.url() !== t.base + url || !(await p.locator('[data-fin="' + i + '"]').isVisible().catch(() => false)));
    if (i) { await p.keyboard.press('Escape').catch(() => {}); await t.sinModales(p).catch(() => {}); }
    if (sucio) { await p.goto(t.base + url).catch(() => {}); await p.waitForTimeout(1100); await t.sinModales(p);
      await p.evaluate((re) => { const R = new RegExp(re, 'i'); let k = 0; document.querySelectorAll('button, [role=button], summary').forEach((b) => { const r = b.getBoundingClientRect(), tx = (b.textContent || b.getAttribute('aria-label') || '').trim();
        if (r.width > 0 && r.height > 0 && !b.disabled && !R.test(tx) && !b.closest('.cfx-barra,nav.cfx-barra')) b.dataset.fin = k++; }); }, PELIGRO.source); }
    const b = p.locator('[data-fin="' + i + '"]').first();
    const tx = ((await b.textContent().catch(() => '')) || (await b.getAttribute('aria-label').catch(() => '')) || '?').trim().replace(/\s+/g, ' ').slice(0, 40);
    try { await b.click({ timeout: 2000 }); } catch (e) { continue; }
    await p.waitForTimeout(450);
    const nuevos = t.errores.slice(antes).filter((x) => !/ERR_|status of 404|favicon/.test(x));
    const ancho = await t.anchoOk(p).catch(() => true);
    if (nuevos.length || !ancho) malos.push('"' + tx + '": ' + (nuevos[0] || 'se sale del ancho').slice(0, 160));
  }
  ok(!malos.length, quien + ' ' + url + ' · ' + n + ' botones' + (malos.length ? ' → ' + malos.join(' | ') : ''));
}

module.exports = { botones, res, ok };
if (require.main === module) (async () => {
  const t = await abrir('/home/user/Aplicaciones', 'p_aplicaciones');
  const p = t.page;
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Pepe','client',$1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await t.sim.su("update public.profiles set terms_at = now()");
    await t.sim.su("update public.profiles set slug = 'ana', telefono = '56912345678', despacho = $2, perfil = $3 where id = $1",
      [u.id, JSON.stringify({ retiro: true, gratis_desde: 0, zonas: [{ comuna: 'Ñuñoa', precio: 2500 }], resto: { modo: 'fijo', precio: 6000 } }), JSON.stringify({ rut: '76123456-0', razon: 'Ana SpA', cambios: 'Cambios 30 días.' })]);

    // 1) Producto nuevo desde Caja → Productos
    await entrar(t, p, 'tienda@x.cl', 'clave123');
    await p.goto(t.base + '/apps/caja/#productos'); await p.waitForTimeout(2000); await t.sinModales();
    await p.fill('#p-nombre', 'Taza mágica'); await p.fill('#p-precio', '7990'); await p.fill('#p-stock', '5'); await p.fill('#p-cat', 'Tazas');
    await p.click('#bGuardarProd'); await p.waitForTimeout(2000);
    const [it] = await t.sim.su("select client_key, precio::int, stock from public.catalog_items where nombre = 'Taza mágica'");
    ok(it && it.precio === 7990, 'Caja → Productos: crear producto lo publica en la tienda ' + JSON.stringify(it));
    await t.foto('final-productos');
    // 2) Venta en Caja
    await p.click('nav.tabs button[data-v="vender"]').catch(() => {}); await p.waitForTimeout(800);
    await p.locator('#prods .prod', { hasText: 'Taza mágica' }).first().click(); await p.waitForTimeout(400);
    await p.click('#bCobrar'); await p.waitForTimeout(2500);
    const [st] = await t.sim.su("select stock from public.catalog_items where nombre = 'Taza mágica'");
    ok(st && st.stock === 4, 'Caja: vender 1 descuenta el stock del servidor (5 → ' + (st && st.stock) + ')');
    ok(await p.evaluate(() => !document.getElementById('bComp').hidden), 'Caja: después de cobrar aparece 🧾 Comprobante');
    await t.foto('final-caja');

    // 3) Público compra en la vitrina
    const { page: v } = await t.nuevo();
    await v.goto(t.base + '/t/?s=ana'); await v.waitForTimeout(2500);
    ok(await v.locator('text=Taza mágica').count() > 0, 'Vitrina /t/?s=ana muestra el producto');
    await v.click('[data-add="' + it.client_key + '"]'); await v.click('.seg [data-t="pedido"]'); await v.waitForTimeout(400);
    await v.fill('#nom', 'Lucía'); await v.fill('#tel', '56922222222'); await v.fill('#mail', 'lucia@correo.cl');
    await t.foto('final-vitrina-pedido', v);
    await v.click('#bPedir'); await v.waitForURL(/\/r\/\?t=/, { timeout: 8000 }).catch(() => {}); await v.waitForTimeout(2000);
    const [ped] = await t.sim.su("select id, estado, total::int from public.pedidos where invitado_nombre = 'Lucía'");
    ok(ped && ped.total === 7990, 'Vitrina: pedido creado y abre el seguimiento ' + JSON.stringify(ped) + ' ' + v.url().replace(t.base, ''));
    await t.foto('final-seguimiento', v);

    // 4) Pedido en Pedidos → avanzar estado
    await p.goto(t.base + '/apps/pedidos/'); await p.waitForTimeout(2500); await t.sinModales();
    ok(await p.locator('text=Lucía').count() > 0, 'Pedidos: el negocio ve el pedido de la vitrina');
    const sig = p.locator('[data-e]:not([data-e="cancelado"])').first();
    const est = await sig.getAttribute('data-e').catch(() => null);
    if (est) { await sig.click(); await p.waitForTimeout(1500); }
    const [ped2] = await t.sim.su('select estado from public.pedidos where id = $1', [ped && ped.id]);
    ok(est && ped2 && ped2.estado === est, 'Pedidos: botón de siguiente estado cambia el pedido (' + (ped && ped.estado) + ' → ' + (ped2 && ped2.estado) + ')');
    await v.reload(); await v.waitForTimeout(2000); await t.foto('final-seguimiento-2', v);
    await t.foto('final-pedidos');

    // 6) Cada botón de cada pantalla (negocio)
    for (const url of PANT) await botones(t, p, url, 'Negocio');
    // 5) Cliente invitado
    const { page: c } = await t.nuevo();
    await entrar(t, c, 'cli@x.cl', 'clave123');
    for (const url of PANT_CLI) await botones(t, c, url, 'Cliente');
    // Público
    for (const url of ['/t/?s=ana', '/n/']) await botones(t, v, url, 'Público');
  } catch (e) { ok(false, 'se cortó: ' + e.message.split('\n')[0]); await t.foto('final-error'); }
  const err = t.errores.filter((x) => !/ERR_|status of 404|favicon/.test(x));
  fs.writeFileSync(__dirname + '/capturas/final_apl.txt', res.join('\n') + '\n\nERRORES JS:\n' + ([...new Set(err)].join('\n') || 'ninguno') + '\n');
  console.log('\n' + res.join('\n') + '\nERRORES:', [...new Set(err)].slice(0, 20).join('\n') || 'ninguno');
  await t.cerrar();
})();
