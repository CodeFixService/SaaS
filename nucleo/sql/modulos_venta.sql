-- ---------- Módulos de pago por negocio (G19) ----------
-- Cada negocio compra (o prueba 7 días) los módulos que quiere, sea Free o Premium. Se venden sueltos o en packs
-- (Básico, Crecer, Completo). Si "Vender módulos" está apagado en esta app (Centro de Mando → Apps → 🧩), todo sigue como antes:
-- el módulo prendido sirve a todos. Precio 0 = incluido gratis para todos.
-- Gancho opcional de la app: cfx_negocio_cuenta(uuid) → el negocio de esa cuenta (dueño o su equipo); null = no es negocio.
--                            cfx_es_premium(uuid) → si el negocio tiene Premium (descuento en módulos).
create table if not exists public.cfx_modulos_negocio (
  negocio uuid not null,
  modulo  text not null check (modulo ~ '^[a-z_]{2,30}$'),
  hasta   timestamptz not null,
  origen  text not null default 'pago' check (origen in ('prueba', 'pago', 'regalo')),
  avisado timestamptz,
  creado  timestamptz not null default now(),
  primary key (negocio, modulo)
);
create index if not exists cfx_modulos_negocio_hasta_idx on public.cfx_modulos_negocio (hasta);
create table if not exists public.cfx_modulos_pruebas (
  negocio uuid not null,
  item    text not null,
  creado  timestamptz not null default now(),
  primary key (negocio, item)
);
alter table public.cfx_modulos_negocio enable row level security;
alter table public.cfx_modulos_pruebas enable row level security;
revoke all on public.cfx_modulos_negocio, public.cfx_modulos_pruebas from anon, authenticated;

-- Precios en pesos al mes. Anual = 10 meses (2 de regalo). Premium paga 20 % menos en módulos y packs.
insert into public.cfx_config (clave, valor) values ('modulos_venta', jsonb_build_object(
  'activo', false, 'prueba_dias', 7, 'descuento_premium', 20, 'anual_meses', 10, 'precio', 990, 'precios', '{}'::jsonb, 'links', '{}'::jsonb,
  'packs', jsonb_build_object(
    'basico',   jsonb_build_object('nombre', '🌱 Básico',   'detalle', 'Para que vuelvan a comprarte', 'precio', 1990, 'modulos', jsonb_build_array('cupones', 'sellos', 'calificaciones')),
    'crecer',   jsonb_build_object('nombre', '🚀 Crecer',   'detalle', 'Vende más todos los días', 'precio', 2990, 'destacado', true,
                                   'modulos', jsonb_build_array('cupones', 'sellos', 'calificaciones', 'chat', 'carrito', 'redes', 'estadisticas')),
    'completo', jsonb_build_object('nombre', '💎 Completo', 'detalle', 'Todos los módulos, también los nuevos', 'precio', 3990, 'modulos', '*'))))
on conflict (clave) do nothing;

-- Nombre y para qué sirve cada módulo (lo usan el Centro de Mando y la pantalla 🧩 Módulos del negocio).
create or replace function public.cfx_modulos_catalogo() returns table (clave text, nombre text, detalle text)
language sql immutable as $$
  values ('chat', '💬 Chat', 'Conversa con tus clientes dentro de la app, con límites contra el spam.'),
         ('calificaciones', '⭐ Calificaciones', 'Tus clientes te califican y tú a ellos: más confianza para comprar.'),
         ('cupones', '🏷️ Cupones', 'Crea códigos de descuento para tus clientes.'),
         ('sellos', '🎟️ Tarjeta de sellos', 'Cada compra suma un sello; al completar la meta, premio.'),
         ('carrito', '🛒 Recordar carrito', 'Si un cliente deja productos en el carrito, al día siguiente le llega un aviso.'),
         ('analisis', '🔎 Para vender más', 'Cada noche: clientes en riesgo, productos quietos, stock que se acaba y grupos de clientes.'),
         ('estadisticas', '📈 Estadísticas', 'Ventas, productos que más dejan y gráficos en vivo.'),
         ('equipo', '🧑‍🍳 Mi equipo', 'Suma vendedores y bodega con su propia cuenta y permisos.'),
         ('campanas', '📣 Campañas automáticas', 'Ofertas por notificación y correo a tus suscriptores.'),
         ('redes', '📲 Vender en redes', 'Pedir por WhatsApp, catálogo para Google e Instagram.'),
         ('webhooks', '🔗 Avisos a tu sistema', 'Cada pedido llega firmado a tu sistema o planilla (webhooks).'),
         ('medicion', '📊 Medir anuncios', 'Meta Pixel y Google Analytics en tu tienda: mide qué anuncio te trae ventas.'),
         ('dominio', '🌐 Dominio propio', 'Tu tienda en tu dirección (mitienda.cl) en vez del link de Despega Pyme.'),
         ('reservas', '📅 Reservas', 'Agenda en línea para tus clientes.'),
         ('recordatorios', '⏰ Recordatorios', 'Avisos automáticos antes de cada cita o vencimiento.')
