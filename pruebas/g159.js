// G159 · 🐞 Despega #6 (túnel): 🔁 Compras recurrentes → elegir el producto queda puesto (antes el núcleo lo volvía botón de acción y nunca mostraba lo elegido)
//   y si solo hay 🛠️ servicios / 🔑 digitales, no pide Retiro ni Despacho. Núcleo: un selector "…" muestra lo elegido. FALLA con el código viejo.
// Uso: ANCHO=384 node g159.js
const { abrir } = require('./h'); const { execSync } = require('./apps6');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g159', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g159'); const su = t.sim.su, como = comoDe(su);
  try {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl', 'Pepe', 'client', $1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await su('update public.profiles set terms_at = now()');
    await su("insert into public.catalog_items (owner_id, client_key, nombre, precio, categoria, stock) values ($1, 'cafe', 'Café 1 kg', 10000, 'Café', 20), ($1, 'diag', 'Diagnóstico', 5000, 'Servicio', null)", [u.id]);
    await su("update public.cfx_config set valor = jsonb_set(valor, '{activo}', 'true') where clave = 'modulos_venta'");
    await como('tienda@x.cl', 'public.cfx_modulo_probar($2)', ['suscripciones']);
    const { page: p } = await t.nuevo();
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'tienda@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(p);
    await p.goto(t.base + '/#recurrentes'); await p.reload(); await p.waitForTimeout(3500);
    const H = '.cfx-hoja-m ';
    // Tocar "Producto" → elegir Diagnóstico (sea el selector propio o el botón)
    const btn = p.locator(H + '.gx-l .cfx-sel-btn');
    if (await btn.count()) await btn.first().click(); else await p.locator(H + '.gxP').first().click();
    await p.waitForTimeout(500);
    await p.locator('dialog[open] button:visible, .cfx-ayuda button:visible', { hasText: 'Diagnóstico' }).first().click(); await p.waitForTimeout(500);
    const vis = await p.evaluate((h) => document.querySelector(h + '.gx-l').innerText + '|' + document.querySelector(h + '.gxP').selectedOptions[0].text, H);
    ok(/Diagnóstico/.test(vis.split('|')[0]) || (await p.locator(H + '.gxP').first().isVisible() && /Diagnóstico/.test(vis.split('|')[1])), '🔁 el producto elegido se VE puesto (' + vis.replace(/\s+/g, ' ').slice(0, 60) + ')');
    ok(!(await p.locator(H + '#gxEnt').isVisible()) && await p.locator(H + '#gxSinEnv').isVisible(), '🛠️ solo servicio: no pide Retiro / Despacho');
    await p.screenshot({ path: __dirname + '/capturas/aplicaciones/g159_recurrente.png' }).catch(() => {});
    // + Otro producto → Café (físico) → vuelve la Entrega
    await p.click(H + '[data-gx=mas]'); await p.waitForTimeout(300);
    await p.evaluate((h) => { const s = [...document.querySelectorAll(h + '.gxP')].pop(); s.value = 'cafe'; s.dispatchEvent(new Event('change', { bubbles: true })); }, H);
    await p.waitForTimeout(300);
    ok(await p.locator(H + '#gxEnt').isVisible(), '🚚 con un producto físico vuelve Retiro / Despacho');
    await p.selectOption(H + '#gxCli', { label: 'Pepe' }).catch(async () => p.evaluate((h) => { const s = document.querySelector(h + '#gxCli'); s.value = s.options[1].value; }, H));
    await p.click(H + '[data-gx=guardar]'); await p.waitForTimeout(2000);
    const L = await como('tienda@x.cl', 'public.suscripciones_lista()');
    ok(L.length === 1 && (L[0].lineas || []).length === 2, '🔁 se guarda con los 2 productos');
    // Núcleo: selector de acción "…" sin name muestra lo elegido y vuelve al título si la app lo limpia
    const r = await p.evaluate(async () => {
      const w = document.createElement('div'); w.innerHTML = '<select><option value="">Acción…</option><option value="a">Uno</option><option value="b">Dos</option></select>'; document.body.appendChild(w);
      await new Promise((x) => setTimeout(x, 1500)); const s = w.querySelector('select'), b = w.querySelector('.cfx-sel-btn'); if (!b) return 'sin botón';
      b.click(); await new Promise((x) => setTimeout(x, 300)); const o = [...document.querySelectorAll('.cfx-ayuda [data-i]')].find((x) => /Dos/.test(x.textContent)); if (!o) return 'sin opción'; o.click();
      await new Promise((x) => setTimeout(x, 100)); const t1 = b.innerText; s.value = ''; s.dispatchEvent(new Event('change')); await new Promise((x) => setTimeout(x, 50)); const t2 = b.innerText; w.remove(); return t1 + '|' + t2;
    });
    ok(r === 'Dos|Acción', '🧩 núcleo: el botón muestra lo elegido y vuelve al título (' + r + ')');
  } catch (e) { console.log('ERROR', e); f++; } finally { await t.cerrar(); }
  console.log(f ? '✗ ' + f + ' fallaron' : '✓ todo ok'); process.exit(f ? 1 : 0);
})();
