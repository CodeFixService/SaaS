// G156 · 🐞 Fallas de Josué (túnel): Despega (diseños vuelven solos, sin tarjeta de avisos, cliente con perfil primero, 📋 datos uno por uno,
//   categoría Servicio sin envío, ❤️ fuera de la vista chica, sin número rojo en Más) · Billetera (categoría nueva al tiro, medios con ícono arriba,
//   💵 Cierre de caja en Caja) · núcleo (botón "de fábrica" con aire, contador en 0 nunca se ve). FALLA con el código viejo.
// Uso: ANCHO=384 node g156.js
const { abrir } = require('./h'); const { APPS, entrar, execSync } = require('./apps6');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
(async () => {
  // ---------- Despega ----------
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g156', { stdio: 'ignore' });
  let t = await abrir('/home/user/Aplicaciones', 'p_g156'); const su = t.sim.su, como = comoDe(su);
  try {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Pepe','client',$1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await su("update public.profiles set terms_at = now(), tour_visto = true").catch(() => su('update public.profiles set terms_at = now()'));
    await su("update public.profiles set slug = 'ana', telefono = '56912345678', datos_pago = $2 where id = $1", [u.id, 'Banco: BancoEstado\nN° de cuenta: 1081429054\nRUT: 19.570.536-4\nNombre: Ana Pérez']);
    await como('tienda@x.cl', 'public.catalog_upsert($2, $3, $4, null, $5)', ['diag', 'Diagnóstico', 5000, 'Servicio']);
    await como('tienda@x.cl', 'public.catalog_upsert($2, $3, $4, null, $5)', ['polera', 'Polera', 10000, 'Ropa']);
    // a) 🎨 Diseños: los datos quedan en la cuenta y vuelven solos
    await como('tienda@x.cl', "public.publicar_ficha('f1', 'Gran oferta', 'Solo hoy', '$10.000', null, 'oferta', false, 10000)");
    await como('tienda@x.cl', "public.ficha_datos_guardar('f1', $2::jsonb)", [JSON.stringify({ id: 'f1', plantilla: 'oferta', titulo: 'Gran oferta', color1: '#123456' })]);
    const mf = await como('tienda@x.cl', 'public.mis_fichas()');
    ok(mf.length === 1 && mf[0].datos && mf[0].datos.color1 === '#123456', 'a) 🎨 mis_fichas trae el diseño con sus datos');
    ok((await como('cli@x.cl', 'public.mis_fichas()')).length === 0, 'a) 🔒 otra cuenta no ve esos diseños');
    const p = t.page;
    await entrar(p, t.base, '/', 'tienda@x.cl', 'clave123'); await t.sinModales(p);
    await p.evaluate(() => Object.keys(localStorage).filter((k) => /^fichas:/.test(k) && k !== 'fichas:migrado').forEach((k) => localStorage.removeItem(k)));
    await p.goto(t.base + '/apps/fichas/#galeria'); await p.waitForTimeout(4000); await t.sinModales(p);
    await p.evaluate(() => { const b = document.querySelector('[data-v="galeria"]'); if (b) b.click(); }); await p.waitForTimeout(800);
    ok(/Gran oferta/.test(await p.locator('#gal').innerText()), 'a) 🎨 Galería vacía (app limpiada) → el diseño vuelve solo');
    // b) Inicio del negocio: sin tarjeta de avisos (solo 🔔) y sin número rojo en Más
    await p.goto(t.base + '/'); await p.waitForTimeout(3000); await t.sinModales(p);
    ok(!(await p.locator('#inbox').isVisible()), 'b) 🔔 la tarjeta "Avisos" ya no está en el inicio (solo la campana)');
    ok(await p.evaluate(() => [...document.querySelectorAll('nav [data-k=mas] .badge')].every((b) => !b.getClientRects().length)), 'b) sin número rojo en Más');
    ok(await p.evaluate(() => { const b = document.createElement('span'); b.className = 'badge'; b.hidden = true; b.textContent = '0'; b.style.display = 'inline-flex'; document.body.appendChild(b); const r = !b.getClientRects().length; b.remove(); return r; }), 'b) núcleo: un contador con hidden (0) nunca se ve');
    // c) Cliente: perfil primero; "Tu tienda" y Mi Caja dentro del menú
    const { page: q } = await t.nuevo();
    await entrar(q, t.base, '/', 'cli@x.cl', 'clave123'); await t.sinModales(q);
    await q.goto(t.base + '/#cuenta'); await q.waitForTimeout(2500); await t.sinModales(q);
    const c = await q.evaluate(() => ({ primero: document.getElementById('v-home').firstElementChild.id, caja: getComputedStyle(document.getElementById('cMiCaja')).display, txt: document.getElementById('miPerfilCli').innerText }));
    ok(c.primero === 'miPerfilCli', 'c) Cliente: su perfil y menú van primero (' + c.primero + ')');
    ok(c.caja === 'none', 'c) Cliente: la tarjeta suelta "Mi Caja" ya no está arriba');
    await q.evaluate(() => { const b = [...document.querySelectorAll('#miPerfilCli button, #miPerfilCli [role=tab]')].find((x) => /Tu tienda/.test(x.textContent)); if (b) b.click(); }); await q.waitForTimeout(500);
    const c2 = await q.locator('#miPerfilCli').innerText();
    ok(/Tu tienda: Tienda Ana/.test(c2) && /Mi Caja/.test(c2), 'c) Cliente: "Tu tienda: Tienda Ana" y "Mi Caja" en el menú');
    await t.foto('g156-cliente', q);
    // d) Tienda del cliente: Servicio sin envío · 📋 datos uno por uno (RUT sin puntos) · ❤️ fuera en 3 por fila
    await q.goto(t.base + '/apps/catalogo/?v=productos'); await q.waitForTimeout(3500); await t.sinModales(q);
    await q.evaluate(() => { const b = document.querySelector('[data-v="3"]'); if (b) b.click(); }); await q.waitForTimeout(300);
    ok(await q.evaluate(() => [...document.querySelectorAll('#grid .fav')].length > 0 && [...document.querySelectorAll('#grid .fav')].every((x) => !x.getClientRects().length)), 'd) ❤️ no tapa el nombre en la vista de 3 por fila');
    await q.evaluate(() => { const b = document.querySelector('[data-v="2"]'); if (b) b.click(); }); await q.waitForTimeout(300);
    ok(await q.evaluate(() => [...document.querySelectorAll('#grid .fav')].some((x) => x.getClientRects().length)), 'd) ❤️ sigue en la vista de 2 por fila');
    await q.evaluate(() => localStorage.setItem('cfx-vista', '3'));
    const agregar = async (nombre) => { await q.locator('#grid .item').filter({ hasText: nombre }).locator('button:not(.fav)').last().click(); await q.waitForTimeout(500); };
    await agregar('Diagnóstico');
    await q.goto(t.base + '/apps/catalogo/?v=pedido'); await q.waitForTimeout(3000); await t.sinModales(q);
    await q.evaluate(() => { const b = document.querySelector('[data-v="pedido"]'); if (b) b.click(); }); await q.waitForTimeout(800);
    ok(!(await q.locator('#entrega').isVisible()), 'd) 🛠️ categoría "Servicio": no pide Retiro en tienda / Despacho');
    const tr = await q.evaluate(() => ({ n: document.querySelectorAll('#pagoTxt .cfx-tc-b').length, rut: [...document.querySelectorAll('#pagoTxt .cfx-tc-f')].map((x) => x.innerText).find((x) => /RUT/.test(x)) || '' }));
    ok(tr.n === 4, 'd) 📋 cada dato de transferencia con su botón (' + tr.n + ')');
    ok(/19570536-4/.test(tr.rut) && !/19\.570/.test(tr.rut), 'd) RUT sin puntos → ' + tr.rut.replace(/\s+/g, ' '));
    await q.locator('.tabs button, nav button, [role=tab]').filter({ hasText: 'Pedido' }).first().click().catch(() => {}); await q.waitForTimeout(800);
    await q.evaluate(() => { const c = document.getElementById('cPago'); if (c) c.scrollIntoView(); });
    await t.foto('g156-pedido', q);
    // e) Núcleo: "Volver todo a lo de fábrica" con aire arriba
    ok(await p.evaluate(() => { const b = document.createElement('button'); b.className = 'cfx-pe-fab'; document.body.appendChild(b); const m = parseFloat(getComputedStyle(b).marginTop); b.remove(); return m >= 20; }), 'e) ↩️ "de fábrica" con margen arriba');
    // f) Caja: categoría "Servicio" → pasa sola a 🛠️ Servicio
    await p.goto(t.base + '/apps/caja/#productos'); await p.waitForTimeout(3500); await t.sinModales(p);
    await p.evaluate(() => { const b = document.querySelector('[data-v="productos"]'); if (b) b.click(); }); await p.waitForTimeout(500);
    await p.fill('#p-cat', 'Servicios'); await p.dispatchEvent('#p-cat', 'change'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.getElementById('p-tipo').value === 'servicio'), 'f) Caja: categoría "Servicios" → 🛠️ Servicio');
  } catch (e) { ok(false, 'Despega: ' + e.message); } finally { await t.cerrar(); }

  // ---------- Billetera ----------
  const [repo, db, prep] = APPS.billetera;
  execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
  t = await abrir(repo, db);
  try {
    const [url, email, sel, tab] = await prep(t); const p = t.page;
    await entrar(p, t.base, url, email, 'clave123', sel, tab); await t.sinModales(p);
    await p.goto(t.base + '/app/#caja'); await p.waitForTimeout(2500); await t.sinModales(p);
    ok(await p.locator('a[href="#cierre"]').filter({ hasText: 'Cierre de caja' }).first().isVisible(), 'g) 💵 Cierre de caja directo en Caja');
    await p.goto(t.base + '/app/#anotar/gasto'); await p.waitForTimeout(2500); await t.sinModales(p);
    const md = await p.evaluate(() => [...document.querySelectorAll('.medios-ico .chip')].map((b) => ({ ok: b.scrollWidth <= b.clientWidth + 1, ico: !!b.querySelector('.medio-i') })));
    ok(md.length === 4 && md.every((x) => x.ok && x.ico), 'h) Medios de pago: ícono arriba y texto entero (' + md.length + ')');
    await p.locator('.chip').filter({ hasText: 'Nueva' }).last().click(); await p.waitForTimeout(1200);
    await p.locator('.velo input[maxlength="24"]').fill('Bencina'); await p.locator('.velo button').filter({ hasText: 'Agregar' }).click(); await p.waitForTimeout(2500);
    ok(await p.locator('.chip.activo').filter({ hasText: 'Bencina' }).first().isVisible().catch(() => false), 'i) Categoría nueva aparece y queda elegida sin recargar');
    await t.foto('g156-billetera', p);
  } catch (e) { ok(false, 'Billetera: ' + e.message); } finally { await t.cerrar(); }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ G156 OK'); process.exit(f ? 1 : 0);
})();
