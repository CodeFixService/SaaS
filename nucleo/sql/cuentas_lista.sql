-- 🧹 G111 parte 2 · VER cuentas (solo lectura, no borra nada). Supabase → SQL Editor → Run, en cada app MENOS Cerebro.
-- Copia el resultado (Export → CSV o pantallazo) y pásaselo a Claude marcando cuáles se BORRAN.
select row_number() over (order by u.created_at) as n,
       coalesce(u.email, '') as correo,
       coalesce(u.phone, u.raw_user_meta_data->>'telefono', '') as telefono,
       coalesce(u.raw_user_meta_data->>'nombre', u.raw_user_meta_data->>'name', '') as nombre,
       to_char(u.created_at, 'DD/MM/YY') as creada,
       coalesce(to_char(u.last_sign_in_at, 'DD/MM/YY'), 'nunca') as ultimo_ingreso,
       case when exists (select 1 from public.cfx_socios s where s.email = lower(u.email)) then 'socio' else '' end as tipo
from auth.users u
order by u.created_at;