$$;

create or replace function public.cfx_venta() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select valor from public.cfx_config where clave = 'modulos_venta'), '{}'::jsonb)
$$;
-- Precio al mes de un módulo o pack (0 = incluido gratis).
create or replace function public.cfx_venta_precio(p_item text) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((v #>> array['packs', p_item, 'precio'])::int, (v #>> array['precios', p_item])::int, (v ->> 'precio')::int, 0)
  from (select public.cfx_venta() v) x
$$;
-- ¿Está prendida la venta de módulos en esta app? (si no, todo funciona como antes del G19)
create or replace function public.cfx_venta_on() returns boolean
language sql stable security definer set search_path = '' as $$ select coalesce((public.cfx_venta() ->> 'activo')::boolean, false) $$;
-- ¿Este módulo se vende aparte en esta app? (venta prendida y precio > 0)
create or replace function public.cfx_venta_activa(p_modulo text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.cfx_venta_on() and p_modulo = any(public.cfx_modulos_de_app()) and public.cfx_venta_precio(p_modulo) > 0
$$;
-- Módulos que trae un pack ('*' = todos los de la app) o el módulo mismo.
create or replace function public.cfx_venta_modulos(p_item text) returns text[]
language plpgsql stable security definer set search_path = '' as $$
declare p jsonb := public.cfx_venta() #> array['packs', p_item];
begin
  if p is null then return case when p_item = any(public.cfx_modulos_de_app()) then array[p_item] else '{}'::text[] end; end if;
  if p ->> 'modulos' = '*' then return public.cfx_modulos_de_app(); end if;
  return array(select x from jsonb_array_elements_text(coalesce(p -> 'modulos', '[]')) x where x = any(public.cfx_modulos_de_app()));
end $$;

create or replace function public.cfx_negocio_cuenta(p_cuenta uuid) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare n uuid;
begin
  if p_cuenta is null then return null; end if;
  if to_regprocedure('public.cfx_negocio_de_cuenta(uuid)') is not null then execute 'select public.cfx_negocio_de_cuenta($1)' into n using p_cuenta;
  elsif to_regprocedure('public.cfx_analisis_negocio(uuid)') is not null then execute 'select public.cfx_analisis_negocio($1)' into n using p_cuenta;
  else n := p_cuenta; end if;
  return n;
end $$;
create or replace function public.cfx_negocio_premium(p_negocio uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare r boolean;
begin
  if p_negocio is null or to_regprocedure('public.cfx_es_premium(uuid)') is null then return false; end if;
  execute 'select public.cfx_es_premium($1)' into r using p_negocio;
  return coalesce(r, false);
end $$;

-- ¿El negocio puede usar el módulo ahora? (prendido en la app + comprado, en prueba, regalado o incluido gratis)
create or replace function public.cfx_modulo_de(p_modulo text, p_negocio uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.cfx_modulo(p_modulo) and (not public.cfx_venta_activa(p_modulo)
    or exists (select 1 from public.cfx_modulos_negocio m where m.negocio = p_negocio and m.modulo = p_modulo and m.hasta > now()))
$$;
create or replace function public.cfx_modulo_mio(p_modulo text) returns boolean
language sql stable security definer set search_path = '' as $$ select public.cfx_modulo_de(p_modulo, public.cfx_negocio_cuenta(auth.uid())) $$;

-- Lo que puede usar cada negocio: {"chat": true, ...}. Para una tienda que ve un cliente.
create or replace function public.cfx_modulos_de(p_negocio uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select jsonb_object_agg(k, public.cfx_modulo_de(k, p_negocio)) from unnest(public.cfx_modulos_de_app()) k), '{}')
$$;

-- Activa (o alarga) los módulos de un item por N días; N <= 0 los quita. Devuelve hasta cuándo.
create or replace function public.cfx_modulos_dar(p_negocio uuid, p_item text, p_dias int, p_origen text default 'pago') returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare k text; h timestamptz; mx timestamptz;
begin
  if p_negocio is null or cardinality(public.cfx_venta_modulos(p_item)) = 0 then raise exception 'Módulo no válido'; end if;
  foreach k in array public.cfx_venta_modulos(p_item) loop
    if coalesce(p_dias, 0) <= 0 then delete from public.cfx_modulos_negocio where negocio = p_negocio and modulo = k; continue; end if;
    insert into public.cfx_modulos_negocio as m (negocio, modulo, hasta, origen) values (p_negocio, k, now() + make_interval(days => p_dias), p_origen)
    on conflict (negocio, modulo) do update set hasta = greatest(m.hasta, now()) + make_interval(days => p_dias),
      origen = case when excluded.origen = 'prueba' then m.origen else excluded.origen end, avisado = null
    returning hasta into h;
    mx := greatest(mx, h);
  end loop;
  return mx;
end $$;

-- Pantalla 🧩 Módulos del negocio: catálogo, precios (con su descuento Premium), lo que tiene y hasta cuándo.
create or replace function public.cfx_modulos_tienda() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb := public.cfx_venta(); n uuid := public.cfx_negocio_cuenta(auth.uid()); pre boolean; d int; am int;
begin
  if n is null then raise exception 'Solo para negocios'; end if;
  pre := public.cfx_negocio_premium(n);
  d := case when pre then greatest(0, least(90, coalesce((v ->> 'descuento_premium')::int, 0))) else 0 end;
  am := greatest(1, least(12, coalesce((v ->> 'anual_meses')::int, 10)));
  return jsonb_build_object('activo', coalesce((v ->> 'activo')::boolean, false), 'premium', pre, 'descuento', d, 'anual_meses', am,
    'descuento_pro', case when pre then 0 else greatest(0, least(90, coalesce((v ->> 'descuento_premium')::int, 0))) end,
    'prueba_dias', coalesce((v ->> 'prueba_dias')::int, 7), 'dueno', n = auth.uid(),
    'prueba_pack', exists (select 1 from public.cfx_modulos_pruebas p where p.negocio = n and p.item like 'pack:%'),
    'modulos', coalesce((select jsonb_agg(jsonb_build_object('clave', k, 'nombre', coalesce(c.nombre, k), 'detalle', coalesce(c.detalle, ''),
        'precio', round(public.cfx_venta_precio(k) * (100 - d) / 100.0)::int, 'lista', public.cfx_venta_precio(k),
        'vende', public.cfx_venta_activa(k), 'activo', public.cfx_modulo_de(k, n),
        'hasta', m.hasta, 'origen', m.origen, 'prueba_usada', exists (select 1 from public.cfx_modulos_pruebas p where p.negocio = n and p.item = k),
        'links', v #> array['links', k]) order by o)
      from unnest(public.cfx_modulos_de_app()) with ordinality u(k, o)
      left join public.cfx_modulos_catalogo() c on c.clave = k
      left join public.cfx_modulos_negocio m on m.negocio = n and m.modulo = k
      where public.cfx_modulo(k)), '[]'),
    'packs', coalesce((select jsonb_agg(jsonb_build_object('clave', p.key, 'nombre', p.value ->> 'nombre', 'detalle', coalesce(p.value ->> 'detalle', ''),
        'destacado', coalesce((p.value ->> 'destacado')::boolean, false), 'modulos', to_jsonb(public.cfx_venta_modulos(p.key)),
        'precio', round(coalesce((p.value ->> 'precio')::int, 0) * (100 - d) / 100.0)::int, 'lista', coalesce((p.value ->> 'precio')::int, 0),
        'suelto', (select coalesce(sum(public.cfx_venta_precio(x)), 0) from unnest(public.cfx_venta_modulos(p.key)) x),
        'links', v #> array['links', p.key]) order by coalesce((p.value ->> 'precio')::int, 0))
      from jsonb_each(coalesce(v -> 'packs', '{}')) p where cardinality(public.cfx_venta_modulos(p.key)) > 0), '[]'));
end $$;

-- Probar gratis: cada módulo una vez, y un solo pack por negocio. Solo el dueño.
create or replace function public.cfx_modulo_probar(p_item text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb := public.cfx_venta(); n uuid := public.cfx_negocio_cuenta(auth.uid()); pack boolean := (public.cfx_venta() #> array['packs', p_item]) is not null;
        dias int := greatest(1, least(30, coalesce((v ->> 'prueba_dias')::int, 7))); h timestamptz;
begin
  if n is null or n <> auth.uid() then raise exception 'Solo el dueño del negocio'; end if;
  if not coalesce((v ->> 'activo')::boolean, false) or cardinality(public.cfx_venta_modulos(p_item)) = 0 then raise exception 'Módulo no válido'; end if;
  if pack and exists (select 1 from public.cfx_modulos_pruebas where negocio = n and item like 'pack:%') then raise exception 'Ya usaste la prueba gratis de un pack'; end if;
  if not pack and exists (select 1 from public.cfx_modulos_pruebas where negocio = n and item = p_item) then raise exception 'Ya usaste la prueba gratis de este módulo'; end if;
  if not pack and public.cfx_modulo_de(p_item, n) then raise exception 'Ya tienes este módulo activo'; end if;
  insert into public.cfx_modulos_pruebas (negocio, item) values (n, case when pack then 'pack:' || p_item else p_item end);
  -- La prueba no alarga lo que ya está pagado: solo prende lo que no tiene.
  insert into public.cfx_modulos_negocio as m (negocio, modulo, hasta, origen)
  select n, k, now() + make_interval(days => dias), 'prueba' from unnest(public.cfx_venta_modulos(p_item)) k
  on conflict (negocio, modulo) do update set hasta = greatest(m.hasta, excluded.hasta), origen = case when m.hasta > now() then m.origen else 'prueba' end, avisado = null;
  select max(hasta) into h from public.cfx_modulos_negocio where negocio = n and modulo = any(public.cfx_venta_modulos(p_item));
  perform public.cfx_anotar('módulo', 'prueba ' || p_item || ' · ' || n);
  return jsonb_build_object('ok', true, 'hasta', h);
end $$;

-- Aviso 3 días antes de que venza (una vez por vencimiento). Lo corre el cron diario.
create or replace function public.cfx_modulos_avisar() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; c int := 0;
begin
  for r in select m.negocio, min(m.hasta) hasta, string_agg(coalesce(k.nombre, m.modulo), ', ' order by m.modulo) nombres
           from public.cfx_modulos_negocio m left join public.cfx_modulos_catalogo() k on k.clave = m.modulo
           where m.avisado is null and m.hasta between now() and now() + interval '3 days' group by m.negocio limit 500 loop
    perform public.cfx_avisar(r.negocio, '🧩 Tus módulos vencen pronto', left(r.nombres, 120) || ' · vence el ' ||
      to_char(r.hasta at time zone 'America/Santiago', 'DD/MM') || '. Renuévalos en Ajustes → 🧩 Módulos y no pierdes nada.');
    update public.cfx_modulos_negocio set avisado = now() where negocio = r.negocio and avisado is null and hasta between now() and now() + interval '3 days';
    c := c + 1;
  end loop;
  return c;
end $$;

-- Al borrar un negocio (lo llama la app): sus módulos y sus pruebas.
create or replace function public.cfx_modulos_borrar(p_negocio uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.cfx_modulos_negocio where negocio = p_negocio;
  delete from public.cfx_modulos_pruebas where negocio = p_negocio;
$$;

-- ---------- Centro de Mando ----------
create or replace function public.cfx_venta_admin() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return jsonb_build_object('config', public.cfx_venta(), 'app', to_jsonb(public.cfx_modulos_de_app()),
    'catalogo', (select coalesce(jsonb_agg(jsonb_build_object('clave', c.clave, 'nombre', c.nombre)), '[]') from public.cfx_modulos_catalogo() c where c.clave = any(public.cfx_modulos_de_app())),
    'activos', (select count(distinct negocio) from public.cfx_modulos_negocio where hasta > now() and origen = 'pago'),
    'pruebas', (select count(distinct negocio) from public.cfx_modulos_negocio where hasta > now() and origen = 'prueba'),
    'negocios', coalesce((select jsonb_agg(x order by x.hasta) from (
      select m.negocio, coalesce((select u.email from auth.users u where u.id = m.negocio), '') email, min(m.hasta) hasta,
        jsonb_agg(jsonb_build_object('modulo', m.modulo, 'hasta', m.hasta, 'origen', m.origen) order by m.modulo) modulos
      from public.cfx_modulos_negocio m where m.hasta > now() - interval '30 days' group by m.negocio limit 300) x), '[]'));
end $$;

create or replace function public.cfx_venta_guardar(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb := public.cfx_venta(); l record; u record;
begin
  perform <CHK>;
  if jsonb_typeof(p) <> 'object' then raise exception 'Datos no válidos'; end if;
  v := v || jsonb_strip_nulls(p - 'packs' - 'precios' - 'links')
         || jsonb_build_object('precios', coalesce(p -> 'precios', v -> 'precios', '{}'),   -- llegan completos desde el CM
                               'links', coalesce(p -> 'links', v -> 'links', '{}'),
                               'packs', coalesce(p -> 'packs', v -> 'packs', '{}'));
  if coalesce((v ->> 'precio')::numeric, 0) not between 0 and 1000000 or coalesce((v ->> 'descuento_premium')::numeric, 0) not between 0 and 90
     or coalesce((v ->> 'prueba_dias')::numeric, 7) not between 0 and 30 or coalesce((v ->> 'anual_meses')::numeric, 10) not between 1 and 12 then
    raise exception 'Revisa los números: precio de 0 a 1.000.000, descuento de 0 a 90 %%, prueba de 0 a 30 días, anual de 1 a 12 meses';
  end if;
  for l in select key, value from jsonb_each(coalesce(v -> 'precios', '{}')) loop
    if jsonb_typeof(l.value) <> 'number' or l.value::numeric not between 0 and 1000000 then raise exception 'Precio no válido: %', l.key; end if;
  end loop;
  for l in select key, value from jsonb_each(coalesce(v -> 'links', '{}')) loop
    for u in select key, value from jsonb_each_text(case when jsonb_typeof(l.value) = 'object' then l.value else '{}' end) loop
      if coalesce(u.value, '') <> '' and u.value !~ '^https://[^ ]+$' then raise exception 'El link de % debe empezar con https://', l.key; end if;
    end loop;
  end loop;
  update public.cfx_config set valor = v where clave = 'modulos_venta';
  perform public.cfx_anotar('módulos', 'venta ' || case when coalesce((v ->> 'activo')::boolean, false) then 'prendida' else 'apagada' end);
  return public.cfx_venta_admin();
end $$;

-- Regalar o quitar (p_dias = 0) un módulo o pack a un negocio por su correo.
create or replace function public.cfx_modulo_regalar(p_email text, p_item text, p_dias int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid; n uuid; h timestamptz;
begin
  perform <CHK>;
  select id into u from auth.users where lower(email) = lower(trim(coalesce(p_email, '')));
  if u is null then raise exception 'No hay una cuenta con ese correo en esta app'; end if;
  n := public.cfx_negocio_cuenta(u);
  if n is null then raise exception 'Esa cuenta no es un negocio'; end if;
  if coalesce(p_dias, 0) not between 0 and 3660 then raise exception 'De 0 a 3660 días'; end if;
  h := public.cfx_modulos_dar(n, p_item, p_dias, 'regalo');
  if h is not null then perform public.cfx_avisar(n, '🎁 Te regalamos un módulo', coalesce((select c.nombre from public.cfx_modulos_catalogo() c where c.clave = p_item), public.cfx_venta() #>> array['packs', p_item, 'nombre'], p_item) ||
    ' activo hasta el ' || to_char(h at time zone 'America/Santiago', 'DD/MM/YYYY') || '.'); end if;
  perform public.cfx_anotar('módulo', case when h is null then 'quitó ' else 'regaló ' || p_dias || ' días de ' end || p_item || ' a ' || lower(trim(p_email)));
  return public.cfx_venta_admin();
end $$;

revoke all on function public.cfx_modulos_catalogo(), public.cfx_venta(), public.cfx_venta_on(), public.cfx_venta_precio(text), public.cfx_venta_activa(text), public.cfx_venta_modulos(text),
  public.cfx_negocio_cuenta(uuid), public.cfx_negocio_premium(uuid), public.cfx_modulo_de(text, uuid), public.cfx_modulo_mio(text),
  public.cfx_modulos_dar(uuid, text, int, text), public.cfx_modulos_avisar(), public.cfx_modulos_borrar(uuid) from public, anon, authenticated;
revoke all on function public.cfx_modulos_de(uuid), public.cfx_modulos_tienda(), public.cfx_modulo_probar(text), public.cfx_venta_admin(),
  public.cfx_venta_guardar(jsonb), public.cfx_modulo_regalar(text, text, int) from public, anon;
grant execute on function public.cfx_modulos_de(uuid) to anon, authenticated;
grant execute on function public.cfx_modulos_tienda(), public.cfx_modulo_probar(text), public.cfx_venta_admin(), public.cfx_venta_guardar(jsonb),
  public.cfx_modulo_regalar(text, text, int) to authenticated;
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'cfx-modulos';
  perform cron.schedule('cfx-modulos', '17 13 * * *', 'select public.cfx_modulos_avisar()');
exception when others then
  raise notice 'Aviso de módulos por vencer no programado (%).', sqlerrm;
end $$;
