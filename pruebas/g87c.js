// G87 C · 🔐 Cuentas y roles: el SOCIO solo agrega (no cambia ni borra, validado en el servidor) · 🔑 clave temporal obligada a cambiar
//          (núcleo, las 7) · admin_usuarios trae el WhatsApp. FALLA con el código viejo (el socio podía dar Pro/suspender/borrar; no había clave temporal).
// Uso: ANCHO=320 node g87c.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message; } };
(async () => {
  // ---------- 🪪 RUT: dígito verificador solo (núcleo verificar.js) + fotos de la cédula con cámara ----------
  { const src = require('fs').readFileSync('/home/user/SaaS/nucleo/verificar.js', 'utf8'); const w = {}; new Function('window', 'document', src.replace('window.CFX_VERIFICAR = {', 'window.R = rutCompleto; window.CFX_VERIFICAR = {'))(w, {});
    ok(w.R && w.R('12345678') === '12.345.678-5' && w.R('11.111.111-1') === '11.111.111-1' && w.R('12345678-K') === '', '🪪 RUT: escribe 12345678 → 12.345.678-5; con guion se revisa');
    ok(/capture="environment"/.test(src), '🪪 Frente y reverso abren la cámara'); }
  execSync(__dirname + '/base.sh /home/user/saas p_g87c', { stdio: 'ignore' });
  let t = await abrir('/home/user/saas', 'p_g87c'); const su = t.sim.su, como = comoDe(su);
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    await t.sim.crearUsuario('socio@x.cl', 'clave123'); await su("update public.perfiles set rol = 'socio' where email = 'socio@x.cl'");
    await t.sim.crearUsuario('ana@x.cl', 'clave123'); await su("update public.perfiles set telefono = '56912345678' where email = 'ana@x.cl'");
    const ana = (await su("select id from public.perfiles where email = 'ana@x.cl'"))[0].id;
    // ---------- Socio: solo agrega ----------
    let e = await falla(() => como('socio@x.cl', "public.admin_premium($2::uuid, 30, 'para probar')", [ana]));
    ok(/solo pueden agregar/.test(e || ''), 'Socio NO da días Pro (' + e + ')');
    e = await falla(() => como('socio@x.cl', "public.admin_suspender($2::uuid, true, 'para probar')", [ana]));
    ok(/solo pueden agregar/.test(e || ''), 'Socio NO suspende');
    e = await falla(() => como('socio@x.cl', "public.admin_config_guardar('dias_prueba', '5'::jsonb, 'para probar')"));
    ok(/solo pueden agregar/.test(e || ''), 'Socio NO cambia ajustes');
    const b = await como('socio@x.cl', "public.preparar_borrado((select id from auth.users where email = 'socio@x.cl'), $2::uuid, 'para probar')", [ana]);
    ok(b && b.ok === false && /no pueden eliminar/.test(b.error), 'Socio NO elimina cuentas ' + JSON.stringify(b));
    e = await falla(() => como('socio@x.cl', "public.admin_aviso('todos', 'Hola', 'Novedad', '')"));
    ok(/motivo/.test(e || ''), 'Socio agrega un aviso solo con motivo');
    ok(!(await falla(() => como('socio@x.cl', "public.admin_aviso('todos', 'Hola', 'Novedad', 'aviso de prueba')"))), 'Socio SÍ agrega un aviso con motivo');
    ok(!(await falla(() => como(ADM, "public.admin_premium($2::uuid, 30, '')", [ana]))), 'Admin sigue dando días Pro sin motivo');
    const U = await como('socio@x.cl', "public.admin_usuarios('ana')");
    ok(U.length === 1 && U[0].telefono === '56912345678', 'Usuarios trae el WhatsApp (para 🔑 Clave por WhatsApp)');
    // ---------- 🔑 Clave temporal ----------
    e = await falla(() => como('socio@x.cl', "public.cfx_clave_temporal_marcar('ana@x.cl')"));
    ok(!!e, 'Socio NO marca claves temporales');
    await como(ADM, "public.cfx_clave_temporal_marcar('ANA@x.cl')");
    ok(await como('ana@x.cl', 'public.cfx_clave_debo()') === true && await como('socio@x.cl', 'public.cfx_clave_debo()') === false, 'Ana debe crear su clave; el socio no');
    const { page: p } = await t.nuevo();
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'ana@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4000);
    const dlg = p.locator('dialog.cfx-qrd[open]', { hasText: 'Crea tu clave' });
    ok(await dlg.count() === 1, 'Al entrar sale "🔑 Crea tu clave"');
    await p.keyboard.press('Escape'); await p.mouse.click(3, 3); await p.waitForTimeout(400);
    ok(await dlg.count() === 1, 'No se cierra con Esc ni tocando afuera');
    await t.foto('g87c_clave').catch(() => {});
    await dlg.locator('[data-nueva]').fill('MiClaveNueva9'); await dlg.locator('[data-guardar]').click(); await p.waitForTimeout(1500);
    ok(await p.locator('dialog.cfx-qrd[open]', { hasText: 'Clave guardada' }).count() === 1, 'Guarda su clave → ✅ Clave guardada');
    ok(await como('ana@x.cl', 'public.cfx_clave_debo()') === false, 'Ya no la pide de nuevo');
  } catch (e) { console.log('✗ ' + e.message); f++; }
  await t.cerrar();
  // ---------- Núcleo en otra app (BiciTaller): mismo freno ----------
  execSync(__dirname + '/base.sh /home/user/taller p_g87ct', { stdio: 'ignore' });
  t = await abrir('/home/user/taller', 'p_g87ct'); const su2 = t.sim.su, como2 = comoDe(su2);
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    ok(!!(await falla(() => como2('taller@x.cl', "public.cfx_clave_temporal_marcar('x@x.cl')"))), 'BiciTaller: un taller NO marca claves');
    await como2(ADM, "public.cfx_clave_temporal_marcar('taller@x.cl')");
    ok(await como2('taller@x.cl', 'public.cfx_clave_debo()') === true, 'BiciTaller: el admin la marca desde el CM');
  } catch (e) { console.log('✗ ' + e.message); f++; }
  await t.cerrar();
  console.log(f ? '❌ ' + f + ' fallas' : '✅ g87c todo ok'); process.exit(f ? 1 : 0);
})();
