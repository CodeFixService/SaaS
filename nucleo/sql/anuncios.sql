
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
    'cierres', (select count(*) from public.cfx_anuncio_vistos v where v.anuncio = a.id and v.cerrado is not null)) order by a.creado) from public.cfx_anuncios a), '[]');
end $$;

-- Lo que ve la persona: anuncios activos, vigentes, de su público y que no cerró (máx. 3). La app no los pide para admin/socio.
create or replace function public.cfx_anuncios_ver() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); hoy date := (now() at time zone 'America/Santiago')::date;
begin
  if u is null then return '[]'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'titulo', a.titulo, 'texto', a.texto, 'imagen', a.imagen, 'boton', a.boton, 'link', a.link) order by a.orden, a.creado)
    from (select * from public.cfx_anuncios a
          where a.activo and (a.desde is null or a.desde <= hoy) and (a.hasta is null or a.hasta >= hoy)
            and not exists (select 1 from public.cfx_anuncio_vistos v where v.anuncio = a.id and v.cuenta = u and v.cerrado is not null)
            and (a.publico = 'todos' or u in (select d from public.cfx_destinatarios(a.publico) d))
          order by a.orden, a.creado limit 3) a), '[]');
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
