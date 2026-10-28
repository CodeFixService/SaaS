const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
async function entrar(t, p, email, pass) {
  await p.goto(t.base + '/'); await p.waitForTimeout(1000);
  await p.fill('input[type=email]:visible', email); await p.fill('input[type=password]:visible', pass); await p.press('input[type=password]:visible', 'Enter');
  await p.waitForTimeout(3000); await t.sinModales(p);
}
(async () => {
  const t = await abrir('/home/user/Aplicaciones', 'p_aplicaciones');
  const p = t.page;
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Pepe','client',$1)", [u.id]);
    const c = await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await t.sim.su("update public.profiles set terms_at = now()");
    await t.sim.su("insert into public.messages (sender, recipient, body) values ($1,$2,'hola tienda'),($2,$1,'hola cliente')", [c.id, u.id]);
    await t.sim.su("insert into public.catalog_items (owner_id, client_key, nombre, precio, stock) values ($1,'k1','Vaso',1000,3)", [u.id]);
    await t.sim.su("select public.notify_user($1, 'Aviso uno', 'cuerpo', './'), public.notify_user($1, 'Aviso dos', 'cuerpo', './')", [u.id]);
    await t.sim.su("update public.notifications set status = 'sent', sent_at = now()");
    await entrar(t, p, 'tienda@x.cl', 'clave123');
    await p.goto(t.base + '/#avisos'); await p.waitForTimeout(1500); await t.sinModales();
    assert(await p.locator('[data-ocultar]').count() >= 2, 'avisos con ✕');
    await p.locator('[data-ocultar]').first().click(); await p.waitForTimeout(700);
    assert((await t.sim.su('select count(*)::int n from notification_reads where oculto'))[0].n === 1, 'aviso oculto');
    await t.foto('avisos');
    await p.goto(t.base + '/#ajustes'); await p.waitForTimeout(1500); await t.sinModales();
    const [d] = await Promise.all([p.waitForEvent('download'), p.click('#bRespaldo')]);
    await d.saveAs('/tmp/claude-0/apl_neg.xlsx'); assert(/\.xlsx$/.test(d.suggestedFilename()), 'respaldo tienda');
    assert(await t.anchoOk(), 'ancho ajustes'); await t.foto('ajustes');
    await p.goto(t.base + '/apps/mensajes/'); await p.waitForTimeout(2000); await t.sinModales();
    await p.locator('.conv').first().click(); await p.waitForTimeout(1000);
    assert(await t.anchoOk(), 'ancho chat'); await t.foto('chat');
    await p.click('#bBorrarChat'); await p.waitForTimeout(1200);
    assert((await t.sim.su('select count(*)::int n from messages'))[0].n === 0, 'chat borrado');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.join('\n') || 'ninguno');
  await t.cerrar();
})();
