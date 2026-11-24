// G154 · 🔔 Tocar un aviso de la campana lleva a SU lugar: 🔄 versión → ventana con la versión (no recarga el inicio) · 💬 soporte → chat de soporte.
//        ✓ Despega: la tienda verificada (CM → Control → 🪪 aprobada) muestra el check a sus clientes (tienda pública y catálogo).
// Uso: ANCHO=320 node g154.js [cm despega barberia billetera bicitaller estaciona]
const { abrir } = require('./h'); const { APPS, entrar, execSync } = require('./apps6');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
// Despega: el aviso queda "por enviar" hasta que la función de push lo manda (aquí no hay push): se marca enviado.
const enviado = (t, n) => n === 'despega' ? t.sim.su("update public.notifications set status = 'sent', sent_at = now() where status <> 'sent'").catch(() => {}) : null;
const CAMPANA = '[data-cfx-campana]:visible, header [aria-label="Avisos"]:visible, header [aria-label^="Avisos"]:visible';
async function tocar(t, p, titulo) {
  await p.evaluate(() => { window.__g154 = 1; document.querySelectorAll('.cfx-emerg, .cfx-tour').forEach((x) => x.remove()); });
  const antes = p.url();
  await p.locator(CAMPANA).first().click(); await p.waitForTimeout(1500);
  const it = p.locator('.cfx-av-f, .notif, a.item, .item').filter({ hasText: titulo }).filter({ visible: true }).first();
  await it.click(); await p.waitForTimeout(1500);
  return p.evaluate((antes) => ({ igual: window.__g154 === 1, url: location.href, antes,
    hoja: [...document.querySelectorAll('.cfx-hoja-m, dialog[open], .ca-caja, [role=dialog]')].filter((x) => x.getClientRects().length).map((x) => x.textContent.replace(/\s+/g, ' ')).join(' | ').slice(0, 400) }), antes);
}
(async () => {
  const pedidas = process.argv.slice(2);
  for (const [n, [repo, db, prep]] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(n)) continue;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db);
    try {
      const [url, email, sel, tab] = await prep(t); const p = t.page;
      await entrar(p, t.base, url, email, 'clave123', sel, tab); await t.sinModales(p);
      ok(await p.evaluate(() => !!(window.CFX_AYUDA && window.CFX_AYUDA.tocarAviso)), n + ': núcleo trae CFX_AYUDA.tocarAviso');
      await t.sim.su("select public.cfx_avisar((select id from auth.users where email = $1), '🔄 Nueva versión', 'App v9.9: ⚙️ Funcionamiento. Se actualiza sola al abrirla.')", [email]); await enviado(t, n);
      await p.reload(); await p.waitForTimeout(3000); await t.sinModales(p);
      let r = await tocar(t, p, 'Nueva versión');
      ok(r.igual, n + ': 🔄 versión → no recarga ni cambia de pantalla (' + r.url.replace(t.base, '') + ')');
      ok(/v9\.9/.test(r.hoja) && /Tu versión ahora: v\d/.test(r.hoja), n + ': 🔄 versión → ventana con la versión nueva y la tuya → ' + r.hoja.slice(0, 120));
      ok(!(await p.evaluate(() => [...document.querySelectorAll('.cfx-av-ir')].some((x) => x.getClientRects().length))), n + ': 🔄 versión → sin botón "Abrir" que recargue el inicio');
      if (n === 'despega' || n === 'cm') await t.foto('g154-version-' + n);
      await p.reload(); await p.waitForTimeout(2500); await t.sinModales(p);
      await t.sim.su("select public.cfx_avisar((select id from auth.users where email = $1), '💬 Soporte te respondió', 'Hola, ya quedó listo.')", [email]); await enviado(t, n);
      await p.reload(); await p.waitForTimeout(3000); await t.sinModales(p);
      r = await tocar(t, p, 'Soporte te respondió');
      ok(r.igual && /Escríbenos lo que necesites/.test(r.hoja), n + ': 💬 soporte → abre el chat de soporte → ' + r.hoja.slice(0, 80));
      if (n === 'despega') {
        // ✓ Tienda verificada: sin aprobar no sale; aprobada sale el check en la tienda pública (lo que ve el cliente).
        await t.sim.su("update public.profiles set slug = coalesce(slug, 'tienda-ana') where email = 'tienda@x.cl'");
        const slug = (await t.sim.su("select slug from public.profiles where email = 'tienda@x.cl'"))[0].slug;
        const ver = async () => { await p.goto(t.base + '/t/?s=' + slug); await p.waitForTimeout(3000); return p.evaluate(() => ({ check: !!document.querySelector('.pf-nom .pf-verif'), pill: /Identidad verificada/.test(document.body.innerText) })); };
        let v = await ver(); ok(!v.check && !v.pill, 'despega: tienda sin verificar → sin check');
        await t.sim.su("insert into public.cfx_verificaciones (cuenta, email, nombre, rut, documento, frente, reverso, selfie, estado, motivo, creado, resuelto) select id, email, 'Ana', '11.111.111-1', '', '', '', '', 'aprobada', '', now(), now() from public.profiles where email = 'tienda@x.cl'");
        v = await ver(); ok(v.check && v.pill, 'despega: tienda verificada → ✓ junto al nombre + "Identidad verificada" en la tienda pública');
        await t.foto('g154-verificada');
        const c = await t.sim.pool.connect(); let info;
        try { const id = (await c.query("select id from public.profiles where email = 'tienda@x.cl'")).rows[0].id; await c.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
          info = (await c.query("select public.tienda_info($1) ->> 'verificado' v", [id])).rows[0].v; } catch (e) { info = e.message; } finally { c.release(); }
        ok(info === 'true', 'despega: tienda_info (catálogo del cliente con cuenta) trae verificado → ' + info);
      }
    } catch (e) { ok(false, n + ': ' + e.message.split('\n')[0]); }
    await t.cerrar();
  }
  console.log(f ? 'FALLAS: ' + f : 'TODO OK'); process.exit(f ? 1 : 0);
})();
