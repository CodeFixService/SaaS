
-- ---------------------------------------------------------------------
-- CodeFix · 📣 Anuncios (G93 · G87 D). Solo promos PROPIAS (de CodeFix a quienes usan las apps), nunca publicidad de terceros.
--   CM → Control → 📣 Anuncios: Campaña → Conjuntos (a quién) → Anuncios (título, texto, imagen, botón). Se publican en cada app elegida.
--   En la app: tarjeta con ✕ (no vuelve a salir a esa persona) · cuenta vistas, clics y cierres (1 vez por persona).
-- ---------------------------------------------------------------------
create table if not exists public.cfx_anuncios (
  id uuid primary key, campana uuid not null, campana_nombre text not null default '' check (length(campana_nombre) <= 60),
  conjunto text not null default '' check (length(conjunto) <= 60),
  publico text not null default 'todos' check (publico in ('todos', 'negocios', 'clientes', 'premium', 'gratis')),
  titulo text not null check (length(titulo) between 1 and 80), texto text not null default '' check (length(texto) <= 240),
  imagen text not null default '' check (length(imagen) <= 90000 and (imagen = '' or imagen ~ '^https://' or imagen ~ '^data:image/(png|jpeg|webp);base64,')),
  boton text not null default '' check (length(boton) <= 30),
  link text not null default '' check (length(link) <= 500 and (link = '' or link ~ '^(https://|/|#)')),
  desde date, hasta date, activo boolean not null default true, orden int not null default 0, creado timestamptz not null default now());
create index if not exists cfx_anuncios_campana_idx on public.cfx_anuncios (campana);
create table if not exists public.cfx_anuncio_vistos (
  anuncio uuid not null references public.cfx_anuncios (id) on delete cascade, cuenta uuid not null,
  visto timestamptz not null default now(), clic timestamptz, cerrado timestamptz, primary key (anuncio, cuenta));
-- G96 b 📣 Promos del negocio a SUS clientes: misma tabla, con negocio (null = de CodeFix). Solo las ven sus clientes (gancho de la app).
alter table public.cfx_anuncios add column if not exists negocio uuid;
create index if not exists cfx_anuncios_negocio_idx on public.cfx_anuncios (negocio) where negocio is not null;
alter table public.cfx_anuncios enable row level security;
alter table public.cfx_anuncio_vistos enable row level security;
revoke all on public.cfx_anuncios, public.cfx_anuncio_vistos from anon, authenticated;

-- Publicar una campaña completa en ESTA app: reemplaza sus anuncios (los que ya no vienen se borran). Solo admin.
create or replace function public.cfx_anuncios_publicar(p_campana uuid, p_nombre text, p_lista jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare a jsonb; n int := 0; ids uuid[] := '{}';
begin
  perform <CHK>;
  if p_campana is null or jsonb_typeof(coalesce(p_lista, 'null')) <> 'array' or jsonb_array_length(p_lista) > 30 then raise exception 'Datos no válidos'; end if;
  for a in select * from jsonb_array_elements(p_lista) loop
    ids := ids || (a ->> 'id')::uuid;
    insert into public.cfx_anuncios as x (id, campana, campana_nombre, conjunto, publico, titulo, texto, imagen, boton, link, desde, hasta, activo, orden)
    values ((a ->> 'id')::uuid, p_campana, left(trim(coalesce(p_nombre, '')), 60), left(trim(coalesce(a ->> 'conjunto', '')), 60), coalesce(nullif(a ->> 'publico', ''), 'todos'),
            left(trim(coalesce(a ->> 'titulo', '')), 80), left(trim(coalesce(a ->> 'texto', '')), 240), trim(coalesce(a ->> 'imagen', '')), left(trim(coalesce(a ->> 'boton', '')), 30),
            trim(coalesce(a ->> 'link', '')), nullif(a ->> 'desde', '')::date, nullif(a ->> 'hasta', '')::date, coalesce((a ->> 'activo')::boolean, true), n)
    on conflict (id) do update set campana = excluded.campana, campana_nombre = excluded.campana_nombre, conjunto = excluded.conjunto, publico = excluded.publico,
      titulo = excluded.titulo, texto = excluded.texto, imagen = excluded.imagen, boton = excluded.boton, link = excluded.link, desde = excluded.desde,
      hasta = excluded.hasta, activo = excluded.activo, orden = excluded.orden
    where x.campana = p_campana;
    n := n + 1;
  end loop;
  delete from public.cfx_anuncios where campana = p_campana and not (id = any (ids));
  perform public.cfx_anotar('anuncios', 'Campaña "' || left(coalesce(p_nombre, ''), 60) || '": ' || n || ' anuncio(s)');
  return n;
end $$;

-- Quitar una campaña de ESTA app (se borran sus anuncios y contadores). Solo admin.
create or replace function public.cfx_anuncios_quitar(p_campana uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform <CHK>;
  delete from public.cfx_anuncios where campana = p_campana; get diagnostics n = row_count;
  perform public.cfx_anotar('anuncios', 'Campaña quitada (' || n || ')');
  return n;
end $$;

-- Resultados por anuncio en ESTA app (vistas, clics, cierres = personas distintas). Solo admin.
create or replace function public.cfx_anuncios_admin() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'campana', a.campana, 'titulo', a.titulo, 'activo', a.activo,
    'vistas', (select count(*) from public.cfx_anuncio_vistos v where v.anuncio = a.id),
    'clics', (select count(*) from public.cfx_anuncio_vistos v where v.anuncio = a.id and v.clic is not null),
    'cierres', (select count(*) from public.cfx_anuncio_vistos v where v.anuncio = a.id and v.cerrado is not null)) order by a.creado) from public.cfx_anuncios a where a.negocio is null), '[]');
