// G114 · 🐞 CM → 📋 Tablero: mover una tarea HACIA ATRÁS (En revisión → Haciendo → Por hacer) con el dedo se queda en el Tablero.
// Causa: el núcleo (ayuda.js) tomaba todo botón con "atrás" en su aria-label ("Mover atrás") como "Volver" → history.back().
// FALLA con el código viejo (salta a la pantalla anterior y la tarea no se mueve).  Uso: ./base.sh /home/user/saas p_g114 && ANCHO=320 node g114.js
const { abrir } = require('./h');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  const t = await abrir('/home/user/saas', 'p_g114', { tactil: true }), p = t.page;
  try {
    const u = await t.sim.crearUsuario('ana@x.cl', 'clave123');
    await t.sim.su("insert into public.items (owner, tipo, titulo, estado) values ($1, 'tarea', 'Tarea de prueba', 'revision')", [u.id]);
    await p.goto(t.base + '/'); await p.waitForTimeout(1000);
    await p.fill('input[type=email]:visible', 'ana@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3500); await t.sinModales(p);
    await p.goto(t.base + '/app/#hoy'); await p.waitForTimeout(1500); await t.sinModales(p);
    await p.goto(t.base + '/app/#tablero'); await p.waitForTimeout(2000); await t.sinModales(p);
    const est = async () => (await t.sim.su("select estado from public.items where titulo = 'Tarea de prueba'"))[0].estado;
    const col = async () => p.evaluate(() => { const k = [...document.querySelectorAll('.tk')].find((x) => /Tarea de prueba/.test(x.textContent)); return k ? k.closest('.col').dataset.col : null; });
    ok(await col() === 'revision', 'la tarea parte en En revisión');
    for (const [a, txt] of [['en_curso', 'Haciendo'], ['abierto', 'Pendiente']]) {
      await p.tap('.tk:has-text("Tarea de prueba") [data-mv]:first-child'); await p.waitForTimeout(1800); await t.sinModales(p);
      ok(/#tablero/.test(p.url()), 'sigue en el Tablero (' + p.url().replace(t.base, '') + ')');
      ok(await est() === a, 'en la base quedó ' + a + ' (' + await est() + ')');
      ok(await col() === a, 'en pantalla se ve en ' + txt);
    }
    await p.tap('.tk:has-text("Tarea de prueba") [data-mv]'); await p.waitForTimeout(1500);
    ok(await est() === 'en_curso' && /#tablero/.test(p.url()), 'hacia adelante sigue funcionando');
    await p.screenshot({ path: __dirname + '/capturas/g114.png' });
    // Los "Volver" de verdad siguen yendo atrás.
    const { page: q } = await t.nuevo();
    await q.goto(t.base + '/'); await q.waitForTimeout(800);
    await q.evaluate(() => { const b = document.createElement('button'); b.id = 'vv'; b.setAttribute('aria-label', 'Volver al inicio'); document.body.append(b); });
    await q.evaluate(() => { location.hash = '#a'; }); await q.waitForTimeout(200); await q.evaluate(() => { location.hash = '#b'; }); await q.waitForTimeout(200);
    await q.click('#vv'); await q.waitForTimeout(500);
    ok(/#a$/.test(q.url()), '"Volver al inicio" sigue haciendo atrás (' + q.url().replace(t.base, '') + ')');
  } catch (e) { ok(false, 'se cortó: ' + e.message.split('\n')[0]); }
  const err = t.errores.filter((x) => !/ERR_|status of 404|favicon/.test(x));
  ok(!err.length, 'sin errores JS ' + err.slice(0, 3).join(' | '));
  console.log(f ? '✗ ' + f + ' fallas' : '✓ G114 OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
