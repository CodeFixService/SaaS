const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  const t = await abrir('/home/user/saas', 'p_saas', { conHola: true });
  const p = t.page;
  try {
    const u = await t.sim.crearUsuario('ana@x.cl', 'clave123');
    await t.sim.su("update public.perfiles set premium_hasta = now() + interval '30 days' where id = $1", [u.id]);
    await t.sim.su("update public.cfx_config set valor = '{\"site_key\": \"0x4AAAAAAAprueba\"}' where clave = 'humano'");
    await p.goto(t.base + '/'); await p.fill('input[type=email]', 'ana@x.cl'); await p.fill('input[type=password]', 'clave123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/app/, { timeout: 15000 }); await p.waitForTimeout(3500);
    const b = t.sim.ultimoAuth.body || {};
    assert(b.gotrue_meta_security && b.gotrue_meta_security.captcha_token === 'token-prueba', 'token de Turnstile enviado a Supabase');
    assert(await p.evaluate(() => document.documentElement.classList.contains('cfx-premium')), 'app dorada con Pro');
    assert(await p.locator('dialog.cfx-hola').count() === 1, 'bienvenida Premium');
    await t.foto('premium');
    await p.click('dialog.cfx-hola button'); await p.reload(); await p.waitForTimeout(2500);
    assert(await p.locator('dialog.cfx-hola').count() === 0, 'bienvenida solo una vez');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.join('\n') || 'ninguno');
  await t.cerrar();
})();
