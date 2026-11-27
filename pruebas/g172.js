// G172 · 🎨 Colores del perfil: la barra del celular (hora/batería = meta theme-color) toma el color REAL de arriba de la pantalla
//   (cabecera o fondo; ±12 por el desenfoque de la cabecera) en las 6 apps, claro y oscuro, con y sin colores propios → sin franjas de otro color. FALLA con lo viejo
//   (quedaba fijo el color de cada app: #2563eb, #059669, #b07d2b, #16a34a, #0a0e17).
// Uso: ANCHO=384 node g172.js
const fs = require('fs');
const { abrir } = require('./h'); const { APPS, entrar, execSync } = require('./apps6');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const dist = (a, b) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); return Math.max(...[16, 8, 0].map((s) => Math.abs(((x >> s) & 255) - ((y >> s) & 255)))); };
(async () => {
  const ay = fs.readFileSync('/home/user/SaaS/nucleo/ayuda.js', 'utf8');
  ok(/function pintarBarraCel\(\)/.test(ay), 'núcleo: pintarBarraCel existe');
  for (const r of ['Aplicaciones/shared', 'Barberia/shared', 'Emprendedor/js', 'Taller/shared', 'Estacionamiento/js', 'SaaS/shared'])
    ok(fs.readFileSync('/home/user/' + r + '/ayuda.js', 'utf8') === ay, 'núcleo sincronizado en ' + r.split('/')[0]);
  ok(!/m\.content = p\.tema === 'claro'/.test(fs.readFileSync('/home/user/SaaS/app/estilo.js', 'utf8')), 'CM: estilo.js ya no fija la barra del celular');
  for (const [k, [repo, db, prep]] of Object.entries(APPS)) {
    execSync(__dirname + '/base.sh ' + repo + ' ' + db + '_g172', { stdio: 'ignore' });
    const t = await abrir(repo, db + '_g172');
    try {
      const [url, email, sel, tab] = await prep(t); const p = t.page;
      await p.setViewportSize({ width: 384, height: 800 });
      await entrar(p, t.base, url, email, 'clave123', sel, tab); await t.sinModales(p);
      for (const [cols, modo] of [[{}, 'light'], [{}, 'dark'], [{ fondo: '#4c1d95' }, 'light'], [{ fondo: '#7c2d12', tarjeta: '#fde68a' }, 'dark']]) {
        await p.evaluate(([cols, modo]) => {
          let id = 'yo'; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^sb-.*-auth-token$/.test(k)) { const u = (JSON.parse(localStorage.getItem(k)) || {}).user; if (u && u.id) id = u.id; } }
          for (const m of ['claro', 'oscuro']) localStorage.setItem('cfx-col:' + location.pathname.replace(/index\.html$/, '') + ':' + id + ':' + m, JSON.stringify(cols));
        }, [cols, modo]);
        await p.reload(); await p.waitForTimeout(2500); await t.sinModales(p);
        await p.evaluate((modo) => { document.querySelectorAll('.cfx-tour').forEach((e) => e.remove()); document.documentElement.dataset.theme = modo; scrollTo(0, 0); }, modo);
        await p.waitForTimeout(400);
        const meta = await p.evaluate(() => (document.querySelector('meta[name="theme-color"]') || {}).content || '');
        await p.screenshot({ path: '/tmp/g172.png', clip: { x: 2, y: 2, width: 1, height: 1 } });
        const top = execSync("python3 -c \"from PIL import Image; print('#%02x%02x%02x' % Image.open('/tmp/g172.png').convert('RGB').getpixel((0,0)))\"").toString().trim();
        ok(/^#[0-9a-f]{6}$/.test(meta) && dist(meta, top) <= 12, k + ' ' + modo + ' ' + JSON.stringify(cols) + ': barra del celular ' + meta + ' = arriba ' + top);
      }
    } catch (e) { ok(false, k + ': ' + e.message); } finally { await t.cerrar(); }
  }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ todo bien'); process.exit(f ? 1 : 0);
})();
