// G173 · ➕ En computador (≥ 900 px) el + del menú lateral (Premium, botón .nuevo) mostraba un CUADRADO dorado dentro del círculo:
//   la regla de premium.js "nav.cfx-barra .nuevo span:first-child" ganaba al reseteo de escritorio. FALLA con lo viejo (fondo del ícono = degradado).
const fs = require('fs');
const { abrir } = require('./h'); const { APPS, entrar, execSync } = require('./apps6');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
(async () => {
  const pr = fs.readFileSync('/home/user/SaaS/nucleo/premium.js', 'utf8');
  for (const r of ['Aplicaciones/shared', 'Barberia/shared', 'Emprendedor/js', 'Taller/shared', 'Estacionamiento/js', 'SaaS/shared'])
    ok(fs.readFileSync('/home/user/' + r + '/premium.js', 'utf8') === pr, 'núcleo sincronizado en ' + r.split('/')[0]);
  const [repo, , prep] = APPS.cm; execSync(__dirname + '/base.sh ' + repo + ' p_g173', { stdio: 'ignore' });
  const t = await abrir(repo, 'p_g173');
  try {
    const [url, email, sel, tab] = await prep(t); const p = t.page;
    for (const [w, escritorio] of [[1280, true], [384, false]]) {
      await p.setViewportSize({ width: w, height: 800 });
      if (escritorio) await entrar(p, t.base, url, email, 'clave123', sel, tab); await p.reload(); await p.waitForTimeout(2500); await t.sinModales(p);
      const r = await p.evaluate(() => { const b = document.querySelector('nav.cfx-barra>.cfx-mas'); if (!b) return null; const i = b.firstElementChild;
        return { prem: document.documentElement.classList.contains('cfx-premium'), boton: getComputedStyle(b).backgroundImage, ico: getComputedStyle(i).backgroundImage }; });
      ok(r && r.prem, w + ' px: hay + en el menú y la cuenta es Premium');
      if (escritorio) ok(r && /gradient/.test(r.boton) && r.ico === 'none', '1280 px: círculo dorado SIN cuadrado adentro (' + (r && r.ico.slice(0, 30)) + ')');
      else ok(r && /gradient/.test(r.ico), '384 px: el + del celular sigue dorado');
    }
  } catch (e) { ok(false, e.message); } finally { await t.cerrar(); }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ todo bien'); process.exit(f ? 1 : 0);
})();
