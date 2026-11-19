// G128 c · 🚲 BiciTaller: 🏦 datos de banco como cobro del abono (igual que Barbería/Estaciona).
//   Base: link_guardar(p_banco) activa el abono SIN link ni ⚡ MP · link_activo lo cuenta (reservas online) · reserva_ver trae pagar_banco.
//   Pantalla: Ajustes → 💳 Abono con 🏦 datos de transferencia (guardar no los borra) · /r/ "🏦 Transfiere $X" + 📋 Copiar.
// FALLA con el código viejo (link_guardar no tiene p_banco y exige link o MP).  Uso: ANCHO=320 node g128c.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
const BANCO = 'Banco Estado · Cuenta RUT 12345678 · RUT 12.345.678-5 · Ana Pérez · ana@x.cl';
(async () => {
  execSync(__dirname + '/base.sh /home/user/Taller p_g128c', { stdio: 'ignore' });
  const t = await abrir('/home/user/Taller', 'p_g128c'); const su = t.sim.su, como = comoDe(su);
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Sur', nombre: 'Ana' });
    await t.sim.crearUsuario('otro@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Otro', nombre: 'Leo' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    const T = (await su("select id from public.talleres where nombre = 'Bici Sur'"))[0];
    // ---------- base ----------
    ok(/banco|link/i.test(await falla(() => como('taller@x.cl', "public.link_guardar('abono', 1, 5000, '', '', true)")) || ''), '🔒 sin link, banco ni MP no se activa (y lo dice)');
    ok(!(await falla(() => como('taller@x.cl', "public.link_guardar('abono', 1, 5000, '', 'Abono', true, null, $2)", [BANCO]))), '🏦 con solo datos de banco se activa');
    ok(!!(await su('select (public.link_activo($1, \'abono\')).id is not null a', [T.id]))[0].a, '🏦 link_activo lo cuenta (recibe reservas online)');
    ok(/largos/.test(await falla(() => como('taller@x.cl', "public.link_guardar('abono', 2, 5000, '', '', false, null, $2)", ['x'.repeat(401)])) || ''), '🔒 datos de banco muy largos: no');
    await como('taller@x.cl', "public.link_guardar('abono', 1, 6000, '', 'Abono', true)");
    ok((await su("select banco from public.links_pago where taller_id = $1 and slot = 1", [T.id]))[0].banco === BANCO, 'app vieja (sin p_banco) no borra los datos de banco');
    const pan = await como('otro@x.cl', 'public.taller_panel()');
    ok(!JSON.stringify(pan || {}).includes('12.345.678-5'), '🔒 otro taller no ve esos datos');
    const tok = (await su("insert into public.reservas (taller_id, fecha, hora, hora_fin, nombre, telefono, abono_monto, estado, expira_at) values ($1, current_date + 1, '10:00', '11:00', 'Pepe', '+56912345672', 6000, 'por_pagar', now() + interval '30 minutes') returning token", [T.id]))[0].token;
    const rv = (await su('select public.reserva_ver($1) r', [tok]))[0].r;
    ok(rv.pagar_banco === BANCO && !rv.pagar_url, '🏦 la reserva por pagar trae los datos de banco');
    // ---------- pantalla del dueño ----------
    const p = t.page;
    await p.goto(t.base + '/'); await p.waitForTimeout(1500);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(3500);
    await t.sinModales(p);
    await p.evaluate(() => { const b = document.querySelector('#mSeg [data-m="abono"]'); if (b) b.click(); }); await p.waitForTimeout(1200);
    const ta = await p.evaluate(() => { const x = document.querySelector('textarea[data-k="banco"][data-s="1"]'); return x ? x.value : null; });
    ok(ta === BANCO, '💳 Abono: el dueño ve sus 🏦 datos de transferencia');
    await p.screenshot({ path: __dirname + '/capturas/taller/g128c_abono.png', fullPage: true }).catch(() => {});
    await p.evaluate(() => document.querySelector('#aGuardar').click()); await p.waitForTimeout(1500);
    ok((await su("select banco from public.links_pago where taller_id = $1 and slot = 1", [T.id]))[0].banco === BANCO, '💾 Guardar mantiene los datos de banco');
    ok(await p.evaluate(() => !(document.querySelector('#aErr') || {}).textContent), 'sin error al guardar');
    // ---------- pantalla del cliente (/r/) ----------
    const { page: q } = await t.nuevo();
    await q.goto(t.base + '/r/?t=' + tok); await q.waitForTimeout(2500);
    const txt = await q.evaluate(() => document.body.innerText);
    ok(/Transfiere \$\s?6\.000/.test(txt) && txt.includes('12.345.678-5'), '🏦 el cliente ve "Transfiere $6.000" con los datos');
    ok(!!(await q.$('[data-cfx-copiar]')) && /2️⃣ Subir foto del comprobante/.test(txt), '📋 Copiar datos + 2️⃣ subir comprobante');
    ok(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin scroll lateral');
    await q.screenshot({ path: __dirname + '/capturas/taller/g128c_reserva.png', fullPage: true }).catch(() => {});
    const err = t.errores.filter((e) => !/favicon|realtime|websocket|Failed to load resource|404|status of 400/i.test(e));
    ok(err.length === 0, 'sin errores en consola' + (err.length ? ' · ' + err.slice(0, 3).join(' | ') : ''));
  } catch (e) { ok(false, (e.stack || e.message)); }
  await t.cerrar();
  console.log(f ? '❌ ' + f + ' fallas' : '✅ G128 c OK'); process.exit(f ? 1 : 0);
})();
