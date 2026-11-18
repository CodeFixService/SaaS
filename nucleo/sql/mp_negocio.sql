
-- ---------------------------------------------------------------------
-- G98 ⚡ MERCADO PAGO PROPIO DE CADA NEGOCIO (cobrar a SUS clientes: abonos, arriendos, órdenes…). La plata llega directo al negocio.
--   El dueño pega su Access Token una vez (cfx_mp_neg_guardar; nadie lo puede leer después, ni el equipo ni la app).
--   La app crea un cobro con cfx_mp_neg_cobro(negocio, ref, título, monto, volver, vence) → url de Mercado Pago.
--   Al volver (cfx_mp_neg_revisar(ref)) o cada 1 min (cron 'cfx-mp-neg') la BASE consulta a Mercado Pago: aprobado + CLP + monto
--   completo + n° de pago usado 1 sola vez → marca el cobro pagado y llama al gancho de la app cfx_mp_neg_pagado_app(ref, pago, monto).
--   ref = '<tipo>:<id>' (ej. 'reserva:uuid'); la app decide qué hacer al pagarse (agendar, extender, etc.).
--   Despega tiene su propio mp_cuentas (pedidos) desde antes: no se toca.
-- ---------------------------------------------------------------------
create table if not exists public.cfx_mp_negocio (
  negocio    uuid primary key,
  token      text not null,
  nick       text,
  activo     boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.cfx_mp_negocio enable row level security;
revoke all on public.cfx_mp_negocio from anon, authenticated;

create table if not exists public.cfx_mp_neg_cobros (
  id         uuid primary key default gen_random_uuid(),
  negocio    uuid not null,
  ref        text not null,
  titulo     text,
  monto      int not null check (monto > 0),
  vence      timestamptz,
  pago       text unique,
  pagado_at  timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists cfx_mp_neg_cobros_ref on public.cfx_mp_neg_cobros (ref, created_at desc);
create index if not exists cfx_mp_neg_cobros_pend on public.cfx_mp_neg_cobros (created_at) where pago is null;
alter table public.cfx_mp_neg_cobros enable row level security;
revoke all on public.cfx_mp_neg_cobros from anon, authenticated;

-- El negocio de quien llama, solo si es el dueño (null si no).
create or replace function public.cfx_mp_neg_mio() returns uuid
language sql stable security definer set search_path = '' as $$
  select n from (select public.cfx_negocio_cuenta(auth.uid()) n) x where n is not null and public.cfx_negocio_dueno(n) = auth.uid()
$$;

create or replace function public.cfx_mp_neg_activo(p_negocio uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cfx_mp_negocio where negocio = p_negocio and activo)
$$;

create or replace function public.cfx_mp_neg_estado() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('dueno', n is not null, 'conectado', m.negocio is not null, 'activo', coalesce(m.activo, false), 'nick', m.nick, 'fin', right(m.token, 4))
  from (select public.cfx_mp_neg_mio() n) x left join public.cfx_mp_negocio m on m.negocio = x.n
$$;

-- El dueño conecta (token), activa/pausa (p_activo) o desconecta (sin token y p_activo null).
create or replace function public.cfx_mp_neg_guardar(p_token text, p_activo boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n uuid := public.cfx_mp_neg_mio(); tk text := nullif(regexp_replace(coalesce(p_token, ''), '\s', '', 'g'), ''); r jsonb;
begin
  if n is null then raise exception 'Solo el dueño del negocio'; end if;
  if tk is null then
    if p_activo is null then delete from public.cfx_mp_negocio where negocio = n;
    else
      update public.cfx_mp_negocio set activo = p_activo, updated_at = now() where negocio = n;
      if not found and p_activo then raise exception 'Pega tu Access Token de Mercado Pago'; end if;
    end if;
    return public.cfx_mp_neg_estado();
  end if;
  if tk !~ '^(APP_USR|TEST)-[A-Za-z0-9-]{20,}$' or length(tk) > 300 then raise exception 'Ese no es un Access Token: empieza con APP_USR-'; end if;
  r := public.cfx_mp_api(tk, 'GET', '/users/me');
  if coalesce((r ->> 'status')::int, 0) = 0 then raise exception 'No se pudo conectar con Mercado Pago. Intenta de nuevo.'; end if;
  if (r ->> 'status')::int <> 200 then raise exception 'Mercado Pago no aceptó el token: copia el Access Token de producción'; end if;
  insert into public.cfx_mp_negocio (negocio, token, nick, activo)
  values (n, tk, left(coalesce(r #>> '{body,nickname}', r #>> '{body,email}', ''), 80), coalesce(p_activo, true))
  on conflict (negocio) do update set token = excluded.token, nick = excluded.nick, activo = excluded.activo, updated_at = now();
  return public.cfx_mp_neg_estado();
end $$;

-- La app pide el cobro (solo desde sus funciones; no se llama directo). Devuelve { ok, url } o { ok: false, error }.
create or replace function public.cfx_mp_neg_cobro(p_negocio uuid, p_ref text, p_titulo text, p_monto int, p_volver text, p_vence timestamptz default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare tk text; c public.cfx_mp_neg_cobros; r jsonb; v text := left(coalesce(p_volver, ''), 500);
begin
  select token into tk from public.cfx_mp_negocio where negocio = p_negocio and activo;
  if tk is null then return jsonb_build_object('ok', false, 'error', 'Este negocio no tiene Mercado Pago activo'); end if;
  if coalesce(p_monto, 0) < 1 then return jsonb_build_object('ok', false, 'error', 'Monto no válido'); end if;
  if p_vence is not null and p_vence < now() + interval '1 minute' then return jsonb_build_object('ok', false, 'error', 'Se pasó el tiempo para pagar'); end if;
  if exists (select 1 from public.cfx_mp_neg_cobros where ref = p_ref and pago is not null) then return jsonb_build_object('ok', false, 'error', 'Esto ya está pagado'); end if;
  if v !~ '^https://[^\s"<>]+$' then v := null; end if;
  insert into public.cfx_mp_neg_cobros (negocio, ref, titulo, monto, vence) values (p_negocio, left(p_ref, 120), left(coalesce(p_titulo, 'Pago'), 120), p_monto, p_vence)
  returning * into c;
  r := public.cfx_mp_api(tk, 'POST', '/checkout/preferences', jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object('id', c.id, 'title', c.titulo, 'quantity', 1, 'currency_id', 'CLP', 'unit_price', c.monto)),
    'external_reference', c.id::text,
    'payment_methods', jsonb_build_object('excluded_payment_types', jsonb_build_array(jsonb_build_object('id', 'ticket'))))
    || public.cfx_mp_notif('n:' || c.id::text)
    || case when p_vence is null then '{}'::jsonb else jsonb_build_object('expires', true,
         'expiration_date_to', to_char(p_vence at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS".000+00:00"')) end
    || case when v is null then '{}'::jsonb else jsonb_build_object('back_urls', jsonb_build_object('success', v, 'pending', v, 'failure', v), 'auto_return', 'approved') end);
  if coalesce((r ->> 'status')::int, 0) not in (200, 201) or r #>> '{body,init_point}' is null then
    delete from public.cfx_mp_neg_cobros where id = c.id;
    return jsonb_build_object('ok', false, 'error', 'Mercado Pago no respondió. Intenta de nuevo o usa otro medio de pago.');
  end if;
  return jsonb_build_object('ok', true, 'url', r #>> '{body,init_point}');
end $$;

-- Pregunta a Mercado Pago por UN cobro; si está aprobado (CLP, monto completo, n° no usado) lo marca y llama al gancho de la app.
create or replace function public.cfx_mp_neg_confirmar(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare c public.cfx_mp_neg_cobros; tk text; r jsonb; pg jsonb;
begin
  select * into c from public.cfx_mp_neg_cobros where id = p_id for update skip locked;
  if c.id is null then return false; end if;
  if c.pago is not null then return true; end if;
  select token into tk from public.cfx_mp_negocio where negocio = c.negocio;
  if tk is null then return false; end if;
  r := public.cfx_mp_api(tk, 'GET', '/v1/payments/search?sort=date_created&criteria=desc&external_reference=' || c.id::text);
  select e into pg from jsonb_array_elements(coalesce(r #> '{body,results}', '[]'::jsonb)) e
  where e ->> 'status' = 'approved' and e ->> 'external_reference' = c.id::text
    and coalesce(e ->> 'currency_id', 'CLP') = 'CLP' and (e ->> 'transaction_amount')::numeric >= c.monto
    and not exists (select 1 from public.cfx_mp_neg_cobros u where u.pago = left(e ->> 'id', 40)) limit 1;
  if pg is null then return false; end if;
  update public.cfx_mp_neg_cobros set pago = left(pg ->> 'id', 40), pagado_at = now() where id = c.id;
  if to_regprocedure('public.cfx_mp_neg_pagado_app(text, text, integer)') is not null then
    execute 'select public.cfx_mp_neg_pagado_app($1, $2, $3)' using c.ref, left(pg ->> 'id', 40), c.monto;
  end if;
  return true;
end $$;

-- Al volver de Mercado Pago: revisa los cobros de esa referencia (la app lo llama dentro de su propia función, con su control de acceso).
create or replace function public.cfx_mp_neg_revisar(p_ref text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare i uuid;
begin
  if exists (select 1 from public.cfx_mp_neg_cobros where ref = p_ref and pago is not null) then return true; end if;
  for i in select id from public.cfx_mp_neg_cobros where ref = p_ref and pago is null and created_at > now() - interval '3 days' order by created_at desc limit 5 loop
    if public.cfx_mp_neg_confirmar(i) then return true; end if;
  end loop;
  return false;
end $$;

create or replace function public.cfx_mp_neg_pagado(p_ref text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cfx_mp_neg_cobros where ref = p_ref and pago is not null)
$$;

-- Cada 1 min: cobros abiertos de los últimos 2 días (por si la persona no volvió a la página).
create or replace function public.cfx_mp_neg_revisar_pendientes() returns int
language plpgsql security definer set search_path = '' as $$
declare i uuid; n int := 0;
begin
  for i in select id from public.cfx_mp_neg_cobros c where pago is null and created_at > now() - interval '2 days'
             and (vence is null or vence > now() - interval '30 minutes')
             and not exists (select 1 from public.cfx_mp_neg_cobros p where p.ref = c.ref and p.pago is not null)
           order by created_at desc limit 40 loop
    if public.cfx_mp_neg_confirmar(i) then n := n + 1; end if;
  end loop;
  delete from public.cfx_mp_neg_cobros where pago is null and created_at < now() - interval '30 days';
  return n;
end $$;

revoke all on function public.cfx_mp_neg_mio(), public.cfx_mp_neg_activo(uuid), public.cfx_mp_neg_cobro(uuid, text, text, int, text, timestamptz),
  public.cfx_mp_neg_confirmar(uuid), public.cfx_mp_neg_revisar(text), public.cfx_mp_neg_pagado(text), public.cfx_mp_neg_revisar_pendientes() from public, anon, authenticated;
revoke all on function public.cfx_mp_neg_estado(), public.cfx_mp_neg_guardar(text, boolean) from public, anon;
grant execute on function public.cfx_mp_neg_estado(), public.cfx_mp_neg_guardar(text, boolean) to authenticated;
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'cfx-mp-neg';
  perform cron.schedule('cfx-mp-neg', '* * * * *', 'select public.cfx_mp_neg_revisar_pendientes()');
exception when others then
  raise notice 'Revisión de Mercado Pago de los negocios no programada (%).', sqlerrm;
end $$;

-- ---------------------------------------------------------------------
-- G106 ⚡ PAGO AUTOMÁTICO CON TARJETA (suscripción "preapproval" de Mercado Pago, con el MP PROPIO del negocio).
--   La persona autoriza su tarjeta 1 vez en Mercado Pago; MP la cobra sola cada mes, sin que nadie toque nada.
--   La app crea la suscripción con cfx_mp_neg_suscribir(negocio, ref, título, monto, correo, volver, inicio) → url de MP.
--   La BASE pregunta a MP (al volver y con el cron 'cfx-mp-neg'): estado de la suscripción + cobros aprobados (CLP, monto
--   completo, cada cobro 1 sola vez) → gancho de la app cfx_mp_neg_sub_app(ref, evento, pago, monto); evento = 'activa' | 'cobro' | 'cancelada'.
--   cfx_mp_neg_sub_cancelar(ref) la apaga EN Mercado Pago (si MP no responde, no se marca: se reintenta).
-- ---------------------------------------------------------------------
create table if not exists public.cfx_mp_neg_subs (
  id          uuid primary key default gen_random_uuid(),
  negocio     uuid not null,
  ref         text not null,
  titulo      text,
  monto       int not null check (monto > 0),
  preapproval text unique,
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'activa', 'pausada', 'cancelada')),
  cobros      int not null default 0,
  ultimo_at   timestamptz,
  revisado_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists cfx_mp_neg_subs_ref on public.cfx_mp_neg_subs (ref, created_at desc);
create index if not exists cfx_mp_neg_subs_viva on public.cfx_mp_neg_subs (revisado_at) where estado <> 'cancelada';
alter table public.cfx_mp_neg_subs enable row level security;
revoke all on public.cfx_mp_neg_subs from anon, authenticated;

create table if not exists public.cfx_mp_neg_sub_pagos (
  id    text primary key,          -- n° del cobro autorizado de MP (1 sola vez)
  sub   uuid not null,
  pago  text,
  monto int not null,
  at    timestamptz not null default now()
);
alter table public.cfx_mp_neg_sub_pagos enable row level security;
revoke all on public.cfx_mp_neg_sub_pagos from anon, authenticated;

create or replace function public._cfx_mp_neg_sub_gancho(p_ref text, p_evento text, p_pago text, p_monto int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if to_regprocedure('public.cfx_mp_neg_sub_app(text, text, text, integer)') is not null then
    execute 'select public.cfx_mp_neg_sub_app($1, $2, $3, $4)' using p_ref, p_evento, p_pago, p_monto;
  end if;
end $$;

-- La app pide la suscripción (solo desde sus funciones). Devuelve { ok, url } o { ok: false, error }.
create or replace function public.cfx_mp_neg_suscribir(p_negocio uuid, p_ref text, p_titulo text, p_monto int, p_email text, p_volver text, p_inicio timestamptz default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare tk text; s public.cfx_mp_neg_subs; r jsonb; v text := left(coalesce(p_volver, ''), 500); m text := lower(trim(coalesce(p_email, '')));
  ini timestamptz := greatest(coalesce(p_inicio, now()), now() + interval '5 minutes');
begin
  select token into tk from public.cfx_mp_negocio where negocio = p_negocio and activo;
  if tk is null then return jsonb_build_object('ok', false, 'error', 'Este negocio no tiene Mercado Pago activo'); end if;
  if coalesce(p_monto, 0) < 1 then return jsonb_build_object('ok', false, 'error', 'Monto no válido'); end if;
  if m !~ '^[^@\s"<>]+@[^@\s"<>]+\.[a-z]{2,}$' or length(m) > 120 then return jsonb_build_object('ok', false, 'error', 'Escribe el correo de tu cuenta de Mercado Pago'); end if;
  if v !~ '^https://[^\s"<>]+$' then return jsonb_build_object('ok', false, 'error', 'Falta la dirección de regreso'); end if;
  if exists (select 1 from public.cfx_mp_neg_subs where ref = p_ref and estado in ('activa', 'pausada')) then
    return jsonb_build_object('ok', false, 'error', 'Ya tienes el pago automático');
  end if;
  update public.cfx_mp_neg_subs set estado = 'cancelada', updated_at = now() where ref = p_ref and estado = 'pendiente';  -- intento anterior sin autorizar
  insert into public.cfx_mp_neg_subs (negocio, ref, titulo, monto) values (p_negocio, left(p_ref, 120), left(coalesce(p_titulo, 'Pago mensual'), 120), p_monto)
  returning * into s;
  r := public.cfx_mp_api(tk, 'POST', '/preapproval', jsonb_build_object(
    'reason', s.titulo, 'external_reference', s.id::text, 'payer_email', m, 'back_url', v, 'status', 'pending',
    'auto_recurring', jsonb_build_object('frequency', 1, 'frequency_type', 'months', 'currency_id', 'CLP', 'transaction_amount', s.monto,
      'start_date', to_char(ini at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS".000+00:00"'))));
  if coalesce((r ->> 'status')::int, 0) not in (200, 201) or r #>> '{body,init_point}' is null or r #>> '{body,id}' is null then
    delete from public.cfx_mp_neg_subs where id = s.id;
    return jsonb_build_object('ok', false, 'error', coalesce('Mercado Pago: ' || left(r #>> '{body,message}', 160), 'Mercado Pago no respondió. Intenta de nuevo.'));
  end if;
  update public.cfx_mp_neg_subs set preapproval = left(r #>> '{body,id}', 60), revisado_at = now() where id = s.id;
  return jsonb_build_object('ok', true, 'url', r #>> '{body,init_point}');
end $$;

-- Pregunta a MP por UNA suscripción: estado + cobros nuevos. Devuelve cuántos cobros nuevos encontró.
create or replace function public.cfx_mp_neg_sub_revisar(p_id uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare s public.cfx_mp_neg_subs; tk text; r jsonb; e jsonb; nuevo text; n int := 0;
begin
  select * into s from public.cfx_mp_neg_subs where id = p_id for update skip locked;
  if s.id is null or s.preapproval is null or s.estado = 'cancelada' then return 0; end if;
  select token into tk from public.cfx_mp_negocio where negocio = s.negocio;
  if tk is null then return 0; end if;
  update public.cfx_mp_neg_subs set revisado_at = now() where id = s.id;
  r := public.cfx_mp_api(tk, 'GET', '/preapproval/' || s.preapproval);
  if coalesce((r ->> 'status')::int, 0) = 200 then
    nuevo := case r #>> '{body,status}' when 'authorized' then 'activa' when 'paused' then 'pausada' when 'cancelled' then 'cancelada' else s.estado end;
    if nuevo <> s.estado then
      update public.cfx_mp_neg_subs set estado = nuevo, updated_at = now() where id = s.id;
      if nuevo in ('activa', 'cancelada') then perform public._cfx_mp_neg_sub_gancho(s.ref, nuevo, null, s.monto); end if;
    end if;
  end if;
  r := public.cfx_mp_api(tk, 'GET', '/authorized_payments/search?preapproval_id=' || s.preapproval);
  for e in select x from jsonb_array_elements(coalesce(r #> '{body,results}', '[]'::jsonb)) x
           where coalesce(x #>> '{payment,status}', '') = 'approved' and coalesce(x ->> 'preapproval_id', s.preapproval) = s.preapproval
             and coalesce(x ->> 'currency_id', 'CLP') = 'CLP' and coalesce((x ->> 'transaction_amount')::numeric, 0) >= s.monto
             and x ->> 'id' is not null loop
    insert into public.cfx_mp_neg_sub_pagos (id, sub, pago, monto) values (left(e ->> 'id', 40), s.id, left(e #>> '{payment,id}', 40), s.monto)
    on conflict do nothing;
    if found then
      n := n + 1;
      update public.cfx_mp_neg_subs set cobros = cobros + 1, ultimo_at = now(), estado = case when estado = 'pendiente' then 'activa' else estado end, updated_at = now() where id = s.id;
      perform public._cfx_mp_neg_sub_gancho(s.ref, 'cobro', left(coalesce(e #>> '{payment,id}', e ->> 'id'), 40), s.monto);
    end if;
  end loop;
  return n;
end $$;

-- La app revisa las suscripciones de una referencia (al volver de MP), dentro de su propia función con su control de acceso.
create or replace function public.cfx_mp_neg_sub_revisar_ref(p_ref text) returns int
language plpgsql security definer set search_path = '' as $$
declare i uuid; n int := 0;
begin
  for i in select id from public.cfx_mp_neg_subs where ref = p_ref and estado <> 'cancelada' order by created_at desc limit 3 loop
    n := n + public.cfx_mp_neg_sub_revisar(i);
  end loop;
  return n;
end $$;

-- Lo que la app muestra: la suscripción viva más nueva de esa referencia (o null).
create or replace function public.cfx_mp_neg_sub_ver(p_ref text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('estado', estado, 'monto', monto, 'cobros', cobros, 'ultimo', ultimo_at, 'desde', created_at)
  from public.cfx_mp_neg_subs where ref = p_ref and estado <> 'cancelada' order by created_at desc limit 1
$$;

-- Apaga en Mercado Pago todas las suscripciones vivas de esa referencia. false = MP no respondió (no se marca; se reintenta).
create or replace function public.cfx_mp_neg_sub_cancelar(p_ref text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare s public.cfx_mp_neg_subs; tk text; r jsonb; todo boolean := true;
begin
  for s in select * from public.cfx_mp_neg_subs where ref = p_ref and estado <> 'cancelada' for update loop
    select token into tk from public.cfx_mp_negocio where negocio = s.negocio;
    if s.preapproval is not null and tk is not null then
      r := public.cfx_mp_api(tk, 'PUT', '/preapproval/' || s.preapproval, jsonb_build_object('status', 'cancelled'));
      if coalesce((r ->> 'status')::int, 0) not in (200, 201) and coalesce(r #>> '{body,status}', '') <> 'cancelled' then todo := false; continue; end if;
    end if;
    update public.cfx_mp_neg_subs set estado = 'cancelada', updated_at = now() where id = s.id;
  end loop;
  return todo;
end $$;

-- Cron: pendientes (cada 1 min, 2 días; después se dan por abandonadas) · vivas (cada 30 min).
create or replace function public.cfx_mp_neg_subs_revisar() returns int
language plpgsql security definer set search_path = '' as $$
declare i uuid; n int := 0;
begin
  update public.cfx_mp_neg_subs set estado = 'cancelada', updated_at = now() where estado = 'pendiente' and created_at < now() - interval '2 days' and cobros = 0;
  for i in select id from public.cfx_mp_neg_subs where estado <> 'cancelada' and preapproval is not null
             and (revisado_at is null or revisado_at < now() - case when estado = 'pendiente' then interval '1 minute' else interval '30 minutes' end)
           order by revisado_at nulls first limit 30 loop
    n := n + public.cfx_mp_neg_sub_revisar(i);
  end loop;
  return n;
end $$;

revoke all on function public._cfx_mp_neg_sub_gancho(text, text, text, int), public.cfx_mp_neg_suscribir(uuid, text, text, int, text, text, timestamptz),
  public.cfx_mp_neg_sub_revisar(uuid), public.cfx_mp_neg_sub_revisar_ref(text), public.cfx_mp_neg_sub_ver(text), public.cfx_mp_neg_sub_cancelar(text),
  public.cfx_mp_neg_subs_revisar() from public, anon, authenticated;
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'cfx-mp-neg-subs';
  perform cron.schedule('cfx-mp-neg-subs', '* * * * *', 'select public.cfx_mp_neg_subs_revisar()');
exception when others then
  raise notice 'Revisión de pagos automáticos no programada (%).', sqlerrm;
end $$;
