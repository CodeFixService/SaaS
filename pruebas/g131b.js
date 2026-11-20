// G131 b · 🧹 Fotos de CUENTAS BORRADAS en Storage (núcleo fotos.sql cfx_fotos_sin_cuenta + reglas de 'vitrina' + limpieza.sql n_fotos_cuentas).
// Solo el admin las ve y las borra (por la API de Storage); una cuenta normal no ve ni borra lo ajeno; lo que algo aún usa se queda.
// FALLA con el código viejo (no existe cfx_fotos_sin_cuenta ni la fila 'n_fotos_cuentas'). Uso: node g131b.js [SaaS Aplicaciones …]
const { execSync } = require('child_process');
const PSQL = 'psql -h /var/tmp/pgb -p 54329 -U postgres -tA -v ON_ERROR_STOP=1 -q -d ';
let fallas = 0;
const ok = (c, m) => { if (!c) { fallas++; console.log('✗ ' + m); } else console.log('✓ ' + m); };
const V = '11111111-1111-4111-8111-111111111111', W = '33333333-3333-4333-8333-333333333333', M = '22222222-2222-4222-8222-222222222222';
const F = (k) => k.repeat(8) + '-aaaa-4aaa-8aaa-' + k.repeat(12) + '.webp';
const ADMIN = `create or replace function public.cfx_es_admin() returns void language plpgsql as $$ begin end $$;
  create or replace function public.super_check() returns void language plpgsql as $$ begin end $$;
  create or replace function public.is_admin() returns boolean language plpgsql as $$ begin return true; end $$;
  create or replace function public.admin_check() returns void language plpgsql as $$ begin end $$;
  do $x$ begin if to_regproc('privado.solo_admin') is not null then execute 'create or replace function privado.solo_admin() returns void language plpgsql as $f$ begin end $f$'; end if; end $x$;`;
const COMO = (sub) => `set local role authenticated; select set_config('request.jwt.claim.sub', '${sub}', true);`;
const pedidas = process.argv.slice(2);
for (const app of ['SaaS', 'Aplicaciones', 'Barberia', 'Emprendedor', 'Taller', 'Estacionamiento']) {
  if (pedidas.length && !pedidas.includes(app)) continue;
  const db = 'g131b_' + app.toLowerCase();
  execSync(__dirname + '/base.sh /home/user/' + app + ' ' + db, { stdio: 'ignore' });
  const q = (s) => { try { return execSync(PSQL + db, { input: s, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim().split('\n').filter((l) => l && !/^(SET|BEGIN|ROLLBACK|CREATE|DO)$/.test(l)).pop() || ''; } catch (e) { return 'ERROR ' + String(e.stderr || e.message).split('\n')[0]; } };
  // V y W viven; M es una cuenta borrada con 3 fotos: b (nadie la usa), c (la usa una tabla), d (otra que nadie usa)
  q(`set session_replication_role = replica; insert into auth.users (id, email) values ('${V}', 'v@x.cl'), ('${W}', 'w@x.cl') on conflict do nothing; set session_replication_role = origin;
     insert into storage.buckets (id, name, public) values ('vitrina', 'vitrina', true) on conflict do nothing;
     insert into storage.objects (bucket_id, name) values ('vitrina', '${V}/${F('a')}'), ('vitrina', '${W}/${F('e')}'),
       ('vitrina', '${M}/${F('b')}'), ('vitrina', '${M}/${F('c')}'), ('vitrina', '${M}/${F('d')}');
     create table public.z_g131b (t text); insert into public.z_g131b values ('https://abc.supabase.co/storage/v1/object/public/vitrina/${M}/${F('c')}');`);
  // ---------- cuenta normal ----------
  ok(q(`begin; ${COMO(V)} select count(*) from storage.objects where name like '${M}/%'; rollback;`) === '0', app + ': 🔒 una cuenta normal no ve la carpeta de una cuenta borrada');
  ok(q(`begin; ${COMO(V)} with x as (delete from storage.objects where name like '${M}/%' returning 1) select count(*) from x; rollback;`) === '0', app + ': 🔒 ni la borra');
  ok(/^ERROR/.test(q(`begin; ${COMO(V)} select public.cfx_fotos_sin_cuenta()::text; rollback;`)), app + ': 🔒 la lista es solo del admin');
  ok(q(`begin; ${COMO(V)} select public.cfx_fotos_libres(array['${F('a')}'])::text; rollback;`) === '{' + F('a') + '}', app + ': su propia foto libre sigue saliendo (G122 b sin cambio)');
  // ---------- admin ----------
  const lista = q(`begin; ${ADMIN} ${COMO(V)} select public.cfx_fotos_sin_cuenta()::text; rollback;`);
  ok(lista === `{${M}/${F('b')},${M}/${F('d')}}`, app + ': 🧹 el admin recibe solo las de la cuenta borrada que nadie usa · ' + lista);
  const fila = q(`begin; ${ADMIN} ${COMO(V)} select x::text from jsonb_array_elements(public.cfx_limpieza()) x where x ->> 'clave' = 'n_fotos_cuentas'; rollback;`);
  ok(/"filas": 3/.test(fila) && /"auto": false/.test(fila), app + ': CM → 🧹 Limpieza muestra "Fotos de cuentas borradas" (3, a mano) · ' + fila.slice(0, 80));
  ok(q(`begin; ${ADMIN} ${COMO(V)} with x as (delete from storage.objects where name = any(array['${M}/${F('b')}', '${M}/${F('d')}']) returning 1) select count(*) from x; commit;`) === '2', app + ': 🧹 el admin las borra por Storage');
  ok(q(`begin; ${ADMIN} ${COMO(V)} with x as (delete from storage.objects where name like '${W}/%' returning 1) select count(*) from x; rollback;`) === '0', app + ': 🛡️ el admin no borra fotos de una cuenta viva');
  ok(q(`select count(*) from storage.objects`) === '3', app + ': 🛡️ quedan la foto en uso de la cuenta borrada y las de las vivas');
  ok(q(`begin; ${ADMIN} ${COMO(V)} select public.cfx_limpiar('n_fotos_cuentas'); rollback;`) === '0', app + ': el botón por SQL no borra nada (va por Storage)');
  ok(q(`select public.cfx_limpieza_auto()`) === '0' && q(`select count(*) from storage.objects`) === '3', app + ': 🌙 la limpieza de la noche no las toca');
}
console.log(fallas ? '❌ ' + fallas + ' fallas' : '✅ G131 b OK');
process.exit(fallas ? 1 : 0);
