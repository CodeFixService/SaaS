// CM → Apps: el aviso azul "vX en su turno" solo sale en las apps con núcleo MÁS ANTIGUO que el más nuevo (antes salía en todas, incluso en las al día).
// Uso: node g34_turno.js [bd]  (antes ./base.sh /home/user/SaaS <bd>)
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/saas', process.argv[2] || 'p_turno');
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  const p = t.page;
  try {
    const N = { SaaS: '2.65', Aplicaciones: '2.65', Barberia: '2.65', Emprendedor: '2.54' };
    await t.ctx.route(/raw\.githubusercontent\.com\/CodeFixService\/([^/]+)\/[^/]+\/nucleo\.json/i, (r) => {
      const repo = Object.keys(N).find((k) => r.request().url().toLowerCase().includes('/' + k.toLowerCase() + '/'));
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ nucleo: N[repo] || '2.54' }) });
    });
    await t.ctx.route(/localhost:\d+\/nucleo\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"nucleo":"2.63"}' }));  // copia vieja (caché)
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    await p.goto(t.base + '/');
    await p.fill('input[type=email]', 'juanjosuecastilloloyola@gmail.com'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(1000); await t.sinModales();
    await p.goto(t.base + '/admin/#apps'); await p.waitForTimeout(6000); await t.sinModales();
    const r = await p.evaluate(() => [...document.querySelectorAll('[data-app]')].map((n) => [n.dataset.app, (n.querySelector('.pill.info') || {}).textContent || '']));
    const de = (id) => (r.find((x) => x[0] === id) || [])[1];
    console.log(JSON.stringify(r));
    ok(r.length > 3, 'se ven las tarjetas de las apps');
    ok(!/en su turno/.test(de('cm') || '') && !/en su turno/.test(de('aplicaciones') || ''), 'CM y Órbita (al día) NO dicen "en su turno"');
    ok(/v2\.65 en su turno/.test(de('billetera') || ''), 'Billetera (2.54) dice "v2.65 en su turno"');
    await t.foto('g34-turno');
  } catch (e) { console.log('✗ ' + e.message); process.exitCode = 1; } finally { await t.cerrar(); }
})();
