-- ---------------------------------------------------------------------
-- CodeFix · Legal (igual en las 7 apps; lo reparte nucleo/sincronizar.py).
--   Términos y Política de privacidad con versión (Ley 19.628 modificada por la Ley 21.719, vigente desde el 1-dic-2026).
--   El texto vive en nucleo/ayuda.js (CFX_LEGAL.version). Aquí solo queda la prueba de quién aceptó qué versión y cuándo.
--   cfx_legal_estado()          → última versión aceptada por la cuenta (0 = ninguna).
--   cfx_legal_aceptar(version)  → guarda la aceptación (una fila por versión, nunca se pisa).
--   cfx_legal_resumen()         → admin: cuántas cuentas aceptaron cada versión.
-- ---------------------------------------------------------------------
create table if not exists public.cfx_legal (
  cuenta    uuid not null,
  version   int  not null check (version between 1 and 10000),
  aceptado  timestamptz not null default now(),
  agente    text not null default '',
  primary key (cuenta, version)
);
alter table public.cfx_legal enable row level security;
revoke all on public.cfx_legal from anon, authenticated;

create or replace function public.cfx_legal_estado() returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(max(version), 0) from public.cfx_legal where cuenta = auth.uid()
$$;

create or replace function public.cfx_legal_aceptar(p_version int) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'Inicia sesión para aceptar.'; end if;
  if p_version is null or p_version < 1 or p_version > 10000 then raise exception 'Versión no válida.'; end if;
  insert into public.cfx_legal (cuenta, version, agente)
  values (u, p_version, left(coalesce(current_setting('request.headers', true)::jsonb ->> 'user-agent', ''), 300))
  on conflict (cuenta, version) do nothing;
end $$;

create or replace function public.cfx_legal_resumen() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform <CHK>;
  return coalesce((select jsonb_agg(jsonb_build_object('version', version, 'cuentas', n, 'ultima', u) order by version desc)
    from (select version, count(*) n, max(aceptado) u from public.cfx_legal group by version) x), '[]'::jsonb);
end $$;

revoke all on function public.cfx_legal_estado(), public.cfx_legal_aceptar(int), public.cfx_legal_resumen() from public, anon;
grant execute on function public.cfx_legal_estado(), public.cfx_legal_aceptar(int), public.cfx_legal_resumen() to authenticated;

-- ---------------------------------------------------------------------
-- A2 · Consentimientos aparte de los términos (se dan y se retiran cuando quieras; queda el historial).
--   'ofertas'  = novedades y ofertas de CodeFix (parte en NO: solo con consentimiento expreso).
--   'negocios' = ofertas de los negocios donde eres cliente (parte en SÍ por la relación de cliente; se puede retirar).
--   cfx_consent_estado() · cfx_consent_guardar(tipo, si) · cfx_acepta(cuenta, tipo) (uso interno) · admin cfx_consent_resumen().
-- A3 · Derechos del titular (acceso, rectificación, supresión, oposición, portabilidad y bloqueo) con plazo de 30 días (+30 una vez).
--   cfx_mis_datos() → copia de todo lo de la cuenta (acceso y portabilidad al instante; queda registrado como solicitud respondida).
--   cfx_derecho_pedir(tipo, detalle) · cfx_derechos_mios() · admin cfx_derechos_lista(todas) y cfx_derecho_responder(id, accion, respuesta).
-- Brechas de seguridad (registro y aviso a la Agencia y a los afectados): admin cfx_brechas_lista(), cfx_brecha_guardar(jsonb),
--   cfx_brecha_marcar(id, 'agencia' | 'cerrar'), cfx_brecha_avisar(id, destino, titulo, cuerpo). Resumen: cfx_privacidad_resumen().
-- ---------------------------------------------------------------------
create table if not exists public.cfx_consent (
  cuenta uuid not null, tipo text not null check (tipo in ('ofertas', 'negocios')), si boolean not null,
  cambiado timestamptz not null default now(), agente text not null default '', primary key (cuenta, tipo));
