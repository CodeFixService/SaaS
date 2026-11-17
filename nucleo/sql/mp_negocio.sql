
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
