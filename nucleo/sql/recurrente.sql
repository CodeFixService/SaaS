
-- ---------------------------------------------------------------------
-- G162 🔁 COMPRAS RECURRENTES (módulo 'suscripciones', las 5 apps con negocio). El dueño arma lo que su cliente compra fijo
--   (productos, servicios o accesos) y cada 7…365 días: 🔔 aviso X días antes · el día que toca se crea solo · 💳 cobro.
--   Cobro: ⚡ automático con tarjeta (Mercado Pago del negocio, el cliente autoriza 1 vez) o link de pago del día
--   (⚡ MP / 💳 Webpay del negocio, si lo tiene) o el dueño marca ✅ pagado (🏦 transferencia / efectivo).
--   Ganchos opcionales de la app (to_regprocedure):
--     cfx_recurrente_armar_app(negocio uuid, items jsonb) jsonb → { lineas:[{clave,nombre,cant,precio,tipo}], total } o { error }  (precios reales)
--     cfx_recurrente_cliente_app(negocio uuid, cuenta uuid) boolean → ¿esa cuenta es cliente del negocio? (sin gancho: la cuenta no se amarra)
--     cfx_recurrente_crear_app(rec uuid) jsonb → el día que toca: { ok, ref, total } | { omitir:true } | { ok:false, error }  (Despega: crea el pedido)
--     cfx_recurrente_puede_app(negocio uuid) boolean → si la app tiene su propio candado del módulo (Despega: pro_o_modulo)
--   Lo pagado por ⚡ automático cuando hay una referencia de la app (ej. 'pedido:<id>') va al gancho de siempre cfx_mp_neg_pagado_app.
--   Referencias de Mercado Pago/Flow: 'rec:<id>' = pago automático · 'rcob:<id>' = link de pago de un período.
-- ---------------------------------------------------------------------
create table if not exists public.cfx_recurrentes (
  id          uuid primary key default gen_random_uuid(),
  negocio     uuid not null,
  cuenta      uuid,                       -- cliente con cuenta en la app (opcional)
  nombre      text not null,
  whatsapp    text,
  correo      text,
  items       jsonb not null default '[]'::jsonb,
  total       int not null default 0,
  cada        int not null default 30 check (cada between 7 and 365),
  aviso       int not null default 1 check (aviso between 0 and 30),
  entrega     text not null default 'retiro' check (entrega in ('retiro', 'despacho')),
  direccion   text,
  proxima     date not null,
  activa      boolean not null default true,
  auto        boolean not null default false,  -- ⚡ pago automático autorizado en Mercado Pago
  veces       int not null default 0,
  error       text,
  avisado     date,
  origen      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists cfx_recurrentes_negocio_idx on public.cfx_recurrentes (negocio, created_at desc);
create index if not exists cfx_recurrentes_proxima_idx on public.cfx_recurrentes (proxima) where activa;
create index if not exists cfx_recurrentes_cuenta_idx on public.cfx_recurrentes (cuenta);
alter table public.cfx_recurrentes enable row level security;
revoke all on public.cfx_recurrentes from anon, authenticated;

-- Cada período (lo cobrado queda aunque se borre la compra recurrente: no lleva FK).
create table if not exists public.cfx_recurrente_cobros (
  id         uuid primary key default gen_random_uuid(),
  rec        uuid not null,
  negocio    uuid not null,
  fecha      date not null,
  monto      int not null default 0,
  estado     text not null default 'pendiente' check (estado in ('pendiente', 'pagado', 'fallo')),
  ref        text,                        -- lo que creó la app (ej. 'pedido:<id>')
  url        text,                        -- link de pago del período
  medio      text,
  pago       text,
  nota       text,
  created_at timestamptz not null default now(),
  pagado_at  timestamptz,
  unique (rec, fecha)
);
create index if not exists cfx_recurrente_cobros_neg_idx on public.cfx_recurrente_cobros (negocio, fecha desc);
alter table public.cfx_recurrente_cobros enable row level security;
revoke all on public.cfx_recurrente_cobros from anon, authenticated;

create or replace function public._cfx_rec_hoy() returns date language sql stable set search_path = '' as $$ select (now() at time zone 'America/Santiago')::date $$;
-- El negocio de quien llama, solo si es el dueño.
create or replace function public._cfx_rec_negocio() returns uuid
language sql stable security definer set search_path = '' as $$
  select n from (select public.cfx_negocio_cuenta(auth.uid()) n) x where n is not null and public.cfx_negocio_dueno(n) = auth.uid()
$$;
create or replace function public.cfx_recurrente_puede(n uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare r boolean;
begin
  if n is null then return false; end if;
  if to_regprocedure('public.cfx_recurrente_puede_app(uuid)') is not null then
    execute 'select public.cfx_recurrente_puede_app($1)' into r using n; return coalesce(r, false);
  end if;
  return case when public.cfx_venta_on() and 'suscripciones' = any (public.cfx_modulos_de_app()) then public.cfx_modulo_de('suscripciones', n) else public.cfx_negocio_premium(n) end;
end $$;
create or replace function public._cfx_rec_avisar(u uuid, t text, c text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if u is null or to_regprocedure('public.cfx_avisar(uuid, text, text)') is null then return; end if;
  perform public.cfx_avisar(u, left(t, 80), left(coalesce(c, ''), 240));
exception when others then null;  -- un aviso nunca frena el cobro
end $$;
create or replace function public._cfx_rec_plata(m numeric) returns text language sql immutable set search_path = '' as $$ select '$' || to_char(coalesce(m, 0), 'FM999G999G999') $$;
create or replace function public._cfx_rec_tienda(n uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare t text;
begin
  if to_regprocedure('public.cfx_negocio_nombre_app(uuid)') is not null then execute 'select public.cfx_negocio_nombre_app($1)' into t using n; end if;
  return coalesce(nullif(trim(t), ''), 'Tu negocio');
end $$;

-- Arma las líneas: con el gancho de la app (precios reales) o tal como las escribió el dueño (nombre, cant, precio, tipo).
create or replace function public._cfx_rec_armar(n uuid, p_items jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare it jsonb; l jsonb := '[]'::jsonb; a jsonb; tot numeric := 0; nom text; c int; pr numeric; tp text;
begin
  if jsonb_typeof(coalesce(p_items, 'null'::jsonb)) <> 'array' or jsonb_array_length(p_items) = 0 then return jsonb_build_object('error', 'Agrega al menos un producto o servicio'); end if;
  if to_regprocedure('public.cfx_recurrente_armar_app(uuid, jsonb)') is not null then
    execute 'select public.cfx_recurrente_armar_app($1, $2)' into a using n, p_items;
    return coalesce(a, jsonb_build_object('error', 'No se pudo armar'));
  end if;
  for it in select * from jsonb_array_elements(p_items) limit 30 loop
    continue when jsonb_typeof(it) <> 'object';
    nom := nullif(left(regexp_replace(trim(coalesce(it ->> 'nombre', '')), '[[:cntrl:]]|\s+', ' ', 'g'), 80), '');
    continue when nom is null;
    c := least(greatest(coalesce(nullif(it ->> 'cant', '')::numeric, 1)::int, 1), 99);
    pr := coalesce(nullif(it ->> 'precio', '')::numeric, -1);
    if pr < 0 or pr > 99999999 then return jsonb_build_object('error', 'Revisa el precio de "' || nom || '"'); end if;
    tp := case when it ->> 'tipo' in ('producto', 'servicio', 'digital') then it ->> 'tipo' else public.cfx_tipo_adivinar(nom, '', null) end;
    l := l || jsonb_build_object('clave', nullif(left(it ->> 'clave', 60), ''), 'nombre', nom, 'cant', c, 'precio', round(pr), 'tipo', tp);
    tot := tot + round(pr) * c;
  end loop;
  if jsonb_array_length(l) = 0 then return jsonb_build_object('error', 'Agrega al menos un producto o servicio'); end if;
  return jsonb_build_object('lineas', l, 'total', tot);
end $$;

create or replace function public.cfx_recurrente_json(x public.cfx_recurrentes) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', x.id, 'cuenta', x.cuenta, 'nombre', x.nombre, 'whatsapp', x.whatsapp, 'correo', x.correo, 'items', x.items, 'total', x.total,
    'cada', x.cada, 'aviso', x.aviso, 'entrega', x.entrega, 'direccion', x.direccion, 'proxima', x.proxima, 'activa', x.activa, 'auto', x.auto,
    'veces', x.veces, 'error', x.error, 'tienda', public._cfx_rec_tienda(x.negocio), 'al_mes', round(x.total * 30.0 / x.cada),
    'pendiente', (select jsonb_build_object('id', c.id, 'fecha', c.fecha, 'monto', c.monto, 'url', c.url, 'ref', c.ref)
                  from public.cfx_recurrente_cobros c where c.rec = x.id and c.estado = 'pendiente' order by c.fecha desc limit 1),
    'historial', (select coalesce(jsonb_agg(jsonb_build_object('fecha', c.fecha, 'monto', c.monto, 'estado', c.estado, 'medio', c.medio) order by c.fecha desc), '[]'::jsonb)
                  from (select * from public.cfx_recurrente_cobros c where c.rec = x.id order by c.fecha desc limit 12) c))
$$;

-- El dueño crea o edita. p = { id?, cuenta?, nombre, whatsapp?, correo?, items:[…], cada, aviso, entrega, direccion, proxima }.
create or replace function public.cfx_recurrente_guardar(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n uuid := public._cfx_rec_negocio(); x public.cfx_recurrentes; v public.cfx_recurrentes; a jsonb; ok boolean := false;
  cu uuid; nom text := nullif(left(regexp_replace(trim(coalesce(p ->> 'nombre', '')), '[[:cntrl:]]|\s+', ' ', 'g'), 80), '');
  wa text := regexp_replace(coalesce(p ->> 'whatsapp', ''), '\D', '', 'g'); co text := lower(trim(coalesce(p ->> 'correo', '')));
  v_cada int; v_av int; ent text := coalesce(nullif(p ->> 'entrega', ''), 'retiro');
  dir text := nullif(left(trim(coalesce(p ->> 'direccion', '')), 200), ''); desde date; hoy date := public._cfx_rec_hoy(); fis boolean;
begin
  if n is null then return jsonb_build_object('ok', false, 'error', 'Solo el dueño del negocio'); end if;
  if not public.cfx_recurrente_puede(n) then return jsonb_build_object('ok', false, 'error', '🔁 Compras recurrentes es un módulo 🧩: actívalo en Mi plan y módulos'); end if;
  begin
    cu := nullif(p ->> 'cuenta', '')::uuid; v_cada := coalesce(nullif(p ->> 'cada', '')::int, 30); v_av := coalesce(nullif(p ->> 'aviso', '')::int, 1);
    desde := coalesce(nullif(p ->> 'proxima', '')::date, hoy);
  exception when others then return jsonb_build_object('ok', false, 'error', 'Revisa los datos');
  end;
  if cu is not null then
    if to_regprocedure('public.cfx_recurrente_cliente_app(uuid, uuid)') is not null then execute 'select public.cfx_recurrente_cliente_app($1, $2)' into ok using n, cu; end if;
    if not coalesce(ok, false) then cu := null; end if;
  end if;
  if nom is null then return jsonb_build_object('ok', false, 'error', 'Escribe el nombre del cliente'); end if;
  if length(wa) = 9 and wa like '9%' then wa := '56' || wa; elsif length(wa) = 8 then wa := '569' || wa; end if;
  if wa <> '' and wa !~ '^\d{10,15}$' then return jsonb_build_object('ok', false, 'error', 'Revisa el WhatsApp (+56 9…)'); end if;
  if co <> '' and (co !~ '^[^@\s"<>]+@[^@\s"<>]+\.[a-z]{2,}$' or length(co) > 120) then return jsonb_build_object('ok', false, 'error', 'Revisa el correo'); end if;
  if v_cada < 7 or v_cada > 365 then return jsonb_build_object('ok', false, 'error', 'Elige cada cuántos días: de 7 a 365'); end if;
  if v_av < 0 or v_av > 30 or v_av >= v_cada then return jsonb_build_object('ok', false, 'error', 'El aviso tiene que ser antes del próximo (0 a 30 días)'); end if;
  if desde < hoy then return jsonb_build_object('ok', false, 'error', 'La primera fecha no puede ser antes de hoy'); end if;
  a := public._cfx_rec_armar(n, p -> 'items');
  if a ? 'error' then return jsonb_build_object('ok', false, 'error', a ->> 'error'); end if;
  -- Entrega (misma regla que CFX_TIPO.entregas): sin nada 📦 físico → sin retiro ni despacho.
  fis := exists (select 1 from jsonb_array_elements(a -> 'lineas') l where coalesce(l ->> 'tipo', 'producto') = 'producto');
  if not fis then ent := 'retiro'; dir := null; end if;
  if ent not in ('retiro', 'despacho') then return jsonb_build_object('ok', false, 'error', 'Elige retiro o despacho'); end if;
  if ent = 'despacho' and dir is null then return jsonb_build_object('ok', false, 'error', 'Escribe la dirección de despacho'); end if;
  if nullif(p ->> 'id', '') is null then
    if (select count(*) from public.cfx_recurrentes where negocio = n) >= 300 then return jsonb_build_object('ok', false, 'error', 'Máximo 300 compras recurrentes'); end if;
    insert into public.cfx_recurrentes (negocio, cuenta, nombre, whatsapp, correo, items, total, cada, aviso, entrega, direccion, proxima)
    values (n, cu, nom, nullif(wa, ''), nullif(co, ''), a -> 'lineas', round((a ->> 'total')::numeric), v_cada, v_av, ent, case when ent = 'despacho' then dir end, desde) returning * into x;
    perform public._cfx_rec_avisar(cu, '🔁 Compra recurrente lista', public._cfx_rec_tienda(n) || ' te la armará cada ' || v_cada || ' días (' ||
      public._cfx_rec_plata(x.total) || '). Te avisamos antes y puedes pausarla cuando quieras.');
  else
    select * into v from public.cfx_recurrentes where id = (p ->> 'id')::uuid and negocio = n for update;
    if v.id is null then return jsonb_build_object('ok', false, 'error', 'Compra recurrente no encontrada'); end if;
    update public.cfx_recurrentes set cuenta = cu, nombre = nom, whatsapp = nullif(wa, ''), correo = nullif(co, ''), items = a -> 'lineas',
      total = round((a ->> 'total')::numeric), cada = v_cada, aviso = v_av, entrega = ent, direccion = case when ent = 'despacho' then dir end,
      proxima = desde, error = null, avisado = case when desde = v.proxima then avisado end, updated_at = now() where id = v.id returning * into x;
    -- Cambió el monto o cada cuánto: el ⚡ automático viejo ya no sirve (se apaga en MP; el cliente lo vuelve a autorizar).
    if v.auto and (x.total <> v.total or x.cada <> v.cada) then
      if public.cfx_mp_neg_sub_cancelar('rec:' || x.id) then update public.cfx_recurrentes set auto = false where id = x.id returning * into x; end if;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'rec', public.cfx_recurrente_json(x));
end $$;

-- Lista del dueño + 📊 resumen ($ al mes, cobrado y por cobrar este mes, próximas fechas de 30 días).
create or replace function public.cfx_recurrente_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n uuid := public._cfx_rec_negocio(); hoy date := public._cfx_rec_hoy(); ini date := date_trunc('month', public._cfx_rec_hoy())::date;
begin
  if n is null then return jsonb_build_object('ok', false, 'error', 'Solo el dueño del negocio'); end if;
  return jsonb_build_object('ok', true, 'puede', public.cfx_recurrente_puede(n), 'mp', public.cfx_mp_neg_mp(n), 'cobro', public.cfx_mp_neg_activo(n),
    'items', (select coalesce(jsonb_agg(public.cfx_recurrente_json(x) order by x.activa desc, x.proxima), '[]'::jsonb) from public.cfx_recurrentes x where x.negocio = n),
    'resumen', jsonb_build_object(
      'activas', (select count(*) from public.cfx_recurrentes where negocio = n and activa),
      'al_mes', (select coalesce(round(sum(total * 30.0 / cada)), 0) from public.cfx_recurrentes where negocio = n and activa),
      'cobrado_mes', (select coalesce(sum(monto), 0) from public.cfx_recurrente_cobros where negocio = n and estado = 'pagado' and fecha >= ini),
      'por_cobrar', (select coalesce(sum(monto), 0) from public.cfx_recurrente_cobros where negocio = n and estado = 'pendiente'),
      'proximas', (select coalesce(jsonb_agg(jsonb_build_object('fecha', f, 'nombre', nombre, 'total', total) order by f, nombre), '[]'::jsonb) from (
          select (x.proxima + k * x.cada) f, x.nombre, x.total from public.cfx_recurrentes x, generate_series(0, 52) k
          where x.negocio = n and x.activa and x.proxima + k * x.cada <= hoy + 30 order by 1 limit 12) z)));
end $$;

-- Las mías (el cliente con cuenta): ver, pausar/seguir, pagar el período y ⚡ pago automático.
create or replace function public.cfx_recurrente_mias() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.cfx_recurrente_json(x) || jsonb_build_object('mp', public.cfx_mp_neg_mp(x.negocio)) order by x.proxima), '[]'::jsonb)
  from public.cfx_recurrentes x where auth.uid() is not null and x.cuenta = auth.uid()
$$;

-- Pausar o seguir: el dueño o el mismo cliente. Al pausar se apaga el ⚡ automático en Mercado Pago (si MP no responde, no se pausa).
create or replace function public.cfx_recurrente_estado(p_id uuid, p_activa boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare x public.cfx_recurrentes; hoy date := public._cfx_rec_hoy(); soy_cli boolean;
begin
  select * into x from public.cfx_recurrentes where id = p_id and auth.uid() is not null
    and (public.cfx_negocio_dueno(negocio) = auth.uid() or cuenta = auth.uid()) for update;
  if x.id is null then return jsonb_build_object('ok', false, 'error', 'Compra recurrente no encontrada'); end if;
  soy_cli := x.cuenta = auth.uid() and public.cfx_negocio_dueno(x.negocio) is distinct from auth.uid();
  if not coalesce(p_activa, false) and x.auto then
    if not public.cfx_mp_neg_sub_cancelar('rec:' || x.id) then return jsonb_build_object('ok', false, 'error', 'Mercado Pago no respondió: intenta de nuevo en un rato'); end if;
  end if;
  update public.cfx_recurrentes set activa = coalesce(p_activa, false), error = null, auto = case when coalesce(p_activa, false) then auto else false end,
    proxima = case when coalesce(p_activa, false) and proxima < hoy then hoy else proxima end, updated_at = now() where id = x.id returning * into x;
  if soy_cli then
    perform public._cfx_rec_avisar(public.cfx_negocio_dueno(x.negocio), case when x.activa then '🔁 Compra recurrente retomada' else '⏸️ Compra recurrente pausada' end,
      x.nombre || case when x.activa then ' la retomó.' else ' la pausó.' end);
  end if;
  return jsonb_build_object('ok', true, 'rec', public.cfx_recurrente_json(x));
end $$;

-- Borrar (el dueño). Lo cobrado queda en el historial del negocio.
create or replace function public.cfx_recurrente_borrar(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare x public.cfx_recurrentes;
begin
  select * into x from public.cfx_recurrentes where id = p_id and negocio = public._cfx_rec_negocio() for update;
  if x.id is null then return jsonb_build_object('ok', false, 'error', 'Compra recurrente no encontrada'); end if;
  if x.auto and not public.cfx_mp_neg_sub_cancelar('rec:' || x.id) then return jsonb_build_object('ok', false, 'error', 'Mercado Pago no respondió: intenta de nuevo en un rato'); end if;
  delete from public.cfx_recurrentes where id = x.id;
  return jsonb_build_object('ok', true);
end $$;

-- ✅ El dueño marca pagado un período (🏦 transferencia, efectivo…). Lo de la app (ej. pedidos de Despega) se paga en la app.
create or replace function public.cfx_recurrente_pagado(p_cobro uuid, p_nota text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.cfx_recurrente_cobros;
begin
  select * into c from public.cfx_recurrente_cobros where id = p_cobro and negocio = public._cfx_rec_negocio() for update;
  if c.id is null then return jsonb_build_object('ok', false, 'error', 'Cobro no encontrado'); end if;
  if c.estado = 'pagado' then return jsonb_build_object('ok', true); end if;
  if c.ref is not null then return jsonb_build_object('ok', false, 'error', 'Este se paga en su pedido'); end if;
  update public.cfx_recurrente_cobros set estado = 'pagado', medio = 'manual', pagado_at = now(), nota = nullif(left(trim(coalesce(p_nota, '')), 120), '') where id = c.id;
  return jsonb_build_object('ok', true);
end $$;

-- 💳 Link de pago de un período (⚡ MP o 💳 Webpay del negocio). Dueño o cliente. Si ya hay uno, lo devuelve.
create or replace function public.cfx_recurrente_pagar(p_cobro uuid, p_volver text default null, p_medio text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.cfx_recurrente_cobros; x public.cfx_recurrentes; r jsonb;
begin
  select * into c from public.cfx_recurrente_cobros where id = p_cobro;
  select * into x from public.cfx_recurrentes where id = c.rec;
  if c.id is null or auth.uid() is null or not (public.cfx_negocio_dueno(c.negocio) = auth.uid() or x.cuenta = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'Cobro no encontrado');
  end if;
  if c.estado = 'pagado' or public.cfx_mp_neg_revisar('rcob:' || c.id) then return jsonb_build_object('ok', true, 'pagado', true); end if;
  if c.ref is not null then return jsonb_build_object('ok', false, 'error', 'Este se paga en su pedido'); end if;
  if not public.cfx_mp_neg_activo(c.negocio) then return jsonb_build_object('ok', false, 'error', 'El negocio no tiene pago en línea: págale por transferencia'); end if;
  if c.url is not null and p_volver is null and p_medio is null then return jsonb_build_object('ok', true, 'url', c.url); end if;
  r := public.cfx_mp_neg_cobro(c.negocio, 'rcob:' || c.id, left('🔁 ' || public._cfx_rec_tienda(c.negocio), 120), c.monto, p_volver, null, p_medio);
  if coalesce((r ->> 'ok')::boolean, false) then update public.cfx_recurrente_cobros set url = left(r ->> 'url', 500) where id = c.id; end if;
  return r;
end $$;

-- ⚡ Pago automático (Mercado Pago del negocio): el cliente autoriza su tarjeta 1 vez y MP cobra solo cada X días.
--   Lo pide el cliente (Mis compras recurrentes) o el dueño (le manda el link por WhatsApp). Correo = el de Mercado Pago de quien paga.
create or replace function public.cfx_recurrente_auto(p_id uuid, p_correo text, p_volver text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare x public.cfx_recurrentes; hoy date := public._cfx_rec_hoy();
begin
  select * into x from public.cfx_recurrentes where id = p_id and auth.uid() is not null and (public.cfx_negocio_dueno(negocio) = auth.uid() or cuenta = auth.uid());
  if x.id is null then return jsonb_build_object('ok', false, 'error', 'Compra recurrente no encontrada'); end if;
  if not x.activa then return jsonb_build_object('ok', false, 'error', 'Primero retómala (▶️ Seguir)'); end if;
  if x.auto then return jsonb_build_object('ok', false, 'error', 'Ya tiene el pago automático'); end if;
  if not public.cfx_mp_neg_mp(x.negocio) then return jsonb_build_object('ok', false, 'error', 'El negocio no tiene ⚡ Mercado Pago conectado'); end if;
  if x.total < 1 then return jsonb_build_object('ok', false, 'error', 'El monto es $0'); end if;
  return public.cfx_mp_neg_suscribir_cada(x.negocio, 'rec:' || x.id, left('🔁 ' || public._cfx_rec_tienda(x.negocio) || ' · cada ' || x.cada || ' días', 120), x.total,
    coalesce(nullif(p_correo, ''), x.correo), p_volver, greatest(x.proxima, hoy)::timestamptz + interval '12 hours', x.cada);
end $$;
-- Al volver de Mercado Pago: revisa el ⚡ automático y el link del período.
create or replace function public.cfx_recurrente_revisar(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare x public.cfx_recurrentes; c uuid;
begin
  select * into x from public.cfx_recurrentes where id = p_id and auth.uid() is not null and (public.cfx_negocio_dueno(negocio) = auth.uid() or cuenta = auth.uid());
  if x.id is null then return jsonb_build_object('ok', false, 'error', 'Compra recurrente no encontrada'); end if;
  perform public.cfx_mp_neg_sub_revisar_ref('rec:' || x.id);
  for c in select id from public.cfx_recurrente_cobros where rec = x.id and estado = 'pendiente' and ref is null loop perform public.cfx_mp_neg_revisar('rcob:' || c); end loop;
  select * into x from public.cfx_recurrentes where id = p_id;
  return jsonb_build_object('ok', true, 'rec', public.cfx_recurrente_json(x));
end $$;

-- Lo llama mp_negocio.sql: un link de período pagado ('rcob:<id>').
create or replace function public.cfx_recurrente_cobrado(p_ref text, p_pago text, p_monto int, p_medio text default 'mp') returns void
language plpgsql security definer set search_path = '' as $$
declare c public.cfx_recurrente_cobros; x public.cfx_recurrentes;
begin
  if p_ref !~ '^rcob:[0-9a-f-]{36}$' then return; end if;
  update public.cfx_recurrente_cobros set estado = 'pagado', pago = left(p_pago, 60), medio = coalesce(p_medio, 'mp'), pagado_at = now()
  where id = substr(p_ref, 6)::uuid and estado <> 'pagado' returning * into c;
  if c.id is null then return; end if;
  select * into x from public.cfx_recurrentes where id = c.rec;
  perform public._cfx_rec_avisar(public.cfx_negocio_dueno(c.negocio), '💰 Pago recibido', coalesce(x.nombre, 'Un cliente') || ' pagó su compra recurrente: ' || public._cfx_rec_plata(c.monto) || '.');
end $$;
-- Lo llama mp_negocio.sql: eventos del ⚡ automático ('rec:<id>'): 'activa' | 'cobro' | 'cancelada'.
create or replace function public.cfx_recurrente_auto_evento(p_ref text, p_evento text, p_pago text, p_monto int) returns void
language plpgsql security definer set search_path = '' as $$
declare x public.cfx_recurrentes; c public.cfx_recurrente_cobros;
begin
  if p_ref !~ '^rec:[0-9a-f-]{36}$' then return; end if;
  select * into x from public.cfx_recurrentes where id = substr(p_ref, 5)::uuid for update;
  if x.id is null then return; end if;
  if p_evento = 'activa' then
    update public.cfx_recurrentes set auto = true, updated_at = now() where id = x.id;
    perform public._cfx_rec_avisar(public.cfx_negocio_dueno(x.negocio), '⚡ Pago automático activado', x.nombre || ' autorizó su tarjeta: se cobra solo cada ' || x.cada || ' días.');
  elsif p_evento = 'cancelada' then
    update public.cfx_recurrentes set auto = false, updated_at = now() where id = x.id;
    perform public._cfx_rec_avisar(public.cfx_negocio_dueno(x.negocio), '⚠️ Pago automático apagado', x.nombre || ': su pago automático se canceló en Mercado Pago.');
  elsif p_evento = 'cobro' then
    select * into c from public.cfx_recurrente_cobros where rec = x.id and estado = 'pendiente' order by fecha limit 1 for update;
    if c.id is null then  -- llegó antes del día: queda pagado por adelantado para la próxima fecha
      insert into public.cfx_recurrente_cobros (rec, negocio, fecha, monto, estado, medio, pago, pagado_at)
      values (x.id, x.negocio, x.proxima, coalesce(p_monto, x.total), 'pagado', 'auto', left(p_pago, 60), now()) on conflict (rec, fecha) do nothing;
    else
      update public.cfx_recurrente_cobros set estado = 'pagado', medio = 'auto', pago = left(p_pago, 60), pagado_at = now() where id = c.id;
      if c.ref is not null and to_regprocedure('public.cfx_mp_neg_pagado_app(text, text, integer)') is not null then
        execute 'select public.cfx_mp_neg_pagado_app($1, $2, $3)' using c.ref, left(p_pago, 40), coalesce(p_monto, c.monto);
      end if;
    end if;
    perform public._cfx_rec_avisar(public.cfx_negocio_dueno(x.negocio), '💰 Cobro automático', x.nombre || ': ' || public._cfx_rec_plata(p_monto) || ' cobrado solo.');
  end if;
end $$;

-- Cada mañana (pg_cron 'cfx-recurrentes'): 🔔 avisos X días antes y lo que toca hoy.
create or replace function public.cfx_recurrentes_correr() returns int
language plpgsql security definer set search_path = '' as $$
declare x public.cfx_recurrentes; c public.cfx_recurrente_cobros; r jsonb; k int := 0; hoy date := public._cfx_rec_hoy(); t text; d int;
begin
  -- 🔔 Aviso antes
  for x in select * from public.cfx_recurrentes where activa and aviso > 0 and proxima > hoy and proxima - aviso <= hoy and avisado is distinct from proxima
           order by proxima limit 1000 for update skip locked loop
    d := x.proxima - hoy; t := public._cfx_rec_tienda(x.negocio);
    perform public._cfx_rec_avisar(x.cuenta, '🔔 ' || case when d = 1 then 'Mañana' else 'En ' || d || ' días' end || ': tu compra de ' || t,
      public._cfx_rec_plata(x.total) || case when x.auto then ' · se cobra solo ⚡' else '' end || '. Si no la quieres esta vez, pausa en Mis compras recurrentes.');
    perform public._cfx_rec_avisar(public.cfx_negocio_dueno(x.negocio), '🔔 ' || case when d = 1 then 'Mañana' else 'En ' || d || ' días' end || ' toca: ' || x.nombre,
      '🔁 ' || public._cfx_rec_plata(x.total) || ' · cada ' || x.cada || ' días.');
    update public.cfx_recurrentes set avisado = proxima where id = x.id;
  end loop;
  -- 📅 Lo que toca hoy
  for x in select * from public.cfx_recurrentes where activa and proxima <= hoy order by proxima limit 500 for update skip locked loop
    if not public.cfx_recurrente_puede(x.negocio) then
      update public.cfx_recurrentes set error = 'Sin el módulo 🔁 activo', proxima = hoy + 1 where id = x.id; continue;
    end if;
    insert into public.cfx_recurrente_cobros (rec, negocio, fecha, monto) values (x.id, x.negocio, x.proxima, x.total) on conflict (rec, fecha) do nothing;
    select * into c from public.cfx_recurrente_cobros where rec = x.id and fecha = x.proxima;
    r := null;
    if to_regprocedure('public.cfx_recurrente_crear_app(uuid)') is not null then
      begin execute 'select public.cfx_recurrente_crear_app($1)' into r using x.id;
      exception when others then r := jsonb_build_object('ok', false, 'error', left(sqlerrm, 200)); end;
      if coalesce((r ->> 'omitir')::boolean, false) then update public.cfx_recurrentes set proxima = hoy + 1 where id = x.id; continue; end if;
      if not coalesce((r ->> 'ok')::boolean, false) then
        update public.cfx_recurrente_cobros set estado = case when estado = 'pagado' then estado else 'fallo' end, nota = left(r ->> 'error', 200) where id = c.id;
        update public.cfx_recurrentes set error = left(coalesce(r ->> 'error', 'No se pudo crear'), 200), veces = veces, proxima = greatest(proxima, hoy) + cada, updated_at = now() where id = x.id;
        perform public._cfx_rec_avisar(public.cfx_negocio_dueno(x.negocio), '⚠️ No se pudo crear una compra recurrente', x.nombre || ': ' || left(coalesce(r ->> 'error', ''), 120));
        continue;
      end if;
      update public.cfx_recurrente_cobros set ref = left(r ->> 'ref', 120), monto = coalesce(round((r ->> 'total')::numeric)::int, monto) where id = c.id returning * into c;
      -- ya estaba pagado por el ⚡ automático (llegó antes): se le pasa a la app
      if c.estado = 'pagado' and c.ref is not null and to_regprocedure('public.cfx_mp_neg_pagado_app(text, text, integer)') is not null then
        execute 'select public.cfx_mp_neg_pagado_app($1, $2, $3)' using c.ref, c.pago, c.monto;
      end if;
    else
      t := public._cfx_rec_tienda(x.negocio);
      if c.estado = 'pendiente' and not x.auto and public.cfx_mp_neg_activo(x.negocio) and c.monto > 0 and c.url is null then
        r := public.cfx_mp_neg_cobro(x.negocio, 'rcob:' || c.id, left('🔁 ' || t, 120), c.monto, null, null, null);
        if coalesce((r ->> 'ok')::boolean, false) then update public.cfx_recurrente_cobros set url = left(r ->> 'url', 500) where id = c.id; end if;
      end if;
      perform public._cfx_rec_avisar(x.cuenta, '🔁 Hoy toca tu compra de ' || t, public._cfx_rec_plata(c.monto) ||
        case when c.estado = 'pagado' or x.auto then ' · se cobra solo ⚡' else ' · págala en Mis compras recurrentes.' end);
      perform public._cfx_rec_avisar(public.cfx_negocio_dueno(x.negocio), '🔁 Hoy toca: ' || x.nombre,
        public._cfx_rec_plata(c.monto) || case when c.estado = 'pagado' or x.auto then ' · ⚡ automático' else ' · envíale el cobro 📲 desde Compras recurrentes.' end);
    end if;
    update public.cfx_recurrentes set veces = veces + 1, error = null, proxima = greatest(proxima, hoy) + cada, updated_at = now() where id = x.id;
    k := k + 1;
  end loop;
  return k;
end $$;

revoke all on public.cfx_recurrentes, public.cfx_recurrente_cobros from anon, authenticated;
revoke all on function public._cfx_rec_negocio(), public._cfx_rec_avisar(uuid, text, text), public._cfx_rec_tienda(uuid), public._cfx_rec_armar(uuid, jsonb),
  public.cfx_recurrente_json(public.cfx_recurrentes), public.cfx_recurrente_puede(uuid), public.cfx_recurrente_cobrado(text, text, int, text),
  public.cfx_recurrente_auto_evento(text, text, text, int), public.cfx_recurrentes_correr() from public, anon, authenticated;
revoke all on function public.cfx_recurrente_guardar(jsonb), public.cfx_recurrente_lista(), public.cfx_recurrente_mias(), public.cfx_recurrente_estado(uuid, boolean),
  public.cfx_recurrente_borrar(uuid), public.cfx_recurrente_pagado(uuid, text), public.cfx_recurrente_pagar(uuid, text, text), public.cfx_recurrente_auto(uuid, text, text),
  public.cfx_recurrente_revisar(uuid) from public, anon;
grant execute on function public.cfx_recurrente_guardar(jsonb), public.cfx_recurrente_lista(), public.cfx_recurrente_mias(), public.cfx_recurrente_estado(uuid, boolean),
  public.cfx_recurrente_borrar(uuid), public.cfx_recurrente_pagado(uuid, text), public.cfx_recurrente_pagar(uuid, text, text), public.cfx_recurrente_auto(uuid, text, text),
  public.cfx_recurrente_revisar(uuid) to authenticated;
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'cfx-recurrentes';
  perform cron.schedule('cfx-recurrentes', '5 12 * * *', 'select public.cfx_recurrentes_correr()');
exception when others then
  raise notice 'Compras recurrentes no programadas (%).', sqlerrm;
end $$;
