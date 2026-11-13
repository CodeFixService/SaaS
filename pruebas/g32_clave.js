// G32 d + f en CM y Barbería: 🔑 entrar con QR y 🔒 3 claves malas → se pausa la clave y el QR; se entra con el enlace al correo.
// Uso: node g32_clave.js cm|bar [bd]   (antes ./base.sh /home/user/SaaS <bd>  o  ./base.sh /home/user/Barberia <bd>)
const { abrir } = require('./h');
const APPS = {
  cm: { repo: '/home/user/SaaS', bd: 'p_cm', fn: 'servidor', cli: 'App' },
  bar: { repo: '/home/user/Barberia', bd: 'p_bar', fn: 'enviar', cli: 'Cuenta' },
  orb: { repo: '/home/user/Aplicaciones', bd: 'p_apl', fn: 'enviar', cli: 'Cuenta', spa: true },  // Órbita: una sola página
};
const A = APPS[process.argv[2] || 'cm'];
(async () => {
  const qr = async (b, user, s) => {  // Edge Function (accion qr_entrar), igual que en el servidor
    if (b.accion !== 'qr_entrar') return { ok: true };
    const [r] = await s.su('select public.cfx_qr_canjear($1, $2) as e', [b.token, b.secreto]);
    if (!r.e) return { ok: false, error: 'El código venció o ya se usó' };
    const [u] = await s.su('select id from auth.users where email = $1', [r.e]);
    return { ok: true, token_hash: 'th-' + u.id };
  };
  const t = await abrir(A.repo, process.argv[3] || A.bd, { funciones: { [A.fn]: qr } });
  const nuevo0 = t.nuevo; t.nuevo = async () => { const r = await nuevo0(); if (A.spa) await r.page.addInitScript(() => { try { localStorage.setItem('cfx:tour:orbita-inicio', '1'); } catch (e) { /* about:blank */ } }); return r; };
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  const sb = (p, f, x) => p.evaluate(([cli, f, x]) => new Function('sb', 'x', 'return (' + f + ')(sb, x)')(window[cli].sb, x), [A.cli, f.toString(), x]);
  const enApp = (p) => A.spa ? p.evaluate(() => !document.getElementById('v-home').classList.contains('hidden')) : new URL(p.url()).pathname !== '/';
  const entrar = async (p, clave) => {
    await p.fill('input[type=email]:visible', 'u@x.cl'); await p.fill('input[type=password]:visible', clave);
    await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(1800);
  };
  try {
    if (/Barberia/.test(A.repo)) await t.sim.su("insert into public.user_invites (email, nombre, role, extra) values ('u@x.cl', 'Ana', 'owner', '{\"barberia\": \"Barbería Ana\"}')");  // Barbería: dueño invitado
    const u = await t.sim.crearUsuario('u@x.cl', 'clave123', A.spa ? { tipo: 'negocio', empresa: 'Café Ana' } : { nombre: 'Ana', empresa: 'Ana' });
    if (A.spa) await t.ctx.addInitScript(() => { try { localStorage.setItem('cfx:tour:orbita-inicio', '1'); } catch (e) { /* about:blank */ } });
    await t.sim.su('update public.profiles set terms_at = now()').catch(() => {});
    await t.sim.su('update public.profiles set clave_temporal = false').catch(() => {});
    // 💻 Computador: QR + código
    const pc = t.page; await pc.setViewportSize({ width: 1280, height: 860 });
    await pc.goto(t.base + '/'); await pc.waitForTimeout(2500);
    const cod = await pc.evaluate(() => { const e = document.getElementById('lQR'); return e && !e.hidden && e.querySelector('canvas') ? e.querySelector('.cq-cod').textContent : ''; });
    ok(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/.test(cod), 'el computador muestra el QR y el código ' + cod);
    await t.foto('g32-qr-pc', pc);
    const [fila] = await t.sim.su('select token from public.cfx_login_qr order by created_at desc limit 1');
    // 📱 Celular sin sesión llega por el QR → entra → pregunta → Sí
    const { page: cel } = await t.nuevo();
    await cel.goto(t.base + '/?qr=' + fila.token); await cel.waitForTimeout(1500);
    ok(/Inicia sesión aquí/.test(await cel.textContent('#lQR')), 'el celular sin sesión dice que inicie sesión');
    await entrar(cel, 'clave123'); await cel.waitForTimeout(800);
    ok(/¿Entrar en el computador\?/.test(await cel.textContent('dialog.cfx-qrd[open]').catch(() => '')), 'tras entrar, el celular pregunta "¿Entrar en el computador?"');
    await t.foto('g32-qr-celular', cel);
    await cel.click('dialog.cfx-qrd [data-si]'); await cel.waitForTimeout(600);
    await cel.click('dialog.cfx-qrd [data-cerrar]'); await cel.waitForTimeout(2500);
    ok(!/\/(\?|$)/.test(new URL(cel.url()).pathname + new URL(cel.url()).search) || !/qr=/.test(cel.url()), 'el celular sigue a su app: ' + new URL(cel.url()).pathname);
    await pc.waitForTimeout(5000);
    ok(await sb(pc, async (s) => ((await s.auth.getSession()).data.session || {}).user?.email) === 'u@x.cl', 'el computador entró sin escribir la clave');
    ok(await enApp(pc), 'y pasó a su app: ' + new URL(pc.url()).pathname);
    // 🔒 Otro computador: 3 claves malas
    const { page: p2 } = await t.nuevo(); await p2.setViewportSize({ width: 1280, height: 860 });
    await p2.goto(t.base + '/'); await p2.waitForTimeout(1500);
    for (let i = 0; i < 3; i++) { await entrar(p2, 'malaclave' + i); if (i < 2) ok(!(await p2.$('dialog.cfx-qrd[open]')), 'intento malo ' + (i + 1) + ': aún sin pausa'); }
    const dl = await p2.textContent('dialog.cfx-qrd[open]').catch(() => '');
    ok(/pausamos la clave/.test(dl) && /Tu cuenta está bien/.test(dl), 'al 3er intento: "🔒 Por seguridad pausamos la clave" (no bloquea la cuenta)');
    await t.foto('g32-clave-pausa', p2);
    await p2.click('dialog.cfx-qrd [data-cerrar]');
    await entrar(p2, 'clave123');
    ok(!(await sb(p2, async (s) => !!(await s.auth.getSession()).data.session)) && !!(await p2.$('dialog.cfx-qrd[open]')), 'con la clave correcta tampoco entra: vuelve a ofrecer el enlace');
    await p2.click('dialog.cfx-qrd [data-enlace]'); await p2.waitForTimeout(800);
    ok(/Revisa tu correo/.test(await p2.textContent('dialog.cfx-qrd[open]')) && t.sim.ultimoAuth.otp && t.sim.ultimoAuth.otp.email === 'u@x.cl' && t.sim.ultimoAuth.otp.create_user === false, 'manda el enlace al correo (sin crear cuentas)');
    await p2.click('dialog.cfx-qrd [data-cerrar]');
    // QR también pausado
    const n = await sb(p2, async (s) => (await s.rpc('cfx_qr_crear', { p_equipo: 'Edge en Windows' })).data);
    ok(!(await sb(cel, async (s, c) => (await s.rpc('cfx_qr_aprobar', { p: c })).data, n.codigo)).ok, 'mientras está pausada, el QR tampoco deja entrar');
    // 🔒 no revela si el correo existe
    const nadie = await sb(p2, async (s) => { for (let i = 0; i < 3; i++) await s.rpc('cfx_login_fallo', { p_email: 'nadie@x.cl' }); return (await s.rpc('cfx_login_bloqueado', { p_email: 'nadie@x.cl' })).data; });
    ok(nadie === true, 'un correo sin cuenta responde igual (no revela si existe)');
    const lee = await sb(p2, async (s) => { const r = await s.from('cfx_login_fallos').select('*'); return !!r.error || !(r.data || []).length; });
    ok(lee, 'sin cuenta no se lee la tabla de intentos');
    // 📧 Abre el enlace del correo → entra, se desbloquea y ofrece clave nueva
    // (como el correo real: la página abre con #access_token=…&type=magiclink)
    const ses = await sb(p2, async (s, id) => (await fetch(s.supabaseUrl + '/auth/v1/verify', { method: 'POST', headers: { 'content-type': 'application/json', apikey: 'x' }, body: JSON.stringify({ token_hash: 'th-' + id, type: 'magiclink' }) })).json(), u.id);
    if (process.env.DBG) { p2.on('framenavigated', (f) => { if (f === p2.mainFrame()) console.log('NAV', f.url().slice(0, 60)); }); p2.on('console', (m) => console.log('CON', m.text().slice(0, 150))); }
    await p2.goto('about:blank'); await p2.goto(t.base + '/#access_token=' + ses.access_token + '&refresh_token=' + ses.refresh_token + '&expires_in=36000&expires_at=' + ses.expires_at + '&token_type=bearer&type=magiclink'); await p2.waitForTimeout(2500);
    if (process.env.DBG) console.log(await sb(p2, async (s) => { const se = (await s.auth.getSession()).data.session; return JSON.stringify([!!se, se && JSON.parse(atob(se.access_token.split('.')[1])), Object.keys(sessionStorage), document.querySelectorAll('dialog').length]); }), t.errores.slice(-5));
    ok(/Entraste con el enlace/.test(await p2.textContent('dialog.cfx-qrd[open]').catch(() => '')), 'al entrar por el enlace: "✅ Entraste con el enlace" + cambiar clave');
    ok(A.spa || new URL(p2.url()).pathname === '/', 'espera en la pantalla hasta responder (no se pierde el aviso)');
    await t.foto('g32-clave-nueva', p2);
    await p2.fill('dialog.cfx-qrd [data-nueva]', 'nueva456'); await p2.click('dialog.cfx-qrd [data-guardar]'); await p2.waitForTimeout(800);
    ok(/Clave nueva guardada/.test(await p2.textContent('dialog.cfx-qrd[open]')), 'guarda la clave nueva');
    await p2.click('dialog.cfx-qrd [data-cerrar]'); await p2.waitForTimeout(2000);
    ok(await enApp(p2), 'y recién ahí pasa a su app');
    const [f] = await t.sim.su("select (select count(*)::int from public.cfx_login_fallos where email = 'u@x.cl') as n, (select pass from auth.claves where email = 'u@x.cl') as p");
    ok(f.n === 0 && f.p === 'nueva456', 'quedó desbloqueada y con la clave nueva');
    // Clave nueva funciona; 1 mala y luego buena → el contador vuelve a 0
    const { page: p3 } = await t.nuevo(); await p3.goto(t.base + '/'); await p3.waitForTimeout(1200);
    await entrar(p3, 'otraclave'); await entrar(p3, 'nueva456'); await p3.waitForTimeout(800);
    ok(await sb(p3, async (s) => !!(await s.auth.getSession()).data.session), 'entra con la clave nueva');
    ok((await t.sim.su("select count(*)::int n from public.cfx_login_fallos where email = 'u@x.cl'"))[0].n === 0, 'tras entrar bien, los intentos malos vuelven a 0');
    await p3.setViewportSize({ width: 320, height: 640 });
    const errs = t.errores.filter((x) => !/cfx_login_fallos|status of 40[013]|Invalid login|invalid_credentials/.test(x));
    ok(errs.length === 0, 'sin errores: ' + errs.slice(0, 3).join(' | '));
  } catch (e) { console.log('✗ ' + e.message); process.exitCode = 1; } finally { await t.cerrar(); }
})();
