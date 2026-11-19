// G118 · 📊 UNA planilla de carga masiva (núcleo CFX_RESPALDO.planilla) en Despega (productos), Barbería y BiciTaller (servicios), Billetera (clientes).
// ⬇️ Descargar planilla (Excel con ejemplos) → se vuelve a subir tal cual · ⬆️ subir CSV → vista previa "se crean · se actualizan · con error: fila N" →
// ✅ Confirmar → queda en la base; re-subir no duplica. Billetera: los que ya están no se tocan (saldo).  FALLA con código viejo (no hay CFX_RESPALDO.planilla).
// Uso: ANCHO=320 node g118.js [despega barberia bicitaller billetera]
const { abrir } = require('./h');
const { execSync } = require('child_process');
const fs = require('fs');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const ADM = 'juanjosuecastilloloyola@gmail.com';
const TMP = '/tmp/claude-0/-home-user/6d8a6e2c-8d03-574b-a05f-97455cbf479e/scratchpad/';
const entrar = async (p, base, url, email, sel, tab) => {
  await p.goto(base + url); await p.waitForTimeout(1500); if (tab) { await p.click(tab); await p.waitForTimeout(300); }
  const e = sel ? sel[0] : 'input[type=email]:visible', c = sel ? sel[1] : 'input[type=password]:visible';
  await p.fill(e, email); await p.fill(c, 'clave123'); await p.press(c, 'Enter'); await p.waitForTimeout(3500);
};
// Abre el <details> que contiene la planilla y devuelve el selector raíz
const abrirPl = async (p, texto) => { SUM = texto; await p.click('summary:has-text("' + texto + '") >> visible=true'); await p.waitForTimeout(600); };
const subir = async (p, nombre, csv) => { await asegurar(p); fs.writeFileSync(TMP + nombre, csv); await p.setInputFiles('.cfx-pl input[data-pl=arch] >> nth=0', TMP + nombre); await p.waitForTimeout(800); };
const res = (p) => p.locator('.cfx-pl-res').first().innerText().catch(() => '');
let SUM = '';
const asegurar = async (p) => { if (!await p.locator('.cfx-pl >> visible=true').count()) await abrirPl(p, SUM); };
async function bajarYSubir(p, n) {
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.click('.cfx-pl [data-pl=bajar] >> visible=true')]);
  ok(dl && /\.xlsx$/.test(dl.suggestedFilename()), n + ': ⬇️ Descargar planilla → Excel (' + (dl && dl.suggestedFilename()) + ')');
  if (!dl) return;
  const ruta = TMP + n + '-' + dl.suggestedFilename(); await dl.saveAs(ruta);
  await p.setInputFiles('.cfx-pl input[data-pl=arch] >> nth=0', ruta); await p.waitForTimeout(800);
  ok(/Se crean \d|se actualizan \d/.test(await res(p)) && !/error/.test(await res(p)), n + ': la planilla descargada se sube tal cual (' + (await res(p)).split('\n')[0] + ')');
  await p.click('.cfx-pl [data-pl=cancelar]'); await p.waitForTimeout(200);
}
async function flujo(p, n, csv, espera, confirmar, contar) {
  await subir(p, n + '.csv', csv);
  const r = await res(p);
  ok(espera.test(r), n + ': ⬆️ vista previa (' + r.replace(/\s+/g, ' ').slice(0, 110) + ')');
  ok(/Fila 4:/.test(r), n + ': el error dice la fila');
  const antes = await contar();
  await p.click('.cfx-pl [data-pl=ok]');
  const r2 = await p.waitForFunction((re) => { const t = document.body.innerText; return new RegExp(re).test(t) && t.match(new RegExp(re))[0]; }, confirmar.source, { timeout: 15000 }).then((h) => h.jsonValue()).catch(() => '');
  await p.waitForTimeout(1500);
  ok(confirmar.test(r2), n + ': ✅ Confirmar (' + r2.replace(/\s+/g, ' ').slice(0, 80) + ')');
  return [antes, await contar()];
}

