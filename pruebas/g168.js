// G168 · 🐞 Túnel: Barbería #8 (perfil y deslizar siguen vivos) · #7 (el equipo agenda FUERA de horario: tocar el rayado, 00:00 vale, sin "Elige la hora") ·
//   #4 (Más agrupado sin "Tu trabajo" para el dueño + botón ⋯ "Más" igual en todas las apps, núcleo barra.js) · #3 (horario con el editor del núcleo, el de Despega) ·
//   Despega #10 (📌 accesos directos de la barra elegibles en Personalizar, núcleo barra.js/ayuda.js). FALLA con el código viejo.
// Uso: ANCHO=384 node g168.js
const fs = require('fs');
const { abrir } = require('./h'); const { APPS, entrar, execSync } = require('./apps6');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const lee = (r) => fs.readFileSync('/home/user/' + r, 'utf8');
const ANCHO = +process.env.ANCHO || 384;
const masIgual = (p) => p.evaluate(() => { const n = document.querySelector('nav.cfx-barra'); if (!n) return null;
  const v = [...n.children].filter((b) => /^(A|BUTTON)$/.test(b.tagName) && !b.classList.contains('cfx-oculto') && getComputedStyle(b).display !== 'none');
  const u = v[v.length - 1]; return u ? { puntos: u.querySelectorAll('svg circle').length, texto: u.textContent.trim() } : null; });
