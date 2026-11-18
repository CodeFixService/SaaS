// G105 · Deslizar sobre fecha/hora/lista NO abre la hoja; solo el toque. Falla con el ui.js viejo.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(), c = await b.newContext({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 640 } }), p = await c.newPage();
  const ui = path.resolve(__dirname, '../nucleo/ui.js');
  await p.setContent(`<div style="height:300px"></div><input type="date" id="f"><br><input type="time" id="h"><br><select id="s"><option>a</option><option>b</option></select><div style="height:2000px"></div>`);
  await p.addScriptTag({ path: ui }); await p.waitForTimeout(300);
  const cdp = await c.newCDPSession(p);
  const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const abierta = () => p.evaluate(() => !!document.querySelector('dialog[open]'));
  const cerrar = () => p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  let mal = 0;
  for (const id of ['f', 'h', 's']) {
    await p.evaluate(() => scrollTo(0, 0)); const r = await p.locator('#' + id).boundingBox(); const x = r.x + 10, y = r.y + r.height / 2;
    await tp('touchStart', x, y); for (let i = 1; i <= 6; i++) { await tp('touchMove', x, y - i * 15); } await tp('touchEnd'); await p.waitForTimeout(400);
    if (await abierta()) { console.log('❌ deslizar abrió', id); mal++; } else console.log('✅ deslizar no abre', id);
    await cerrar(); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(100);
    await tp('touchStart', x, y); await tp('touchEnd'); await p.waitForTimeout(400);
    if (!(await abierta())) { console.log('❌ tocar no abrió', id); mal++; } else console.log('✅ tocar abre', id);
    await cerrar();
  }
  await b.close(); console.log(mal ? 'FALLA' : 'OK'); process.exit(mal ? 1 : 0);
})();
