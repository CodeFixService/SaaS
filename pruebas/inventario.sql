-- ---------------------------------------------------------------------
-- CodeFix · Inventario (igual en las 6 apps; lo usa el Centro de Mando → Apps → Respaldo y limpieza).
--   Muestra las tablas que esta versión ya NO usa (restos de versiones antiguas) con cuántas filas tienen.
--   Nada se borra solo: las vacías se borran con un toque; las que tienen datos piden descargar el respaldo y escribir "sí".
--   cfx_tablas() = las tablas que crea este archivo (la revisa pruebas/inventario.py --verificar).
-- ---------------------------------------------------------------------
create or replace function public.cfx_tablas() returns text[] language sql immutable as $$ select <LISTA> $$;
create or replace function public.cfx_inventario() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r record; n bigint; out jsonb := '[]'::jsonb;
begin
  perform <CHK>;
  for r in select s.nspname || '.' || c.relname as t, pg_total_relation_size(c.oid) as b from pg_class c join pg_namespace s on s.oid = c.relnamespace
           where s.nspname in ('public', 'privado') and c.relkind in ('r', 'p') and not (s.nspname || '.' || c.relname = any (public.cfx_tablas()))
           and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e') order by 1
  loop
    execute 'select count(*) from ' || r.t into n;
    out := out || jsonb_build_object('tabla', r.t, 'filas', n, 'bytes', r.b);
  end loop;
  return out;
end $$;
create or replace function public.cfx_inventario_datos(p_tabla text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare j jsonb;
begin
  perform <CHK>;
  if not exists (select 1 from jsonb_array_elements(public.cfx_inventario()) x where x ->> 'tabla' = p_tabla) then raise exception 'Esa tabla no está en la lista de sobrantes'; end if;
  execute 'select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from (select * from ' || p_tabla || ' limit 20000) t' into j;
  return j;
end $$;
create or replace function public.cfx_inventario_borrar(p_tabla text, p_confirmacion text default '') returns text
language plpgsql security definer set search_path = '' as $$
declare x jsonb;
begin
  perform <CHK>;
  select e into x from jsonb_array_elements(public.cfx_inventario()) e where e ->> 'tabla' = p_tabla;
  if x is null then raise exception 'Esa tabla no está en la lista de sobrantes'; end if;
  if (x ->> 'filas')::bigint > 0 and lower(trim(coalesce(p_confirmacion, ''))) not in ('sí', 'si') then
    raise exception 'La tabla tiene % filas: descarga el respaldo y escribe "sí" para borrarla', x ->> 'filas';
  end if;
  execute 'drop table ' || p_tabla || ' cascade';
  return p_tabla || ' borrada';
end $$;
revoke all on function public.cfx_tablas(), public.cfx_inventario(), public.cfx_inventario_datos(text), public.cfx_inventario_borrar(text, text) from public, anon;
grant execute on function public.cfx_inventario(), public.cfx_inventario_datos(text), public.cfx_inventario_borrar(text, text) to authenticated;
