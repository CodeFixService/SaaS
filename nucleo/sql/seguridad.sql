
-- ---------- Seguridad (A7): lo que puede hacer alguien sin cuenta (anon) y los buckets de archivos ----------
-- Va al final del núcleo: así alcanza a todas las funciones de la app.
-- 1) En Supabase anon recibe permiso para TODA función nueva ("revoke ... from public" no se lo quita). Las que lo primero que hacen es
--    exigir ser admin igual fallarían: se les quita el permiso a anon (no cambia nada para quien tiene cuenta).
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as fn from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute')
      and p.prolang = (select oid from pg_language where lanname = 'plpgsql')
      and substring(lower(p.prosrc) from '\mbegin\M(.*)$') ~ ('^\s*perform\s+' || regexp_replace(lower('<CHK>'), '([().])', '\\\1', 'g') || '\s*;')
  loop
    execute 'revoke execute on function ' || f.fn || ' from public, anon';
  end loop;
end $$;
revoke execute on function public.cfx_anotar(text, text) from public, anon;

-- 2) Buckets públicos (se ven con su dirección): solo fotos y de hasta 5 MB, si la app no puso otro límite.
update storage.buckets set file_size_limit = 5242880 where public and file_size_limit is null;
update storage.buckets set allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'] where public and allowed_mime_types is null;

-- 3) Revisión para el Centro de Mando → Control → 🛡️ Seguridad.
create or replace function public.cfx_seguridad() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return jsonb_build_object(
    'sin_rls', coalesce((select jsonb_agg(c.relname order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
        and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('anon', c.oid, 'insert,update,delete'))), '[]'),
    'anon_escribe', coalesce((select jsonb_agg(p.tablename || ' · ' || lower(p.cmd) order by p.tablename) from pg_policies p
      where p.schemaname = 'public' and p.cmd <> 'SELECT' and (p.roles @> '{anon}' or p.roles @> '{public}')), '[]'),
    'anon_lee', coalesce((select jsonb_agg(distinct p.tablename) from pg_policies p
      where p.schemaname = 'public' and p.cmd in ('SELECT', 'ALL') and (p.roles @> '{anon}' or p.roles @> '{public}')), '[]'),
    'funciones_anon', coalesce((select jsonb_agg(p.proname order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prokind = 'f' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')), '[]'),
    'buckets', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'publico', b.public, 'mb', round(b.file_size_limit / 1048576.0, 1),
        'tipos', b.allowed_mime_types,
        'anon_lista', exists (select 1 from pg_policies p where p.schemaname = 'storage' and p.tablename = 'objects'
          and p.cmd in ('SELECT', 'ALL') and (p.roles @> '{anon}' or p.roles @> '{public}'))) order by b.id) from storage.buckets b), '[]'),
    'humano', public.cfx_humano() - 'site_key' || jsonb_build_object('activo', coalesce(public.cfx_humano() ->> 'site_key', '') <> ''));
end $$;
revoke all on function public.cfx_seguridad() from public, anon;
grant execute on function public.cfx_seguridad() to authenticated;

-- G87 C · 🔑 Clave temporal: la cuenta que crea el admin (o a la que le restablece la clave) debe crear su clave al entrar.
-- Solo guarda el correo (nunca la clave). El admin la marca; la persona la borra al guardar su clave nueva.
create table if not exists public.cfx_clave_temporal (email text primary key, creado timestamptz not null default now());
alter table public.cfx_clave_temporal enable row level security;
revoke all on public.cfx_clave_temporal from anon, authenticated;
create or replace function public.cfx_clave_temporal_marcar(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  if coalesce(p_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Correo no válido'; end if;
  insert into public.cfx_clave_temporal (email) values (lower(trim(p_email))) on conflict (email) do update set creado = now();
  perform public.cfx_anotar('clave temporal', lower(trim(p_email)));
end $$;
create or replace function public.cfx_clave_debo() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cfx_clave_temporal t join auth.users u on lower(u.email) = t.email where u.id = auth.uid())
$$;
create or replace function public.cfx_clave_cambiada() returns void
language sql security definer set search_path = '' as $$
  delete from public.cfx_clave_temporal where email = (select lower(email) from auth.users where id = auth.uid())
$$;
revoke all on function public.cfx_clave_temporal_marcar(text), public.cfx_clave_debo(), public.cfx_clave_cambiada() from public, anon;
grant execute on function public.cfx_clave_temporal_marcar(text), public.cfx_clave_debo(), public.cfx_clave_cambiada() to authenticated;