create table if not exists public.cfx_consent_hist (
  id bigserial primary key, cuenta uuid not null, tipo text not null, si boolean not null, creado timestamptz not null default now(), agente text not null default '');
create table if not exists public.cfx_derechos (
  id bigserial primary key, cuenta uuid not null, email text not null default '',
  tipo text not null check (tipo in ('acceso', 'rectificacion', 'supresion', 'oposicion', 'portabilidad', 'bloqueo')),
  detalle text not null default '', estado text not null default 'pendiente' check (estado in ('pendiente', 'prorrogada', 'respondida', 'rechazada')),
  creado timestamptz not null default now(), vence timestamptz not null default now() + interval '30 days', respuesta text not null default '', respondido timestamptz);
create index if not exists cfx_derechos_cuenta on public.cfx_derechos (cuenta, creado desc);
create table if not exists public.cfx_brechas (
  id bigserial primary key, detectada timestamptz not null default now(), descripcion text not null, datos text not null default '',
  afectados int not null default 0, riesgo text not null default 'medio' check (riesgo in ('bajo', 'medio', 'alto')), medidas text not null default '',
  agencia timestamptz, titulares timestamptz, avisados int not null default 0, cerrada timestamptz, creado timestamptz not null default now());
alter table public.cfx_consent enable row level security;
alter table public.cfx_consent_hist enable row level security;
alter table public.cfx_derechos enable row level security;
alter table public.cfx_brechas enable row level security;
revoke all on public.cfx_consent, public.cfx_consent_hist, public.cfx_derechos, public.cfx_brechas from anon, authenticated;

create or replace function public.cfx_agente() returns text language sql stable set search_path = '' as $$
  select left(coalesce(current_setting('request.headers', true)::jsonb ->> 'user-agent', ''), 300) $$;
create or replace function public.cfx_acepta(p_cuenta uuid, p_tipo text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select si from public.cfx_consent where cuenta = p_cuenta and tipo = p_tipo), p_tipo = 'negocios') $$;
create or replace function public.cfx_consent_estado() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('ofertas', public.cfx_acepta(auth.uid(), 'ofertas'), 'negocios', public.cfx_acepta(auth.uid(), 'negocios'),
    'cambiado', coalesce((select jsonb_object_agg(tipo, cambiado) from public.cfx_consent where cuenta = auth.uid()), '{}'::jsonb)) $$;
