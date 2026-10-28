const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
async function entrar(t, p, email) {
  await p.goto(t.base + '/'); await p.waitForTimeout(1000);
  await p.fill('input[type=email]:visible', email); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
  await p.waitForTimeout(3000); await t.sinModales(p);
}
(async () => {
  const t = await abrir('/home/user/barberia', 'barberia_prueba');
  const p = t.page;
  try {
    const due = (await t.sim.su("select id from public.profiles where email = 'dueno@test.cl'"))[0].id;
    await t.sim.su("update public.profiles set clave_temporal = false where true").catch(() => {});
    await t.sim.su("insert into public.avisos (para, tipo, titulo, cuerpo) values ($1,'aviso','Uno','a'),($1,'aviso','Dos','b')", [due]);
    await t.sim.su("insert into public.messages (sender, recipient, body) select id, $1, 'hola' from public.profiles where email = 'carlos@test.cl'", [due]);
    await entrar(t, p, 'dueno@test.cl');
    console.log('url', p.url());
    await p.click('#bCampana'); await p.waitForTimeout(1200);
    const n0 = await p.locator('[data-ocultar]').count();
    assert(n0 >= 2, 'avisos con ✕ (' + n0 + ')');
    await p.locator('[data-ocultar]').first().click(); await p.waitForTimeout(800);
    assert(await p.locator('[data-ocultar]').count() === n0 - 1, 'quita uno');
    await t.foto('campana');
    await p.goto(t.base + '/equipo/#respaldo'); await p.waitForTimeout(2000); await t.sinModales();
    const [d] = await Promise.all([p.waitForEvent('download'), p.click('#bRespaldo')]);
    await d.saveAs('/tmp/claude-0/bar_neg.xlsx'); assert(true, 'respaldo barbería');
    assert(await t.anchoOk(), 'ancho respaldo'); await t.foto('respaldo');
    await p.goto(t.base + '/equipo/#chat'); await p.waitForTimeout(2000); await t.sinModales();
    const antes = (await t.sim.su('select count(*)::int n from messages where sender=$1 or recipient=$1', [due]))[0].n;
    await p.locator('[data-l] li').first().click(); await p.waitForTimeout(1200);
    await p.click('[data-menu]'); await p.waitForTimeout(500); await p.click('[data-x]'); await p.waitForTimeout(500);
    await p.locator('button', { hasText: 'Borrar' }).last().click(); await p.waitForTimeout(1200);
    const desp = (await t.sim.su('select count(*)::int n from messages where sender=$1 or recipient=$1', [due]))[0].n;
    assert(desp < antes, 'chat borrado ' + antes + '→' + desp);
    assert(await t.anchoOk(), 'ancho chat'); await t.foto('chat');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.join('\n') || 'ninguno');
  await t.cerrar();
})();
