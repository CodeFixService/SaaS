// G112 c1 · 🔒 Llaves de pago y secretos en Supabase Vault (cifrados dentro de la base), en las 6 apps.
// Sin Vault (base vieja / local): todo sigue como antes. Con Vault: la tabla guarda solo 'vault:<nombre>', las funciones abren la llave,
// al desconectar se borra de Vault, re-ejecutar la base no rompe nada y las llaves que ya estaban se pasan solas.
// FALLA con el código viejo (no existe cfx_secreto ni el trigger: la llave queda a la vista en la tabla).
// Uso: node g112c1.js
const { execSync } = require('child_process');
const PSQL = 'psql -h /var/tmp/pgb -p 54329 -U postgres -tA -v ON_ERROR_STOP=1 -q -d ';
let fallas = 0;
const ok = (c, m) => { if (!c) { fallas++; console.log('FALLA: ' + m); } else console.log('ok', m); };
// Vault falso (igual que Supabase: vault.secrets, vault.decrypted_secrets, create_secret, update_secret); "cifra" invirtiendo el texto.
const VAULT = `create extension if not exists pgcrypto; create schema if not exists vault;
create table if not exists vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, description text not null default '', secret text not null,
  key_id uuid, nonce bytea, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create or replace view vault.decrypted_secrets as select *, reverse(secret) as decrypted_secret from vault.secrets;
create or replace function vault.create_secret(new_secret text, new_name text default null, new_description text default '', new_key_id uuid default null) returns uuid
language sql as $$ insert into vault.secrets (name, description, secret) values (new_name, new_description, reverse(new_secret)) returning id $$;
create or replace function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null, new_key_id uuid default null) returns void
language sql as $$ update vault.secrets set secret = coalesce(reverse(new_secret), secret), updated_at = now() where id = secret_id $$;`;
const TK = 'APP_USR-1234567890123456-abcdefabcdef-9999';
const NEG = '11111111-1111-1111-1111-111111111111';
for (const app of ['SaaS', 'Aplicaciones', 'Barberia', 'Emprendedor', 'Taller', 'Estacionamiento']) {
  const db = 'g112c1_' + app.toLowerCase();
  execSync(__dirname + '/base.sh /home/user/' + app + ' ' + db, { stdio: 'ignore' });
  const q = (s) => { try { return execSync(PSQL + db, { input: s, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { return 'ERROR'; } };
  const reinstalar = () => { try { execSync(PSQL + db + ' -f /tmp/instalar_' + db + '.sql', { stdio: 'pipe' }); return true; } catch (e) { console.log(String(e.stderr).slice(0, 400)); return false; } };
  // 1) Sin Vault: igual que antes (el stub local trae un Vault: se quita para esta parte).
  q('drop schema if exists vault cascade');
  q(`insert into public.cfx_config (clave, valor) values ('mp', '{"token": "${TK}", "activo": true}') on conflict (clave) do update set valor = excluded.valor;
     insert into public.cfx_secretos (clave, valor) values ('turnstile', '0x4AAAAAAAsecreto') on conflict (clave) do update set valor = excluded.valor;`);
  ok(q("select valor ->> 'token' from public.cfx_config where clave = 'mp'") === TK, app + ': sin Vault la llave queda como antes');
  ok(q("select public.cfx_secreto(valor ->> 'token') from public.cfx_config where clave = 'mp'") === TK, app + ': sin Vault cfx_secreto la entrega igual');
  // 2) Llega Vault y se vuelve a correr la base: las llaves que estaban pasan a Vault.
  q(VAULT);
  ok(reinstalar(), app + ': re-ejecutar la base con Vault sin errores');
  ok(q("select valor ->> 'token' from public.cfx_config where clave = 'mp'") === 'vault:cfx_cfg_mp_token', app + ': token MP de CodeFix pasó a Vault (tabla con la marca)');
  ok(q("select public.cfx_secreto(valor ->> 'token') from public.cfx_config where clave = 'mp'") === TK, app + ': cfx_secreto abre el token');
  ok(q("select public.cfx_llaves(valor) ->> 'token' from public.cfx_config where clave = 'mp'") === TK && q("select public.cfx_llaves(valor) ->> 'activo' from public.cfx_config where clave = 'mp'") === 'true', app + ': cfx_llaves abre la config');
  ok(q("select valor from public.cfx_secretos where clave = 'turnstile'") === 'vault:cfx_sec_turnstile_', app + ': secret de Turnstile pasó a Vault');
  ok(q("select count(*) from vault.secrets where secret like '%" + TK + "%' or secret like '%0x4AAAAAAAsecreto%'") === '0', app + ': en Vault va cifrado (no en texto)');
  // 3) Guardar nuevas (como lo hacen las funciones de conectar) y de cada negocio.
  q(`update public.cfx_config set valor = valor || '{"activo": false}' where clave = 'mp';
     insert into public.cfx_config (clave, valor) values ('flow', '{"apikey": "AAAABBBBCCCCDDDDEEEE1234", "secret": "ssssssssssssssssssss5678", "activo": true}') on conflict (clave) do update set valor = excluded.valor;
     insert into public.cfx_mp_negocio (negocio, token) values ('${NEG}', 'APP_USR-negocio-0000000000000000000042') on conflict (negocio) do update set token = excluded.token;
     insert into public.cfx_flow_negocio (negocio, apikey, secret) values ('${NEG}', 'NEGAPIKEY00000000000000077', 'NEGSECRET000000000000000088') on conflict (negocio) do update set apikey = excluded.apikey, secret = excluded.secret;`);
  ok(q("select valor ->> 'token' || '|' || (valor ->> 'activo') from public.cfx_config where clave = 'mp'") === 'vault:cfx_cfg_mp_token|false', app + ': pausar no toca la marca');
  ok(q("select valor ->> 'apikey' || '|' || (valor ->> 'secret') from public.cfx_config where clave = 'flow'") === 'vault:cfx_cfg_flow_apikey|vault:cfx_cfg_flow_secret', app + ': llaves de Flow en Vault');
  ok(q("select public.cfx_llaves(valor) ->> 'secret' from public.cfx_config where clave = 'flow'") === 'ssssssssssssssssssss5678', app + ': Flow se abre para firmar');
  ok(q("select token from public.cfx_mp_negocio where negocio = '" + NEG + "'") === 'vault:cfx_mpneg_' + NEG, app + ': token MP del negocio en Vault');
  ok(q("select public.cfx_flow_neg_cfg('" + NEG + "') ->> 'apikey' || '|' || (public.cfx_flow_neg_cfg('" + NEG + "') ->> 'secret')") === 'NEGAPIKEY00000000000000077|NEGSECRET000000000000000088', app + ': Flow del negocio se abre para cobrar');
  const tablas = q("select concat_ws('|', (select string_agg(valor::text, '') from public.cfx_config), (select string_agg(token, '') from public.cfx_mp_negocio), (select string_agg(apikey || secret, '') from public.cfx_flow_negocio), (select string_agg(valor, '') from public.cfx_secretos))");
  ok(!/APP_USR|AAAABBBB|ssss|NEGAPIKEY|NEGSECRET|0x4AAA/.test(tablas), app + ': ninguna llave queda a la vista en las tablas');
  ok(q("select has_function_privilege('authenticated', 'public.cfx_secreto(text)', 'execute') or has_function_privilege('anon', 'public.cfx_secreto(text)', 'execute') or has_function_privilege('authenticated', 'public.cfx_secreto_srv(text)', 'execute')") === 'f', app + ': nadie de la app puede abrir llaves');
  // 4) Re-ejecutar 2 veces no envuelve 2 veces ni pierde nada.
  ok(reinstalar() && reinstalar(), app + ': re-ejecutar 2 veces sin errores');
  ok(q("select public.cfx_secreto(valor ->> 'token') from public.cfx_config where clave = 'mp'") === TK && q("select count(*) from vault.secrets") === '7', app + ': sigue igual (7 llaves en Vault)');
  // 5) Desconectar borra también de Vault.
  q(`delete from public.cfx_config where clave = 'flow'; delete from public.cfx_mp_negocio; delete from public.cfx_flow_negocio; delete from public.cfx_secretos where clave = 'turnstile';`);
  ok(q("select string_agg(name, ',') from vault.secrets") === 'cfx_cfg_mp_token', app + ': al desconectar se borran de Vault (queda solo el de MP)');
}
console.log(fallas ? 'FALLAS: ' + fallas : 'TODO OK');
process.exit(fallas ? 1 : 0);
