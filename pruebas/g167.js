// G167 · 🐞 Túnel: Barbería #1/#2 (la foto se tragaba el "Hola": el </span> quedaba comentado · "+ Agendar una hora" dentro de la tarjeta de Hoy ·
//   anotar sin servicio avisa, sin "Falta el servicio") · BiciTaller #3/#13 (label.check en fila, no en grilla; "Cómo llega" a la izquierda) ·
//   Despega #6 (pedido y tienda: el tipo sin marcar sale de CFX_TIPO.de → 🛠️/🔑 sin Retiro/Despacho). FALLA con el código viejo.
// Uso: ANCHO=384 node g167.js
const fs = require('fs'), vm = require('vm');
const { abrir } = require('./h'); const { APPS, entrar, execSync } = require('./apps6');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const lee = (r) => fs.readFileSync('/home/user/' + r, 'utf8');
(async () => {
  // ---------- Barbería (código) ----------
  const bc = lee('Barberia/shared/core.js'), be = lee('Barberia/equipo/equipo.js');
  const av = bc.split('\n').find((l) => /return '<span class="av /.test(l)) || '';
  ok(/\+ '<\/span>';\s*$/.test(av) && !/\/\//.test(av), 'Barbería #1: avatar() cierra su </span> (el comentario ya no se lo come)');
  ok(/aspect-ratio: 1/.test(lee('Barberia/shared/core.css')), 'Barbería #1: la foto siempre cuadrada');
  ok(!/html \+= '<div class="btns"><button class="alt" id="bHoraHoy">/.test(be) && /'<\/ul>' \+ bHoy \+ '<\/div>'/.test(be) && /No hay horas para hoy\.' \+ bHoy/.test(be),
    'Barbería #2: "+ Agendar una hora" va dentro de la tarjeta de Hoy (no suelto entre la taza y el link)');
  ok(/if \(!sv\.value\.trim\(\)\) \{ C\.toast\([^)]*\); sv\.setAttribute\('aria-invalid', 'true'\); sv\.focus\(\); return; \}/.test(be), 'Barbería #1-#5: sin servicio no se llama a anotar_corte (sin "Falta el servicio")');
  // ---------- Despega (código + regla del núcleo) ----------
  const cat = lee('Aplicaciones/apps/catalogo/index.html'), tie = lee('Aplicaciones/t/index.html');
  ok(!/esServ/.test(cat) && /CFX_TIPO\.de\(Object\.assign\(\{\}, i, \{ tipo: v \? v\.tipo : '' \}\)\)/.test(cat), 'Despega #6: el pedido usa CFX_TIPO.de (sin regex propia)');
  ok(/CFX_TIPO\.de\(Object\.assign\(\{\}, i, \{ tipo: v \? v\.tipo : '' \}\)\)/.test(tie), 'Despega #6: la tienda /t/ también');
  {
    // Solo el bloque CFX_TIPO del núcleo (TIPOS, RX_DIG, RX_SRV, adivinar, de): la misma regla que usa la app.
    const pg = lee('SaaS/nucleo/pagos.js'), ini = pg.indexOf('  const TIPOS = {'), fin = pg.indexOf('  // entregas(tipos[])');
    const de = vm.runInNewContext(pg.slice(ini, fin).replace(/^\s*const PERIODOS.*$/m, '') + '; de');
    const vDe = (v, i) => (v && v.tipo !== 'producto' ? v.tipo : de(Object.assign({}, i, { tipo: v ? v.tipo : '' })));
    ok(vDe(undefined, { nombre: 'Diagnóstico', categoria: 'Taller' }) === 'servicio', 'Despega #6: 🛠️ Diagnóstico sin marcar → servicio (sin Retiro/Despacho)');
    ok(vDe(undefined, { nombre: 'Licencia Windows', categoria: '' }) === 'digital', 'Despega #6: 🔑 Licencia sin marcar → digital (pago en línea)');
    ok(vDe(undefined, { nombre: 'Polera', categoria: 'Ropa' }) === 'producto', 'Despega #6: 📦 lo físico sigue con Retiro/Despacho');
  }
  // ---------- BiciTaller (pantalla a 320 y 384, claro y oscuro) ----------
  ok(/\.cfxi-z button\{display:flex;align-items:center;justify-content:flex-start;/.test(lee('SaaS/nucleo/ingreso.js')), 'BiciTaller #3: "Cómo llega" a la izquierda (núcleo ingreso.js)');
  ok(lee('Taller/shared/ingreso.js') === lee('SaaS/nucleo/ingreso.js'), 'núcleo sincronizado en BiciTaller');
  {
    const [repo, db, prep] = APPS.bicitaller;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db);
    try {
      const [url, email, sel, tab] = await prep(t); const p = t.page;
      await entrar(p, t.base, url, email, 'clave123', sel, tab); await t.sinModales(p);
      for (const [w, esquema] of [[320, 'light'], [384, 'dark']]) {
        await p.setViewportSize({ width: w, height: 740 }); await p.emulateMedia({ colorScheme: esquema });
        await p.goto(t.base + '/taller/'); await p.waitForTimeout(3000); await t.sinModales(p);
        await p.evaluate(() => document.getElementById('agNueva').click()); await p.waitForTimeout(800);
        const m = await p.evaluate(() => { const l = document.querySelector('label.check'), i = l && l.querySelector('input'); if (!l) return null;
          const L = l.getBoundingClientRect(), I = i.getBoundingClientRect(), r = document.createRange(); r.selectNodeContents(l); r.setStartAfter(i); const T = r.getBoundingClientRect();
          return { disp: getComputedStyle(l).display, hueco: T.left - I.right, mismaFila: Math.abs((T.top + T.bottom) / 2 - (I.top + I.bottom) / 2) < 14 || T.top < I.bottom, ancho: document.documentElement.scrollWidth <= innerWidth + 1 }; });
        ok(m && m.disp === 'flex' && m.hueco < 20 && m.ancho, 'BiciTaller #13 (' + w + ' px, ' + esquema + '): la casilla queda pegada a su texto, sin grilla (' + JSON.stringify(m) + ')');
        if (w === 384) await p.screenshot({ path: __dirname + '/capturas/taller_g167_check.png' }).catch(() => {});
      }
    } catch (e) { ok(false, 'BiciTaller: ' + e.message); } finally { await t.cerrar(); }
  }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ todo ok'); process.exit(f ? 1 : 0);
})();
