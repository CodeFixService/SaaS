// G42e · 🌌 CM galáctico/orbital + Bootstrap 5.3 conectado a los colores CodeFix (CM y Despega). FALLA con el código viejo.
// Uso: ./base.sh /home/user/saas g42e_cm && ./base.sh /home/user/Aplicaciones g42e_apl && ANCHO=320 node g42e_galaxia.js
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const ADM = 'juanjosuecastilloloyola@gmail.com';
(async () => {
  const t = await abrir('/home/user/saas', 'g42e_cm'); const p = t.page;
  try {
    await t.sim.crearUsuario(ADM, 'admin123');
    // Entrada: logo con 2 órbitas que giran y botón Entrar con degradado
    await p.goto(t.base + '/'); await p.waitForTimeout(800);
    const e = await p.evaluate(() => { const l = getComputedStyle(document.querySelector('.marca .logo'), '::before'), l2 = getComputedStyle(document.querySelector('.marca .logo'), '::after');
      return { orb: l.animationName + '/' + l2.animationName, ent: getComputedStyle(document.querySelector('#bEntrar')).backgroundImage }; });
    assert(/gxGira\/gxGira/.test(e.orb) && /gradient/.test(e.ent), 'Entrada: logo con órbitas y Entrar con degradado ' + JSON.stringify(e));
    await p.screenshot({ path: 'capturas/saas/g42e_login.png' });
    await p.fill('input[type=email]', ADM); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(2500); await t.sinModales();
    const medir = () => p.evaluate(() => { const r = getComputedStyle(document.documentElement), f = getComputedStyle(document.body, '::after');
      const x = document.createElement('span'); x.className = 'text-body-secondary border rounded-3'; x.textContent = 'x'; document.body.append(x); const xs = getComputedStyle(x);
      const k = document.createElement('i'); k.style.color = 'var(--cfx-texto-2)'; k.style.borderColor = 'var(--cfx-borde)'; document.body.append(k); const ks = getComputedStyle(k);
      const out = { fondo: r.getPropertyValue('--cfx-fondo').trim(), bs: r.getPropertyValue('--bs-body-bg').trim(), capa: f.content, estrellas: (f.backgroundImage.match(/radial-gradient/g) || []).length,
        bsTxt: xs.color === ks.color, bsBorde: xs.borderTopColor === ks.borderTopColor, bsRadio: xs.borderTopLeftRadius,
        tit: getComputedStyle(document.querySelector('.view.on .titulo-v h2') || document.body).backgroundClip, mas: getComputedStyle(document.querySelector('nav.cfx-barra > .cfx-mas > span:first-child'), '::after').animationName,
        ancho: document.documentElement.scrollWidth <= innerWidth + 1 };
      x.remove(); k.remove(); return out; });
    for (const osc of [0, 1]) {
      await p.emulateMedia({ colorScheme: osc ? 'dark' : 'light' }); await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(2500); await t.sinModales();
      const m = await medir(), modo = osc ? 'oscuro' : 'claro';
      assert(m.capa !== 'none' && m.estrellas >= (osc ? 16 : 2), modo + ': fondo de espacio (' + m.estrellas + ' capas)');
      assert(m.bsTxt && m.bsBorde && m.bsRadio === '14px' && m.bs === m.fondo, modo + ': Bootstrap usa los colores CodeFix ' + JSON.stringify(m));
      assert(/text/.test(m.tit) && m.mas === 'gxGira' && m.ancho, modo + ': título con degradado, + con órbita y sin salirse del ancho');
      await p.screenshot({ path: 'capturas/saas/g42e_apps_' + modo + '.png' });
    }
    // 🎨 Colores a tu gusto (fondo propio) → se apaga el espacio y Bootstrap sigue al color elegido
    await p.evaluate(() => { window.CFX_COLORES.guardar('oscuro', { fondo: '#203040' }); window.CFX_COLORES.pintar(); });
    await p.waitForTimeout(300);
    let m = await medir();
    assert(m.capa === 'none' && m.fondo === '#203040' && m.bs === '#203040' && m.bsTxt, 'Con fondo propio: sin estrellas y Bootstrap con el fondo elegido ' + JSON.stringify(m));
    await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(2500);
    m = await medir(); assert(m.capa === 'none' && m.fondo === '#203040', 'Tras recargar sigue el fondo propio');
    await p.evaluate(() => { window.CFX_COLORES.guardar('oscuro', {}); window.CFX_COLORES.pintar(); }); await p.waitForTimeout(300);
    m = await medir(); assert(m.capa !== 'none' && m.estrellas >= 16, '↺ Volver a lo normal: vuelve el espacio');
    const errs = t.errores.filter((x) => !/ERR_|status of 404/.test(x)); assert(!errs.length, 'CM sin errores ' + errs.slice(0, 3));
  } finally { await t.cerrar(); }

  // Despega: Bootstrap con los colores de la tienda (claro y oscuro), sin el espacio del CM
  const d = await abrir('/home/user/Aplicaciones', 'g42e_apl'); const q = d.page;
  try {
    for (const osc of [0, 1]) {
      await q.emulateMedia({ colorScheme: osc ? 'dark' : 'light' }); await q.goto(d.base + '/'); await q.waitForTimeout(1500);
      const r = await q.evaluate(() => { const x = document.createElement('span'); x.className = 'text-body-secondary'; document.body.append(x); const k = document.createElement('i'); k.style.color = 'var(--cfx-texto-2)'; document.body.append(k);
        const o = { igual: getComputedStyle(x).color === getComputedStyle(k).color, bs: getComputedStyle(document.documentElement).getPropertyValue('--bs-body-bg').trim(), fondo: getComputedStyle(document.documentElement).getPropertyValue('--cfx-fondo').trim(), galaxia: !!document.querySelector('link[href*="galaxia"]') }; x.remove(); k.remove(); return o; });
      assert(r.igual && r.bs === r.fondo && !r.galaxia, 'Despega ' + (osc ? 'oscuro' : 'claro') + ': Bootstrap con sus colores ' + JSON.stringify(r));
    }
  } finally { await d.cerrar(); }
  console.log('G42e OK');
})().catch((e) => { console.error(e.message); process.exit(1); });