(async () => {
  const pedidas = process.argv.slice(2), quiere = (n) => !pedidas.length || pedidas.includes(n);
  if (quiere('despega')) {
    execSync(__dirname + '/base.sh /home/user/Aplicaciones p_g118_apl', { stdio: 'ignore' });
    const t = await abrir('/home/user/Aplicaciones', 'p_g118_apl'); const su = t.sim.su;
    try {
      await t.sim.crearUsuario(ADM, 'admin123').catch(() => {});
      await t.sim.crearUsuario('dueno@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana' }); await su('update public.profiles set terms_at = now()');
      const { page: p } = await t.nuevo();
      await entrar(p, t.base, '/', 'dueno@x.cl'); await t.sinModales(p);
      await p.goto(t.base + '/apps/caja/#productos'); await p.reload(); await p.waitForTimeout(3500); await t.sinModales(p);
      await abrirPl(p, 'Planilla única');
      ok(await p.locator('.cfx-pl').count() === 1, 'despega: Caja → Productos → 📊 Planilla única');
      await bajarYSubir(p, 'despega');
      const cuenta = () => su('select count(*)::int n from public.catalog_items').then((r) => r[0].n).catch(() => -1);
      const csv = 'Nombre;Precio;Categoría;Stock;En catálogo\nTorta;15000;Tortas;5;sí\nKuchen;$8.000;Tortas;;sí\nMalo;abc;;;sí\nAlfajor;1200;;;no\n';
      const [a, b] = await flujo(p, 'despega', csv, /Se crean 3[\s\S]*1 con error/, /3 creados/, cuenta);
      ok(b - a === 2, 'despega: 💾 2 en el catálogo (el "no" queda solo en tu Caja) (' + a + '→' + b + ')');
      await subir(p, 'despega2.csv', 'Nombre;Precio\ntorta;16000\n');
      ok(/se actualizan 1/.test(await res(p)), 'despega: re-subir con el mismo nombre → se actualiza (no duplica)');
      await p.click('.cfx-pl [data-pl=ok]'); await p.waitForTimeout(2500);
      const pr = await su("select precio from public.catalog_items where lower(nombre) = 'torta'").catch(() => []);
      ok(pr.length === 1 && +pr[0].precio === 16000, 'despega: 🔄 precio actualizado en el servidor (1 sola Torta, $16.000)');
      await subir(p, 'despega3.csv', 'Producto;Valor\nX;1\n'); 
      ok(/Se crean 1/.test(await res(p)), 'despega: entiende títulos parecidos (Producto, Valor)');
      await subir(p, 'despega4.csv', 'Color;Talla\nrojo;M\n');
      ok(/No encontré la columna/.test(await res(p)), 'despega: sin columnas obligatorias → aviso claro');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'despega: cabe a ' + (process.env.ANCHO || 360) + ' px');
      await p.locator('#impCard').screenshot({ path: __dirname + '/capturas/g118-despega.png' }).catch(() => {});
    } catch (e) { ok(false, 'despega: ' + e.message); } finally { await t.cerrar(); }
  }
  if (quiere('barberia')) {
    execSync(__dirname + '/base.sh /home/user/barberia p_g118_bar', { stdio: 'ignore' });
    const t = await abrir('/home/user/barberia', 'p_g118_bar'); const su = t.sim.su;
    try {
      await t.sim.crearUsuario(ADM, 'admin123').catch(() => {});
      await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'barberia', barberia: 'Barbería Juan', nombre: 'Juan', telefono: '+56912345671' });
      await su('update public.profiles set clave_temporal = false, tour_visto = true where true').catch(() => {});
      await su("update public.servicios set descripcion = 'no se pierde' where nombre ilike 'corte%'").catch(() => {});
      const { page: p } = await t.nuevo();
      await entrar(p, t.base, '/', 'dueno@x.cl'); await t.sinModales(p);
      await p.goto(t.base + '/equipo/#servicios'); await p.reload(); await p.waitForTimeout(3500); await t.sinModales(p);
      await abrirPl(p, 'Cargar o actualizar muchos');
      await bajarYSubir(p, 'barberia');
      const prim = (await su("select nombre from public.servicios order by orden limit 1"))[0];
      const cuenta = () => su('select count(*)::int n from public.servicios').then((r) => r[0].n);
      const csv = 'Nombre;Precio;Duración (min)\nPerfilado cejas;3000;15\nTinte;20000;60\nMalo;5000;\n' + (prim ? prim.nombre + ';9990;30\n' : '');
      const [a, b] = await flujo(p, 'barberia', csv, /Se crean 2[\s\S]*se actualizan 1[\s\S]*1 con error/, /2 creados · 1 actualizados/, cuenta);
      ok(b - a === 2, 'barbería: 💾 2 servicios nuevos (' + a + '→' + b + ')');
      const x = (await su('select precio, descripcion from public.servicios where nombre = $1', [prim.nombre]))[0];
      ok(x.precio === 9990, 'barbería: 🔄 "' + prim.nombre + '" actualizado a $9.990 (servidor: guardar_servicio)');
      await subir(p, 'barberia2.csv', 'Nombre;Precio;Duración (min)\nLargo;1000;999\n');
      ok(/1 con error/.test(await res(p)), 'barbería: duración fuera de rango → error antes de subir');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'barbería: cabe a ' + (process.env.ANCHO || 360) + ' px');
    } catch (e) { ok(false, 'barbería: ' + e.message); } finally { await t.cerrar(); }
  }
  if (quiere('bicitaller')) {
    execSync(__dirname + '/base.sh /home/user/taller p_g118_tal', { stdio: 'ignore' });
    const t = await abrir('/home/user/taller', 'p_g118_tal'); const su = t.sim.su;
    try {
      await t.sim.crearUsuario(ADM, 'admin123').catch(() => {});
      await t.sim.crearUsuario('dueno@x.cl', 'clave123', { rol: 'taller', taller_nombre: 'Bici Sur', nombre: 'Ana' });
      await su('update public.perfiles set terminos_at = now()').catch(() => {});
      const { page: p } = await t.nuevo();
      await entrar(p, t.base, '/', 'dueno@x.cl'); await t.sinModales(p);
      await p.goto(t.base + '/taller/#mas'); await p.reload(); await p.waitForTimeout(3000);
      await p.click('text=Servicios >> visible=true'); await p.waitForTimeout(2500);
      await abrirPl(p, 'Cargar o actualizar muchos');
      await bajarYSubir(p, 'bicitaller');
      const cuenta = () => su('select count(*)::int n from public.servicios').then((r) => r[0].n);
      const prim = (await su('select nombre from public.servicios order by orden limit 1'))[0];
      const csv = 'Nombre;Precio;Duración (min);Adicional\nLavado;8000;30;no\nParche;3000;15;sí\nMalo;x;;\n' + (prim ? prim.nombre + ';77777;;\n' : '');
      const [a, b] = await flujo(p, 'bicitaller', csv, /Se crean 2[\s\S]*se actualizan 1[\s\S]*1 con error/, /2 creados · 1 actualizados/, cuenta);
      ok(b - a === 2, 'bicitaller: 💾 2 servicios nuevos (' + a + '→' + b + ')');
      ok(prim && (await su('select precio from public.servicios where nombre = $1', [prim.nombre]))[0].precio === 77777, 'bicitaller: 🔄 precio actualizado');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'bicitaller: cabe a ' + (process.env.ANCHO || 360) + ' px');
    } catch (e) { ok(false, 'bicitaller: ' + e.message); } finally { await t.cerrar(); }
  }
  if (quiere('billetera')) {
    execSync(__dirname + '/base.sh /home/user/emprendedor p_g118_emp', { stdio: 'ignore' });
    const t = await abrir('/home/user/emprendedor', 'p_g118_emp'); const su = t.sim.su;
    try {
      await t.sim.crearUsuario(ADM, 'admin123').catch(() => {});
      const u = await t.sim.crearUsuario('dueno@x.cl', 'clave123'); const c = await t.sim.pool.connect();
      await c.query("select set_config('request.jwt.claim.sub', $1, false)", [u.id]); await c.query('select public.aceptar_terminos()'); await c.query("select public.crear_negocio('Almacén Ana','almacen',true)"); c.release();
      const { page: p } = await t.nuevo();
      await entrar(p, t.base, '/#ingresar', 'dueno@x.cl');
      await p.goto(t.base + '/app/#clientes'); await p.reload(); await p.waitForTimeout(3500); await t.sinModales(p);
      await abrirPl(p, 'Cargar muchos clientes');
      await bajarYSubir(p, 'billetera');
      const cuenta = () => su('select count(*)::int n from public.clientes').then((r) => r[0].n).catch(() => -1);
      const csv = 'Nombre;Teléfono;Debe hoy\nMaría;912345678;15000\nPedro;;0\nMalo;123;\n';
      await subir(p, 'billetera0.csv', csv); await p.click('.cfx-pl [data-pl=ok]'); await p.waitForTimeout(1500);
      ok(/autorizaron/.test(await p.locator('.cfx-pl').innerText()) && await cuenta() === 0, 'billetera: 🔒 sin marcar la autorización no carga nada');
      await p.check('#autPl'); await p.click('.cfx-pl [data-pl=cancelar]').catch(() => {});
      const [a, b] = await flujo(p, 'billetera', csv, /Se crean 2[\s\S]*1 con error/, /2 creados/, cuenta);
      ok(b - a === 2, 'billetera: 💾 2 clientes (' + a + '→' + b + ')');
      await subir(p, 'billetera2.csv', 'Nombre;Debe hoy\nmaría;99999\nAna;0\n');
      ok(/Se crean 1[\s\S]*1 ya están \(no se tocan\)/.test(await res(p)), 'billetera: los que ya están no se tocan (saldo es contabilidad)');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'billetera: cabe a ' + (process.env.ANCHO || 360) + ' px');
      await p.locator('details:has(.cfx-pl)').screenshot({ path: __dirname + '/capturas/g118-billetera.png' }).catch(() => {});
    } catch (e) { ok(false, 'billetera: ' + e.message); } finally { await t.cerrar(); }
  }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ G118 todo bien'); process.exit(f ? 1 : 0);
})();
