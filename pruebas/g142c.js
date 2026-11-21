// G142 c · 📱 Redes POR PERSONA (barbero/mecánico, como Booksy): núcleo redes.sql (cfx_redes_persona_*, cfx_redes_equipo) + vitrina.js
// redes.equipo + ayuda.js "📱 Mis redes personales" + comprobante "Síguenos". FALLA con lo viejo. Uso: ANCHO=320 node g142c.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const como = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
const falla = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };
const ADM = 'juanjosuecastilloloyola@gmail.com';
(async () => {
  execSync(__dirname + '/base.sh /home/user/barberia p_g142c', { stdio: 'ignore' });
  const t = await abrir('/home/user/barberia', 'p_g142c'); const p = t.page, su = t.sim.su, C = como(su);
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    await su('select public.preparar_invitacion((select id from public.profiles where email = $1), $2, $3, $4, $5, $6)', [ADM, 'dueno@x.cl', 'Rodrigo', 'owner', '+56911111111', 'Barbería Hermanos']);
    await t.sim.crearUsuario('dueno@x.cl', 'clave123'); await su('update public.profiles set clave_temporal = false, tour_visto = true where true').catch(() => {});
    const cod = (await su('select codigo from public.barberias limit 1'))[0].codigo;
    const IG = [{ red: 'instagram', url: 'https://instagram.com/rodrigo.cortes' }];
    const r = await C('dueno@x.cl', 'public.cfx_redes_persona_guardar($2)', [JSON.stringify(IG)]);
    ok(r.ok && r.lista.length === 1, '📱 el barbero guarda SUS redes');
    ok(/Link no válido/.test(await falla(() => C('dueno@x.cl', 'public.cfx_redes_persona_guardar($2)', [JSON.stringify([{ red: 'instagram', url: 'https://malo.com/x' }])])) || ''), '🛡️ link de otro dominio → rechazado');
    await su("set session_replication_role = replica; insert into auth.users (email) values ('suelto@x.cl'); set session_replication_role = origin");
    ok(/negocio/.test(await falla(() => C('suelto@x.cl', 'public.cfx_redes_persona_guardar($2)', [JSON.stringify(IG)])) || ''), '🔒 alguien sin negocio no guarda redes personales');
    const id = (await su("select id from auth.users where email = 'dueno@x.cl'"))[0].id;
    const eq = (await su('select public.cfx_redes_equipo($1) r', [cod]))[0].r;
    ok(eq[id] && eq[id][0].url === IG[0].url, '🌐 pública: redes del equipo por persona');
    ok(JSON.stringify((await su("select public.cfx_redes_equipo('no-existe') r"))[0].r) === '{}', '🛡️ llave rara → {} sin error');
    ok((await C('dueno@x.cl', 'public.cfx_redes_guardar($2)', [JSON.stringify([{ red: 'tiktok', url: 'https://www.tiktok.com/@barberiahnos' }])])).ok, '↩️ las redes del NEGOCIO siguen igual (cfx_redes_guardar)');
    // 🖥️ /b/: íconos bajo el nombre del barbero
    await p.goto(t.base + '/b/?b=' + cod); await p.waitForTimeout(2500); await t.sinModales(p);
    const n = await p.locator('[data-redes-p="' + id + '"] a.cfx-red').count();
    ok(n === 1, '🖥️ /b/: Instagram junto al barbero (' + n + ')');
    ok(await t.anchoOk(p), '🖥️ ancho ok'); await t.foto('g142c-equipo');
    // 🖥️ Cuenta y ayuda → 📱 Mis redes personales (dueño/barbero)
    await p.goto(t.base + '/'); await p.waitForTimeout(1200);
    await p.fill('input[type=email]:visible', 'dueno@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter');
    await p.waitForTimeout(3500); await t.sinModales(p);
    const hay = await p.evaluate(() => !!(window.CFX_AYUDA_PEND && window.CFX_AYUDA_PEND.equipo_redes));
    ok(hay, '👤 la app marca al barbero como equipo (equipo_redes)');
    // comprobante: Síguenos con las redes del negocio
    const tx = await p.evaluate(async () => { if (!window.CFX_COMPROBANTE) return 'sin comprobante.js'; const d = CFX_COMPROBANTE.abrir ? CFX_COMPROBANTE.abrir({ items: [{ nombre: 'Corte', cant: 1, precio: 8000 }], total: 8000, negocio: 'Barbería' }) : null; await new Promise((r) => setTimeout(r, 1500)); return (document.querySelector('.cb-papel') || {}).innerText || 'sin papel'; });
    ok(/Síguenos: TikTok @barberiahnos/.test(tx), '🧾 comprobante con "Síguenos" ' + JSON.stringify(String(tx).slice(-120)));
  } catch (e) { ok(false, e.message.split('\n')[0]); }
  await t.cerrar();
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
