-- CodeFix · Instalación/actualización corta (v2.0): descarga y ejecuta supabase/instalar.sql.
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/SaaS/0fa1d81ccd255e513530b3a056e0b1e84039d262/supabase/instalar.sql'));
end $$;
