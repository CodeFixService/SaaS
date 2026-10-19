-- CodeFix · Instalación/actualización corta (v2.1): descarga y ejecuta supabase/instalar.sql.
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/SaaS/0949dbc24011276abd0b35c0b03f6258fd3ead26/supabase/instalar.sql'));
end $$;
