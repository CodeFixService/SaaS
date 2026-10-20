-- CodeFix · Instalación/actualización corta (v3.0): descarga y ejecuta supabase/instalar.sql.
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/SaaS/49dd184ac2765fbd75e43e90c7738d562b1d5924/supabase/instalar.sql'));
end $$;
