// G59e · 🧩 BiciTaller módulos 🏷️ Bicis usadas certificadas + 🔄 Parte de pago.
// Sin comprarlos (venta prendida): Más → 🏷️ y 🔄 ofrecen el módulo y la base no deja guardar ni mostrar.
// Con ellos: nueva bici → informe de 50 puntos (✅ Todo bien) → publicar exige foto → 📸 → 📣 Publicar → sale en /t/ y en /u/
// (📲 Me interesa / 💬 oferta por WhatsApp) · ✅ Se vendió · 🔄 calculadora de parte de pago → 🏷️ Pasar a usadas.
// FALLA con el código viejo (no existen bicis_usadas, taller_usadas, u/ ni Más → 🏷️ / 🔄).
// Uso: ./base.sh /home/user/taller p_g59e && ANCHO=320 node g59e_usadas.js
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/taller', 'p_g59e');
  const p = t.page, su = t.sim.su;
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  const toca = async (sel, pg) => { pg = pg || p; await pg.evaluate((x) => document.querySelector(x).scrollIntoView({ block: 'center' }), sel); await pg.waitForTimeout(300); await pg.click(sel); };
  const como = async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
  const dialogo = () => p.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => d.innerText).join(' '));
  const cerrarDialogos = () => p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  const sinScroll = (pg) => (pg || p).evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const ir = async (h) => { await p.evaluate(() => { history.replaceState(null, '', '#hoy'); }); await p.reload(); await p.waitForTimeout(3500); await t.sinModales(); await p.evaluate((x) => { location.hash = x; }, h); await p.waitForTimeout(2000); };
  try {
    await t.sim.crearUsuario('taller@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Ana', nombre: 'Ana' });
    await su('update public.perfiles set terminos_at = now()').catch(() => {});
    await su("update public.talleres set premium_hasta = now() - interval '1 day', telefono = '+56955556666'");
    const dueno = (await su("select id from auth.users where email = 'taller@x.cl'"))[0].id;
    const slug = (await su('select slug from public.talleres'))[0].slug;

    // Venta prendida y sin comprar
    await su("update public.cfx_config set valor = valor || '{\"activo\": true}' where clave = 'modulos_venta'");
    ok((await su("select 'certificadas' = any (public.cfx_modulos_app()) and 'tradein' = any (public.cfx_modulos_app()) x"))[0].x, '🧩 BiciTaller vende 🏷️ certificadas y 🔄 tradein');
    ok((await como('taller@x.cl', 'public.taller_usadas()')).bloqueado === true, '🔒 sin módulo: taller_usadas bloqueado');
    let err = ''; await como('taller@x.cl', "public.taller_usada_guardar('{\"titulo\":\"X\"}')").catch((e) => { err = e.message; });
    ok(/módulo/.test(err), '🔒 sin módulo la base no deja guardar bicis usadas');

    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'taller@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(4500); await t.sinModales();
    const ley = p.locator('dialog.cfx-ayuda[open] [data-acepto]'); if (await ley.count()) { await p.check('dialog.cfx-ayuda[open] [data-ok]'); await ley.click(); await p.waitForTimeout(1500); }
    await t.sinModales();
    await p.evaluate(() => { location.hash = 'mas/usadas'; }); await p.waitForTimeout(2000);
    ok(await p.locator('[data-ofrecer="certificadas"]').count() === 1, '🏷️ Más → Bicis usadas sin módulo: "🧩 Ver el módulo"');
    await toca('[data-ofrecer="certificadas"]'); await p.waitForTimeout(1500);
    ok(/50 de 50/.test(await dialogo()), '▶️ abre la demo de 🏷️');
    await cerrarDialogos();
    await ir('mas/tradein');
    ok(await p.locator('[data-ofrecer="tradein"]').count() === 1, '🔄 Más → Parte de pago sin módulo: "🧩 Ver el módulo"');

    // Con los módulos
    await su("insert into public.cfx_modulos_negocio (negocio, modulo, hasta) values ($1, 'certificadas', now() + interval '30 days'), ($1, 'tradein', now() + interval '30 days')", [dueno]);
    await ir('mas/usadas');
    await toca('#uNueva'); await p.waitForTimeout(1200);
    await p.fill('dialog[open] #uT', 'Trek Marlin 7'); await p.fill('dialog[open] #uTa', 'M'); await p.fill('dialog[open] #uA', '2022'); await p.fill('dialog[open] #uP', '380000');
    await p.evaluate(() => { document.querySelector('dialog[open] [data-p="fr2"]').closest('details').open = true; });
    await toca('dialog[open] [data-p="fr2"]'); await toca('dialog[open] [data-p="fr2"]');
    ok(/Ajustado/.test(await p.locator('dialog[open] [data-p="fr2"]').innerText()), '🔍 tocar 2 veces: 🔧 Ajustado');
    await toca('dialog[open] #uTodo'); await p.waitForTimeout(300);
    ok((await p.locator('dialog[open] #uCont').innerText()) === '50/50', '✅ Todo bien en lo que falta → 50/50');
    ok(await sinScroll(), 'sin scroll horizontal a 320 px (ficha)');
    await t.foto('g59e_ficha');
    await toca('dialog[open] #uPub'); await p.waitForTimeout(1500);
    ok((await su('select count(*)::int n from public.bicis_usadas'))[0].n === 0, '📣 publicar sin foto: no deja (pide 1 foto)');
    await p.setInputFiles('dialog[open] #uF', __dirname + '/bici.png'); await p.waitForTimeout(1500);
    ok(await p.locator('dialog[open] #uFotos img').count() === 1, '📸 foto agregada');
    await toca('dialog[open] #uPub'); await p.waitForTimeout(2500);
    const b = (await su('select * from public.bicis_usadas'))[0] || {};
    ok(b.estado === 'publicada' && b.informe.fr2 === 'ajuste' && b.fotos.length === 1 && /^data:image/.test(b.mini), '📣 publicada con informe (fr2 ajustado), 1 foto y miniatura');
    ok(/Trek Marlin 7/.test(await p.locator('#uLista').innerText().catch(() => '')), '🏷️ aparece en la lista');
    await t.foto('g59e_lista');

    // Público: /t/ y /u/
    const q = await t.ctx.newPage();
    await q.goto(t.base + '/t/?s=' + slug); await q.waitForTimeout(3500);
    ok(/Trek Marlin 7/.test(await q.locator('#usadas').innerText().catch(() => '')), '🚲 /t/: sale en "Bicis usadas certificadas"');
    await q.goto(t.base + '/u/?t=' + b.token); await q.waitForTimeout(3500);
    const u = await q.locator('#todo').innerText().catch(() => '');
    ok(/Trek Marlin 7/.test(u) && /50\/50/.test(u) && /Garantía 3 meses/.test(u), '🔍 /u/: ficha con 50/50 y garantía');
    const wa = decodeURIComponent(await q.locator('#acc a[href*="wa.me"]').getAttribute('href').catch(() => '') || '');
    ok(/Me interesa la Trek Marlin 7/.test(wa), '📲 Me interesa por WhatsApp al taller');
    ok(await sinScroll(q), 'sin scroll horizontal a 320 px (/u/)');
    await t.foto('g59e_publica', q).catch(() => q.screenshot({ path: __dirname + '/capturas/g59e_publica.png' }));
    ok((await su("select public.usada_ver('cualquiercosa12345678901') r"))[0].r === null, 'token inválido: nada');

    // ✅ Se vendió
    await ir('mas/usadas');
    await toca('[data-u="' + b.id + '"]'); await p.waitForTimeout(1500);
    await toca('dialog[open] #uV'); await p.waitForTimeout(800);
    await p.locator('dialog[open] [data-si]').last().click().catch(() => {}); await p.waitForTimeout(2000);
    ok((await su('select estado from public.bicis_usadas'))[0].estado === 'vendida', '✅ Se vendió → vendida');
    ok((await su('select jsonb_array_length(public.usadas_publicas($1)) n', [slug]))[0].n === 0, 'vendida: sale de la vitrina');

    // 🔄 Parte de pago
    await ir('mas/tradein');
    await p.fill('#tiT', 'Oxford Mercury'); await p.fill('#tiN', '450000'); await p.waitForTimeout(500);
    ok(/165\.000/.test(await p.locator('#tiOf').innerText().catch(() => '')), '🔄 2 años, buena, $450.000 nueva, 25% → ofrécele $165.000');
    ok(await sinScroll(), 'sin scroll horizontal a 320 px (parte de pago)');
    await t.foto('g59e_tradein');
    await toca('#tiUs'); await p.waitForTimeout(1500);
    ok(await p.locator('dialog[open] #uT').inputValue() === 'Oxford Mercury' && await p.locator('dialog[open] #uP').inputValue() === '220000', '🏷️ Pasar a usadas: borrador con modelo y precio $220.000');

    // Sin módulo la ficha pública no se ve
    await su("delete from public.cfx_modulos_negocio where modulo = 'certificadas'");
    ok((await su('select public.usada_ver($1) r', [b.token]))[0].r === null, '🔒 sin módulo: /u/ ya no muestra la bici');
  } catch (e) { f++; console.log('✗ ' + e.message.split('\n')[0]); await t.foto('g59e_error').catch(() => {}); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|favicon|404|Sube al menos 1 foto/.test(x)).join('\n') || 'ninguno');
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); await t.cerrar(); process.exit(f ? 1 : 0);
})();
