// G144 a · 🛡️ Sin botón "Panel de administración" en el menú de las 6 apps (núcleo cuentaItems + CM Más) y sin "Limpieza/Respaldo" dentro
// de las apps: SOLO el CM → Apps (🧹 Respaldo y limpieza) y su panel por app. Revisa que el CM sí lo cubra. FALLA con el código viejo.
const fs = require('fs'); const H = '/home/user/';
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const lee = (p) => fs.readFileSync(H + p, 'utf8');
for (const r of ['SaaS/shared', 'Aplicaciones/shared', 'Barberia/shared', 'Emprendedor/js', 'Taller/shared', 'Estacionamiento/js'])
  ok(!/t: 'Panel de administración'/.test(lee(r + '/ayuda.js')), r + '/ayuda.js: sin fila "Panel de administración"');
ok(!/Panel de administración/.test(lee('SaaS/app/m-mas.js')) && /t: 'Panel' \}/.test(lee('SaaS/shared/app.js')), 'CM: sin fila en Más; queda el atajo "Panel" arriba');
const LIMP = { 'Barberia/admin/admin.js': /data-limpiar|admin_limpiar/, 'Taller/admin/admin.js': /rpc\('limpiar'|data-l="/, 'Emprendedor/js/admin.js': /admin_limpiar|cfx_respaldo/, 'Estacionamiento/js/admin.js': /funcion\('limpiar'\)|aLimpiar|mLimpiar/ };
for (const [p, re] of Object.entries(LIMP)) ok(!re.test(lee(p)) && /Centro de Mando → Apps/.test(lee(p)), p + ': sin limpieza propia (aviso: CM → Apps)');
// El CM cubre lo mismo: limpieza de cada app en su panel + Respaldo y limpieza en Apps
const CM = { 'panel-barberia.js': /admin_limpiar/, 'panel-bicitaller.js': /rpc\('limpiar'/, 'panel-billetera.js': /admin_limpiar/, 'panel-estaciona.js': /funcion\('limpiar'\)/, 'panel-despega.js': /admin_limpiar/ };
for (const [p, re] of Object.entries(CM)) ok(re.test(lee('SaaS/admin/' + p)), 'CM ' + p + ': tiene la limpieza de esa app');
ok(/data-a="limp"/.test(lee('SaaS/admin/apps.js')) && /cfx_respaldo/.test(lee('SaaS/admin/apps.js')), 'CM → Apps: 🧹 Respaldo y limpieza (Excel + limpiezas) de las 7');
console.log(f ? '✗ ' + f + ' fallas' : '✓ G144 a OK'); process.exit(f ? 1 : 0);
