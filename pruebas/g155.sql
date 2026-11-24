-- G155 🔧 túnel de fallas. Corre en las 6 bases: for b in ...; do psql ... -d $b -f g155.sql; done  (la parte de admin solo en el CM: -v cm=1)
\set ON_ERROR_STOP 1
\if :{?cm} \else \set cm 0 \endif
delete from public.cfx_fallas; delete from public.cfx_tunel;
insert into public.cfx_fallas (id, cuenta, email, nombre, rol, texto, datos) values
  (9001, gen_random_uuid(), 'secreto@x.cl', 'Persona', 'negocio', 'No carga el carrito', '{"version":"6.99"}'),
  (9002, gen_random_uuid(), 'otro@x.cl', 'Otra', 'cliente', 'Botón tapado', '{}');
insert into public.cfx_fallas (id, cuenta, rol, texto, estado, resuelto) values (9003, gen_random_uuid(), 'cliente', 'Vieja cerrada', 'real', now());
do $$
declare k text := 'cfx_' || repeat('ab', 32); r jsonb; ok boolean;
begin
  -- Sin túnel / sin llave / llave mala → Sin permiso.
  perform set_config('request.headers', '{}', true);
  begin perform public.cfx_tunel_fallas(); ok := false; exception when others then ok := sqlerrm = 'Sin permiso'; end; assert ok, 'sin llave';
  insert into public.cfx_tunel (hash) values (encode(sha256(convert_to(k, 'UTF8')), 'hex'));
  perform set_config('request.headers', jsonb_build_object('x-tunel-key', 'cfx_' || repeat('cd', 32))::text, true);
  begin perform public.cfx_tunel_fallas(); ok := false; exception when others then ok := sqlerrm = 'Sin permiso'; end; assert ok, 'llave mala';
  begin perform public.cfx_tunel_listo(9001, 'x arreglado'); ok := false; exception when others then ok := sqlerrm = 'Sin permiso'; end; assert ok, 'listo con llave mala';
  -- Llave buena: ve las abiertas, sin correo ni nombre ni cuenta.
  perform set_config('request.headers', jsonb_build_object('x-tunel-key', k)::text, true);
  r := public.cfx_tunel_fallas();
  assert jsonb_array_length(r) = 2, 'dos abiertas: ' || r;
  assert r::text not like '%secreto@x.cl%' and r::text not like '%Persona%' and not (r -> 0 ? 'cuenta'), 'sin datos personales';
  assert jsonb_array_length(public.cfx_tunel_fallas(true)) = 3, 'todas';
  assert (select usado from public.cfx_tunel) is not null, 'marca uso';
  -- Marcar lista: solo abiertas; no la cierra.
  begin perform public.cfx_tunel_listo(9001, ''); ok := false; exception when others then ok := sqlerrm like '%qué se arregló%'; end; assert ok, 'nota obligatoria';
  r := public.cfx_tunel_listo(9001, 'carrito arreglado (7.00)');
  assert r ->> 'estado' = 'listo', 'quedó lista';
  assert (select estado || '|' || (resuelto is null) from public.cfx_fallas where id = 9001) = 'listo|true', 'no se cierra sola';
  assert (select arreglo from public.cfx_fallas where id = 9001) like '%carrito arreglado (7.00)%', 'nota guardada';
  begin perform public.cfx_tunel_listo(9001, 'otra vez'); ok := false; exception when others then ok := sqlerrm like '%abierta%'; end; assert ok, 'lista dos veces';
  begin perform public.cfx_tunel_listo(9003, 'cerrada'); ok := false; exception when others then ok := sqlerrm like '%abierta%'; end; assert ok, 'no reabre cerradas';
  assert jsonb_array_length(public.cfx_tunel_fallas()) = 2, 'lista sigue abierta';
  -- Sin admin no puede reabrir ni fijar.
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  begin perform public.cfx_falla_reabrir(9001, 'x'); ok := false; exception when others then ok := true; end; assert ok, 'reabrir solo admin';
  begin perform public.cfx_tunel_fijar(repeat('0', 64)); ok := false; exception when others then ok := true; end; assert ok, 'fijar solo admin';
  assert (select estado from public.cfx_fallas where id = 9001) = 'listo', 'sigue lista';
end $$;
-- Permisos: anon solo las 3 del túnel.
select has_function_privilege('anon', 'public.cfx_tunel_fallas(boolean)', 'execute') as anon_fallas,
       has_function_privilege('anon', 'public.cfx_tunel_listo(bigint, text)', 'execute') as anon_listo,
       not has_function_privilege('anon', 'public.cfx_tunel_fijar(text)', 'execute') as anon_sin_fijar,
       not has_function_privilege('anon', 'public.cfx_falla_reabrir(bigint, text)', 'execute') as anon_sin_reabrir,
       not has_function_privilege('anon', 'public.cfx_tunel_ok()', 'execute') as anon_sin_ok,
       not has_table_privilege('anon', 'public.cfx_tunel', 'select') as anon_sin_tabla \gset
\if :anon_fallas \else \echo 'FALLA permiso anon fallas' \quit \endif
\if :anon_listo \else \echo 'FALLA permiso anon listo' \quit \endif
\if :anon_sin_fijar \else \echo 'FALLA anon fija' \quit \endif
\if :anon_sin_reabrir \else \echo 'FALLA anon reabre' \quit \endif
\if :anon_sin_ok \else \echo 'FALLA anon ok' \quit \endif
\if :anon_sin_tabla \else \echo 'FALLA anon tabla' \quit \endif
\if :cm
insert into auth.users (id, email) select '00000000-0000-0000-0000-0000000000a1', public.admin_email() on conflict do nothing;
do $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  assert (select count(*) from jsonb_array_elements(public.cfx_fallas_lista()) e where e ->> 'estado' = 'listo') = 1, 'el CM ve la lista';
  r := public.cfx_falla_reabrir(9001, 'en 320 px sigue');
  assert r ->> 'estado' = 'revisando', 'reabierta';
  assert (select arreglo from public.cfx_fallas where id = 9001) like '%Sigue fallando: en 320 px sigue%', 'nota de Josué';
  perform set_config('request.headers', jsonb_build_object('x-tunel-key', 'cfx_' || repeat('ab', 32))::text, true);
  perform public.cfx_tunel_listo(9001, 'ahora sí');
  insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c1', 'c1@x.cl') on conflict do nothing;
  update public.cfx_fallas set rol = 'cliente', cuenta = '00000000-0000-0000-0000-0000000000c1' where id = 9001; -- cuenta real: le llega el aviso
  r := public.cfx_falla_resolver(9001, true, 'gracias', 15);
  assert (select estado from public.cfx_fallas where id = 9001) = 'real', 'Josué la cierra';
  assert (public.cfx_tunel_estado() ->> 'activo')::boolean, 'estado activo';
  perform public.cfx_tunel_fijar(null);
  assert not (public.cfx_tunel_estado() ->> 'activo')::boolean, 'túnel cerrado';
end $$;
\endif
\echo 'g155 OK'
