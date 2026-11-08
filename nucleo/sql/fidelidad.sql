-- ---------- Cupones del negocio y tarjeta de sellos (C16): módulos 'cupones' y 'sellos' ----------
-- OJO: no son los cupones del Premium (cfx_cupones / cfx_cupon_ver, los crea el admin). Estos los crea cada negocio para SUS clientes.
-- Ganchos que pone cada app que los usa (y 'cupones' / 'sellos' en cfx_modulos_app()):
--   cfx_fid_dueno(u) uuid                  negocio que administra la cuenta u (null = no es negocio)
--   cfx_fid_activo(negocio, modulo) bool   ¿el plan del negocio incluye ese módulo? (p. ej. solo Pro)
--   cfx_fid_cliente(u, negocio) bool       ¿u es cliente de ese negocio? (ve sus sellos y prueba cupones)
--   cfx_sellos_aviso(negocio, cliente, premio) void   push al cliente que completó la tarjeta
-- La app usa, dentro de sus funciones: cfx_desc_pct + cfx_desc_usar (al crear el pedido), cfx_sello_sumar (al entregar)
-- y cfx_sellos_cfg_de (para mostrar la tarjeta). cfx_fid_borrar al borrar un negocio.
create table if not exists public.cfx_descuentos (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null,
  codigo      text not null check (codigo ~ '^[A-Z0-9]{3,20}$'),
  porcentaje  int not null check (porcentaje between 1 and 90),
  hasta       date,
  activo      boolean not null default true,
  usos        int not null default 0,
  creado      timestamptz not null default now(),
  unique (owner_id, codigo)
);
create table if not exists public.cfx_sellos_cfg (
  owner_id  uuid primary key,
  meta      int not null check (meta between 2 and 30),
  premio    text check (char_length(premio) <= 80),
  creado    timestamptz not null default now()
);
create table if not exists public.cfx_sellos (
  negocio_id  uuid not null,
  cliente_id  uuid not null references auth.users (id) on delete cascade,
  cantidad    int not null default 0,
  premios     int not null default 0,
  actualizado timestamptz not null default now(),
  primary key (negocio_id, cliente_id)
);
create index if not exists cfx_sellos_cliente_idx on public.cfx_sellos (cliente_id);
alter table public.cfx_descuentos enable row level security;
alter table public.cfx_sellos_cfg enable row level security;
alter table public.cfx_sellos enable row level security;
revoke all on public.cfx_descuentos, public.cfx_sellos_cfg, public.cfx_sellos from anon, authenticated;

create or replace function public.cfx_desc_codigo(p_codigo text) returns text
language sql immutable set search_path = '' as $$ select upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g')) $$;

-- El negocio de la cuenta, si el módulo está prendido y su plan lo incluye.
create or replace function public.cfx_fid_mio(p_modulo text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare n uuid;
begin
  if not public.cfx_modulo(p_modulo) then
    raise exception '% no está disponible en esta app', case p_modulo when 'cupones' then 'Los cupones' else 'La tarjeta de sellos' end;
  end if;
  n := public.cfx_fid_dueno(auth.uid());
  if n is null then raise exception 'Solo el negocio'; end if;
  if not coalesce(public.cfx_fid_activo(n, p_modulo), false) then
    raise exception '% de la versión Pro', case p_modulo when 'cupones' then 'Los cupones son' else 'La tarjeta de sellos es' end;
  end if;
  return n;
end $$;

-- ¿El negocio puede usar el módulo ahora? (prendido + su plan)
create or replace function public.cfx_fid_ok(p_negocio uuid, p_modulo text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_negocio is null or not public.cfx_modulo(p_modulo) then return false; end if;
  return coalesce(public.cfx_fid_activo(p_negocio, p_modulo), false);
end $$;

-- ---------- Cupones ----------
create or replace function public.cfx_desc_guardar(p_codigo text, p_porcentaje int, p_hasta date) returns void
language plpgsql security definer set search_path = '' as $$
declare n uuid := public.cfx_fid_mio('cupones'); c text := public.cfx_desc_codigo(p_codigo);
begin
  if length(c) < 3 or length(c) > 20 then raise exception 'El código debe tener entre 3 y 20 letras o números'; end if;
  if p_porcentaje is null or p_porcentaje < 1 or p_porcentaje > 90 then raise exception 'El descuento debe ser entre 1 y 90 por ciento'; end if;
  if (select count(*) from public.cfx_descuentos where owner_id = n) >= 50
     and not exists (select 1 from public.cfx_descuentos where owner_id = n and codigo = c) then raise exception 'Máximo 50 cupones'; end if;
  insert into public.cfx_descuentos (owner_id, codigo, porcentaje, hasta) values (n, c, p_porcentaje, p_hasta)
  on conflict (owner_id, codigo) do update set porcentaje = excluded.porcentaje, hasta = excluded.hasta, activo = true;
end $$;

create or replace function public.cfx_desc_borrar(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.cfx_descuentos where id = p_id and owner_id = public.cfx_fid_dueno(auth.uid());
end $$;

-- Mis cupones: [{id, codigo, porcentaje, hasta, activo, usos}]
create or replace function public.cfx_desc_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n uuid := public.cfx_fid_mio('cupones');
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'codigo', c.codigo, 'porcentaje', c.porcentaje, 'hasta', c.hasta,
    'activo', c.activo, 'usos', c.usos) order by c.creado desc) from public.cfx_descuentos c where c.owner_id = n), '[]');
end $$;

-- Porcentaje de un cupón vigente (null = no sirve). Interna: la app la usa al armar el pedido.
create or replace function public.cfx_desc_pct(p_negocio uuid, p_codigo text) returns int
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.cfx_fid_ok(p_negocio, 'cupones') then return null; end if;
  return (select c.porcentaje from public.cfx_descuentos c
          where c.owner_id = p_negocio and c.codigo = public.cfx_desc_codigo(p_codigo) and c.activo and (c.hasta is null or c.hasta >= current_date));
