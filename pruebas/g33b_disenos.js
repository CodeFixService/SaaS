// G33b ✏️ Despega Pyme: "Fichas" se llama "Diseños" (menú, título, guardar, mensajes del servidor, plan Pro). Ruta apps/fichas/ igual.
// Uso: node g33b_disenos.js [bd]  (antes ./base.sh /home/user/Aplicaciones <bd>)
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/Aplicaciones', process.argv[2] || 'p_g33b');
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  try {
    await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Café Ana' });
    await t.sim.su('update public.profiles set terms_at = now()');
    const q = t.page;
    await q.goto(t.base + '/'); await q.evaluate(() => { localStorage.clear(); localStorage.setItem('cfx:tour:orbita-inicio', '1'); });
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.fill('input[type=email]:visible', 'tienda@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3500);
    await t.sinModales(q);
    const txt = await q.evaluate(() => document.body.innerText);
    ok(/Diseños/.test(txt) && !/\bFichas?\b/i.test(txt), 'inicio: dice "Diseños" y ya no "Fichas"');
    await t.foto('g33b-inicio', q);
    await q.goto(t.base + '/apps/fichas/'); await q.waitForTimeout(2500); await t.sinModales(q);
    ok(/Diseños/.test(await q.title()) && (await q.textContent('h1')).trim() === 'Diseños', 'la pantalla se titula "Diseños" (ruta apps/fichas/ igual)');
    await q.fill('#f-titulo', 'Promo café'); await q.waitForTimeout(600);
    await q.click('#bGuardar');
    const toast = await q.waitForSelector('text=/Diseño guardado/', { timeout: 6000 }).then(() => true).catch(() => false);
    ok(toast, 'al guardar: "Diseño guardado"');
    await q.waitForTimeout(2500);
    await q.reload(); await q.waitForTimeout(2500); await t.sinModales(q);
    await q.click('[data-v=galeria]'); await q.waitForTimeout(800);
    const t2 = await q.evaluate(() => document.body.innerText);
    ok(/Promo café/.test(t2) && !/\bfichas?\b/i.test(t2), 'tras recargar: el diseño sigue y no queda la palabra "ficha"');
    await q.setViewportSize({ width: 320, height: 700 }); ok(await t.anchoOk(q), '320 px sin corrimiento');
    await t.foto('g33b-disenos', q);
    const [pl] = await t.sim.su("select beneficios::text b from public.planes where codigo = 'negocio_pro'");
    ok(/60 diseños/.test(pl.b) && !/fichas/.test(pl.b), 'plan Pro: "60 diseños"');
    const [s] = await t.sim.su("select prosrc from pg_proc where proname = 'publicar_ficha' order by oid desc limit 1");
    ok(/El diseño necesita un título/.test(s.prosrc) && !/ficha/i.test(s.prosrc.replace(/publicar_ficha|'fichas'/g, '')), 'mensajes del servidor dicen "diseño"');
    const [v] = await t.sim.su('select public.db_version() v'); ok(v.v === '5.47', 'base 5.47');
    const err = t.errores.filter((e) => !/subir respaldos|409 \(Conflict\)/.test(e));
    ok(!err.length, 'sin errores ' + JSON.stringify(err.slice(0, 3)));
  } finally { await t.cerrar(); }
})();
