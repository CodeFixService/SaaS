-- CodeFix · Instalación/actualización corta (v2.2): descarga y ejecuta supabase/instalar.sql.
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/SaaS/b90ec98dfadb84173aa7b5b8028f81dacd3c0ba7/supabase/instalar.sql'));
end $$;