end $$;

-- Suma un uso (la app la llama cuando el pedido ya quedó guardado).
create or replace function public.cfx_desc_usar(p_negocio uuid, p_codigo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.cfx_descuentos set usos = usos + 1 where owner_id = p_negocio and codigo = public.cfx_desc_codigo(p_codigo);
end $$;

-- El cliente prueba un cupón: devuelve el porcentaje o avisa que no sirve.
create or replace function public.cfx_desc_validar(p_negocio uuid, p_codigo text) returns int
language plpgsql stable security definer set search_path = '' as $$
declare pct int;
begin
  if not public.cfx_modulo('cupones') then raise exception 'Cupón no válido o vencido'; end if;
  if not coalesce(public.cfx_fid_cliente(auth.uid(), p_negocio), false) then raise exception 'Sin permiso'; end if;
  pct := public.cfx_desc_pct(p_negocio, p_codigo);
  if pct is null then raise exception 'Cupón no válido o vencido'; end if;
  return pct;
end $$;

-- ---------- Tarjeta de sellos ----------
-- El negocio la arma (meta 2-30 y premio) o la apaga (meta null).
create or replace function public.cfx_sellos_guardar(p_meta int, p_premio text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n uuid;
begin
  if p_meta is null then
    n := public.cfx_fid_dueno(auth.uid());
    if n is null then raise exception 'Solo el negocio'; end if;
    delete from public.cfx_sellos_cfg where owner_id = n;
    return null;
  end if;
  n := public.cfx_fid_mio('sellos');
  if p_meta < 2 or p_meta > 30 then raise exception 'La tarjeta debe tener entre 2 y 30 sellos'; end if;
  insert into public.cfx_sellos_cfg (owner_id, meta, premio) values (n, p_meta, nullif(left(trim(coalesce(p_premio, '')), 80), ''))
  on conflict (owner_id) do update set meta = excluded.meta, premio = excluded.premio;
  return public.cfx_sellos_cfg_de(n);
end $$;

-- La tarjeta del negocio {meta, premio} (null = no tiene, módulo apagado o su plan no la incluye).
create or replace function public.cfx_sellos_cfg_de(p_negocio uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.cfx_fid_ok(p_negocio, 'sellos') then return null; end if;
  return (select jsonb_build_object('meta', c.meta, 'premio', c.premio) from public.cfx_sellos_cfg c where c.owner_id = p_negocio);
end $$;

-- Mis sellos en un negocio: {cantidad, premios, meta, premio} o null.
create or replace function public.cfx_sellos_mios(p_negocio uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c jsonb := public.cfx_sellos_cfg_de(p_negocio);
begin
  if c is null then return null; end if;
  if not coalesce(public.cfx_fid_cliente(auth.uid(), p_negocio), false) then return null; end if;
  return c || coalesce((select jsonb_build_object('cantidad', s.cantidad, 'premios', s.premios) from public.cfx_sellos s
                        where s.negocio_id = p_negocio and s.cliente_id = auth.uid()), jsonb_build_object('cantidad', 0, 'premios', 0));
end $$;

-- Suma un sello (al entregar una compra). Al llegar a la meta: vuelve a 0, suma un premio y avisa. Devuelve {cantidad, premio} o null.
create or replace function public.cfx_sello_sumar(p_negocio uuid, p_cliente uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c jsonb := public.cfx_sellos_cfg_de(p_negocio); s public.cfx_sellos;
begin
  if c is null or p_cliente is null then return null; end if;
  insert into public.cfx_sellos (negocio_id, cliente_id, cantidad) values (p_negocio, p_cliente, 1)
  on conflict (negocio_id, cliente_id) do update set cantidad = public.cfx_sellos.cantidad + 1, actualizado = now() returning * into s;
  if s.cantidad >= (c ->> 'meta')::int then
    update public.cfx_sellos set cantidad = 0, premios = premios + 1 where negocio_id = p_negocio and cliente_id = p_cliente;
    perform public.cfx_sellos_aviso(p_negocio, p_cliente, c ->> 'premio');
    return jsonb_build_object('cantidad', 0, 'premio', true);
  end if;
  return jsonb_build_object('cantidad', s.cantidad, 'premio', false);
end $$;

-- Al borrar un negocio (lo llama la app): sus cupones, su tarjeta y los sellos de sus clientes.
create or replace function public.cfx_fid_borrar(p_negocio uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.cfx_descuentos where owner_id = p_negocio;
  delete from public.cfx_sellos_cfg where owner_id = p_negocio;
  delete from public.cfx_sellos where negocio_id = p_negocio;
end $$;

revoke all on function public.cfx_desc_codigo(text), public.cfx_fid_mio(text), public.cfx_fid_ok(uuid, text), public.cfx_desc_pct(uuid, text),
  public.cfx_desc_usar(uuid, text), public.cfx_sellos_cfg_de(uuid), public.cfx_sello_sumar(uuid, uuid), public.cfx_fid_borrar(uuid)
  from public, anon, authenticated;
revoke all on function public.cfx_desc_guardar(text, int, date), public.cfx_desc_borrar(uuid), public.cfx_desc_lista(), public.cfx_desc_validar(uuid, text),
  public.cfx_sellos_guardar(int, text), public.cfx_sellos_mios(uuid) from public, anon;
grant execute on function public.cfx_desc_guardar(text, int, date), public.cfx_desc_borrar(uuid), public.cfx_desc_lista(), public.cfx_desc_validar(uuid, text),
  public.cfx_sellos_guardar(int, text), public.cfx_sellos_mios(uuid) to authenticated;
