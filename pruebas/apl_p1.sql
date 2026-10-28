\set ON_ERROR_STOP 1
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'juanjosuecastilloloyola@gmail.com');
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000b1', 'tienda@x.cl', '{"tipo":"negocio","empresa":"Tienda Ana"}');
insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl', 'Pepe', 'client', '00000000-0000-0000-0000-0000000000b1');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c1', 'cli@x.cl');
select role, negocio_id is not null from public.profiles order by email;
insert into public.messages (sender, recipient, body, created_at) values
 ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'viejo', now() - interval '29 days'),
 ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'nuevo', now());
insert into public.catalog_items (owner_id, client_key, nombre, precio, stock, updated_at) values ('00000000-0000-0000-0000-0000000000b1', 'k1', 'Vaso', 1000, 0, now() - interval '40 days');
select public.limpiar_registros();
select count(*) = 2 as dos_avisos_limpieza from public.notifications where title = '🧹 Limpieza automática';
select public.recordar_productos() = 1 as recuerda_agotados;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
set role authenticated;
select count(*) >= 1 as ve_aviso from public.my_inbox();
select public.ocultar_aviso((select id from public.my_inbox() limit 1));
select count(*) = 0 as oculto from public.my_inbox() where title = '🧹 Limpieza automática';
select public.chat_borrar('00000000-0000-0000-0000-0000000000b1') = 2 as chat_borrado;
reset role;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
set role authenticated;
select jsonb_array_length(public.mi_respaldo() -> 'Productos') = 1 and jsonb_array_length(public.mi_respaldo() -> 'Clientes') = 1 as respaldo_tienda;
reset role;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set role authenticated;
select jsonb_array_length(public.cfx_respaldo() -> 'Cuentas') = 3 as respaldo_admin;
select jsonb_array_length(public.cfx_limpieza()) = 4 as limpieza;
select public.cfx_limpiar('pedidos') >= 0, public.cfx_limpiar('auditoria') >= 0, public.cfx_limpiar('mensajes') >= 0, public.cfx_limpiar('comprobantes') >= 0;
select public.cfx_inventario() = '[]'::jsonb as inventario_vacio;
