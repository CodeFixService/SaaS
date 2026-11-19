// Sonda G116: barra de abajo, Más, pie y espacio al final (Despega negocio, 360 táctil).
const { abrir } = require('./h'); const { execSync } = require('child_process');
(async () => {
  execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g116_apl', { stdio: 'ignore' });
  const t = await abrir('/home/user/Aplicaciones', 'p_g116_apl', { tactil: true });
  await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' }); await t.sim.su('update public.profiles set terms_at = now()');
  const p = t.page; await p.goto(t.base + '/'); await p.waitForTimeout(1500);
  await p.fill('input[type=email]:visible', 'tienda@x.cl'); await p.fill('input[type=password]:visible', 'clave123'); await p.press('input[type=password]:visible', 'Enter'); await p.waitForTimeout(4000); await t.sinModales(p);
  const barra = () => p.evaluate(() => [...document.querySelectorAll('nav.cfx-barra > *')].filter((b) => b.offsetParent).map((b) => (b.textContent || '').trim() + (b.classList.contains('on') || b.classList.contains('activo') ? '*' : '')));
  console.log('barra', await barra(), p.url());
  await t.foto('g116-inicio', p);
  await p.evaluate(() => { const L = [...document.querySelectorAll('nav.cfx-barra > *')].filter((b) => b.offsetParent); L[L.length - 1].click(); });
  await p.waitForTimeout(700);
  console.log('hoja', await p.evaluate(() => { const h = document.querySelector('.cfx-hoja-m'); return h ? [...h.querySelectorAll('button,a')].map((b) => b.textContent.trim()).join(' | ') : 'NO'; }), p.url());
  await p.click('text=Saltar').catch(() => {}); await p.waitForTimeout(400);
  await t.foto('g116-mas', p);
  const medir = () => p.evaluate(async () => {
    const se = document.scrollingElement; se.scrollTop = se.scrollHeight; await new Promise((r) => setTimeout(r, 400));
    const f = document.querySelector('footer.marca'); const vis = [...document.querySelectorAll('section.view, .view')].filter((v) => v.offsetParent).map((v) => v.id);
    const r = f && f.getBoundingClientRect(); const bar = document.querySelector('nav.cfx-barra').getBoundingClientRect();
    return { vistas: vis, alto: se.scrollHeight, ventana: innerHeight, pieTop: r && Math.round(r.top), pieBottom: r && Math.round(r.bottom), pieVisible: !!(f && f.offsetParent), barraTop: Math.round(bar.top),
      padBody: getComputedStyle(document.body).paddingBottom, padMain: getComputedStyle(document.querySelector('main') || document.body).paddingBottom };
  });
  console.log('ajustes', JSON.stringify(await medir()));
  console.log('pags', JSON.stringify(await p.evaluate(() => { const P = document.querySelector('.cfx-mm-pags'); return P && { h: P.style.height, oh: P.offsetHeight, hijos: [...P.children].map((c) => c.offsetHeight), sl: P.scrollLeft, cw: P.clientWidth }; })));
  await t.foto('g116-ajustes-fin', p);
  await p.evaluate(() => { location.hash = ''; }); await p.waitForTimeout(800);
  console.log('hoy', JSON.stringify(await medir()));
  await t.foto('g116-hoy-fin', p);
  console.log('errores', t.errores.slice(0, 5));
  await t.cerrar();
})();
