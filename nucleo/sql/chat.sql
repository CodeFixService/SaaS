-- ---------- Chat entre personas (C14): las mismas reglas en todas las apps (módulo 'chat') ----------
-- Reglas: hasta N mensajes seguidos sin respuesta (el gancho decide N; null = sin límite, p. ej. el admin), 100 al día,
-- bloquear (ninguno de los dos escribe), reportar (le llega al admin) y borrar la conversación (para los dos).
-- Ganchos que pone cada app que usa el chat (y 'chat' en cfx_modulos_app()):
--   cfx_chat_puede(a, b) boolean         ¿a puede escribirle a b?
--   cfx_chat_seguidos(a, b) int          mensajes seguidos sin respuesta (null = sin límite)
--   cfx_chat_quien(u) jsonb              {"nombre": ..., "rol": ...} para la lista y los reportes
--   cfx_chat_aviso(para, de, texto) void push al que recibe (con el link a la conversación)
--   cfx_chat_suspender(u) void           el admin suspende una cuenta reportada
create table if not exists public.cfx_mensajes (
  id      uuid primary key default gen_random_uuid(),
  de      uuid not null references auth.users (id) on delete cascade,
  para    uuid not null references auth.users (id) on delete cascade,
  texto   text not null check (char_length(texto) between 1 and 1000),
  creado  timestamptz not null default now(),
  leido   timestamptz
);
create index if not exists cfx_mensajes_par_idx on public.cfx_mensajes (least(de, para), greatest(de, para), creado desc);
create index if not exists cfx_mensajes_para_idx on public.cfx_mensajes (para) where leido is null;
create index if not exists cfx_mensajes_de_idx on public.cfx_mensajes (de, creado);
create index if not exists cfx_mensajes_creado_idx on public.cfx_mensajes (creado);
create table if not exists public.cfx_bloqueos (
  quien   uuid not null references auth.users (id) on delete cascade,
  a       uuid not null references auth.users (id) on delete cascade,
  creado  timestamptz not null default now(),
  primary key (quien, a)
);
create table if not exists public.cfx_reportes (
  id        uuid primary key default gen_random_uuid(),
  quien     uuid not null references auth.users (id) on delete cascade,
  a         uuid not null references auth.users (id) on delete cascade,
  mensaje   uuid references public.cfx_mensajes (id) on delete set null,
  motivo    text not null,
  extracto  text not null default '',
  resuelto  boolean not null default false,
  creado    timestamptz not null default now()
);
alter table public.cfx_mensajes enable row level security;
alter table public.cfx_bloqueos enable row level security;
alter table public.cfx_reportes enable row level security;
revoke all on public.cfx_mensajes, public.cfx_bloqueos, public.cfx_reportes from anon, authenticated;

create or replace function public.cfx_msg_listo() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  if not public.cfx_modulo('chat') then raise exception 'El chat no está disponible en esta app'; end if;
  return auth.uid();
end $$;

