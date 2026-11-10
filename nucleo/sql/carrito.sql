-- ---------- 🛒 Carrito y 🚚 despacho (C17) ----------
-- Carrito guardado en la nube (para recordarle al cliente lo que dejó) y el cálculo del despacho por comuna y al resto de Chile (2.58).
-- Ganchos que pone cada app que lo usa (y 'carrito' en cfx_modulos_app() para el recordatorio):
--   cfx_carrito_puede(u, negocio) bool           ¿u puede guardar carrito en ese negocio? (es su cliente, puede comprar)
--   cfx_carrito_aviso(cliente, negocio, n) bool  manda el recordatorio (push); false = no corresponde (plan, vacaciones…)
-- La app usa: cfx_carrito_vaciar (al crear el pedido), cfx_carritos_recordar (pg_cron, cada hora), cfx_carrito_borrar (al borrar una cuenta).
-- Despacho (sin tabla: cada app guarda su { retiro, gratis_desde, zonas: [{comuna, precio}] } donde quiera):
--   cfx_despacho_limpio(p) → la misma config revisada (o error claro) · cfx_despacho_costo(cfg, entrega, direccion, monto) → {costo, comuna} o {error}
create table if not exists public.cfx_carritos (
  cliente     uuid not null references auth.users (id) on delete cascade,
  negocio     uuid not null,
  items       jsonb not null default '[]'::jsonb,
  actualizado timestamptz not null default now(),
  avisado     timestamptz,
  primary key (cliente, negocio)
);
create index if not exists cfx_carritos_negocio_idx on public.cfx_carritos (negocio);
create index if not exists cfx_carritos_aviso_idx on public.cfx_carritos (actualizado) where avisado is null;
alter table public.cfx_carritos enable row level security;
revoke all on public.cfx_carritos from anon, authenticated;

-- El cliente guarda su carrito (hasta 50 productos). Vacío = se borra.
create or replace function public.cfx_carrito_guardar(p_negocio uuid, p_items jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare l jsonb := '[]'::jsonb; it jsonb; ok boolean := false;
begin
  if auth.uid() is null or p_negocio is null or to_regprocedure('public.cfx_carrito_puede(uuid,uuid)') is null then return; end if;
  execute 'select public.cfx_carrito_puede($1, $2)' into ok using auth.uid(), p_negocio;
  if not coalesce(ok, false) or jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then return; end if;
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) limit 50 loop
    continue when jsonb_typeof(it) <> 'object' or coalesce(it ->> 'clave', '') = '';
    l := l || jsonb_build_object('clave', left(it ->> 'clave', 60), 'cant', least(greatest(coalesce((it ->> 'cant')::int, 1), 1), 99), 'nombre', left(it ->> 'nombre', 80));
  end loop;
  if jsonb_array_length(l) = 0 then
    delete from public.cfx_carritos where cliente = auth.uid() and negocio = p_negocio;
  else
    insert into public.cfx_carritos (cliente, negocio, items) values (auth.uid(), p_negocio, l)
    on conflict (cliente, negocio) do update set items = excluded.items, actualizado = now(), avisado = null
      where public.cfx_carritos.items is distinct from excluded.items;
  end if;
end $$;

create or replace function public.cfx_carrito_vaciar(p_cliente uuid, p_negocio uuid) returns void
language sql security definer set search_path = '' as $$ delete from public.cfx_carritos where cliente = p_cliente and negocio = p_negocio $$;
create or replace function public.cfx_carrito_borrar(p_cuenta uuid) returns void
language sql security definer set search_path = '' as $$ delete from public.cfx_carritos where cliente = p_cuenta or negocio = p_cuenta $$;

-- Cada hora: carritos sin pedir de hace más de 20 horas (y menos de 4 días) reciben UN aviso, de 10 a 20 h de Chile.
create or replace function public.cfx_carritos_recordar() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0; ok boolean; h int := extract(hour from now() at time zone 'America/Santiago');
begin
  if h < 10 or h > 20 or not public.cfx_modulo('carrito') or to_regprocedure('public.cfx_carrito_aviso(uuid,uuid,integer)') is null then return 0; end if;
  for r in select * from public.cfx_carritos where avisado is null and actualizado < now() - interval '20 hours' and actualizado > now() - interval '4 days' limit 500 loop
    if not public.cfx_modulo_de('carrito', r.negocio) then  -- G19: la tienda no tiene el módulo (no se vuelve a revisar)
      update public.cfx_carritos set avisado = now() where cliente = r.cliente and negocio = r.negocio; continue;
    end if;
    execute 'select public.cfx_carrito_aviso($1, $2, $3)' into ok using r.cliente, r.negocio, jsonb_array_length(r.items);
    update public.cfx_carritos set avisado = now() where cliente = r.cliente and negocio = r.negocio;
    if coalesce(ok, false) then n := n + 1; end if;
  end loop;
  return n;
end $$;

