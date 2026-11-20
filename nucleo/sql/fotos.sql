-- ===================== G122 🖼️ Fotos a Storage (núcleo) =====================
-- Bucket público 'vitrina': cada uno sube SOLO a su carpeta (<su id>/<uuid>.webp), hasta 700 KB, solo imágenes. Nadie lista lo ajeno.
-- Las apps aceptan en sus fotos de vitrina el texto base64 de siempre O una URL de este bucket (cfx_foto_ok). Lo viejo sigue igual.
-- G131 b 🧹 Carpeta de una CUENTA BORRADA: solo el admin (Centro de Mando) la ve y la borra por la API de Storage.
-- Nunca lanza error (va dentro de las reglas de Storage): ante la duda, false.
create or replace function public.cfx_foto_sin_cuenta(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare c text := split_part(coalesce(p_name, ''), '/', 1);
begin
  if c !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or (select auth.uid()) is null then return false; end if;
  if exists (select 1 from auth.users where id = c::uuid) then return false; end if;
  perform <CHK>;
  return true;
exception when others then return false;
end $$;
revoke all on function public.cfx_foto_sin_cuenta(text) from public, anon;
grant execute on function public.cfx_foto_sin_cuenta(text) to authenticated;
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('vitrina', 'vitrina', true, 716800, array['image/webp', 'image/jpeg', 'image/png'])
    on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
    drop policy if exists cfx_vitrina_subir on storage.objects;
    drop policy if exists cfx_vitrina_ver on storage.objects;
    drop policy if exists cfx_vitrina_borrar on storage.objects;
    create policy cfx_vitrina_subir on storage.objects for insert to authenticated
      with check (bucket_id = 'vitrina' and (storage.foldername(name))[1] = (select auth.uid())::text);
    create policy cfx_vitrina_ver on storage.objects for select to authenticated
      using ((bucket_id = 'vitrina' and (storage.foldername(name))[1] = (select auth.uid())::text) or (bucket_id = 'vitrina' and public.cfx_foto_sin_cuenta(name)));
    create policy cfx_vitrina_borrar on storage.objects for delete to authenticated
      using ((bucket_id = 'vitrina' and (storage.foldername(name))[1] = (select auth.uid())::text) or (bucket_id = 'vitrina' and public.cfx_foto_sin_cuenta(name)));
  end if;
end $$;

-- ¿Es una foto de la nube (bucket vitrina de Supabase)? Con p_uid: además, ¿la subió esa persona?
create or replace function public.cfx_foto_nube(t text, p_uid uuid default null) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(t, '') ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/vitrina/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|png)$'
    and (p_uid is null or split_part(split_part(t, '/vitrina/', 2), '/', 1) = p_uid::text)
$$;
-- Foto de vitrina válida: vacía, base64 liviano (≤ maxlen) o de la nube.
create or replace function public.cfx_foto_ok(t text, maxlen int) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(t, '') = '' or (t ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' and length(t) <= maxlen) or public.cfx_foto_nube(t)
$$;
grant execute on function public.cfx_foto_nube(text, uuid), public.cfx_foto_ok(text, int) to authenticated, anon;

-- G122 b 🧹 Fotos huérfanas: de una lista de MIS archivos (<uuid>.webp de mi carpeta), ¿cuáles NO aparecen en ninguna tabla?
-- Busca en TODAS las columnas de texto/json/arreglo de la app (también respaldos), así nunca se borra una foto en uso.
-- Ante cualquier duda (nombre raro, error al leer una tabla) devuelve vacío: no se borra nada.
-- Interno: de los archivos p_nombres de la carpeta u, ¿cuáles aparecen en alguna tabla? null = no se pudo leer todo (no borrar nada).
create or replace function public.cfx_fotos_en_uso(u uuid, p_nombres text[]) returns text[]
language plpgsql stable security definer set search_path = '' as $$
declare pat text; r record; txt text; n text; usados text[] := '{}';
begin
  pat := '%/vitrina/' || u::text || '/%';
  for r in select c.table_schema s, c.table_name t, c.column_name col
      from information_schema.columns c join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name
      where tb.table_type = 'BASE TABLE' and c.data_type in ('text', 'character varying', 'jsonb', 'json', 'ARRAY')
        and c.table_schema not in ('storage', 'auth', 'information_schema', 'vault', 'pgsodium', 'pgsodium_masks', 'realtime', '_realtime',
          'supabase_functions', 'supabase_migrations', 'extensions', 'graphql', 'graphql_public', 'net', 'cron', 'pgbouncer', '_analytics')
        and c.table_schema !~ '^pg_' loop
    begin
      execute format('select string_agg(%I::text, '' '') from %I.%I where %I::text like $1', r.col, r.s, r.t, r.col) into txt using pat;
    exception when others then return null;
    end;
    if txt is not null then
      foreach n in array p_nombres loop
        if position(u::text || '/' || n in txt) > 0 then usados := usados || n; end if;
      end loop;
    end if;
  end loop;
  return usados;
end $$;
revoke all on function public.cfx_fotos_en_uso(uuid, text[]) from public, anon, authenticated;

create or replace function public.cfx_fotos_libres(p_nombres text[]) returns text[]
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); n text; usados text[]; libres text[] := '{}';
begin
  if u is null or coalesce(array_length(p_nombres, 1), 0) = 0 or array_length(p_nombres, 1) > 1000 then return '{}'; end if;
  foreach n in array p_nombres loop
    if n is null or n !~ '^[0-9a-f-]{36}\.(webp|jpg|png)$' then return '{}'; end if;
  end loop;
  usados := public.cfx_fotos_en_uso(u, p_nombres);
  if usados is null then return '{}'; end if;
  foreach n in array p_nombres loop
    if not (n = any(usados)) then libres := libres || n; end if;
  end loop;
  return libres;
end $$;
revoke all on function public.cfx_fotos_libres(text[]) from public, anon;
grant execute on function public.cfx_fotos_libres(text[]) to authenticated;

-- G131 b 🧹 Fotos de CUENTAS BORRADAS (solo admin): archivos 'carpeta/archivo' que ya no usa ninguna tabla → el CM los borra por Storage.
-- Las que algo aún usa (respaldos, otra fila) se quedan. Hasta 1000 por vez.
create or replace function public.cfx_fotos_sin_cuenta() returns text[]
language plpgsql security definer set search_path = '' as $$
declare r record; usados text[]; n text; sale text[] := '{}';
begin
  perform <CHK>;
  if to_regclass('storage.objects') is null then return '{}'; end if;
  for r in execute $q$select split_part(name, '/', 1) c, array_agg(split_part(name, '/', 2) order by name) a from storage.objects
      where bucket_id = 'vitrina' and split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and split_part(name, '/', 2) ~ '^[0-9a-f-]{36}\.(webp|jpg|png)$'
        and not exists (select 1 from auth.users x where x.id::text = split_part(name, '/', 1))
      group by 1 order by 1$q$ loop
    usados := public.cfx_fotos_en_uso(r.c::uuid, r.a);
    if usados is null then return '{}'; end if;
    foreach n in array r.a loop
      if not (n = any(usados)) then sale := sale || (r.c || '/' || n); end if;
      if array_length(sale, 1) >= 1000 then return sale; end if;
    end loop;
  end loop;
  return sale;
end $$;
revoke all on function public.cfx_fotos_sin_cuenta() from public, anon;
grant execute on function public.cfx_fotos_sin_cuenta() to authenticated;