create or replace function public.cfx_consent_guardar(p_tipo text, p_si boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'Inicia sesión.'; end if;
  if p_tipo not in ('ofertas', 'negocios') or p_si is null then raise exception 'Opción no válida.'; end if;
  insert into public.cfx_consent (cuenta, tipo, si, agente) values (u, p_tipo, p_si, public.cfx_agente())
  on conflict (cuenta, tipo) do update set si = excluded.si, cambiado = now(), agente = excluded.agente;
  insert into public.cfx_consent_hist (cuenta, tipo, si, agente) values (u, p_tipo, p_si, public.cfx_agente());
  return public.cfx_consent_estado();
end $$;
create or replace function public.cfx_consent_resumen() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return coalesce((select jsonb_agg(jsonb_build_object('tipo', tipo, 'si', s, 'no', n) order by tipo)
    from (select tipo, count(*) filter (where si) s, count(*) filter (where not si) n from public.cfx_consent group by tipo) x), '[]'::jsonb);
end $$;

-- Copia de los datos de la cuenta: cada tabla con una columna de dueño (cuenta, owner_id, user_id, cliente_id…) = la cuenta.
-- No incluye claves, PIN, tokens ni llaves de API (se quitan esas columnas). Máx. 1000 filas por tabla.
create or replace function public.cfx_mis_datos() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); r record; filas jsonb; out jsonb := '{}'::jsonb; quitar text[];
begin
  if u is null then raise exception 'Inicia sesión.'; end if;
  for r in
    select c.table_schema s, c.table_name t, c.column_name col
    from information_schema.columns c join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
    where c.table_schema in ('public', 'privado') and c.data_type = 'uuid'
      and (c.column_name in ('cuenta', 'owner_id', 'user_id', 'usuario_id', 'cliente_id', 'target_id', 'autor_id', 'creado_por', 'created_by')
        or (c.column_name = 'id' and c.table_name in ('profiles', 'perfiles', 'usuarios', 'cuentas')))
      and c.table_name not in ('cfx_pin', 'cfx_keys', 'boleta_cuentas', 'push_subscriptions', 'app_secrets', 'cfx_verificaciones')
      and c.table_name !~ '(secret|clave|token)'
    order by 1, 2, 3
  loop
    select coalesce(array_agg(column_name::text), '{}') into quitar from information_schema.columns
      where table_schema = r.s and table_name = r.t and column_name ~* '(hash|^pin|pass|token|apikey|api_key|secret|clave|endpoint|^p256dh|^auth$)';
    execute format('select coalesce(jsonb_agg(to_jsonb(x) - $2), ''[]''::jsonb) from (select * from %I.%I where %I = $1 limit 1000) x', r.s, r.t, r.col) into filas using u, quitar;
    if jsonb_array_length(filas) > 0 then
      out := jsonb_set(out, array[r.s || '.' || r.t], coalesce(out -> (r.s || '.' || r.t), '[]'::jsonb) || filas);
    end if;
  end loop;
  insert into public.cfx_derechos (cuenta, email, tipo, detalle, estado, respuesta, respondido)
  values (u, coalesce((select email from auth.users where id = u), ''), 'portabilidad', 'Descarga desde la app', 'respondida', 'Copia entregada al instante (archivo JSON).', now());
  return jsonb_build_object('generado', now(), 'cuenta', jsonb_build_object('id', u, 'email', (select email from auth.users where id = u)),
    'consentimientos', public.cfx_consent_estado(), 'terminos_aceptados', (select coalesce(jsonb_agg(jsonb_build_object('version', version, 'aceptado', aceptado)), '[]'::jsonb) from public.cfx_legal where cuenta = u),
    'datos', out);
end $$;

create or replace function public.cfx_derecho_pedir(p_tipo text, p_detalle text default '') returns bigint
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); e text; i bigint; nom text;
begin
  if u is null then raise exception 'Inicia sesión.'; end if;
  if p_tipo not in ('acceso', 'rectificacion', 'supresion', 'oposicion', 'portabilidad', 'bloqueo') then raise exception 'Tipo de solicitud no válido.'; end if;
  if p_tipo in ('rectificacion', 'oposicion') and length(trim(coalesce(p_detalle, ''))) < 3 then raise exception 'Cuéntanos qué dato o qué uso (en pocas palabras).'; end if;
  if (select count(*) from public.cfx_derechos where cuenta = u and estado in ('pendiente', 'prorrogada')) >= 5 then raise exception 'Ya tienes 5 solicitudes en curso: espera la respuesta.'; end if;
  select email into e from auth.users where id = u;
  insert into public.cfx_derechos (cuenta, email, tipo, detalle) values (u, coalesce(e, ''), p_tipo, left(trim(coalesce(p_detalle, '')), 600)) returning id into i;
  nom := case p_tipo when 'acceso' then 'acceso' when 'rectificacion' then 'rectificación' when 'supresion' then 'supresión (borrar)' when 'oposicion' then 'oposición'
    when 'portabilidad' then 'portabilidad' else 'bloqueo' end;
  perform public.cfx_anotar('derecho', 'Solicitud de ' || nom || ' #' || i || ' de ' || coalesce(e, u::text));
  begin perform public.cfx_avisar_admin('🔒 Solicitud de datos: ' || nom, coalesce(e, '') || ' · responder antes del ' || to_char(now() + interval '30 days', 'DD-MM-YYYY')); exception when others then null; end;
  return i;
