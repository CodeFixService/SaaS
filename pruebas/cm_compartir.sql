-- Prueba: cuentas vinculadas y cosas compartidas (pedidos y tareas) en el Centro de Mando.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'juan@x.cl'), ('00000000-0000-0000-0000-0000000000b2', 'ana@x.cl'), ('00000000-0000-0000-0000-0000000000c3', 'otro@x.cl');
update public.perfiles set nombre = 'Juan' where email = 'juan@x.cl';
update public.perfiles set nombre = 'Ana' where email = 'ana@x.cl';
set role authenticated;
-- Juan crea un pedido y una tarea; Ana aún no ve nada
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
insert into public.items (id, owner, tipo, titulo, estado, datos) values ('00000000-0000-0000-0000-00000000f001', auth.uid(), 'pedido', 'María', 'abierto', '{"items":[{"que":"Pan","cant":"2"},{"que":"Leche","cant":"1"}]}'),
  ('00000000-0000-0000-0000-00000000f002', auth.uid(), 'tarea', 'Comprar telas', 'abierto', '{}');
select set_config('t.cod', public.vinculo_codigo(), false) ~ '^JUAN-[0-9]{4}$' as codigo_juan;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select count(*) = 0 as ana_no_ve_nada from public.items where owner = '00000000-0000-0000-0000-0000000000a1';
do $$ begin perform public.vincular('NOEXISTE-0000'); raise exception 'debía fallar'; exception when others then if sqlerrm = 'debía fallar' then raise; end if; end $$;
select (public.vincular(current_setting('t.cod')) ->> 'nombre') = 'Juan' as ana_se_vincula;
select jsonb_array_length(public.mis_vinculos()) = 1 as ana_ve_a_juan;
-- Juan comparte el pedido con Ana; con "otro" (no vinculado) no se puede
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select jsonb_array_length(public.mis_vinculos()) = 1 as vinculo_en_dos_sentidos;
select public.compartir('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000b2');
do $$ begin perform public.compartir('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-0000000000c3'); raise exception 'debía fallar'; exception when others then if sqlerrm = 'debía fallar' then raise; end if; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select count(*) = 1 as ana_ve_el_pedido from public.items where id = '00000000-0000-0000-0000-00000000f001';
select count(*) = 0 as ana_no_ve_la_tarea from public.items where id = '00000000-0000-0000-0000-00000000f002';
select (public.compartidos_info() -> 'conmigo' ->> '00000000-0000-0000-0000-00000000f001') = 'Juan' as compartido_por_juan;
-- Ana no puede cambiarlo directo ni borrarlo; sí por compartido_guardar
update public.items set estado = 'hecho' where id = '00000000-0000-0000-0000-00000000f001';
delete from public.items where id = '00000000-0000-0000-0000-00000000f001';
select count(*) = 1 as no_lo_borra from public.items where id = '00000000-0000-0000-0000-00000000f001';
-- "No hay" en Leche + reemplazo; cambiar la cantidad del pan debe fallar
select public.compartido_guardar('00000000-0000-0000-0000-00000000f001', '{"estado":"listo","datos":{"items":[{"que":"Pan","cant":"2","ok":true},{"que":"Leche","cant":"1","nohay":true},{"que":"Leche sin lactosa","cant":"1","reemplazo":1}]}}');
do $$ begin perform public.compartido_guardar('00000000-0000-0000-0000-00000000f001', '{"datos":{"items":[{"que":"Pan","cant":"5"},{"que":"Leche","cant":"1"}]}}'); raise exception 'debía fallar'; exception when others then if sqlerrm = 'debía fallar' then raise; end if; end $$;
do $$ begin perform public.compartido_guardar('00000000-0000-0000-0000-00000000f001', '{"datos":{"items":[{"que":"Pan","cant":"2"}]}}'); raise exception 'debía fallar'; exception when others then if sqlerrm = 'debía fallar' then raise; end if; end $$;
select (select estado = 'listo' and jsonb_array_length(datos -> 'items') = 3 and (datos -> 'items' -> 1 ->> 'nohay')::boolean from public.items where id = '00000000-0000-0000-0000-00000000f001') as ana_marca_y_reemplaza;
reset role;
select count(*) = 1 as juan_recibe_aviso from public.notificaciones where para = '00000000-0000-0000-0000-0000000000a1' and titulo like '🔄 Ana pasó "María" a Listo%';
select count(*) = 1 as ana_recibe_aviso_compartido from public.notificaciones where para = '00000000-0000-0000-0000-0000000000b2' and titulo like '📤 Juan te compartió%';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select jsonb_array_length(public.compartido_historial('00000000-0000-0000-0000-00000000f001')) = 2 as historial;
-- Desvincular: Ana deja de verlo
select public.desvincular('00000000-0000-0000-0000-0000000000b2');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select count(*) = 0 as desvinculada_no_ve from public.items where id = '00000000-0000-0000-0000-00000000f001';
reset role;