(async () => {
  // ---------- núcleo sincronizado ----------
  for (const [r, d] of [['Aplicaciones', 'shared'], ['Barberia', 'shared'], ['Emprendedor', 'js'], ['Taller', 'shared'], ['Estacionamiento', 'js'], ['SaaS', 'shared']]) {
    ok(lee(r + '/' + d + '/barra.js') === lee('SaaS/nucleo/barra.js') && lee(r + '/' + d + '/ayuda.js') === lee('SaaS/nucleo/ayuda.js'), 'núcleo barra.js/ayuda.js sincronizado en ' + r);
  }
  // ---------- Barbería (pantalla) ----------
  {
    const [repo, db, prep] = APPS.barberia;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db); const p = t.page;
    try {
      const [url, email] = await prep(t);
      await p.setViewportSize({ width: ANCHO, height: 794 }); await p.emulateMedia({ colorScheme: 'dark' });
      await entrar(p, t.base, url, email, 'clave123'); await p.goto(t.base + '/equipo/'); await p.waitForTimeout(3000); await t.sinModales(p);
      // #4: el último botón de la barra es ⋯ "Más"
      const m = await masIgual(p);
      ok(m && m.puntos === 3 && m.texto === 'Más', 'Barbería #4: el botón Más lleva los tres puntitos y la palabra «Más» (' + JSON.stringify(m) + ')');
      // #8: deslizar cambia de pestaña
      await p.evaluate(() => { const T = (x, y) => new Touch({ identifier: 1, target: document.body, clientX: x, clientY: y }); const el = document.elementFromPoint(300, 400);
        el.dispatchEvent(new TouchEvent('touchstart', { touches: [T(300, 400)], bubbles: true })); el.dispatchEvent(new TouchEvent('touchmove', { touches: [T(150, 405)], bubbles: true }));
        el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [T(60, 405)], touches: [], bubbles: true })); });
      await p.waitForTimeout(1200);
      ok(await p.evaluate(() => location.hash === '#agenda'), 'Barbería #8: deslizar a la izquierda pasa de Inicio a Agenda');
      // #7: en la agenda, el rayado (fuera de horario) se puede tocar y se agenda igual; sin hora se abre el selector (sin error)
      await t.sinModales(p);
      const zonas = await p.evaluate(() => document.querySelectorAll('.tl .fuera.toca').length);
      ok(zonas > 0, 'Barbería #7: el rayado fuera de horario se puede tocar (' + zonas + ')');
      if (zonas) {
        await p.evaluate(() => { const z = document.querySelector('.tl .fuera.toca'); z.scrollIntoView(); const r = z.getBoundingClientRect(); z.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + 5, clientY: r.top + 3 })); });
        await p.waitForTimeout(1200);
        ok(await p.evaluate(() => !!document.querySelector('.sheet input[data-h]') && /Fuera del horario: igual queda agendada/.test(document.querySelector('.sheet .panel').textContent)), 'Barbería #7: tocar el rayado abre «Agendar una hora» con el aviso de fuera de horario');
        await p.fill('[data-buscar]', 'Pepe');
        await p.evaluate(() => { document.querySelector('.sheet input[data-h]').value = ''; document.querySelector('.sheet [data-ok]').click(); }); await p.waitForTimeout(800);
        ok(await p.evaluate(() => !!document.querySelector('dialog.cfx-el[open]')), 'Barbería #7: sin hora se abre el selector de hora (no el error «Elige la hora»)');
        await p.click('dialog.cfx-el [data-h="0"]'); await p.click('dialog.cfx-el [data-m="0"]'); await p.waitForTimeout(300);
        await p.evaluate(() => document.querySelector('.sheet [data-ok]').click()); await p.waitForTimeout(2000);
        const rs = await t.sim.su("select to_char(inicio at time zone 'America/Santiago','HH24:MI') h from public.reservas");
        ok(rs.some((r) => r.h === '00:00'), 'Barbería #7: el dueño agenda a las 00:00 aunque esté cerrado (' + JSON.stringify(rs) + ')');
      }
      // #8: Mi perfil abre su editor
      await p.goto(t.base + '/equipo/#mas'); await p.waitForTimeout(2000); await t.sinModales(p);
      await p.evaluate(() => { const b = [...document.querySelectorAll('[data-k="perfil"]')].find((x) => x.offsetParent); if (b) b.click(); }); await p.waitForTimeout(1500);
      ok(await p.evaluate(() => /Foto y nombre/.test(document.body.textContent) && /Personalizar/.test(document.body.textContent)), 'Barbería #8: Mi perfil abre su edición (Foto y nombre · Personalizar)');
      await t.sinModales(p);
      // #4: grupos del Más (dueño): sin "Tu trabajo", con "Vender más", y en orden
      const tabs = await p.evaluate(() => [...document.querySelectorAll('.cfx-mm-tab')].map((b) => b.textContent.trim()));
      ok(!tabs.some((x) => /Tu trabajo/.test(x)) && tabs.some((x) => /Vender más/.test(x)) && tabs.findIndex((x) => /Tu barbería/.test(x)) < tabs.findIndex((x) => /Ventas y clientes/.test(x)),
        'Barbería #4: Más agrupado (Tu barbería → Ventas y clientes → Vender más…; nada en «Tu trabajo») · ' + tabs.join(' | '));
      // #3: horario con el editor del núcleo (⚡ Rápido / 📅 Día por día) y se guarda en el formato de Barbería
      const antes = (await t.sim.su('select horario from public.barberias limit 1'))[0].horario;
      await p.goto(t.base + '/equipo/#horario'); await p.waitForTimeout(2500); await t.sinModales(p);
      ok(await p.evaluate(() => !!document.querySelector('#edH .fo-hor [data-modo="rapido"]')), 'Barbería #3: el horario usa el editor del núcleo (el mismo de Despega)');
      await p.evaluate(() => document.getElementById('bGuardarH').click()); await p.waitForTimeout(1500);
      const igual = (await t.sim.su('select horario from public.barberias limit 1'))[0].horario;
      const norm = (h) => JSON.stringify((h || []).map((d) => (d.e === 'x' ? 'x' : [d.i, d.f, d.ci || '', d.cf || ''].join('/'))));
      ok(norm(igual) === norm(antes), 'Barbería #3: guardar sin cambios deja el mismo horario (' + norm(igual) + ')');
      await p.evaluate(() => { const c = document.querySelector('#edH [data-ab="6"]'); if (c) { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); } });
      await p.waitForTimeout(300);
      await p.evaluate(() => document.getElementById('bGuardarH').click()); await p.waitForTimeout(1500);
      const dom = (await t.sim.su('select horario from public.barberias limit 1'))[0].horario[6];
      ok(dom && dom.e === 'a' && dom.i && dom.f, 'Barbería #3: abrir el domingo se guarda en la barbería (' + JSON.stringify(dom) + ')');
      // Despega #10 (núcleo): 📌 accesos directos elegidos en Personalizar
      await p.goto(t.base + '/equipo/'); await p.waitForTimeout(2500); await t.sinModales(p);
      const cand = await p.evaluate(() => (window.CodeFixBarra.personal.candidatos ? window.CodeFixBarra.personal.candidatos() : []).map((x) => x.k));
      ok(cand.length >= 4, 'Despega #10: hay de dónde elegir accesos (' + cand.join(',') + ')');
      if (cand.length >= 4) {
        const quiero = [cand[3], cand[0], cand[1]];
        await p.evaluate((q) => window.CFX_PERSONAL.barra.guardar(Object.assign(window.CFX_PERSONAL.barra.leer(), { accesos: q })), quiero); await p.waitForTimeout(500);
        const fila = await p.evaluate(() => [...document.querySelector('nav.cfx-barra').children].filter((b) => /^(A|BUTTON)$/.test(b.tagName) && !b.classList.contains('cfx-oculto')).map((b) => b.classList.contains('cfx-mas') ? '+' : (b.dataset.v || b.dataset.k || '')));
        ok(fila[0] === quiero[0] && fila[1] === quiero[1] && fila[2] === '+' && fila[3] === quiero[2] && fila.length === 5, 'Despega #10: la barra queda con los accesos elegidos y el + y Más fijos (' + fila.join(' ') + ')');
        const m2 = await masIgual(p);
        ok(m2 && m2.puntos === 3 && m2.texto === 'Más', 'Despega #10: el Más sigue al final (' + JSON.stringify(m2) + ')');
        await p.reload(); await p.waitForTimeout(3000);
        const fila2 = await p.evaluate(() => [...document.querySelector('nav.cfx-barra').children].filter((b) => /^(A|BUTTON)$/.test(b.tagName) && !b.classList.contains('cfx-oculto')).map((b) => b.dataset.v || ''));
        ok(fila2[0] === quiero[0] && fila2[1] === quiero[1], 'Despega #10: al volver a abrir siguen los accesos elegidos (' + fila2.join(' ') + ')');
        await p.evaluate(() => window.CFX_PERFIL && window.CFX_PERFIL.abrir()); await p.waitForTimeout(1200);
        await p.evaluate(() => { const b = [...document.querySelectorAll('button, [role=button]')].find((x) => /^\s*Personalizar/.test(x.textContent) && x.offsetParent); if (b) b.click(); }); await p.waitForTimeout(1200);
        ok(await p.evaluate(() => document.querySelectorAll('[data-pe-acc]').length === 3), 'Despega #10: Personalizar → Barra de abajo trae los 3 «Accesos directos»');
        await p.screenshot({ path: __dirname + '/capturas/barberia_g168_accesos.png' }).catch(() => {});
      }
      ok(!t.errores.length, 'Barbería: sin errores de consola (' + t.errores.slice(0, 3).join(' · ') + ')');
    } catch (e) { ok(false, 'Barbería: ' + e.message); } finally { await t.cerrar(); }
  }
  // ---------- BiciTaller: el mismo ⋯ «Más» (antes ⚙️) ----------
  {
    const [repo, db, prep] = APPS.bicitaller;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db);
    try {
      const [url, email, sel, tab] = await prep(t); const p = t.page;
      await p.setViewportSize({ width: ANCHO, height: 740 });
      await entrar(p, t.base, url, email, 'clave123', sel, tab); await p.goto(t.base + '/taller/'); await p.waitForTimeout(3000);
      const m = await masIgual(p);
      ok(m && m.puntos === 3 && m.texto === 'Más', 'BiciTaller #4: el botón Más igual que en Barbería (' + JSON.stringify(m) + ')');
    } catch (e) { ok(false, 'BiciTaller: ' + e.message); } finally { await t.cerrar(); }
  }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ todo ok'); process.exit(f ? 1 : 0);
})();
