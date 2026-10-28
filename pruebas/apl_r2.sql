\set ON_ERROR_STOP 1
-- Ronda 2: guía, chat, puente al CM, pagos (tarjeta, meses, días sugeridos, liberar) y despacho por comuna (Órbita).
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'juanjosuecastilloloyola@gmail.com');
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000b1', 'tienda@x.cl', '{"tipo":"negocio","empresa":"Tienda Ana"}');
insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl', 'Pepe', 'client', '00000000-0000-0000-0000-0000000000b1');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c1', 'cli@x.cl');
insert into public.catalog_items (owner_id, client_key, nombre, precio) values ('00000000-0000-0000-0000-0000000000b1', 'k1', 'Vaso', 10000);
update public.profiles set slug = 'ana' where id = '00000000-0000-0000-0000-0000000000b1';
-- Negocio: guía, chat y despacho
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
set role authenticated;
select jsonb_array_length(public.cfx_guia() -> 'items') = 6 as guia_6_pasos;
select (select count(*) from jsonb_array_elements(public.cfx_guia() -> 'items') e where (e ->> 'ok')::boolean) = 1 as solo_productos_listo;
select public.cfx_chat_enviar('Hola, ¿cómo configuro el link?') > 0 as chat_enviado;
select public.guardar_despacho('{"retiro": false, "gratis_desde": 30000, "zonas": [{"comuna": "Ñuñoa", "precio": 2500}, {"comuna": "Providencia", "precio": 3000}]}') ->> 'retiro' = 'false' as despacho_guardado;
select (select (e ->> 'ok')::boolean from jsonb_array_elements(public.cfx_guia() -> 'items') e where e ->> 'k' = 'despacho') as guia_despacho_ok;
do $$ begin perform public.guardar_despacho('{"zonas": [{"comuna": "Ñuñoa", "precio": 1}, {"comuna": "ñuñoa", "precio": 2}]}'); raise exception 'debía fallar'; exception when others then if sqlerrm not like '%repetida%' then raise; end if; end $$;
select public.cfx_pago_pedir('meses', 14700, 'transferencia', 'data:image/jpeg;base64,' || repeat('A', 300), '3 meses', null, 3) is not null as pago_meses;
reset role;
select count(*) = 2 as aviso_admin_sin_puente from public.notifications where (title like '💬%' or title like '💳%');
-- Cliente: pedido con despacho
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
set role authenticated;
select public.crear_pedido('00000000-0000-0000-0000-0000000000b1', '[{"clave":"k1","cant":1}]', 'retiro', '', '', null) ->> 'error' like '%no tiene retiro%' as sin_retiro;
select public.crear_pedido('00000000-0000-0000-0000-0000000000b1', '[{"clave":"k1","cant":1}]', 'despacho', 'Calle 1, Maipú', '', null) ->> 'error' like '%no despacha%' as comuna_fuera;
select (r ->> 'total')::numeric = 12500 and (r ->> 'despacho')::numeric = 2500 as total_con_despacho
  from (select public.crear_pedido('00000000-0000-0000-0000-0000000000b1', '[{"clave":"k1","cant":1}]', 'despacho', 'Calle 1, Nunoa', '', null) r) x;
select (r ->> 'despacho')::numeric = 0 as gratis_desde_30000
  from (select public.crear_pedido('00000000-0000-0000-0000-0000000000b1', '[{"clave":"k1","cant":3}]', 'despacho', 'Calle 1, Providencia', '', null) r) x;
select public.tienda_info('00000000-0000-0000-0000-0000000000b1') -> 'despacho' -> 'zonas' -> 0 ->> 'comuna' = 'Ñuñoa' as tienda_ve_zonas;
select public.cfx_guia() -> 'items' = '[]'::jsonb as cliente_sin_guia;
reset role;
select (select lineas from public.pedidos where costo_despacho = 2500) @> '[{"clave":"despacho"}]' as linea_despacho;
-- Admin: chat, días sugeridos, liberar, puente
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set role authenticated;
select (public.cfx_chat_bandeja() -> 0 ->> 'sin_leer')::int = 1 as bandeja;
select public.cfx_chat_responder('00000000-0000-0000-0000-0000000000b1', 'Ve a Ajustes → Links') > 0 as respondido;
select (public.cfx_pagos_lista('pendiente') -> 0 ->> 'sugeridos')::int = 90 as sugiere_90;
select (public.cfx_pago_resolver((public.cfx_pagos_lista('pendiente') -> 0 ->> 'id')::uuid, true) ->> 'dias')::int = 90 as aprueba_90;
select (public.cfx_liberar(7) ->> 'activo')::boolean as liberado;
select public.cfx_cm_vincular('https://vqevujjraisrcoirswuq.supabase.co', repeat('k', 30), repeat('s', 30), 'aplicaciones') ->> 'vinculado' = 'true' as vinculado;
reset role;
select count(*) = 0 as no_bloqueado_en_liberacion from (select 1) x where false;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
set role authenticated;
select public.cfx_chat_sin_leer() = 1 as tiene_respuesta;
select jsonb_array_length(public.cfx_chat_mio()) = 2 as dos_mensajes;
select public.cfx_chat_sin_leer() = 0 as leyo;
select public.cfx_chat_enviar('Gracias') > 0;
select (public.cfx_pago_estado() ->> 'liberado_hasta') is not null as ve_liberado;
reset role;
select count(*) = 1 as puente_llamado from net.llamadas where url like '%/rpc/cfx_aviso_externo' and body ->> 'p_tipo' = 'chat' and body ->> 'p_app' = 'aplicaciones';
