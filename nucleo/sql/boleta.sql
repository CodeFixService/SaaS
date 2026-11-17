-- ---------------------------------------------------------------------
-- 🧾 Boleta SII del núcleo (G92, desde Despega): el negocio guarda sus datos de emisor y emite la boleta de una venta.
--   Manual: la emite gratis en el SII y anota el N° (folio). Automática: con su API key de OpenFactura (Haulmer) la boleta
--   electrónica (tipo 39, precios con IVA) sale sola. La API key queda solo en la base (al dueño se le muestran 4 caracteres).
--   Gancho por app: cfx_boleta_negocio_app(p_dueno) → negocio de quien llama (null = sin permiso). Cada app lo redefine DESPUÉS
--   de este bloque; el de aquí no da permiso a nadie. Los montos SIEMPRE salen de la base (la app manda solo la venta: ref).
--   Despega mantiene su boleta_* propia (pedidos de la tienda online).
-- ---------------------------------------------------------------------
create table if not exists public.cfx_boleta_cuentas (
  negocio_id uuid primary key,
  modo       text not null default 'manual' check (modo in ('manual', 'openfactura')),
  apikey     text,
  rut        text not null,
  razon      text not null,
  giro       text not null,
  direccion  text not null,
  comuna     text not null,
  auto       boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.cfx_boleta_cuentas enable row level security;
revoke all on public.cfx_boleta_cuentas from anon, authenticated;
create table if not exists public.cfx_boletas (
  negocio_id uuid not null,
  ref        text not null check (ref ~ '^[A-Za-z0-9_:-]{4,80}$'),
  total      numeric not null default 0,
  folio      text,
  url        text,
  error      text,
  intentos   int not null default 0,
  created_at timestamptz not null default now(),
  primary key (negocio_id, ref)
);
alter table public.cfx_boletas enable row level security;
revoke all on public.cfx_boletas from anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_proc where proname = 'cfx_boleta_negocio_app' and pronamespace = 'public'::regnamespace) then
    execute 'create function public.cfx_boleta_negocio_app(p_dueno boolean) returns uuid language sql stable as $f$ select null::uuid $f$';
  end if;
end $$;

-- RUT normal '12345678-5' o null (dígito verificador con cfx_rut_ok).
create or replace function public.cfx_rut_normal(p text) returns text
language sql immutable set search_path = '' as $$
  select case when public.cfx_rut_ok(r) and r ~ '^[0-9]{7,8}[0-9K]$' then ltrim(left(r, -1), '0') || '-' || right(r, 1) end
  from (select upper(regexp_replace(coalesce(p, ''), '[^0-9kK]', '', 'g')) r) x
$$;

create or replace function public.cfx_boleta_estado() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n uuid := public.cfx_boleta_negocio_app(false); d boolean := public.cfx_boleta_negocio_app(true) is not null; b public.cfx_boleta_cuentas;
begin
  if n is null then return jsonb_build_object('puede', false); end if;
  select * into b from public.cfx_boleta_cuentas where negocio_id = n;
  return jsonb_build_object('puede', true, 'dueno', d, 'conectado', b.negocio_id is not null, 'modo', coalesce(b.modo, 'manual'), 'rut', b.rut, 'razon', b.razon,
    'giro', b.giro, 'direccion', b.direccion, 'comuna', b.comuna, 'auto', coalesce(b.auto, true), 'fin', case when d then right(b.apikey, 4) end);
end $$;

