-- Centro de Mando · Instalación/actualización corta: descarga y ejecuta supabase/instalar.sql (siempre la última, rama main).
-- Desde la v3.6 basta con correrla UNA vez: después la base se actualiza sola cada 10 minutos (función auto_actualizar).
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/SaaS/main/supabase/instalar.sql?t=' || extract(epoch from now())::bigint));
end $$;
select 'Centro de Mando instalado v' || public.db_version() as resultado;
