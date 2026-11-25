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
    ok(await p.locator('.cfx-hoja-m .cfx-rc').count() === 1, '🔁 la hoja de compras recurrentes abre (núcleo)');
    // G162: la hoja 🔁 ahora es del núcleo (recurrente.js): lo de elegir producto / sin Entrega para 🛠️ lo prueba g162.js.
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
