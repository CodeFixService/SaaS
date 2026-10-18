-- =====================================================================
--  CodeFix · Tareas automáticas (pégalo en Supabase → SQL Editor → Run,
--  DESPUÉS de schema.sql y de crear la función "servidor").
--   · Cada 5 minutos: libera horas sin pago, recordatorios, avisos de vencimiento, limpieza diaria.
--   · Cada minuto: envía por push los avisos nuevos de la campanita.
-- =====================================================================
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname in ('bt-tareas', 'bt-push');

select cron.schedule('bt-tareas', '*/5 * * * *', $$ select public.tareas_periodicas(); $$);

select cron.schedule('bt-push', '* * * * *', $$
  select net.http_post(
    url := 'https://vqevujjraisrcoirswuq.supabase.co/functions/v1/servidor',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxZXZ1ampyYWlzcmNvaXJzd3VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMzk3NzMsImV4cCI6MjEwNzkxNTc3M30.XHeUtKmMJ5sSMCeGCzYnsYS3xQwPYrDwuylw3p7ICFk"}'::jsonb,
    body := '{}'::jsonb)
$$);
