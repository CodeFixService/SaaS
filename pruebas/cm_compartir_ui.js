// Compartir en la app de anotar: Juan vincula a Ana, le comparte un pedido; Ana marca ✓ / No hay + reemplazo y lo pasa a Listo; Juan lo ve.
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  const t = await abrir('/home/user/saas', 'p_saas');
  const p = t.page;
  try {
    const j = await t.sim.crearUsuario('juan@x.cl', 'clave123'), a = await t.sim.crearUsuario('ana@x.cl', 'clave123');
    await t.sim.su("update public.perfiles set nombre = 'Juan' where id = $1", [j.id]); await t.sim.su("update public.perfiles set nombre = 'Ana' where id = $1", [a.id]);
    await t.sim.su("insert into public.items (owner, tipo, titulo, estado, datos) values ($1, 'pedido', 'María', 'abierto', '{\"items\":[{\"que\":\"Pan\",\"cant\":\"2\"},{\"que\":\"Leche\",\"cant\":\"1\"}]}')", [j.id]);
    const entrar = async (pg, em) => { await pg.goto(t.base + '/'); await pg.fill('input[type=email]', em); await pg.fill('input[type=password]', 'clave123'); await pg.press('input[type=password]', 'Enter'); await pg.waitForURL(/app/); await pg.waitForTimeout(1500); await t.sinModales(pg); };
    // Juan: su código
    await entrar(p, 'juan@x.cl');
    await p.goto(t.base + '/app/#mas'); await p.waitForTimeout(1500); await t.sinModales(p);
    const cod = (await p.locator('#vCod').innerText()).trim();
    assert(/^JUAN-\d{4}$/.test(cod), 'código de Juan ' + cod);
    assert(await t.anchoOk(), 'ancho 360 cuentas vinculadas');
    // Ana se vincula
    const { page: q } = await t.nuevo();
    await entrar(q, 'ana@x.cl');
    await q.goto(t.base + '/app/#mas'); await q.waitForTimeout(1500); await t.sinModales(q);
    await q.fill('#vIn', cod); await q.click('[data-act=vincular]'); await q.waitForTimeout(1200);
    assert(/Juan/.test(await q.locator('#vL').innerText()), 'Ana ve a Juan vinculado');
    // Juan comparte el pedido
    await p.goto(t.base + '/app/#pedidos'); await p.waitForTimeout(1500); await t.sinModales(p);
    await p.click('.ped [data-act=editar]'); await p.waitForTimeout(800);
    await p.click('dialog details.comp summary'); await p.waitForTimeout(900);
    await p.click('dialog [data-con]'); await p.waitForTimeout(1000);
    assert((await t.sim.su('select count(*)::int n from public.compartidos where con = $1', [a.id]))[0].n === 1, 'pedido compartido con Ana');
    await t.foto('compartir-dueno');
    await p.keyboard.press('Escape');
    // Ana lo ve, marca Pan ✓, Leche "No hay" + reemplazo, y lo pasa a Listo
    await q.reload(); await q.waitForTimeout(1500); await q.goto(t.base + '/app/#pedidos'); await q.waitForTimeout(1800); await t.sinModales(q);
    assert(/de Juan/.test(await q.locator('.ped').first().innerText()), 'Ana ve el pedido "de Juan"');
    await q.click('.ped [data-act=editar]'); await q.waitForTimeout(800);
    await q.click('dialog [data-ok="0"]'); await q.click('dialog [data-no="1"]');
    await q.fill('#cpQ', 'Leche sin lactosa'); await q.fill('#cpN', '1'); await q.selectOption('#cpR', '1'); await q.click('#cpAdd');
    await q.click('dialog #cpE [data-e=listo]');
    assert(await t.anchoOk(q), 'ancho 360 pedido compartido');
    await t.foto('compartir-recibe', q);
    await q.click('#cpOk'); await q.waitForTimeout(1200);
    const r = (await t.sim.su("select estado, datos from public.items where tipo = 'pedido'"))[0];
    assert(r.estado === 'listo' && r.datos.items.length === 3 && r.datos.items[1].nohay && r.datos.items[2].reemplazo === 1, 'cambios guardados (No hay queda + reemplazo)');
    assert((await t.sim.su("select count(*)::int n from public.notificaciones where para = $1 and titulo like '🔄 Ana%'", [j.id]))[0].n === 1, 'Juan recibe el aviso del cambio');
    // Ana no puede borrarlo (no ve el botón)
    await q.click('[data-f=listo]'); await q.waitForTimeout(400); await q.click('.ped [data-act=editar]'); await q.waitForTimeout(600);
    assert(await q.locator('dialog #pDel').count() === 0, 'Ana no tiene Borrar');
  } catch (e) { console.log(e.message); await t.foto('error'); }
  console.log('ERRORES:', t.errores.join('\n') || 'ninguno');
  await t.cerrar();
})();
