// G169 · 🐞 Túnel: CM #3 (Mensajes: Conversaciones arriba, 🐞 Fallas debajo) · Barbería #7 (el selector de hora parte en el horario
//   del barbero y marca las horas abiertas, núcleo ui.js data-desde/data-hasta; fuera de horario se puede elegir igual) ·
//   Despega #10 (cliente: «Caja» en la barra en lugar de Contactos; Contactos en Cuenta → Tu tienda). FALLA con el código viejo.
// Uso: ANCHO=384 node g169.js
const fs = require('fs');
const { abrir } = require('./h'); const { APPS, entrar, execSync } = require('./apps6');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const lee = (r) => fs.readFileSync('/home/user/' + r, 'utf8');
const ANCHO = +process.env.ANCHO || 384;
(async () => {
  for (const [r, d] of [['Aplicaciones', 'shared'], ['Barberia', 'shared'], ['Emprendedor', 'js'], ['Taller', 'shared'], ['Estacionamiento', 'js'], ['SaaS', 'shared']]) {
    ok(lee(r + '/' + d + '/ui.js') === lee('SaaS/nucleo/ui.js'), 'núcleo ui.js sincronizado en ' + r);
  }
  // ---------- CM #3 ----------
  { const s = lee('SaaS/admin/mensajes.js'); const a = s.indexOf('💬 Conversaciones'), b = s.indexOf('🐞 Fallas reportadas</h3>');
    ok(a > 0 && b > a, 'CM #3: en Mensajes las Conversaciones van arriba y las 🐞 Fallas reportadas debajo'); }
  // ---------- Despega #10 ----------
  { const s = lee('Aplicaciones/shared/cuenta.js'), i = lee('Aplicaciones/index.html');
    const cli = (s.match(/a\.role === 'client'\s*\n?\s*\? \[([\s\S]*?)\]\]/) || [])[1] || '';
    ok(/\['caja', 'caja', 'Caja', 'apps\/caja\/'\]/.test(cli) && !/contactos/.test(cli), 'Despega #10: la barra del cliente trae «Caja» y no Contactos');
    ok(/orden: \['pedidos', 'chat', '\+', 'caja', 'cuenta'\]/.test(s), 'Despega #10: la Caja va al lado del + (barra común)');
    ok(/cliente && \{ k: 'contactosCli'[^\n]*apps\/contactos\//.test(i), 'Despega #10: Contactos sigue en Cuenta → Tu tienda (nada se pierde)'); }
  // ---------- Barbería #7 (pantalla) ----------
  {
    const [repo, db, prep] = APPS.barberia;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db); const p = t.page;
    try {
      const [url, email] = await prep(t);
      await p.setViewportSize({ width: ANCHO, height: 794 }); await p.emulateMedia({ colorScheme: 'dark' });
      await entrar(p, t.base, url, email, 'clave123'); await p.goto(t.base + '/equipo/#agenda'); await p.waitForTimeout(3000); await t.sinModales(p);
      const hor = (await t.sim.su('select horario from public.barberias limit 1').catch(() => [{}]))[0] || {};
      const dia = await p.evaluate((h) => { const H = h.horario || []; for (let k = 0; k < 7; k++) { const d = new Date(Date.now() + k * 864e5); const w = (d.getDay() + 6) % 7; if (H[w] && H[w].e !== 'x' && H[w].i) return [d.toISOString().slice(0, 10), H[w].i, H[w].f]; } return null; }, hor);
      ok(!!dia, 'Barbería #7: hay un día abierto para probar (' + JSON.stringify(dia) + ')');
      await p.evaluate(() => { const z = document.querySelector('.tl .fuera.toca'); z.scrollIntoView(); const r = z.getBoundingClientRect(); z.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + 5, clientY: r.top + 5 })); });
      await p.waitForTimeout(1200);
      await p.evaluate((d) => { const f = document.querySelector('.sheet input[data-f]'); f.value = d[0]; f.dispatchEvent(new Event('change', { bubbles: true })); document.querySelector('.sheet input[data-h]').value = ''; }, dia);
      await p.fill('[data-buscar]', 'Pepe');
      await p.evaluate(() => document.querySelector('.sheet [data-ok]').click()); await p.waitForTimeout(900);
      const r = await p.evaluate(() => { const g = document.querySelector('dialog.cfx-el[open]'); if (!g) return null; const ab = [...g.querySelectorAll('.cfx-el-hr .abre')].map((b) => +b.dataset.h);
        const pr = g.querySelector('.cfx-el-hr .abre'), cx = (pr && pr.closest('.cfx-el-lista')) || g; const a = pr ? pr.getBoundingClientRect() : null, c = cx.getBoundingClientRect();
        return { ab, visible: !!a && a.top >= c.top - 1 && a.bottom <= c.bottom + 1, cero: !g.querySelector('[data-h="0"]').disabled, sub: g.querySelector('.cfx-el-sub').textContent }; });
      const h0 = dia ? +dia[1].slice(0, 2) : -1;
      ok(r && r.ab.length > 0 && r.ab[0] === h0, 'Barbería #7: el selector marca las horas abiertas desde la apertura (' + JSON.stringify(r) + ')');
      ok(r && r.visible, 'Barbería #7: el selector se abre mostrando la hora de apertura');
      ok(r && r.cero, 'Barbería #7: las horas fuera de horario (00) se pueden elegir igual');
      await p.screenshot({ path: __dirname + '/capturas/barberia_g169_hora.png' }).catch(() => {});
      ok(!t.errores.length, 'Barbería: sin errores de consola (' + t.errores.slice(0, 3).join(' · ') + ')');
    } catch (e) { ok(false, 'Barbería: ' + e.message); } finally { await t.cerrar(); }
  }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ todo ok'); process.exit(f ? 1 : 0);
})();
