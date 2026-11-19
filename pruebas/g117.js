// G117 · 🗂️ Ajustes ordenados (núcleo vitrina.js: CodeFixVitrina.horario / .transferencia).
// Horario por días (⚡ Rápido Lun a Vie · Sáb · Dom, 📅 Día por día, 2 tramos) y datos de banco por campos (RUT validado).
// El texto se sigue guardando igual (base vieja no se rompe); texto viejo que no se entiende se muestra y se ofrece pasarlo.
// FALLA con el código viejo (no existe CodeFixVitrina.horario).   Uso: ANCHO=320 node g117.js [despega barberia estaciona]
const { abrir } = require('./h');
const { execSync } = require('child_process');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const entrar = async (p, base, url, email, sel, tab) => {
  await p.goto(base + url); await p.waitForTimeout(1500); if (tab) { await p.click(tab); await p.waitForTimeout(300); }
  const e = sel ? sel[0] : 'input[type=email]:visible', c = sel ? sel[1] : 'input[type=password]:visible';
  await p.fill(e, email); await p.fill(c, 'clave123'); await p.press(c, 'Enter'); await p.waitForTimeout(3500);
};
const cap = (p, n) => p.screenshot({ path: __dirname + '/capturas/g117-' + n + '.png', fullPage: true }).catch(() => {});
const llenarBanco = async (p, raiz) => {
  const q = (s) => raiz + ' .fo-tr ' + s;
  await p.selectOption(q('[data-t=banco]'), 'BancoEstado'); await p.selectOption(q('[data-t=tipo]'), 'Cuenta Corriente');
  await p.fill(q('[data-t=numero]'), '123-456-78'); await p.fill(q('[data-t=rut]'), '12345678-4');
  await p.fill(q('[data-t=titular]'), 'Ana Pérez'); await p.fill(q('[data-t=correo]'), 'ana@x.cl'); await p.waitForTimeout(200);
};