create or replace function public.cfx_msg_bloqueado(p_uno uuid, p_otro uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  return exists (select 1 from public.cfx_bloqueos x where (x.quien = p_uno and x.a = p_otro) or (x.quien = p_otro and x.a = p_uno));
end $$;

-- Cuántos me quedan seguidos con "otro": {"restantes": n, "limite": n} (null = sin límite).
create or replace function public.cfx_msg_restantes(p_otro uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.cfx_msg_listo(); lim int := public.cfx_chat_seguidos(u, p_otro); n int;
begin
  if lim is null then return jsonb_build_object('restantes', null, 'limite', null); end if;
  select count(*) into n from public.cfx_mensajes m where m.de = u and m.para = p_otro
    and m.creado > coalesce((select max(x.creado) from public.cfx_mensajes x where x.de = p_otro and x.para = u), '-infinity');
  return jsonb_build_object('restantes', greatest(0, lim - n), 'limite', lim);
end $$;

-- Enviar: {"ok": true, "id", "restantes"} o {"ok": false, "error"}.
create or replace function public.cfx_msg_enviar(p_para uuid, p_texto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.cfx_msg_listo(); t text := trim(coalesce(p_texto, '')); lim int; r jsonb; i uuid;
begin
  if t = '' then return jsonb_build_object('ok', false, 'error', 'Escribe un mensaje'); end if;
  if char_length(t) > 1000 then return jsonb_build_object('ok', false, 'error', 'Máximo 1000 caracteres por mensaje'); end if;
  if p_para is null or not coalesce(public.cfx_chat_puede(u, p_para), false) then
    return jsonb_build_object('ok', false, 'error', 'No puedes escribirle a esta cuenta');
  end if;
  lim := public.cfx_chat_seguidos(u, p_para);
  if lim is not null then
    if public.cfx_msg_bloqueado(u, p_para) then return jsonb_build_object('ok', false, 'error', 'La conversación está bloqueada'); end if;
    if (public.cfx_msg_restantes(p_para) ->> 'restantes')::int <= 0 then
      return jsonb_build_object('ok', false, 'error', case when lim = 1
        then 'Envías 1 mensaje a la vez. Espera la respuesta para escribir de nuevo.'
        else 'Ya enviaste ' || lim || ' mensajes seguidos. Espera la respuesta para escribir de nuevo.' end);
    end if;
    if (select count(*) from public.cfx_mensajes where de = u and creado > now() - interval '1 day') >= 100 then
      return jsonb_build_object('ok', false, 'error', 'Llegaste al máximo de 100 mensajes por día');
    end if;
  end if;
  insert into public.cfx_mensajes (de, para, texto) values (u, p_para, t) returning id into i;
  perform public.cfx_chat_aviso(p_para, u, t);
  r := public.cfx_msg_restantes(p_para);
  return jsonb_build_object('ok', true, 'id', i, 'restantes', r -> 'restantes');
end $$;

-- Mis conversaciones: [{otro, nombre, rol, ultimo, ultimo_at, mio, no_leidos, bloqueado}] (las 100 más recientes).
create or replace function public.cfx_msg_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.cfx_msg_listo();
begin
  return coalesce((with z as (select case when m.de = u then m.para else m.de end as otro, m.texto, m.creado, m.de = u as mio
                               from public.cfx_mensajes m where m.de = u or m.para = u),
                          l as (select distinct on (otro) * from z order by otro, creado desc),
                          t as (select * from l order by creado desc limit 100)
    select jsonb_agg(jsonb_build_object('otro', t.otro, 'nombre', coalesce(q.v ->> 'nombre', 'Cuenta'), 'rol', coalesce(q.v ->> 'rol', ''),
      'ultimo', t.texto, 'ultimo_at', t.creado, 'mio', t.mio,
      'no_leidos', (select count(*) from public.cfx_mensajes x where x.de = t.otro and x.para = u and x.leido is null),
      'bloqueado', exists (select 1 from public.cfx_bloqueos b where b.quien = u and b.a = t.otro)) order by t.creado desc)
    from t cross join lateral (select public.cfx_chat_quien(t.otro) as v) q), '[]');
end $$;

create or replace function public.cfx_msg_sin_leer() returns int
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.cfx_modulo('chat') then return 0; end if;
  return (select count(*)::int from public.cfx_mensajes where para = auth.uid() and leido is null);
end $$;

-- Una conversación (las últimas 200; marca como leídos los recibidos): [{id, mio, texto, creado, leido}].
create or replace function public.cfx_msg_hilo(p_otro uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.cfx_msg_listo();
begin
  update public.cfx_mensajes set leido = now() where de = p_otro and para = u and leido is null;
  return coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'mio', m.de = u, 'texto', m.texto, 'creado', m.creado, 'leido', m.leido) order by m.creado)
    from (select * from public.cfx_mensajes x where (x.de = u and x.para = p_otro) or (x.de = p_otro and x.para = u)
          order by x.creado desc limit 200) m), '[]');