end $$;

-- G96 b 📣 PROMOS DEL NEGOCIO. Gancho de cada app que tiene clientes con cuenta (y 'promos' en cfx_modulos_app()):
--   cfx_promo_negocios_app(u) jsonb   [{"n": negocio, "nombre": "Barbería Juan"}] de los que u es cliente (sin gancho: ninguno).
-- Módulo 'promos' (con la venta de módulos apagada: Premium). Máx. 3 activas y 10 guardadas por negocio. Validado aquí.
create or replace function public.cfx_promo_negocios(u uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if u is null or to_regprocedure('public.cfx_promo_negocios_app(uuid)') is null then return '[]'; end if;
  execute 'select public.cfx_promo_negocios_app($1)' into r using u;
  return case when jsonb_typeof(r) = 'array' then r else '[]' end;
end $$;
create or replace function public.cfx_promos_puede(n uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select n is not null and case when public.cfx_venta_on() and 'promos' = any (public.cfx_modulos_de_app()) then public.cfx_modulo_de('promos', n)
    else public.cfx_negocio_premium(n) end
$$;
-- El negocio de quien llama, solo si es el dueño (null si no).
create or replace function public.cfx_promo_mi_negocio() returns uuid
language sql stable security definer set search_path = '' as $$
  select n from (select public.cfx_negocio_cuenta(auth.uid()) n) x where n is not null and public.cfx_negocio_dueno(n) = auth.uid()
$$;
create or replace function public.cfx_promos_mias() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n uuid := public.cfx_promo_mi_negocio();
begin
  if n is null then raise exception 'Solo el dueño del negocio'; end if;
  return jsonb_build_object('puede', public.cfx_promos_puede(n), 'lista', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'titulo', a.titulo, 'texto', a.texto,
    'imagen', a.imagen, 'boton', a.boton, 'link', a.link, 'desde', a.desde, 'hasta', a.hasta, 'activo', a.activo,
    'vistas', (select count(*) from public.cfx_anuncio_vistos v where v.anuncio = a.id),
    'clics', (select count(*) from public.cfx_anuncio_vistos v where v.anuncio = a.id and v.clic is not null),
    'cierres', (select count(*) from public.cfx_anuncio_vistos v where v.anuncio = a.id and v.cerrado is not null)) order by a.creado desc)
    from public.cfx_anuncios a where a.negocio = n), '[]'));
