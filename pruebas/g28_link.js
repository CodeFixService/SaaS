// G28 · M2 💳 UN link de pago abierto (sin monto) para Premium, módulos y packs: se ve el total con 📋 Copiar monto y el botón abre ESE link.
// Si hay link de monto fijo para ese plan, se usa ese. Si un plan no tiene link, no queda un botón vacío.
// Uso: node g28_link.js [bd]  (antes ./base.sh /home/user/Aplicaciones <bd>)
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/Aplicaciones', process.argv[2] || 'p_g28');
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  const ABIERTO = 'https://link.mercadopago.cl/abierto', FIJO = 'https://mpago.la/chat-mes';
  try {
    await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Codex' }); await t.sim.su('update public.profiles set terms_at = now()');
    const [{ id }] = await t.sim.su("select id from public.profiles where email = 'tienda@x.cl'");
    await t.sim.su("update public.profiles set slug = 'codex', telefono = '56912345678', plan = 'free', pro_until = null where id = $1", [id]);  // Free: sin descuento Premium (con descuento el link fijo no calza y no se usa)
    await t.sim.su("update public.cfx_config set valor = valor || '{\"activo\": true, \"precio\": 1000}' where clave = 'modulos_venta'");
    // Como lo deja Josué: SOLO el link abierto (sin links fijos ni transferencia ni tarjeta), cargo online 5 %.
    await t.sim.su(`update public.cfx_config set valor = (valor - 'transferencia' - 'tarjeta') || jsonb_build_object('link', $1::text, 'comision_pct', 5,
      'negocio', (valor->'negocio') - 'link_mensual' - 'link_3meses' - 'link_anual' || '{"mensual": 2000, "anual": 22000}') where clave = 'pagos'`, [ABIERTO]);
    const q = t.page;
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.evaluate(() => localStorage.setItem('cfx:tour:orbita-inicio', '1'));
    await q.fill('input[type=email]:visible', 'tienda@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3000);

    const leer = () => q.evaluate(() => {
      const d = document.querySelector('dialog.cfx-pago'); if (!d || !d.open) return null;
      const a = d.querySelector('a.cp-btn');
      return { titulo: d.querySelector('h2').textContent, href: a ? a.getAttribute('href') : null, copiar: !!d.querySelector('[data-copiar]'),
        total: (d.querySelector('#cpMonto') || {}).textContent, foto: !!d.querySelector('#cpFoto'), err: (d.querySelector('.cp-caja .cp-err') || {}).textContent || '' };
    });
    const cerrarPago = () => q.evaluate(() => { const d = document.querySelector('dialog.cfx-pago'); if (d) { d.close(); d.remove(); } });
    const comprarChat = async () => {
      await q.goto(t.base + '/apps/mensajes/'); await q.waitForTimeout(2500); await t.sinModales(q);
      await q.click('.cfxk button'); await q.waitForTimeout(400); await q.click('dialog.cfxd [data-comprar]'); await q.waitForTimeout(1500);
    };

    // 1) Módulo (Chat) solo con el link abierto: total con cargo 5 % ($1.050), 📋 Copiar monto, botón al link abierto y comprobante.
    await comprarChat();
    let p = await leer();
    ok(p && p.titulo.includes('Chat') && p.href === ABIERTO && p.copiar && p.foto && p.total === '$1.050', 'módulo → link abierto con monto y 📋 Copiar ' + JSON.stringify(p));
    await t.foto('g28-modulo-abierto', q);
    await cerrarPago();

    // 2) Premium con el mismo link abierto.
    await q.goto(t.base + '/'); await q.waitForTimeout(2500); await t.sinModales(q);
    await q.evaluate(() => document.querySelector('.cfx-cab .cfx-plan').click());  // el botón del plan (arriba, junto a la cuenta)
    await q.waitForTimeout(1500);
    p = await leer();
    ok(p && p.titulo.includes('Premium') && p.href === ABIERTO && p.copiar && p.total === '$2.100', 'Premium → el mismo link abierto con el total ' + JSON.stringify(p));
    await t.foto('g28-premium-abierto', q);
    await cerrarPago();

    // 3) Si el módulo tiene link de monto fijo (1 mes), se usa ese; el anual sigue con el abierto.
    await t.sim.su("update public.cfx_config set valor = valor || jsonb_build_object('links', jsonb_build_object('chat', jsonb_build_object('m', $1::text))) where clave = 'modulos_venta'", [FIJO]);
    await comprarChat();
    p = await leer();
    ok(p && p.href === FIJO, '1 mes con link fijo → usa el fijo ' + JSON.stringify(p && p.href));
    await q.click('dialog.cfx-pago .cp-plan[data-p="1"]'); await q.waitForTimeout(300);
    p = await leer();
    ok(p && p.href === ABIERTO, '1 año sin link fijo → link abierto ' + JSON.stringify(p && p.href));
    await cerrarPago();

    // 4) Sin link abierto y el plan sin link fijo: nada de botón vacío, aviso claro.
    await t.sim.su("update public.cfx_config set valor = valor - 'link' where clave = 'pagos'");
    await comprarChat();
    await q.click('dialog.cfx-pago .cp-plan[data-p="1"]'); await q.waitForTimeout(300);
    p = await leer();
    ok(p && p.href === null && /no tiene link/.test(p.err), 'plan sin link → sin botón vacío y aviso ' + JSON.stringify(p));
    await t.foto('g28-sin-link', q);

    const err = t.errores.filter((m) => !/409|respaldo/i.test(m));
    ok(!err.length, 'sin errores de consola ' + JSON.stringify(err.slice(0, 3)));
  } catch (e) { console.log('✗ ' + e.stack); process.exitCode = 1; }
  await t.cerrar();
})();
