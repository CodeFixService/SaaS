-- Centro de Mando · Instalación/actualización corta (v3.5): descarga y ejecuta supabase/instalar.sql.
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/SaaS/f84f060c86afb0c381e3e9583c580e45dfeb53b6/supabase/instalar.sql'));
end $$;
select 'Centro de Mando instalado v' || public.db_version() as resultado;
