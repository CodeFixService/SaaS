// G39 · 💈 Barbería: 🧩 módulos sueltos para la barbería Free (⏰ recordatorios, 🎟️ sellos, 📣 campañas) + R1 ⏰ Premium siempre con fecha
// + 🧾 comprobante de un corte (G37) + la base ya no se reinstala cada 10 min (comparaba con la versión de la app). FALLA con el código viejo.
// Uso: (cd /home/user/Barberia/supabase/pruebas && ./correr.sh "-h /var/tmp/pgb -p 54329 -U postgres") && ANCHO=320 node g39_barberia.js
const fs = require('fs');
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  const sql = fs.readFileSync('/home/user/Barberia/supabase/instalar.sql', 'utf8');
  assert(/v_bd := coalesce\(j ->> 'bd', j ->> 'version'\)/.test(sql), 'Auto-actualizar compara con "bd" de version.json (antes se reinstalaba cada 10 min)');
  const t = await abrir('/home/user/barberia', 'barberia_prueba');
  const p = t.page, su = t.sim.su;
  try {
    await su("create table if not exists auth.claves (email text primary key, pass text not null)");
    await su("alter table auth.users add column if not exists last_sign_in_at timestamptz");
    await su("insert into auth.claves select email, 'clave123' from auth.users on conflict do nothing");
    await su("update public.profiles set clave_temporal = false, tour_visto = true where true").catch(() => {});
    await su("delete from public.cfx_modulos_negocio; delete from public.caja where servicio = 'Corte y barba'");
    // R1: Premium sin fecha → 30 días; el admin no.
    await su("update public.profiles set plan = 'premium', premium_until = null where email = 'b9@test.cl'");
    const r1 = (await su("select premium_until::date - current_date as d from public.profiles where email = 'b9@test.cl'"))[0].d;
    assert(r1 === 30, 'R1: Premium sin fecha queda con 30 días (' + r1 + ')');
    // Dueño Free; venta de módulos apagada → todo como antes (nada suelto, solo Premium).
    await su("update public.profiles set plan = 'free', premium_until = null where email = 'dueno@test.cl'");
    const bid = (await su("select barberia_id b from public.profiles where email = 'dueno@test.cl'"))[0].b;
    const off = (await su("select public.bar_modulos($1) m, public.bar_tiene('recuperar', $1) t", [bid]))[0];
    assert(off.m === null && off.t === false, 'Venta apagada: Free sin módulos ni "no vuelven" ' + JSON.stringify(off));
    await su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
    const on = (await su("select public.bar_modulos($1) m", [bid]))[0].m;
    assert(on && on.campanas === false && on.recordatorios === false && on.sellos === false, 'Venta prendida: 3 módulos a la venta ' + JSON.stringify(on));

    await p.goto(t.base + '/'); await p.waitForTimeout(1000);
    await p.fill('input[type=email]:visible', 'dueno@test.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales();
    await p.goto(t.base + '/equipo/#modulos'); await p.waitForTimeout(2500);
    const txt = (await p.textContent('#modZona')).replace(/\s+/g, ' ');
    assert(/Recordatorios/.test(txt) && /sellos/i.test(txt) && /Campañas/.test(txt) && /Con Premium pagas 20% menos/.test(txt), 'Más → 🧩 Módulos muestra los 3 y el -20% con Premium');
    assert(await t.anchoOk(), 'Módulos sin salirse en ' + (process.env.ANCHO || 360));
    await t.foto('g39_modulos');
    // Clientes que no vuelven (bloqueado) → aviso Premium con "🧩 O activa solo esta función" → demo del módulo.
    await p.goto(t.base + '/equipo/#volver'); await p.waitForTimeout(2000);
    await p.click('#upVolver'); await p.waitForTimeout(600);
    assert(await p.locator('[data-mod]').count() === 1, 'Aviso Premium ofrece activar solo el módulo');
    await t.foto('g39_upsell');
    await p.click('[data-mod]'); await p.waitForTimeout(900);
    assert(/Campañas/.test(await p.textContent('dialog.cfxd')), 'Abre la demo del módulo 📣 Campañas');
    await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
    // Josué aprueba el pago del módulo → "no vuelven" se abre sin Premium.
    await su("select public.cfx_modulos_dar((select id from public.profiles where email = 'dueno@test.cl'), 'campanas', 30, 'pago')");
    await p.goto(t.base + '/equipo/#volver'); await p.reload(); await p.waitForTimeout(2500);
    assert(!(await p.locator('#upVolver').count()) && (await su("select public.bar_tiene('recuperar', $1) t", [bid]))[0].t, 'Con el módulo: Clientes que no vuelven abierto');
    // 🧾 Comprobante de un corte de la caja.
    await su("insert into public.caja (id, barberia_id, barbero_id, fecha, servicio, monto, abono, medio, cliente_nombre, propina) select gen_random_uuid(), $1, id, now(), 'Corte y barba', 12000, 0, 'efectivo', 'Juan Pérez', 1000 from public.profiles where email = 'dueno@test.cl'", [bid]);
    await p.goto(t.base + '/equipo/#caja'); await p.waitForTimeout(2500);
    await p.locator('#cajaZona [data-k]').first().click(); await p.waitForTimeout(600);
    await p.click('[data-comp]'); await p.waitForTimeout(800);
    const papel = (await p.textContent('.cfx-comp .cb-papel')).replace(/\s+/g, ' ');
    const nombre = (await su("select nombre from public.barberias where id = $1", [bid]))[0].nombre;
    assert(papel.includes(nombre) && /COMPROBANTE DE VENTA/i.test(papel) && /\$/.test(papel), 'Comprobante con la barbería y el monto: ' + papel.slice(0, 120));
    assert(await t.anchoOk(), 'Comprobante sin salirse');
    await t.foto('g39_comprobante');
    await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(300); await t.foto('g39_comprobante_oscuro');
  } catch (e) { console.log(e.message); process.exitCode = 1; await t.foto('g39_error'); }
  await su("update public.cfx_config set valor = valor || '{\"activo\": false}' where clave = 'modulos_venta'").catch(() => {});
  const err = t.errores.filter((x) => !/Failed to load resource|ERR_|workers\.dev|status of 404/.test(x));
  console.log('ERRORES:', err.join('\n') || 'ninguno');
  if (err.length) process.exitCode = 1;
  await t.cerrar();
})();
