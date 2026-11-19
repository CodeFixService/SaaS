-- ===================== G122 🖼️ Fotos a Storage (núcleo) =====================
-- Bucket público 'vitrina': cada uno sube SOLO a su carpeta (<su id>/<uuid>.webp), hasta 700 KB, solo imágenes. Nadie lista lo ajeno.
-- Las apps aceptan en sus fotos de vitrina el texto base64 de siempre O una URL de este bucket (cfx_foto_ok). Lo viejo sigue igual.
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
      using (bucket_id = 'vitrina' and (storage.foldername(name))[1] = (select auth.uid())::text);
    create policy cfx_vitrina_borrar on storage.objects for delete to authenticated
      using (bucket_id = 'vitrina' and (storage.foldername(name))[1] = (select auth.uid())::text);
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
