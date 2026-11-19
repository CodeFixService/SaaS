// G112 c2 · 🔄 Aviso de rotación: cada llave de pago guarda desde cuándo está (CodeFix: valor 'desde'; negocio: llave_desde) y
// las funciones de estado avisan "rotar" con más de 1 año. Pausar/prender o re-ejecutar la base NO cambia la fecha; pegar una nueva sí.
// FALLA con el código viejo (no hay 'desde' ni 'rotar'). Uso: node g112c2.js
const { execSync } = require('child_process');
const PSQL = 'psql -h /var/tmp/pgb -p 54329 -U postgres -tA -v ON_ERROR_STOP=1 -q -d ';
let fallas = 0;
const ok = (c, m) => { if (!c) { fallas++; console.log('FALLA: ' + m); } else console.log('ok', m); };
const NEG = '22222222-2222-2222-2222-222222222222';
// Para leer el estado sin sesión: dentro de una transacción que se deshace, el chequeo de admin/dueño se reemplaza.
const COMO = `create or replace function public.cfx_es_admin() returns void language plpgsql as $$ begin end $$;
  create or replace function public.super_check() returns void language plpgsql as $$ begin end $$;
  create or replace function public.admin_check() returns void language plpgsql as $$ begin end $$;
  do $x$ begin if to_regproc('privado.solo_admin') is not null then execute 'create or replace function privado.solo_admin() returns void language plpgsql as $f$ begin end $f$'; end if; end $x$;
  create or replace function public.cfx_mp_neg_mio() returns uuid language sql as $$ select '${NEG}'::uuid $$;`;
for (const app of ['SaaS', 'Aplicaciones', 'Barberia', 'Emprendedor', 'Taller', 'Estacionamiento']) {
  const db = 'g112c2_' + app.toLowerCase();
  execSync(__dirname + '/base.sh /home/user/' + app + ' ' + db, { stdio: 'ignore' });
  const q = (s) => { try { return execSync(PSQL + db, { input: s, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { return 'ERROR'; } };
  const estado = (f) => { const r = q('begin; ' + COMO + ' select public.' + f + '()::text; rollback;'); try { return JSON.parse(r.split('\n').filter((l) => l.startsWith('{')).pop()); } catch (e) { return {}; } };
  q(`insert into public.cfx_config (clave, valor) values ('mp', '{"token": "APP_USR-1111111111111111-aaaaaaaaaaaa-1", "activo": true}') on conflict (clave) do update set valor = excluded.valor;
     insert into public.cfx_mp_negocio (negocio, token) values ('${NEG}', 'APP_USR-negocio-1111111111111111111') on conflict (negocio) do update set token = excluded.token;
     insert into public.cfx_flow_negocio (negocio, apikey, secret) values ('${NEG}', 'NEGAPIKEY1111111111111111', 'NEGSECRET11111111111111111') on conflict (negocio) do update set apikey = excluded.apikey;`);
  let e = estado('cfx_mp_estado');
  ok(e.conectado && e.desde && e.rotar === false, app + ': MP de CodeFix trae la fecha y no pide cambio ' + JSON.stringify(e));
  // Llave de hace 400 días → avisa. Pausar no cambia la fecha.
  q(`update public.cfx_config set valor = valor || '{"desde": "2025-10-01T00:00:00Z"}' where clave = 'mp'; update public.cfx_config set valor = valor || '{"activo": false}' where clave = 'mp';
     update public.cfx_mp_negocio set llave_desde = now() - interval '400 days'; update public.cfx_mp_negocio set activo = false;
     update public.cfx_flow_negocio set llave_desde = now() - interval '400 days'; update public.cfx_flow_negocio set activo = false;`);
  e = estado('cfx_mp_estado');
  ok(e.rotar === true && String(e.desde).startsWith('2025-10-01'), app + ': con más de 1 año avisa 🔄 (pausar no cambió la fecha)');
  ok(estado('cfx_mp_neg_estado').rotar === true && estado('cfx_flow_neg_estado').rotar === true, app + ': el negocio también ve el aviso (MP y Flow)');
  // Re-ejecutar la base no cambia la fecha.
  try { execSync(PSQL + db + ' -f /tmp/instalar_' + db + '.sql', { stdio: 'ignore' }); } catch (x) { ok(false, app + ': re-ejecutar la base'); }
  ok(estado('cfx_mp_estado').rotar === true && estado('cfx_mp_neg_estado').rotar === true, app + ': re-ejecutar la base no cambia la fecha');
  // Pegar una llave nueva → fecha de hoy, sin aviso.
  q(`update public.cfx_config set valor = valor || '{"token": "APP_USR-2222222222222222-bbbbbbbbbbbb-2"}' where clave = 'mp';
     update public.cfx_mp_negocio set token = 'APP_USR-negocio-2222222222222222222'; update public.cfx_flow_negocio set secret = 'NEGSECRET22222222222222222';`);
  ok(estado('cfx_mp_estado').rotar === false && estado('cfx_mp_neg_estado').rotar === false && estado('cfx_flow_neg_estado').rotar === false, app + ': llave nueva → sin aviso');
}
console.log(fallas ? 'FALLAS: ' + fallas : 'TODO OK');
process.exit(fallas ? 1 : 0);
