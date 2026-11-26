-- ---------- G164 📱 Equipos por cuenta (máx. 3 por defecto) ----------
-- Cada inicio de sesión de Supabase (auth.sessions, el session_id del token) es un "equipo". Al abrir la app, el núcleo (equipos.js)
-- llama a cfx_equipo_registrar con un id al azar guardado en ese equipo y su nombre ("Chrome · Android").
-- · Si ya hay tantos equipos abiertos como el tope → este queda PENDIENTE y la app muestra "elige cuál cerrar": nunca entra uno más sin cerrar otro.
--   Un pendiente que no elige se cierra solo a los 10 minutos (cron 'cfx-equipos' y en cada registro): el servidor manda, no la pantalla.
-- · Cerrar = se borra su sesión en auth.sessions (se acaba su token de refresco) + marca 'cerrado': ese equipo, al abrir, vuelve al ingreso.
-- · Tope: CM → Control → 📱 Equipos (por app, por defecto 3) + equipos extra comprados o regalados (cfx_modulos_negocio, módulo 'equipos').
-- · Administrador: sin tope. Re-entrar en el mismo equipo no suma: cierra su sesión vieja.
create table if not exists public.cfx_equipos (
  sesion      uuid primary key,
  usuario     uuid not null,
  dispositivo text not null check (dispositivo ~ '^[A-Za-z0-9-]{8,64}$'),
  nombre      text not null default 'Equipo' check (char_length(nombre) <= 80),
  creado      timestamptz not null default now(),
  visto       timestamptz not null default now(),
  pendiente   timestamptz,
  cerrado     timestamptz
);
create index if not exists cfx_equipos_usuario_idx on public.cfx_equipos (usuario) where cerrado is null;
alter table public.cfx_equipos enable row level security;
revoke all on public.cfx_equipos from anon, authenticated;
insert into public.cfx_config (clave, valor) values ('equipos', jsonb_build_object('tope', 3, 'extra', 2)) on conflict (clave) do nothing;

create or replace function public.cfx_equipos_conf() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('tope', greatest(1, least(20, coalesce((c ->> 'tope')::int, 3))), 'extra', greatest(0, least(20, coalesce((c ->> 'extra')::int, 2))))
  from (select coalesce((select valor from public.cfx_config where clave = 'equipos'), '{}'::jsonb) c) x
$$;
-- ¿Es administrador? (sin tope). <CHK> lanza error si no lo es.
create or replace function public.cfx_equipos_admin() returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return true;
exception when others then return false;
end $$;
-- Tope de una cuenta = tope de la app + extras si su negocio tiene 'equipos' activo. null = sin tope (admin).
create or replace function public.cfx_sesion_tope(p_usuario uuid) returns int
language plpgsql stable security definer set search_path = '' as $$
declare c jsonb := public.cfx_equipos_conf(); n uuid;
begin
  if p_usuario = auth.uid() and public.cfx_equipos_admin() then return null; end if;
  begin n := public.cfx_negocio_cuenta(p_usuario); exception when others then n := null; end;
  return (c ->> 'tope')::int + case when exists (select 1 from public.cfx_modulos_negocio m where m.negocio = coalesce(n, p_usuario) and m.modulo = 'equipos' and m.hasta > now())
    then (c ->> 'extra')::int else 0 end;