-- El dueño guarda sus datos (p null = quitar). apikey vacía mantiene la anterior.
create or replace function public.cfx_boleta_guardar(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  n uuid := public.cfx_boleta_negocio_app(true); md text := coalesce(p ->> 'modo', 'manual'); rt text := public.cfx_rut_normal(p ->> 'rut');
  k text := nullif(regexp_replace(coalesce(p ->> 'apikey', ''), '\s', '', 'g'), ''); t text;
begin
  if n is null then raise exception 'Solo el dueño del negocio'; end if;
  if p is null then delete from public.cfx_boleta_cuentas where negocio_id = n; return public.cfx_boleta_estado(); end if;
  if md not in ('manual', 'openfactura') then raise exception 'Modo no válido'; end if;
  if rt is null then raise exception 'RUT no válido: revisa el número y el dígito verificador'; end if;
  foreach t in array array['razon', 'giro', 'direccion', 'comuna'] loop
    if length(trim(coalesce(p ->> t, ''))) < 2 then
      raise exception 'Falta %', case t when 'razon' then 'la razón social' when 'giro' then 'el giro' when 'direccion' then 'la dirección' else 'la comuna' end;
    end if;
  end loop;
  if k is not null and k !~ '^[A-Za-z0-9_-]{16,120}$' then raise exception 'Esa no parece una API key de OpenFactura'; end if;
  if md = 'openfactura' and k is null and not exists (select 1 from public.cfx_boleta_cuentas where negocio_id = n and apikey is not null) then
    raise exception 'Pega tu API key de OpenFactura';
  end if;
  insert into public.cfx_boleta_cuentas (negocio_id, modo, apikey, rut, razon, giro, direccion, comuna, auto)
  values (n, md, k, rt, left(trim(p ->> 'razon'), 100), left(trim(p ->> 'giro'), 80), left(trim(p ->> 'direccion'), 70), left(trim(p ->> 'comuna'), 20), coalesce((p ->> 'auto')::boolean, true))
  on conflict (negocio_id) do update set modo = excluded.modo, apikey = coalesce(excluded.apikey, public.cfx_boleta_cuentas.apikey), rut = excluded.rut, razon = excluded.razon,
    giro = excluded.giro, direccion = excluded.direccion, comuna = excluded.comuna, auto = excluded.auto, updated_at = now();
  return public.cfx_boleta_estado();
end $$;

-- Boleta tipo 39 en el formato de OpenFactura. items = [{ nombre, cant, subtotal }]; si suman más que el total, la diferencia va como descuento.
create or replace function public.cfx_boleta_dte(p_items jsonb, p_total numeric, c public.cfx_boleta_cuentas) returns jsonb
language plpgsql stable set search_path = '' as $$
declare det jsonb := '[]'::jsonb; l jsonb; n int := 0; suma numeric := 0; m numeric; q numeric; tot numeric := round(p_total); neto numeric; d numeric;
begin
  for l in select * from jsonb_array_elements(coalesce(p_items, '[]')) loop
    exit when n >= 59;
    q := greatest(coalesce((l ->> 'cant')::numeric, 1), 1); m := round(coalesce((l ->> 'subtotal')::numeric, 0));
    if m <= 0 then continue; end if;
    n := n + 1; suma := suma + m;
    det := det || jsonb_build_object('NroLinDet', n, 'NmbItem', left(coalesce(nullif(trim(l ->> 'nombre'), ''), 'Producto'), 80), 'QtyItem', q, 'PrcItem', round(m / q, 2), 'MontoItem', m);
  end loop;
  if suma < tot then n := n + 1; det := det || jsonb_build_object('NroLinDet', n, 'NmbItem', 'Otros', 'QtyItem', 1, 'PrcItem', tot - suma, 'MontoItem', tot - suma); suma := tot; end if;
  d := suma - tot; neto := round(tot / 1.19);
  return jsonb_build_object('response', jsonb_build_array('FOLIO', 'SELF_SERVICE'), 'dte', jsonb_build_object(
    'Encabezado', jsonb_build_object(
      'IdDoc', jsonb_build_object('TipoDTE', 39, 'Folio', 0, 'FchEmis', to_char(now() at time zone 'America/Santiago', 'YYYY-MM-DD'), 'IndServicio', 3),
      'Emisor', jsonb_build_object('RUTEmisor', c.rut, 'RznSocEmisor', c.razon, 'GiroEmisor', c.giro, 'DirOrigen', c.direccion, 'CmnaOrigen', c.comuna),
      'Receptor', jsonb_build_object('RUTRecep', '66666666-6'),
      'Totales', jsonb_build_object('MntNeto', neto, 'IVA', tot - neto, 'MntTotal', tot)),
    'Detalle', det) || case when d > 0 then jsonb_build_object('DscRcgGlobal', jsonb_build_array(
      jsonb_build_object('NroLinDR', 1, 'TpoMov', 'D', 'GlosaDR', 'Descuento', 'TpoValor', '$', 'ValorDR', d))) else '{}'::jsonb end);
end $$;

create or replace function public.cfx_of_api(p_key text, p_cuerpo jsonb, p_idem text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare st int; c text;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '15');
  execute 'select status, content from extensions.http(row($1, $2, $3, $4, $5)::extensions.http_request)' into st, c
    using 'POST', 'https://api.haulmer.com/v2/dte/document',
          array[row('apikey', p_key)::extensions.http_header, row('Idempotency-Key', p_idem)::extensions.http_header], 'application/json', p_cuerpo::text;
  return jsonb_build_object('status', st, 'body', case when c ~ '^\s*[\{\[]' then c::jsonb end);
exception when others then
  return jsonb_build_object('status', 0, 'error', sqlerrm);
end $$;

-- Interna (la llama la función de cada app, que ya revisó el permiso y armó los ítems DESDE LA BASE).
-- p_folio = N° anotado a mano (modo manual); null = OpenFactura. Una boleta por venta: si ya tiene folio, la devuelve.
create or replace function public.cfx_boleta_crear(p_negocio uuid, p_ref text, p_items jsonb, p_total numeric, p_folio text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.cfx_boleta_cuentas; b public.cfx_boletas; r jsonb; f text; e text; fm text := nullif(regexp_replace(coalesce(p_folio, ''), '\D', '', 'g'), '');
begin
  if p_negocio is null or p_ref !~ '^[A-Za-z0-9_:-]{4,80}$' then raise exception 'Venta no válida'; end if;
  select * into b from public.cfx_boletas where negocio_id = p_negocio and ref = p_ref;
  if b.folio is not null and (b.url is not null or fm is null) then return jsonb_build_object('ok', true, 'folio', b.folio, 'url', b.url); end if;
  if round(coalesce(p_total, 0)) < 1 then raise exception 'La venta no tiene monto'; end if;
  select * into c from public.cfx_boleta_cuentas where negocio_id = p_negocio;
  if fm is not null or c.negocio_id is null or c.modo <> 'openfactura' then
    if fm is null then return jsonb_build_object('ok', false, 'manual', true, 'error', 'Escribe el N° (folio) de la boleta del SII'); end if;
    if length(fm) > 10 then raise exception 'El N° de boleta tiene hasta 10 dígitos'; end if;
    insert into public.cfx_boletas (negocio_id, ref, total, folio) values (p_negocio, p_ref, round(p_total), fm)
    on conflict (negocio_id, ref) do update set folio = excluded.folio, total = excluded.total, error = null;
    return jsonb_build_object('ok', true, 'folio', fm);
  end if;
  if c.apikey is null then raise exception 'Pega tu API key de OpenFactura en 🧾 Boleta SII'; end if;
  r := public.cfx_of_api(c.apikey, public.cfx_boleta_dte(p_items, p_total, c), 'cfx-' || p_negocio::text || '-' || p_ref);
  f := nullif(coalesce(r #>> '{body,FOLIO}', r #>> '{body,folio}'), '');
  if coalesce((r ->> 'status')::int, 0) in (200, 201) and f is not null then
    insert into public.cfx_boletas (negocio_id, ref, total, folio, url) values (p_negocio, p_ref, round(p_total), left(f, 20),
      case when r #>> '{body,SELF_SERVICE,url}' ~ '^https://[^\s"<>]+$' then left(r #>> '{body,SELF_SERVICE,url}', 500) end)
    on conflict (negocio_id, ref) do update set folio = excluded.folio, url = excluded.url, total = excluded.total, error = null
    returning * into b;
    return jsonb_build_object('ok', true, 'folio', b.folio, 'url', b.url);
  end if;
  e := left(coalesce(case when (r ->> 'status')::int = 0 then 'No se pudo conectar con OpenFactura' end,
                     r #>> '{body,error,message}', r #>> '{body,message}', 'OpenFactura respondió ' || coalesce(r ->> 'status', '?')), 200);
  if (r ->> 'status')::int in (401, 403) then e := 'OpenFactura no aceptó la API key'; end if;
  insert into public.cfx_boletas (negocio_id, ref, total, error, intentos) values (p_negocio, p_ref, round(p_total), e, 1)
  on conflict (negocio_id, ref) do update set error = excluded.error, intentos = public.cfx_boletas.intentos + 1;
  return jsonb_build_object('ok', false, 'error', e);
end $$;
revoke all on function public.cfx_boleta_crear(uuid, text, jsonb, numeric, text), public.cfx_of_api(text, jsonb, text) from public, anon, authenticated;
revoke all on function public.cfx_boleta_estado(), public.cfx_boleta_guardar(jsonb) from public, anon;
grant execute on function public.cfx_boleta_estado(), public.cfx_boleta_guardar(jsonb) to authenticated;
