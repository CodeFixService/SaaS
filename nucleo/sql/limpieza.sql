-- ---------- 🧹 Limpieza (C18): una sola lista para el Centro de Mando → Mis aplicaciones → ↻ → 🧹 Respaldo y limpieza ----------
-- Lo del núcleo (claves "n_…") se borra solo cada noche si la limpieza automática está prendida (por defecto sí).
-- Lo propio de cada app viene del gancho cfx_limpieza_app() → [{clave, titulo, detalle, filas}] y cfx_limpiar_app(clave) → int
-- (la app ya lo borra sola con su propio horario; aquí se puede borrar a mano).
create index if not exists cfx_registro_creado_idx on public.cfx_registro (creado);
create index if not exists cfx_errores_ultimo_idx on public.cfx_errores (ultimo);
insert into public.cfx_config (clave, valor) values ('limpieza_auto', 'true') on conflict (clave) do nothing;

create or replace function public.cfx_limpieza_nucleo() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  return jsonb_build_array(
    jsonb_build_object('clave', 'n_registro', 'titulo', 'Registro de cambios', 'detalle', 'Más de 180 días.', 'auto', true,
      'filas', (select count(*) from public.cfx_registro where creado < now() - interval '180 days')),
    jsonb_build_object('clave', 'n_errores', 'titulo', 'Errores de la app', 'detalle', 'Sin repetirse hace más de 30 días.', 'auto', true,
      'filas', (select count(*) from public.cfx_errores where ultimo < now() - interval '30 days')),
    jsonb_build_object('clave', 'n_reportes', 'titulo', 'Reportes del chat ya revisados', 'detalle', 'Más de 90 días.', 'auto', true,
      'filas', (select count(*) from public.cfx_reportes where resuelto and creado < now() - interval '90 days')),
    jsonb_build_object('clave', 'n_carritos', 'titulo', 'Carritos abandonados', 'detalle', 'Sin tocar hace más de 30 días.', 'auto', true,
      'filas', (select count(*) from public.cfx_carritos where actualizado < now() - interval '30 days')));
end $$;

create or replace function public.cfx_limpiar_nucleo(p_clave text) returns int
language plpgsql security definer set search_path = '' as $$
declare n int := 0;
begin
  if p_clave = 'n_registro' then delete from public.cfx_registro where creado < now() - interval '180 days';
  elsif p_clave = 'n_errores' then delete from public.cfx_errores where ultimo < now() - interval '30 days';
  elsif p_clave = 'n_reportes' then delete from public.cfx_reportes where resuelto and creado < now() - interval '90 days';
  elsif p_clave = 'n_carritos' then delete from public.cfx_carritos where actualizado < now() - interval '30 days';
  else return 0; end if;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.cfx_limpieza() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare a jsonb := '[]';
begin
  perform <CHK>;
  if to_regprocedure('public.cfx_limpieza_app()') is not null then
    execute 'select public.cfx_limpieza_app()' into a;
  end if;
  return public.cfx_limpieza_nucleo() || coalesce(a, '[]');
end $$;

create or replace function public.cfx_limpiar(p_clave text) returns int
language plpgsql security definer set search_path = '' as $$
declare n int := 0;
begin
  perform <CHK>;
  if p_clave like 'n\_%' then
    if not exists (select 1 from jsonb_array_elements(public.cfx_limpieza_nucleo()) x where x ->> 'clave' = p_clave) then raise exception 'Opción no válida'; end if;
    n := public.cfx_limpiar_nucleo(p_clave);
  elsif to_regprocedure('public.cfx_limpiar_app(text)') is not null then
    execute 'select public.cfx_limpiar_app($1)' into n using p_clave;
  else raise exception 'Opción no válida'; end if;
  perform public.cfx_anotar('limpieza', p_clave || ': ' || coalesce(n, 0) || ' borrados');
  return coalesce(n, 0);
end $$;

-- Cada noche (pg_cron 'cfx-limpieza'): borra lo del núcleo marcado "auto" y anota cuánto.
create or replace function public.cfx_limpieza_auto() returns int
language plpgsql security definer set search_path = '' as $$
declare x jsonb; n int := 0;
begin
  if not coalesce(((select valor from public.cfx_config where clave = 'limpieza_auto') #>> '{}')::boolean, true) then return 0; end if;
  for x in select * from jsonb_array_elements(public.cfx_limpieza_nucleo()) loop
    if (x ->> 'auto')::boolean and (x ->> 'filas')::int > 0 then n := n + public.cfx_limpiar_nucleo(x ->> 'clave'); end if;
  end loop;
  insert into public.cfx_salud (clave, valor, cuando) values ('limpieza', jsonb_build_object('filas', n), now())
  on conflict (clave) do update set valor = excluded.valor, cuando = excluded.cuando;
  if n > 0 then perform public.cfx_anotar('limpieza automática', n || ' filas viejas borradas'); end if;
  return n;
end $$;

-- Interruptor del Centro de Mando: { activo, ultima, filas }.
create or replace function public.cfx_limpieza_auto_ver() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return jsonb_build_object('activo', coalesce(((select valor from public.cfx_config where clave = 'limpieza_auto') #>> '{}')::boolean, true),
    'ultima', (select cuando from public.cfx_salud where clave = 'limpieza'), 'filas', (select (valor ->> 'filas')::int from public.cfx_salud where clave = 'limpieza'));
end $$;
create or replace function public.cfx_limpieza_auto_guardar(p_activo boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  insert into public.cfx_config (clave, valor) values ('limpieza_auto', to_jsonb(coalesce(p_activo, true)))
  on conflict (clave) do update set valor = excluded.valor;
  perform public.cfx_anotar('limpieza automática', case when coalesce(p_activo, true) then 'prendida' else 'apagada' end);
  return public.cfx_limpieza_auto_ver();
end $$;

revoke all on function public.cfx_limpieza_nucleo(), public.cfx_limpiar_nucleo(text), public.cfx_limpieza_auto() from public, anon, authenticated;
revoke all on function public.cfx_limpieza(), public.cfx_limpiar(text), public.cfx_limpieza_auto_ver(), public.cfx_limpieza_auto_guardar(boolean) from public, anon;
grant execute on function public.cfx_limpieza(), public.cfx_limpiar(text), public.cfx_limpieza_auto_ver(), public.cfx_limpieza_auto_guardar(boolean) to authenticated;
do $$
begin
  if to_regprocedure('public.cfx_limpieza_app()') is not null then revoke all on function public.cfx_limpieza_app() from public, anon, authenticated; end if;
  if to_regprocedure('public.cfx_limpiar_app(text)') is not null then revoke all on function public.cfx_limpiar_app(text) from public, anon, authenticated; end if;
end $$;
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'cfx-limpieza';
  perform cron.schedule('cfx-limpieza', '40 7 * * *', 'select public.cfx_limpieza_auto()');
exception when others then
  raise notice 'Limpieza automática no programada (%).', sqlerrm;
end $$;
