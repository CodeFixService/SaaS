-- CodeFix · Instalación/actualización corta (v3.0): descarga y ejecuta supabase/instalar.sql.
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/SaaS/c348aa7e09dda5382510fa42512b633a100f3981/supabase/instalar.sql'));
end $$;