-- ---------- Despacho por comuna ----------
create or replace function public.cfx_comuna_norm(t text) returns text
language sql immutable set search_path = '' as $$ select lower(trim(translate(coalesce(t, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'))) $$;

create or replace function public.cfx_despacho_limpio(p jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare z jsonb; l jsonb := '[]'::jsonb; vistas text[] := '{}'; rm text;
begin
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'Datos no válidos'; end if;
  for z in select * from jsonb_array_elements(case when jsonb_typeof(p -> 'zonas') = 'array' then p -> 'zonas' else '[]'::jsonb end) loop
    if coalesce(trim(z ->> 'comuna'), '') = '' then continue; end if;
    if length(z ->> 'comuna') > 40 then raise exception 'Nombre de comuna muy largo'; end if;
    if coalesce((z ->> 'precio')::numeric, -1) not between 0 and 200000 then raise exception 'El despacho a % debe costar entre $0 y $200.000', z ->> 'comuna'; end if;
    if public.cfx_comuna_norm(z ->> 'comuna') = any (vistas) then raise exception 'La comuna % está repetida', z ->> 'comuna'; end if;
    vistas := vistas || public.cfx_comuna_norm(z ->> 'comuna');
    l := l || jsonb_build_object('comuna', trim(z ->> 'comuna'), 'precio', round((z ->> 'precio')::numeric));
  end loop;
  if jsonb_array_length(l) > 80 then raise exception 'Máximo 80 comunas'; end if;
  -- Resto de Chile (regiones y comunas que no están en la lista): 'no' | 'fijo' (un precio) | 'por_pagar' (lo paga quien recibe al courier).
  rm := coalesce(nullif(p #>> '{resto,modo}', ''), 'no');
  if rm not in ('no', 'fijo', 'por_pagar') then raise exception 'Elige cómo despachas al resto de Chile'; end if;
  if rm = 'fijo' and coalesce((p #>> '{resto,precio}')::numeric, -1) not between 0 and 200000 then raise exception 'El despacho al resto de Chile debe costar entre $0 y $200.000'; end if;
  if not coalesce((p ->> 'retiro')::boolean, true) and jsonb_array_length(l) = 0 and rm = 'no' then raise exception 'Activa el retiro en tienda o agrega al menos una comuna de despacho'; end if;
  if coalesce((p ->> 'gratis_desde')::numeric, 0) not between 0 and 10000000 then raise exception 'Monto de despacho gratis no válido'; end if;
  return jsonb_build_object('retiro', coalesce((p ->> 'retiro')::boolean, true), 'gratis_desde', round(coalesce((p ->> 'gratis_desde')::numeric, 0)), 'zonas', l,
    'resto', jsonb_build_object('modo', rm, 'precio', case when rm = 'fijo' then round((p #>> '{resto,precio}')::numeric) else 0 end));
end $$;

-- La comuna va al final de la dirección ("…, Ñuñoa"). Sin zonas ni resto de Chile: se coordina con el negocio ($0 aquí).
-- Comuna fuera de la lista: con resto 'fijo' cobra ese precio; con 'por_pagar' $0 y por_pagar = true (lo paga quien recibe).
create or replace function public.cfx_despacho_costo(p_cfg jsonb, p_entrega text, p_direccion text, p_monto numeric) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare c jsonb := coalesce(p_cfg, '{}'::jsonb); com text; z jsonb; rm text := coalesce(nullif(p_cfg #>> '{resto,modo}', ''), 'no'); orig text;
  gratis boolean := coalesce((p_cfg ->> 'gratis_desde')::numeric, 0) > 0 and p_monto >= (p_cfg ->> 'gratis_desde')::numeric;
begin
  if p_entrega is distinct from 'despacho' or (jsonb_array_length(coalesce(c -> 'zonas', '[]'::jsonb)) = 0 and rm = 'no') then return jsonb_build_object('costo', 0, 'comuna', null); end if;
  orig := left(trim(regexp_replace(coalesce(p_direccion, ''), '^.*,', '')), 60);
  com := public.cfx_comuna_norm(orig);
  select e into z from jsonb_array_elements(coalesce(c -> 'zonas', '[]'::jsonb)) e where public.cfx_comuna_norm(e ->> 'comuna') = com limit 1;
  if z is null then
    if com = '' or position(',' in coalesce(p_direccion, '')) = 0 then return jsonb_build_object('error', 'Escribe la dirección y la comuna de despacho'); end if;
    if rm = 'fijo' then return jsonb_build_object('comuna', orig, 'costo', case when gratis then 0 else greatest(0, coalesce((c #>> '{resto,precio}')::numeric, 0)) end); end if;
    if rm = 'por_pagar' then return jsonb_build_object('comuna', orig, 'costo', 0, 'por_pagar', true); end if;
    return jsonb_build_object('error', 'Esta tienda no despacha a esa comuna. Elige otra comuna o retiro en tienda.');
  end if;
  return jsonb_build_object('comuna', z ->> 'comuna', 'costo', case when gratis then 0 else greatest(0, coalesce((z ->> 'precio')::numeric, 0)) end);
end $$;

revoke all on function public.cfx_carrito_vaciar(uuid, uuid), public.cfx_carrito_borrar(uuid), public.cfx_carritos_recordar(), public.cfx_comuna_norm(text),
  public.cfx_despacho_limpio(jsonb), public.cfx_despacho_costo(jsonb, text, text, numeric) from public, anon, authenticated;
revoke all on function public.cfx_carrito_guardar(uuid, jsonb) from public, anon;
grant execute on function public.cfx_carrito_guardar(uuid, jsonb) to authenticated;
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'cfx-carritos';
  perform cron.schedule('cfx-carritos', '23 * * * *', 'select public.cfx_carritos_recordar()');
exception when others then
  raise notice 'Recordatorio de carritos no programado (%).', sqlerrm;
end $$;
