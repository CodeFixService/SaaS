// G48 · Despega como Josué en el celular (táctil): ✋ mover una SECCIÓN completa tomándola del título (con el dedo que tiembla un poco)
// y 🎨 Colores a tu gusto (fondo, texto, íconos y el +), que siempre se leen, quedan al recargar y van por modo. FALLA con el código viejo.
// Uso: ./base.sh /home/user/Aplicaciones g48_apl && node g48_colores_orden.js   (OSCURO=1 opcional)
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const N = 'tienda@x.cl';
(async () => {
  const t = await abrir('/home/user/Aplicaciones', process.env.BD || 'g48_apl', { tactil: true }); const p = t.page;
  await t.ctx.addInitScript(() => { try { localStorage.setItem('cfx:tour:orbita-inicio', '1'); } catch (e) { /* */ } });
  const mas = async () => { await p.goto(t.base + '/'); await p.waitForTimeout(2200); await t.sinModales(); await p.locator('nav.cfx-barra > *', { hasText: 'Más' }).last().tap(); await p.waitForTimeout(1200); };
  const secs = () => p.evaluate(() => [...document.querySelectorAll('#v-ajustes .cfx-aj-sec')].filter((x) => x.getClientRects().length).map((x) => x.dataset.cfxOi));
  const cdp = await t.ctx.newCDPSession(p);
  const toque = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  try {
    await t.sim.crearUsuario(N, 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
    await t.sim.su('update public.profiles set terms_at = now()');
    await p.goto(t.base + '/'); await p.fill('input[type=email]', N); await p.fill('input[type=password]', 'clave123'); await p.press('input[type=password]', 'Enter');
    await p.waitForTimeout(3000); await t.sinModales(); await mas();
    // ✋ Sección "Cuenta y ayuda" completa: mantener presionado su TÍTULO (el dedo tiembla 3 px) y llevarla arriba de la anterior
    const s0 = await secs(), i = s0.indexOf('Cuenta y ayuda');
    assert(i > 0, 'Más con la sección Cuenta y ayuda ' + s0.join(' | '));
    const g = p.locator('#v-ajustes .cfx-aj-sec[data-cfx-oi="Cuenta y ayuda"] > .cfx-aj-g');
    assert(await p.evaluate(() => { const g = document.querySelector('#v-ajustes .cfx-aj-sec[data-cfx-oi="Cuenta y ayuda"] > .cfx-aj-g'); return getComputedStyle(g).userSelect === 'none' && getComputedStyle(g, '::after').content !== 'none'; }), 'El título no selecciona texto y muestra la marca para tomarlo');
    await g.scrollIntoViewIfNeeded(); const b = await g.boundingBox();
    const prev = await p.locator('#v-ajustes .cfx-aj-sec').nth(i - 1).boundingBox();
    const x = b.x + 30, y = b.y + b.height / 2;
    await toque('touchStart', x, y); await p.waitForTimeout(120); await toque('touchMove', x + 2, y + 3); await p.waitForTimeout(150); await toque('touchMove', x + 1, y + 1); await p.waitForTimeout(450);
    const yf = Math.max(prev.y + 4, 90);
    for (let k = 1; k <= 10; k++) { await toque('touchMove', x, y - (y - yf) * k / 10); await p.waitForTimeout(40); }
    await toque('touchEnd'); await p.waitForTimeout(500);
    const s1 = await secs();
    assert(s1.indexOf('Cuenta y ayuda') === i - 1, 'Sección completa movida hacia arriba: ' + s1.join(' | '));
    assert(!(await p.locator('.cfx-hoja-m').count()), 'Soltar no abre ninguna opción');
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300); await p.screenshot({ path: 'capturas/Aplicaciones/g48_orden.png' });
    await mas();
    assert((await secs()).indexOf('Cuenta y ayuda') === i - 1, 'Tras recargar sigue en su lugar');

    // 🎨 Colores a tu gusto: Más → Mi perfil → Color y modo
    const estilo = async () => { await mas(); await p.locator('#v-ajustes [data-k="perfil"]').first().tap(); await p.waitForTimeout(1000); await p.locator('.cfx-hoja-m [data-k="estilo"]').last().tap(); await p.waitForTimeout(1000); };
    await estilo();
    assert(await p.locator('.cfx-hoja-m [data-col]').count() === 3, 'Hay Fondo, Texto e Íconos y botón +');
    const poner = (k, v) => p.evaluate(([k, v]) => { const i = [...document.querySelectorAll('.cfx-hoja-m [data-col="' + k + '"]')].pop(); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, [k, v]);
    const medir = () => p.evaluate(() => {
      const r = document.documentElement, v = (n) => getComputedStyle(r).getPropertyValue(n).trim(), C = window.CFX_COLORES;
      const hx = (c) => { const m = c.match(/\d+/g).map(Number); return '#' + m.slice(0, 3).map((x) => x.toString(16).padStart(2, '0')).join(''); };
      const fila = document.querySelector('#v-ajustes .cfx-fila:not(.cfx-fila-rojo)'), mas = document.querySelector('nav.cfx-barra > .cfx-mas');
      const tx = hx(getComputedStyle(fila.querySelector('b')).color), card = v('--cfx-tarjeta'), fondo = v('--cfx-fondo');
      return { fondo, card, tx, cTx: Math.min(C.contraste(tx, card), C.contraste(tx, fondo)), ico: hx(getComputedStyle(fila.querySelector('.cfx-fila-ic')).color),
        mas: hx(getComputedStyle(mas.querySelector('svg, span') || mas).color), brand: v('--brand'), bg: hx(getComputedStyle(document.body).backgroundColor) };
    });
    await poner('fondo', '#101820'); await p.waitForTimeout(500);
    let m = await medir();
    assert(m.fondo === '#101820' && m.cTx >= 4.5, 'Fondo oscuro en modo claro: el texto se ajusta solo y se lee ' + JSON.stringify(m));
    await poner('texto', '#202020'); await p.waitForTimeout(500);
    assert(/ajust/i.test(await p.locator('body').innerText()), 'Avisa que ajustó el texto para que se lea');
    m = await medir(); assert(m.cTx >= 4.5, 'Texto casi negro sobre fondo oscuro → igual se lee ' + m.cTx.toFixed(1));
    await poner('icono', '#ff3b30'); await p.waitForTimeout(500);
    m = await medir(); assert(m.ico !== m.tx, 'Íconos del menú con el color elegido ' + m.ico);
    await p.locator('.cfx-hoja-m').last().screenshot({ path: 'capturas/Aplicaciones/g48_colores_hoja.png' });
    // Queda al recargar
    await p.reload(); await p.waitForTimeout(2000); await t.sinModales(); await mas();
    m = await medir(); assert(m.fondo === '#101820' && m.cTx >= 4.5 && /^#ff|^#f[0-9a-f]/.test(m.ico), 'Tras recargar siguen los colores ' + JSON.stringify(m));
    await p.evaluate(() => scrollTo(0, 400)); await p.waitForTimeout(400); await p.screenshot({ path: 'capturas/Aplicaciones/g48_colores.png' });
    const masInk = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--cfx-mas-ink').trim());
    assert(masInk && masInk !== '#111827', 'El + del centro usa el color de los íconos ' + masInk);
    const masSvg = await p.evaluate(() => { const c = getComputedStyle(document.querySelector('nav.cfx-barra > .cfx-mas svg')).color.match(/\d+/g).map(Number); return '#' + c.slice(0, 3).map((x) => x.toString(16).padStart(2, '0')).join(''); });
    assert(masSvg === masInk, 'El signo + se pinta con ese color (también si el + es dorado Pro) ' + masSvg);
    // Modo oscuro guarda los suyos: al cambiar no se arrastran los del claro
    await estilo(); await p.locator('.cfx-hoja-m [data-m="oscuro"]').last().tap(); await p.waitForTimeout(900);
    assert(await p.evaluate(() => !document.documentElement.style.getPropertyValue('--cfx-fondo') && /oscuro/.test([...document.querySelectorAll('.cfx-hoja-m [data-pf-mc] > label')].pop().textContent)), 'En modo oscuro: colores normales y el panel dice "modo oscuro"');
    await p.screenshot({ path: 'capturas/Aplicaciones/g48_oscuro.png' });
    await p.locator('.cfx-hoja-m [data-m="claro"]').last().tap(); await p.waitForTimeout(900);
    assert(await p.evaluate(() => document.documentElement.style.getPropertyValue('--cfx-fondo') === '#101820'), 'De vuelta en claro vuelven sus colores');
    await p.locator('.cfx-hoja-m [data-pf-colnormal]').last().tap(); await p.waitForTimeout(600);
    assert(await p.evaluate(() => !document.documentElement.style.getPropertyValue('--cfx-fondo') && !document.documentElement.classList.contains('cfx-col-ico')), '↺ Volver a los colores normales');
    const er = t.errores.filter((x) => !/ERR_|status of 404/.test(x)); assert(!er.length, 'Sin errores en consola ' + er.join(' | '));
    console.log('G48 OK');
  } catch (e) { console.log(e.message); await t.foto('g48_falla').catch(() => {}); process.exitCode = 1; } finally { await t.cerrar(); }
})();
