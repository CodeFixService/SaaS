-- Prueba: socios comunes del núcleo (en Estaciona; igual en Billetera y Órbita).
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'juanjosuecastilloloyola@gmail.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'socio@x.cl'), ('00000000-0000-0000-0000-0000000000c1', 'normal@x.cl');
update public.perfiles set es_admin = true where email = 'juanjosuecastilloloyola@gmail.com';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select not public.cfx_es_socio() as aun_no_es_socio;
do $$ begin perform public.cfx_socio_guardar('otro@x.cl'); raise exception 'debía fallar'; exception when others then if sqlerrm = 'debía fallar' then raise; end if; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select public.cfx_socio_guardar('Socio@X.cl', 'Ana Socia');
select jsonb_array_length(public.cfx_socios_lista()) = 1 as lista_1;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select public.cfx_es_socio() as ya_es_socio;
select jsonb_array_length(public.cfx_socios_lista()) = 1 as socio_ve_el_panel;
do $$ begin perform public.cfx_socio_guardar('otro@x.cl'); raise exception 'debía fallar'; exception when others then if sqlerrm = 'debía fallar' then raise; end if; end $$;
do $$ begin perform public.cfx_socio_guardar('socio@x.cl', '', false); raise exception 'debía fallar'; exception when others then if sqlerrm = 'debía fallar' then raise; end if; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select not public.cfx_es_socio() as normal_no;
do $$ begin perform public.cfx_socios_lista(); raise exception 'debía fallar'; exception when others then if sqlerrm = 'debía fallar' then raise; end if; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select public.cfx_socio_guardar('socio@x.cl', '', false);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select not public.cfx_es_socio() as quitado;
reset role;
