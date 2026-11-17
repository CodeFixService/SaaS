// G91 g · 🚲 BiciTaller 🛒 Tienda (con el módulo 📦 Repuestos y stock): ✏️ repuesto → 🛒 Mostrar en mi tienda (tipo, descripción, foto)
// → sale en /t/ con carrito → 📲 Pedir por WhatsApp con el detalle y total. Sin módulo no sale. FALLA con el código viejo (no existen #rT ni tienda_publica).
// Uso: ./base.sh /home/user/taller p_g91g && ANCHO=320 node g91g_tienda.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g91g');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const como = async (expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = 'taller@x.cl'), true)) x", args || []))[0].r;
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su("update public.perfiles set terminos_at = now()").catch(() => {});
    await su("update public.talleres set telefono = '+56955556666'");
    const dueno = (await su("select id from auth.users where email = 'taller@x.cl'"))[0].id, slug = (await su('select slug from public.talleres'))[0].slug;
    await su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
    await su("insert into public.cfx_modulos_negocio (negocio, modulo, hasta) values ($1, 'stock', now() + interval '30 days')", [dueno]);
    await como(`public.taller_repuesto_guardar('{"nombre":"Casco Giro","precio":25000,"stock":2,"minimo":0}')`);
    await como(`public.taller_repuesto_guardar('{"nombre":"Luz trasera","precio":8000,"stock":10,"minimo":0,"tienda":true,"tipo":"accesorio"}')`);

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await p.evaluate(() => { location.hash = 'mas/stock'; }); await p.waitForTimeout(2500);
    const id = (await su("select id from public.repuestos where nombre = 'Casco Giro'"))[0].id;
    await p.locator('[data-ed="' + id + '"]:visible').click(); await p.waitForTimeout(800);
    await p.check('dialog[open] #rT'); await p.selectOption('dialog[open] #rTp', 'accesorio'); await p.fill('dialog[open] #rDe', 'Talla M, negro');
    await p.setInputFiles('dialog[open] #rFi', __dirname + '/bici.png'); await p.waitForTimeout(1200);
    await t.foto('g91g_editar');
    await p.click('dialog[open] #rG'); await p.waitForTimeout(2000);
    const r = (await su("select tienda, tipo, descripcion, foto is not null f, stock from public.repuestos where id = $1", [id]))[0];
    ok(r.tienda && r.tipo === 'accesorio' && r.descripcion === 'Talla M, negro' && r.f && r.stock === 2, '🛒 casco marcado en la tienda con tipo, descripción y foto (stock intacto)');
    ok(await p.locator('#rLista:visible .pill.info').count() === 2, 'la lista de stock marca 🛒 los 2 publicados');

    // Público
    const c = await t.nuevo(); const cp = c.page;
    await cp.goto(t.base + '/t/?s=' + slug); await cp.waitForTimeout(4000);
    ok(await cp.locator('#tienda .pr').count() === 2, '👤 /t/ muestra la 🛒 Tienda con 2 productos');
    ok(/Quedan 2/.test(await cp.locator('#tienda').innerText()) && await cp.locator('#tienda .pr img').count() === 1, 'casco con foto y "⚡ Quedan 2"');
    const casco = (await su("select id from public.repuestos where nombre = 'Casco Giro'"))[0].id, luz = (await su("select id from public.repuestos where nombre = 'Luz trasera'"))[0].id;
    await cp.click('[data-ta="' + casco + '"]'); await cp.click('[data-ta="' + luz + '"]'); await cp.click('[data-ta="' + luz + '"]'); await cp.waitForTimeout(300);
    const href = decodeURIComponent(await cp.locator('#tPedir').getAttribute('href'));
    ok(/56955556666/.test(href) && /1 × Casco Giro/.test(href) && /2 × Luz trasera/.test(href) && /Total: \$41\.000/.test(href), '📲 Pedir por WhatsApp con el detalle y total $41.000');
    await cp.evaluate(() => document.querySelector('#tienda').scrollIntoView()); await t.foto('g91g_tienda', cp);
    ok(await cp.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin scroll horizontal a 320 px');
    ok(!(await su("select public.tienda_publica($1)::text r", [slug]))[0].r.includes('Casco') === false, 'tienda_publica responde a anónimos');
    await su("delete from public.cfx_modulos_negocio");
    ok((await su("select jsonb_array_length(public.tienda_publica($1)) n", [slug]))[0].n === 0, '🔒 sin el módulo la tienda no sale');
  } catch (x) { f++; console.log('✗ ' + x.message.split('\n')[0]); await t.foto('g91g_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
