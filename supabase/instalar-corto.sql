-- CodeFix · Instalación/actualización corta (v2.3): descarga y ejecuta supabase/instalar.sql.
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/SaaS/8120f57529523a699cd185d2bcac14a139af4c9f/supabase/instalar.sql'));
end $$;
