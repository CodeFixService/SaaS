// G84 c Estaciona: 🔎 filtros 📹 Cámara y 🚪 Portón automático (publicar, ficha, chips, hoja de filtros) + patentes en mi_respaldo.
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  const t = await abrir('/home/user/estacionamiento', process.env.BD || 'p_g84c', {});
  const p = t.page, su = t.sim.su;
  try {
    const d = await t.sim.crearUsuario('dueno@x.cl', 'clave123');
    await su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = 'dueno'");
    const ins = (ti, la, x) => su("insert into public.estacionamientos (dueno, titulo, direccion, comuna, lat, lng, precio_hora" + x[0] + ") values ($1,$2,'Calle 1','Santiago',$3,-70.65,1000" + x[1] + ') returning id', [d.id, ti, la]);
    const e1 = (await ins('Con camara', -33.44, [', camara', ', true']))[0].id;
    await ins('Con porton', -33.4405, [', porton', ', true']);
    await ins('Sin nada', -33.441, ['', '']);
    await su("update estacionamientos set fotos = array[$1 || '/a.jpg'] where id = $2", [d.id, e1]);
    // Mapa: los 3
    const r = await t.sim.rpc('public', 'mapa', { p_s: -34, p_w: -71, p_n: -33, p_e: -70 });
    assert(r.length === 3 && r.find((x) => x.id === e1).cam === true && r.filter((x) => x.pt).length === 1, 'mapa() devuelve cam y pt');
    await p.goto(t.base + '/#/'); await p.waitForTimeout(3000); await t.sinModales();
    await p.evaluate(() => { localStorage.removeItem('est:filtros'); });
    const chip = (tx) => p.locator('#chipsFiltro button', { hasText: tx });
    assert(await chip('Cámara').count() === 1 && await chip('Portón').count() === 1, 'chips Cámara y Portón');
    const n = async () => { await p.click('#btnLista'); await p.waitForTimeout(400); const v = +((await p.textContent('#listaTit')).match(/\d+/) || [0])[0]; ULT = await p.textContent('#lista'); await p.click('#cerrarLista'); await p.waitForTimeout(200); return v; };
    let ULT = '';
    assert(await n() === 3, 'lista: 3 sin filtros');
    await chip('Cámara').click(); await p.waitForTimeout(500);
    assert(await n() === 1 && /Cámara/.test(ULT), 'filtro Cámara deja 1');
    await chip('Cámara').click(); await chip('Portón').click(); await p.waitForTimeout(500);
    assert(await n() === 1, 'filtro Portón deja 1');
    assert(await t.anchoOk(), 'ancho mapa + chips'); await t.foto('g84c-chips');
    await chip('Portón').click(); await p.waitForTimeout(300);
    // Hoja de filtros
    await p.click('#btnFiltros'); await p.waitForSelector('#fCam');
    await p.check('#fCam'); await p.check('#fPt'); await t.foto('g84c-filtros'); assert(await t.anchoOk(), 'ancho hoja filtros');
    await p.click('#fOk'); await p.waitForTimeout(500);
    assert(await n() === 0, 'cámara + portón: ninguno');
    await p.click('#btnFiltros'); await p.waitForSelector('#fLimpiar'); await p.click('#fLimpiar'); await p.waitForTimeout(500);
    assert(await n() === 3, 'limpiar vuelve a 3');
    // Ficha
    await p.goto(t.base + '/#/e/' + e1); await p.waitForTimeout(2500); await t.sinModales();
    assert(/Cámara/.test(await p.textContent('.carac')), 'la ficha muestra 📹 Cámara');
    // Editar como dueño: marcar portón
    await p.goto(t.base + '/#/avisos'); await p.waitForTimeout(1500);
    await p.click('button[data-t=in]'); await p.waitForTimeout(300);
    await p.fill('#lEmail', 'dueno@x.cl'); await p.fill('#lClave', 'clave123'); await p.press('#lClave', 'Enter');
    await p.waitForTimeout(2500); await t.sinModales();
    await p.goto(t.base + '/#/editar/' + e1); await p.waitForTimeout(2500); await t.sinModales();
    assert(await p.isChecked('#pCam') && !(await p.isChecked('#pPt')), 'editar trae cámara marcada');
    await p.check('#pPt'); assert(await t.anchoOk(), 'ancho publicar'); await t.foto('g84c-publicar');
    await p.locator('form button[type=submit], #pOk').first().click(); await p.waitForTimeout(3000);
    assert((await su('select porton, camara from estacionamientos where id = $1', [e1]))[0].porton === true, 'guarda portón');
    // App antigua (no manda camara/porton) no los borra
    await t.sim.rpc('public', 'guardar_estacionamiento', { p: { id: e1, titulo: 'Con camara', direccion: 'Calle 1', comuna: 'Santiago', lat: -33.44, lng: -70.65, precio_hora: 1000, fotos: [d.id + '/a.jpg'] } }, { sub: d.id, email: 'dueno@x.cl' });
    const x = (await su('select porton, camara from estacionamientos where id = $1', [e1]))[0];
    assert(x.porton && x.camara, 'la app antigua no borra cámara/portón');
    // Respaldo con patentes
    await su("insert into patentes (usuario, patente, alias) values ($1,'ABCD12','Auto')", [d.id]);
    const resp = await t.sim.rpc('public', 'mi_respaldo', {}, { sub: d.id, email: 'dueno@x.cl' });
    assert(JSON.stringify(resp['Mis patentes'] || '').includes('ABCD12'), 'mi_respaldo trae Mis patentes');
    console.log('G84c OK');
  } catch (e) { console.error(e.message); await t.foto('g84c-error').catch(() => {}); process.exitCode = 1; }
  await t.cerrar();
})();
