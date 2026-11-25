
-- ═══ G160 🧩 TIPO DE VENTA (núcleo) ═══
-- 📦 producto (stock + retiro/despacho) · 🛠️ servicio (local/domicilio/en línea) · 🔑 digital (llega al validar el pago).
-- Tipo automático si el dueño no lo eligió: con stock (aunque sea 0) → 📦 (nunca se pierde un stock) · nombre/categoría → 🛠️ o 🔑 · resto → 📦.
-- NO depende solo de la categoría: el nombre también cuenta y el dueño siempre puede cambiarlo (tipo_manual).
create or replace function public.cfx_tipo_adivinar(p_nombre text, p_categoria text default '', p_stock numeric default null) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_stock is not null then 'producto'
    when lower(coalesce(p_nombre, '') || ' ' || coalesce(p_categoria, '')) ~ '(licencia|\mkey\M|c[oó]digo de acceso|acceso digital|activaci[oó]n|suscripci|curso online|curso en l[ií]nea|e-?book|descargable|gift ?card digital)' then 'digital'
    when lower(coalesce(p_nombre, '') || ' ' || coalesce(p_categoria, '')) ~ '(servic|manten|diagn|asesor|clase|corte|reparac|instalaci|consult|visita|revisi[oó]n|limpieza|lavado|afinad|ajuste|taller de|sesi[oó]n|tratamiento|masaje|barba|peinado|tintura)' then 'servicio'
    else 'producto' end
$$;
grant execute on function public.cfx_tipo_adivinar(text, text, numeric) to anon, authenticated;

-- 🔑 CLAVES DE UN SOLO USO: cada acceso digital entregado lleva una clave que se amarra a UNA cuenta al canjearla.
--   ref = identificador secreto del comprador sin cuenta (token del pedido) · pedido = referencia visible para el dueño.
create table if not exists public.cfx_claves (
  id           uuid primary key default gen_random_uuid(),
  negocio      uuid not null,
  item         text not null default '',
  nombre       text not null default '',
  pedido       text not null default '',
  ref          text,
  acceso       text not null default '',
  clave        text not null unique,
  canjeado_por uuid,
  canjeado_ref text,
  canjeado_at  timestamptz,
  anulada_at   timestamptz,
  reemplaza    uuid,
  created_at   timestamptz not null default now()
);
create index if not exists cfx_claves_negocio on public.cfx_claves (negocio, created_at desc);
alter table public.cfx_claves enable row level security;
revoke all on public.cfx_claves from anon, authenticated;

-- Clave legible al azar: XXXX-XXXX-XXXX (sin 0/O/1/I para dictarla sin errores).
create or replace function public.cfx_clave_nueva() returns text
language plpgsql volatile set search_path = '' as $$
declare a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; s text := ''; i int;
begin
  for i in 1..12 loop
    s := s || substr(a, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 32), 1);
    if i in (4, 8) then s := s || '-'; end if;
  end loop;
  return s;
end $$;

-- Interna (la llama el servidor de cada app al liberar el pago). Nunca la llama la pantalla.
create or replace function public.cfx_clave_emitir(p_negocio uuid, p_item text, p_nombre text, p_pedido text, p_ref text, p_acceso text, p_reemplaza uuid default null) returns text
language plpgsql security definer set search_path = '' as $$
declare k text; n int := 0;
begin
  loop
    k := public.cfx_clave_nueva(); n := n + 1;
    begin
      insert into public.cfx_claves (negocio, item, nombre, pedido, ref, acceso, clave, reemplaza)
      values (p_negocio, left(coalesce(p_item, ''), 80), left(coalesce(p_nombre, ''), 120), left(coalesce(p_pedido, ''), 80), p_ref, left(coalesce(p_acceso, ''), 500), k, p_reemplaza);
      return k;
    exception when unique_violation then if n > 5 then raise; end if;
    end;
  end loop;
end $$;
revoke all on function public.cfx_clave_nueva(), public.cfx_clave_emitir(uuid, text, text, text, text, text, uuid) from public, anon, authenticated;