end $$;
-- Cierra un equipo: marca y borra su sesión (su token de refresco deja de servir).
create or replace function public.cfx_equipo_cortar(p_sesion uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.cfx_equipos set cerrado = coalesce(cerrado, now()), pendiente = null where sesion = p_sesion;
  begin delete from auth.sessions where id = p_sesion; exception when others then null; end;
end $$;
-- Limpia lo de una cuenta: sesiones que ya no existen (cerró sesión o venció) y pendientes de más de 10 minutos.
create or replace function public.cfx_equipos_limpiar(p_usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare s uuid;
begin
  update public.cfx_equipos e set cerrado = now(), pendiente = null
   where (p_usuario is null or e.usuario = p_usuario) and e.cerrado is null and not exists (select 1 from auth.sessions a where a.id = e.sesion);
  for s in select sesion from public.cfx_equipos where (p_usuario is null or usuario = p_usuario) and cerrado is null and pendiente < now() - interval '10 minutes' loop
    perform public.cfx_equipo_cortar(s);
  end loop;
  delete from public.cfx_equipos where cerrado < now() - interval '30 days';
end $$;
-- Mis equipos abiertos (el actual primero), sin datos de otros.
create or replace function public.cfx_equipos_lista(p_usuario uuid, p_sid uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('sesion', sesion, 'nombre', nombre, 'creado', creado, 'visto', visto, 'este', sesion = p_sid, 'pendiente', pendiente is not null)
    order by (sesion = p_sid) desc, visto desc), '[]'::jsonb)
  from public.cfx_equipos where usuario = p_usuario and cerrado is null
$$;
create or replace function public.cfx_equipo_sid() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  return nullif(auth.jwt() ->> 'session_id', '')::uuid;
exception when others then return null;
end $$;

-- Al abrir la app: { ok } · { cerrada } (este equipo se cerró: volver al ingreso) · { exceso, tope, equipos } (elegir cuál cerrar).
create or replace function public.cfx_equipo_registrar(p_dispositivo text, p_nombre text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); sid uuid := public.cfx_equipo_sid(); t int; abiertos int; e public.cfx_equipos; s uuid;
  disp text := left(regexp_replace(coalesce(p_dispositivo, ''), '[^A-Za-z0-9-]', '', 'g'), 64);
  nom text := left(nullif(trim(regexp_replace(coalesce(p_nombre, ''), '[<>\r\n\t]', '', 'g')), ''), 80);
begin
  if u is null or sid is null then return jsonb_build_object('ok', true); end if;
  if char_length(disp) < 8 then return jsonb_build_object('error', 'Equipo sin identificar'); end if;
  perform public.cfx_equipos_limpiar(u);
  select * into e from public.cfx_equipos where sesion = sid;
  if found and (e.cerrado is not null or e.usuario <> u) then return jsonb_build_object('cerrada', true); end if;
  if not found and not exists (select 1 from auth.sessions where id = sid) then return jsonb_build_object('cerrada', true); end if;
  -- Mismo equipo con otra sesión abierta (volvió a entrar): la vieja se cierra, no suma.
  for s in select sesion from public.cfx_equipos where usuario = u and dispositivo = disp and sesion <> sid and cerrado is null loop
    perform public.cfx_equipo_cortar(s);
  end loop;
  insert into public.cfx_equipos as q (sesion, usuario, dispositivo, nombre) values (sid, u, disp, coalesce(nom, 'Equipo'))
  on conflict (sesion) do update set visto = now(), dispositivo = excluded.dispositivo, nombre = coalesce(nom, q.nombre);
  t := public.cfx_sesion_tope(u);
  select count(*) into abiertos from public.cfx_equipos where usuario = u and cerrado is null and pendiente is null and sesion <> sid;
  if t is not null and abiertos >= t then
    update public.cfx_equipos set pendiente = coalesce(pendiente, now()) where sesion = sid;
    return jsonb_build_object('exceso', true, 'tope', t, 'equipos', public.cfx_equipos_lista(u, sid));
  end if;
  update public.cfx_equipos set pendiente = null where sesion = sid;
  return jsonb_build_object('ok', true, 'tope', t);
end $$;

-- ⚙️ Mi cuenta → 📱 Mis equipos.
create or replace function public.cfx_equipos_mios() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null then return jsonb_build_object('error', 'Inicia sesión'); end if;
  perform public.cfx_equipos_limpiar(u);
  return jsonb_build_object('tope', public.cfx_sesion_tope(u), 'equipos', public.cfx_equipos_lista(u, public.cfx_equipo_sid()));
end $$;
-- Cerrar uno de MIS equipos (también este). Si este estaba pendiente y ya cabe, entra.
create or replace function public.cfx_equipo_cerrar(p_sesion uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); sid uuid := public.cfx_equipo_sid();
begin
  if u is null then return jsonb_build_object('error', 'Inicia sesión'); end if;
  if not exists (select 1 from public.cfx_equipos where sesion = p_sesion and usuario = u and cerrado is null) then return jsonb_build_object('error', 'Ese equipo ya no está abierto'); end if;
  perform public.cfx_equipo_cortar(p_sesion);
  return jsonb_build_object('ok', true, 'este', p_sesion = sid);
end $$;

-- CM → Control → 📱 Equipos: tope de la app y cuántos suma el extra.
create or replace function public.cfx_equipos_conf_admin() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  return public.cfx_equipos_conf() || jsonb_build_object('cuentas', (select count(distinct usuario) from public.cfx_equipos where cerrado is null),
    'abiertos', (select count(*) from public.cfx_equipos where cerrado is null),
    'extras', (select count(*) from public.cfx_modulos_negocio where modulo = 'equipos' and hasta > now()));
end $$;
create or replace function public.cfx_equipos_guardar(p_tope int, p_extra int) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  if coalesce(p_tope, 0) not between 1 and 20 or coalesce(p_extra, -1) not between 0 and 20 then return jsonb_build_object('error', 'Tope de 1 a 20 y extra de 0 a 20'); end if;
  insert into public.cfx_config (clave, valor) values ('equipos', jsonb_build_object('tope', p_tope, 'extra', p_extra))
  on conflict (clave) do update set valor = excluded.valor;
  begin perform public.cfx_anotar('equipos', 'tope ' || p_tope || ' + extra ' || p_extra); exception when others then null; end;
  return public.cfx_equipos_conf_admin();
end $$;
-- ➕ Equipos extra a una cuenta por su correo (p_dias = 0 los quita). Queda como el módulo 'equipos' de su negocio.
create or replace function public.cfx_equipos_dar(p_email text, p_dias int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid; n uuid;
begin
  perform <CHK>;
  select id into u from auth.users where lower(email) = lower(trim(coalesce(p_email, '')));
  if u is null then return jsonb_build_object('error', 'No hay una cuenta con ese correo en esta app'); end if;
  if coalesce(p_dias, -1) not between 0 and 3660 then return jsonb_build_object('error', 'De 0 a 3660 días'); end if;
  begin n := public.cfx_negocio_cuenta(u); exception when others then n := null; end;
  n := coalesce(n, u);
  if p_dias = 0 then delete from public.cfx_modulos_negocio where negocio = n and modulo = 'equipos';
  else insert into public.cfx_modulos_negocio as m (negocio, modulo, hasta, origen) values (n, 'equipos', now() + make_interval(days => p_dias), 'regalo')
       on conflict (negocio, modulo) do update set hasta = greatest(m.hasta, now()) + make_interval(days => p_dias), avisado = null; end if;
  begin perform public.cfx_anotar('equipos', case when p_dias = 0 then 'quitó extra a ' else 'dio ' || p_dias || ' días de extra a ' end || lower(trim(p_email))); exception when others then null; end;
  return public.cfx_equipos_conf_admin() || jsonb_build_object('ok', true);
end $$;

revoke all on function public.cfx_equipos_conf(), public.cfx_equipos_admin(), public.cfx_sesion_tope(uuid), public.cfx_equipo_cortar(uuid), public.cfx_equipos_limpiar(uuid),
  public.cfx_equipos_lista(uuid, uuid), public.cfx_equipo_sid() from public, anon, authenticated;
revoke all on function public.cfx_equipo_registrar(text, text), public.cfx_equipos_mios(), public.cfx_equipo_cerrar(uuid), public.cfx_equipos_conf_admin(),
  public.cfx_equipos_guardar(int, int), public.cfx_equipos_dar(text, int) from public, anon;
grant execute on function public.cfx_equipo_registrar(text, text), public.cfx_equipos_mios(), public.cfx_equipo_cerrar(uuid), public.cfx_equipos_conf_admin(),
  public.cfx_equipos_guardar(int, int), public.cfx_equipos_dar(text, int) to authenticated;
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'cfx-equipos';
  perform cron.schedule('cfx-equipos', '*/10 * * * *', 'select public.cfx_equipos_limpiar(null)');
exception when others then
  raise notice 'Limpieza de equipos no programada (%).', sqlerrm;
end $$;
