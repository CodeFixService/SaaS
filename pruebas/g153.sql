-- G153: 🤝 admin_cambiar_rol (usuario ⇄ socio). Correr: ./base.sh /home/user/SaaS p_g153 && psql ... -d p_g153 -f g153.sql
\set ON_ERROR_STOP 1
insert into auth.users (id, email) select '00000000-0000-0000-0000-0000000000a1', public.admin_email();
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b1', 'u1@x.cl'), ('00000000-0000-0000-0000-0000000000b2', 'u2@x.cl');
update public.perfiles set rol = 'socio', premium_hasta = null where id = '00000000-0000-0000-0000-0000000000b2';
delete from public.espacios where owner = '00000000-0000-0000-0000-0000000000b2';
do $$
declare a uuid := '00000000-0000-0000-0000-0000000000a1'; u uuid := '00000000-0000-0000-0000-0000000000b1'; s uuid := '00000000-0000-0000-0000-0000000000b2';
  r jsonb; ok boolean; n0 int; s0 int;
begin
  assert (select rol from public.perfiles where id = a) = 'admin', 'admin';
  assert (select premium_hasta from public.perfiles where id = u) is not null, 'prueba inicial';
  -- Socio no puede.
  perform set_config('request.jwt.claim.sub', s::text, true);
  begin perform public.admin_cambiar_rol(u, 'socio', 'x'); ok := false; exception when others then ok := sqlerrm like '%súper%'; end;
  assert ok, 'socio bloqueado';
  -- Usuario no puede.
  perform set_config('request.jwt.claim.sub', u::text, true);
  begin perform public.admin_cambiar_rol(s, 'usuario', 'x'); ok := false; exception when others then ok := true; end;
  assert ok, 'usuario bloqueado';
  -- Admin.
  perform set_config('request.jwt.claim.sub', a::text, true);
  r := public.admin_resumen(); n0 := (r ->> 'usuarios')::int; s0 := (r ->> 'socios')::int;
  begin perform public.admin_cambiar_rol(a, 'usuario', 'x'); ok := false; exception when others then ok := true; end; assert ok, 'a sí mismo';
  begin perform public.admin_cambiar_rol(u, 'admin', 'x'); ok := false; exception when others then ok := sqlerrm like '%no válido%'; end; assert ok, 'rol admin';
  begin perform public.admin_cambiar_rol(gen_random_uuid(), 'socio', 'x'); ok := false; exception when others then ok := sqlerrm like '%no encontrado%'; end; assert ok, 'no existe';
  r := public.admin_cambiar_rol(u, 'socio', 'vende demos');
  assert r ->> 'ok' = 'true', 'ok';
  assert (select rol from public.perfiles where id = u) = 'socio', 'pasó a socio';
  assert (select premium_hasta from public.perfiles where id = u) is null, 'prueba quitada';
  assert public.es_pro(u), 'socio cuenta como pro';
  assert exists (select 1 from public.auditoria where accion = 'cambiar_rol' and detalle = 'usuario→socio u1@x.cl' and motivo = 'vende demos'), 'auditoría';
  assert exists (select 1 from public.notificaciones where para = u and url = '/admin/'), 'aviso socio';
  r := public.admin_resumen();
  assert (r ->> 'usuarios')::int = n0 - 1 and (r ->> 'socios')::int = s0 + 1, 'contadores';
  assert (select count(*) from public.perfiles where rol = 'usuario' and id = u) = 0, 'fuera de listados usuario';
  -- Ya es socio: sin cambio.
  assert public.admin_cambiar_rol(u, 'socio', '') ->> 'sin_cambio' = 'true', 'idempotente';
  -- Socio vuelve a usuario.
  assert not exists (select 1 from public.espacios where owner = s), 'socio sin espacios';
  perform public.admin_cambiar_rol(s, 'usuario', '');
  assert (select rol from public.perfiles where id = s) = 'usuario', 'volvió';
  assert not exists (select 1 from public.espacios where owner = a), 'no crea nada al admin';
  assert exists (select 1 from public.notificaciones where para = s and url = '/app/'), 'aviso usuario';
  assert exists (select 1 from public.auditoria where detalle = 'socio→usuario u2@x.cl'), 'auditoría 2';
  perform set_config('request.jwt.claim.sub', u::text, true);
  assert (public.mi_cuenta() ->> 'rol') = 'socio' and public.is_socio(), 'mi_cuenta refleja rol';
  raise notice 'G153 OK';
end $$;
-- Permisos: anon no ejecuta; authenticated sí.
select has_function_privilege('anon', 'public.admin_cambiar_rol(uuid,text,text)', 'execute') as anon,
       has_function_privilege('authenticated', 'public.admin_cambiar_rol(uuid,text,text)', 'execute') as auth;
