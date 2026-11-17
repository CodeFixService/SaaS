// G81 · a) CM → Apps → 🧩: cards con espacio + campaña con botones de un toque (✅ Todos, meses, 15/30/60/90 días)
//       b) íconos por contexto: "📣 Compartir" ya no sale con parlante · c) (aparte) · d) 🔑 keys de módulos/packs en lote, 1 uso.
// FALLA con el código viejo (dialog .card margin 0, sin .cfx-chips, sin columna item ni cfx_key_dar).
// Uso: ANCHO=320 node g81.js
const { abrir } = require('./h');
const { execSync } = require('child_process');
(async () => {
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  execSync(__dirname + '/base.sh /home/user/saas p_g81', { stdio: 'ignore' });
  const t = await abrir('/home/user/saas', 'p_g81'); const p = t.page, su = t.sim.su;
  const como = async (email, expr) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email]))[0].r;
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123'); await t.sim.crearUsuario('tienda@x.cl', 'clave123');
    await su("create or replace function public.cfx_modulos_app() returns text[] language sql immutable as $$ select array['chat', 'cupones'] $$");
    await su("update public.cfx_config set valor = valor || '{\"activo\": true, \"precio\": 1490}' where clave = 'modulos_venta'");
    await p.goto(t.base + '/'); await p.fill('input[type=email]', 'juanjosuecastilloloyola@gmail.com'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800); await t.sinModales();
    // ---- a) cards y campaña ----
    await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(5000); await t.sinModales();
    await p.click('[data-app=cm] [data-a=rec]'); await p.waitForTimeout(2500);
    await p.click('[data-app=cm] [data-a=mod]'); await p.waitForTimeout(2000);
    const a = await p.evaluate(() => {
      const d = [...document.querySelectorAll('dialog')].pop(), cs = [...d.querySelectorAll('#venta > .card, #ventaMas > .card')].filter((c) => c.offsetParent).sort((x, y) => x.getBoundingClientRect().top - y.getBoundingClientRect().top);
      let min = 99; for (let i = 1; i < cs.length; i++) min = Math.min(min, cs[i].getBoundingClientRect().top - cs[i - 1].getBoundingClientRect().bottom);
      return { n: cs.length, min, chips: d.querySelectorAll('#campCard .cfx-chip').length, todos: !!d.querySelector('#cTodos'), ancho: document.documentElement.scrollWidth <= innerWidth + 1 };
    });
    ok(a.n >= 3 && a.min >= 10, 'a) espacio entre cards ≥ 10 px ' + JSON.stringify(a));
    ok(a.chips === 8 && a.todos && a.ancho, 'a) campaña: ✅ Todos + 4 meses + 4 duraciones, sin desborde');
    const b = await p.evaluate(() => {
      const d = [...document.querySelectorAll('dialog')].pop();
      d.querySelector('#cTodos').click();
      d.querySelector('[data-grupo=cMeses] [data-v="6"]').click(); d.querySelector('[data-grupo=cHasta] .cfx-chip:nth-child(3)').click();
      return { todos: [...d.querySelectorAll('[data-camp]')].every((x) => x.checked), meses: d.querySelector('#cMeses').value, hasta: d.querySelector('#cHasta').value,
        on: d.querySelector('[data-grupo=cMeses] .on').dataset.v };
    });
    const en60 = (await su("select to_char((now() at time zone 'America/Santiago')::date + 60, 'YYYY-MM-DD') d"))[0].d;
    ok(b.todos && b.meses === '6' && b.on === '6' && b.hasta === en60, 'a) un toque: todos, 6 meses, 60 días ' + JSON.stringify(b));
    // ---- c) 📅 calendario propio del núcleo (no el de Android) en "Termina el" ----
    await p.click('#cHasta'); await p.waitForTimeout(400);
    const c1 = await p.evaluate(() => { const g = document.querySelector('dialog.cfx-el[open]'); return g && [g.querySelector('.cfx-el-cab b').textContent, g.querySelectorAll('.cfx-el-d[data-f]').length, document.documentElement.scrollWidth <= innerWidth + 1]; });
    ok(c1 && /Termina el/.test(c1[0]) && c1[1] >= 28 && c1[2], 'c) 📅 calendario propio al tocar la fecha ' + JSON.stringify(c1));
    await t.foto('g81_calendario');
    await p.click('dialog.cfx-el [data-x]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !document.querySelector('dialog.cfx-el') && !!document.querySelector('#campCard')), 'c) ✕ cierra solo el calendario');
    await p.evaluate(() => [...document.querySelectorAll('dialog')].pop().querySelector('#cOk').click()); await p.waitForTimeout(1500);
    const v = (await su("select valor -> 'campana' c from cfx_config where clave = 'modulos_venta'"))[0].c;
    ok(v && v.meses === 6 && v.modulos.length === 2 && v.hasta === en60, 'a) 🎁 Lanzar campaña guarda lo elegido ' + JSON.stringify(v));
    await p.evaluate(() => [...document.querySelectorAll('dialog')].pop().querySelector('#campCard').scrollIntoView()); await p.waitForTimeout(300); await t.foto('g81_campana');
    await p.evaluate(() => [...document.querySelectorAll('dialog')].pop().close());
    // ---- b) íconos por contexto ----
    const ic = await p.evaluate(() => { const el = document.createElement('div'); el.innerHTML = '<button>📣 Compartir</button><button>📣 Oferta</button><button>✅ Notificaciones</button><span><i>📣</i> <b>Compartir</b></span>';
      document.body.appendChild(el); window.CodeFixIconos.procesar(el); return [...el.querySelectorAll('svg')].map((s) => s.querySelector('circle[cx="18"][cy="5"]') ? 'compartir' : s.innerHTML.slice(0, 12)); });
    ok(ic[0] === 'compartir' && ic[1] !== 'compartir' && ic[2] !== 'compartir' && ic[3] === 'compartir', 'b) 📣 Compartir → ícono compartir (Oferta y ✅ quedan) ' + JSON.stringify(ic));
    // ---- d) keys de módulos en lote ----
    await p.goto(t.base + '/admin/#control'); await p.waitForTimeout(4000); await t.sinModales();
    await p.click('[data-s=keys]'); await p.waitForTimeout(1500);
    const op = await p.evaluate(() => [...document.querySelectorAll('#kI option')].map((o) => o.value));
    ok(op[0] === '' && op.includes('chat') && op.includes('cupones'), 'd) Qué activa: Premium + módulos + packs ' + JSON.stringify(op));
    await p.click('#kI'); await p.waitForTimeout(400);
    const c2 = await p.evaluate(() => { const g = document.querySelector('dialog.cfx-el[open]'); return g && [g.querySelector('.cfx-el-cab b').textContent, [...g.querySelectorAll('.cfx-el-op')].map((b) => b.textContent)]; });
    ok(c2 && /Qué activa/.test(c2[0]) && c2[1].some((x) => /Chat/.test(x)), 'c) 📋 lista propia (hoja) en "Qué activa" ' + JSON.stringify(c2 && c2[0]));
    await t.foto('g81_lista');
    await p.locator('dialog.cfx-el .cfx-el-op', { hasText: 'Chat' }).click(); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.querySelector('#kI').value === 'chat' && getComputedStyle(document.querySelector('#kRl')).display === 'none'), 'c) elegir en la hoja pone el valor y avisa (change)'); await p.click('[data-grupo=kN] [data-v="5"]'); await p.click('[data-grupo=kD] [data-v="90"]');
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('#kRl')).display === 'none'), 'd) módulo: "Para" se oculta (solo negocios)');
    await p.click('#kG'); await p.waitForTimeout(1200);
    const txt = await p.locator('#kOut pre').innerText(), cods = txt.match(/CFX-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/g) || [];
    const cop = await p.locator('#kCop').innerText();
    ok(cods.length === 5 && /90 días/.test(txt) && /Tengo una key/.test(txt) && /Copiar todas \(5\)/.test(cop), 'd) lote de 5 con 📋 Copiar todas ' + JSON.stringify(txt.slice(0, 60)));
    await t.foto('g81_keys');
    const db = await su("select count(*)::int n, min(item) i, min(dias) d from cfx_keys where item = 'chat'");
    ok(db[0].n === 5 && db[0].d === 90, 'd) 5 keys de chat x 90 días en la base');
    // Canje: negocio
    const r1 = await como('tienda@x.cl', "public.cfx_key_canjear('" + cods[0] + "')");
    const m1 = await su("select round(extract(epoch from hasta - now()) / 86400) d, origen from cfx_modulos_negocio where modulo = 'chat'");
    ok(r1.item === 'chat' && m1.length === 1 && m1[0].d >= 89 && m1[0].d <= 90, 'd) canjear: chat activo 90 días ' + JSON.stringify([r1, m1]));
    const r2 = await como('tienda@x.cl', "public.cfx_key_canjear('" + cods[0] + "')");
    ok(r2.error && /ya usada/.test(r2.error), 'd) 1 solo uso');
    const r3 = await como('tienda@x.cl', "public.cfx_key_canjear('" + cods[1] + "')");
    const sin = (await su("select usada_por is null u from cfx_keys where ultimos = '" + cods[1].slice(-4) + "'"))[0].u;
    ok(r3.error && /Ya tienes/.test(r3.error) && sin, 'd) módulo ya activo: no gasta la key ' + JSON.stringify(r3));
    let e1 = ''; try { await como('tienda@x.cl', "public.cfx_keys_crear(1, 'negocio', 30, '', 'chat')"); } catch (x) { e1 = x.message; }
    ok(/Solo|admin|permiso|autoriz/i.test(e1), 'd) un negocio no puede crear keys ' + e1.slice(0, 40));
    let e2 = ''; try { await como('juanjosuecastilloloyola@gmail.com', "public.cfx_keys_crear(1, 'cliente', 30, '', 'chat')"); } catch (x) { e2 = x.message; }
    ok(/no válido/.test(e2), 'd) key de módulo para cliente: no');
    // Premium sigue igual
    const pr = await como('juanjosuecastilloloyola@gmail.com', "public.cfx_keys_crear(1, 'negocio', 30)");
    const r4 = await como('tienda@x.cl', "public.cfx_key_canjear('" + pr[0] + "')");
    ok(r4.nombre === 'Premium' && r4.dias === 30 && r4.hasta, 'd) key Premium sigue funcionando ' + JSON.stringify(r4));
  } catch (x) { f++; console.log('✗ ERROR', x.message); await t.foto('g81_error').catch(() => {}); }
  await t.cerrar();
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
