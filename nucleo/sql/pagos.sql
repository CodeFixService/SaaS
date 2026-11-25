-- ---------------------------------------------------------------------
-- CodeFix · Pagos (igual en las 6 apps; lo reparte nucleo/sincronizar.py). Se administra desde el Centro de Mando → Pagos.
--   Precios iguales en las 6: negocio (inicio, mensual, anual) y cliente (mensual, anual). Link de pago SIN monto (la persona
--   escribe el monto; se le suma el cargo por pago online, visible como una línea aparte), tarjeta (otro link, con su propio cargo)
--   o transferencia (precio exacto, sin cargo), y foto del comprobante. Tú apruebas y se activa el Premium por días enteros.
--   Liberar: por N días nadie queda bloqueado y las cuentas creadas en ese tiempo no pagan el primer pago (quedan en gratis).
--   El comprobante se borra al aprobar o rechazar (ya no sirve). Negocios nuevos: bloqueados hasta su primer pago (si está activado).
--   Cada app define antes: cfx_yo(), cfx_dar_premium(uuid, text, int), cfx_avisar(uuid, text, text) y cfx_avisar_admin(text, text).
-- ---------------------------------------------------------------------
create table if not exists public.cfx_config (clave text primary key, valor jsonb not null);

-- G112 c1 · 🔒 Llaves en Supabase Vault (cifradas DENTRO de la base: ni un respaldo ni una consulta a la tabla las muestra).
-- La tabla guarda solo la marca 'vault:<nombre>'; la llave real vive en vault.secrets. Sin Vault (base vieja o local) queda como antes.
create or replace function public.cfx_vault_hay() returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  return to_regclass('vault.decrypted_secrets') is not null and to_regclass('vault.secrets') is not null and exists (select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace s on s.oid = p.pronamespace where s.nspname = 'vault' and p.proname = 'create_secret');
end $$;
-- Guarda p_valor en Vault con el nombre p_nombre y devuelve la marca (o el mismo valor si no hay Vault o algo falla: nunca se pierde la llave).
create or replace function public.cfx_secreto_poner(p_nombre text, p_valor text) returns text
language plpgsql security definer set search_path = '' as $$
declare i uuid;
begin
  if p_valor is null or p_valor = '' or p_valor like 'vault:%' or not public.cfx_vault_hay() then return p_valor; end if;
  begin
    execute 'select id from vault.secrets where name = $1' into i using p_nombre;
    if i is null then execute 'select vault.create_secret($1, $2, $3)' using p_valor, p_nombre, 'CodeFix (G112 c1)';
    else execute 'select vault.update_secret($1, $2)' using i, p_valor; end if;
    return 'vault:' || p_nombre;
  exception when others then
    raise notice 'Vault no disponible (%): la llave queda como antes.', sqlerrm;
    return p_valor;
  end;
end $$;
-- Abre una llave guardada (si es la marca 'vault:…' la busca en Vault; si no, es la llave tal cual).
create or replace function public.cfx_secreto(p_valor text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare v text;
begin
  if p_valor is null or p_valor not like 'vault:%' then return p_valor; end if;
  if not public.cfx_vault_hay() then return null; end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into v using substr(p_valor, 7);
  return v;
end $$;
-- Borra de Vault las llaves cuyo nombre parte con p_prefijo (al desconectar).
create or replace function public.cfx_secreto_quitar(p_prefijo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(p_prefijo, '') = '' or not public.cfx_vault_hay() then return; end if;
  execute 'delete from vault.secrets where name like $1' using replace(replace(p_prefijo, '%', ''), '_', '\_') || '%';
exception when others then null;
end $$;
-- Abre los campos de llave de una configuración (token / apikey / secret).
create or replace function public.cfx_llaves(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare k text; r jsonb := p;
begin
  if p is null then return null; end if;
  foreach k in array array['token', 'apikey', 'secret'] loop
    if r ? k then r := jsonb_set(r, array[k], coalesce(to_jsonb(public.cfx_secreto(r ->> k)), 'null'::jsonb)); end if;
  end loop;
  return r;
end $$;
revoke all on function public.cfx_vault_hay(), public.cfx_secreto_poner(text, text), public.cfx_secreto(text), public.cfx_secreto_quitar(text),
  public.cfx_llaves(jsonb) from public, anon, authenticated;
alter table public.cfx_config enable row level security;
insert into public.cfx_config (clave, valor) values ('pagos', jsonb_build_object(
  'negocio', jsonb_build_object('inicio', 4900, 'inicio_dias', 30, 'mensual', 4900, 'anual', 49900, 'exigir_inicio', true),
  'cliente', jsonb_build_object('mensual', 3000, 'anual', 29900),
  'link', '', 'comision_pct', 0, 'whatsapp', '', 'tarjeta', jsonb_build_object('link', '', 'comision_pct', 0),
  'transferencia', jsonb_build_object('banco', '', 'tipo', '', 'numero', '', 'rut', '', 'titular', '', 'correo', ''),
  'inicio_desde', now()))
on conflict (clave) do nothing;

create table if not exists public.cfx_pagos (
  id          uuid primary key default gen_random_uuid(),
  cuenta      uuid not null,
  email       text not null default '',
  nombre      text not null default '',
  rol         text not null check (rol in ('negocio', 'cliente', 'otro')),
  periodo     text not null check (periodo in ('inicio', 'mensual', 'anual', 'otro')),
  monto       int not null check (monto between 1 and 100000000),
  medio       text not null check (medio in ('link', 'transferencia')),
  nota        text not null default '' check (length(nota) <= 300),
  comprobante text check (comprobante is null or (comprobante ~ '^data:image/(jpeg|png|webp);base64,' and length(comprobante) <= 400000)),
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  dias        int,
  motivo      text not null default '',
  creado      timestamptz not null default now(),
  resuelto    timestamptz
);
alter table public.cfx_pagos add column if not exists cupon text;
alter table public.cfx_pagos add column if not exists meses int check (meses is null or meses between 1 and 24);
-- G19: pago de un módulo o pack (null = Premium).
alter table public.cfx_pagos add column if not exists producto text check (producto is null or producto ~ '^[a-z_]{2,30}$');
alter table public.cfx_pagos drop constraint if exists cfx_pagos_medio_check;
alter table public.cfx_pagos add constraint cfx_pagos_medio_check check (medio in ('link', 'transferencia', 'tarjeta', 'mp', 'flow'));
-- G85 ⚡ Mercado Pago automático: cuándo se abrió y el n° de pago que lo confirmó (un pago de MP sirve una sola vez).
alter table public.cfx_pagos add column if not exists mp_desde timestamptz;
alter table public.cfx_pagos add column if not exists mp_pago text;
-- G87 K: hasta cuándo quedó activo · 🎁 regalo (en vez de activarse, crea una key de 1 uso) · key_regalo = la key (solo la ve quien pagó y el admin).
alter table public.cfx_pagos add column if not exists hasta timestamptz;
alter table public.cfx_pagos add column if not exists regalo boolean not null default false;
alter table public.cfx_pagos add column if not exists key_regalo text;
create unique index if not exists cfx_pagos_mp_pago_idx on public.cfx_pagos (mp_pago) where mp_pago is not null;
alter table public.cfx_pagos drop constraint if exists cfx_pagos_periodo_check;
alter table public.cfx_pagos add constraint cfx_pagos_periodo_check check (periodo in ('inicio', 'mensual', 'meses', 'anual', 'otro'));
create index if not exists cfx_pagos_cuenta_idx on public.cfx_pagos (cuenta, creado desc);
create index if not exists cfx_pagos_estado_idx on public.cfx_pagos (estado, creado);
alter table public.cfx_pagos enable row level security;
create table if not exists public.cfx_exentos (cuenta uuid primary key, nota text not null default '', creado timestamptz not null default now());
alter table public.cfx_exentos enable row level security;
revoke all on public.cfx_config, public.cfx_pagos, public.cfx_exentos from anon, authenticated;

-- G85: ¿Está prendido el pago automático con Mercado Pago? (el token nunca sale de la base)
create or replace function public.cfx_mp_on() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select coalesce(valor ->> 'token', '') <> '' and coalesce((valor ->> 'activo')::boolean, false) from public.cfx_config where clave = 'mp'), false)
$$;
revoke all on function public.cfx_mp_on() from public, anon, authenticated;
-- G38 ⚡ Flow (Webpay + transferencia + MACH en una sola cuenta): ¿está prendido? (las llaves nunca salen de la base)
create or replace function public.cfx_flow_on() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select coalesce(valor ->> 'apikey', '') <> '' and coalesce(valor ->> 'secret', '') <> '' and coalesce((valor ->> 'activo')::boolean, false)
    from public.cfx_config where clave = 'flow'), false)
$$;
revoke all on function public.cfx_flow_on() from public, anon, authenticated;

-- ¿Cómo estoy? Precios, mi rol, si debo el primer pago y mi último pago.
create or replace function public.cfx_pago_estado() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c jsonb := (select valor from public.cfx_config where clave = 'pagos'); y jsonb := public.cfx_yo(); pagado boolean; debe boolean; bloq boolean;
        lib jsonb := (select valor from public.cfx_config where clave = 'liberar'); ld timestamptz := (lib ->> 'desde')::timestamptz; lh timestamptz := (lib ->> 'hasta')::timestamptz;
