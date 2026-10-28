\set ON_ERROR_STOP 1
select count(*) as barberias, (select count(*) from public.messages) as msgs from public.barberias;
update public.messages set created_at = now() - interval '29 days' where id = (select id from public.messages limit 1);
update public.servicios set visible = false, created_at = now() - interval '40 days' where id = (select id from public.servicios limit 1);
select public.recordar_catalogo() >= 1 as recuerda;
select (public.limpiar() ->> 'avisos') is not null as limpia;
select count(*) >= 1 as aviso_limpieza from public.avisos where titulo = '🧹 Limpieza automática';
select set_config('request.jwt.claim.sub', (select id::text from public.profiles where role = 'owner' and not suspended limit 1), false);
set role authenticated;
select jsonb_array_length(public.mi_respaldo() -> 'Servicios') >= 1 as respaldo;
select public.ocultar_aviso((select (x ->> 'id')::uuid from jsonb_array_elements(public.mis_avisos()) x limit 1));
reset role;
select set_config('request.jwt.claim.sub', (select id::text from public.profiles where role = 'admin' limit 1), false);
set role authenticated;
select jsonb_array_length(public.cfx_respaldo() -> 'Barberías') >= 1 as cfx_respaldo, jsonb_array_length(public.cfx_limpieza()) = 4 as cfx_limpieza;
select public.cfx_limpiar('avisos') >= 0 as cfx_limpiar;
select public.cfx_inventario() as inventario;
