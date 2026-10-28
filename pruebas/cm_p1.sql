-- Prueba P1 Centro de Mando: pagos se conservan al reinstalar, aviso de limpieza, respaldo y limpieza del admin.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000001', 'juanjosuecastilloloyola@gmail.com'), ('00000000-0000-0000-0000-000000000002', 'u@x.cl');
insert into public.pagos (usuario, plan, monto, estado, comprobante, created_at, resuelto_at) values
 ('00000000-0000-0000-0000-000000000002', 'mensual', 4900, 'aprobado', null, now() - interval '400 days', now() - interval '400 days'),
 ('00000000-0000-0000-0000-000000000002', 'mensual', 4900, 'pendiente', repeat('x', 200), now(), null);
insert into public.notificaciones (para, titulo, created_at) values ('00000000-0000-0000-0000-000000000002', 'viejo', now() - interval '29 days'),
 ('00000000-0000-0000-0000-000000000002', 'medio', now() - interval '22 days'), ('00000000-0000-0000-0000-000000000002', 'nuevo', now());
