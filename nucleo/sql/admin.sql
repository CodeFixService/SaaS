-- ---------------------------------------------------------------------
-- CodeFix · Administración común (igual en las 6 apps; se maneja desde el Centro de Mando → Control).
--   Planes (interruptores sí/no y límites), textos, aviso a todos, keys de Premium, cupones de descuento,
--   verificación de identidad y registro de lo que hace el administrador.
--   Cada app define antes: cfx_planes_app(), cfx_plan_guardar_app(text, text, jsonb, jsonb), cfx_textos_app(),
--   cfx_texto_guardar_app(text, text), cfx_destinatarios(text) y cfx_marcar_verificado(uuid, boolean).
-- ---------------------------------------------------------------------
create table if not exists public.cfx_registro (
  id bigserial primary key, quien text not null default '', accion text not null, detalle text not null default '', creado timestamptz not null default now());
create table if not exists public.cfx_keys (
  id uuid primary key default gen_random_uuid(), hash text not null unique, ultimos text not null, rol text not null check (rol in ('negocio', 'cliente')),
  dias int not null check (dias between 1 and 3660), nota text not null default '', creado timestamptz not null default now(),
  usada_por uuid, usada_email text, usada_at timestamptz, revocada boolean not null default false);
create table if not exists public.cfx_cupones (
  codigo text primary key check (codigo ~ '^[A-Z0-9-]{3,20}$'), pct int not null check (pct between 1 and 100), usos_max int, usos int not null default 0,
  vence date, activo boolean not null default true, creado timestamptz not null default now());
create table if not exists public.cfx_verificaciones (
  cuenta uuid primary key, email text not null default '', nombre text not null default '', rut text not null, documento text not null default '',
  frente text, reverso text, selfie text, estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  motivo text not null default '', creado timestamptz not null default now(), resuelto timestamptz);
alter table public.cfx_registro enable row level security;
alter table public.cfx_keys enable row level security;
alter table public.cfx_cupones enable row level security;
alter table public.cfx_verificaciones enable row level security;
revoke all on public.cfx_registro, public.cfx_keys, public.cfx_cupones, public.cfx_verificaciones from anon, authenticated;

create or replace function public.cfx_anotar(p_accion text, p_detalle text) returns void
language sql security definer set search_path = '' as $$
  insert into public.cfx_registro (quien, accion, detalle) values (coalesce((select email from auth.users where id = auth.uid()), 'sistema'), left(p_accion, 60), left(coalesce(p_detalle, ''), 400))
$$;
create or replace function public.cfx_registro_lista(p_limite int default 200) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return (select coalesce(jsonb_agg(x order by x.id desc), '[]') from (select * from public.cfx_registro order by id desc limit greatest(1, least(coalesce(p_limite, 200), 2000))) x);
end $$;

-- ---------- Planes: [{grupo, clave, free, premium}] (números o sí/no) ----------
-- Borrar el registro de cambios (el común y el propio de la app, si tiene): lo de más de N días, o todo con 0. Solo el administrador.
create or replace function public.cfx_registro_borrar(p_dias int default 30) returns int
language plpgsql security definer set search_path = '' as $$
declare n int := 0; k int; col text; desde timestamptz := case when coalesce(p_dias, 0) <= 0 then 'infinity'::timestamptz else now() - make_interval(days => p_dias) end;
begin
  perform <CHK>;
  delete from public.cfx_registro where creado < desde; get diagnostics n = row_count;
  if to_regclass('public.auditoria') is not null then
    select c.column_name into col from information_schema.columns c where c.table_schema = 'public' and c.table_name = 'auditoria'
      and c.column_name in ('created_at', 'at', 'creado', 'fecha') and c.data_type like 'timestamp%' order by c.ordinal_position limit 1;
    if col is not null then execute format('delete from public.auditoria where %I < $1', col) using desde; get diagnostics k = row_count; n := n + k; end if;
  end if;
  insert into public.cfx_registro (quien, accion, detalle) values (coalesce((select email from auth.users where id = auth.uid()), 'sistema'), 'registro borrado',
    case when coalesce(p_dias, 0) <= 0 then 'todo' else 'más de ' || p_dias || ' días' end || ' (' || n || ' filas)');
  return n;