begin
  if y is null or (y ->> 'id') is null then raise exception 'Inicia sesión'; end if;
  pagado := exists (select 1 from public.cfx_pagos where cuenta = (y ->> 'id')::uuid and estado = 'aprobado')
    or exists (select 1 from public.cfx_exentos where cuenta = (y ->> 'id')::uuid);
  -- debe_inicio: cuenta nueva (desde que activaste la regla) sin primer pago. bloqueado: además es un negocio.
  -- Solo si ya hay una forma de pago configurada (si no, nadie podría pagar).
  debe := coalesce((c #>> '{negocio,exigir_inicio}')::boolean, false) and not pagado
     and (coalesce(c ->> 'link', '') <> '' or coalesce(c #>> '{transferencia,numero}', '') <> '' or coalesce(c #>> '{tarjeta,link}', '') <> '' or public.cfx_mp_on() or public.cfx_flow_on())
     and (y ->> 'creado')::timestamptz > coalesce((c ->> 'inicio_desde')::timestamptz, now())
     -- Liberado: mientras dure nadie queda bloqueado; las cuentas creadas en ese tiempo quedan en gratis sin primer pago.
     and not (lh is not null and (now() < lh or (y ->> 'creado')::timestamptz between coalesce(ld, '-infinity') and lh));
  bloq := debe and y ->> 'rol' = 'negocio';
  return jsonb_build_object('config', c - 'inicio_desde', 'yo', y, 'pagado', pagado, 'bloqueado', bloq, 'debe_inicio', debe,
    'liberado_hasta', case when lh > now() then lh end, 'mp', public.cfx_mp_on(), 'flow', public.cfx_flow_on(),
    'prueba_pro', public.cfx_pro_prueba(y),  -- G95
    'subs', public.cfx_mp_subs_de((y ->> 'id')::uuid),  -- G108 🔁
    'ultimo', (select to_jsonb(x) from (select id, periodo, monto, medio, estado, dias, motivo, creado, resuelto, hasta, producto, regalo from public.cfx_pagos
               where cuenta = (y ->> 'id')::uuid order by creado desc limit 1) x),
    -- G87 K: 🔑 keys que compré (🎁 regalo o respaldo), con si ya se usaron.
    'keys', (select coalesce(jsonb_agg(jsonb_build_object('key', p.key_regalo, 'producto', p.producto, 'dias', p.dias, 'regalo', p.regalo, 'creado', p.resuelto,
               'usada', k.usada_at is not null) order by p.resuelto desc), '[]') from public.cfx_pagos p
               left join public.cfx_keys k on k.hash = encode(sha256(convert_to(p.key_regalo, 'UTF8')), 'hex')
               where p.cuenta = (y ->> 'id')::uuid and p.key_regalo is not null and p.resuelto > now() - interval '1 year'));
end $$;

drop function if exists public.cfx_pago_pedir(text, int, text, text, text);
drop function if exists public.cfx_pago_pedir(text, int, text, text, text, text);
drop function if exists public.cfx_pago_pedir(text, int, text, text, text, text, int);  -- G36: la de 7 dejaba 2 versiones ("Could not choose the best candidate")
drop function if exists public.cfx_pago_pedir(text, int, text, text, text, text, int, text);
create or replace function public.cfx_pago_pedir(p_periodo text, p_monto int, p_medio text, p_comprobante text, p_nota text default '', p_cupon text default null, p_meses int default null, p_producto text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); i uuid; cup text := nullif(upper(trim(coalesce(p_cupon, ''))), '');
begin
  if y is null or (y ->> 'id') is null then raise exception 'Inicia sesión'; end if;
  if y ->> 'rol' not in ('negocio', 'cliente') and p_periodo <> 'otro' then raise exception 'Pide al dueño de la cuenta que haga el pago'; end if;
  if p_periodo not in ('inicio', 'mensual', 'meses', 'anual', 'otro') or p_medio not in ('link', 'transferencia', 'tarjeta') then raise exception 'Datos no válidos'; end if;
  if p_periodo = 'meses' and coalesce(p_meses, 0) not between 2 and 11 then raise exception 'Elige de 2 a 11 meses'; end if;
  -- Módulo o pack (G19): solo el dueño del negocio, 1 mes o 1 año, y que se venda en esta app.
  if p_producto is not null then
    if public.cfx_negocio_cuenta((y ->> 'id')::uuid) is distinct from (y ->> 'id')::uuid then raise exception 'Pide al dueño del negocio que haga el pago'; end if;
    if p_periodo not in ('mensual', 'anual') or not coalesce((public.cfx_venta() ->> 'activo')::boolean, false) or cardinality(public.cfx_venta_modulos(p_producto)) = 0 then raise exception 'Módulo no válido'; end if;
    if public.cfx_modulo_pronto(p_producto) is not null then raise exception '🔜 Todavía no disponible: %', public.cfx_modulo_pronto(p_producto); end if;  -- G163
  end if;
  if coalesce(p_monto, 0) < 1 then raise exception 'Escribe el monto que pagaste'; end if;
  if coalesce(length(p_comprobante), 0) < 200 then raise exception 'Sube la foto del comprobante'; end if;
  if cup is not null then perform public.cfx_cupon_ver(cup); end if;
  if exists (select 1 from public.cfx_pagos where cuenta = (y ->> 'id')::uuid and estado = 'pendiente' and medio not in ('mp', 'flow')) then raise exception 'Ya tienes un pago en revisión. Te avisamos apenas se apruebe.'; end if;
  if (select count(*) from public.cfx_pagos where cuenta = (y ->> 'id')::uuid and creado > now() - interval '1 day' and medio not in ('mp', 'flow')) >= 5 then raise exception 'Demasiados intentos hoy. Escribe a soporte.'; end if;
  insert into public.cfx_pagos (cuenta, email, nombre, rol, periodo, monto, medio, nota, comprobante, cupon, meses, producto)
  values ((y ->> 'id')::uuid, coalesce(y ->> 'email', ''), left(coalesce(y ->> 'nombre', ''), 80), case when y ->> 'rol' in ('negocio', 'cliente') then y ->> 'rol' else 'otro' end,
          p_periodo, p_monto, p_medio, left(coalesce(p_nota, ''), 300), p_comprobante, cup, case when p_periodo = 'meses' then p_meses end, p_producto)
  returning id into i;
  -- Aviso al tiro: al Centro de Mando si la app está vinculada (si no, al administrador de esta app).
  perform public.cfx_al_cm('💳 Pago por revisar', coalesce(nullif(y ->> 'nombre', ''), y ->> 'email') || ' · $' || p_monto || coalesce(' · 🧩 ' || p_producto, '') || ' (' || case p_periodo when 'meses' then p_meses || ' meses' else p_periodo end || ', ' || p_medio || ')' || coalesce(' · cupón ' || cup, ''), 'pago');
  return i;
end $$;

-- Precios públicos (para la portada, sin iniciar sesión).
create or replace function public.cfx_precios() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('negocio', valor -> 'negocio', 'cliente', valor -> 'cliente', 'comision_pct', valor -> 'comision_pct',
    'liberado_hasta', (select case when (l.valor ->> 'hasta')::timestamptz > now() then l.valor -> 'hasta' end from public.cfx_config l where l.clave = 'liberar'))
  from public.cfx_config where clave = 'pagos'
$$;
revoke all on function public.cfx_precios() from public;
grant execute on function public.cfx_precios() to anon, authenticated;

-- ---------- Administrador (lo llama el Centro de Mando) ----------
create or replace function public.cfx_pagos_config() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return (select valor from public.cfx_config where clave = 'pagos');
end $$;

create or replace function public.cfx_pagos_config_guardar(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb := (select valor from public.cfx_config where clave = 'pagos');
begin
  perform <CHK>;
  if jsonb_typeof(p) <> 'object' then raise exception 'Datos no válidos'; end if;
  if coalesce(p ->> 'link', '') <> '' and (p ->> 'link') !~ '^https://[^ ]+$' then raise exception 'El link de pago debe empezar con https://'; end if;
  if coalesce((p ->> 'comision_pct')::numeric, 0) not between 0 and 20 or coalesce((p #>> '{tarjeta,comision_pct}')::numeric, 0) not between 0 and 20 then raise exception 'El cargo por pago online va de 0 a 20 %%'; end if;
  if coalesce(p #>> '{tarjeta,link}', '') <> '' and (p #>> '{tarjeta,link}') !~ '^https://[^ ]+$' then raise exception 'El link de tarjeta debe empezar con https://'; end if;
  -- Al activar "bloquear hasta el primer pago", solo aplica a los negocios que se registren desde ahora.
  -- También cuando se configura la primera forma de pago (antes nadie podía pagar, así que nadie quedó obligado).
  if coalesce((p #>> '{negocio,exigir_inicio}')::boolean, false) and (not coalesce((v #>> '{negocio,exigir_inicio}')::boolean, false)
     or (coalesce(v ->> 'link', '') = '' and coalesce(v #>> '{transferencia,numero}', '') = '' and coalesce(v #>> '{tarjeta,link}', '') = ''
         and (coalesce(p ->> 'link', '') <> '' or coalesce(p #>> '{transferencia,numero}', '') <> '' or coalesce(p #>> '{tarjeta,link}', '') <> ''))) then
    p := p || jsonb_build_object('inicio_desde', now());
  end if;
  v := v || (p - 'inicio_desde') || case when p ? 'inicio_desde' then jsonb_build_object('inicio_desde', p -> 'inicio_desde') else '{}'::jsonb end;
  update public.cfx_config set valor = v where clave = 'pagos';
  return v;
end $$;

create or replace function public.cfx_pagos_lista(p_estado text default 'pendiente') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return (select coalesce(jsonb_agg(x order by x.creado desc), '[]') from (
    select id, cuenta, email, nombre, rol, periodo, meses, producto, monto, medio, mp_pago, nota, estado, dias, motivo, creado, resuelto, comprobante is not null as con_comprobante, hasta, regalo, key_regalo,
      public.cfx_dias_sugeridos(g) as sugeridos,
      (select count(*) from public.cfx_pagos z where z.cuenta = g.cuenta and z.estado = 'aprobado') as aprobados
    from public.cfx_pagos g where p_estado = 'todos' or estado = p_estado order by creado desc limit 200) x);
end $$;

create or replace function public.cfx_pago_comprobante(p_id uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return (select comprobante from public.cfx_pagos where id = p_id);
end $$;

-- Días que corresponden a un pago (siempre días enteros): mensual 30, anual 365, N meses = N × 30, primer pago lo configurado,
-- y "otro monto" en proporción al precio mensual (sin contar el cargo por pago online).
create or replace function public.cfx_dias_sugeridos(g public.cfx_pagos) returns int
language plpgsql stable security definer set search_path = '' as $$
declare c jsonb := (select valor from public.cfx_config where clave = 'pagos'); m numeric; pct numeric; neto numeric;
begin
  if g.periodo = 'inicio' then return coalesce((c #>> '{negocio,inicio_dias}')::int, 30); end if;
  if g.periodo = 'mensual' then return 30; end if;
  if g.periodo = 'anual' then return 365; end if;
  if g.periodo = 'meses' then return 30 * coalesce(g.meses, 1); end if;
  m := nullif((c #>> array[case when g.rol = 'cliente' then 'cliente' else 'negocio' end, 'mensual'])::numeric, 0);
  pct := case g.medio when 'link' then coalesce((c ->> 'comision_pct')::numeric, 0) when 'tarjeta' then coalesce((c #>> '{tarjeta,comision_pct}')::numeric, 0) else 0 end;
  neto := g.monto / (1 + pct / 100);
  return case when m is null then 0 else least(3660, floor(neto * 30 / m))::int end;
end $$;
revoke all on function public.cfx_dias_sugeridos(public.cfx_pagos) from public, anon, authenticated;

-- G87 K · 🔑 Key de 1 uso con lo que se pagó (Premium o módulo/pack, los mismos días). Sirve para 🎁 regalar a otra cuenta y de
-- respaldo si la activación automática falla: el pago queda aprobado con su key (la persona la canjea en Premium/🧩 Módulos).
create or replace function public.cfx_pago_key(g public.cfx_pagos, p_dias int, p_estado text, p_motivo text) returns text
language plpgsql security definer set search_path = '' as $$
declare c text := upper(replace(gen_random_uuid()::text, '-', ''));
begin
  c := 'CFX-' || substr(c, 1, 4) || '-' || substr(c, 5, 4) || '-' || substr(c, 9, 4);
  insert into public.cfx_keys (hash, ultimos, rol, dias, nota, item)
  values (encode(sha256(convert_to(c, 'UTF8')), 'hex'), right(c, 4), case when g.producto is not null then 'negocio' when g.rol = 'cliente' then 'cliente' else 'negocio' end,
          greatest(1, least(3660, p_dias)), left(case when g.regalo then '🎁 Regalo de ' else '🔑 Respaldo de ' end || coalesce(nullif(g.email, ''), g.cuenta::text), 120), coalesce(g.producto, ''));
  update public.cfx_pagos set estado = p_estado, dias = p_dias, key_regalo = c, motivo = left(coalesce(p_motivo, ''), 200), resuelto = now(), comprobante = null where id = g.id;
  perform public.cfx_avisar(g.cuenta, case when g.regalo then '🎁 Tu key de regalo está lista' else '🔑 Tu pago quedó con una key' end,
    'Key ' || c || ' (' || case when g.producto is not null then '🧩 ' || g.producto else 'Premium' end || ', ' || p_dias || ' días). Se canjea en Premium → ¿Tienes una key?');
  return c;
end $$;
revoke all on function public.cfx_pago_key(public.cfx_pagos, int, text, text) from public, anon, authenticated;

-- Aprueba un pago pendiente y activa lo que pagó (lo usan el administrador y el pago automático de Mercado Pago).
create or replace function public.cfx_pago_aprobar(p_id uuid, p_dias int default null, p_motivo text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare g public.cfx_pagos; d int; h timestamptz;
begin
  select * into g from public.cfx_pagos where id = p_id and estado = 'pendiente' for update;
  if g.id is null then raise exception 'Pago no encontrado o ya resuelto'; end if;
  d := coalesce(p_dias, public.cfx_dias_sugeridos(g));
  if d < 0 or d > 3660 then raise exception 'Días no válidos'; end if;
  if g.regalo and d > 0 then
    perform public.cfx_pago_key(g, d, 'aprobado', p_motivo);
    return jsonb_build_object('estado', 'aprobado', 'dias', d, 'hasta', null, 'regalo', true);
  end if;
  if d > 0 and g.producto is not null then h := public.cfx_modulos_dar(public.cfx_negocio_cuenta(g.cuenta), g.producto, d, 'pago');
  elsif d > 0 then h := public.cfx_dar_premium(g.cuenta, g.rol, d); end if;
  update public.cfx_pagos set estado = 'aprobado', dias = d, hasta = h, motivo = left(coalesce(p_motivo, ''), 200), resuelto = now(), comprobante = null where id = p_id;
  perform public.cfx_avisar(g.cuenta, '✅ Pago aprobado', case when h is not null then case when g.producto is not null then '🧩 Módulo activo' else 'Premium activo' end || ' hasta el ' || to_char(h at time zone 'America/Santiago', 'DD/MM/YYYY') || '. ¡Gracias!' else 'Gracias, tu pago quedó registrado.' end);
  return jsonb_build_object('estado', 'aprobado', 'dias', d, 'hasta', h);
end $$;
revoke all on function public.cfx_pago_aprobar(uuid, int, text) from public, anon, authenticated;

create or replace function public.cfx_pago_resolver(p_id uuid, p_aprobar boolean, p_dias int default null, p_motivo text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare g public.cfx_pagos; d int; hasta timestamptz;
begin
  perform <CHK>;
  select * into g from public.cfx_pagos where id = p_id and estado = 'pendiente' for update;
  if g.id is null then raise exception 'Pago no encontrado o ya resuelto'; end if;
  d := coalesce(p_dias, public.cfx_dias_sugeridos(g));
  if p_aprobar then
    return public.cfx_pago_aprobar(p_id, d, p_motivo);
  else
    update public.cfx_pagos set estado = 'rechazado', motivo = left(coalesce(nullif(p_motivo, ''), 'No pudimos validar el comprobante'), 200), resuelto = now(), comprobante = null where id = p_id;
    perform public.cfx_avisar(g.cuenta, '⚠️ Pago rechazado', left(coalesce(nullif(p_motivo, ''), 'No pudimos validar el comprobante'), 200) || '. Puedes subirlo de nuevo.');
  end if;
  return jsonb_build_object('estado', case when p_aprobar then 'aprobado' else 'rechazado' end, 'dias', d, 'hasta', hasta);
end $$;

-- Liberar el registro por N días (0 = terminar ahora). Sin p_dias solo devuelve cómo está.
create or replace function public.cfx_liberar(p_dias int default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb := (select valor from public.cfx_config where clave = 'liberar');
begin
  perform <CHK>;
  if p_dias is not null then
    if p_dias < 0 or p_dias > 90 then raise exception 'De 0 a 90 días'; end if;
    v := case when p_dias = 0 then coalesce(v, '{}'::jsonb) || jsonb_build_object('hasta', least(coalesce((v ->> 'hasta')::timestamptz, now()), now()))
         else jsonb_build_object('desde', case when (v ->> 'hasta')::timestamptz > now() then v -> 'desde' else to_jsonb(now()) end, 'hasta', now() + make_interval(days => p_dias)) end;
    insert into public.cfx_config (clave, valor) values ('liberar', v) on conflict (clave) do update set valor = excluded.valor;
  end if;
  return jsonb_build_object('desde', v -> 'desde', 'hasta', v -> 'hasta', 'activo', coalesce((v ->> 'hasta')::timestamptz > now(), false));
end $$;
revoke all on function public.cfx_liberar(int) from public, anon;
grant execute on function public.cfx_liberar(int) to authenticated;

-- Cuentas que no pagan el inicio (por ejemplo, las que creas tú de regalo).
create or replace function public.cfx_exento(p_cuenta uuid, p_si boolean, p_nota text default '') returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  if p_si then insert into public.cfx_exentos (cuenta, nota) values (p_cuenta, left(coalesce(p_nota, ''), 200)) on conflict (cuenta) do update set nota = excluded.nota;
  else delete from public.cfx_exentos where cuenta = p_cuenta; end if;
end $$;

create or replace function public.cfx_exento_email(p_email text, p_si boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  perform <CHK>;
  select id into u from auth.users where lower(email) = lower(trim(coalesce(p_email, '')));
  if u is null then raise exception 'No hay una cuenta con ese correo en esta app'; end if;
  perform public.cfx_exento(u, p_si, 'Desde el Centro de Mando');
  return lower(trim(p_email));
end $$;

revoke all on function public.cfx_exento_email(text, boolean) from public, anon;
grant execute on function public.cfx_exento_email(text, boolean) to authenticated;
revoke all on function public.cfx_pago_estado(), public.cfx_pago_pedir(text, int, text, text, text, text, int, text), public.cfx_pagos_config(), public.cfx_pagos_config_guardar(jsonb),
  public.cfx_pagos_lista(text), public.cfx_pago_comprobante(uuid), public.cfx_pago_resolver(uuid, boolean, int, text), public.cfx_exento(uuid, boolean, text) from public, anon;
grant execute on function public.cfx_pago_estado(), public.cfx_pago_pedir(text, int, text, text, text, text, int, text), public.cfx_pagos_config(), public.cfx_pagos_config_guardar(jsonb),
  public.cfx_pagos_lista(text), public.cfx_pago_comprobante(uuid), public.cfx_pago_resolver(uuid, boolean, int, text), public.cfx_exento(uuid, boolean, text) to authenticated;
revoke all on function public.cfx_yo(), public.cfx_dar_premium(uuid, text, int), public.cfx_avisar(uuid, text, text), public.cfx_avisar_admin(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- G85 ⚡ Pago AUTOMÁTICO con Mercado Pago (Checkout Pro) para pagar la app: Premium, primer pago y módulos.
--   CodeFix pega SU Access Token una vez en CM → Pagos (se guarda en las 7 apps; nadie lo puede leer después).
--   La persona toca "⚡ Pagar con Mercado Pago" → paga → al volver (o cada 2 min) la base lo confirma con Mercado Pago,
--   activa el plan sola, le llega push "✅ Pago aprobado" y al Centro de Mando "⚡ Pago automático". Sin comprobante.
--   El link general (abierto, con pantallazo) sigue igual: ese lo revisa el administrador.
-- ---------------------------------------------------------------------
do $$ begin create extension if not exists http with schema extensions; exception when others then raise notice 'http: %', sqlerrm; end $$;

create or replace function public.cfx_mp_api(p_token text, p_metodo text, p_ruta text, p_cuerpo jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare st int; c text;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '10');
  execute 'select status, content from extensions.http(row($1, $2, $3, $4, $5)::extensions.http_request)' into st, c
    using p_metodo, 'https://api.mercadopago.com' || p_ruta, array[row('Authorization', 'Bearer ' || p_token)::extensions.http_header],
          'application/json', p_cuerpo::text;
  return jsonb_build_object('status', st, 'body', case when c ~ '^\s*[\{\[]' then c::jsonb end);
exception when others then
  return jsonb_build_object('status', 0, 'error', sqlerrm);
end $$;

-- G99 a ⚡ AVISO INSTANTÁNEO de Mercado Pago (webhook). Cada cobro lleva notification_url = función de la app + ?cfx_mp=<ref>.
--   La función solo llama cfx_mp_aviso(ref): NO se confía en lo que manda MP; la base vuelve a preguntarle por ESE cobro.
--   Si no hay URL (o el aviso no llega), todo sigue igual: se confirma al volver y con el cron de cada 1 min.
--   URL: cfx_config 'mp_aviso' → {"url": ...} (opcional) · si no, gancho de la app cfx_mp_aviso_url_app().
create table if not exists public.cfx_mp_avisos (ref text primary key, at timestamptz not null default now());
alter table public.cfx_mp_avisos enable row level security;
revoke all on public.cfx_mp_avisos from anon, authenticated;

create or replace function public.cfx_mp_notif(p_ref text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u text := (select valor ->> 'url' from public.cfx_config where clave = 'mp_aviso');
begin
  if coalesce(u, '') = '' and to_regprocedure('public.cfx_mp_aviso_url_app()') is not null then
    begin execute 'select public.cfx_mp_aviso_url_app()' into u; exception when others then u := null; end;
  end if;
  if coalesce(u, '') !~ '^https://[^\s"<>?#]+$' or p_ref is null then return '{}'::jsonb; end if;
  return jsonb_build_object('notification_url', u || '?cfx_mp=' || p_ref);
end $$;
revoke all on function public.cfx_mp_notif(text) from public, anon, authenticated;

-- p:<id> = pago de la app (cfx_pagos) · n:<id> = cobro del negocio (mp_negocio.sql) · otra letra = gancho cfx_mp_aviso_app(ref).
create or replace function public.cfx_mp_aviso(p_ref text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare r text := lower(left(coalesce(p_ref, ''), 80)); i uuid; ok boolean := false;
begin
  if r !~ '^[a-z]:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  i := substr(r, 3)::uuid;
  -- Freno: el mismo cobro se pregunta a MP como mucho 1 vez cada 5 s (MP manda varios avisos por pago).
  if exists (select 1 from public.cfx_mp_avisos where ref = r and at > now() - interval '5 seconds') then return false; end if;
  insert into public.cfx_mp_avisos (ref) values (r) on conflict (ref) do update set at = now();
  delete from public.cfx_mp_avisos where at < now() - interval '3 days';
  if left(r, 1) in ('p', 'f') then
    if exists (select 1 from public.cfx_pagos where id = i and medio in ('mp', 'flow') and estado = 'pendiente') then ok := public.cfx_mp_confirmar(i) = 'aprobado'; end if;
  elsif left(r, 1) = 'n' then
    if to_regprocedure('public.cfx_mp_neg_confirmar(uuid)') is not null then execute 'select public.cfx_mp_neg_confirmar($1)' into ok using i; end if;
  elsif to_regprocedure('public.cfx_mp_aviso_app(text)') is not null then
    execute 'select public.cfx_mp_aviso_app($1)' into ok using r;
  end if;
  return coalesce(ok, false);
exception when others then return false;
end $$;
revoke all on function public.cfx_mp_aviso(text) from public, anon, authenticated;
grant execute on function public.cfx_mp_aviso(text) to service_role;

-- Lo que cuesta el plan (igual que lo muestra la app): precio (− cupón, o − descuento Premium en módulos) + cargo por pago online.
create or replace function public.cfx_mp_monto(p_periodo text, p_meses int, p_producto text, p_cupon text) returns int
language plpgsql stable security definer set search_path = '' as $$
declare c jsonb := (select valor from public.cfx_config where clave = 'pagos'); y jsonb := public.cfx_yo(); g jsonb; v jsonb; b numeric; d int := 0;
begin
  if p_producto is not null then
    v := public.cfx_venta();
    if public.cfx_negocio_premium(public.cfx_negocio_cuenta((y ->> 'id')::uuid)) then d := greatest(0, least(90, coalesce((v ->> 'descuento_premium')::int, 0))); end if;
    b := round(public.cfx_venta_precio(p_producto) * (100 - d) / 100.0);
    if p_periodo = 'anual' then b := b * greatest(1, least(12, coalesce((v ->> 'anual_meses')::int, 10))); end if;
  else
    g := case when y ->> 'rol' = 'cliente' then c -> 'cliente' else c -> 'negocio' end;
    b := case p_periodo when 'inicio' then coalesce(nullif((c #>> '{negocio,inicio}')::numeric, 0), (c #>> '{negocio,mensual}')::numeric)
                        when 'mensual' then (g ->> 'mensual')::numeric when 'meses' then (g ->> 'mensual')::numeric * coalesce(p_meses, 1)
                        when 'anual' then (g ->> 'anual')::numeric end;
    if p_cupon is not null then b := round(b * (100 - public.cfx_cupon_ver(p_cupon)) / 100.0); end if;
  end if;
  b := coalesce(b, 0);
  return (b + ceil(b * coalesce((c ->> 'comision_pct')::numeric, 0) / 100))::int;
end $$;

-- Busca en Mercado Pago el pago aprobado de este cobro; si está (monto completo), lo aprueba y avisa (push a la persona y al CM).
create or replace function public.cfx_mp_confirmar(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare g public.cfx_pagos; tk text := public.cfx_secreto((select valor ->> 'token' from public.cfx_config where clave = 'mp')); r jsonb; pg jsonb;
begin
  select * into g from public.cfx_pagos where id = p_id for update;
  if g.medio = 'flow' and g.estado = 'pendiente' then return public.cfx_flow_confirmar(p_id); end if;  -- G38
  if g.id is null or g.medio <> 'mp' or g.estado <> 'pendiente' then return g.estado; end if;
  if coalesce(tk, '') = '' then return g.estado; end if;
  r := public.cfx_mp_api(tk, 'GET', '/v1/payments/search?sort=date_created&criteria=desc&external_reference=' || g.id::text);
  select e into pg from jsonb_array_elements(coalesce(r #> '{body,results}', '[]'::jsonb)) e
  where e ->> 'status' = 'approved' and e ->> 'external_reference' = g.id::text
    and coalesce(e ->> 'currency_id', 'CLP') = 'CLP' and (e ->> 'transaction_amount')::numeric >= g.monto
    and not exists (select 1 from public.cfx_pagos z where z.mp_pago = e ->> 'id') limit 1;
  if pg is null then
    -- Abrió Mercado Pago y no pagó en 2 días: se cierra (queda en el historial, nada se borra).
    if g.creado < now() - interval '2 days' then
      update public.cfx_pagos set estado = 'rechazado', motivo = 'No se completó el pago en Mercado Pago', resuelto = now() where id = g.id;
      return 'rechazado';
    end if;
    return g.estado;
  end if;
  update public.cfx_pagos set mp_pago = left(pg ->> 'id', 40) where id = g.id;
  begin
    perform public.cfx_pago_aprobar(g.id, null, '⚡ Mercado Pago n° ' || left(pg ->> 'id', 40));
  exception when others then
    -- G87 K: no se pudo activar solo → el pago igual queda aprobado con una 🔑 key de respaldo (nunca se pierde lo pagado).
    select * into g from public.cfx_pagos where id = p_id;
    perform public.cfx_pago_key(g, public.cfx_dias_sugeridos(g), 'aprobado', '⚡ Mercado Pago n° ' || left(pg ->> 'id', 40) || ' · activación falló (' || left(sqlerrm, 80) || '): key de respaldo');
  end;
  begin
    perform public.cfx_al_cm('⚡ Pago automático aprobado', coalesce(nullif(g.nombre, ''), g.email) || ' · $' || g.monto || coalesce(' · 🧩 ' || g.producto, '') ||
      ' (' || case g.periodo when 'meses' then g.meses || ' meses' else g.periodo end || ', Mercado Pago)' || coalesce(' · cupón ' || g.cupon, ''), 'pago');
  exception when others then null; end;
  return 'aprobado';
end $$;

-- La persona paga: crea el cobro y devuelve la página de Mercado Pago (G38: o la de Flow; p_medio 'mp' | 'flow').
drop function if exists public.cfx_mp_pagar(text, int, text, text, text);
create or replace function public.cfx_auto_pagar(p_medio text, p_periodo text, p_meses int, p_producto text, p_cupon text, p_volver text, p_regalo boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); m jsonb := public.cfx_llaves((select valor from public.cfx_config where clave = 'mp')); cup text := nullif(upper(trim(coalesce(p_cupon, ''))), '');
        v text := left(coalesce(p_volver, ''), 500); monto int; i uuid; r jsonb; x uuid; tit text;
begin
  if y is null or (y ->> 'id') is null then raise exception 'Inicia sesión'; end if;
  if p_medio not in ('mp', 'flow') or (p_medio = 'mp' and not public.cfx_mp_on()) or (p_medio = 'flow' and not public.cfx_flow_on()) then
    raise exception 'El pago automático no está disponible. Usa el link de pago o la transferencia.'; end if;
  if y ->> 'rol' not in ('negocio', 'cliente') then raise exception 'Pide al dueño de la cuenta que haga el pago'; end if;
  if p_periodo not in ('inicio', 'mensual', 'meses', 'anual') then raise exception 'Elige un plan'; end if;
  if p_periodo = 'meses' and coalesce(p_meses, 0) not between 2 and 11 then raise exception 'Elige de 2 a 11 meses'; end if;
  if coalesce(p_regalo, false) and p_periodo = 'inicio' then raise exception 'El primer pago es para tu cuenta: elige otro plan para regalar'; end if;
  if coalesce(p_regalo, false) and p_producto is not null and y ->> 'rol' <> 'negocio' then raise exception 'Los módulos se regalan desde una cuenta de negocio'; end if;
  if p_producto is not null and not coalesce(p_regalo, false) then
    if public.cfx_negocio_cuenta((y ->> 'id')::uuid) is distinct from (y ->> 'id')::uuid then raise exception 'Pide al dueño del negocio que haga el pago'; end if;
    if p_periodo not in ('mensual', 'anual') or not coalesce((public.cfx_venta() ->> 'activo')::boolean, false) or cardinality(public.cfx_venta_modulos(p_producto)) = 0 then raise exception 'Módulo no válido'; end if;
    if public.cfx_modulo_pronto(p_producto) is not null then raise exception '🔜 Todavía no disponible: %', public.cfx_modulo_pronto(p_producto); end if;  -- G163
    cup := null;
  elsif p_producto is not null then
    if p_periodo not in ('mensual', 'anual') or not coalesce((public.cfx_venta() ->> 'activo')::boolean, false) or cardinality(public.cfx_venta_modulos(p_producto)) = 0 then raise exception 'Módulo no válido'; end if;
    if public.cfx_modulo_pronto(p_producto) is not null then raise exception '🔜 Todavía no disponible: %', public.cfx_modulo_pronto(p_producto); end if;  -- G163
    cup := null;
  end if;
  if exists (select 1 from public.cfx_pagos where cuenta = (y ->> 'id')::uuid and estado = 'pendiente' and medio not in ('mp', 'flow')) then raise exception 'Ya tienes un pago en revisión. Te avisamos apenas se apruebe.'; end if;
  if (select count(*) from public.cfx_pagos where cuenta = (y ->> 'id')::uuid and medio in ('mp', 'flow') and creado > now() - interval '1 day') >= 10 then raise exception 'Demasiados intentos hoy. Escribe a soporte.'; end if;
  monto := public.cfx_mp_monto(p_periodo, p_meses, p_producto, cup);
  if monto < 1 then raise exception 'Este plan aún no tiene precio'; end if;
  -- Un intento anterior sin pagar: se revisa (por si sí pagó) y se cierra; nunca se borra.
  for x in select id from public.cfx_pagos where cuenta = (y ->> 'id')::uuid and estado = 'pendiente' and medio in ('mp', 'flow') loop
    if public.cfx_mp_confirmar(x) = 'aprobado' then return jsonb_build_object('ok', true, 'aprobado', true); end if;
    update public.cfx_pagos set estado = 'rechazado', motivo = 'Volviste a pagar en línea', resuelto = now() where id = x and estado = 'pendiente' and mp_pago is null;
  end loop;
  insert into public.cfx_pagos (cuenta, email, nombre, rol, periodo, monto, medio, nota, cupon, meses, producto, mp_desde, regalo)
  values ((y ->> 'id')::uuid, coalesce(y ->> 'email', ''), left(coalesce(y ->> 'nombre', ''), 80), y ->> 'rol', p_periodo, monto, p_medio,
          case when coalesce(p_regalo, false) then '🎁 Regalo · ' else '' end || case p_medio when 'flow' then '⚡ Flow automático' else '⚡ Mercado Pago automático' end, cup,
          case when p_periodo = 'meses' then p_meses end, p_producto, now(), coalesce(p_regalo, false))
  returning id into i;
  tit := case when coalesce(p_regalo, false) then '🎁 Regalo · ' else '' end || case when p_producto is not null then 'Módulo ' || p_producto else 'Premium' end || ' · ' ||
         case p_periodo when 'anual' then '1 año' when 'meses' then p_meses || ' meses' else '1 mes' end;
  if v !~ '^https://[^\s"<>]+$' then v := null; end if;
  if p_medio = 'flow' then return public.cfx_flow_cobro(i, tit, monto, coalesce(y ->> 'email', ''), v); end if;
  r := public.cfx_mp_api(m ->> 'token', 'POST', '/checkout/preferences', jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object('id', i, 'title', left('CodeFix · ' || tit, 120), 'quantity', 1, 'currency_id', 'CLP', 'unit_price', monto)),
    'external_reference', i::text, 'statement_descriptor', 'CODEFIX',
    'payer', jsonb_build_object('email', coalesce(y ->> 'email', '')),
    'payment_methods', jsonb_build_object('excluded_payment_types', jsonb_build_array(jsonb_build_object('id', 'ticket'))))
    || public.cfx_mp_notif('p:' || i::text)
    || case when v is null then '{}'::jsonb else jsonb_build_object('back_urls', jsonb_build_object('success', v, 'pending', v, 'failure', v), 'auto_return', 'approved') end);
  if coalesce((r ->> 'status')::int, 0) not in (200, 201) or r #>> '{body,init_point}' is null then
    update public.cfx_pagos set estado = 'rechazado', motivo = 'Mercado Pago no respondió', resuelto = now() where id = i;
    return jsonb_build_object('ok', false, 'error', 'Mercado Pago no respondió. Intenta de nuevo o usa el link de pago.');
  end if;
  return jsonb_build_object('ok', true, 'url', r #>> '{body,init_point}', 'id', i, 'monto', monto);
end $$;
revoke all on function public.cfx_auto_pagar(text, text, int, text, text, text, boolean) from public, anon, authenticated;
create or replace function public.cfx_mp_pagar(p_periodo text, p_meses int default null, p_producto text default null, p_cupon text default null, p_volver text default null, p_regalo boolean default false) returns jsonb
language sql security definer set search_path = '' as $$ select public.cfx_auto_pagar('mp', p_periodo, p_meses, p_producto, p_cupon, p_volver, p_regalo) $$;
create or replace function public.cfx_flow_pagar(p_periodo text, p_meses int default null, p_producto text default null, p_cupon text default null, p_volver text default null, p_regalo boolean default false) returns jsonb
language sql security definer set search_path = '' as $$ select public.cfx_auto_pagar('flow', p_periodo, p_meses, p_producto, p_cupon, p_volver, p_regalo) $$;

-- Al volver de Mercado Pago (o al tocar "Ya pagué"): revisa mis cobros abiertos.
create or replace function public.cfx_mp_revisar() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); x uuid; e text; ok boolean := false;
begin
  if y is null or (y ->> 'id') is null then raise exception 'Inicia sesión'; end if;
  for x in select id from public.cfx_pagos where cuenta = (y ->> 'id')::uuid and estado = 'pendiente' and medio in ('mp', 'flow') loop
    e := public.cfx_mp_confirmar(x); ok := ok or e = 'aprobado';
  end loop;
  -- G108 🔁 renovación automática: al volver de MP también revisa mis suscripciones (cobro nuevo = aprobado).
  begin ok := public.cfx_mp_subs_revisar_mias((y ->> 'id')::uuid) > 0 or ok; exception when others then null; end;
  return jsonb_build_object('aprobado', ok, 'pendiente', exists (select 1 from public.cfx_pagos where cuenta = (y ->> 'id')::uuid and estado = 'pendiente' and medio in ('mp', 'flow')),
    -- G87 K: el último pago automático aprobado (para 🎉 "Activo hasta…", 🧾 comprobante y la 🎁 key).
    'pago', case when ok then (select to_jsonb(q) from (select id, periodo, meses, monto, producto, hasta, dias, regalo, key_regalo, mp_pago, cupon, resuelto, email, nombre
      from public.cfx_pagos where cuenta = (y ->> 'id')::uuid and estado = 'aprobado' and medio in ('mp', 'flow') order by resuelto desc nulls last limit 1) q) end,
    'subs', public.cfx_mp_subs_de((y ->> 'id')::uuid));
end $$;

-- "Pagar de otra forma": cierra el cobro de Mercado Pago sin pagar (queda en el historial).
create or replace function public.cfx_mp_cancelar() returns void
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo();
begin
  if y is null or (y ->> 'id') is null then raise exception 'Inicia sesión'; end if;
  perform public.cfx_mp_revisar();
  update public.cfx_pagos set estado = 'rechazado', motivo = 'Elegiste otra forma de pago', resuelto = now()
  where cuenta = (y ->> 'id')::uuid and estado = 'pendiente' and medio in ('mp', 'flow') and mp_pago is null;
end $$;

-- Cada 2 minutos: por si la persona pagó y no volvió a la app.
create or replace function public.cfx_mp_revisar_pendientes() returns int
language plpgsql security definer set search_path = '' as $$
declare x uuid; n int := 0;
begin
  if not (public.cfx_mp_on() or public.cfx_flow_on()) then return 0; end if;
  for x in select id from public.cfx_pagos where estado = 'pendiente' and medio in ('mp', 'flow') order by creado desc limit 60 loop
    begin if public.cfx_mp_confirmar(x) = 'aprobado' then n := n + 1; end if; exception when others then null; end;
  end loop;
  return n;
end $$;

-- ---------- Administrador (CM → Pagos → ⚡ Mercado Pago automático) ----------
create or replace function public.cfx_mp_estado() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m jsonb := (select valor from public.cfx_config where clave = 'mp');
begin
  perform <CHK>;
  return jsonb_build_object('conectado', coalesce(m ->> 'token', '') <> '', 'activo', public.cfx_mp_on(), 'nick', m ->> 'nick', 'fin', right(public.cfx_secreto(m ->> 'token'), 4),
    'desde', m -> 'desde', 'rotar', coalesce((m ->> 'desde')::timestamptz < now() - interval '365 days', false));
end $$;

-- Conecta (token), prende/pausa (p_activo) o desconecta (sin token y p_activo null).
create or replace function public.cfx_mp_guardar(p_token text, p_activo boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare tk text := nullif(regexp_replace(coalesce(p_token, ''), '\s', '', 'g'), ''); m jsonb := (select valor from public.cfx_config where clave = 'mp'); r jsonb;
begin
  perform <CHK>;
  if tk is null then
    if p_activo is null then delete from public.cfx_config where clave = 'mp';
    elsif coalesce(m ->> 'token', '') = '' then raise exception 'Pega tu Access Token de Mercado Pago';
    else update public.cfx_config set valor = valor || jsonb_build_object('activo', p_activo) where clave = 'mp'; end if;
    return public.cfx_mp_estado();
  end if;
  if tk !~ '^(APP_USR|TEST)-[A-Za-z0-9-]{20,}$' or length(tk) > 300 then raise exception 'Ese no es un Access Token: empieza con APP_USR-'; end if;
  r := public.cfx_mp_api(tk, 'GET', '/users/me');
  if coalesce((r ->> 'status')::int, 0) = 0 then raise exception 'No se pudo conectar con Mercado Pago. Intenta de nuevo.'; end if;
  if (r ->> 'status')::int <> 200 then raise exception 'Mercado Pago no aceptó el token: copia el Access Token de producción'; end if;
  insert into public.cfx_config (clave, valor) values ('mp', jsonb_build_object('token', tk, 'activo', coalesce(p_activo, true),
    'nick', left(coalesce(r #>> '{body,nickname}', r #>> '{body,email}', ''), 80)))
  on conflict (clave) do update set valor = excluded.valor;
  return public.cfx_mp_estado();
end $$;

-- "🔄 Revisar" un cobro de Mercado Pago desde CM → Pagos.
create or replace function public.cfx_mp_revisar_admin(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  return public.cfx_mp_confirmar(p_id);
end $$;

revoke all on function public.cfx_mp_api(text, text, text, jsonb), public.cfx_mp_monto(text, int, text, text), public.cfx_mp_confirmar(uuid), public.cfx_mp_revisar_pendientes() from public, anon, authenticated;
revoke all on function public.cfx_mp_pagar(text, int, text, text, text, boolean), public.cfx_mp_revisar(), public.cfx_mp_cancelar(), public.cfx_mp_estado(), public.cfx_mp_guardar(text, boolean), public.cfx_mp_revisar_admin(uuid) from public, anon;
revoke all on function public.cfx_flow_pagar(text, int, text, text, text, boolean) from public, anon;
grant execute on function public.cfx_flow_pagar(text, int, text, text, text, boolean) to authenticated;
grant execute on function public.cfx_mp_pagar(text, int, text, text, text, boolean), public.cfx_mp_revisar(), public.cfx_mp_cancelar(), public.cfx_mp_estado(), public.cfx_mp_guardar(text, boolean), public.cfx_mp_revisar_admin(uuid) to authenticated;
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'cfx-mp';
  perform cron.schedule('cfx-mp', '* * * * *', 'select public.cfx_mp_revisar_pendientes()');
exception when others then
  raise notice 'Revisión de Mercado Pago no programada (%).', sqlerrm;
end $$;

-- ---------------------------------------------------------------------
-- G38 ⚡ FLOW (flow.cl): segundo pago automático para pagar la app, igual que Mercado Pago. Decisión Claude (G33): Flow trae en
--   UNA sola cuenta Webpay (débito/crédito/prepago), transferencia (Khipu) y MACH → Khipu y Webpay directo no hacen falta aparte.
--   CodeFix pega su API Key + Secret Key en CM → Pagos (se guardan en las 7; nadie los lee después). Cobro: medio 'flow' en cfx_pagos;
--   se confirma preguntándole a Flow (getStatusByCommerceId: pagado + monto completo + n° de Flow usado 1 vez) al volver, con el
--   aviso de Flow (función de la app ?cfx_mp=f:<id>, el mismo de MP) y con el cron de cada 1 min. Flow vuelve con POST: la función
--   de la app lo pasa a la página con ?cfx_volver=1 (cfx_pago_volver); si no hay función, vuelve directo a la app.
-- ---------------------------------------------------------------------
alter table public.cfx_pagos add column if not exists volver text;

create or replace function public.cfx_url_cod(p text) returns text
language sql immutable set search_path = '' as $$
  select coalesce(string_agg(case when ch ~ '^[A-Za-z0-9_.~-]$' then ch else regexp_replace(upper(encode(convert_to(ch, 'UTF8'), 'hex')), '(..)', '%\1', 'g') end, '' order by n), '')
  from regexp_split_to_table(coalesce(p, ''), '') with ordinality t(ch, n)
$$;

-- Llama a Flow firmando (HMAC-SHA256 de los parámetros ordenados: nombre+valor). p_cfg: llaves a probar (si no, las guardadas).
create or replace function public.cfx_flow_api(p_metodo text, p_ruta text, p_params jsonb, p_cfg jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare f jsonb := public.cfx_llaves(coalesce(p_cfg, (select valor from public.cfx_config where clave = 'flow'))); pr jsonb; firma text; q text; st int; c text;
        base text := case when coalesce((f ->> 'sandbox')::boolean, false) then 'https://sandbox.flow.cl/api' else 'https://www.flow.cl/api' end;
begin
  if coalesce(f ->> 'apikey', '') = '' or coalesce(f ->> 'secret', '') = '' then return jsonb_build_object('status', 0, 'error', 'Flow sin llaves'); end if;
  pr := coalesce(p_params, '{}'::jsonb) || jsonb_build_object('apiKey', f ->> 'apikey');
  select string_agg(k || v, '' order by k collate "C"), string_agg(k || '=' || public.cfx_url_cod(v), '&' order by k collate "C") into firma, q from jsonb_each_text(pr) t(k, v);
  q := q || '&s=' || encode(extensions.hmac(convert_to(firma, 'UTF8'), convert_to(f ->> 'secret', 'UTF8'), 'sha256'), 'hex');
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '10');
  if upper(p_metodo) = 'GET' then
    execute 'select status, content from extensions.http(row($1, $2, $3, $4, $5)::extensions.http_request)' into st, c
      using 'GET', base || p_ruta || '?' || q, array[]::extensions.http_header[], null::text, null::text;
  else
    execute 'select status, content from extensions.http(row($1, $2, $3, $4, $5)::extensions.http_request)' into st, c
      using 'POST', base || p_ruta, array[]::extensions.http_header[], 'application/x-www-form-urlencoded', q;
  end if;
  return jsonb_build_object('status', st, 'body', case when c ~ '^\s*[\{\[]' then c::jsonb end);
exception when others then
  return jsonb_build_object('status', 0, 'error', sqlerrm);
end $$;

-- Crea el cobro en Flow (lo llama cfx_auto_pagar con el cobro ya anotado) y devuelve la página de pago.
create or replace function public.cfx_flow_cobro(p_id uuid, p_titulo text, p_monto int, p_email text, p_volver text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n text := public.cfx_mp_notif('f:' || p_id::text) ->> 'notification_url'; r jsonb;
begin
  if coalesce(p_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    update public.cfx_pagos set estado = 'rechazado', motivo = 'Falta un correo válido para Flow', resuelto = now() where id = p_id;
    return jsonb_build_object('ok', false, 'error', 'Tu cuenta no tiene un correo válido. Usa otra forma de pago.');
  end if;
  if n is null and p_volver is null then
    update public.cfx_pagos set estado = 'rechazado', motivo = 'Sin dirección de regreso', resuelto = now() where id = p_id;
    return jsonb_build_object('ok', false, 'error', 'Flow no está listo en esta app. Usa otra forma de pago.');
  end if;
  update public.cfx_pagos set volver = p_volver where id = p_id;
  r := public.cfx_flow_api('POST', '/payment/create', jsonb_build_object('commerceOrder', p_id::text, 'subject', left('CodeFix · ' || p_titulo, 120),
    'currency', 'CLP', 'amount', p_monto::text, 'email', p_email, 'paymentMethod', '9',
    'urlConfirmation', coalesce(n, p_volver), 'urlReturn', coalesce(n || '&cfx_volver=1', p_volver)));
  if coalesce((r ->> 'status')::int, 0) <> 200 or coalesce(r #>> '{body,url}', '') !~ '^https://' or coalesce(r #>> '{body,token}', '') = '' then
    update public.cfx_pagos set estado = 'rechazado', motivo = 'Flow no respondió', resuelto = now() where id = p_id;
    return jsonb_build_object('ok', false, 'error', 'Flow no respondió. Intenta de nuevo o usa otra forma de pago.');
  end if;
  return jsonb_build_object('ok', true, 'url', (r #>> '{body,url}') || '?token=' || public.cfx_url_cod(r #>> '{body,token}'), 'id', p_id, 'monto', p_monto);
end $$;

-- Pregunta a Flow por ESTE cobro; pagado (status 2) con el monto completo y un n° de Flow no usado → aprueba y avisa.
create or replace function public.cfx_flow_confirmar(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare g public.cfx_pagos; r jsonb; b jsonb; nro text;
begin
  select * into g from public.cfx_pagos where id = p_id for update;
  if g.id is null or g.medio <> 'flow' or g.estado <> 'pendiente' then return g.estado; end if;
  r := public.cfx_flow_api('GET', '/payment/getStatusByCommerceId', jsonb_build_object('commerceId', g.id::text));
  b := r -> 'body';
  if coalesce((r ->> 'status')::int, 0) <> 200 or b is null or coalesce((b ->> 'status')::int, 0) <> 2 or b ->> 'commerceOrder' is distinct from g.id::text
     or coalesce(b ->> 'currency', 'CLP') <> 'CLP' or coalesce((b ->> 'amount')::numeric, 0) < g.monto
     or exists (select 1 from public.cfx_pagos z where z.mp_pago = 'flow:' || (b ->> 'flowOrder')) then
    if g.creado < now() - interval '2 days' then
      update public.cfx_pagos set estado = 'rechazado', motivo = 'No se completó el pago en Flow', resuelto = now() where id = g.id;
      return 'rechazado';
    end if;
    return g.estado;
  end if;
  nro := left(b ->> 'flowOrder', 30);
  update public.cfx_pagos set mp_pago = 'flow:' || nro where id = g.id;
  begin
    perform public.cfx_pago_aprobar(g.id, null, '⚡ Flow n° ' || nro);
  exception when others then
    select * into g from public.cfx_pagos where id = p_id;
    perform public.cfx_pago_key(g, public.cfx_dias_sugeridos(g), 'aprobado', '⚡ Flow n° ' || nro || ' · activación falló (' || left(sqlerrm, 80) || '): key de respaldo');
  end;
  begin
    perform public.cfx_al_cm('⚡ Pago automático aprobado', coalesce(nullif(g.nombre, ''), g.email) || ' · $' || g.monto || coalesce(' · 🧩 ' || g.producto, '') ||
      ' (' || case g.periodo when 'meses' then g.meses || ' meses' else g.periodo end || ', Flow)' || coalesce(' · cupón ' || g.cupon, ''), 'pago');
  exception when others then null; end;
  return 'aprobado';
end $$;

-- La función de la app: a dónde vuelve la persona después de Flow (solo cobros de Flow de los últimos 2 días).
create or replace function public.cfx_pago_volver(p_ref text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare r text := lower(left(coalesce(p_ref, ''), 80));
begin
  if r !~ '^[fn]:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null; end if;
  if left(r, 1) = 'n' then  -- G107 💳 Flow propio del negocio
    return (select volver from public.cfx_mp_neg_cobros where id = substr(r, 3)::uuid and medio = 'flow' and created_at > now() - interval '2 days' and volver ~ '^https://[^\s"<>]+$');
  end if;
  return (select volver from public.cfx_pagos where id = substr(r, 3)::uuid and medio = 'flow' and creado > now() - interval '2 days' and volver ~ '^https://[^\s"<>]+$');
end $$;

-- ---------- Administrador (CM → Pagos → ⚡ Flow) ----------
create or replace function public.cfx_flow_estado() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare f jsonb := (select valor from public.cfx_config where clave = 'flow');
begin
  perform <CHK>;
  return jsonb_build_object('conectado', coalesce(f ->> 'apikey', '') <> '', 'activo', public.cfx_flow_on(), 'sandbox', coalesce((f ->> 'sandbox')::boolean, false), 'fin', right(public.cfx_secreto(f ->> 'apikey'), 4),
    'desde', f -> 'desde', 'rotar', coalesce((f ->> 'desde')::timestamptz < now() - interval '365 days', false));
end $$;

-- Conecta (llaves), prende/pausa (p_activo) o desconecta (sin llaves y p_activo null). p_sandbox = cuenta de pruebas de Flow.
create or replace function public.cfx_flow_guardar(p_apikey text, p_secret text, p_activo boolean, p_sandbox boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare k text := nullif(regexp_replace(coalesce(p_apikey, ''), '\s', '', 'g'), ''); sc text := nullif(regexp_replace(coalesce(p_secret, ''), '\s', '', 'g'), '');
        f jsonb := (select valor from public.cfx_config where clave = 'flow'); cfg jsonb; r jsonb;
begin
  perform <CHK>;
  if k is null and sc is null then
    if p_activo is null then delete from public.cfx_config where clave = 'flow';
    elsif coalesce(f ->> 'apikey', '') = '' then raise exception 'Pega tu API Key y tu Secret Key de Flow';
    else update public.cfx_config set valor = valor || jsonb_build_object('activo', p_activo) where clave = 'flow'; end if;
    return public.cfx_flow_estado();
  end if;
  if k is null or sc is null then raise exception 'Pega las 2 llaves: API Key y Secret Key'; end if;
  if k !~ '^[A-Za-z0-9-]{20,80}$' then raise exception 'Esa no parece una API Key de Flow (Integración → API Keys)'; end if;
  if sc !~ '^[A-Za-z0-9]{20,100}$' then raise exception 'Esa no parece una Secret Key de Flow'; end if;
  cfg := jsonb_build_object('apikey', k, 'secret', sc, 'activo', coalesce(p_activo, true), 'sandbox', coalesce(p_sandbox, false));
  -- Prueba las llaves con un cobro que no existe: 401/403 = llaves malas; cualquier otra respuesta = Flow las aceptó.
  r := public.cfx_flow_api('GET', '/payment/getStatusByCommerceId', jsonb_build_object('commerceId', 'cfx-prueba'), cfg);
  if coalesce((r ->> 'status')::int, 0) = 0 then raise exception 'No se pudo conectar con Flow. Intenta de nuevo.'; end if;
  if (r ->> 'status')::int in (401, 403) then raise exception 'Flow no aceptó las llaves: cópialas de nuevo (¿son de producción o de pruebas?)'; end if;
  insert into public.cfx_config (clave, valor) values ('flow', cfg) on conflict (clave) do update set valor = excluded.valor;
  return public.cfx_flow_estado();
end $$;

revoke all on function public.cfx_url_cod(text), public.cfx_flow_api(text, text, jsonb, jsonb), public.cfx_flow_cobro(uuid, text, int, text, text), public.cfx_flow_confirmar(uuid), public.cfx_pago_volver(text) from public, anon, authenticated;
grant execute on function public.cfx_pago_volver(text) to service_role;
revoke all on function public.cfx_flow_estado(), public.cfx_flow_guardar(text, text, boolean, boolean) from public, anon;
grant execute on function public.cfx_flow_estado(), public.cfx_flow_guardar(text, text, boolean, boolean) to authenticated;

-- G87 E · ↺ Volver a cero los ingresos (solo admin, con registro). NO borra pagos: los ingresos de los resúmenes se cuentan
-- desde esta fecha (los de prueba quedan en el historial). "Contar todo" lo deshace.
create or replace function public.cfx_ingresos_desde() returns timestamptz
language sql stable security definer set search_path = '' as $$
  select coalesce((select (valor ->> 'desde')::timestamptz from public.cfx_config where clave = 'ingresos_cero'), '-infinity'::timestamptz)
$$;
create or replace function public.cfx_ingresos_cero(p_cero boolean default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  if p_cero is true then
    insert into public.cfx_config (clave, valor) values ('ingresos_cero', jsonb_build_object('desde', now()))
      on conflict (clave) do update set valor = excluded.valor;
    perform public.cfx_anotar('ingresos a cero', 'Los resúmenes cuentan desde ' || to_char(now() at time zone 'America/Santiago', 'DD-MM-YYYY HH24:MI'));
  elsif p_cero is false then
    delete from public.cfx_config where clave = 'ingresos_cero';
    perform public.cfx_anotar('ingresos a cero', 'Deshecho: vuelve a contar todo el historial');
  end if;
  return jsonb_build_object('desde', nullif(public.cfx_ingresos_desde(), '-infinity'::timestamptz));
end $$;
revoke all on function public.cfx_ingresos_cero(boolean) from public, anon;
grant execute on function public.cfx_ingresos_desde() to anon, authenticated;
grant execute on function public.cfx_ingresos_cero(boolean) to authenticated;

-- ---------------------------------------------------------------------
-- G95 🎁 PRUEBA 7 DÍAS POR BOTÓN: todos parten FREE. "🎁 Probar Pro 7 días" (hoja ⭐ Premium) y "🎁 Probar 7 días" en cada módulo,
--   UNA vez por correo. cfx_pruebas_usadas guarda el hash del correo (no el correo) y NO se borra al eliminar la cuenta ni en la limpieza:
--   si la persona se borra y vuelve con el mismo correo, ya no ve el botón y el servidor lo rechaza. item: 'pro', la clave del módulo o 'pack'.
--   Días: cfx_config 'pagos' → 'prueba_pro_dias' (si no está, los de 🧩 Módulos 'prueba_dias'; 7). 0 = sin prueba.
--   Gancho opcional de la app: cfx_pro_prueba_app(uuid, text, int) → timestamptz (si no está, usa cfx_dar_premium).
-- ---------------------------------------------------------------------
create table if not exists public.cfx_pruebas_usadas (
  hash   text not null,
  item   text not null check (item ~ '^[a-z_:]{2,40}$'),
  creado timestamptz not null default now(),
  primary key (hash, item)
);
alter table public.cfx_pruebas_usadas enable row level security;
revoke all on public.cfx_pruebas_usadas from anon, authenticated;
create or replace function public.cfx_hash_correo(p_email text) returns text
language sql immutable as $$ select encode(sha256(convert_to(lower(btrim(p_email)), 'UTF8')), 'hex') $$;
create or replace function public.cfx_prueba_hash(p_cuenta uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when nullif(btrim(u.email), '') is not null then public.cfx_hash_correo(u.email) else public.cfx_hash_correo('id:' || u.id::text) end
  from auth.users u where u.id = p_cuenta
$$;
create or replace function public.cfx_prueba_usada(p_cuenta uuid, p_item text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cfx_pruebas_usadas where hash = public.cfx_prueba_hash(p_cuenta) and item = p_item)
$$;
create or replace function public.cfx_prueba_marcar(p_cuenta uuid, p_item text) returns void
language sql security definer set search_path = '' as $$
  insert into public.cfx_pruebas_usadas (hash, item) select h, p_item from (select public.cfx_prueba_hash(p_cuenta) h) x where h is not null
  on conflict do nothing
$$;
create or replace function public.cfx_pro_prueba_dias() returns int
language sql stable security definer set search_path = '' as $$
  select greatest(0, least(30, coalesce((select (valor ->> 'prueba_pro_dias')::int from public.cfx_config where clave = 'pagos'),
    (select (valor ->> 'prueba_dias')::int from public.cfx_config where clave = 'modulos_venta'), 7)))
$$;
-- ¿Esta cuenta puede tocar 🎁 Probar Pro? (para la hoja ⭐ Premium)
create or replace function public.cfx_pro_prueba(y jsonb) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('dias', d, 'usada', u, 'puede', d > 0 and not u and coalesce(y ->> 'rol', '') in ('negocio', 'cliente')
    and not coalesce((y ->> 'premium_hasta')::timestamptz > now(), false))
  from (select public.cfx_pro_prueba_dias() d, public.cfx_prueba_usada((y ->> 'id')::uuid, 'pro') u) x
$$;
create or replace function public.cfx_pro_probar() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); u uuid := (y ->> 'id')::uuid; d int := public.cfx_pro_prueba_dias(); h timestamptz;
begin
  if u is null or u <> auth.uid() then raise exception 'Inicia sesión'; end if;
  if coalesce(y ->> 'rol', '') not in ('negocio', 'cliente') then raise exception 'Esta cuenta no puede probar Premium'; end if;
  if d <= 0 then raise exception 'La prueba gratis no está disponible ahora'; end if;
  if coalesce((y ->> 'premium_hasta')::timestamptz > now(), false) then raise exception 'Ya tienes Premium activo'; end if;
  if public.cfx_prueba_usada(u, 'pro') then raise exception 'Ya usaste tu prueba gratis de Premium con este correo'; end if;
  perform public.cfx_prueba_marcar(u, 'pro');
  if to_regprocedure('public.cfx_pro_prueba_app(uuid,text,integer)') is not null then
    execute 'select public.cfx_pro_prueba_app($1, $2, $3)' into h using u, y ->> 'rol', d;
  else h := public.cfx_dar_premium(u, y ->> 'rol', d); end if;
  if h is null then raise exception 'No se pudo activar la prueba'; end if;
  perform public.cfx_anotar('premium', 'prueba gratis ' || d || ' días · ' || u);
  return jsonb_build_object('ok', true, 'hasta', h, 'dias', d);
end $$;
-- Centro de Mando → Control → 🎁 Pruebas: quién probó qué y cuándo (correo solo si la cuenta sigue existiendo).
create or replace function public.cfx_pruebas_admin() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return jsonb_build_object('total', (select count(*) from public.cfx_pruebas_usadas),
    'items', (select coalesce(jsonb_object_agg(item, n), '{}') from (select item, count(*) n from public.cfx_pruebas_usadas group by item) x),
    'ultimas', (select coalesce(jsonb_agg(jsonb_build_object('item', p.item, 'creado', p.creado, 'email', coalesce(u.email, '')) order by p.creado desc), '[]')
      from (select * from public.cfx_pruebas_usadas order by creado desc limit 200) p
      left join (select distinct on (h) h, email from (select public.cfx_hash_correo(x.email) h, x.email from auth.users x where nullif(btrim(x.email), '') is not null) y) u on u.h = p.hash));
end $$;
revoke all on function public.cfx_hash_correo(text), public.cfx_prueba_hash(uuid), public.cfx_prueba_usada(uuid, text), public.cfx_prueba_marcar(uuid, text),
  public.cfx_pro_prueba_dias(), public.cfx_pro_prueba(jsonb) from public, anon, authenticated;
revoke all on function public.cfx_pro_probar(), public.cfx_pruebas_admin() from public, anon;
grant execute on function public.cfx_pro_probar(), public.cfx_pruebas_admin() to authenticated;

-- ---------------------------------------------------------------------
-- G108 🔁 RENOVACIÓN AUTOMÁTICA de ⭐ Premium y 🧩 módulos (suscripción "preapproval" de Mercado Pago con la cuenta de CodeFix,
--   el mismo motor de G106). La persona autoriza su tarjeta 1 vez; MP cobra solo cada mes (o cada año). Cada cobro aprobado
--   (CLP, monto completo, n° usado 1 sola vez) crea un pago en cfx_pagos ('🔁 Renovación automática') y se aprueba con
--   cfx_pago_aprobar → suma 30/365 días igual que un pago normal. Si el plan sigue activo, el 1.er cobro es 1 día antes de que venza.
--   Quitar = se apaga EN Mercado Pago (MP caído: no se marca y se reintenta). Sin cupón (el cupón es para un pago suelto).
-- ---------------------------------------------------------------------
create table if not exists public.cfx_mp_subs (
  id          uuid primary key default gen_random_uuid(),
  cuenta      uuid not null,
  email       text not null default '',
  nombre      text not null default '',
  rol         text not null,
  producto    text check (producto is null or producto ~ '^[a-z_]{2,30}$'),
  periodo     text not null check (periodo in ('mensual', 'anual')),
  monto       int not null check (monto > 0),
  pagador     text not null default '',
  preapproval text unique,
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'activa', 'pausada', 'cancelada')),
  inicio      timestamptz,
  cobros      int not null default 0,
  ultimo_at   timestamptz,
  revisado_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists cfx_mp_subs_cuenta on public.cfx_mp_subs (cuenta, created_at desc);
create index if not exists cfx_mp_subs_viva on public.cfx_mp_subs (revisado_at) where estado <> 'cancelada';
alter table public.cfx_mp_subs enable row level security;
revoke all on public.cfx_mp_subs from anon, authenticated;

create table if not exists public.cfx_mp_sub_cobros (
  id   text primary key,           -- n° del cobro autorizado de MP (1 sola vez)
  sub  uuid not null,
  pago uuid,
  at   timestamptz not null default now()
);
alter table public.cfx_mp_sub_cobros enable row level security;
revoke all on public.cfx_mp_sub_cobros from anon, authenticated;

-- Mis renovaciones vivas (para la ventana de pago): [{ producto, periodo, monto, estado, inicio, cobros, ultimo }]
create or replace function public.cfx_mp_subs_de(p_cuenta uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('producto', producto, 'periodo', periodo, 'monto', monto, 'estado', estado, 'inicio', inicio,
    'cobros', cobros, 'ultimo', ultimo_at) order by created_at desc), '[]')
  from public.cfx_mp_subs where cuenta = p_cuenta and estado <> 'cancelada'
$$;

-- La persona prende la renovación automática: devuelve { ok, url } (página de MP para autorizar la tarjeta) o { ok: false, error }.
create or replace function public.cfx_mp_suscribir(p_periodo text, p_producto text default null, p_email text default null, p_volver text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); u uuid; tk text := public.cfx_secreto((select valor ->> 'token' from public.cfx_config where clave = 'mp'));
        m text := lower(trim(coalesce(p_email, ''))); v text := left(coalesce(p_volver, ''), 500); pr text := nullif(trim(coalesce(p_producto, '')), '');
        monto int; h timestamptz; ini timestamptz; s public.cfx_mp_subs; r jsonb; tit text;
begin
  if y is null or (y ->> 'id') is null then raise exception 'Inicia sesión'; end if;
  u := (y ->> 'id')::uuid;
  if not public.cfx_mp_on() then raise exception 'La renovación automática necesita Mercado Pago. Usa otra forma de pago.'; end if;
  if y ->> 'rol' not in ('negocio', 'cliente') then raise exception 'Pide al dueño de la cuenta que lo active'; end if;
  if p_periodo not in ('mensual', 'anual') then raise exception 'La renovación automática es para 1 mes o 1 año'; end if;
  if pr is not null then
    if public.cfx_negocio_cuenta(u) is distinct from u then raise exception 'Pide al dueño del negocio que lo active'; end if;
    if not coalesce((public.cfx_venta() ->> 'activo')::boolean, false) or cardinality(public.cfx_venta_modulos(pr)) = 0 then raise exception 'Módulo no válido'; end if;
  end if;
  if m !~ '^[^@\s"<>]+@[^@\s"<>]+\.[a-z]{2,}$' or length(m) > 120 then raise exception 'Escribe el correo de tu cuenta de Mercado Pago'; end if;
  if v !~ '^https://[^\s"<>]+$' then raise exception 'Falta la dirección de regreso'; end if;
  if exists (select 1 from public.cfx_mp_subs where cuenta = u and producto is not distinct from pr and estado in ('activa', 'pausada')) then
    raise exception 'Ya se renueva solo'; end if;
  if (select count(*) from public.cfx_mp_subs where cuenta = u and created_at > now() - interval '1 day') >= 10 then raise exception 'Demasiados intentos hoy. Escribe a soporte.'; end if;
  monto := public.cfx_mp_monto(p_periodo, null, pr, null);
  if monto < 1 then raise exception 'Este plan aún no tiene precio'; end if;
  -- Si lo que pagó sigue activo, el 1.er cobro es 1 día antes de que venza (no paga 2 veces lo mismo).
  if pr is null then h := (select max(hasta) from public.cfx_pagos where cuenta = u and producto is null and estado = 'aprobado' and not regalo);
  else h := (select max(hasta) from public.cfx_modulos_negocio where negocio = u and modulo = any (public.cfx_venta_modulos(pr))); end if;
  ini := greatest(now() + interval '5 minutes', coalesce(h - interval '1 day', now()));
  update public.cfx_mp_subs set estado = 'cancelada', updated_at = now() where cuenta = u and producto is not distinct from pr and estado = 'pendiente';  -- intento sin autorizar
  insert into public.cfx_mp_subs (cuenta, email, nombre, rol, producto, periodo, monto, pagador, inicio)
  values (u, coalesce(y ->> 'email', ''), left(coalesce(y ->> 'nombre', ''), 80), y ->> 'rol', pr, p_periodo, monto, m, ini)
  returning * into s;
  tit := 'CodeFix · ' || case when pr is not null then 'Módulo ' || pr else 'Premium' end || case p_periodo when 'anual' then ' · cada año' else ' · cada mes' end;
  r := public.cfx_mp_api(tk, 'POST', '/preapproval', jsonb_build_object(
    'reason', left(tit, 120), 'external_reference', 's:' || s.id::text, 'payer_email', m, 'back_url', v, 'status', 'pending',
    'auto_recurring', jsonb_build_object('frequency', case p_periodo when 'anual' then 12 else 1 end, 'frequency_type', 'months', 'currency_id', 'CLP',
      'transaction_amount', monto, 'start_date', to_char(ini at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS".000+00:00"'))));
  if coalesce((r ->> 'status')::int, 0) not in (200, 201) or r #>> '{body,init_point}' is null or r #>> '{body,id}' is null then
    delete from public.cfx_mp_subs where id = s.id;
    return jsonb_build_object('ok', false, 'error', coalesce('Mercado Pago: ' || left(r #>> '{body,message}', 160), 'Mercado Pago no respondió. Intenta de nuevo.'));
  end if;
  update public.cfx_mp_subs set preapproval = left(r #>> '{body,id}', 60), revisado_at = now() where id = s.id;
  return jsonb_build_object('ok', true, 'url', r #>> '{body,init_point}', 'monto', monto, 'inicio', ini);
end $$;

-- Un cobro aprobado de la suscripción → pago aprobado (activa/extiende). Si la activación falla, queda con 🔑 key de respaldo.
create or replace function public.cfx_mp_sub_cobro(p_sub uuid, p_cobro text, p_pago text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare s public.cfx_mp_subs; i uuid; g public.cfx_pagos; mot text;
begin
  select * into s from public.cfx_mp_subs where id = p_sub;
  if s.id is null then return false; end if;
  insert into public.cfx_mp_sub_cobros (id, sub) values (left(p_cobro, 40), s.id) on conflict do nothing;
  if not found then return false; end if;
  mot := '🔁 Renovación automática · Mercado Pago n° ' || left(coalesce(p_pago, p_cobro), 40);
  insert into public.cfx_pagos (cuenta, email, nombre, rol, periodo, monto, medio, nota, producto, mp_desde, mp_pago)
  values (s.cuenta, s.email, s.nombre, s.rol, s.periodo, s.monto, 'mp', '🔁 Renovación automática', s.producto, now(),
          case when p_pago is not null and not exists (select 1 from public.cfx_pagos where mp_pago = left(p_pago, 40)) then left(p_pago, 40) end)
  returning id into i;
  update public.cfx_mp_sub_cobros set pago = i where id = left(p_cobro, 40);
  begin
    perform public.cfx_pago_aprobar(i, null, mot);
  exception when others then
    select * into g from public.cfx_pagos where id = i;
    perform public.cfx_pago_key(g, public.cfx_dias_sugeridos(g), 'aprobado', left(mot || ' · activación falló (' || left(sqlerrm, 60) || '): key de respaldo', 200));
  end;
  begin
    perform public.cfx_al_cm('🔁 Renovación automática cobrada', coalesce(nullif(s.nombre, ''), s.email) || ' · $' || s.monto || ' · ' ||
      coalesce('🧩 ' || s.producto, '⭐ Premium') || ' (' || s.periodo || ', Mercado Pago)', 'pago');
  exception when others then null; end;
  return true;
end $$;

-- Pregunta a MP por UNA suscripción: estado + cobros nuevos. Devuelve cuántos cobros nuevos encontró.
create or replace function public.cfx_mp_sub_revisar(p_id uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare s public.cfx_mp_subs; tk text := public.cfx_secreto((select valor ->> 'token' from public.cfx_config where clave = 'mp')); r jsonb; e jsonb; nuevo text; n int := 0;
begin
  select * into s from public.cfx_mp_subs where id = p_id for update skip locked;
  if s.id is null or s.preapproval is null or s.estado = 'cancelada' or coalesce(tk, '') = '' then return 0; end if;
  update public.cfx_mp_subs set revisado_at = now() where id = s.id;
  r := public.cfx_mp_api(tk, 'GET', '/preapproval/' || s.preapproval);
  if coalesce((r ->> 'status')::int, 0) = 200 then
    nuevo := case r #>> '{body,status}' when 'authorized' then 'activa' when 'paused' then 'pausada' when 'cancelled' then 'cancelada' else s.estado end;
    if nuevo <> s.estado then
      update public.cfx_mp_subs set estado = nuevo, updated_at = now() where id = s.id;
      begin
        if nuevo = 'activa' and s.estado = 'pendiente' then
          perform public.cfx_avisar(s.cuenta, '🔁 Renovación automática activa', coalesce('🧩 ' || s.producto, '⭐ Premium') || ': se paga solo ' ||
            case s.periodo when 'anual' then 'cada año' else 'cada mes' end || ' ($' || s.monto || '). 1.er cobro el ' || to_char(s.inicio at time zone 'America/Santiago', 'DD/MM/YYYY') || '.');
          perform public.cfx_al_cm('🔁 Renovación automática nueva', coalesce(nullif(s.nombre, ''), s.email) || ' · ' || coalesce('🧩 ' || s.producto, '⭐ Premium') || ' · $' || s.monto || ' (' || s.periodo || ')', 'pago');
        elsif nuevo = 'cancelada' and s.estado <> 'pendiente' then
          perform public.cfx_avisar(s.cuenta, '🔁 Renovación automática apagada', coalesce('🧩 ' || s.producto, '⭐ Premium') || ' ya no se paga solo. Lo que pagaste sigue activo hasta que venza.');
        end if;
      exception when others then null; end;
      if nuevo = 'cancelada' then return n; end if;
    end if;
  end if;
  r := public.cfx_mp_api(tk, 'GET', '/authorized_payments/search?preapproval_id=' || s.preapproval);
  for e in select x from jsonb_array_elements(coalesce(r #> '{body,results}', '[]'::jsonb)) x
           where coalesce(x #>> '{payment,status}', '') = 'approved' and coalesce(x ->> 'preapproval_id', s.preapproval) = s.preapproval
             and coalesce(x ->> 'currency_id', 'CLP') = 'CLP' and coalesce((x ->> 'transaction_amount')::numeric, 0) >= s.monto
             and x ->> 'id' is not null loop
    if public.cfx_mp_sub_cobro(s.id, e ->> 'id', e #>> '{payment,id}') then
      n := n + 1;
      update public.cfx_mp_subs set cobros = cobros + 1, ultimo_at = now(), estado = case when estado = 'pendiente' then 'activa' else estado end, updated_at = now() where id = s.id;
    end if;
  end loop;
  return n;
end $$;

-- Quitar la renovación automática (lo pagado sigue activo hasta que venza). false = MP no respondió (se reintenta).
create or replace function public.cfx_mp_sub_quitar(p_producto text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); s public.cfx_mp_subs; tk text := public.cfx_secreto((select valor ->> 'token' from public.cfx_config where clave = 'mp')); r jsonb; todo boolean := true;
        pr text := nullif(trim(coalesce(p_producto, '')), '');
begin
  if y is null or (y ->> 'id') is null then raise exception 'Inicia sesión'; end if;
  for s in select * from public.cfx_mp_subs where cuenta = (y ->> 'id')::uuid and producto is not distinct from pr and estado <> 'cancelada' for update loop
    if s.preapproval is not null and coalesce(tk, '') <> '' then
      r := public.cfx_mp_api(tk, 'PUT', '/preapproval/' || s.preapproval, jsonb_build_object('status', 'cancelled'));
      if coalesce((r ->> 'status')::int, 0) not in (200, 201) and coalesce(r #>> '{body,status}', '') <> 'cancelled' then todo := false; continue; end if;
    end if;
    update public.cfx_mp_subs set estado = 'cancelada', updated_at = now() where id = s.id;
  end loop;
  if not todo then return jsonb_build_object('ok', false, 'error', 'Mercado Pago no respondió. Intenta de nuevo en un rato.'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Mis suscripciones (al volver de MP / "Ya autoricé"): revisa y devuelve cuántos cobros nuevos hubo.
create or replace function public.cfx_mp_subs_revisar_mias(p_cuenta uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare i uuid; n int := 0;
begin
  for i in select id from public.cfx_mp_subs where cuenta = p_cuenta and estado <> 'cancelada' and preapproval is not null order by created_at desc limit 5 loop
    n := n + public.cfx_mp_sub_revisar(i);
  end loop;
  return n;
end $$;

-- Cron: pendientes (cada 1 min, 2 días; después se dan por abandonadas) · vivas (cada 30 min).
create or replace function public.cfx_mp_subs_revisar() returns int
language plpgsql security definer set search_path = '' as $$
declare i uuid; n int := 0;
begin
  update public.cfx_mp_subs set estado = 'cancelada', updated_at = now() where estado = 'pendiente' and created_at < now() - interval '2 days' and cobros = 0;
  if not public.cfx_mp_on() then return 0; end if;
  for i in select id from public.cfx_mp_subs where estado <> 'cancelada' and preapproval is not null
             and (revisado_at is null or revisado_at < now() - case when estado = 'pendiente' then interval '1 minute' else interval '30 minutes' end)
           order by revisado_at nulls first limit 30 loop
    begin n := n + public.cfx_mp_sub_revisar(i); exception when others then null; end;
  end loop;
  return n;
end $$;

-- CM → Pagos: cuántas renovaciones automáticas hay vivas (y las últimas).
create or replace function public.cfx_mp_subs_admin() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return jsonb_build_object('activas', (select count(*) from public.cfx_mp_subs where estado = 'activa'),
    'items', (select coalesce(jsonb_agg(jsonb_build_object('email', email, 'nombre', nombre, 'producto', producto, 'periodo', periodo, 'monto', monto,
      'estado', estado, 'cobros', cobros, 'ultimo', ultimo_at, 'inicio', inicio) order by created_at desc), '[]')
      from (select * from public.cfx_mp_subs where estado <> 'cancelada' order by created_at desc limit 100) x));
end $$;

revoke all on function public.cfx_mp_subs_de(uuid), public.cfx_mp_sub_cobro(uuid, text, text), public.cfx_mp_sub_revisar(uuid),
  public.cfx_mp_subs_revisar_mias(uuid), public.cfx_mp_subs_revisar() from public, anon, authenticated;
revoke all on function public.cfx_mp_suscribir(text, text, text, text), public.cfx_mp_sub_quitar(text), public.cfx_mp_subs_admin() from public, anon;
grant execute on function public.cfx_mp_suscribir(text, text, text, text), public.cfx_mp_sub_quitar(text), public.cfx_mp_subs_admin() to authenticated;
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'cfx-mp-subs';
  perform cron.schedule('cfx-mp-subs', '* * * * *', 'select public.cfx_mp_subs_revisar()');
exception when others then
  raise notice 'Revisión de renovaciones automáticas no programada (%).', sqlerrm;
end $$;
