// G112 b · 🧩 Packs iguales en las 5 apps con módulos: 🌱 Básico · ⭐ Normal (destacado) · 💎 Completo (todos),
// cada uno más barato que sus módulos sueltos y con más módulos que el anterior. Re-ejecutar la base no los cambia.
// FALLA con el código viejo (Barbería/Billetera/Estaciona tenían 2 packs, BiciTaller 0, Despega decía "🚀 Crecer").
// Uso: node g112.js
const { execSync } = require('child_process');
const PSQL = 'psql -h /var/tmp/pgb -p 54329 -U postgres -tA -v ON_ERROR_STOP=1 -q -d ';
let fallas = 0;
const ok = (c, m) => { if (!c) { fallas++; console.log('FALLA: ' + m); } else console.log('ok', m); };
const Q = "select coalesce(jsonb_agg(jsonb_build_object('k', p.key, 'n', p.value ->> 'nombre', 'd', coalesce((p.value ->> 'destacado')::boolean, false), " +
  "'precio', public.cfx_venta_precio(p.key), 'suelto', (select coalesce(sum(public.cfx_venta_precio(x)), 0) from unnest(public.cfx_venta_modulos(p.key)) x), " +
  "'c', cardinality(public.cfx_venta_modulos(p.key)), 'todos', cardinality(public.cfx_modulos_de_app())) order by public.cfx_venta_precio(p.key)), '[]') " +
  "from jsonb_each(public.cfx_venta() -> 'packs') p";
for (const app of ['Aplicaciones', 'Barberia', 'Emprendedor', 'Taller', 'Estacionamiento']) {
  const db = 'g112_' + app.toLowerCase();
  execSync(__dirname + '/base.sh /home/user/' + app + ' ' + db, { stdio: 'ignore' });
  const leer = () => JSON.parse(execSync(PSQL + db + ' -c "' + Q + '"').toString().trim());
  const P = leer();
  ok(P.map((x) => x.k).join() === 'basico,crecer,completo', app + ': 3 packs en orden ' + P.map((x) => x.k).join());
  ok(/Básico/.test((P[0] || {}).n) && /Normal/.test((P[1] || {}).n) && /Completo/.test((P[2] || {}).n), app + ': nombres ' + P.map((x) => x.n).join(' · '));
  ok(P.length === 3 && P[1].d && !P[0].d && !P[2].d, app + ': ⭐ Normal destacado');
  ok(P.every((x) => x.precio > 0 && x.precio < x.suelto), app + ': cada pack más barato que sueltos ' + P.map((x) => x.precio + '<' + x.suelto).join(' '));
  ok(P.length === 3 && P[0].c >= 2 && P[0].c < P[1].c && P[1].c < P[2].c && P[2].c === P[2].todos, app + ': módulos ' + P.map((x) => x.c).join(' < '));
  execSync(PSQL + db + ' -f /tmp/instalar_' + db + '.sql > /dev/null 2>&1 || true');
  ok(JSON.stringify(leer()) === JSON.stringify(P), app + ': re-ejecutar la base no cambia los packs');
}
console.log(fallas ? 'FALLAS: ' + fallas : 'TODO OK');
process.exit(fallas ? 1 : 0);