end $$;
revoke all on function public.cfx_registro_borrar(int) from public, anon;
grant execute on function public.cfx_registro_borrar(int) to authenticated;

create or replace function public.cfx_planes() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return public.cfx_planes_app();
end $$;
create or replace function public.cfx_plan_guardar(p_grupo text, p_clave text, p_free jsonb, p_premium jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  if jsonb_typeof(p_free) not in ('number', 'boolean') or jsonb_typeof(p_premium) not in ('number', 'boolean') then raise exception 'Valor no válido'; end if;
  perform public.cfx_plan_guardar_app(p_grupo, p_clave, p_free, p_premium);
  perform public.cfx_anotar('plan', p_grupo || '.' || p_clave || ': gratis ' || p_free::text || ' · premium ' || p_premium::text);
end $$;

-- ---------- Textos: [{clave, valor}] ----------
create or replace function public.cfx_textos() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return public.cfx_textos_app();
end $$;
create or replace function public.cfx_texto_guardar(p_clave text, p_valor text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  perform public.cfx_texto_guardar_app(p_clave, left(coalesce(p_valor, ''), 2000));
  perform public.cfx_anotar('texto', p_clave);
end $$;

-- ---------- Aviso a todos: destino todos | negocios | clientes | premium | gratis ----------
create or replace function public.cfx_aviso_masivo(p_destino text, p_titulo text, p_cuerpo text) returns int
language plpgsql security definer set search_path = '' as $$
declare u uuid; n int := 0;
begin
  perform <CHK>;
  if trim(coalesce(p_titulo, '')) = '' then raise exception 'Escribe el título'; end if;
  if p_destino not in ('todos', 'negocios', 'clientes', 'premium', 'gratis') then raise exception 'Destino no válido'; end if;
  for u in select * from public.cfx_destinatarios(p_destino) loop
    perform public.cfx_avisar(u, left(p_titulo, 80), left(coalesce(p_cuerpo, ''), 240));
    n := n + 1;
  end loop;
  perform public.cfx_anotar('aviso', p_destino || ' (' || n || '): ' || p_titulo);
  return n;
end $$;

-- ---------- Nueva versión disponible: push a todos al liberar (una sola vez por versión) ----------
-- La llama el Centro de Mando después de liberar (Apps → Liberar) con las notas que se escriben ahí.
create table if not exists public.cfx_versiones (version text primary key, notas text not null default '', avisados int not null default 0, creado timestamptz not null default now());
alter table public.cfx_versiones enable row level security;
create or replace function public.cfx_avisar_version(p_version text, p_notas text default '', p_app text default '') returns int
language plpgsql security definer set search_path = '' as $$
declare u uuid; n int := 0; v text := trim(coalesce(p_version, '')); nt text := left(trim(coalesce(p_notas, '')), 140);
begin
  perform <CHK>;
  if v !~ '^[0-9]+(\.[0-9]+){0,3}$' then raise exception 'Versión no válida'; end if;
  if exists (select 1 from public.cfx_versiones where version = v) then return 0; end if;
  for u in select * from public.cfx_destinatarios('todos') loop
    perform public.cfx_avisar(u, '🚀 Nueva versión disponible', left(coalesce(nullif(trim(p_app), '') || ' ', '') || 'v' || v || case when nt <> '' then ' · ' || nt else '' end || '. Se actualiza sola al abrirla.', 240));
    n := n + 1;
  end loop;
  insert into public.cfx_versiones (version, notas, avisados) values (v, nt, n);
  perform public.cfx_anotar('version', 'v' || v || ' avisada a ' || n);
  return n;
end $$;
revoke execute on function public.cfx_avisar_version(text, text, text) from public, anon;
grant execute on function public.cfx_avisar_version(text, text, text) to authenticated;

-- ---------- Keys de Premium (de un solo uso). Se guardan cifradas: el código completo solo se ve al crearlas. ----------
create or replace function public.cfx_keys_crear(p_n int, p_rol text, p_dias int, p_nota text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c text; out jsonb := '[]'::jsonb;
begin
  perform <CHK>;
  if p_rol not in ('negocio', 'cliente') or coalesce(p_dias, 0) not between 1 and 3660 or coalesce(p_n, 0) not between 1 and 50 then raise exception 'Datos no válidos'; end if;
  for i in 1..p_n loop
    c := upper(replace(gen_random_uuid()::text, '-', ''));
    c := 'CFX-' || substr(c, 1, 4) || '-' || substr(c, 5, 4) || '-' || substr(c, 9, 4);
    insert into public.cfx_keys (hash, ultimos, rol, dias, nota) values (encode(sha256(convert_to(c, 'UTF8')), 'hex'), right(c, 4), p_rol, p_dias, left(coalesce(p_nota, ''), 120));
    out := out || to_jsonb(c);
  end loop;
  perform public.cfx_anotar('keys', p_n || ' keys ' || p_rol || ' de ' || p_dias || ' días');
  return out;
end $$;
create or replace function public.cfx_keys_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return (select coalesce(jsonb_agg(to_jsonb(k) - 'hash' order by k.creado desc), '[]') from (select * from public.cfx_keys order by creado desc limit 300) k);
end $$;
create or replace function public.cfx_key_revocar(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  update public.cfx_keys set revocada = true where id = p_id and usada_por is null;
  perform public.cfx_anotar('key revocada', p_id::text);
end $$;
create or replace function public.cfx_key_canjear(p_codigo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); k public.cfx_keys; h timestamptz; c text := upper(trim(coalesce(p_codigo, '')));
begin
  if y is null or (y ->> 'id') is null then raise exception 'Inicia sesión'; end if;
  if (select count(*) from public.cfx_registro where accion = 'key fallida' and detalle = (y ->> 'id') and creado > now() - interval '1 hour') >= 10 then
    raise exception 'Demasiados intentos. Prueba en una hora.';
  end if;
  select * into k from public.cfx_keys where hash = encode(sha256(convert_to(c, 'UTF8')), 'hex') for update;
  if k.id is null or k.revocada or k.usada_por is not null then
    insert into public.cfx_registro (quien, accion, detalle) values (coalesce(y ->> 'email', ''), 'key fallida', y ->> 'id');
    raise exception 'Key no válida o ya usada';
  end if;
  if k.rol <> coalesce(y ->> 'rol', '') then raise exception 'Esta key es para cuentas de %', case when k.rol = 'negocio' then 'negocio' else 'cliente' end; end if;
  h := public.cfx_dar_premium((y ->> 'id')::uuid, k.rol, k.dias);
  update public.cfx_keys set usada_por = (y ->> 'id')::uuid, usada_email = y ->> 'email', usada_at = now() where id = k.id;
  insert into public.cfx_exentos (cuenta, nota) values ((y ->> 'id')::uuid, 'Key ' || k.ultimos) on conflict (cuenta) do nothing;
  perform public.cfx_avisar_admin('🔑 Key canjeada', coalesce(y ->> 'email', '') || ' · ' || k.dias || ' días');
  return jsonb_build_object('hasta', h, 'dias', k.dias);
end $$;

-- ---------- Cupones de descuento (se aplican al pagar Premium) ----------
create or replace function public.cfx_cupon_ver(p_codigo text) returns int
language plpgsql stable security definer set search_path = '' as $$
declare c public.cfx_cupones;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  select * into c from public.cfx_cupones where codigo = upper(trim(coalesce(p_codigo, '')));
  if c.codigo is null or not c.activo or (c.vence is not null and c.vence < current_date) or (c.usos_max is not null and c.usos >= c.usos_max) then
    raise exception 'Cupón no válido o vencido';
  end if;
  return c.pct;
end $$;
create or replace function public.cfx_cupones_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return (select coalesce(jsonb_agg(to_jsonb(c) order by c.creado desc), '[]') from public.cfx_cupones c);
end $$;
create or replace function public.cfx_cupon_guardar(p_codigo text, p_pct int, p_usos_max int default null, p_vence date default null, p_activo boolean default true) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  insert into public.cfx_cupones (codigo, pct, usos_max, vence, activo) values (upper(trim(p_codigo)), p_pct, p_usos_max, p_vence, coalesce(p_activo, true))
  on conflict (codigo) do update set pct = excluded.pct, usos_max = excluded.usos_max, vence = excluded.vence, activo = excluded.activo;
  perform public.cfx_anotar('cupón', upper(trim(p_codigo)) || ' ' || p_pct || '%');
end $$;
create or replace function public.cfx_cupon_borrar(p_codigo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  delete from public.cfx_cupones where codigo = upper(trim(p_codigo));
end $$;

-- ---------- Verificación de identidad (RUT, N° de documento, fotos de la cédula y selfie). Las fotos se borran al revisar. ----------
create or replace function public.cfx_rut_ok(r text) returns boolean
language plpgsql immutable as $$
declare s text := upper(regexp_replace(coalesce(r, ''), '[^0-9kK]', '', 'g')); cuerpo text; dv text; suma int := 0; m int := 2; res text;
begin
  if length(s) < 2 then return false; end if;
  cuerpo := left(s, length(s) - 1); dv := right(s, 1);
  if cuerpo !~ '^[0-9]+$' then return false; end if;
  for i in reverse length(cuerpo)..1 loop
    suma := suma + substr(cuerpo, i, 1)::int * m; m := case when m = 7 then 2 else m + 1 end;
  end loop;
  res := case 11 - suma % 11 when 11 then '0' when 10 then 'K' else (11 - suma % 11)::text end;
  return res = dv;
end $$;
create or replace function public.cfx_verif_estado() returns jsonb
language sql stable security definer set search_path = '' as $$
  select (select jsonb_build_object('estado', estado, 'motivo', motivo, 'creado', creado, 'resuelto', resuelto) from public.cfx_verificaciones where cuenta = auth.uid())
$$;
create or replace function public.cfx_verif_enviar(p_rut text, p_documento text, p_frente text, p_reverso text, p_selfie text) returns void
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); r text := upper(regexp_replace(coalesce(p_rut, ''), '[^0-9kK]', '', 'g'));
begin
  if y is null or (y ->> 'id') is null then raise exception 'Inicia sesión'; end if;
  if not public.cfx_rut_ok(r) then raise exception 'RUT no válido'; end if;
  if exists (select 1 from public.cfx_verificaciones where rut = r and cuenta <> (y ->> 'id')::uuid and estado <> 'rechazada') then raise exception 'Ese RUT ya está en otra cuenta'; end if;
  if exists (select 1 from public.cfx_verificaciones where cuenta = (y ->> 'id')::uuid and estado = 'aprobada') then raise exception 'Tu identidad ya está verificada'; end if;
  if coalesce(length(p_frente), 0) < 200 or coalesce(length(p_reverso), 0) < 200 or coalesce(length(p_selfie), 0) < 200 then raise exception 'Faltan fotos'; end if;
  if length(p_frente) > 500000 or length(p_reverso) > 500000 or length(p_selfie) > 500000 then raise exception 'Fotos muy pesadas'; end if;
  insert into public.cfx_verificaciones (cuenta, email, nombre, rut, documento, frente, reverso, selfie, estado, motivo, creado, resuelto)
  values ((y ->> 'id')::uuid, coalesce(y ->> 'email', ''), left(coalesce(y ->> 'nombre', ''), 80), r, left(coalesce(p_documento, ''), 20), p_frente, p_reverso, p_selfie, 'pendiente', '', now(), null)
  on conflict (cuenta) do update set rut = excluded.rut, documento = excluded.documento, frente = excluded.frente, reverso = excluded.reverso, selfie = excluded.selfie,
    estado = 'pendiente', motivo = '', creado = now(), resuelto = null;
  perform public.cfx_avisar_admin('🪪 Verificación por revisar', coalesce(nullif(y ->> 'nombre', ''), y ->> 'email'));
end $$;
create or replace function public.cfx_verif_lista(p_estado text default 'pendiente') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return (select coalesce(jsonb_agg(x order by x.creado desc), '[]') from (select cuenta, email, nombre, rut, documento, estado, motivo, creado, resuelto
    from public.cfx_verificaciones where p_estado = 'todos' or estado = p_estado order by creado desc limit 200) x);
end $$;
create or replace function public.cfx_verif_fotos(p_cuenta uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return (select jsonb_build_object('frente', frente, 'reverso', reverso, 'selfie', selfie) from public.cfx_verificaciones where cuenta = p_cuenta);
end $$;
create or replace function public.cfx_verif_resolver(p_cuenta uuid, p_aprobar boolean, p_motivo text default '') returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  update public.cfx_verificaciones set estado = case when p_aprobar then 'aprobada' else 'rechazada' end, motivo = left(coalesce(p_motivo, ''), 200),
    resuelto = now(), frente = null, reverso = null, selfie = null where cuenta = p_cuenta and estado = 'pendiente';
  if not found then raise exception 'No hay una verificación pendiente'; end if;
  perform public.cfx_marcar_verificado(p_cuenta, p_aprobar);
  perform public.cfx_avisar(p_cuenta, case when p_aprobar then '🪪 Identidad verificada' else '🪪 Verificación rechazada' end,
    case when p_aprobar then 'Ya apareces como persona verificada.' else coalesce(nullif(p_motivo, ''), 'Revisa las fotos') || '. Puedes enviarla de nuevo.' end);
  perform public.cfx_anotar(case when p_aprobar then 'verificación aprobada' else 'verificación rechazada' end, p_cuenta::text);
end $$;

create or replace function public.cfx_cupon_usado() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.estado = 'aprobado' and old.estado = 'pendiente' and new.cupon is not null then update public.cfx_cupones set usos = usos + 1 where codigo = new.cupon; end if;
  return new;
end $$;
drop trigger if exists cfx_cupon_usado on public.cfx_pagos;
create trigger cfx_cupon_usado after update of estado on public.cfx_pagos for each row execute function public.cfx_cupon_usado();

-- ---------- Verificación humana (Cloudflare Turnstile): la site key es pública; la secret key va en Supabase → Authentication → CAPTCHA ----------
insert into public.cfx_config (clave, valor) values ('humano', '{"site_key": ""}') on conflict (clave) do nothing;
create or replace function public.cfx_humano() returns jsonb
language sql stable security definer set search_path = '' as $$ select valor from public.cfx_config where clave = 'humano' $$;
create or replace function public.cfx_humano_guardar(p_site_key text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  if coalesce(p_site_key, '') <> '' and p_site_key !~ '^[0-9A-Za-z_-]{10,60}$' then raise exception 'Site key no válida'; end if;
  update public.cfx_config set valor = jsonb_build_object('site_key', coalesce(p_site_key, '')) where clave = 'humano';
  perform public.cfx_anotar('humano', case when coalesce(p_site_key, '') = '' then 'apagado' else 'site key ' || right(p_site_key, 4) end);
end $$;
revoke all on function public.cfx_humano(), public.cfx_humano_guardar(text) from public;
grant execute on function public.cfx_humano() to anon, authenticated;
grant execute on function public.cfx_humano_guardar(text) to authenticated;

revoke all on function public.cfx_anotar(text, text), public.cfx_cupon_usado() from public, anon, authenticated;
revoke all on function public.cfx_registro_lista(int), public.cfx_planes(), public.cfx_plan_guardar(text, text, jsonb, jsonb), public.cfx_textos(), public.cfx_texto_guardar(text, text),
  public.cfx_aviso_masivo(text, text, text), public.cfx_keys_crear(int, text, int, text), public.cfx_keys_lista(), public.cfx_key_revocar(uuid), public.cfx_key_canjear(text),
  public.cfx_cupon_ver(text), public.cfx_cupones_lista(), public.cfx_cupon_guardar(text, int, int, date, boolean), public.cfx_cupon_borrar(text),
  public.cfx_verif_estado(), public.cfx_verif_enviar(text, text, text, text, text), public.cfx_verif_lista(text), public.cfx_verif_fotos(uuid), public.cfx_verif_resolver(uuid, boolean, text) from public, anon;
grant execute on function public.cfx_registro_lista(int), public.cfx_planes(), public.cfx_plan_guardar(text, text, jsonb, jsonb), public.cfx_textos(), public.cfx_texto_guardar(text, text),
  public.cfx_aviso_masivo(text, text, text), public.cfx_keys_crear(int, text, int, text), public.cfx_keys_lista(), public.cfx_key_revocar(uuid), public.cfx_key_canjear(text),
  public.cfx_cupon_ver(text), public.cfx_cupones_lista(), public.cfx_cupon_guardar(text, int, int, date, boolean), public.cfx_cupon_borrar(text),
  public.cfx_verif_estado(), public.cfx_verif_enviar(text, text, text, text, text), public.cfx_verif_lista(text), public.cfx_verif_fotos(uuid), public.cfx_verif_resolver(uuid, boolean, text) to authenticated;
revoke all on function public.cfx_planes_app(), public.cfx_plan_guardar_app(text, text, jsonb, jsonb), public.cfx_textos_app(), public.cfx_texto_guardar_app(text, text),
  public.cfx_destinatarios(text), public.cfx_marcar_verificado(uuid, boolean) from public, anon, authenticated;

-- ---------- Series para el Resumen del Centro de Mando: por mes, cuentas nuevas y pagos/ingresos aprobados (últimos N meses) ----------
create or replace function public.cfx_series(p_meses int default 6) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n int := greatest(1, least(coalesce(p_meses, 6), 24));
begin
  perform <CHK>;
  return (select jsonb_agg(jsonb_build_object('mes', to_char(m, 'YYYY-MM'),
      'cuentas', (select count(*) from auth.users u where u.created_at >= m and u.created_at < m + interval '1 month'),
      'pagos', (select count(*) from public.cfx_pagos p where p.estado = 'aprobado' and p.creado >= m and p.creado < m + interval '1 month'),
      'ingresos', (select coalesce(sum(p.monto), 0) from public.cfx_pagos p where p.estado = 'aprobado' and p.creado >= m and p.creado < m + interval '1 month')) order by m)
    from generate_series(date_trunc('month', now()) - make_interval(months => n - 1), date_trunc('month', now()), interval '1 month') m);
end $$;

-- ---------- Servidor (igual en las 7 apps): uso de la base, cuentas, tablas más pesadas y tareas automáticas ----------
-- El Centro de Mando lo muestra en el carrusel de servidores. "tareas" sirve para ver si el envío de push está corriendo.
create or replace function public.cfx_servidor() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare t jsonb := '[]'; tb jsonb;
begin
  perform <CHK>;
  select coalesce(jsonb_agg(x), '[]') into tb from (
    select jsonb_build_object('tabla', c.relname, 'bytes', pg_total_relation_size(c.oid), 'filas', greatest(c.reltuples, 0)::bigint) x
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' order by pg_total_relation_size(c.oid) desc limit 6) q;
  begin
    execute $q$ select coalesce(jsonb_agg(jsonb_build_object('nombre', j.jobname, 'activa', j.active, 'cada', j.schedule,
        'ultima', r.end_time, 'ok', r.status = 'succeeded', 'error', left(r.return_message, 160)) order by j.jobname), '[]')
      from cron.job j left join lateral (select end_time, status, return_message from cron.job_run_details d where d.jobid = j.jobid order by d.runid desc limit 1) r on true $q$ into t;
  exception when others then t := '[]';
  end;
  return jsonb_build_object('db_bytes', pg_database_size(current_database()), 'limite_bytes', 500 * 1024 * 1024,
    'cuentas', (select count(*) from auth.users), 'tablas', tb, 'tareas', t, 'hora', now());
end $$;