-- El cliente canjea: queda amarrada a su cuenta (o, sin cuenta, al token secreto de su pedido). Otra cuenta → "ya fue usada".
create or replace function public.cfx_clave_canjear(p_clave text, p_ref text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.cfx_claves; u uuid := auth.uid(); k text := upper(regexp_replace(coalesce(p_clave, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if char_length(k) <> 12 then return jsonb_build_object('ok', false, 'error', 'Revisa la clave (12 letras y números)'); end if;
  k := substr(k, 1, 4) || '-' || substr(k, 5, 4) || '-' || substr(k, 9, 4);
  select * into c from public.cfx_claves where clave = k for update;
  if c.id is null then return jsonb_build_object('ok', false, 'error', 'Clave no encontrada'); end if;
  if c.anulada_at is not null then return jsonb_build_object('ok', false, 'error', 'Esta clave fue anulada: pide la nueva a la tienda'); end if;
  if c.canjeado_at is not null then
    if (u is not null and c.canjeado_por = u) or (u is null and c.canjeado_por is null and p_ref is not null and c.canjeado_ref = p_ref) then
      return jsonb_build_object('ok', true, 'nombre', c.nombre, 'acceso', c.acceso, 'ya', true);
    end if;
    return jsonb_build_object('ok', false, 'error', 'Esta clave ya fue usada');
  end if;
  if u is null and (p_ref is null or c.ref is null or p_ref <> c.ref) then return jsonb_build_object('ok', false, 'error', 'Entra a tu cuenta para canjear la clave'); end if;
  update public.cfx_claves set canjeado_por = u, canjeado_ref = case when u is null then p_ref end, canjeado_at = now() where id = c.id;
  return jsonb_build_object('ok', true, 'nombre', c.nombre, 'acceso', c.acceso);
end $$;
grant execute on function public.cfx_clave_canjear(text, text) to anon, authenticated;

-- El dueño ve a quién se entregó cada clave (p_pedido opcional).
create or replace function public.cfx_clave_lista(p_negocio uuid, p_pedido text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.cfx_negocio_dueno(p_negocio) is distinct from auth.uid() then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre, 'pedido', c.pedido, 'clave', c.clave, 'fecha', c.created_at,
      'canjeado_at', c.canjeado_at, 'anulada', c.anulada_at is not null,
      'quien', case when c.canjeado_por is not null then (select coalesce(nullif(u.raw_user_meta_data ->> 'nombre', ''), u.email) from auth.users u where u.id = c.canjeado_por)
                    when c.canjeado_at is not null then 'Comprador sin cuenta' end) order by c.created_at desc)
    from (select * from public.cfx_claves where negocio = p_negocio and (p_pedido is null or pedido = p_pedido) order by created_at desc limit 200) c), '[]'::jsonb);
end $$;
grant execute on function public.cfx_clave_lista(uuid, text) to authenticated;

-- 🔄 Reponer: la vieja queda ANULADA (no se borra) y nace una nueva con el mismo acceso. Gancho opcional por app: cfx_clave_repuesta_app(vieja, nueva).
create or replace function public.cfx_clave_reponer(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.cfx_claves; k text;
begin
  select * into c from public.cfx_claves where id = p_id for update;
  if c.id is null or auth.uid() is null or public.cfx_negocio_dueno(c.negocio) is distinct from auth.uid() then return jsonb_build_object('ok', false, 'error', 'Clave no encontrada'); end if;
  if c.anulada_at is not null then return jsonb_build_object('ok', false, 'error', 'Esa clave ya fue anulada'); end if;
  update public.cfx_claves set anulada_at = now() where id = c.id;
  k := public.cfx_clave_emitir(c.negocio, c.item, c.nombre, c.pedido, c.ref, c.acceso, c.id);
  if to_regprocedure('public.cfx_clave_repuesta_app(text, text)') is not null then
    execute 'select public.cfx_clave_repuesta_app($1, $2)' using c.clave, k;
  end if;
  return jsonb_build_object('ok', true, 'clave', k);
end $$;
grant execute on function public.cfx_clave_reponer(uuid) to authenticated;
