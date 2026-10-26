-- =====================================================================
--  Centro de Mando · Base de datos v3.5 (Supabase)
--  Supabase → SQL Editor → New query → pega TODO este archivo → Run.
--  Se puede volver a ejecutar sin perder datos.
--  ATENCIÓN: la primera vez BORRA lo del sistema anterior (negocios,
--  reservas, catálogo, pedidos, chat, calificaciones). Las cuentas de
--  usuario y los ajustes de plan se conservan.
-- =====================================================================
set check_function_bodies = off;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- A0. Tablas y funciones base (para instalar desde cero en un Supabase nuevo).
--     Si ya existen (actualización), no se tocan.
-- ---------------------------------------------------------------------
create table if not exists public.perfiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  email              text not null,
  nombre             text not null default '' check (length(nombre) <= 80),
  telefono           text not null default '' check (length(telefono) <= 30),
  rol                text not null default 'usuario',
  premium_hasta      timestamptz,
  aviso_venc_para    timestamptz,
  aviso_vencido_para timestamptz,
  suspendido         boolean not null default false,
  visto_at           timestamptz,
  created_by         uuid,
  created_at         timestamptz not null default now()
);
alter table public.perfiles enable row level security;
create table if not exists public.invitaciones (
  email      text primary key,
  rol        text not null,
  nombre     text not null default '',
  telefono   text not null default '',
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.invitaciones enable row level security;
create table if not exists public.notificaciones (
  id           uuid primary key default gen_random_uuid(),
  para         uuid not null references public.perfiles (id) on delete cascade,
  titulo       text not null,
  cuerpo       text not null default '',
  url          text not null default '',
  leida        boolean not null default false,
  push_enviado boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists notif_para_idx on public.notificaciones (para, created_at desc);
create index if not exists notif_push_idx on public.notificaciones (push_enviado, created_at) where not push_enviado;
alter table public.notificaciones enable row level security;
create table if not exists public.push_subs (
  endpoint   text primary key,
  perfil_id  uuid not null references public.perfiles (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
create table if not exists public.auditoria (
  id         bigserial primary key,
  quien      uuid,
  accion     text not null,
  detalle    text not null default '',
  created_at timestamptz not null default now()
);
alter table public.auditoria enable row level security;
create or replace function public.avisar(p_para uuid, p_titulo text, p_cuerpo text, p_url text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notificaciones (para, titulo, cuerpo, url)
  select p_para, left(p_titulo, 90), left(coalesce(p_cuerpo, ''), 240), coalesce(p_url, '')
  where p_para is not null
$$;
create or replace function public.push_guardar(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  if p_endpoint !~ '^https://' then raise exception 'Suscripción no válida'; end if;
  insert into public.push_subs (endpoint, perfil_id, p256dh, auth) values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update set perfil_id = excluded.perfil_id, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;
create or replace function public.push_quitar(p_endpoint text) returns void
language sql security definer set search_path = '' as $$
  delete from public.push_subs where endpoint = p_endpoint and perfil_id = auth.uid()
$$;
create or replace function public.push_pendientes() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ids uuid[]; out jsonb;
begin
  select array_agg(id) into ids from (
    select id from public.notificaciones where not push_enviado and created_at > now() - interval '1 day'
    order by created_at limit 300 for update skip locked) x;
  if ids is null then return jsonb_build_object('claves', null, 'envios', '[]'::jsonb); end if;
  update public.notificaciones set push_enviado = true where id = any (ids);
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth,
           'titulo', n.titulo, 'cuerpo', n.cuerpo, 'url', n.url, 'id', n.id)), '[]')
    into out from public.notificaciones n join public.push_subs s on s.perfil_id = n.para where n.id = any (ids);
  return jsonb_build_object('envios', out, 'claves', jsonb_build_object(
    'publica', (select valor #>> '{}' from public.config where clave = 'vapid_publica'),
    'privada', (select valor from public.secretos where clave = 'vapid_privada')));
end $$;
create or replace function public.push_borrar_endpoint(p_endpoint text) returns void
language sql security definer set search_path = '' as $$ delete from public.push_subs where endpoint = p_endpoint $$;
create or replace function public.registrar_visto() returns void
language sql security definer set search_path = '' as $$
  update public.perfiles set visto_at = now()
  where id = auth.uid() and (visto_at is null or visto_at < now() - interval '5 minutes')
$$;

-- ---------------------------------------------------------------------
-- A. Limpieza del sistema anterior
-- ---------------------------------------------------------------------
drop table if exists public.pedidos, public.productos, public.mensajes, public.calificaciones, public.comprobantes,
  public.pagos, public.reservas, public.links_pago, public.bloqueos, public.promos, public.servicios,
  public.negocios, public.rubros cascade;

-- Todas las funciones antiguas se borran, salvo las que se reutilizan tal cual.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind in ('f', 'p')
      and p.proname <> all (array['admin_email', 'cfg_int', 'is_admin', 'is_socio', 'is_staff', 'admin_check', 'avisar',
        'push_guardar', 'push_quitar', 'push_pendientes', 'push_borrar_endpoint', 'registrar_visto'])
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute 'drop function if exists ' || r.f || ' cascade';
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- B. Ajustes generales, cuentas y planes
-- ---------------------------------------------------------------------
create or replace function public.admin_email() returns text
language sql immutable as $$ select 'juanjosuecastilloloyola@gmail.com'::text $$;
create or replace function public.db_version() returns text
language sql immutable as $$ select '3.5'::text $$;
create or replace function public.cfg_int(c text) returns int
language sql stable security definer set search_path = '' as $$
  select (valor #>> '{}')::int from public.config where clave = c
$$;

create table if not exists public.config (clave text primary key, valor jsonb not null);
create table if not exists public.textos (clave text primary key, valor text not null default '');
create table if not exists public.secretos (clave text primary key, valor text not null);
create table if not exists public.planes (
  codigo text primary key, nombre text not null, descripcion text not null default '',
  limites jsonb not null default '{}', beneficios jsonb not null default '[]',
  duracion_dias int not null default 30 check (duracion_dias between 1 and 3650));
alter table public.config enable row level security;
alter table public.textos enable row level security;
alter table public.secretos enable row level security;
alter table public.planes enable row level security;

-- Solo se borran ajustes del sistema anterior; los tuyos (precios, link, días, versión liberada) se conservan al actualizar.
delete from public.config where clave not in ('vapid_publica', 'soporte_whatsapp', 'dias_aviso_vencimiento', 'dias_comprobantes', 'dias_prueba',
  'pro_link', 'pro_link_anual', 'pro_precio_mensual', 'pro_precio_anual', 'limite_db_mb', 'auditoria_max', 'version_liberada', 'version_min');
insert into public.config (clave, valor) values
  ('dias_prueba', '7'), ('dias_aviso_vencimiento', '3'), ('dias_comprobantes', '30'), ('soporte_whatsapp', '""'),
  ('vapid_publica', '""'), ('pro_link', '""'), ('pro_link_anual', '""'), ('pro_precio_mensual', '4900'), ('pro_precio_anual', '49000'),
  ('limite_db_mb', '500'), ('auditoria_max', '2000'), ('version_liberada', '"3.0"')
on conflict (clave) do nothing;

delete from public.textos where clave not in ('app_nombre', 'app_lema', 'terminos', 'pago_instrucciones', 'pro_titulo', 'pro_texto');
insert into public.textos (clave, valor) values
  ('app_nombre', 'Centro de Mando'),
  ('app_lema', 'Saca todo de tu cabeza. Elige una cosa. Avanza.'),
  ('terminos', 'Tus datos son tuyos: ni el administrador ni los socios pueden leer tus notas, tareas ni tu diario. Puedes descargarlos y borrarlos cuando quieras.'),
  ('pago_instrucciones', 'Toca "Pagar", paga con el link, toma una captura del comprobante y súbela aquí. Te avisamos apenas se apruebe.'),
  ('pro_titulo', 'Centro de Mando Pro'),
  ('pro_texto', 'Sin límites, análisis completo, descanso inteligente y revisión semanal automática.')
on conflict (clave) do nothing;

alter table public.planes drop constraint if exists planes_codigo_check;
delete from public.planes where codigo not in ('free', 'pro');
alter table public.planes add constraint planes_codigo_check check (codigo in ('free', 'pro'));
insert into public.planes (codigo, nombre, descripcion, limites, beneficios, duracion_dias) values
  ('free', 'Gratis', 'Lo esencial para ordenar tu cabeza.',
   '{"espacios": 2, "items": 500, "recordatorios": 5, "insights": 3, "descanso": false}',
   '["2 espacios (trabajo y personal)", "Hasta 500 registros", "Tablero, metas, ideas, problemas y diario", "5 recordatorios activos", "3 consejos del análisis", "Descargar todos tus datos"]', 30),
  ('pro', 'Pro', 'Todo, sin límites.',
   '{"espacios": 20, "items": 0, "recordatorios": 0, "insights": 30, "descanso": true}',
   '["Registros y recordatorios ilimitados", "Hasta 20 espacios con horario propio", "Análisis completo que aprende de ti", "Avisos de descanso según tus horarios", "Revisión semanal automática"]', 30)
on conflict (codigo) do nothing;

-- Cuentas: usuario (la persona), socio (ayuda a administrar) y admin (súper administrador).
alter table public.perfiles drop column if exists negocio_id cascade;
alter table public.perfiles drop constraint if exists perfiles_rol_check;
update public.perfiles set rol = 'usuario' where rol not in ('admin', 'socio');
alter table public.perfiles add constraint perfiles_rol_check check (rol in ('admin', 'socio', 'usuario'));
alter table public.perfiles add column if not exists prefs jsonb not null default '{}';
alter table public.perfiles add column if not exists prueba_usada boolean not null default false;

alter table public.invitaciones drop column if exists negocio_id cascade;
alter table public.invitaciones drop column if exists negocio_nombre;
alter table public.invitaciones drop column if exists rubro_id;
delete from public.invitaciones;
alter table public.invitaciones drop constraint if exists invitaciones_rol_check;
alter table public.invitaciones add constraint invitaciones_rol_check check (rol in ('socio', 'usuario'));

-- Registro de acciones del administrador y de los socios (con el motivo).
alter table public.auditoria add column if not exists rol text not null default '';
alter table public.auditoria add column if not exists quien_email text not null default '';
alter table public.auditoria add column if not exists motivo text not null default '';

-- ---------------------------------------------------------------------
-- C. Datos del usuario: espacios, registros, uso, pagos
-- ---------------------------------------------------------------------
-- Espacio = ámbito de tu vida (Trabajo, Personal, Estudio...) con su propio horario.
create table if not exists public.espacios (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references public.perfiles (id) on delete cascade,
  nombre     text not null check (length(nombre) between 1 and 40),
  icono      text not null default '' check (length(icono) <= 20),
  color      text not null default '#3d63ff' check (color ~ '^#[0-9a-fA-F]{6}$'),
  modo       text not null default 'personal' check (modo in ('trabajo', 'personal')),
  horario    jsonb not null default '{}',   -- {"dias": [1,2,3,4,5], "desde": "09:00", "hasta": "18:00"}
  orden      int not null default 0,
  archivado  boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists espacios_owner_idx on public.espacios (owner);

-- Todo lo que la persona anota vive en UNA tabla (liviana y flexible).
--  tarea · proyecto · meta · resultado (de una meta) · habito · check (un día cumplido de un hábito)
--  idea · problema · solucion (respuesta a un problema) · nota · diario · logro · leccion · recordatorio
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references public.perfiles (id) on delete cascade,
  espacio_id  uuid references public.espacios (id) on delete set null,
  padre       uuid references public.items (id) on delete cascade,
  tipo        text not null check (tipo in ('tarea', 'proyecto', 'meta', 'resultado', 'habito', 'check', 'idea', 'problema',
                                           'solucion', 'nota', 'diario', 'logro', 'leccion', 'recordatorio')),
  titulo      text not null default '' check (length(titulo) <= 200),
  cuerpo      text not null default '' check (length(cuerpo) <= 4000),
  estado      text not null default 'abierto' check (length(estado) <= 20),
  prioridad   smallint not null default 0 check (prioridad between 0 and 3),   -- 3 = Top del día
  fecha       date,
  aviso_at    timestamptz,
  repite      text not null default '' check (repite in ('', 'diario', 'semanal', 'mensual')),
  etiquetas   text[] not null default '{}',
  datos       jsonb not null default '{}' check (length(datos::text) <= 3000),
  hecho_at    timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists items_owner_tipo_idx on public.items (owner, tipo, estado);
create index if not exists items_owner_fecha_idx on public.items (owner, fecha) where fecha is not null;
create index if not exists items_padre_idx on public.items (padre) where padre is not null;
create index if not exists items_aviso_idx on public.items (aviso_at) where tipo = 'recordatorio' and estado = 'abierto';
create index if not exists items_hecho_idx on public.items (owner, hecho_at) where hecho_at is not null;

-- Tiempo en la app por día (un solo registro por día: casi no ocupa espacio).
create table if not exists public.uso_dia (
  owner        uuid not null references public.perfiles (id) on delete cascade,
  dia          date not null,
  app_min      int not null default 0,
  trabajo_min  int not null default 0,     -- minutos en la app dentro de tu horario de trabajo
  descanso_min int not null default 0,     -- minutos en la app fuera de tu horario de trabajo
  foco_min     int not null default 0,
  aperturas    int not null default 0,
  aterrizajes  int not null default 0,
  avisos       jsonb not null default '{}',
  primary key (owner, dia)
);

create table if not exists public.pagos (
  id          uuid primary key default gen_random_uuid(),
  usuario     uuid not null references public.perfiles (id) on delete cascade,
  plan        text not null check (plan in ('mensual', 'anual')),
  monto       int not null default 0,
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  comprobante text,
  created_at  timestamptz not null default now(),
  resuelto_at timestamptz
);
create index if not exists pagos_estado_idx on public.pagos (estado, created_at);

alter table public.perfiles enable row level security;
alter table public.espacios enable row level security;
alter table public.items enable row level security;
alter table public.uso_dia enable row level security;
alter table public.pagos enable row level security;

-- ---------------------------------------------------------------------
-- D. Quién soy y reglas de plan
-- ---------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles p join auth.users u on u.id = p.id
    where p.id = auth.uid() and p.rol = 'admin' and not p.suspendido
      and lower(u.email) = public.admin_email() and u.email_confirmed_at is not null)
$$;
create or replace function public.is_socio() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'socio' and not p.suspendido)
$$;
create or replace function public.is_staff() returns boolean
language sql stable as $$ select public.is_admin() or public.is_socio() $$;

-- Pro vigente (el admin y los socios siempre).
create or replace function public.es_pro(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.rol in ('admin', 'socio') or p.premium_hasta > now() from public.perfiles p where p.id = uid), false)
$$;
create or replace function public.limite(uid uuid, clave text) returns int
language sql stable security definer set search_path = '' as $$
  select (limites ->> clave)::int from public.planes where codigo = case when public.es_pro(uid) then 'pro' else 'free' end
$$;

-- Cambios del administrador: el socio puede hacerlos, pero debe escribir el motivo (queda en el registro).
create or replace function public.admin_check() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'Solo el administrador'; end if;
end $$;
create or replace function public.super_check() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Solo el súper administrador'; end if;
end $$;
create or replace function public.edit_check(p_motivo text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.is_admin() then return; end if;
  if not public.is_socio() then raise exception 'Solo el administrador'; end if;
  if length(trim(coalesce(p_motivo, ''))) < 4 then raise exception 'Escribe el motivo del cambio (mínimo 4 letras)'; end if;
end $$;

create or replace function public.auditar(p_accion text, p_detalle text, p_motivo text default '') returns void
language sql security definer set search_path = '' as $$
  insert into public.auditoria (quien, accion, detalle, motivo, rol, quien_email)
  select auth.uid(), left(p_accion, 60), left(coalesce(p_detalle, ''), 500), left(coalesce(p_motivo, ''), 300),
         coalesce(p.rol, ''), coalesce(p.email, '')
  from (select 1) x left join public.perfiles p on p.id = auth.uid()
$$;

create or replace function public.avisar_staff(p_titulo text, p_cuerpo text, p_url text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notificaciones (para, titulo, cuerpo, url)
  select p.id, left(p_titulo, 90), left(coalesce(p_cuerpo, ''), 240), coalesce(p_url, '')
  from public.perfiles p where p.rol in ('admin', 'socio') and not p.suspendido
$$;

-- Registro de cuentas: abierto con correo. El socio entra por invitación del administrador.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  inv public.invitaciones;
  em text := lower(new.email);
  rolx text := 'usuario';
  nom text;
begin
  if em = public.admin_email() then
    insert into public.perfiles (id, email, nombre, rol) values (new.id, em, 'Administrador', 'admin') on conflict (id) do nothing;
    return new;
  end if;
  select * into inv from public.invitaciones where email = em and created_at > now() - interval '1 day';
  if inv.email is not null then
    rolx := inv.rol; nom := inv.nombre;
    delete from public.invitaciones where email = em;
  else
    nom := trim(coalesce(meta ->> 'nombre', ''));
  end if;
  insert into public.perfiles (id, email, nombre, telefono, rol, premium_hasta, prueba_usada, created_by)
  values (new.id, em, left(coalesce(nom, ''), 80), left(coalesce(inv.telefono, meta ->> 'telefono', ''), 30), rolx,
          case when rolx = 'usuario' then now() + make_interval(days => coalesce(public.cfg_int('dias_prueba'), 7)) end,
          rolx = 'usuario', inv.created_by);
  if rolx = 'usuario' then
    insert into public.espacios (owner, nombre, icono, color, modo, horario, orden) values
      (new.id, 'Trabajo', 'maletin', '#3d63ff', 'trabajo', '{"dias":[1,2,3,4,5],"desde":"09:00","hasta":"18:00"}', 1),
      (new.id, 'Personal', 'casa', '#2fcf8e', 'personal', '{}', 2);
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.perfiles (id, email, nombre, rol)
select u.id, lower(u.email), 'Administrador', 'admin' from auth.users u where lower(u.email) = public.admin_email()
on conflict (id) do update set rol = 'admin';

-- Lo llama SOLO el servidor antes de crear una cuenta desde el panel.
create or replace function public.preparar_cuenta(p_caller uuid, p_email text, p_nombre text, p_telefono text, p_rol text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.perfiles; em text := lower(trim(coalesce(p_email, '')));
begin
  select * into c from public.perfiles where id = p_caller and not suspendido;
  if c.id is null or c.rol not in ('admin', 'socio') then return jsonb_build_object('ok', false, 'error', 'Sin permiso'); end if;
  if p_rol not in ('socio', 'usuario') then return jsonb_build_object('ok', false, 'error', 'Tipo de cuenta no válido'); end if;
  if p_rol = 'socio' and c.rol <> 'admin' then return jsonb_build_object('ok', false, 'error', 'Solo el súper administrador crea socios'); end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'error', 'Correo no válido'); end if;
  if trim(coalesce(p_nombre, '')) = '' then return jsonb_build_object('ok', false, 'error', 'Escribe el nombre'); end if;
  if exists (select 1 from auth.users where lower(email) = em) then return jsonb_build_object('ok', false, 'error', 'Ese correo ya tiene cuenta'); end if;
  insert into public.invitaciones (email, rol, nombre, telefono, created_by)
  values (em, p_rol, trim(p_nombre), trim(coalesce(p_telefono, '')), c.id)
  on conflict (email) do update set rol = excluded.rol, nombre = excluded.nombre, telefono = excluded.telefono,
    created_by = excluded.created_by, created_at = now();
  insert into public.auditoria (quien, accion, detalle, rol, quien_email) values (c.id, 'crear_cuenta', p_rol || ' ' || em, c.rol, c.email);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.cancelar_invitacion(p_email text) returns void
language sql security definer set search_path = '' as $$ delete from public.invitaciones where email = lower(trim(p_email)) $$;

-- Lo llama SOLO el servidor antes de borrar una cuenta. El socio debe dar el motivo.
create or replace function public.preparar_borrado(p_caller uuid, p_id uuid, p_motivo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.perfiles; t public.perfiles;
begin
  select * into c from public.perfiles where id = p_caller and not suspendido;
  if c.id is null or c.rol not in ('admin', 'socio') then return jsonb_build_object('ok', false, 'error', 'Sin permiso'); end if;
  if c.rol = 'socio' and length(trim(coalesce(p_motivo, ''))) < 4 then return jsonb_build_object('ok', false, 'error', 'Escribe el motivo (mínimo 4 letras)'); end if;
  select * into t from public.perfiles where id = p_id;
  if t.id is null then return jsonb_build_object('ok', false, 'error', 'Cuenta no encontrada'); end if;
  if t.rol = 'admin' then return jsonb_build_object('ok', false, 'error', 'No se puede borrar al administrador'); end if;
  if t.rol = 'socio' and c.rol <> 'admin' then return jsonb_build_object('ok', false, 'error', 'Solo el súper administrador borra socios'); end if;
  insert into public.auditoria (quien, accion, detalle, motivo, rol, quien_email) values (c.id, 'borrar_cuenta', t.email, left(coalesce(p_motivo, ''), 300), c.rol, c.email);
  return jsonb_build_object('ok', true, 'ids', jsonb_build_array(t.id));
end $$;

-- ---------------------------------------------------------------------
-- E. Reglas de los registros (límites del plan, fechas automáticas)
-- ---------------------------------------------------------------------
create or replace function public.items_antes() returns trigger
language plpgsql security definer set search_path = '' as $$
declare lim int; n int;
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then new.owner := old.owner; else new.owner := coalesce(auth.uid(), new.owner); end if;
  if new.espacio_id is not null and not exists (select 1 from public.espacios e where e.id = new.espacio_id and e.owner = new.owner) then
    new.espacio_id := null;
  end if;
  if new.padre is not null and not exists (select 1 from public.items i where i.id = new.padre and i.owner = new.owner) then
    raise exception 'Registro relacionado no válido';
  end if;
  if tg_op = 'INSERT' then
    lim := public.limite(new.owner, 'items');
    if coalesce(lim, 0) > 0 then
      select count(*) into n from public.items where owner = new.owner;
      if n >= lim then raise exception 'Llegaste al límite de % registros de tu plan. Descarga y depura datos antiguos o pasa a Pro.', lim; end if;
    end if;
  end if;
  if new.tipo = 'recordatorio' and new.estado = 'abierto' and (tg_op = 'INSERT' or old.estado <> 'abierto') then
    lim := public.limite(new.owner, 'recordatorios');
    if coalesce(lim, 0) > 0 then
      select count(*) into n from public.items where owner = new.owner and tipo = 'recordatorio' and estado = 'abierto';
      if n >= lim then raise exception 'Tu plan permite % recordatorios activos. Pasa a Pro para más.', lim; end if;
    end if;
  end if;
  if new.estado in ('hecho', 'resuelto', 'lograda', 'descartada') then
    if tg_op = 'INSERT' or old.estado is distinct from new.estado then new.hecho_at := now(); end if;
  else
    new.hecho_at := null;
  end if;
  return new;
end $$;
drop trigger if exists items_antes on public.items;
create trigger items_antes before insert or update on public.items for each row execute function public.items_antes();

create or replace function public.espacios_antes() returns trigger
language plpgsql security definer set search_path = '' as $$
declare lim int; n int;
begin
  if tg_op = 'UPDATE' then new.owner := old.owner; else new.owner := coalesce(auth.uid(), new.owner); end if;
  if tg_op = 'INSERT' then
    lim := public.limite(new.owner, 'espacios');
    if coalesce(lim, 0) > 0 then
      select count(*) into n from public.espacios where owner = new.owner and not archivado;
      if n >= lim then raise exception 'Tu plan permite % espacios. Archiva uno o pasa a Pro.', lim; end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists espacios_antes on public.espacios;
create trigger espacios_antes before insert or update on public.espacios for each row execute function public.espacios_antes();

-- ---------------------------------------------------------------------
-- F. Políticas (cada persona solo ve lo suyo; ni admin ni socios leen sus registros)
-- ---------------------------------------------------------------------
drop policy if exists "ver perfiles" on public.perfiles;
create policy "ver perfiles" on public.perfiles for select to authenticated using (id = auth.uid() or public.is_staff());
drop policy if exists "mis espacios" on public.espacios;
create policy "mis espacios" on public.espacios for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists "mis items" on public.items;
create policy "mis items" on public.items for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists "mi uso" on public.uso_dia;
create policy "mi uso" on public.uso_dia for select to authenticated using (owner = auth.uid());
drop policy if exists "mis avisos" on public.notificaciones;
create policy "mis avisos" on public.notificaciones for select to authenticated using (para = auth.uid());
drop policy if exists "leer mis avisos" on public.notificaciones;
create policy "leer mis avisos" on public.notificaciones for update to authenticated using (para = auth.uid()) with check (para = auth.uid());
drop policy if exists "borrar mis avisos" on public.notificaciones;
create policy "borrar mis avisos" on public.notificaciones for delete to authenticated using (para = auth.uid());
drop policy if exists "ver textos" on public.textos;
create policy "ver textos" on public.textos for select to anon, authenticated using (true);
drop policy if exists "ver planes" on public.planes;
create policy "ver planes" on public.planes for select to anon, authenticated using (true);

revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate on all tables in schema public from authenticated;
grant select on public.perfiles, public.notificaciones, public.textos, public.planes, public.espacios, public.items, public.uso_dia to authenticated;
grant select on public.textos, public.planes to anon;
grant insert, update, delete on public.espacios, public.items to authenticated;
grant update (leida), delete on public.notificaciones to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notificaciones') then
    alter publication supabase_realtime add table public.notificaciones;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- G. Cuenta, uso y descanso
-- ---------------------------------------------------------------------
create or replace function public.config_publica() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'config', (select jsonb_object_agg(clave, valor) from public.config),
    'textos', (select jsonb_object_agg(clave, valor) from public.textos),
    'planes', (select jsonb_object_agg(codigo, jsonb_build_object('nombre', nombre, 'descripcion', descripcion,
                 'limites', limites, 'beneficios', beneficios, 'duracion_dias', duracion_dias)) from public.planes))
$$;

create or replace function public.mi_cuenta() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'email', p.email, 'nombre', p.nombre, 'telefono', p.telefono, 'rol', p.rol,
    'suspendido', p.suspendido, 'is_admin', public.is_admin(), 'is_socio', public.is_socio(),
    'premium', public.es_pro(p.id), 'premium_hasta', p.premium_hasta, 'prefs', p.prefs, 'db_version', public.db_version())
  from public.perfiles p where p.id = auth.uid()
$$;

create or replace function public.mi_perfil_guardar(p_nombre text, p_telefono text, p_prefs jsonb default null) returns void
language plpgsql security definer set search_path = '' as $$
declare f jsonb;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  if p_prefs is not null then
    if jsonb_typeof(p_prefs) <> 'object' or length(p_prefs::text) > 1500 then raise exception 'Datos no válidos'; end if;
    select coalesce(jsonb_object_agg(k, v), '{}') into f from jsonb_each(p_prefs) as t(k, v)
    where k in ('tz', 'limite_descanso_min', 'limite_app_min', 'pausa_cada', 'resumen_manana', 'cierre_noche', 'avisos_horario', 'color', 'tema', 'avatar', 'guia', 'wip');
  end if;
  update public.perfiles set nombre = left(trim(coalesce(p_nombre, nombre)), 80), telefono = left(trim(coalesce(p_telefono, telefono)), 30),
    prefs = case when f is null then prefs else prefs || f end
  where id = auth.uid();
end $$;

-- Latido de uso (la app lo envía cada minuto mientras está abierta y visible).
create or replace function public.uso_latido(p_min int default 1) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); pr jsonb; tz text; loc timestamp; v_dia date; dow int; hm time; trab boolean;
  u public.uso_dia; lim_d int; lim_a int; aviso text;
begin
  if uid is null then return null; end if;
  p_min := greatest(0, least(coalesce(p_min, 1), 5));
  select p.prefs into pr from public.perfiles p where p.id = uid;
  tz := coalesce(pr ->> 'tz', 'America/Santiago');
  loc := now() at time zone tz; v_dia := loc::date; dow := extract(isodow from loc)::int; hm := loc::time;
  trab := exists (select 1 from public.espacios e where e.owner = uid and not e.archivado and e.modo = 'trabajo'
    and e.horario ? 'dias' and (e.horario -> 'dias') @> to_jsonb(dow)
    and hm >= (e.horario ->> 'desde')::time and hm < (e.horario ->> 'hasta')::time);
  insert into public.uso_dia (owner, dia, app_min, trabajo_min, descanso_min)
  values (uid, v_dia, p_min, case when trab then p_min else 0 end, case when trab then 0 else p_min end)
  on conflict (owner, dia) do update set app_min = public.uso_dia.app_min + p_min,
    trabajo_min = public.uso_dia.trabajo_min + case when trab then p_min else 0 end,
    descanso_min = public.uso_dia.descanso_min + case when trab then 0 else p_min end
  returning * into u;
  if coalesce((select (limites ->> 'descanso')::boolean from public.planes
       where codigo = case when public.es_pro(uid) then 'pro' else 'free' end), false) then
    lim_d := coalesce((pr ->> 'limite_descanso_min')::int, 60);
    lim_a := coalesce((pr ->> 'limite_app_min')::int, 180);
    if not trab and u.descanso_min >= lim_d and not (u.avisos ? 'desc') then
      if public.marcar_aviso(uid, v_dia, 'desc') then
        aviso := 'Ya llevas ' || u.descanso_min || ' min en la app fuera de tu horario de trabajo. Es hora de descansar.';
        perform public.avisar(uid, 'Hora de descansar', aviso, '/app/#hoy');
      end if;
    elsif u.app_min >= lim_a and not (u.avisos ? 'app') then
      if public.marcar_aviso(uid, v_dia, 'app') then
        aviso := 'Llevas ' || u.app_min || ' min en la app hoy. Cierra el día y desconecta un rato.';
        perform public.avisar(uid, 'Mucho tiempo en pantalla', aviso, '/app/#hoy');
      end if;
    end if;
  end if;
  return jsonb_build_object('en_trabajo', trab, 'app_min', u.app_min, 'trabajo_min', u.trabajo_min,
                            'descanso_min', u.descanso_min, 'aviso', aviso);
end $$;

create or replace function public.marcar_aviso(p_uid uuid, p_dia date, p_clave text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.uso_dia (owner, dia, avisos) values (p_uid, p_dia, jsonb_build_object(p_clave, true))
  on conflict (owner, dia) do update set avisos = public.uso_dia.avisos || jsonb_build_object(p_clave, true)
  where not (public.uso_dia.avisos ? p_clave);
  return found;
end $$;

create or replace function public.uso_evento(p_tipo text, p_min int default 0) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); tz text; d date;
begin
  if uid is null then return; end if;
  select coalesce(p.prefs ->> 'tz', 'America/Santiago') into tz from public.perfiles p where p.id = uid;
  d := (now() at time zone tz)::date;
  insert into public.uso_dia (owner, dia, aperturas, aterrizajes, foco_min) values (uid, d,
    case when p_tipo = 'apertura' then 1 else 0 end, case when p_tipo = 'aterrizaje' then 1 else 0 end,
    case when p_tipo = 'foco' then greatest(0, least(coalesce(p_min, 0), 240)) else 0 end)
  on conflict (owner, dia) do update set aperturas = public.uso_dia.aperturas + excluded.aperturas,
    aterrizajes = public.uso_dia.aterrizajes + excluded.aterrizajes, foco_min = public.uso_dia.foco_min + excluded.foco_min;
end $$;

-- Cuánto espacio ocupas tú.
create or replace function public.mi_uso() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'items', (select count(*) from public.items where owner = auth.uid()),
    'bytes', (select coalesce(sum(pg_column_size(i.*)), 0) from public.items i where i.owner = auth.uid()),
    'por_tipo', (select coalesce(jsonb_object_agg(tipo, n), '{}') from (select tipo, count(*) n from public.items where owner = auth.uid() group by tipo) x),
    'limite_items', public.limite(auth.uid(), 'items'),
    'espacios', (select count(*) from public.espacios where owner = auth.uid() and not archivado),
    'limite_espacios', public.limite(auth.uid(), 'espacios'))
$$;

-- Depurar: borra lo antiguo que ya descargaste (días cumplidos de hábitos y tareas terminadas).
create or replace function public.mi_depurar(p_dias int) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  p_dias := greatest(30, coalesce(p_dias, 90));
  delete from public.items where owner = auth.uid() and (
    (tipo = 'check' and created_at < now() - make_interval(days => p_dias)) or
    (tipo in ('tarea', 'recordatorio') and estado = 'hecho' and hecho_at < now() - make_interval(days => p_dias)));
  get diagnostics n = row_count;
  delete from public.uso_dia where owner = auth.uid() and dia < current_date - 400;
  return n;
end $$;

create or replace function public.mi_borrar_datos() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  delete from public.items where owner = auth.uid();
  delete from public.uso_dia where owner = auth.uid();
end $$;

-- ---------------------------------------------------------------------
-- H. Plan Pro: pago por link + comprobante
-- ---------------------------------------------------------------------
create or replace function public.pro_pagar(p_plan text, p_comprobante text) returns void
language plpgsql security definer set search_path = '' as $$
declare m int;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  if p_plan not in ('mensual', 'anual') then raise exception 'Plan no válido'; end if;
  if coalesce(length(p_comprobante), 0) < 100 or length(p_comprobante) > 600000 then raise exception 'Sube una foto del comprobante'; end if;
  if exists (select 1 from public.pagos where usuario = auth.uid() and estado = 'pendiente') then raise exception 'Ya tienes un pago en revisión'; end if;
  m := coalesce(public.cfg_int(case when p_plan = 'anual' then 'pro_precio_anual' else 'pro_precio_mensual' end), 0);
  insert into public.pagos (usuario, plan, monto, comprobante) values (auth.uid(), p_plan, m, p_comprobante);
  perform public.avisar_staff('Pago por revisar', 'Un usuario subió su comprobante de Pro.', '/admin/#pagos');
end $$;

create or replace function public.mi_pago_pendiente() returns jsonb
language sql stable security definer set search_path = '' as $$
  select (select to_jsonb(x) from (select id, plan, monto, estado, created_at from public.pagos
          where usuario = auth.uid() order by created_at desc limit 1) x)
$$;

-- ---------------------------------------------------------------------
-- I. Panel de administración
-- ---------------------------------------------------------------------
create or replace function public.admin_resumen() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_check();
  return jsonb_build_object(
    'usuarios', (select count(*) from public.perfiles where rol = 'usuario'),
    'activos7', (select count(*) from public.perfiles where rol = 'usuario' and visto_at > now() - interval '7 days'),
    'nuevos7', (select count(*) from public.perfiles where rol = 'usuario' and created_at > now() - interval '7 days'),
    'pro', (select count(*) from public.perfiles where rol = 'usuario' and premium_hasta > now() and exists
              (select 1 from public.pagos g where g.usuario = perfiles.id and g.estado = 'aprobado')),
    'prueba', (select count(*) from public.perfiles where rol = 'usuario' and premium_hasta > now() and not exists
              (select 1 from public.pagos g where g.usuario = perfiles.id and g.estado = 'aprobado')),
    'pagos_pendientes', (select count(*) from public.pagos where estado = 'pendiente'),
    'ingresos_mes', (select coalesce(sum(monto), 0) from public.pagos where estado = 'aprobado' and resuelto_at >= date_trunc('month', now())),
    'socios', (select count(*) from public.perfiles where rol = 'socio'));
end $$;

create or replace function public.admin_usuarios(p_buscar text default '') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare b text := '%' || lower(trim(coalesce(p_buscar, ''))) || '%';
begin
  perform public.admin_check();
  return (select coalesce(jsonb_agg(x order by x.created_at desc), '[]') from (
    select p.id, p.email, p.nombre, p.rol, p.premium_hasta, p.suspendido, p.visto_at, p.created_at,
           (select count(*) from public.items i where i.owner = p.id) as registros
    from public.perfiles p where lower(p.email) like b or lower(p.nombre) like b
    order by p.created_at desc limit 100) x);
end $$;

create or replace function public.admin_premium(p_id uuid, p_dias int, p_motivo text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare h timestamptz; nom text;
begin
  perform public.edit_check(p_motivo);
  update public.perfiles set premium_hasta = case when coalesce(p_dias, 0) <= 0 then now()
      else greatest(coalesce(premium_hasta, now()), now()) + make_interval(days => p_dias) end
  where id = p_id and rol = 'usuario' returning premium_hasta, email into h, nom;
  if not found then raise exception 'Usuario no encontrado'; end if;
  perform public.avisar(p_id, case when p_dias > 0 then 'Pro activado' else 'Tu Pro terminó' end,
    case when p_dias > 0 then 'Activo hasta el ' || to_char(h at time zone 'America/Santiago', 'DD/MM/YYYY') else 'Volviste a la versión gratis. Tus datos siguen intactos.' end, '/app/');
  perform public.auditar('premium', nom || ': ' || case when p_dias > 0 then '+' || p_dias || ' días' else 'quitado' end, p_motivo);
end $$;

create or replace function public.admin_suspender(p_id uuid, p_suspender boolean, p_motivo text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare nom text;
begin
  perform public.edit_check(p_motivo);
  update public.perfiles set suspendido = p_suspender where id = p_id and rol <> 'admin' returning email into nom;
  if not found then raise exception 'Usuario no encontrado'; end if;
  perform public.auditar(case when p_suspender then 'suspender' else 'reactivar' end, nom, p_motivo);
end $$;

create or replace function public.admin_pagos(p_estado text default 'pendiente') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_check();
  return (select coalesce(jsonb_agg(x order by x.created_at desc), '[]') from (
    select g.id, g.plan, g.monto, g.estado, g.created_at, g.resuelto_at, p.email, p.nombre
    from public.pagos g join public.perfiles p on p.id = g.usuario
    where p_estado = 'todos' or g.estado = p_estado order by g.created_at desc limit 100) x);
end $$;

create or replace function public.admin_pago_comprobante(p_id uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_check();
  return (select comprobante from public.pagos where id = p_id);
end $$;

create or replace function public.admin_pago_resolver(p_id uuid, p_aprobar boolean, p_motivo text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare g public.pagos; dias int;
begin
  perform public.edit_check(p_motivo);
  select * into g from public.pagos where id = p_id and estado = 'pendiente' for update;
  if g.id is null then raise exception 'Pago no encontrado o ya resuelto'; end if;
  update public.pagos set estado = case when p_aprobar then 'aprobado' else 'rechazado' end, resuelto_at = now(), comprobante = null where id = p_id;
  if p_aprobar then
    dias := case when g.plan = 'anual' then 365 else coalesce((select duracion_dias from public.planes where codigo = 'pro'), 30) end;
    update public.perfiles set premium_hasta = greatest(coalesce(premium_hasta, now()), now()) + make_interval(days => dias) where id = g.usuario;
    perform public.avisar(g.usuario, 'Pro activado', 'Gracias. Tu pago fue aprobado.', '/app/');
  else
    perform public.avisar(g.usuario, 'Pago rechazado', 'No pudimos validar tu comprobante. Súbelo de nuevo o escribe a soporte.', '/app/#mas');
  end if;
  perform public.auditar(case when p_aprobar then 'pago_aprobado' else 'pago_rechazado' end, p_id::text, p_motivo);
end $$;

create or replace function public.admin_plan_guardar(p_codigo text, p_nombre text, p_descripcion text, p_limites jsonb,
  p_beneficios jsonb, p_duracion int, p_motivo text default '') returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.edit_check(p_motivo);
  if jsonb_typeof(p_limites) <> 'object' or jsonb_typeof(p_beneficios) <> 'array' then raise exception 'Datos no válidos'; end if;
  update public.planes set nombre = left(trim(p_nombre), 40), descripcion = left(coalesce(p_descripcion, ''), 300),
    limites = p_limites, beneficios = p_beneficios, duracion_dias = greatest(1, least(coalesce(p_duracion, 30), 3650))
  where codigo = p_codigo;
  if not found then raise exception 'Plan no encontrado'; end if;
  perform public.auditar('plan', p_codigo || ' ' || p_limites::text, p_motivo);
end $$;

create or replace function public.admin_config_guardar(p_clave text, p_valor jsonb, p_motivo text default '') returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.edit_check(p_motivo);
  if p_clave not in ('dias_prueba', 'dias_aviso_vencimiento', 'dias_comprobantes', 'soporte_whatsapp', 'pro_link', 'pro_link_anual',
                     'pro_precio_mensual', 'pro_precio_anual', 'limite_db_mb', 'auditoria_max', 'version_liberada', 'version_min') then
    raise exception 'Ajuste no válido';
  end if;
  -- Links de pago (mensual y anual): vacíos o con https://
  if p_clave in ('pro_link', 'pro_link_anual') and coalesce(p_valor #>> '{}', '') <> '' and (p_valor #>> '{}') !~ '^https://[^ ]+$' then
    raise exception 'El link de pago debe empezar con https://';
  end if;
  -- Liberar versiones (o exigir una mínima) solo lo hace el súper administrador, con formato 3.3 o 3.3.1.
  if p_clave in ('version_liberada', 'version_min') then
    perform public.super_check();
    if jsonb_typeof(p_valor) not in ('string', 'number') or (p_valor #>> '{}') !~ '^\d{1,3}(\.\d{1,3}){1,2}$' then raise exception 'Versión inválida (usa 3.3 o 3.3.1)'; end if;
    p_valor := to_jsonb(p_valor #>> '{}');
  end if;
  insert into public.config (clave, valor) values (p_clave, p_valor) on conflict (clave) do update set valor = excluded.valor;
  perform public.auditar('ajuste', p_clave || ' = ' || p_valor::text, p_motivo);
end $$;

create or replace function public.admin_texto_guardar(p_clave text, p_valor text, p_motivo text default '') returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.edit_check(p_motivo);
  update public.textos set valor = left(coalesce(p_valor, ''), 2000) where clave = p_clave;
  if not found then raise exception 'Texto no encontrado'; end if;
  perform public.auditar('texto', p_clave, p_motivo);
end $$;

create or replace function public.admin_aviso(p_destino text, p_titulo text, p_cuerpo text, p_motivo text default '') returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform public.edit_check(p_motivo);
  if trim(coalesce(p_titulo, '')) = '' then raise exception 'Escribe el título'; end if;
  insert into public.notificaciones (para, titulo, cuerpo, url)
  select p.id, left(p_titulo, 90), left(coalesce(p_cuerpo, ''), 240), ''
  from public.perfiles p where not p.suspendido and p.rol = 'usuario'
    and (p_destino = 'todos' or (p_destino = 'pro' and p.premium_hasta > now()) or (p_destino = 'gratis' and (p.premium_hasta is null or p.premium_hasta <= now())));
  get diagnostics n = row_count;
  perform public.auditar('aviso', p_destino || ': ' || p_titulo, p_motivo);
  return n;
end $$;

create or replace function public.admin_push_claves(p_publica text, p_privada text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  if p_publica !~ '^[A-Za-z0-9_-]{80,100}$' or p_privada !~ '^[A-Za-z0-9_-]{40,50}$' then raise exception 'Claves no válidas'; end if;
  insert into public.secretos (clave, valor) values ('vapid_privada', p_privada) on conflict (clave) do update set valor = excluded.valor;
  insert into public.config (clave, valor) values ('vapid_publica', to_jsonb(p_publica)) on conflict (clave) do update set valor = excluded.valor;
  delete from public.push_subs where true;
  perform public.auditar('push', 'claves nuevas');
end $$;

-- Registro de cambios: se descarga (CSV) y luego el administrador lo vacía para no ocupar espacio.
create or replace function public.admin_auditoria(p_limite int default 5000) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_check();
  return (select coalesce(jsonb_agg(x order by x.id desc), '[]') from (
    select id, created_at, quien_email, rol, accion, detalle, motivo from public.auditoria
    order by id desc limit greatest(1, least(coalesce(p_limite, 5000), 20000))) x);
end $$;

create or replace function public.auditoria_vaciar(p_hasta_id bigint) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform public.super_check();
  delete from public.auditoria where id <= p_hasta_id;
  get diagnostics n = row_count;
  perform public.auditar('auditoria_vaciada', n || ' filas');
  return n;
end $$;

-- Espacio consumido en el servidor.
create or replace function public.admin_uso() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_check();
  return jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'limite_bytes', coalesce(public.cfg_int('limite_db_mb'), 500)::bigint * 1048576,
    'usuarios', (select count(*) from auth.users),
    'auditoria_filas', (select count(*) from public.auditoria),
    'auditoria_max', coalesce(public.cfg_int('auditoria_max'), 2000),
    'tablas', (select coalesce(jsonb_agg(jsonb_build_object('tabla', c.relname, 'bytes', pg_total_relation_size(c.oid),
                 'filas', greatest(c.reltuples, 0)::bigint) order by pg_total_relation_size(c.oid) desc), '[]')
               from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'));
end $$;

-- ---------------------------------------------------------------------
-- J. Piloto automático (cron cada 5 minutos)
--   · recordatorios · resumen de la mañana · inicio y fin del horario de trabajo
--   · cierre del día · vencimiento de Pro · limpieza diaria
-- ---------------------------------------------------------------------
create or replace function public.tareas_periodicas(p_ahora timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r record; e record; loc timestamp; hoy_l date; hm time; dow int; n1 int; n2 int; top text; hay boolean;
  recs int := 0; avisos int := 0; dias_av int := coalesce(public.cfg_int('dias_aviso_vencimiento'), 3);
begin
  -- 1. Recordatorios que ya tocan.
  for r in select id, owner, titulo, cuerpo, repite, aviso_at from public.items
           where tipo = 'recordatorio' and estado = 'abierto' and aviso_at <= now() order by aviso_at limit 500 for update skip locked
  loop
    perform public.avisar(r.owner, 'Recordatorio: ' || r.titulo, r.cuerpo, '/app/#hoy');
    recs := recs + 1;
    if r.repite = '' then
      update public.items set estado = 'hecho' where id = r.id;
    elsif r.repite = 'mensual' then
      update public.items set aviso_at = r.aviso_at + interval '1 month' * greatest(1, ceil(extract(epoch from now() - r.aviso_at) / 2592000.0)::int) where id = r.id;
    else
      update public.items set aviso_at = r.aviso_at + (case when r.repite = 'semanal' then 7 else 1 end)
        * greatest(1, ceil(extract(epoch from now() - r.aviso_at) / (86400.0 * case when r.repite = 'semanal' then 7 else 1 end))::int) * interval '1 day' where id = r.id;
    end if;
  end loop;

  -- 2. Avisos según la hora local de cada persona (solo quienes usaron la app el último mes).
  for r in select p.id, p.prefs, coalesce(p.prefs ->> 'tz', 'America/Santiago') as tz from public.perfiles p
           where not p.suspendido and p.visto_at > now() - interval '30 days'
  loop
    loc := p_ahora at time zone r.tz; hoy_l := loc::date; hm := loc::time; dow := extract(isodow from loc)::int;

    if hm >= '08:00' and hm < '08:15' and coalesce(r.prefs ->> 'resumen_manana', 'true') <> 'false' then
      if public.marcar_aviso(r.id, hoy_l, 'manana') then
        select count(*) into n1 from public.items where owner = r.id and tipo = 'tarea' and estado <> 'hecho' and fecha <= hoy_l;
        select count(*) into n2 from public.items where owner = r.id and tipo = 'recordatorio' and estado = 'abierto' and aviso_at::date = hoy_l;
        select titulo into top from public.items where owner = r.id and tipo = 'tarea' and estado <> 'hecho' and fecha <= hoy_l
          order by prioridad desc, created_at limit 1;
        perform public.avisar(r.id, 'Buenos días',
          case when n1 + n2 = 0 then 'Sin pendientes para hoy. Elige tu Top 3 y empieza con calma.'
               else 'Hoy: ' || n1 || ' tareas y ' || n2 || ' recordatorios. Empieza por: ' || coalesce(top, 'lo más importante') end, '/app/#hoy');
        avisos := avisos + 1;
      end if;
    end if;

    if coalesce(r.prefs ->> 'avisos_horario', 'true') <> 'false' then
      for e in select id, nombre, horario from public.espacios
               where owner = r.id and modo = 'trabajo' and not archivado and horario ? 'dias' and (horario -> 'dias') @> to_jsonb(dow)
                 and (horario ->> 'desde') ~ '^\d\d:\d\d$' and (horario ->> 'hasta') ~ '^\d\d:\d\d$'
      loop
        if hm >= (e.horario ->> 'desde')::time and hm < (e.horario ->> 'desde')::time + interval '15 minutes' then
          if public.marcar_aviso(r.id, hoy_l, 'ini' || e.id) then
            perform public.avisar(r.id, 'Empieza tu horario: ' || e.nombre, 'Revisa tu Top 3 y elige una sola cosa para partir.', '/app/#hoy'); avisos := avisos + 1;
          end if;
        elsif hm >= (e.horario ->> 'hasta')::time and hm < (e.horario ->> 'hasta')::time + interval '15 minutes' then
          if public.marcar_aviso(r.id, hoy_l, 'fin' || e.id) then
            perform public.avisar(r.id, 'Terminó tu horario: ' || e.nombre, 'Anota dónde quedaste, cierra y desconecta. Lo que falta, mañana.', '/app/#hoy'); avisos := avisos + 1;
          end if;
        end if;
      end loop;
    end if;

    if hm >= '21:00' and hm < '21:15' and coalesce(r.prefs ->> 'cierre_noche', 'true') <> 'false' then
      select exists (select 1 from public.items where owner = r.id and tipo = 'diario' and fecha = hoy_l) into hay;
      if not hay and public.marcar_aviso(r.id, hoy_l, 'noche') then
        perform public.avisar(r.id, 'Cierra el día', 'Dos minutos: anota un logro y cómo te sentiste. Mañana empiezas liviano.', '/app/#diario'); avisos := avisos + 1;
      end if;
    end if;
  end loop;

  -- 3. Vencimiento del Pro.
  for r in select id, premium_hasta from public.perfiles where rol = 'usuario' and premium_hasta > now()
           and premium_hasta < now() + make_interval(days => dias_av) and aviso_venc_para is distinct from premium_hasta
  loop
    perform public.avisar(r.id, 'Tu Pro está por vencer', 'Vence el ' || to_char(r.premium_hasta at time zone 'America/Santiago', 'DD/MM/YYYY') || '. Tus datos no se pierden.', '/app/#mas');
    update public.perfiles set aviso_venc_para = r.premium_hasta where id = r.id;
  end loop;
  for r in select id, premium_hasta from public.perfiles where rol = 'usuario' and premium_hasta < now()
           and premium_hasta > now() - interval '2 days' and aviso_vencido_para is distinct from premium_hasta
  loop
    perform public.avisar(r.id, 'Tu Pro terminó', 'Volviste a la versión gratis. Todo lo tuyo sigue ahí.', '/app/#mas');
    update public.perfiles set aviso_vencido_para = r.premium_hasta where id = r.id;
  end loop;

  -- 4. Limpieza diaria (06:00 UTC).
  if extract(hour from p_ahora at time zone 'utc') = 6 and extract(minute from p_ahora at time zone 'utc') < 5 then
    delete from public.notificaciones where created_at < now() - interval '30 days';
    update public.pagos set comprobante = null where comprobante is not null and created_at < now() - make_interval(days => coalesce(public.cfg_int('dias_comprobantes'), 30));
    delete from public.uso_dia where dia < current_date - 400;
    if (select count(*) from public.auditoria) > coalesce(public.cfg_int('auditoria_max'), 2000) then
      perform public.avisar_staff('Registro de cambios lleno', 'Descárgalo y vacíalo desde Administración → Servidor para liberar espacio.', '/admin/#servidor');
    end if;
  end if;
  return jsonb_build_object('recordatorios', recs, 'avisos', avisos);
end $$;

-- ---------------------------------------------------------------------
-- K. Permisos de las funciones
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as f, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prokind = 'f' and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute 'revoke execute on function ' || r.f || ' from public, anon, authenticated';
    if r.proname in ('preparar_cuenta', 'cancelar_invitacion', 'preparar_borrado', 'push_pendientes', 'push_borrar_endpoint',
                     'tareas_periodicas', 'marcar_aviso', 'avisar', 'avisar_staff', 'items_antes', 'espacios_antes', 'handle_new_user') then
      if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'grant execute on function ' || r.f || ' to service_role'; end if;
    else
      execute 'grant execute on function ' || r.f || ' to authenticated';
      if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'grant execute on function ' || r.f || ' to service_role'; end if;
    end if;
  end loop;
end $$;
grant execute on function public.config_publica() to anon;

-- Al correr este SQL la versión queda liberada al tiro: todos ven "Actualizar" (al publicar una versión nueva, sube este número).
insert into public.config (clave, valor) values ('version_liberada', '"3.5"') on conflict (clave) do update set valor = excluded.valor
  where case when public.config.valor #>> '{}' ~ '^\d+(\.\d+)*$'
    then string_to_array(public.config.valor #>> '{}', '.')::int[] < string_to_array('3.5', '.')::int[] else true end;

select 'Centro de Mando instalado v' || public.db_version() as resultado;