end $$;
create or replace function public.cfx_promo_guardar(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare n uuid := public.cfx_promo_mi_negocio(); i uuid := nullif(p ->> 'id', '')::uuid; r uuid; act boolean := coalesce((p ->> 'activo')::boolean, true);
  lk text := trim(coalesce(p ->> 'link', '')); de date := nullif(p ->> 'desde', '')::date; ha date := nullif(p ->> 'hasta', '')::date;
begin
  if n is null then raise exception 'Solo el dueño del negocio'; end if;
  if not public.cfx_promos_puede(n) then raise exception '📣 Promo destacada es un módulo 🧩: actívalo en Mi plan y módulos'; end if;
  if length(trim(coalesce(p ->> 'titulo', ''))) = 0 then raise exception 'Escribe el título de la promo'; end if;
  if lk <> '' and lk !~ '^https://' then raise exception 'El link debe partir con https://'; end if;
  if ha is not null and de is not null and ha < de then raise exception 'La fecha de término es antes del inicio'; end if;
  if i is null and (select count(*) from public.cfx_anuncios where negocio = n) >= 10 then raise exception 'Máximo 10 promos guardadas: borra alguna'; end if;
  if act and (select count(*) from public.cfx_anuncios where negocio = n and activo and id is distinct from i) >= 3 then raise exception 'Máximo 3 promos activas a la vez: pausa alguna'; end if;
  if i is null then
    insert into public.cfx_anuncios (id, campana, negocio, publico, titulo, texto, imagen, boton, link, desde, hasta, activo)
    values (gen_random_uuid(), gen_random_uuid(), n, 'clientes', left(trim(p ->> 'titulo'), 80), left(trim(coalesce(p ->> 'texto', '')), 240), trim(coalesce(p ->> 'imagen', '')),
            case when lk = '' then '' else left(trim(coalesce(nullif(p ->> 'boton', ''), 'Ver')), 30) end, lk, de, ha, act) returning id into r;
  else
    update public.cfx_anuncios set titulo = left(trim(p ->> 'titulo'), 80), texto = left(trim(coalesce(p ->> 'texto', '')), 240), imagen = trim(coalesce(p ->> 'imagen', '')),
      boton = case when lk = '' then '' else left(trim(coalesce(nullif(p ->> 'boton', ''), 'Ver')), 30) end, link = lk, desde = de, hasta = ha, activo = act
    where id = i and negocio = n returning id into r;
    if r is null then raise exception 'Promo no encontrada'; end if;
  end if;
  return r;
end $$;
create or replace function public.cfx_promo_borrar(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare n uuid := public.cfx_promo_mi_negocio();
begin
  if n is null then raise exception 'Solo el dueño del negocio'; end if;
  delete from public.cfx_anuncios where id = p_id and negocio = n;
end $$;
revoke all on function public.cfx_promo_negocios(uuid), public.cfx_promos_puede(uuid), public.cfx_promo_mi_negocio() from public, anon, authenticated;
revoke all on function public.cfx_promos_mias(), public.cfx_promo_guardar(jsonb), public.cfx_promo_borrar(uuid) from public, anon;
grant execute on function public.cfx_promos_mias(), public.cfx_promo_guardar(jsonb), public.cfx_promo_borrar(uuid) to authenticated;

-- Lo que ve la persona: anuncios activos, vigentes, de su público y que no cerró (máx. 3). La app no los pide para admin/socio.
create or replace function public.cfx_anuncios_ver() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); hoy date := (now() at time zone 'America/Santiago')::date;
begin
  if u is null then return '[]'; end if;
  -- G96 b: + 📣 promos de los negocios de los que es cliente (con el nombre del negocio en 'de'), después de las de CodeFix.
  return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'titulo', a.titulo, 'texto', a.texto, 'imagen', a.imagen, 'boton', a.boton, 'link', a.link, 'de', a.de) order by a.k, a.orden, a.creado)
    from (select a.*, case when a.negocio is null then 0 else 1 end k, (select x ->> 'nombre' from jsonb_array_elements(ng) x where x ->> 'n' = a.negocio::text limit 1) de
          from public.cfx_anuncios a, (select public.cfx_promo_negocios(u) ng) g
          where a.activo and (a.desde is null or a.desde <= hoy) and (a.hasta is null or a.hasta >= hoy)
            and not exists (select 1 from public.cfx_anuncio_vistos v where v.anuncio = a.id and v.cuenta = u and v.cerrado is not null)
            and (case when a.negocio is null then a.publico = 'todos' or u in (select d from public.cfx_destinatarios(a.publico) d)
                      else exists (select 1 from jsonb_array_elements(ng) x where x ->> 'n' = a.negocio::text) and public.cfx_promos_puede(a.negocio) end)
          order by case when a.negocio is null then 0 else 1 end, a.orden, a.creado limit 3) a), '[]');
end $$;

-- Marca vista / clic / cierre (una fila por persona y anuncio: no se infla contando de nuevo).
create or replace function public.cfx_anuncio_marcar(p_id uuid, p_que text) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null or p_que not in ('vista', 'clic', 'cierre') or not exists (select 1 from public.cfx_anuncios where id = p_id) then return; end if;
  insert into public.cfx_anuncio_vistos (anuncio, cuenta) values (p_id, u) on conflict do nothing;
  if p_que = 'clic' then update public.cfx_anuncio_vistos set clic = coalesce(clic, now()) where anuncio = p_id and cuenta = u;
  elsif p_que = 'cierre' then update public.cfx_anuncio_vistos set cerrado = coalesce(cerrado, now()) where anuncio = p_id and cuenta = u; end if;
end $$;
revoke all on function public.cfx_anuncios_publicar(uuid, text, jsonb), public.cfx_anuncios_quitar(uuid), public.cfx_anuncios_admin(), public.cfx_anuncios_ver(), public.cfx_anuncio_marcar(uuid, text) from public, anon;
grant execute on function public.cfx_anuncios_publicar(uuid, text, jsonb), public.cfx_anuncios_quitar(uuid), public.cfx_anuncios_admin(), public.cfx_anuncios_ver(), public.cfx_anuncio_marcar(uuid, text) to authenticated;