end $$;

create or replace function public.cfx_msg_bloquear(p_otro uuid, p_bloquear boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.cfx_msg_listo();
begin
  if p_otro is null or p_otro = u then raise exception 'Cuenta no válida'; end if;
  if p_bloquear then insert into public.cfx_bloqueos (quien, a) values (u, p_otro) on conflict do nothing;
  else delete from public.cfx_bloqueos where quien = u and a = p_otro; end if;
end $$;

create or replace function public.cfx_msg_reportar(p_mensaje uuid, p_motivo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.cfx_msg_listo(); m public.cfx_mensajes;
begin
  select * into m from public.cfx_mensajes where id = p_mensaje and para = u;
  if m.id is null then return jsonb_build_object('ok', false, 'error', 'Mensaje no encontrado'); end if;
  if (select count(*) from public.cfx_reportes where quien = u and creado > now() - interval '1 day') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'Máximo 10 reportes por día');
  end if;
  insert into public.cfx_reportes (quien, a, mensaje, motivo, extracto)
  values (u, m.de, m.id, left(coalesce(nullif(trim(p_motivo), ''), 'Sin motivo'), 300), left(m.texto, 300));
  perform public.cfx_avisar_admin('🚩 Nuevo reporte en el chat', left(m.texto, 100));
  return jsonb_build_object('ok', true);
end $$;

-- Borra la conversación completa (para los dos).
create or replace function public.cfx_msg_borrar(p_otro uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.cfx_msg_listo(); n int;
begin
  delete from public.cfx_mensajes where (de = u and para = p_otro) or (de = p_otro and para = u);
  get diagnostics n = row_count;
  return n;
end $$;

-- Administrador: reportes sin resolver y resolverlos (descartar o suspender a la cuenta reportada).
create or replace function public.cfx_msg_reportes() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'motivo', r.motivo, 'extracto', r.extracto, 'creado', r.creado,
      'quien', coalesce(public.cfx_chat_quien(r.quien) ->> 'nombre', ''), 'a', coalesce(public.cfx_chat_quien(r.a) ->> 'nombre', ''),
      'quien_email', (select email from auth.users where id = r.quien), 'a_email', (select email from auth.users where id = r.a)) order by r.creado desc)
    from public.cfx_reportes r where not r.resuelto), '[]');
end $$;

create or replace function public.cfx_msg_resolver(p_id uuid, p_suspender boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.cfx_reportes;
begin
  perform <CHK>;
  update public.cfx_reportes set resuelto = true where id = p_id and not resuelto returning * into r;
  if r.id is null then raise exception 'El reporte ya fue atendido'; end if;
  if p_suspender then perform public.cfx_chat_suspender(r.a); end if;
  perform public.cfx_anotar('reporte chat', case when p_suspender then 'suspendida ' else 'descartado ' end || coalesce((select email from auth.users where id = r.a), ''));
end $$;

revoke all on function public.cfx_msg_listo(), public.cfx_msg_bloqueado(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cfx_msg_restantes(uuid), public.cfx_msg_enviar(uuid, text), public.cfx_msg_lista(), public.cfx_msg_sin_leer(),
  public.cfx_msg_hilo(uuid), public.cfx_msg_bloquear(uuid, boolean), public.cfx_msg_reportar(uuid, text), public.cfx_msg_borrar(uuid),
  public.cfx_msg_reportes(), public.cfx_msg_resolver(uuid, boolean) from public, anon;
grant execute on function public.cfx_msg_restantes(uuid), public.cfx_msg_enviar(uuid, text), public.cfx_msg_lista(), public.cfx_msg_sin_leer(),
  public.cfx_msg_hilo(uuid), public.cfx_msg_bloquear(uuid, boolean), public.cfx_msg_reportar(uuid, text), public.cfx_msg_borrar(uuid),
  public.cfx_msg_reportes(), public.cfx_msg_resolver(uuid, boolean) to authenticated;
