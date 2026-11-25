// G165 · 🐞 Túnel, primero lo barato: 🎨 Billetera #4/#11 (el color de la app no quedaba: --brand viejo de carga.js mandaba) ·
//   núcleo: un solo botón ↺ "de fábrica" (Billetera #6, Despega #12, Barbería #6, BiciTaller #6) · BiciTaller #9 (bici usada con ✕) y #10 (sin globito en Más) ·
//   Despega #8/#16/#17 (nombre completo en 3 por fila; el ❤️ no tapa la categoría). FALLA con el código viejo.
// Uso: ANCHO=384 node g165.js
const fs = require('fs');
const { abrir } = require('./h'); const { APPS, entrar, execSync } = require('./apps6');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const comoDe = (su) => async (email, expr, args) => (await su("select " + expr + " as r from (select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = $1), true)) x", [email].concat(args || [])))[0].r;
(async () => {
  // ---------- Núcleo (código): un solo botón de fábrica, con el ícono ↺ ----------
  const ay = fs.readFileSync('/home/user/SaaS/nucleo/ayuda.js', 'utf8');
  ok(!/data-pf-colnormal/.test(ay), 'núcleo: sin el botón repetido "Volver a los colores normales" (pegado a las tarjetas)');
  ok(/data-pe-fab>↺ Volver todo a lo de fábrica/.test(ay), 'núcleo: queda uno solo, ↺ Volver todo a lo de fábrica');
  for (const r of ['Aplicaciones/shared', 'Barberia/shared', 'Emprendedor/js', 'Taller/shared', 'Estacionamiento/js', 'SaaS/shared'])
    ok(fs.readFileSync('/home/user/' + r + '/ayuda.js', 'utf8') === ay, 'núcleo sincronizado en ' + r.split('/')[0]);
  // ---------- BiciTaller (código + pantalla) ----------
  const tj = fs.readFileSync('/home/user/Taller/taller/taller.js', 'utf8');
  ok(/data-cerrar data-sin-atras aria-label="Cerrar"[^>]*>✕<\/button><h2>' \+ \(id \? '🏷️ '/.test(tj), 'BiciTaller #9: la hoja de bici usada tiene ✕ arriba');
  ok(/<div class="btns"><button class="ghost" type="button" data-cerrar data-sin-atras>Cancelar<\/button>' \+ \(id && P\.dueno/.test(tj), 'BiciTaller #9: y Cancelar abajo');
  {
    const [repo, db, prep] = APPS.bicitaller;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db);
    try {
      const [url, email, sel, tab] = await prep(t); const p = t.page;
      await entrar(p, t.base, url, email, 'clave123', sel, tab); await t.sinModales(p);
      await p.goto(t.base + '/taller/'); await p.waitForTimeout(3000); await t.sinModales(p);
      ok(await p.evaluate(() => !!document.querySelector('[data-v="mas"]') && !document.querySelector('[data-v="mas"] .badge')), 'BiciTaller #10: Más/Ajustes sin globito rojo');
      ok(await p.evaluate(() => !!document.querySelector('[data-m="chat"] .chat-num')), 'BiciTaller #10: el contador sigue en 💬 Mensajes');
    } catch (e) { ok(false, 'BiciTaller: ' + e.message); } finally { await t.cerrar(); }
  }
  // ---------- Billetera: el color elegido manda también sobre --brand ----------
  {
    const [repo, db, prep] = APPS.billetera;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db);
    try {
      const [url, email, sel, tab] = await prep(t); const p = t.page;
      await entrar(p, t.base, url, email, 'clave123', sel, tab); await t.sinModales(p);
      await p.evaluate(() => localStorage.setItem('cfx-brand', '#059669'));  // lo que dejó guardado carga.js la primera vez (verde)
      await p.goto(t.base + '/app/#mas'); await p.reload(); await p.waitForTimeout(3000); await t.sinModales(p);
      const c = await p.evaluate(() => { window.LC.aplicarColor('#d97706'); const s = getComputedStyle(document.documentElement); return { b: s.getPropertyValue('--brand').trim(), m: s.getPropertyValue('--marca').trim() }; });
      ok(c.b === '#d97706' && c.m === '#d97706', 'Billetera #4/#11: Ámbar queda en --brand y --marca (' + c.b + ' / ' + c.m + ')');
      await p.waitForTimeout(300);
      ok(await p.evaluate(() => localStorage.getItem('cfx-brand')) === '#d97706', 'Billetera #4/#11: al recargar parte con Ámbar (cfx-brand)');
    } catch (e) { ok(false, 'Billetera: ' + e.message); } finally { await t.cerrar(); }
  }
  // ---------- Despega: tarjetas de la tienda ----------
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g165', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g165'); const su = t.sim.su, como = comoDe(su);
  try {
    const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Pepe','client',$1)", [u.id]);
    await t.sim.crearUsuario('cli@x.cl', 'clave123');
    await su("update public.profiles set terms_at = now(), tour_visto = true").catch(() => su('update public.profiles set terms_at = now()'));
    await su("update public.profiles set slug = 'ana', telefono = '56912345678' where id = $1", [u.id]);
    await como('tienda@x.cl', 'public.catalog_upsert($2, $3, $4, null, $5)', ['a1', 'Automatización y chatbot de WhatsApp', 160000, 'Aplicaciones y Software']);
    await como('tienda@x.cl', 'public.catalog_upsert($2, $3, $4, null, $5)', ['a2', 'Capacitación en redes sociales para emprendedores', 60000, 'Aplicaciones y Software']);
    const q = t.page;
    await entrar(q, t.base, '/', 'cli@x.cl', 'clave123'); await t.sinModales(q);
    await q.goto(t.base + '/apps/catalogo/?v=productos'); await q.waitForTimeout(3500); await t.sinModales(q);
    await q.evaluate(() => { const b = document.querySelector('[data-v="3"]'); if (b) b.click(); }); await q.waitForTimeout(400);
    const v3 = await q.evaluate(() => [...document.querySelectorAll('#grid .item > b')].map((b) => ({ clamp: getComputedStyle(b).webkitLineClamp, cabe: b.scrollHeight <= b.clientHeight + 1 })));
    ok(v3.length === 2 && v3.every((x) => (x.clamp === 'none' || !x.clamp) && x.cabe), 'Despega #16: en 3 por fila el nombre se ve completo (' + JSON.stringify(v3) + ')');
    await t.foto('g165-v3', q);
    await q.evaluate(() => { const b = document.querySelector('[data-v="2"]'); if (b) b.click(); }); await q.waitForTimeout(400);
    const cruza = await q.evaluate(() => [...document.querySelectorAll('#grid .item')].map((it) => {
      const h = it.querySelector('.fav'), c = it.querySelector('.cat'); if (!h || !c) return null;
      const a = h.getBoundingClientRect(), r = document.createRange(); r.selectNodeContents(c);
      return [...r.getClientRects()].some((x) => x.right > a.left + 1 && x.left < a.right && x.bottom > a.top && x.top < a.bottom);
    }));
    ok(cruza.length === 2 && cruza.every((x) => x === false), 'Despega #8/#17: en 2 por fila el ❤️ no tapa la categoría (' + JSON.stringify(cruza) + ')');
    await t.foto('g165-v2', q);
  } catch (e) { ok(false, 'Despega: ' + e.message); } finally { await t.cerrar(); }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ G165 OK'); process.exit(f ? 1 : 0);
})();
