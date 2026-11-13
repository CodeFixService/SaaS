// G32 d: 🔑 Entrar con QR. El computador muestra QR + código; el celular con sesión aprueba; el computador entra solo (una vez, vence a los 2 min).
// Uso: node g32_qr.js [bd]  (antes ./base.sh /home/user/Aplicaciones <bd>)
const { abrir } = require('./h');
(async () => {
  const enviar = async (b, user, s) => {  // la Edge Function "enviar" (accion qr_entrar), igual que en el servidor
    if (b.accion !== 'qr_entrar') return { ok: true };
    const [r] = await s.su('select public.cfx_qr_canjear($1, $2) as e', [b.token, b.secreto]);
    if (!r.e) return { ok: false, error: 'El código venció o ya se usó' };
    const [u] = await s.su('select id from auth.users where email = $1', [r.e]);
    return { ok: true, token_hash: 'th-' + u.id };
  };
  const t = await abrir('/home/user/Aplicaciones', process.argv[2] || 'p_g32q', { funciones: { enviar } });
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  try {
    await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Café Ñandú' }); await t.sim.su('update public.profiles set terms_at = now()');
    // 💻 Computador sin sesión
    const pc = t.page; await pc.setViewportSize({ width: 1280, height: 860 });
    await pc.goto(t.base + '/'); await pc.waitForTimeout(2500);
    const cod = await pc.evaluate(() => { const e = document.getElementById('lQR'); return e && !e.hidden && e.querySelector('canvas') ? e.querySelector('.cq-cod').textContent : ''; });
    ok(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/.test(cod), 'el computador muestra el QR y el código ' + cod);
    await t.foto('g32-qr-pc', pc);
    const [fila] = await t.sim.su('select token from public.cfx_login_qr order by created_at desc limit 1');
    // 📱 Celular con sesión: escanea el QR (abre ?qr=<token>) → "¿Entrar en el computador?" → Sí
    const { page: cel } = await t.nuevo();
    await cel.addInitScript(() => localStorage.setItem('cfx:tour:orbita-inicio', '1'));
    await cel.goto(t.base + '/'); await cel.waitForTimeout(1500);
    ok(await cel.evaluate(() => document.getElementById('lQR').hidden), 'en el celular sin QR no se muestra el QR');
    await cel.fill('input[type=email]:visible', 'tienda@x.cl'); await cel.fill('input[type=password]:visible', 'clave123'); await cel.press('input[type=password]:visible', 'Enter'); await cel.waitForTimeout(2500);
    await cel.goto(t.base + '/?qr=' + fila.token); await cel.waitForTimeout(2500);
    const dlg = await cel.evaluate(() => { const d = document.querySelector('dialog.cfx-qrd[open]'); return d ? d.textContent : ''; });
    ok(/¿Entrar en el computador\?/.test(dlg) && /Chrome en Linux/.test(dlg), 'el celular pregunta "¿Entrar en el computador?" y dice cuál: ' + dlg.slice(0, 70));
    ok(!/qr=/.test(cel.url()), 'el código se borra de la dirección del celular');
    await t.foto('g32-qr-celular', cel);
    await cel.click('dialog.cfx-qrd [data-si]'); await cel.waitForTimeout(800);
    ok(/Listo/.test(await cel.textContent('dialog.cfx-qrd')), 'el celular dice ✅ Listo');
    // 💻 el computador entra solo
    await pc.waitForTimeout(5000);
    const yo = await pc.evaluate(() => ({ e: Cuenta.account && Cuenta.account.email, home: !document.getElementById('v-home').classList.contains('hidden') }));
    ok(yo.e === 'tienda@x.cl' && yo.home, 'el computador entró a la cuenta sin escribir la clave');
    await pc.reload(); await pc.waitForTimeout(2500);
    ok(await pc.evaluate(() => Cuenta.account && Cuenta.account.email === 'tienda@x.cl'), 'al recargar el computador sigue con la sesión');
    // 🔒 Un solo uso, vence, y nadie sin cuenta lee la tabla ni canjea
    const [u2] = await t.sim.su('select usado_at is not null as u, (select public.cfx_qr_canjear($1, \'x\')) as otra from public.cfx_login_qr where token = $1', [fila.token]);
    ok(u2.u && !u2.otra, 'el código quedó usado y no se puede volver a usar');
    const anon = await cel.evaluate(async () => { const c = window.supabase.createClient(CFX_CONFIG.SUPABASE_URL, CFX_CONFIG.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
      const a = await c.from('cfx_login_qr').select('*'); const b = await c.rpc('cfx_qr_canjear', { p_token: 'x', p_secreto: 'y' }); return { a: !!a.error || !(a.data || []).length, b: !!b.error }; }).catch((e) => ({ a: false, b: false, e: e.message }));
    ok(anon.a && anon.b, 'sin cuenta no se lee la tabla ni se puede canjear');
    const nuevo = await cel.evaluate(() => Cuenta.rpc('cfx_qr_crear', { p_equipo: 'Edge en Windows' }));
    await t.sim.su("update public.cfx_login_qr set created_at = now() - interval '3 minutes' where token = $1", [nuevo.token]);
    ok(!(await cel.evaluate((c) => Cuenta.rpc('cfx_qr_aprobar', { p: c }), nuevo.codigo)).ok, 'un código de más de 2 minutos no se puede aprobar');
    // ✍️ Código escrito + "No": no entra
    const n2 = await cel.evaluate(() => Cuenta.rpc('cfx_qr_crear', { p_equipo: 'Edge en Windows' }));
    await cel.evaluate((c) => { document.querySelectorAll('dialog.cfx-qrd').forEach((x) => x.close()); CFX_QR.celular(); const d = document.querySelector('dialog.cfx-qrd[open]'); d.querySelector('[data-cod]').value = c.slice(0, 3) + '-' + c.slice(3); d.querySelector('[data-seguir]').click(); }, n2.codigo);
    await cel.waitForTimeout(1200);
    ok(/Edge en Windows/.test(await cel.textContent('dialog.cfx-qrd[open]')), 'escribiendo el código también pregunta');
    await cel.click('dialog.cfx-qrd[open] [data-cerrar]'); await cel.waitForTimeout(300);
    const [n2f] = await t.sim.su('select aprobado_at from public.cfx_login_qr where token = $1', [n2.token]);
    ok(!n2f.aprobado_at, 'si toca "No" el computador no entra');
    const errs = t.errores.filter((x) => !/cfx_login_qr|cfx_qr_canjear|status of 40[13]/.test(x));  // los de arriba son a propósito (sin cuenta)
    ok(errs.length === 0, 'sin errores: ' + errs.slice(0, 3).join(' | '));
  } catch (e) { console.log('✗ ' + e.message); process.exitCode = 1; } finally { await t.cerrar(); }
})();
