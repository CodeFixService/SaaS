// Prueba de humo: entra como súper admin a una app y junta errores. node humo.js <repo> <db> [ruta]
const { abrir } = require('./h');
(async () => {
  const [repo, db, ruta] = process.argv.slice(2);
  const t = await abrir(repo, db);
  const ADM = 'juanjosuecastilloloyola@gmail.com';
  if (!(await t.sim.su('select 1 from auth.users where email = $1', [ADM])).length) await t.sim.crearUsuario(ADM, 'admin123');
  await t.page.goto(t.base + (ruta || '/'));
  await t.page.waitForTimeout(1500);
  const em = t.page.locator('input[type=email]:visible').first();
  if (await em.count()) {
    await em.fill(ADM);
    await t.page.locator('input[type=password]:visible').first().fill('admin123');
    await t.page.locator('input[type=password]:visible').first().press('Enter');
    await t.page.waitForTimeout(3500);
  }
  console.log('url:', t.page.url(), 'ancho ok:', await t.anchoOk());
  await t.foto('humo');
  console.log((await t.page.locator('body').innerText()).slice(0, 600));
  console.log('ERRORES:', t.errores.length ? t.errores.join('\n') : 'ninguno');
  await t.cerrar();
})();
