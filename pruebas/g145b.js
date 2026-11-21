// G145 c · 🧭 CM con un solo lugar por cosa (navegador): 🔔 y 📜 del CM viven en Control con todo lo que tenían; Ajustes ya no los repite;
// el link viejo #registro abre Control → 📜. 🌐 Dominio y 🛒 Mercado Libre sin nada por tienda. FALLA con el código viejo. Uso: node g145b.js
const { abrir } = require('./h');
const assert = (c, m) => { if (!c) throw new Error('FALLA: ' + m); console.log('ok', m); };
(async () => {
  const t = await abrir('/home/user/saas', 'p_saas');
  const p = t.page;
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    await p.goto(t.base + '/'); await p.fill('input[type=email]', 'juanjosuecastilloloyola@gmail.com'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800); await t.sinModales();
    await p.goto(t.base + '/admin/#ajustes'); await p.waitForTimeout(2000); await t.sinModales();
    const aj = await p.locator('#ajustes, [id=ajustes]').first().innerText().catch(() => '');
    assert(!/Registro de cambios/.test(aj) && !/Claves push y servidor/.test(aj), 'Ajustes ya no repite 🔔 ni 📜');
    await p.goto(t.base + '/admin/#control'); await p.waitForTimeout(3500); await t.sinModales();
    await p.click('[data-s=registro]'); await p.waitForTimeout(2000);
    assert(await p.locator('#rgCm #rD').count() === 1 && await p.locator('#rgCfx .cfx-reg-b').count() === 1, 'Control → 📜 Registro (CM): CSV + vaciar + registro común');
    await t.foto('g145-registro'); assert(await t.anchoOk(), 'ancho registro');
    await p.click('[data-s=push]'); await p.waitForTimeout(2000);
    await p.click('#puCm summary'); await p.waitForTimeout(800);
    assert(await p.locator('#puCm #kP').count() === 1 && await p.locator('#puCm #kG').count() === 1, 'Control → 🔔: claves nuevas y 🧪 probar servidor del CM');
    await t.foto('g145-push'); assert(await t.anchoOk(), 'ancho push');
    await p.click('[data-s=ml]'); await p.waitForTimeout(1200);
    const ml = await p.locator('#ctlCuerpo').innerText();
    assert(!/Conéctate primero/.test(ml) ? /app de CodeFix/.test(ml) : true, '🛒 Mercado Libre: solo la app de CodeFix');
    await p.click('[data-s=dominio]'); await p.waitForTimeout(2000);
    const dm = await p.locator('#ctlCuerpo').innerText();
    assert(/Dominio de CodeFix/.test(dm) && !/elige Despega Pyme arriba/.test(dm), '🌐 Dominio: el de CodeFix; nada por tienda que configurar');
    await t.foto('g145-dominio'); assert(await t.anchoOk(), 'ancho dominio');
    await p.goto(t.base + '/admin/#registro'); await p.waitForTimeout(3500); await t.sinModales();
    assert(await p.locator('[data-s=registro].on').count() === 1, 'link viejo #registro → Control → 📜 Registro');
    console.log('✅ G145 b OK');
  } catch (e) { console.log(e.message); process.exitCode = 1; } finally { await t.cerrar(); }
})();
