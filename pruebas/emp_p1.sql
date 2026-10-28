\set ON_ERROR_STOP 1
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'juanjosuecastilloloyola@gmail.com'), ('00000000-0000-0000-0000-0000000000b1', 'dueno@x.cl');
select privado.fijar_admin();
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
set role authenticated;
select public.aceptar_terminos();
select public.crear_negocio('Almacén Ana', 'almacen', true) ->> 'id' is not null as negocio;
select public.soporte_enviar('hola soporte');
reset role;
insert into public.notificaciones (negocio, titulo, creado) select id, 'viejo', now() - interval '29 days' from public.negocios;
insert into public.notificaciones (usuario, titulo) values ('00000000-0000-0000-0000-0000000000b1', 'mio');
update public.soporte set creado = now() - interval '29 days';
delete from privado.tareas_hechas;
select privado.tarea_horaria();
select titulo, cuerpo from public.notificaciones where titulo = 'Limpieza automática';
delete from privado.tareas_hechas;
select privado.tarea_horaria();
select count(*) = 1 as un_aviso from public.notificaciones where titulo = 'Limpieza automática';
set role authenticated;
select public.borrar_avisos((select id from public.notificaciones where titulo = 'mio')) = 1 as borra_uno;
select public.soporte_borrar() = 1 as borra_chat;
select public.borrar_avisos(null) >= 1 as borra_todos;
reset role;
create table public.vieja_tabla (a int); insert into public.vieja_tabla values (1);
create table public.vacia_vieja (a int);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set role authenticated;
select public.cfx_inventario();
select jsonb_array_length(public.cfx_respaldo() -> 'Billeteras') = 1 as respaldo;
select jsonb_array_length(public.cfx_limpieza()) = 6 as limpieza;
select public.cfx_limpiar('soporte') >= 0 as limpia;
select public.cfx_inventario_borrar('public.vacia_vieja');
select public.cfx_inventario_datos('public.vieja_tabla');
\set ON_ERROR_STOP 0
select public.cfx_inventario_borrar('public.vieja_tabla', '');
select public.cfx_inventario_borrar('public.negocios', 'sí');
\set ON_ERROR_STOP 1
select public.cfx_inventario_borrar('public.vieja_tabla', 'sí');
select public.cfx_inventario() = '[]'::jsonb as inventario_limpio;
reset role;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
set role authenticated;
\set ON_ERROR_STOP 0
select public.cfx_inventario();