(async () => {
  const pedidas = process.argv.slice(2), quiere = (n) => !pedidas.length || pedidas.includes(n);
  // ---------- funciones puras (en el navegador) ----------
  if (quiere('despega')) {
    execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g117_apl', { stdio: 'ignore' });
    const t = await abrir('/home/user/Aplicaciones', 'p_g117_apl'); const su = t.sim.su;
    try {
      await t.sim.crearUsuario(ADM, 'admin123').catch(() => {});
      const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' });
      await su("update public.profiles set terms_at = now(), horario = 'Lun a Vie 9:00 a 19:00 · Sáb 10:00 a 14:00', datos_pago = 'Banco Estado, cuenta RUT 12.345.678-5, Ana Perez ana@x.cl' where id = $1", [u.id]);
      const { page: p } = await t.nuevo();
      await entrar(p, t.base, '/', 'dueno@x.cl'); await t.sinModales(p);
      const V = await p.evaluate(() => { const V = window.CodeFixVitrina || {}; if (!V.horarioTexto) return null;
        return { a: V.horarioTexto(V.horarioLeer('Lunes a viernes de 9 a 18 hrs')), b: V.horarioLeer('Atendemos siempre'), r1: V.rutOk('12.345.678-5'), r2: V.rutOk('12.345.678-4'),
          c: V.transfLeer(V.transfTexto({ banco: 'BCI', numero: '1', rut: '1-9' })) }; });
      ok(V && V.a === 'Lun a Vie 9:00–18:00 · Sáb y Dom cerrado', 'núcleo: entiende "Lunes a viernes de 9 a 18 hrs" (' + (V && V.a) + ')');
      ok(V && V.b === null, 'núcleo: texto que no se entiende → null (se muestra tal cual)');
      ok(V && V.r1 === '12.345.678-5' && V.r2 === null, 'núcleo: RUT con dígito verificador');
      ok(V && V.c && V.c.banco === 'BCI', 'núcleo: el texto de banco se vuelve a leer igual');
      await p.goto(t.base + '/#tienda'); await p.reload(); await p.waitForTimeout(3500); await t.sinModales(p);
      ok(await p.locator('.fo-hor .fo-dia').count() === 3, 'despega: 🕐 horario viejo escrito → ⚡ Rápido con 3 filas (Lun a Vie, Sáb, Dom)');
      ok(!(await p.locator('#tHorario').isVisible()), 'despega: el campo de texto queda escondido (la app lo sigue guardando)');
      ok(/Sáb 10:00–14:00 · Dom cerrado/.test(await p.locator('.fo-hor .fo-ver').innerText()), 'despega: 👀 vista previa de lo que ve el cliente');
      ok(await p.locator('.fo-tr .fo-viejo').count() === 1 && await p.inputValue('.fo-tr [data-t=rut]') === '12.345.678-5' && await p.inputValue('.fo-tr [data-t=banco]') === 'BancoEstado',
        'despega: 🏦 datos viejos se muestran y se pasan a campos (banco, RUT)');
      ok(await p.inputValue('#tPago') === 'Banco Estado, cuenta RUT 12.345.678-5, Ana Perez ana@x.cl', 'despega: 🛡️ el texto viejo no cambia hasta que la persona toque');
      // Día por día + colación
      await p.click('.fo-hor [data-modo=dias]'); await p.waitForTimeout(200);
      ok(await p.locator('.fo-hor .fo-dia').count() === 7, 'despega: 📅 Día por día → 7 filas');
      await p.click('.fo-hor [data-fila="0"] [data-suma]'); await p.waitForTimeout(200);
      await p.uncheck('.fo-hor [data-ab="2"]'); await p.waitForTimeout(200);
      const hv = await p.inputValue('#tHorario');
      ok(hv === 'Lun 9:00–14:00 y 15:00–19:00 · Mar 9:00–19:00 · Mié cerrado · Jue y Vie 9:00–19:00 · Sáb 10:00–14:00 · Dom cerrado', 'despega: colación y día cerrado → texto (' + hv + ')');
      // Banco con RUT malo: no se escribe
      await llenarBanco(p, '');
      ok(/RUT no es válido/.test(await p.locator('.fo-tr .fo-err').innerText()) && !/12\.345\.678-4/.test(await p.inputValue('#tPago')), 'despega: ⚠️ RUT malo avisa y no pisa lo anterior');
      await p.fill('.fo-tr [data-t=rut]', '12345678-5'); await p.waitForTimeout(200);
      ok(await p.inputValue('#tPago') === 'Banco: BancoEstado\nTipo de cuenta: Cuenta Corriente\nN° de cuenta: 12345678\nRUT: 12.345.678-5\nNombre: Ana Pérez\nCorreo: ana@x.cl', 'despega: RUT bueno → texto ordenado');
      const ancho = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
      ok(ancho, 'despega: cabe a ' + (process.env.ANCHO || 360) + ' px');
      await p.locator('.fo-hor').screenshot({ path: __dirname + '/capturas/g117-despega-horario.png' }).catch(() => {});
      await cap(p, 'despega-ajustes');
      await p.click('#bTienda'); await p.waitForTimeout(2000);
      const g = (await su('select horario, datos_pago from public.profiles where id = $1', [u.id]))[0];
      ok(g.horario === hv && /^Banco: BancoEstado\n/.test(g.datos_pago), 'despega: 💾 se guarda en la base (horario ' + g.horario.length + ' letras)');
      await p.reload(); await p.waitForTimeout(3500); await t.sinModales(p);
      ok(await p.locator('.fo-hor .fo-dia').count() === 7 && await p.locator('.fo-tr .fo-viejo').count() === 0 && await p.inputValue('.fo-tr [data-t=titular]') === 'Ana Pérez',
        'despega: al volver se lee igual (Día por día y campos, sin "texto viejo")');
      await p.emulateMedia({ colorScheme: 'dark' }); await cap(p, 'despega-oscuro'); await p.emulateMedia({ colorScheme: 'light' });
      // Texto que no se entiende
      await su("update public.profiles set horario = 'Atendemos siempre, llama antes' where id = $1", [u.id]);
      await p.reload(); await p.waitForTimeout(3500); await t.sinModales(p);
      ok(/Atendemos siempre/.test(await p.locator('.fo-hor .fo-viejo').innerText()) && await p.locator('.fo-hor [data-pasar]').count() === 1, 'despega: horario escrito raro → se muestra + 📅 Pasar a días');
      await p.click('#bTienda'); await p.waitForTimeout(1500);
      ok((await su('select horario from public.profiles where id = $1', [u.id]))[0].horario === 'Atendemos siempre, llama antes', 'despega: 🛡️ guardar sin tocar no lo pierde');
      // Cliente: r/ (pedido) con 📋 Copiar todo existe en el html
      ok(/data-cfx-copiar/.test(require('fs').readFileSync('/home/user/Aplicaciones/r/index.html', 'utf8')), 'despega: el cliente tiene 📋 Copiar todo');
    } catch (e) { ok(false, 'despega: ' + e.message); } finally { await t.cerrar(); }
  }
  if (quiere('barberia')) {
    execSync(__dirname + '/base.sh /home/user/barberia p_g117_bar', { stdio: 'ignore' });
    const t = await abrir('/home/user/barberia', 'p_g117_bar'); const su = t.sim.su;
    try {
      await t.sim.crearUsuario(ADM, 'admin123').catch(() => {});
      await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'barberia', barberia: 'Barbería Juan', nombre: 'Juan', telefono: '+56912345671' });
      await su('update public.profiles set clave_temporal = false, tour_visto = true where true').catch(() => {});
      const { page: p } = await t.nuevo();
      await entrar(p, t.base, '/', 'dueno@x.cl'); await t.sinModales(p);
      await p.goto(t.base + '/equipo/#links'); await p.reload(); await p.waitForTimeout(3500); await t.sinModales(p);
      ok(await p.locator('.fo-tr [data-t=rut]').count() === 1, 'barbería: 💳 Links de pago → datos de banco por campos');
      await llenarBanco(p, ''); await p.fill('.fo-tr [data-t=rut]', '12.345.678-5'); await p.waitForTimeout(200);
      await p.click('#bGuardarL'); await p.waitForTimeout(2000);
      const d = (await su('select datos_transferencia d from public.barberias limit 1'))[0].d;
      ok(/^Banco: BancoEstado\nTipo de cuenta: Cuenta Corriente\nN° de cuenta: 12345678\nRUT: 12.345.678-5/.test(d || ''), 'barbería: 💾 se guarda ordenado');
      ok(await p.locator('.fo-tr [data-t=titular]').count() === 1 && await p.inputValue('.fo-tr [data-t=titular]') === 'Ana Pérez', 'barbería: al volver a pintar se lee igual');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'barbería: cabe a ' + (process.env.ANCHO || 360) + ' px');
      await cap(p, 'barberia-links');
    } catch (e) { ok(false, 'barbería: ' + e.message); } finally { await t.cerrar(); }
  }
  if (quiere('estaciona')) {
    execSync(__dirname + '/base.sh /home/user/estacionamiento p_g117_est', { stdio: 'ignore' });
    const t = await abrir('/home/user/estacionamiento', 'p_g117_est'); const su = t.sim.su;
    try {
      await t.sim.crearUsuario(ADM, 'admin123').catch(() => {});
      await t.sim.crearUsuario('dueno@x.cl', 'clave123');
      await su("update public.perfiles set acepto_terminos = now(), verificado = true, nombre = 'Beto'");
      const { page: p } = await t.nuevo();
      await entrar(p, t.base, '/#/avisos', 'dueno@x.cl', ['#lEmail', '#lClave'], 'button[data-t=in]'); await t.sinModales(p);
      await p.goto(t.base + '/#/mas'); await p.waitForTimeout(2000); await p.click('text=Links de pago >> visible=true'); await p.waitForTimeout(2500);
      const n = await p.locator('text=Escribir datos de banco por campos').count();
      ok(n >= 1, 'estaciona: cada espacio ofrece 🏦 Escribir datos de banco por campos (' + n + ')');
      ok(await p.locator('.lkTxt').first().isVisible(), 'estaciona: 🛡️ el texto libre sigue a la vista (sirve para otras cosas)');
      await p.locator('text=Escribir datos de banco por campos').first().click(); await p.waitForTimeout(300);
      await llenarBanco(p, '[data-slot="1"]'); await p.fill('[data-slot="1"] .fo-tr [data-t=rut]', '12.345.678-5'); await p.waitForTimeout(200);
      await p.click('[data-slot="1"] .lkOk'); await p.waitForTimeout(2000);
      const tx = (await su("select texto from public.links_pago where slot = 1 and dueno is not null limit 1").catch(() => [{}]))[0] || {};
      ok(/^Banco: BancoEstado\n/.test(tx.texto || ''), 'estaciona: 💾 se guarda ordenado en el espacio 1');
      await p.waitForTimeout(800);
      ok(await p.locator('[data-slot="1"] .fo-tr').count() === 1 && await p.locator('[data-slot="1"] [data-texto]').count() === 1, 'estaciona: al volver abre en campos con ✏️ Volver a texto libre');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'estaciona: cabe a ' + (process.env.ANCHO || 360) + ' px');
      await cap(p, 'estaciona-links');
    } catch (e) { ok(false, 'estaciona: ' + e.message); } finally { await t.cerrar(); }
  }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ G117 todo bien'); process.exit(f ? 1 : 0);
})();
