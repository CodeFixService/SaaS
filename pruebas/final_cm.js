// Análisis final CM (como Josué, 360 px): admin y negocio · en cada pantalla toca CADA botón visible y anota errores de JS o lo que se sale del ancho.
const { abrir } = require('./h');
const fs = require('fs');
const { botones, res, ok } = require('./final_apl');
const ADM = ['/admin/#resumen', '/admin/#apps', '/admin/#usuarios', '/admin/#pagos', '/admin/#mensajes', '/admin/#analitica', '/admin/#control', '/admin/#ajustes', '/admin/#registro', '/admin/#versiones',
  '/app/#hoy', '/app/#pedidos', '/app/#metas', '/app/#tablero', '/app/#insights', '/app/#panel', '/app/#mas'];
const NEG = ['/app/#hoy', '/app/#pedidos', '/app/#metas', '/app/#tablero', '/app/#insights', '/app/#mas'];
async function entrar(t, p, email, pass) {
  await p.goto(t.base + '/'); await p.waitForTimeout(1000);
  await p.fill('input[type=email]:visible', email); await p.fill('input[type=password]:visible', pass); await p.press('input[type=password]:visible', 'Enter');
  await p.waitForTimeout(3500); await t.sinModales(p);
}
(async () => {
  const t = await abrir('/home/user/saas', 'p_saas');
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123'); await t.sim.crearUsuario('ana@x.cl', 'clave123');
    await entrar(t, t.page, 'juanjosuecastilloloyola@gmail.com', 'admin123');
    ok(/\/admin\//.test(t.page.url()), 'Admin entra a /admin/ ' + t.page.url().replace(t.base, ''));
    for (const u of ADM) await botones(t, t.page, u, 'Admin');
    const { page: q } = await t.nuevo(); await entrar(t, q, 'ana@x.cl', 'clave123');
    ok(/\/app\//.test(q.url()), 'Usuario entra a /app/ ' + q.url().replace(t.base, ''));
    for (const u of NEG) await botones(t, q, u, 'Usuario');
  } catch (e) { ok(false, 'se cortó: ' + e.message.split('\n')[0]); }
  const err = t.errores.filter((x) => !/ERR_|status of 404|favicon/.test(x));
  fs.writeFileSync(__dirname + '/capturas/final_cm.txt', res.join('\n') + '\n\nERRORES JS:\n' + ([...new Set(err)].join('\n') || 'ninguno') + '\n');
  console.log('\n' + res.join('\n') + '\nERRORES:', [...new Set(err)].slice(0, 20).join('\n') || 'ninguno');
  await t.cerrar();
})();
