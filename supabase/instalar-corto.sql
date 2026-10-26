-- Centro de Mando · Instalación/actualización corta (v3.4): descarga y ejecuta supabase/instalar.sql.
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/SaaS/013a5b5866659c2e592bb9e25fc3901f487ed0a6/supabase/instalar.sql'));
end $$;
select 'Centro de Mando instalado v' || public.db_version() as resultado;
