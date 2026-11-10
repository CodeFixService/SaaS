
-- ---------- Analítica (E24 · E25 · E27): el análisis nocturno lo hace Python en GitHub Actions (SaaS: analisis.yml + analisis/analisis.py) ----------
-- 1) Python lee cfx_analisis_datos() con la conexión del respaldo (solo la base: nadie con cuenta puede llamarla).
-- 2) Calcula tendencias de la app (CM → 📊 Analítica) y, por negocio, clientes que dejaron de comprar y productos quietos (E27).
-- 3) Lo devuelve con cfx_analisis_guardar(): una fila 'app' y una por negocio en cfx_analisis.
-- Ganchos de cada app (opcionales; sin ellos hay solo números generales):
--   cfx_analisis_datos_app() → {ventas: [{n, c, f, m, l: [[clave, cant]]}], clientes: {c: {nombre, tel}}, productos: [{n, k, nombre, stock, creado}],
--                               negocios: [{id, nombre, creado, ingreso}]}
--   cfx_analisis_negocio(u) → uuid del negocio que ve ese usuario (null: ninguno). Módulo 'analisis' (🧩 en el CM).
create table if not exists public.cfx_analisis (clave text primary key, datos jsonb not null default '{}', calculado timestamptz not null default now());
alter table public.cfx_analisis enable row level security;
revoke all on public.cfx_analisis from anon, authenticated;

create or replace function public.cfx_analisis_datos() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare a jsonb; d date := (now() at time zone 'America/Santiago')::date;
begin
  if to_regprocedure('public.cfx_analisis_datos_app()') is not null then execute 'select public.cfx_analisis_datos_app()' into a; end if;
  return jsonb_build_object('hoy', d, 'modulo', public.cfx_modulo('analisis'),
    'usuarios', (select jsonb_build_object('total', count(*),
        'activos7', count(*) filter (where last_sign_in_at > now() - interval '7 days'),
        'activos30', count(*) filter (where last_sign_in_at > now() - interval '30 days'),
        'dias', coalesce((select jsonb_object_agg(x.f, x.n) from (select (created_at at time zone 'America/Santiago')::date f, count(*) n from auth.users
          where created_at > now() - interval '61 days' and deleted_at is null group by 1) x), '{}'))
      from auth.users where deleted_at is null),
    'ingresos', coalesce((select jsonb_object_agg(x.f, x.m) from (select (coalesce(resuelto, creado) at time zone 'America/Santiago')::date f, sum(monto) m
      from public.cfx_pagos where estado = 'aprobado' and coalesce(resuelto, creado) > now() - interval '61 days' group by 1) x), '{}'),
    'premium', (select count(distinct cuenta) from public.cfx_pagos where estado = 'aprobado' and coalesce(resuelto, creado) > now() - interval '30 days'),
    'previo', coalesce((select jsonb_object_agg(clave, datos -> 'mov') from public.cfx_analisis where clave <> 'app' and datos ? 'mov'), '{}'),
    'app', a);
end $$;

create or replace function public.cfx_analisis_guardar(p jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare n int := 0; k text; v jsonb;
begin
  if jsonb_typeof(p -> 'app') = 'object' then
    insert into public.cfx_analisis (clave, datos, calculado) values ('app', p -> 'app', now())
    on conflict (clave) do update set datos = excluded.datos, calculado = now();
  end if;
  delete from public.cfx_analisis where clave <> 'app' and not (coalesce(p -> 'negocios', '{}') ? clave);
  for k, v in select * from jsonb_each(coalesce(p -> 'negocios', '{}')) loop
    insert into public.cfx_analisis (clave, datos, calculado) values (k, v, now())
    on conflict (clave) do update set datos = excluded.datos, calculado = now();
    n := n + 1;
  end loop;
  perform public.cfx_salud_marca('analisis', jsonb_build_object('negocios', n, 'run', coalesce(p ->> 'run', '')));
  return n;
end $$;
revoke all on function public.cfx_analisis_datos(), public.cfx_analisis_guardar(jsonb) from public, anon, authenticated;

-- Centro de Mando → 📊 Analítica.
create or replace function public.cfx_analisis_app() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return (select datos || jsonb_build_object('calculado', calculado) from public.cfx_analisis where clave = 'app');
end $$;
revoke all on function public.cfx_analisis_app() from public, anon;
grant execute on function public.cfx_analisis_app() to authenticated;

-- Para el negocio (E27): sus clientes en riesgo y productos quietos (sin la foto interna del stock).
create or replace function public.cfx_analisis_mio() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n uuid;
begin
  if auth.uid() is null or not public.cfx_modulo('analisis') or to_regprocedure('public.cfx_analisis_negocio(uuid)') is null then return null; end if;
  execute 'select public.cfx_analisis_negocio($1)' into n using auth.uid();
  if n is null or not public.cfx_modulo_de('analisis', n) then return null; end if;
  return (select (datos - 'mov') || jsonb_build_object('calculado', calculado) from public.cfx_analisis where clave = n::text);
end $$;
revoke all on function public.cfx_analisis_mio() from public, anon;
grant execute on function public.cfx_analisis_mio() to authenticated;
