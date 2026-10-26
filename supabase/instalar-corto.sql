-- Centro de Mando · Instalación/actualización corta (v3.4): descarga y ejecuta supabase/instalar.sql.
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/SaaS/1d6abb8adcb58e964b01b38122baa6d3abeea762/supabase/instalar.sql'));
end $$;
select 'Centro de Mando instalado v' || public.db_version() as resultado;