end $$;
create or replace function public.cfx_derechos_mios() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'tipo', tipo, 'detalle', detalle, 'estado', estado, 'creado', creado, 'vence', vence, 'respuesta', respuesta, 'respondido', respondido) order by creado desc), '[]'::jsonb)
  from (select * from public.cfx_derechos where cuenta = auth.uid() order by creado desc limit 50) x $$;
create or replace function public.cfx_derechos_lista(p_todas boolean default false) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'cuenta', cuenta, 'email', email, 'tipo', tipo, 'detalle', detalle, 'estado', estado, 'creado', creado, 'vence', vence,
      'dias', ceil(extract(epoch from vence - now()) / 86400)::int, 'respuesta', respuesta, 'respondido', respondido) order by (estado in ('pendiente', 'prorrogada')) desc, vence)
    from (select * from public.cfx_derechos where p_todas or estado in ('pendiente', 'prorrogada') order by creado desc limit 300) x), '[]'::jsonb);
end $$;
create or replace function public.cfx_derecho_responder(p_id bigint, p_accion text, p_respuesta text) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.cfx_derechos; t text := left(trim(coalesce(p_respuesta, '')), 800);
begin
  perform <CHK>;
  select * into d from public.cfx_derechos where id = p_id for update;
  if d.id is null then raise exception 'No existe esa solicitud.'; end if;
  if d.estado not in ('pendiente', 'prorrogada') then raise exception 'Esa solicitud ya se respondió.'; end if;
  if length(t) < 3 then raise exception 'Escribe la respuesta (o el motivo).'; end if;
  if p_accion = 'prorrogar' then
    if d.estado = 'prorrogada' then raise exception 'Solo se puede prorrogar una vez.'; end if;
    update public.cfx_derechos set estado = 'prorrogada', vence = vence + interval '30 days', respuesta = t where id = p_id;
    perform public.cfx_avisar(d.cuenta, '🔒 Tu solicitud de datos tomará más tiempo', left('Respondemos antes del ' || to_char(d.vence + interval '30 days', 'DD-MM-YYYY') || '. ' || t, 240));
  elsif p_accion in ('responder', 'rechazar') then
    update public.cfx_derechos set estado = case when p_accion = 'responder' then 'respondida' else 'rechazada' end, respuesta = t, respondido = now() where id = p_id;
    perform public.cfx_avisar(d.cuenta, case when p_accion = 'responder' then '🔒 Respondimos tu solicitud de datos' else '🔒 Tu solicitud de datos no se pudo acoger' end, left(t, 240));
  else raise exception 'Acción no válida.'; end if;
  perform public.cfx_anotar('derecho', p_accion || ' #' || p_id || ' (' || d.tipo || ', ' || d.email || ')');
end $$;

