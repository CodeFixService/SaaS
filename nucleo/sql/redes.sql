-- ---------------------------------------------------------------------
-- CodeFix · G141 a 🔗 Mis redes (igual en las 7 apps; lo reparte nucleo/sincronizar.py).
--   El dueño pega el link de su perfil (Instagram, TikTok, Facebook, YouTube, X, Threads, LinkedIn, WhatsApp, Pinterest,
--   Spotify o su web) y su página pública muestra botones con ícono. Gratis (FREE opera completo).
--   cfx_redes_mias()            → { lista: [{red, url}] } del negocio de quien llama (dueño o equipo; solo lectura para el equipo).
--   cfx_redes_guardar(p_lista)  → solo el DUEÑO; valida en el servidor red, https y dominio de cada red (máx. 12).
--   cfx_redes_publicas(p_llave) → lista pública (anon). La app traduce su llave pública (slug, código…) con el gancho
--                                 cfx_redes_llave_app(text) → uuid del negocio; sin gancho → [] (nunca error).
-- ---------------------------------------------------------------------
create table if not exists public.cfx_redes (
  negocio  uuid primary key,
  lista    jsonb not null default '[]'::jsonb check (jsonb_typeof(lista) = 'array' and pg_column_size(lista) <= 4000),
  cambiado timestamptz not null default now()
);
alter table public.cfx_redes enable row level security;
revoke all on public.cfx_redes from anon, authenticated;

