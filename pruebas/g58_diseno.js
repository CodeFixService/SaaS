// G58 · ✨ CM moderno (sin fondo de espacio ni nada girando, tarjetas y barra que sobresalen) + 🎨 íconos parejos
//       + 🔔 aviso moderno del núcleo (barrita de carga, ✕ bloqueada al aparecer, deslizar para borrar, se difumina). FALLA con el código viejo.
// Uso: ./base.sh /home/user/saas g58_cm && ANCHO=320 node g58_diseno.js
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const ADM = 'juanjosuecastilloloyola@gmail.com';
(async () => {
  const t = await abrir('/home/user/saas', 'g58_cm'); const p = t.page;
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    await p.goto(t.base + '/'); await p.waitForTimeout(800);
    const e = await p.evaluate(() => ({ orb: getComputedStyle(document.querySelector('.marca .logo'), '::before').content, gira: document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations === Infinity && !/cfxC/.test(a.animationName)).map((a) => a.animationName + ':' + (a.effect.target && a.effect.target.className)) }));
    assert(e.orb === 'none' && !e.gira.length, 'Entrada: logo limpio, nada gira ' + JSON.stringify(e));
    await p.fill('input[type=email]', ADM); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(2500); await t.sinModales();
    const medir = () => p.evaluate(() => {
      const f = getComputedStyle(document.body, '::after'), b = document.querySelector('nav.cfx-barra'), c = document.querySelector('.view.on .card');
      return { capa: f.content, fondoImg: getComputedStyle(document.body).backgroundImage, tit: getComputedStyle(document.querySelector('.view.on .titulo-v h2') || document.body).backgroundClip,
        gira: document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations === Infinity && !/cfxC/.test(a.animationName)).map((a) => a.animationName),
        barraIzq: b ? getComputedStyle(b).left : '', barraRadio: b ? getComputedStyle(b).borderTopLeftRadius : '', sombra: c ? getComputedStyle(c).boxShadow : '', ancho: document.documentElement.scrollWidth <= innerWidth + 1 };
    });
    for (const osc of [0, 1]) {
      await p.emulateMedia({ colorScheme: osc ? 'dark' : 'light' }); await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(2500); await t.sinModales();
      const m = await medir(), modo = osc ? 'oscuro' : 'claro';
      assert(m.capa === 'none' && m.fondoImg === 'none' && !/text/.test(m.tit) && !m.gira.length, modo + ': fondo liso, título sin degradado, nada gira ' + JSON.stringify(m));
      assert(m.barraIzq === '10px' && m.barraRadio === '22px' && /,.*,/.test(m.sombra) && m.ancho, modo + ': barra flotante y tarjetas con sombra 3D');
      await p.screenshot({ path: 'capturas/saas/g58_apps_' + modo + '.png' });
    }
    // 🎨 Íconos a gusto → cambian también los de títulos/tarjetas (antes solo menús y barra)
    await p.evaluate(() => { window.CFX_COLORES.guardar('oscuro', { icono: '#ff7a00' }); window.CFX_COLORES.pintar(); });
    await p.waitForTimeout(300);
    const ic = await p.evaluate(() => { const h = document.createElement('h2'); h.innerHTML = '<span class="ic-e"><svg></svg></span>Hola'; document.querySelector('.view.on').prepend(h);
      const az = document.createElement('span'); az.className = 'ic-e azul'; h.append(az); const r = [getComputedStyle(h.firstChild).color, getComputedStyle(az).color, getComputedStyle(document.documentElement).getPropertyValue('--cfx-icono').trim()]; h.remove(); return r; });
    assert(ic[0] === ic[1] && /255, 1[0-9]{2}, 0|rgb\(2[0-9]{2}/.test(ic[0]), 'Íconos de títulos siguen el color elegido ' + JSON.stringify(ic));
    await p.evaluate(() => { window.CFX_COLORES.guardar('oscuro', {}); window.CFX_COLORES.pintar(); });
    // 🔔 Aviso: App.toast usa el del núcleo
    await p.evaluate(() => window.App.toast('✅ Guardado'));
    await p.waitForTimeout(80);
    let a = await p.evaluate(() => { const v = document.querySelector('.cfx-tsts .cfx-tst'); if (!v) return null; const x = v.querySelector('.cfx-tst-x');
      return { ok: v.classList.contains('ok'), entrando: v.classList.contains('entrando'), xBloq: getComputedStyle(x).pointerEvents, barra: !!v.querySelector('.cfx-tst-b i'), viejo: (document.getElementById('toast') || {}).className || '' }; });
    assert(a && a.ok && a.entrando && a.xBloq === 'none' && a.barra && !/show/.test(a.viejo), 'Aviso moderno: verde, con barrita y ✕ bloqueada mientras aparece ' + JSON.stringify(a));
    await p.screenshot({ path: 'capturas/saas/g58_aviso.png' });
    await p.waitForTimeout(500);
    assert(await p.evaluate(() => getComputedStyle(document.querySelector('.cfx-tst .cfx-tst-x')).pointerEvents) === 'auto', 'Ya apareció: la ✕ se puede tocar');
    await p.click('.cfx-tst .cfx-tst-x'); await p.waitForTimeout(400);
    assert(await p.evaluate(() => !document.querySelector('.cfx-tst') || [...document.querySelectorAll('.cfx-tst')].map((v) => v.textContent).join('|')) === true, '✕ lo borra (se difumina) ' + await p.evaluate(() => [...document.querySelectorAll('.cfx-tst')].map((v) => v.className + ':' + v.textContent).join('|')));
    await p.evaluate(() => window.App.toast('No se pudo guardar')); await p.waitForTimeout(500);
    assert(await p.evaluate(() => document.querySelector('.cfx-tst').classList.contains('error')), 'Texto de error → aviso rojo');
    const bx = await p.locator('.cfx-tst').boundingBox();
    await p.mouse.move(bx.x + 40, bx.y + bx.height / 2); await p.mouse.down(); await p.mouse.move(bx.x + 100, bx.y + bx.height / 2, { steps: 4 }); await p.mouse.move(bx.x + 220, bx.y + bx.height / 2, { steps: 4 }); await p.mouse.up();
    await p.waitForTimeout(400);
    assert(await p.evaluate(() => !document.querySelector('.cfx-tst')), 'Deslizar hacia el lado lo borra');
    await p.evaluate(() => window.App.toast('Hola', 0)); await p.waitForTimeout(3900);
    assert(await p.evaluate(() => !document.querySelector('.cfx-tst')), 'Solo se va al terminar la barrita');
    for (let i = 0; i < 5; i++) await p.evaluate((i) => window.CFX_AVISO('Aviso ' + i), i);
    assert(await p.evaluate(() => document.querySelectorAll('.cfx-tst:not(.sale)').length) === 3, 'Máximo 3 a la vez');
    const errs = t.errores.filter((x) => !/ERR_|status of 404/.test(x)); assert(!errs.length, 'CM sin errores ' + errs.slice(0, 3));
  } finally { await t.cerrar(); }
  console.log('G58 OK');
})().catch((e) => { console.error(e.message); process.exit(1); });
