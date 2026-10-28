\set ON_ERROR_STOP 1
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'juanjosuecastilloloyola@gmail.com');
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000b1', 'taller@x.cl', '{"rol":"taller","taller_nombre":"Bici Ana","nombre":"Ana"}');
select id as tid from public.talleres \gset
insert into public.invitaciones (email, nombre, rol, taller_id) values ('cli@x.cl', 'Pepe', 'cliente', :'tid');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c1', 'cli@x.cl');
insert into public.mensajes (taller_id, cliente_id, de_taller, texto, created_at) values (:'tid', '00000000-0000-0000-0000-0000000000c1', false, 'viejo', now() - interval '29 days');
insert into public.servicios (taller_id, nombre, activo, created_at) values (:'tid', 'Viejo', false, now() - interval '40 days');
select (public.limpiar('auto') ->> 'notificaciones') is not null as limpia;
select count(*) = 2 as dos_avisos from public.notificaciones where titulo = '🧹 Limpieza automática';
select public.recordar_catalogo() = 1 as recuerda;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
set role authenticated;
select (select string_agg(k || '=' || jsonb_array_length(v), ' ') from jsonb_each(public.mi_respaldo()) as t(k, v)) as respaldo;
reset role;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set role authenticated;
select jsonb_array_length(public.cfx_respaldo() -> 'Talleres') = 1 as cfx_resp, jsonb_array_length(public.cfx_limpieza()) = 5 as cfx_limp;
select public.cfx_limpiar('reservas') >= 0 as limpiar;
select public.cfx_inventario() = '[]'::jsonb as inventario;
