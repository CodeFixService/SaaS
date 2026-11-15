-- G61 a · prueba del push insistente (núcleo). Uso: psql -v ON_ERROR_STOP=1 -f nucleo/sql/push.sql -f pruebas/g61_push.sql
do $$ declare g uuid := gen_random_uuid(); g2 uuid := gen_random_uuid(); n int; begin
  delete from public.cfx_push_entrega;
  perform public.cfx_push_anotar(jsonb_build_array(
    jsonb_build_object('grupo', g, 'endpoint', 'https://fcm/a', 'p256dh', 'k', 'auth', 'a', 'payload', '{}'),
    jsonb_build_object('grupo', g, 'endpoint', 'https://fcm/b', 'p256dh', 'k', 'auth', 'a', 'payload', '{}'),
    jsonb_build_object('grupo', g2, 'endpoint', 'https://fcm/b', 'p256dh', 'k', 'auth', 'a', 'payload', '{}'),
    jsonb_build_object('grupo', g, 'endpoint', 'http://malo', 'p256dh', 'k', 'auth', 'a', 'payload', '{}')));
  assert (select count(*) from public.cfx_push_entrega) = 3, 'anota 3 (descarta url mala)';
  assert (select count(*) from public.cfx_push_tomar()) = 0, 'nada antes de 1 min';
  update public.cfx_push_entrega set proximo = now() - interval '1 second';
  select count(*) into n from public.cfx_push_tomar(); assert n = 3, 'reenvía los 3 sin confirmar';
  assert (select bool_and(intentos = 1 and proximo > now() + interval '50 seconds') from public.cfx_push_entrega), 'siguiente en 1 min';
  assert public.cfx_push_recibido(g), 'ack del grupo';
  assert (select count(*) from public.cfx_push_entrega where grupo = g and recibido_at is null) = 0, 'ack corta TODOS los dispositivos';
  update public.cfx_push_entrega set proximo = now() - interval '1 second';
  assert (select count(*) from public.cfx_push_tomar()) = 1, 'solo queda el no confirmado';
  assert public.cfx_push_abri('https://fcm/b') = 1, 'abrir la app corta lo pendiente';
  update public.cfx_push_entrega set recibido_at = null, proximo = now() - interval '1 s', created_at = now() - interval '49 hours' where grupo = g2;
  assert (select count(*) from public.cfx_push_tomar()) = 0, 'tope 48 h';
  perform public.cfx_push_muerto('https://fcm/b');
  assert (select count(*) from public.cfx_push_entrega where endpoint = 'https://fcm/b') = 0, 'suscripción muerta se borra';
  raise notice 'G61 push SQL OK';
end $$;
