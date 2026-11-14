// G37 · 🧠 Comprobante + 🖨️ impresora en el núcleo: CM → Pagos → pago aprobado → 🧾 Comprobante (WhatsApp, Bluetooth, PDF, copiar)
// + las funciones de Billetera/BiciTaller/Estaciona ya atienden "Entrar con QR" (qr_entrar). FALLA con el código viejo.
// Uso: ./base.sh /home/user/saas g37_cm && ./base.sh /home/user/Aplicaciones g37_apl && ANCHO=320 node g37_comprobante.js
const fs = require('fs');
const { abrir } = require('./h');
const { crear } = require('./sim');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
const ADM = 'juanjosuecastilloloyola@gmail.com';
(async () => {
  // 0) Las 3 funciones atienden qr_entrar con cfx_qr_canjear (como Despega, CM y Barbería).
  for (const f of ['/home/user/Emprendedor/supabase/functions/enviar/index.ts', '/home/user/Taller/supabase/functions/servidor/index.ts', '/home/user/Estacionamiento/supabase/functions/enviar/index.ts']) {
    const s = fs.readFileSync(f, 'utf8');
    assert(/(accion === 'qr_entrar'|case 'qr_entrar')[\s\S]{0,60}qrEntrar\(body\)/.test(s) && /rpc\('cfx_qr_canjear'/.test(s) && /generateLink\(\{ type: 'magiclink'/.test(s), 'Entrar con QR en ' + f.split('/')[3]);
  }
  assert(fs.readFileSync('/home/user/SaaS/shared/comprobante.js', 'utf8') === fs.readFileSync('/home/user/Aplicaciones/shared/comprobante.js', 'utf8'), 'comprobante.js igual en CM y Despega (núcleo)');
  const t = await abrir('/home/user/saas', 'g37_cm');
  const ap = crear({ db: 'g37_apl', funciones: { enviar: (b) => b && b.accion === 'ping' ? { version: '3.5', servicio: true } : { ok: true } }, log: (m) => t.errores.push(m) });
  const p = t.page;
  try {
    await ap.conectar(t.ctx, /https:\/\/gilsamacgappycibcqhq\.supabase\.co\//);
    await t.sim.crearUsuario(ADM, 'admin123');
    await ap.crearUsuario(ADM, 'admin123');
    await ap.su("update public.profiles set terms_at = now()");
    await ap.su("insert into public.cfx_pagos (cuenta, email, nombre, rol, periodo, monto, medio, estado, dias, resuelto) values (gen_random_uuid(), 'tienda@x.cl', 'Café Ñandú', 'negocio', 'mensual', 3000, 'transferencia', 'aprobado', 30, now())");
    await p.goto(t.base + '/');
    await p.fill('input[type=email]', ADM); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800);
    await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(3000); await t.sinModales();
    const card = p.locator('[data-app=aplicaciones]');
    await card.locator('[data-a=con]').click(); await p.waitForTimeout(400);
    await p.fill('dialog #ce', ADM); await p.fill('dialog #cp', 'admin123'); await p.click('dialog #cok'); await p.waitForTimeout(2500); await t.sinModales();
    // 1) Pagos → Todos → 🧾 Comprobante del pago aprobado
    await p.goto(t.base + '/admin/#pagos'); await p.waitForTimeout(2500); await t.sinModales();
    await p.click('[data-f=todos]'); await p.waitForTimeout(2500);
    assert(await p.locator('[data-cb]').count() === 1, 'Pago aprobado con botón 🧾 Comprobante');
    await p.click('[data-cb]'); await p.waitForTimeout(800);
    const papel = (await p.textContent('.cfx-comp .cb-papel')).replace(/\s+/g, ' ');
    console.log('papel:', papel);
    assert(/CodeFix · Despega Pyme/.test(papel) && /COMPROBANTE DE PAGO/.test(papel) && /Café Ñandú/.test(papel) && /Plan Premium · Mensual/.test(papel) && /\$3\.000/.test(papel) && /Transferencia/.test(papel), 'Comprobante con app, cliente, plan, total y medio');
    assert(/No es boleta electrónica/.test(papel), 'Sin RUT: dice "No es boleta electrónica" (G31)');
    const bt = await p.evaluate(() => ['wsp', 'bt', 'print', 'copiar', 'x'].map((a) => !!document.querySelector('.cfx-comp [data-a=' + a + ']')));
    assert(bt.every(Boolean), 'Botones WhatsApp, 🖨️ Bluetooth, PDF, Copiar y Cerrar');
    const caja = await p.evaluate(() => { const d = document.querySelector('.cfx-comp'), s = getComputedStyle(d), h = getComputedStyle(d.firstElementChild); return { pos: s.position, fondo: h.backgroundColor, ancho: d.firstElementChild.getBoundingClientRect().width }; });
    assert(caja.pos === 'fixed' && caja.fondo !== 'rgba(0, 0, 0, 0)', 'Hoja propia del núcleo (fija y con fondo) ' + JSON.stringify(caja));
    assert(await t.anchoOk(), 'Sin salirse en ' + (process.env.ANCHO || 'normal'));
    await t.foto('g37_comprobante');
    await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(300);
    const osc = await p.evaluate(() => getComputedStyle(document.querySelector('.cfx-comp').firstElementChild).backgroundColor);
    assert(osc !== 'rgb(255, 255, 255)', 'Modo oscuro: la hoja se oscurece (' + osc + '), el papel queda blanco');
    await t.foto('g37_comprobante_oscuro');
    await p.click('.cfx-comp [data-a=x]'); await p.waitForTimeout(300);
    assert(!(await p.locator('.cfx-comp').count()), 'Cerrar quita el comprobante');
  } catch (e) { console.log(e.message); process.exitCode = 1; await t.foto('error'); }
  console.log('ERRORES:', t.errores.filter((x) => !/Failed to load resource|ERR_|workers\.dev|status of 404/.test(x)).join('\n') || 'ninguno');
  await t.cerrar();
})();