-- Dominio permitido por red ('web' = cualquier https).
create or replace function public.cfx_red_ok(p_red text, p_url text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(p_url, '') ~ '^https://[^\s<>"''`\\]{3,200}$' and case p_red
    when 'instagram' then p_url ~* '^https://([a-z0-9-]+\.)?instagram\.com/'
    when 'facebook' then p_url ~* '^https://([a-z0-9-]+\.)?(facebook\.com|fb\.com|fb\.me)/'
    when 'tiktok' then p_url ~* '^https://([a-z0-9-]+\.)?tiktok\.com/'
    when 'youtube' then p_url ~* '^https://([a-z0-9-]+\.)?(youtube\.com|youtu\.be)/'
    when 'x' then p_url ~* '^https://([a-z0-9-]+\.)?(x\.com|twitter\.com)/'
    when 'threads' then p_url ~* '^https://([a-z0-9-]+\.)?threads\.(net|com)/'
    when 'linkedin' then p_url ~* '^https://([a-z0-9-]+\.)?linkedin\.com/'
    when 'whatsapp' then p_url ~* '^https://(wa\.me|([a-z0-9-]+\.)?whatsapp\.com)/'
    when 'pinterest' then p_url ~* '^https://([a-z0-9-]+\.)?(pinterest\.[a-z.]{2,6}|pin\.it)/'
    when 'spotify' then p_url ~* '^https://open\.spotify\.com/'
    when 'web' then true
    else false end
$$;

create or replace function public.cfx_redes_mias() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n uuid := public.cfx_negocio_cuenta(auth.uid());
begin
  if n is null then return jsonb_build_object('lista', '[]'::jsonb, 'dueno', false); end if;
  return jsonb_build_object('lista', coalesce((select r.lista from public.cfx_redes r where r.negocio = n), '[]'::jsonb),
    'dueno', public.cfx_negocio_dueno(n) = auth.uid());
end $$;

-- G142 c: validar una lista (la usan las redes del negocio y las de cada persona). Lanza error con el link malo.
create or replace function public.cfx_redes_limpiar(p_lista jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare x jsonb; r text; u text; out jsonb := '[]'::jsonb;
begin
  if p_lista is null or jsonb_typeof(p_lista) <> 'array' then raise exception 'Lista no válida.'; end if;
  if jsonb_array_length(p_lista) > 12 then raise exception 'Máximo 12 redes.'; end if;
  for x in select * from jsonb_array_elements(p_lista) loop
    r := lower(coalesce(x ->> 'red', '')); u := trim(coalesce(x ->> 'url', ''));
    if not public.cfx_red_ok(r, u) then raise exception 'Link no válido para %: %', r, left(u, 80); end if;
    if not exists (select 1 from jsonb_array_elements(out) y where y ->> 'url' = u) then
      out := out || jsonb_build_array(jsonb_build_object('red', r, 'url', u));
    end if;
  end loop;
  return out;
end $$;

create or replace function public.cfx_redes_guardar(p_lista jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n uuid := public.cfx_negocio_cuenta(auth.uid()); out jsonb;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para guardar.'; end if;
  if n is null or public.cfx_negocio_dueno(n) is distinct from auth.uid() then raise exception 'Solo el dueño del negocio cambia sus redes.'; end if;
  out := public.cfx_redes_limpiar(p_lista);
  insert into public.cfx_redes (negocio, lista, cambiado) values (n, out, now())
  on conflict (negocio) do update set lista = excluded.lista, cambiado = now();
  return jsonb_build_object('ok', true, 'lista', out);
end $$;

-- G142 c 📱 Redes POR PERSONA (barbero, mecánico… como Booksy): cada cuenta del equipo de un negocio tiene las suyas.
--   cfx_redes_persona_mias() / cfx_redes_persona_guardar(lista) → las propias (solo quien es parte de un negocio).
--   cfx_redes_equipo(llave) → { "<id de la persona>": [redes] } del equipo de ese negocio (pública, nunca error).
create table if not exists public.cfx_redes_persona (
  cuenta   uuid primary key references auth.users (id) on delete cascade,
  lista    jsonb not null default '[]'::jsonb,
  cambiado timestamptz not null default now()
);
alter table public.cfx_redes_persona enable row level security;
revoke all on public.cfx_redes_persona from anon, authenticated;

create or replace function public.cfx_redes_persona_mias() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('lista', coalesce((select r.lista from public.cfx_redes_persona r where r.cuenta = auth.uid()), '[]'::jsonb), 'dueno', true,
    'equipo', public.cfx_negocio_cuenta(auth.uid()) is not null)
$$;

create or replace function public.cfx_redes_persona_guardar(p_lista jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare out jsonb;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para guardar.'; end if;
  if public.cfx_negocio_cuenta(auth.uid()) is null then raise exception 'Tus redes personales son para quienes atienden en un negocio.'; end if;
  out := public.cfx_redes_limpiar(p_lista);
  insert into public.cfx_redes_persona (cuenta, lista, cambiado) values (auth.uid(), out, now())
  on conflict (cuenta) do update set lista = excluded.lista, cambiado = now();
  return jsonb_build_object('ok', true, 'lista', out);
end $$;

create or replace function public.cfx_redes_equipo(p_llave text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n uuid;
begin
  if coalesce(p_llave, '') = '' or length(p_llave) > 120 or to_regprocedure('public.cfx_redes_llave_app(text)') is null then return '{}'::jsonb; end if;
  begin execute 'select public.cfx_redes_llave_app($1)' into n using p_llave; exception when others then return '{}'::jsonb; end;
  if n is null then return '{}'::jsonb; end if;
  return coalesce((select jsonb_object_agg(r.cuenta::text, r.lista) from public.cfx_redes_persona r
    where jsonb_array_length(r.lista) > 0 and public.cfx_negocio_cuenta(r.cuenta) = n), '{}'::jsonb);
exception when others then return '{}'::jsonb;
end $$;

-- Pública: nunca lanza error (llave rara, sin gancho o sin redes → []).
create or replace function public.cfx_redes_publicas(p_llave text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n uuid;
begin
  if coalesce(p_llave, '') = '' or length(p_llave) > 120 or to_regprocedure('public.cfx_redes_llave_app(text)') is null then return '[]'::jsonb; end if;
  begin execute 'select public.cfx_redes_llave_app($1)' into n using p_llave; exception when others then return '[]'::jsonb; end;
  if n is null then return '[]'::jsonb; end if;
  return coalesce((select r.lista from public.cfx_redes r where r.negocio = n), '[]'::jsonb);
end $$;

revoke all on function public.cfx_red_ok(text, text), public.cfx_redes_mias(), public.cfx_redes_guardar(jsonb), public.cfx_redes_publicas(text) from public, anon, authenticated;
revoke all on function public.cfx_redes_limpiar(jsonb), public.cfx_redes_persona_mias(), public.cfx_redes_persona_guardar(jsonb), public.cfx_redes_equipo(text) from public, anon, authenticated;
grant execute on function public.cfx_redes_persona_mias(), public.cfx_redes_persona_guardar(jsonb) to authenticated;
grant execute on function public.cfx_redes_equipo(text) to anon, authenticated;
grant execute on function public.cfx_redes_mias(), public.cfx_redes_guardar(jsonb) to authenticated;
grant execute on function public.cfx_redes_publicas(text) to anon, authenticated;
