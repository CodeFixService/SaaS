\set ON_ERROR_STOP 1
-- Ronda 2 (Centro de Mando): puente de avisos de las otras apps y chat propio.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'juanjosuecastilloloyola@gmail.com');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b1', 'ana@x.cl');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set role authenticated;
select length(public.cm_puente_secreto('barberia')) = 64 as secreto;
select public.cm_puente_secreto('barberia') = public.cm_puente_secreto('barberia') as mismo_secreto;
reset role;
set role anon;
select public.cfx_aviso_externo('barberia', 'malo', 'x', 'y', 'pago') = false as rechaza_secreto_malo;
reset role;
select public.cfx_aviso_externo('barberia', (select secreto from public.cm_puentes where app = 'barberia'), '💳 Pago por revisar', 'Ana · $4900', 'pago') as acepta;
select count(*) = 1 as llega_notificacion from public.notificaciones where titulo = 'Barbería · 💳 Pago por revisar' and url = '/admin/#pagos';
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
set role authenticated;
select public.cfx_chat_enviar('Hola') > 0 as chat_cm;
select public.cfx_guia() -> 'items' = '[]'::jsonb as sin_guia;
do $$ begin perform public.cm_puente_secreto('x'); raise exception 'debía fallar'; exception when others then if sqlerrm = 'debía fallar' then raise; end if; end $$;
reset role;
select count(*) >= 1 as aviso_chat_local from public.notificaciones where titulo like '💬%';
