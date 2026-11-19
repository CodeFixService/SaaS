-- ---------- G112 d · 🎬 Estudio de contenido (módulo 'estudio' de las 5 apps con negocios) ----------
-- Mismo motor que el 🎬 Estudio del Centro de Mando (est-motor.js, SIN API de IA): el negocio arma su base de temas, genera ideas
-- (gancho, guión, copy, hashtags, CTA, hora) y anota sus métricas para que el motor aprenda. Datos PRIVADOS de cada negocio:
-- la tabla no tiene políticas (nadie la lee directo); solo el dueño, por estas funciones. Leer y borrar: siempre (🛡️ sus datos
-- nunca se ocultan). Crear o cambiar: con el módulo (o Premium si la venta de módulos está apagada), igual que 📣 promos.
create table if not exists public.cfx_estudio (
  id      uuid primary key default gen_random_uuid(),
  negocio uuid not null,
  tipo    text not null check (tipo in ('conf', 'base', 'idea')),
  titulo  text not null default '' check (length(titulo) <= 300),
  fecha   date,
  estado  text not null default 'pendiente' check (estado in ('pendiente', 'grabada', 'publicada', 'abierto')),
  datos   jsonb not null default '{}' check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) <= 6000),
  creado  timestamptz not null default now()
);
create index if not exists cfx_estudio_negocio_idx on public.cfx_estudio (negocio, tipo);
alter table public.cfx_estudio enable row level security;
revoke all on public.cfx_estudio from anon, authenticated;

-- El negocio de quien llama, solo si es el dueño (null si no).
create or replace function public.cfx_estudio_negocio() returns uuid
language sql stable security definer set search_path = '' as $$
  select n from (select public.cfx_negocio_cuenta(auth.uid()) n) x where n is not null and public.cfx_negocio_dueno(n) = auth.uid()
$$;
create or replace function public.cfx_estudio_puede(n uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select n is not null and case when public.cfx_venta_on() and 'estudio' = any (public.cfx_modulos_de_app()) then public.cfx_modulo_de('estudio', n)
    else public.cfx_negocio_premium(n) end
$$;
create or replace function public.cfx_estudio_fila(e public.cfx_estudio) returns jsonb
language sql immutable as $$
  select jsonb_build_object('id', e.id, 'tipo', e.tipo, 'titulo', e.titulo, 'fecha', e.fecha, 'estado', e.estado, 'datos', e.datos, 'created_at', e.creado)
$$;
create or replace function public.cfx_estudio_mio() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n uuid := public.cfx_estudio_negocio();
begin
  if n is null then raise exception 'Solo el dueño del negocio'; end if;
  return jsonb_build_object('puede', public.cfx_estudio_puede(n),
    'lista', coalesce((select jsonb_agg(public.cfx_estudio_fila(e) order by e.creado) from public.cfx_estudio e where e.negocio = n), '[]'));
end $$;
-- Guarda una fila o una lista (máx. 500 por vez). Con id = cambia esa fila (solo la del mismo negocio); sin id = nueva.
-- Topes por negocio: 3000 filas de base, 3000 ideas, 1 configuración. Devuelve las filas guardadas.
create or replace function public.cfx_estudio_guardar(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n uuid := public.cfx_estudio_negocio(); x jsonb; r public.cfx_estudio; out jsonb := '[]'; i uuid; t text; es text; f date; d jsonb;
begin
  if n is null then raise exception 'Solo el dueño del negocio'; end if;
  if not public.cfx_estudio_puede(n) then raise exception '🎬 Estudio de contenido es un módulo 🧩: pruébalo gratis o actívalo en Mi plan y módulos'; end if;
  if jsonb_typeof(p) = 'object' then p := jsonb_build_array(p); end if;
  if jsonb_typeof(p) is distinct from 'array' or jsonb_array_length(p) = 0 then raise exception 'Nada que guardar'; end if;
  if jsonb_array_length(p) > 500 then raise exception 'Máximo 500 filas por vez'; end if;
  for x in select * from jsonb_array_elements(p) loop
    i := nullif(x ->> 'id', '')::uuid;
    d := coalesce(x -> 'datos', '{}'); if jsonb_typeof(d) <> 'object' then d := '{}'; end if;
    if pg_column_size(d) > 6000 then raise exception 'Idea muy larga'; end if;
    f := case when coalesce(x ->> 'fecha', '') ~ '^\d{4}-\d{2}-\d{2}' then left(x ->> 'fecha', 10)::date end;
    if i is not null then
      update public.cfx_estudio set titulo = left(trim(coalesce(x ->> 'titulo', titulo)), 300),
        fecha = case when x ? 'fecha' then f else fecha end,
        estado = case when x ->> 'estado' in ('pendiente', 'grabada', 'publicada', 'abierto') then x ->> 'estado' else estado end,
        datos = case when x ? 'datos' then d else datos end
      where id = i and negocio = n returning * into r;
      if r.id is null then raise exception 'No encontrada'; end if;
    else
      t := x ->> 'tipo';
      if t is null or t not in ('conf', 'base', 'idea') then raise exception 'Tipo inválido'; end if;
      if t = 'conf' and exists (select 1 from public.cfx_estudio where negocio = n and tipo = 'conf') then
        update public.cfx_estudio set datos = d where negocio = n and tipo = 'conf' returning * into r;
      else
        if (select count(*) from public.cfx_estudio where negocio = n and tipo = t) >= 3000 then
          raise exception 'Llegaste al máximo de 3000 %: borra algunas', case when t = 'base' then 'filas de base' else 'ideas' end; end if;
        es := case when x ->> 'estado' in ('pendiente', 'grabada', 'publicada', 'abierto') then x ->> 'estado' when t = 'idea' then 'pendiente' else 'abierto' end;
        insert into public.cfx_estudio (negocio, tipo, titulo, fecha, estado, datos)
        values (n, t, left(trim(coalesce(x ->> 'titulo', '')), 300), f, es, d) returning * into r;
      end if;
    end if;
    out := out || jsonb_build_array(public.cfx_estudio_fila(r)); r := null;
  end loop;
  return out;
end $$;
-- Borrar es siempre posible (son sus datos), con o sin el módulo.
create or replace function public.cfx_estudio_borrar(p_ids uuid[]) returns int
language plpgsql security definer set search_path = '' as $$
declare n uuid := public.cfx_estudio_negocio(); k int;
begin
  if n is null then raise exception 'Solo el dueño del negocio'; end if;
  delete from public.cfx_estudio where negocio = n and id = any (coalesce(p_ids, '{}'));
  get diagnostics k = row_count;
  return k;
end $$;
revoke all on function public.cfx_estudio_negocio(), public.cfx_estudio_puede(uuid), public.cfx_estudio_fila(public.cfx_estudio) from public, anon, authenticated;
revoke all on function public.cfx_estudio_mio(), public.cfx_estudio_guardar(jsonb), public.cfx_estudio_borrar(uuid[]) from public, anon;
grant execute on function public.cfx_estudio_mio(), public.cfx_estudio_guardar(jsonb), public.cfx_estudio_borrar(uuid[]) to authenticated;