create or replace function public.cfx_brechas_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return coalesce((select jsonb_agg(to_jsonb(b) order by b.detectada desc) from public.cfx_brechas b), '[]'::jsonb);
end $$;
create or replace function public.cfx_brecha_guardar(p jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare i bigint := nullif(p ->> 'id', '')::bigint; d text := left(trim(coalesce(p ->> 'descripcion', '')), 1000);
begin
  perform <CHK>;
  if length(d) < 5 then raise exception 'Describe qué pasó.'; end if;
  if coalesce(p ->> 'riesgo', 'medio') not in ('bajo', 'medio', 'alto') then raise exception 'Riesgo no válido.'; end if;
  if i is null then
    insert into public.cfx_brechas (detectada, descripcion, datos, afectados, riesgo, medidas)
    values (coalesce(nullif(p ->> 'detectada', '')::timestamptz, now()), d, left(coalesce(p ->> 'datos', ''), 500), greatest(coalesce(nullif(p ->> 'afectados', '')::int, 0), 0),
      coalesce(p ->> 'riesgo', 'medio'), left(coalesce(p ->> 'medidas', ''), 1000)) returning id into i;
    perform public.cfx_anotar('brecha', 'Nueva #' || i || ' (' || coalesce(p ->> 'riesgo', 'medio') || '): ' || d);
  else
    update public.cfx_brechas set descripcion = d, datos = left(coalesce(p ->> 'datos', ''), 500), afectados = greatest(coalesce(nullif(p ->> 'afectados', '')::int, 0), 0),
      riesgo = coalesce(p ->> 'riesgo', 'medio'), medidas = left(coalesce(p ->> 'medidas', ''), 1000) where id = i;
    if not found then raise exception 'No existe ese registro.'; end if;
    perform public.cfx_anotar('brecha', 'Editada #' || i);
  end if;
  return i;
end $$;
create or replace function public.cfx_brecha_marcar(p_id bigint, p_que text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  if p_que = 'agencia' then update public.cfx_brechas set agencia = coalesce(agencia, now()) where id = p_id;
  elsif p_que = 'cerrar' then update public.cfx_brechas set cerrada = coalesce(cerrada, now()) where id = p_id;
  else raise exception 'Acción no válida.'; end if;
  if not found then raise exception 'No existe ese registro.'; end if;
  perform public.cfx_anotar('brecha', p_que || ' #' || p_id);
end $$;
create or replace function public.cfx_brecha_avisar(p_id bigint, p_destino text, p_titulo text, p_cuerpo text) returns int
language plpgsql security definer set search_path = '' as $$
declare u uuid; n int := 0;
begin
  perform <CHK>;
  if not exists (select 1 from public.cfx_brechas where id = p_id) then raise exception 'No existe ese registro.'; end if;
  if trim(coalesce(p_titulo, '')) = '' or trim(coalesce(p_cuerpo, '')) = '' then raise exception 'Escribe el título y el mensaje.'; end if;
  if p_destino not in ('todos', 'negocios', 'clientes', 'premium', 'gratis') then raise exception 'Destino no válido'; end if;
  for u in select * from public.cfx_destinatarios(p_destino) loop
    perform public.cfx_avisar(u, left(p_titulo, 80), left(p_cuerpo, 240)); n := n + 1;
  end loop;
  update public.cfx_brechas set titulares = now(), avisados = avisados + n where id = p_id;
  perform public.cfx_anotar('brecha', 'Aviso a ' || p_destino || ' (' || n || ') #' || p_id);
  return n;
end $$;
create or replace function public.cfx_privacidad_resumen() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return jsonb_build_object('pendientes', (select count(*) from public.cfx_derechos where estado in ('pendiente', 'prorrogada')),
    'vencen', (select count(*) from public.cfx_derechos where estado in ('pendiente', 'prorrogada') and vence < now() + interval '5 days'),
    'brechas', (select count(*) from public.cfx_brechas where cerrada is null), 'consent', public.cfx_consent_resumen(), 'legal', public.cfx_legal_resumen());
end $$;

revoke all on function public.cfx_agente(), public.cfx_acepta(uuid, text) from public, anon, authenticated;
revoke all on function public.cfx_consent_estado(), public.cfx_consent_guardar(text, boolean), public.cfx_consent_resumen(), public.cfx_mis_datos(),
  public.cfx_derecho_pedir(text, text), public.cfx_derechos_mios(), public.cfx_derechos_lista(boolean), public.cfx_derecho_responder(bigint, text, text),
  public.cfx_brechas_lista(), public.cfx_brecha_guardar(jsonb), public.cfx_brecha_marcar(bigint, text), public.cfx_brecha_avisar(bigint, text, text, text), public.cfx_privacidad_resumen() from public, anon;
grant execute on function public.cfx_consent_estado(), public.cfx_consent_guardar(text, boolean), public.cfx_consent_resumen(), public.cfx_mis_datos(),
  public.cfx_derecho_pedir(text, text), public.cfx_derechos_mios(), public.cfx_derechos_lista(boolean), public.cfx_derecho_responder(bigint, text, text),
  public.cfx_brechas_lista(), public.cfx_brecha_guardar(jsonb), public.cfx_brecha_marcar(bigint, text), public.cfx_brecha_avisar(bigint, text, text, text), public.cfx_privacidad_resumen() to authenticated;
