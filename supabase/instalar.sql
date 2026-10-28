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
  public.reservas, public.links_pago, public.bloqueos, public.promos, public.servicios,
  public.negocios, public.rubros cascade;
-- v3.9: "pagos" solo se borra si es la del sistema anterior (sin la columna "usuario"); los pagos del Pro se conservan.
do $$
begin
  if to_regclass('public.pagos') is not null and not exists (select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'pagos' and column_name = 'usuario') then
    drop table public.pagos cascade;
  end if;
end $$;

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
language sql immutable as $$ select '4.6'::text $$;
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
  'limite_db_mb', 'auditoria_max', 'version_liberada', 'version_min');
insert into public.config (clave, valor) values
  ('dias_prueba', '7'), ('dias_aviso_vencimiento', '3'), ('dias_comprobantes', '30'), ('soporte_whatsapp', '""'),
  ('vapid_publica', '""'),
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
alter table public.perfiles add column if not exists aviso_limpieza_at timestamptz;

alter table public.invitaciones drop column if exists negocio_id cascade;
alter table public.invitaciones drop column if exists negocio_nombre;
alter table public.invitaciones drop column if exists rubro_id;
delete from public.invitaciones where rol not in ('socio', 'usuario');
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
                                           'solucion', 'nota', 'diario', 'logro', 'leccion', 'recordatorio', 'falta', 'pedido')),
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
-- v3.6: "falta" = lo que hay que comprar o traer (Listas). titulo = qué; datos = { lista, cant, para }.
-- v3.7: "pedido" = titulo (para quién), fecha (entrega), estado abierto → listo → hecho (entregado),
--        datos = { tel, hora, abono, total, nota, items: [{ que, color, cant, nota, foto }] }. Las fotos quedan solo en el teléfono.
do $$
declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.items'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%tipo%recordatorio%'
  loop execute 'alter table public.items drop constraint ' || quote_ident(c); end loop;
  alter table public.items add constraint items_tipo_check check (tipo in ('tarea', 'proyecto', 'meta', 'resultado', 'habito', 'check', 'idea', 'problema',
    'solucion', 'nota', 'diario', 'logro', 'leccion', 'recordatorio', 'falta', 'pedido'));
end $$;
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
    where k in ('tz', 'limite_descanso_min', 'limite_app_min', 'pausa_cada', 'resumen_manana', 'cierre_noche', 'avisos_horario', 'color', 'tema', 'avatar', 'guia', 'wip', 'cabeza', 'cabeza_h1', 'cabeza_h2', 'insistir', 'plan_semana');
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
-- (v3.9) El pago del Pro ahora es el del núcleo: cfx_pago_estado / cfx_pago_pedir (más abajo). La tabla pagos queda como historial.

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
    'pro', (select count(*) from public.perfiles where rol = 'usuario' and premium_hasta > now() and (exists
              (select 1 from public.pagos g where g.usuario = perfiles.id and g.estado = 'aprobado') or exists (select 1 from public.cfx_pagos g where g.cuenta = perfiles.id and g.estado = 'aprobado'))),
    'prueba', (select count(*) from public.perfiles where rol = 'usuario' and premium_hasta > now() and not exists
              (select 1 from public.pagos g where g.usuario = perfiles.id and g.estado = 'aprobado') and not exists (select 1 from public.cfx_pagos g where g.cuenta = perfiles.id and g.estado = 'aprobado')),
    'pagos_pendientes', (select count(*) from public.cfx_pagos where estado = 'pendiente'),
    'ingresos_mes', (select coalesce(sum(monto), 0) from public.pagos where estado = 'aprobado' and resuelto_at >= date_trunc('month', now()))
                  + (select coalesce(sum(monto), 0) from public.cfx_pagos where estado = 'aprobado' and resuelto >= date_trunc('month', now())),
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
  if p_clave not in ('dias_prueba', 'dias_aviso_vencimiento', 'dias_comprobantes', 'soporte_whatsapp',
                     'limite_db_mb', 'auditoria_max', 'version_liberada', 'version_min') then
    raise exception 'Ajuste no válido';
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

-- v3.9: Respaldo y limpieza (funciones comunes cfx_*: las usa Apps → Respaldo y limpieza, igual en las 6 apps).
create or replace function public.cfx_respaldo() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_check();
  return jsonb_build_object(
    'Cuentas', (select coalesce(jsonb_agg(x order by x.creada), '[]') from (select p.email as correo, p.nombre, p.telefono, p.rol,
      p.premium_hasta as pro_hasta, p.suspendido, p.visto_at as visto, p.created_at as creada,
      (select count(*) from public.items i where i.owner = p.id) as registros from public.perfiles p) x),
    'Pagos', (select coalesce(jsonb_agg(x order by x.fecha), '[]') from (select g.created_at as fecha, p.email as correo, g.plan, g.monto, g.estado,
      g.resuelto_at as resuelto, (g.comprobante is not null) as con_comprobante from public.pagos g join public.perfiles p on p.id = g.usuario) x),
    'Registro', (select coalesce(jsonb_agg(x order by x.id), '[]') from (select id, created_at as fecha, quien_email as quien, rol, accion, detalle, motivo from public.auditoria) x),
    'Ajustes', (select coalesce(jsonb_agg(jsonb_build_object('clave', clave, 'valor', valor #>> '{}') order by clave), '[]') from public.config),
    'Textos', (select coalesce(jsonb_agg(jsonb_build_object('clave', clave, 'texto', valor) order by clave), '[]') from public.textos),
    'Planes', (select coalesce(jsonb_agg(jsonb_build_object('codigo', codigo, 'nombre', nombre, 'limites', limites, 'dias', duracion_dias)), '[]') from public.planes));
end $$;

create or replace function public.cfx_limpieza() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_check();
  return jsonb_build_array(
    jsonb_build_object('clave', 'comprobantes', 'titulo', 'Comprobantes revisados', 'detalle', 'Fotos de pagos ya aprobados o rechazados.',
      'filas', (select count(*) from public.pagos where comprobante is not null and estado <> 'pendiente')),
    jsonb_build_object('clave', 'pagos', 'titulo', 'Pagos resueltos antiguos', 'detalle', 'Más de 1 año (descarga el respaldo antes).',
      'filas', (select count(*) from public.pagos where estado <> 'pendiente' and coalesce(resuelto_at, created_at) < now() - interval '365 days')),
    jsonb_build_object('clave', 'avisos', 'titulo', 'Avisos', 'detalle', 'Más de 30 días (se borran solos cada día).',
      'filas', (select count(*) from public.notificaciones where created_at < now() - interval '30 days')),
    jsonb_build_object('clave', 'registro', 'titulo', 'Registro de cambios', 'detalle', 'Más de 1 año.',
      'filas', (select count(*) from public.auditoria where created_at < now() - interval '365 days')));
end $$;

create or replace function public.cfx_limpiar(p_clave text) returns int
language plpgsql security definer set search_path = '' as $$
declare n int := 0;
begin
  perform public.super_check();
  if p_clave = 'comprobantes' then
    update public.pagos set comprobante = null where comprobante is not null and estado <> 'pendiente';
  elsif p_clave = 'pagos' then
    delete from public.pagos where estado <> 'pendiente' and coalesce(resuelto_at, created_at) < now() - interval '365 days';
  elsif p_clave = 'avisos' then
    delete from public.notificaciones where created_at < now() - interval '30 days';
  elsif p_clave = 'registro' then
    delete from public.auditoria where created_at < now() - interval '365 days';
  else raise exception 'Opción no válida';
  end if;
  get diagnostics n = row_count;
  perform public.auditar('limpieza', p_clave || ': ' || n || ' filas');
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
    perform public.avisar(r.owner, 'Recordatorio: ' || r.titulo, r.cuerpo, '/app/#hoy?item=' || r.id);
    recs := recs + 1;
    if r.repite = '' then
      update public.items set estado = 'avisado' where id = r.id;
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

    -- v3.6/3.7: lo de mañana (tareas, recordatorios y pedidos por entregar) se avisa hoy a las 08:00.
    if hm >= '08:00' and hm < '08:15' then
      select count(*), string_agg(t, ', ') into n1, top from (
        select case when tipo = 'pedido' then 'entregar pedido de ' || titulo else titulo end as t from public.items
        where owner = r.id and estado not in ('hecho', 'resuelto')
          and ((tipo in ('tarea', 'pedido') and fecha = hoy_l + 1) or (tipo = 'recordatorio' and (aviso_at at time zone r.tz)::date = hoy_l + 1))
        order by coalesce(datos ->> 'hora', to_char(aviso_at at time zone r.tz, 'HH24:MI'), '99'), created_at limit 4) x;
      if n1 > 0 and public.marcar_aviso(r.id, hoy_l, 'manana_sig') then
        select count(*) into n2 from public.items where owner = r.id and estado not in ('hecho', 'resuelto')
          and ((tipo in ('tarea', 'pedido') and fecha = hoy_l + 1) or (tipo = 'recordatorio' and (aviso_at at time zone r.tz)::date = hoy_l + 1));
        perform public.avisar(r.id, 'Mañana tienes ' || n2 || case when n2 = 1 then ' cosa' else ' cosas' end, top || case when n2 > 4 then '…' else '' end, '/app/#hoy');
        avisos := avisos + 1;
      end if;
    end if;
    -- Lo de hoy con hora: 1 hora antes y, si no lo tachas, insiste a los 15 minutos y a la hora (con botones Listo / 1 hora más).
    for e in select id, tipo, titulo, coalesce(datos ->> 'hora', to_char(aviso_at at time zone r.tz, 'HH24:MI')) as h from public.items
             where owner = r.id and estado not in ('hecho', 'resuelto')
               and ((tipo in ('tarea', 'pedido') and fecha = hoy_l and datos ->> 'hora' ~ '^\d\d:\d\d$')
                 or (tipo = 'recordatorio' and (aviso_at at time zone r.tz)::date = hoy_l))
    loop
      if hm < e.h::time and hm >= greatest('00:00'::time, e.h::time - interval '1 hour') and e.h::time - hm <= interval '1 hour' then
        if public.marcar_aviso(r.id, hoy_l, 'h1' || e.id || e.h) then
          perform public.avisar(r.id, case when e.tipo = 'pedido' then 'En 1 hora: entregar pedido de ' else 'En 1 hora: ' end || e.titulo, 'A las ' || e.h || '.', '/app/#hoy?item=' || e.id); avisos := avisos + 1;
        end if;
      elsif coalesce(r.prefs ->> 'insistir', 'true') <> 'false' and hm >= e.h::time + interval '15 minutes' and hm < e.h::time + interval '1 hour' and e.h::time < '23:00' then
        if public.marcar_aviso(r.id, hoy_l, 'i1' || e.id || e.h) then
          perform public.avisar(r.id, '¿Lo hiciste? ' || e.titulo, 'Era a las ' || e.h || '. Tócalo como listo o dale 1 hora más.', '/app/#hoy?item=' || e.id); avisos := avisos + 1;
        end if;
      elsif coalesce(r.prefs ->> 'insistir', 'true') <> 'false' and hm >= e.h::time + interval '1 hour' and e.h::time < '22:45' then
        if public.marcar_aviso(r.id, hoy_l, 'i2' || e.id || e.h) then
          perform public.avisar(r.id, 'Sigue pendiente: ' || e.titulo, 'Era a las ' || e.h || '. Si ya está, márcalo como listo.', '/app/#hoy?item=' || e.id); avisos := avisos + 1;
        end if;
      end if;
    end loop;
    -- "Vacía tu cabeza": 2 veces al día te pregunta si hay algo que anotar (abre directo el botón +).
    if coalesce(r.prefs ->> 'cabeza', 'true') <> 'false' then
      for top in select unnest(array[coalesce(nullif(r.prefs ->> 'cabeza_h1', ''), '13:00'), coalesce(nullif(r.prefs ->> 'cabeza_h2', ''), '20:30')]) loop
        if top ~ '^\d\d:\d\d$' and hm >= top::time and hm < top::time + interval '15 minutes' and public.marcar_aviso(r.id, hoy_l, 'cab' || top) then
          perform public.avisar(r.id, '¿Algo que anotar?', 'Un pedido, una idea, algo que te pidieron… Anótalo ahora y te lo recuerdo yo.', '/app/#nuevo'); avisos := avisos + 1;
        end if;
      end loop;
    end if;
    -- Plan de la semana: domingo 20:00.
    if dow = 7 and hm >= '20:00' and hm < '20:15' and coalesce(r.prefs ->> 'plan_semana', 'true') <> 'false' and public.marcar_aviso(r.id, hoy_l, 'semana') then
      select count(*) filter (where tipo = 'pedido'), count(*) filter (where tipo <> 'pedido') into n1, n2 from public.items
        where owner = r.id and estado not in ('hecho', 'resuelto') and tipo in ('tarea', 'pedido') and fecha between hoy_l + 1 and hoy_l + 7;
      if n1 + n2 > 0 then
        perform public.avisar(r.id, 'Tu semana', n1 || ' pedidos por entregar y ' || n2 || ' tareas. Revisa Hoy → Próximos días y parte liviano el lunes.', '/app/#hoy'); avisos := avisos + 1;
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
    -- v3.9: aviso antes del borrado automático (máximo uno por semana; cuenta lo que se borra en los próximos 9 días,
    -- así todo lo que se borra se avisó con al menos 2 días de anticipación).
    for r in select n.para, count(*) as n from public.notificaciones n join public.perfiles p on p.id = n.para
             where n.created_at < now() - interval '21 days' and (p.aviso_limpieza_at is null or p.aviso_limpieza_at < now() - interval '7 days')
             group by n.para having min(n.created_at) < now() - interval '28 days'
    loop
      perform public.avisar(r.para, 'Limpieza automática', case when r.n = 1 then '1 aviso antiguo se borra solo' else r.n || ' avisos antiguos se borran solos' end || ' en los próximos días (se guardan 30 días). No tienes que hacer nada.', '');
      update public.perfiles set aviso_limpieza_at = now() where id = r.para;
    end loop;
    update public.pagos set comprobante = null where comprobante is not null and created_at < now() - make_interval(days => coalesce(public.cfg_int('dias_comprobantes'), 30));
    delete from public.uso_dia where dia < current_date - 400;
    if (select count(*) from public.auditoria) > coalesce(public.cfg_int('auditoria_max'), 2000) then
      perform public.avisar_staff('Registro de cambios lleno', 'Descárgalo y vacíalo desde Administración → Servidor para liberar espacio.', '/admin/#servidor');
    end if;
  end if;
  return jsonb_build_object('recordatorios', recs, 'avisos', avisos);
end $$;

-- v3.7: botones de la notificación ("Listo" / "1 hora más"). La notificación es la llave: solo quien la recibió
-- conoce su id, y solo sirve para el registro de esa misma persona y durante 3 días.
create or replace function public.notif_accion(p_notif uuid, p_accion text) returns text
language plpgsql security definer set search_path = '' as $$
declare n record; it record; tz text; loc timestamp;
begin
  select * into n from public.notificaciones where id = p_notif and created_at > now() - interval '3 days';
  if n.id is null or n.url !~ 'item=[0-9a-f-]{36}' then return 'no'; end if;
  select * into it from public.items where id = substring(n.url from 'item=([0-9a-f-]{36})')::uuid and owner = n.para;
  if it.id is null then return 'no'; end if;
  update public.notificaciones set leida = true where id = n.id;
  if p_accion = 'hecho' then
    update public.items set estado = 'hecho' where id = it.id;
    return 'hecho';
  elsif p_accion = 'mas1h' then
    select coalesce(prefs ->> 'tz', 'America/Santiago') into tz from public.perfiles where id = n.para;
    loc := (now() + interval '1 hour') at time zone tz;
    if it.tipo = 'recordatorio' then
      update public.items set aviso_at = now() + interval '1 hour', estado = 'abierto' where id = it.id;
    else
      update public.items set fecha = loc::date, datos = datos || jsonb_build_object('hora', to_char(loc, 'HH24:MI')) where id = it.id;
    end if;
    return 'mas1h';
  end if;
  return 'no';
end $$;

-- ---------------------------------------------------------------------
-- J2. Actualización automática (v3.6): cada 10 minutos la base revisa GitHub (rama main).
--   · Si hay una base nueva (version.json → "bd"), descarga y ejecuta este mismo instalar.sql (no borra datos).
--   · La app la liberas tú desde el panel cuando la pruebes (no se libera sola).
--   Si algo falla, no cambia nada y lo vuelve a intentar en la siguiente vuelta.
-- ---------------------------------------------------------------------
create or replace function public.auto_actualizar() returns text
language plpgsql security definer set search_path = '' as $$
declare
  base constant text := 'https://raw.githubusercontent.com/CodeFixService/SaaS/main/';
  marca text := '?t=' || extract(epoch from now())::bigint; j jsonb; v_bd text; v_app text; codigo text; lib text;
  re constant text := '^[0-9]+(\.[0-9]+)*$';
begin
  execute 'select content from extensions.http_get($1)' into codigo using base || 'version.json' || marca;
  j := codigo::jsonb; v_bd := j ->> 'bd'; v_app := j ->> 'version';
  if v_bd ~ re and string_to_array(v_bd, '.')::int[] > string_to_array(public.db_version(), '.')::int[] then
    execute 'select content from extensions.http_get($1)' into codigo using base || 'supabase/instalar.sql' || marca;
    if codigo is null or position('function public.db_version()' in codigo) = 0 then return 'instalar.sql no disponible'; end if;
    execute codigo;
    perform public.auditar('version', 'Base actualizada sola a la v' || public.db_version());
    return 'base actualizada a ' || public.db_version();
  end if;
  -- La app NO se libera sola: la liberas tú desde el panel (Actualizar la app → Liberar) después de probarla.
  return 'al día';
exception when others then
  return 'sin cambios: ' || sqlerrm;
end $$;
do $$
begin
  create extension if not exists http with schema extensions;
  perform cron.unschedule(jobid) from cron.job where jobname = 'cm-auto';
  perform cron.schedule('cm-auto', '*/10 * * * *', 'select public.auto_actualizar()');
exception when others then
  raise notice 'Actualización automática no activada (%). Corre supabase/cron.sql y vuelve a correr este archivo.', sqlerrm;
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
    if r.proname in ('preparar_cuenta', 'cancelar_invitacion', 'preparar_borrado', 'push_pendientes', 'push_borrar_endpoint', 'auto_actualizar',
                     'tareas_periodicas', 'marcar_aviso', 'avisar', 'avisar_staff', 'items_antes', 'espacios_antes', 'handle_new_user') then
      if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'grant execute on function ' || r.f || ' to service_role'; end if;
    else
      execute 'grant execute on function ' || r.f || ' to authenticated';
      if exists (select 1 from pg_roles where rolname = 'service_role') then execute 'grant execute on function ' || r.f || ' to service_role'; end if;
    end if;
  end loop;
end $$;
grant execute on function public.config_publica() to anon;
grant execute on function public.notif_accion(uuid, text) to anon;

-- ---------------------------------------------------------------------
-- L. Ganchos de esta app para el núcleo (pagos): quién soy, cómo se da el Premium y cómo se avisa.
--    En el Centro de Mando la "cuenta principal" (negocio) es cada usuario.
-- ---------------------------------------------------------------------
create or replace function public.cfx_yo() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'email', p.email, 'nombre', p.nombre, 'premium_hasta', p.premium_hasta, 'creado', p.created_at,
    'rol', case when p.rol = 'usuario' then 'negocio' else 'admin' end) from public.perfiles p where p.id = auth.uid()
$$;
create or replace function public.cfx_dar_premium(p_cuenta uuid, p_rol text, p_dias int) returns timestamptz
language sql security definer set search_path = '' as $$
  update public.perfiles set premium_hasta = greatest(coalesce(premium_hasta, now()), now()) + make_interval(days => p_dias)
  where id = p_cuenta returning premium_hasta
$$;
create or replace function public.cfx_avisar(p_cuenta uuid, p_titulo text, p_cuerpo text) returns void
language sql security definer set search_path = '' as $$ select public.avisar(p_cuenta, p_titulo, p_cuerpo, '/app/#mas') $$;
create or replace function public.cfx_avisar_admin(p_titulo text, p_cuerpo text) returns void
language sql security definer set search_path = '' as $$ select public.avisar_staff(p_titulo, p_cuerpo, '/admin/#apps') $$;

-- Ganchos de administración para el núcleo (planes, textos, a quién avisar y verificación).
create or replace function public.cfx_planes_app() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('grupo', m.g, 'clave', k, 'free', f.limites -> k, 'premium', p.limites -> k) order by m.g, k), '[]')
  from (values ('negocio', 'free', 'pro')) m(g, fc, pc) join public.planes f on f.codigo = m.fc join public.planes p on p.codigo = m.pc,
  lateral (select jsonb_object_keys(f.limites || p.limites) as k) x
$$;
create or replace function public.cfx_plan_guardar_app(p_grupo text, p_clave text, p_free jsonb, p_premium jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare fc text; pc text;
begin
  select m.fc, m.pc into fc, pc from (values ('negocio', 'free', 'pro')) m(g, fc, pc) where m.g = p_grupo;
  if fc is null or p_clave !~ '^[a-z_]{2,40}$' then raise exception 'Plan no válido'; end if;
  update public.planes set limites = limites || jsonb_build_object(p_clave, p_free) where codigo = fc;
  update public.planes set limites = limites || jsonb_build_object(p_clave, p_premium) where codigo = pc;
end $$;
create or replace function public.cfx_textos_app() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('clave', clave, 'valor', valor) order by clave), '[]') from public.textos
$$;
create or replace function public.cfx_texto_guardar_app(p_clave text, p_valor text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.textos set valor = p_valor where clave = p_clave;
  if not found then raise exception 'Texto no encontrado'; end if;
end $$;
create or replace function public.cfx_destinatarios(p_destino text) returns setof uuid
language sql stable security definer set search_path = '' as $$
  -- 'todos' = todas las cuentas (usuarios y socios); el resto, solo usuarios.
  select id from public.perfiles where not suspendido and (rol = 'usuario' or (rol = 'socio' and p_destino = 'todos'))
    and (p_destino in ('todos', 'negocios') or (p_destino = 'premium' and premium_hasta > now()) or (p_destino = 'gratis' and (premium_hasta is null or premium_hasta <= now())))
$$;
create or replace function public.cfx_marcar_verificado(p_cuenta uuid, p_si boolean) returns void
language sql security definer set search_path = '' as $$ select null::void $$;

-- Guía para partir (núcleo · ayuda): el Centro de Mando no tiene negocios que configurar.
create or replace function public.cfx_guia_app() returns jsonb language sql stable security definer set search_path = '' as $$ select '[]'::jsonb $$;

-- La versión de la base es pública (la lee la pantalla de entrada para saber si hay que actualizar).
grant execute on function public.db_version() to anon, authenticated;

-- Puente de avisos (núcleo · ayuda): las otras 5 apps avisan aquí al tiro cuando llega un pago por revisar o un mensaje
-- de soporte. Cada app tiene su propia clave (la crea el Centro de Mando al vincularla); el aviso llega como notificación.
create table if not exists public.cm_puentes (
  app      text primary key check (app ~ '^[a-z]{2,20}$'),
  secreto  text not null,
  avisos   int not null default 0,
  ventana  timestamptz not null default now(),
  ultimo   timestamptz
);
alter table public.cm_puentes enable row level security;
revoke all on public.cm_puentes from anon, authenticated;

create or replace function public.cm_puente_secreto(p_app text) returns text
language plpgsql security definer set search_path = '' as $$
declare s text;
begin
  perform public.super_check();
  if coalesce(p_app, '') !~ '^[a-z]{2,20}$' then raise exception 'App no válida'; end if;
  select secreto into s from public.cm_puentes where app = p_app;
  if s is null then
    s := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    insert into public.cm_puentes (app, secreto) values (p_app, s);
  end if;
  return s;
end $$;

create or replace function public.cfx_aviso_externo(p_app text, p_secreto text, p_titulo text, p_cuerpo text, p_tipo text default 'aviso') returns boolean
language plpgsql security definer set search_path = '' as $$
declare b public.cm_puentes;
begin
  select * into b from public.cm_puentes where app = p_app for update;
  if b.app is null or b.secreto <> coalesce(p_secreto, '') then return false; end if;
  if b.ventana < now() - interval '1 hour' then b.avisos := 0; b.ventana := now(); end if;
  if b.avisos >= 120 then return false; end if;  -- tope: 120 avisos por hora por app
  update public.cm_puentes set avisos = b.avisos + 1, ventana = b.ventana, ultimo = now() where app = p_app;
  perform public.avisar_staff(
    (case p_app when 'billetera' then 'Billetera' when 'aplicaciones' then 'Órbita' when 'barberia' then 'Barbería' when 'bicitaller' then 'BiciTaller'
       when 'estaciona' then 'Estaciona' when 'contenido' then 'Cerebro' else p_app end) || ' · ' || left(coalesce(p_titulo, ''), 70),
    left(coalesce(p_cuerpo, ''), 240),
    case p_tipo when 'chat' then '/admin/#mensajes' when 'pago' then '/admin/#pagos' else '/admin/#apps' end);
  return true;
end $$;
revoke all on function public.cm_puente_secreto(text), public.cfx_aviso_externo(text, text, text, text, text) from public;
grant execute on function public.cm_puente_secreto(text) to authenticated;
grant execute on function public.cfx_aviso_externo(text, text, text, text, text) to anon, authenticated;

-- >>> CFX núcleo (no editar aquí: se copia de saas/nucleo/sql con sincronizar.py)
-- ---------------------------------------------------------------------
-- CodeFix · Pagos (igual en las 6 apps; lo reparte nucleo/sincronizar.py). Se administra desde el Centro de Mando → Pagos.
--   Precios iguales en las 6: negocio (inicio, mensual, anual) y cliente (mensual, anual). Link de pago SIN monto (la persona
--   escribe el monto; se le suma el cargo por pago online, visible como una línea aparte), tarjeta (otro link, con su propio cargo)
--   o transferencia (precio exacto, sin cargo), y foto del comprobante. Tú apruebas y se activa el Premium por días enteros.
--   Liberar: por N días nadie queda bloqueado y las cuentas creadas en ese tiempo no pagan el primer pago (quedan en gratis).
--   El comprobante se borra al aprobar o rechazar (ya no sirve). Negocios nuevos: bloqueados hasta su primer pago (si está activado).
--   Cada app define antes: cfx_yo(), cfx_dar_premium(uuid, text, int), cfx_avisar(uuid, text, text) y cfx_avisar_admin(text, text).
-- ---------------------------------------------------------------------
create table if not exists public.cfx_config (clave text primary key, valor jsonb not null);
alter table public.cfx_config enable row level security;
insert into public.cfx_config (clave, valor) values ('pagos', jsonb_build_object(
  'negocio', jsonb_build_object('inicio', 4900, 'inicio_dias', 30, 'mensual', 4900, 'anual', 49900, 'exigir_inicio', true),
  'cliente', jsonb_build_object('mensual', 3000, 'anual', 29900),
  'link', '', 'comision_pct', 0, 'whatsapp', '', 'tarjeta', jsonb_build_object('link', '', 'comision_pct', 0),
  'transferencia', jsonb_build_object('banco', '', 'tipo', '', 'numero', '', 'rut', '', 'titular', '', 'correo', ''),
  'inicio_desde', now()))
on conflict (clave) do nothing;

create table if not exists public.cfx_pagos (
  id          uuid primary key default gen_random_uuid(),
  cuenta      uuid not null,
  email       text not null default '',
  nombre      text not null default '',
  rol         text not null check (rol in ('negocio', 'cliente', 'otro')),
  periodo     text not null check (periodo in ('inicio', 'mensual', 'anual', 'otro')),
  monto       int not null check (monto between 1 and 100000000),
  medio       text not null check (medio in ('link', 'transferencia')),
  nota        text not null default '' check (length(nota) <= 300),
  comprobante text check (comprobante is null or (comprobante ~ '^data:image/(jpeg|png|webp);base64,' and length(comprobante) <= 400000)),
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  dias        int,
  motivo      text not null default '',
  creado      timestamptz not null default now(),
  resuelto    timestamptz
);
alter table public.cfx_pagos add column if not exists cupon text;
alter table public.cfx_pagos add column if not exists meses int check (meses is null or meses between 1 and 24);
alter table public.cfx_pagos drop constraint if exists cfx_pagos_medio_check;
alter table public.cfx_pagos add constraint cfx_pagos_medio_check check (medio in ('link', 'transferencia', 'tarjeta'));
alter table public.cfx_pagos drop constraint if exists cfx_pagos_periodo_check;
alter table public.cfx_pagos add constraint cfx_pagos_periodo_check check (periodo in ('inicio', 'mensual', 'meses', 'anual', 'otro'));
create index if not exists cfx_pagos_cuenta_idx on public.cfx_pagos (cuenta, creado desc);
create index if not exists cfx_pagos_estado_idx on public.cfx_pagos (estado, creado);
alter table public.cfx_pagos enable row level security;
create table if not exists public.cfx_exentos (cuenta uuid primary key, nota text not null default '', creado timestamptz not null default now());
alter table public.cfx_exentos enable row level security;
revoke all on public.cfx_config, public.cfx_pagos, public.cfx_exentos from anon, authenticated;

-- ¿Cómo estoy? Precios, mi rol, si debo el primer pago y mi último pago.
create or replace function public.cfx_pago_estado() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c jsonb := (select valor from public.cfx_config where clave = 'pagos'); y jsonb := public.cfx_yo(); pagado boolean; debe boolean; bloq boolean;
        lib jsonb := (select valor from public.cfx_config where clave = 'liberar'); ld timestamptz := (lib ->> 'desde')::timestamptz; lh timestamptz := (lib ->> 'hasta')::timestamptz;
begin
  if y is null or (y ->> 'id') is null then raise exception 'Inicia sesión'; end if;
  pagado := exists (select 1 from public.cfx_pagos where cuenta = (y ->> 'id')::uuid and estado = 'aprobado')
    or exists (select 1 from public.cfx_exentos where cuenta = (y ->> 'id')::uuid);
  -- debe_inicio: cuenta nueva (desde que activaste la regla) sin primer pago. bloqueado: además es un negocio.
  -- Solo si ya hay una forma de pago configurada (si no, nadie podría pagar).
  debe := coalesce((c #>> '{negocio,exigir_inicio}')::boolean, false) and not pagado
     and (coalesce(c ->> 'link', '') <> '' or coalesce(c #>> '{transferencia,numero}', '') <> '' or coalesce(c #>> '{tarjeta,link}', '') <> '')
     and (y ->> 'creado')::timestamptz > coalesce((c ->> 'inicio_desde')::timestamptz, now())
     -- Liberado: mientras dure nadie queda bloqueado; las cuentas creadas en ese tiempo quedan en gratis sin primer pago.
     and not (lh is not null and (now() < lh or (y ->> 'creado')::timestamptz between coalesce(ld, '-infinity') and lh));
  bloq := debe and y ->> 'rol' = 'negocio';
  return jsonb_build_object('config', c - 'inicio_desde', 'yo', y, 'pagado', pagado, 'bloqueado', bloq, 'debe_inicio', debe,
    'liberado_hasta', case when lh > now() then lh end,
    'ultimo', (select to_jsonb(x) from (select id, periodo, monto, medio, estado, dias, motivo, creado, resuelto from public.cfx_pagos
               where cuenta = (y ->> 'id')::uuid order by creado desc limit 1) x));
end $$;

drop function if exists public.cfx_pago_pedir(text, int, text, text, text);
drop function if exists public.cfx_pago_pedir(text, int, text, text, text, text);
create or replace function public.cfx_pago_pedir(p_periodo text, p_monto int, p_medio text, p_comprobante text, p_nota text default '', p_cupon text default null, p_meses int default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); i uuid; cup text := nullif(upper(trim(coalesce(p_cupon, ''))), '');
begin
  if y is null or (y ->> 'id') is null then raise exception 'Inicia sesión'; end if;
  if y ->> 'rol' not in ('negocio', 'cliente') and p_periodo <> 'otro' then raise exception 'Pide al dueño de la cuenta que haga el pago'; end if;
  if p_periodo not in ('inicio', 'mensual', 'meses', 'anual', 'otro') or p_medio not in ('link', 'transferencia', 'tarjeta') then raise exception 'Datos no válidos'; end if;
  if p_periodo = 'meses' and coalesce(p_meses, 0) not between 2 and 11 then raise exception 'Elige de 2 a 11 meses'; end if;
  if coalesce(p_monto, 0) < 1 then raise exception 'Escribe el monto que pagaste'; end if;
  if coalesce(length(p_comprobante), 0) < 200 then raise exception 'Sube la foto del comprobante'; end if;
  if cup is not null then perform public.cfx_cupon_ver(cup); end if;
  if exists (select 1 from public.cfx_pagos where cuenta = (y ->> 'id')::uuid and estado = 'pendiente') then raise exception 'Ya tienes un pago en revisión. Te avisamos apenas se apruebe.'; end if;
  if (select count(*) from public.cfx_pagos where cuenta = (y ->> 'id')::uuid and creado > now() - interval '1 day') >= 5 then raise exception 'Demasiados intentos hoy. Escribe a soporte.'; end if;
  insert into public.cfx_pagos (cuenta, email, nombre, rol, periodo, monto, medio, nota, comprobante, cupon, meses)
  values ((y ->> 'id')::uuid, coalesce(y ->> 'email', ''), left(coalesce(y ->> 'nombre', ''), 80), case when y ->> 'rol' in ('negocio', 'cliente') then y ->> 'rol' else 'otro' end,
          p_periodo, p_monto, p_medio, left(coalesce(p_nota, ''), 300), p_comprobante, cup, case when p_periodo = 'meses' then p_meses end)
  returning id into i;
  -- Aviso al tiro: al Centro de Mando si la app está vinculada (si no, al administrador de esta app).
  perform public.cfx_al_cm('💳 Pago por revisar', coalesce(nullif(y ->> 'nombre', ''), y ->> 'email') || ' · $' || p_monto || ' (' || case p_periodo when 'meses' then p_meses || ' meses' else p_periodo end || ', ' || p_medio || ')' || coalesce(' · cupón ' || cup, ''), 'pago');
  return i;
end $$;

-- Precios públicos (para la portada, sin iniciar sesión).
create or replace function public.cfx_precios() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('negocio', valor -> 'negocio', 'cliente', valor -> 'cliente', 'comision_pct', valor -> 'comision_pct',
    'liberado_hasta', (select case when (l.valor ->> 'hasta')::timestamptz > now() then l.valor -> 'hasta' end from public.cfx_config l where l.clave = 'liberar'))
  from public.cfx_config where clave = 'pagos'
$$;
revoke all on function public.cfx_precios() from public;
grant execute on function public.cfx_precios() to anon, authenticated;

-- ---------- Administrador (lo llama el Centro de Mando) ----------
create or replace function public.cfx_pagos_config() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.super_check();
  return (select valor from public.cfx_config where clave = 'pagos');
end $$;

create or replace function public.cfx_pagos_config_guardar(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb := (select valor from public.cfx_config where clave = 'pagos');
begin
  perform public.super_check();
  if jsonb_typeof(p) <> 'object' then raise exception 'Datos no válidos'; end if;
  if coalesce(p ->> 'link', '') <> '' and (p ->> 'link') !~ '^https://[^ ]+$' then raise exception 'El link de pago debe empezar con https://'; end if;
  if coalesce((p ->> 'comision_pct')::numeric, 0) not between 0 and 20 or coalesce((p #>> '{tarjeta,comision_pct}')::numeric, 0) not between 0 and 20 then raise exception 'El cargo por pago online va de 0 a 20 %%'; end if;
  if coalesce(p #>> '{tarjeta,link}', '') <> '' and (p #>> '{tarjeta,link}') !~ '^https://[^ ]+$' then raise exception 'El link de tarjeta debe empezar con https://'; end if;
  -- Al activar "bloquear hasta el primer pago", solo aplica a los negocios que se registren desde ahora.
  -- También cuando se configura la primera forma de pago (antes nadie podía pagar, así que nadie quedó obligado).
  if coalesce((p #>> '{negocio,exigir_inicio}')::boolean, false) and (not coalesce((v #>> '{negocio,exigir_inicio}')::boolean, false)
     or (coalesce(v ->> 'link', '') = '' and coalesce(v #>> '{transferencia,numero}', '') = '' and coalesce(v #>> '{tarjeta,link}', '') = ''
         and (coalesce(p ->> 'link', '') <> '' or coalesce(p #>> '{transferencia,numero}', '') <> '' or coalesce(p #>> '{tarjeta,link}', '') <> ''))) then
    p := p || jsonb_build_object('inicio_desde', now());
  end if;
  v := v || (p - 'inicio_desde') || case when p ? 'inicio_desde' then jsonb_build_object('inicio_desde', p -> 'inicio_desde') else '{}'::jsonb end;
  update public.cfx_config set valor = v where clave = 'pagos';
  return v;
end $$;

create or replace function public.cfx_pagos_lista(p_estado text default 'pendiente') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.super_check();
  return (select coalesce(jsonb_agg(x order by x.creado desc), '[]') from (
    select id, cuenta, email, nombre, rol, periodo, meses, monto, medio, nota, estado, dias, motivo, creado, resuelto, comprobante is not null as con_comprobante,
      public.cfx_dias_sugeridos(g) as sugeridos,
      (select count(*) from public.cfx_pagos z where z.cuenta = g.cuenta and z.estado = 'aprobado') as aprobados
    from public.cfx_pagos g where p_estado = 'todos' or estado = p_estado order by creado desc limit 200) x);
end $$;

create or replace function public.cfx_pago_comprobante(p_id uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.super_check();
  return (select comprobante from public.cfx_pagos where id = p_id);
end $$;

-- Días que corresponden a un pago (siempre días enteros): mensual 30, anual 365, N meses = N × 30, primer pago lo configurado,
-- y "otro monto" en proporción al precio mensual (sin contar el cargo por pago online).
create or replace function public.cfx_dias_sugeridos(g public.cfx_pagos) returns int
language plpgsql stable security definer set search_path = '' as $$
declare c jsonb := (select valor from public.cfx_config where clave = 'pagos'); m numeric; pct numeric; neto numeric;
begin
  if g.periodo = 'inicio' then return coalesce((c #>> '{negocio,inicio_dias}')::int, 30); end if;
  if g.periodo = 'mensual' then return 30; end if;
  if g.periodo = 'anual' then return 365; end if;
  if g.periodo = 'meses' then return 30 * coalesce(g.meses, 1); end if;
  m := nullif((c #>> array[case when g.rol = 'cliente' then 'cliente' else 'negocio' end, 'mensual'])::numeric, 0);
  pct := case g.medio when 'link' then coalesce((c ->> 'comision_pct')::numeric, 0) when 'tarjeta' then coalesce((c #>> '{tarjeta,comision_pct}')::numeric, 0) else 0 end;
  neto := g.monto / (1 + pct / 100);
  return case when m is null then 0 else least(3660, floor(neto * 30 / m))::int end;
end $$;
revoke all on function public.cfx_dias_sugeridos(public.cfx_pagos) from public, anon, authenticated;

create or replace function public.cfx_pago_resolver(p_id uuid, p_aprobar boolean, p_dias int default null, p_motivo text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare g public.cfx_pagos; c jsonb := (select valor from public.cfx_config where clave = 'pagos'); d int; hasta timestamptz;
begin
  perform public.super_check();
  select * into g from public.cfx_pagos where id = p_id and estado = 'pendiente' for update;
  if g.id is null then raise exception 'Pago no encontrado o ya resuelto'; end if;
  d := coalesce(p_dias, public.cfx_dias_sugeridos(g));
  if p_aprobar then
    if d < 0 or d > 3660 then raise exception 'Días no válidos'; end if;
    if d > 0 then hasta := public.cfx_dar_premium(g.cuenta, g.rol, d); end if;
    update public.cfx_pagos set estado = 'aprobado', dias = d, motivo = left(coalesce(p_motivo, ''), 200), resuelto = now(), comprobante = null where id = p_id;
    perform public.cfx_avisar(g.cuenta, '✅ Pago aprobado', case when hasta is not null then 'Premium activo hasta el ' || to_char(hasta at time zone 'America/Santiago', 'DD/MM/YYYY') || '. ¡Gracias!' else 'Gracias, tu pago quedó registrado.' end);
  else
    update public.cfx_pagos set estado = 'rechazado', motivo = left(coalesce(nullif(p_motivo, ''), 'No pudimos validar el comprobante'), 200), resuelto = now(), comprobante = null where id = p_id;
    perform public.cfx_avisar(g.cuenta, '⚠️ Pago rechazado', left(coalesce(nullif(p_motivo, ''), 'No pudimos validar el comprobante'), 200) || '. Puedes subirlo de nuevo.');
  end if;
  return jsonb_build_object('estado', case when p_aprobar then 'aprobado' else 'rechazado' end, 'dias', d, 'hasta', hasta);
end $$;

-- Liberar el registro por N días (0 = terminar ahora). Sin p_dias solo devuelve cómo está.
create or replace function public.cfx_liberar(p_dias int default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb := (select valor from public.cfx_config where clave = 'liberar');
begin
  perform public.super_check();
  if p_dias is not null then
    if p_dias < 0 or p_dias > 90 then raise exception 'De 0 a 90 días'; end if;
    v := case when p_dias = 0 then coalesce(v, '{}'::jsonb) || jsonb_build_object('hasta', least(coalesce((v ->> 'hasta')::timestamptz, now()), now()))
         else jsonb_build_object('desde', case when (v ->> 'hasta')::timestamptz > now() then v -> 'desde' else to_jsonb(now()) end, 'hasta', now() + make_interval(days => p_dias)) end;
    insert into public.cfx_config (clave, valor) values ('liberar', v) on conflict (clave) do update set valor = excluded.valor;
  end if;
  return jsonb_build_object('desde', v -> 'desde', 'hasta', v -> 'hasta', 'activo', coalesce((v ->> 'hasta')::timestamptz > now(), false));
end $$;
revoke all on function public.cfx_liberar(int) from public, anon;
grant execute on function public.cfx_liberar(int) to authenticated;

-- Cuentas que no pagan el inicio (por ejemplo, las que creas tú de regalo).
create or replace function public.cfx_exento(p_cuenta uuid, p_si boolean, p_nota text default '') returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  if p_si then insert into public.cfx_exentos (cuenta, nota) values (p_cuenta, left(coalesce(p_nota, ''), 200)) on conflict (cuenta) do update set nota = excluded.nota;
  else delete from public.cfx_exentos where cuenta = p_cuenta; end if;
end $$;

create or replace function public.cfx_exento_email(p_email text, p_si boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  perform public.super_check();
  select id into u from auth.users where lower(email) = lower(trim(coalesce(p_email, '')));
  if u is null then raise exception 'No hay una cuenta con ese correo en esta app'; end if;
  perform public.cfx_exento(u, p_si, 'Desde el Centro de Mando');
  return lower(trim(p_email));
end $$;

revoke all on function public.cfx_exento_email(text, boolean) from public, anon;
grant execute on function public.cfx_exento_email(text, boolean) to authenticated;
revoke all on function public.cfx_pago_estado(), public.cfx_pago_pedir(text, int, text, text, text, text, int), public.cfx_pagos_config(), public.cfx_pagos_config_guardar(jsonb),
  public.cfx_pagos_lista(text), public.cfx_pago_comprobante(uuid), public.cfx_pago_resolver(uuid, boolean, int, text), public.cfx_exento(uuid, boolean, text) from public, anon;
grant execute on function public.cfx_pago_estado(), public.cfx_pago_pedir(text, int, text, text, text, text, int), public.cfx_pagos_config(), public.cfx_pagos_config_guardar(jsonb),
  public.cfx_pagos_lista(text), public.cfx_pago_comprobante(uuid), public.cfx_pago_resolver(uuid, boolean, int, text), public.cfx_exento(uuid, boolean, text) to authenticated;
revoke all on function public.cfx_yo(), public.cfx_dar_premium(uuid, text, int), public.cfx_avisar(uuid, text, text), public.cfx_avisar_admin(text, text) from public, anon, authenticated;
-- ---------------------------------------------------------------------
-- CodeFix · Administración común (igual en las 6 apps; se maneja desde el Centro de Mando → Control).
--   Planes (interruptores sí/no y límites), textos, aviso a todos, keys de Premium, cupones de descuento,
--   verificación de identidad y registro de lo que hace el administrador.
--   Cada app define antes: cfx_planes_app(), cfx_plan_guardar_app(text, text, jsonb, jsonb), cfx_textos_app(),
--   cfx_texto_guardar_app(text, text), cfx_destinatarios(text) y cfx_marcar_verificado(uuid, boolean).
-- ---------------------------------------------------------------------
create table if not exists public.cfx_registro (
  id bigserial primary key, quien text not null default '', accion text not null, detalle text not null default '', creado timestamptz not null default now());
create table if not exists public.cfx_keys (
  id uuid primary key default gen_random_uuid(), hash text not null unique, ultimos text not null, rol text not null check (rol in ('negocio', 'cliente')),
  dias int not null check (dias between 1 and 3660), nota text not null default '', creado timestamptz not null default now(),
  usada_por uuid, usada_email text, usada_at timestamptz, revocada boolean not null default false);
create table if not exists public.cfx_cupones (
  codigo text primary key check (codigo ~ '^[A-Z0-9-]{3,20}$'), pct int not null check (pct between 1 and 100), usos_max int, usos int not null default 0,
  vence date, activo boolean not null default true, creado timestamptz not null default now());
create table if not exists public.cfx_verificaciones (
  cuenta uuid primary key, email text not null default '', nombre text not null default '', rut text not null, documento text not null default '',
  frente text, reverso text, selfie text, estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  motivo text not null default '', creado timestamptz not null default now(), resuelto timestamptz);
alter table public.cfx_registro enable row level security;
alter table public.cfx_keys enable row level security;
alter table public.cfx_cupones enable row level security;
alter table public.cfx_verificaciones enable row level security;
revoke all on public.cfx_registro, public.cfx_keys, public.cfx_cupones, public.cfx_verificaciones from anon, authenticated;

create or replace function public.cfx_anotar(p_accion text, p_detalle text) returns void
language sql security definer set search_path = '' as $$
  insert into public.cfx_registro (quien, accion, detalle) values (coalesce((select email from auth.users where id = auth.uid()), 'sistema'), left(p_accion, 60), left(coalesce(p_detalle, ''), 400))
$$;
create or replace function public.cfx_registro_lista(p_limite int default 200) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.super_check();
  return (select coalesce(jsonb_agg(x order by x.id desc), '[]') from (select * from public.cfx_registro order by id desc limit greatest(1, least(coalesce(p_limite, 200), 2000))) x);
end $$;

-- ---------- Planes: [{grupo, clave, free, premium}] (números o sí/no) ----------
create or replace function public.cfx_planes() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.super_check();
  return public.cfx_planes_app();
end $$;
create or replace function public.cfx_plan_guardar(p_grupo text, p_clave text, p_free jsonb, p_premium jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  if jsonb_typeof(p_free) not in ('number', 'boolean') or jsonb_typeof(p_premium) not in ('number', 'boolean') then raise exception 'Valor no válido'; end if;
  perform public.cfx_plan_guardar_app(p_grupo, p_clave, p_free, p_premium);
  perform public.cfx_anotar('plan', p_grupo || '.' || p_clave || ': gratis ' || p_free::text || ' · premium ' || p_premium::text);
end $$;

-- ---------- Textos: [{clave, valor}] ----------
create or replace function public.cfx_textos() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.super_check();
  return public.cfx_textos_app();
end $$;
create or replace function public.cfx_texto_guardar(p_clave text, p_valor text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  perform public.cfx_texto_guardar_app(p_clave, left(coalesce(p_valor, ''), 2000));
  perform public.cfx_anotar('texto', p_clave);
end $$;

-- ---------- Aviso a todos: destino todos | negocios | clientes | premium | gratis ----------
create or replace function public.cfx_aviso_masivo(p_destino text, p_titulo text, p_cuerpo text) returns int
language plpgsql security definer set search_path = '' as $$
declare u uuid; n int := 0;
begin
  perform public.super_check();
  if trim(coalesce(p_titulo, '')) = '' then raise exception 'Escribe el título'; end if;
  if p_destino not in ('todos', 'negocios', 'clientes', 'premium', 'gratis') then raise exception 'Destino no válido'; end if;
  for u in select * from public.cfx_destinatarios(p_destino) loop
    perform public.cfx_avisar(u, left(p_titulo, 80), left(coalesce(p_cuerpo, ''), 240));
    n := n + 1;
  end loop;
  perform public.cfx_anotar('aviso', p_destino || ' (' || n || '): ' || p_titulo);
  return n;
end $$;

-- ---------- Keys de Premium (de un solo uso). Se guardan cifradas: el código completo solo se ve al crearlas. ----------
create or replace function public.cfx_keys_crear(p_n int, p_rol text, p_dias int, p_nota text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c text; out jsonb := '[]'::jsonb;
begin
  perform public.super_check();
  if p_rol not in ('negocio', 'cliente') or coalesce(p_dias, 0) not between 1 and 3660 or coalesce(p_n, 0) not between 1 and 50 then raise exception 'Datos no válidos'; end if;
  for i in 1..p_n loop
    c := upper(replace(gen_random_uuid()::text, '-', ''));
    c := 'CFX-' || substr(c, 1, 4) || '-' || substr(c, 5, 4) || '-' || substr(c, 9, 4);
    insert into public.cfx_keys (hash, ultimos, rol, dias, nota) values (encode(sha256(convert_to(c, 'UTF8')), 'hex'), right(c, 4), p_rol, p_dias, left(coalesce(p_nota, ''), 120));
    out := out || to_jsonb(c);
  end loop;
  perform public.cfx_anotar('keys', p_n || ' keys ' || p_rol || ' de ' || p_dias || ' días');
  return out;
end $$;
create or replace function public.cfx_keys_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.super_check();
  return (select coalesce(jsonb_agg(to_jsonb(k) - 'hash' order by k.creado desc), '[]') from (select * from public.cfx_keys order by creado desc limit 300) k);
end $$;
create or replace function public.cfx_key_revocar(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  update public.cfx_keys set revocada = true where id = p_id and usada_por is null;
  perform public.cfx_anotar('key revocada', p_id::text);
end $$;
create or replace function public.cfx_key_canjear(p_codigo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); k public.cfx_keys; h timestamptz; c text := upper(trim(coalesce(p_codigo, '')));
begin
  if y is null or (y ->> 'id') is null then raise exception 'Inicia sesión'; end if;
  if (select count(*) from public.cfx_registro where accion = 'key fallida' and detalle = (y ->> 'id') and creado > now() - interval '1 hour') >= 10 then
    raise exception 'Demasiados intentos. Prueba en una hora.';
  end if;
  select * into k from public.cfx_keys where hash = encode(sha256(convert_to(c, 'UTF8')), 'hex') for update;
  if k.id is null or k.revocada or k.usada_por is not null then
    insert into public.cfx_registro (quien, accion, detalle) values (coalesce(y ->> 'email', ''), 'key fallida', y ->> 'id');
    raise exception 'Key no válida o ya usada';
  end if;
  if k.rol <> coalesce(y ->> 'rol', '') then raise exception 'Esta key es para cuentas de %', case when k.rol = 'negocio' then 'negocio' else 'cliente' end; end if;
  h := public.cfx_dar_premium((y ->> 'id')::uuid, k.rol, k.dias);
  update public.cfx_keys set usada_por = (y ->> 'id')::uuid, usada_email = y ->> 'email', usada_at = now() where id = k.id;
  insert into public.cfx_exentos (cuenta, nota) values ((y ->> 'id')::uuid, 'Key ' || k.ultimos) on conflict (cuenta) do nothing;
  perform public.cfx_avisar_admin('🔑 Key canjeada', coalesce(y ->> 'email', '') || ' · ' || k.dias || ' días');
  return jsonb_build_object('hasta', h, 'dias', k.dias);
end $$;

-- ---------- Cupones de descuento (se aplican al pagar Premium) ----------
create or replace function public.cfx_cupon_ver(p_codigo text) returns int
language plpgsql stable security definer set search_path = '' as $$
declare c public.cfx_cupones;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  select * into c from public.cfx_cupones where codigo = upper(trim(coalesce(p_codigo, '')));
  if c.codigo is null or not c.activo or (c.vence is not null and c.vence < current_date) or (c.usos_max is not null and c.usos >= c.usos_max) then
    raise exception 'Cupón no válido o vencido';
  end if;
  return c.pct;
end $$;
create or replace function public.cfx_cupones_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.super_check();
  return (select coalesce(jsonb_agg(to_jsonb(c) order by c.creado desc), '[]') from public.cfx_cupones c);
end $$;
create or replace function public.cfx_cupon_guardar(p_codigo text, p_pct int, p_usos_max int default null, p_vence date default null, p_activo boolean default true) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  insert into public.cfx_cupones (codigo, pct, usos_max, vence, activo) values (upper(trim(p_codigo)), p_pct, p_usos_max, p_vence, coalesce(p_activo, true))
  on conflict (codigo) do update set pct = excluded.pct, usos_max = excluded.usos_max, vence = excluded.vence, activo = excluded.activo;
  perform public.cfx_anotar('cupón', upper(trim(p_codigo)) || ' ' || p_pct || '%');
end $$;
create or replace function public.cfx_cupon_borrar(p_codigo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  delete from public.cfx_cupones where codigo = upper(trim(p_codigo));
end $$;

-- ---------- Verificación de identidad (RUT, N° de documento, fotos de la cédula y selfie). Las fotos se borran al revisar. ----------
create or replace function public.cfx_rut_ok(r text) returns boolean
language plpgsql immutable as $$
declare s text := upper(regexp_replace(coalesce(r, ''), '[^0-9kK]', '', 'g')); cuerpo text; dv text; suma int := 0; m int := 2; res text;
begin
  if length(s) < 2 then return false; end if;
  cuerpo := left(s, length(s) - 1); dv := right(s, 1);
  if cuerpo !~ '^[0-9]+$' then return false; end if;
  for i in reverse length(cuerpo)..1 loop
    suma := suma + substr(cuerpo, i, 1)::int * m; m := case when m = 7 then 2 else m + 1 end;
  end loop;
  res := case 11 - suma % 11 when 11 then '0' when 10 then 'K' else (11 - suma % 11)::text end;
  return res = dv;
end $$;
create or replace function public.cfx_verif_estado() returns jsonb
language sql stable security definer set search_path = '' as $$
  select (select jsonb_build_object('estado', estado, 'motivo', motivo, 'creado', creado, 'resuelto', resuelto) from public.cfx_verificaciones where cuenta = auth.uid())
$$;
create or replace function public.cfx_verif_enviar(p_rut text, p_documento text, p_frente text, p_reverso text, p_selfie text) returns void
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); r text := upper(regexp_replace(coalesce(p_rut, ''), '[^0-9kK]', '', 'g'));
begin
  if y is null or (y ->> 'id') is null then raise exception 'Inicia sesión'; end if;
  if not public.cfx_rut_ok(r) then raise exception 'RUT no válido'; end if;
  if exists (select 1 from public.cfx_verificaciones where rut = r and cuenta <> (y ->> 'id')::uuid and estado <> 'rechazada') then raise exception 'Ese RUT ya está en otra cuenta'; end if;
  if exists (select 1 from public.cfx_verificaciones where cuenta = (y ->> 'id')::uuid and estado = 'aprobada') then raise exception 'Tu identidad ya está verificada'; end if;
  if coalesce(length(p_frente), 0) < 200 or coalesce(length(p_reverso), 0) < 200 or coalesce(length(p_selfie), 0) < 200 then raise exception 'Faltan fotos'; end if;
  if length(p_frente) > 500000 or length(p_reverso) > 500000 or length(p_selfie) > 500000 then raise exception 'Fotos muy pesadas'; end if;
  insert into public.cfx_verificaciones (cuenta, email, nombre, rut, documento, frente, reverso, selfie, estado, motivo, creado, resuelto)
  values ((y ->> 'id')::uuid, coalesce(y ->> 'email', ''), left(coalesce(y ->> 'nombre', ''), 80), r, left(coalesce(p_documento, ''), 20), p_frente, p_reverso, p_selfie, 'pendiente', '', now(), null)
  on conflict (cuenta) do update set rut = excluded.rut, documento = excluded.documento, frente = excluded.frente, reverso = excluded.reverso, selfie = excluded.selfie,
    estado = 'pendiente', motivo = '', creado = now(), resuelto = null;
  perform public.cfx_avisar_admin('🪪 Verificación por revisar', coalesce(nullif(y ->> 'nombre', ''), y ->> 'email'));
end $$;
create or replace function public.cfx_verif_lista(p_estado text default 'pendiente') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.super_check();
  return (select coalesce(jsonb_agg(x order by x.creado desc), '[]') from (select cuenta, email, nombre, rut, documento, estado, motivo, creado, resuelto
    from public.cfx_verificaciones where p_estado = 'todos' or estado = p_estado order by creado desc limit 200) x);
end $$;
create or replace function public.cfx_verif_fotos(p_cuenta uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.super_check();
  return (select jsonb_build_object('frente', frente, 'reverso', reverso, 'selfie', selfie) from public.cfx_verificaciones where cuenta = p_cuenta);
end $$;
create or replace function public.cfx_verif_resolver(p_cuenta uuid, p_aprobar boolean, p_motivo text default '') returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  update public.cfx_verificaciones set estado = case when p_aprobar then 'aprobada' else 'rechazada' end, motivo = left(coalesce(p_motivo, ''), 200),
    resuelto = now(), frente = null, reverso = null, selfie = null where cuenta = p_cuenta and estado = 'pendiente';
  if not found then raise exception 'No hay una verificación pendiente'; end if;
  perform public.cfx_marcar_verificado(p_cuenta, p_aprobar);
  perform public.cfx_avisar(p_cuenta, case when p_aprobar then '🪪 Identidad verificada' else '🪪 Verificación rechazada' end,
    case when p_aprobar then 'Ya apareces como persona verificada.' else coalesce(nullif(p_motivo, ''), 'Revisa las fotos') || '. Puedes enviarla de nuevo.' end);
  perform public.cfx_anotar(case when p_aprobar then 'verificación aprobada' else 'verificación rechazada' end, p_cuenta::text);
end $$;

create or replace function public.cfx_cupon_usado() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.estado = 'aprobado' and old.estado = 'pendiente' and new.cupon is not null then update public.cfx_cupones set usos = usos + 1 where codigo = new.cupon; end if;
  return new;
end $$;
drop trigger if exists cfx_cupon_usado on public.cfx_pagos;
create trigger cfx_cupon_usado after update of estado on public.cfx_pagos for each row execute function public.cfx_cupon_usado();

-- ---------- Verificación humana (Cloudflare Turnstile): la site key es pública; la secret key va en Supabase → Authentication → CAPTCHA ----------
insert into public.cfx_config (clave, valor) values ('humano', '{"site_key": ""}') on conflict (clave) do nothing;
create or replace function public.cfx_humano() returns jsonb
language sql stable security definer set search_path = '' as $$ select valor from public.cfx_config where clave = 'humano' $$;
create or replace function public.cfx_humano_guardar(p_site_key text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  if coalesce(p_site_key, '') <> '' and p_site_key !~ '^[0-9A-Za-z_-]{10,60}$' then raise exception 'Site key no válida'; end if;
  update public.cfx_config set valor = jsonb_build_object('site_key', coalesce(p_site_key, '')) where clave = 'humano';
  perform public.cfx_anotar('humano', case when coalesce(p_site_key, '') = '' then 'apagado' else 'site key ' || right(p_site_key, 4) end);
end $$;
revoke all on function public.cfx_humano(), public.cfx_humano_guardar(text) from public;
grant execute on function public.cfx_humano() to anon, authenticated;
grant execute on function public.cfx_humano_guardar(text) to authenticated;

revoke all on function public.cfx_anotar(text, text), public.cfx_cupon_usado() from public, anon, authenticated;
revoke all on function public.cfx_registro_lista(int), public.cfx_planes(), public.cfx_plan_guardar(text, text, jsonb, jsonb), public.cfx_textos(), public.cfx_texto_guardar(text, text),
  public.cfx_aviso_masivo(text, text, text), public.cfx_keys_crear(int, text, int, text), public.cfx_keys_lista(), public.cfx_key_revocar(uuid), public.cfx_key_canjear(text),
  public.cfx_cupon_ver(text), public.cfx_cupones_lista(), public.cfx_cupon_guardar(text, int, int, date, boolean), public.cfx_cupon_borrar(text),
  public.cfx_verif_estado(), public.cfx_verif_enviar(text, text, text, text, text), public.cfx_verif_lista(text), public.cfx_verif_fotos(uuid), public.cfx_verif_resolver(uuid, boolean, text) from public, anon;
grant execute on function public.cfx_registro_lista(int), public.cfx_planes(), public.cfx_plan_guardar(text, text, jsonb, jsonb), public.cfx_textos(), public.cfx_texto_guardar(text, text),
  public.cfx_aviso_masivo(text, text, text), public.cfx_keys_crear(int, text, int, text), public.cfx_keys_lista(), public.cfx_key_revocar(uuid), public.cfx_key_canjear(text),
  public.cfx_cupon_ver(text), public.cfx_cupones_lista(), public.cfx_cupon_guardar(text, int, int, date, boolean), public.cfx_cupon_borrar(text),
  public.cfx_verif_estado(), public.cfx_verif_enviar(text, text, text, text, text), public.cfx_verif_lista(text), public.cfx_verif_fotos(uuid), public.cfx_verif_resolver(uuid, boolean, text) to authenticated;
revoke all on function public.cfx_planes_app(), public.cfx_plan_guardar_app(text, text, jsonb, jsonb), public.cfx_textos_app(), public.cfx_texto_guardar_app(text, text),
  public.cfx_destinatarios(text), public.cfx_marcar_verificado(uuid, boolean) from public, anon, authenticated;
-- ---------------------------------------------------------------------
-- CodeFix · Ayuda (igual en las 6 apps; lo reparte nucleo/sincronizar.py).
--   1) Puente al Centro de Mando: los avisos importantes (pagos por revisar, mensajes de soporte) le llegan al tiro
--      al Centro de Mando. El Centro de Mando vincula cada app solo (cfx_cm_vincular) al abrir Pagos o Mensajes.
--   2) Chat de soporte: cada persona escribe desde su app y tú respondes desde el Centro de Mando → Mensajes.
--   3) Guía para partir: lo que le falta configurar a cada negocio (cfx_guia_app() de cada app). No se marca
--      como listo hasta que de verdad lo hace, y se le recuerda cada vez que entra.
--   Cada app define antes: cfx_guia_app() → [{ k, t, d, ok, ir }].
-- ---------------------------------------------------------------------

-- ---------- 1) Puente al Centro de Mando ----------
create or replace function public.cfx_cm_vincular(p_url text, p_key text, p_secreto text, p_app text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  if coalesce(p_url, '') !~ '^https://[a-z0-9.-]+$' or length(coalesce(p_key, '')) < 20 or length(coalesce(p_secreto, '')) < 24 or coalesce(p_app, '') !~ '^[a-z]{2,20}$' then
    raise exception 'Datos de vínculo no válidos';
  end if;
  insert into public.cfx_config (clave, valor) values ('cm', jsonb_build_object('url', p_url, 'key', p_key, 'secreto', p_secreto, 'app', p_app, 'desde', now()))
  on conflict (clave) do update set valor = excluded.valor;
  return jsonb_build_object('vinculado', true, 'app', p_app);
end $$;

create or replace function public.cfx_cm_estado() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb := (select valor from public.cfx_config where clave = 'cm');
begin
  perform public.super_check();
  return jsonb_build_object('vinculado', coalesce(v ->> 'secreto', '') <> '', 'app', v ->> 'app', 'url', v ->> 'url', 'desde', v -> 'desde');
end $$;

-- Avisa al Centro de Mando (si la app está vinculada); si no, al administrador de esta app. Nunca hace fallar lo que la llama.
create or replace function public.cfx_al_cm(p_titulo text, p_cuerpo text, p_tipo text default 'aviso') returns void
language plpgsql security definer set search_path = '' as $$
declare v jsonb := (select valor from public.cfx_config where clave = 'cm');
begin
  if coalesce(v ->> 'secreto', '') = '' then
    perform public.cfx_avisar_admin(p_titulo, p_cuerpo);
    return;
  end if;
  begin
    perform net.http_post(
      url := (v ->> 'url') || '/rest/v1/rpc/cfx_aviso_externo',
      body := jsonb_build_object('p_app', v ->> 'app', 'p_secreto', v ->> 'secreto', 'p_titulo', left(p_titulo, 90), 'p_cuerpo', left(coalesce(p_cuerpo, ''), 240), 'p_tipo', p_tipo),
      headers := jsonb_build_object('apikey', v ->> 'key', 'Authorization', 'Bearer ' || (v ->> 'key'), 'Content-Type', 'application/json'));
  exception when others then
    begin perform public.cfx_avisar_admin(p_titulo, p_cuerpo); exception when others then null; end;
  end;
end $$;

-- ---------- 2) Chat de soporte ----------
create table if not exists public.cfx_chat (
  id      bigserial primary key,
  cuenta  uuid not null,
  email   text not null default '',
  nombre  text not null default '',
  rol     text not null default '',
  de      text not null check (de in ('persona', 'soporte')),
  texto   text not null check (length(texto) between 1 and 1000),
  leido   boolean not null default false,
  creado  timestamptz not null default now()
);
create index if not exists cfx_chat_cuenta_idx on public.cfx_chat (cuenta, id);
create index if not exists cfx_chat_sin_leer_idx on public.cfx_chat (de, leido) where not leido;
alter table public.cfx_chat enable row level security;
revoke all on public.cfx_chat from anon, authenticated;

create or replace function public.cfx_chat_mio() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); u uuid := (y ->> 'id')::uuid;
begin
  if u is null then raise exception 'Inicia sesión'; end if;
  update public.cfx_chat set leido = true where cuenta = u and de = 'soporte' and not leido;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'de', de, 'texto', texto, 'creado', creado) order by id), '[]')
          from (select * from public.cfx_chat where cuenta = u order by id desc limit 100) x);
end $$;

create or replace function public.cfx_chat_sin_leer() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.cfx_chat where cuenta = auth.uid() and de = 'soporte' and not leido
$$;

create or replace function public.cfx_chat_enviar(p_texto text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); u uuid := (y ->> 'id')::uuid; t text := trim(coalesce(p_texto, '')); i bigint;
begin
  if u is null then raise exception 'Inicia sesión'; end if;
  if t = '' then raise exception 'Escribe tu mensaje'; end if;
  if length(t) > 1000 then raise exception 'Máximo 1000 letras'; end if;
  if (select count(*) from public.cfx_chat where cuenta = u and de = 'persona' and creado > now() - interval '1 hour') >= 20 then
    raise exception 'Muchos mensajes seguidos. Espera un poco y te respondemos.';
  end if;
  insert into public.cfx_chat (cuenta, email, nombre, rol, de, texto)
  values (u, coalesce(y ->> 'email', ''), left(coalesce(y ->> 'nombre', ''), 80), coalesce(y ->> 'rol', ''), 'persona', t) returning id into i;
  delete from public.cfx_chat where cuenta = u and creado < now() - interval '365 days';
  perform public.cfx_al_cm('💬 ' || coalesce(nullif(y ->> 'nombre', ''), y ->> 'email', 'Mensaje'), left(t, 200), 'chat');
  return i;
end $$;

-- Administrador: bandeja (una fila por persona), conversación y respuesta.
create or replace function public.cfx_chat_bandeja() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.super_check();
  return (select coalesce(jsonb_agg(x order by x.ultimo desc), '[]') from (
    select c.cuenta, max(c.email) as email, max(c.nombre) as nombre, max(c.rol) as rol, max(c.creado) as ultimo,
      (array_agg(c.texto order by c.id desc))[1] as texto, (array_agg(c.de order by c.id desc))[1] as de,
      count(*) filter (where c.de = 'persona' and not c.leido) as sin_leer
    from public.cfx_chat c group by c.cuenta order by max(c.creado) desc limit 200) x);
end $$;

create or replace function public.cfx_chat_hilo(p_cuenta uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  update public.cfx_chat set leido = true where cuenta = p_cuenta and de = 'persona' and not leido;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'de', de, 'texto', texto, 'creado', creado) order by id), '[]')
          from (select * from public.cfx_chat where cuenta = p_cuenta order by id desc limit 200) x);
end $$;

create or replace function public.cfx_chat_responder(p_cuenta uuid, p_texto text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare t text := trim(coalesce(p_texto, '')); i bigint; o public.cfx_chat;
begin
  perform public.super_check();
  if t = '' or length(t) > 1000 then raise exception 'Escribe la respuesta (máx. 1000 letras)'; end if;
  select * into o from public.cfx_chat where cuenta = p_cuenta order by id desc limit 1;
  if o.id is null then raise exception 'Conversación no encontrada'; end if;
  insert into public.cfx_chat (cuenta, email, nombre, rol, de, texto, leido) values (p_cuenta, o.email, o.nombre, o.rol, 'soporte', t, false) returning id into i;
  update public.cfx_chat set leido = true where cuenta = p_cuenta and de = 'persona' and not leido;
  perform public.cfx_avisar(p_cuenta, '💬 Soporte te respondió', left(t, 200));
  return i;
end $$;

-- ---------- 3) Guía para partir ----------
-- Pendientes de configuración del negocio (los arma cada app) + verificar identidad. Solo para negocios.
create or replace function public.cfx_guia() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); l jsonb;
begin
  if y is null or (y ->> 'id') is null then raise exception 'Inicia sesión'; end if;
  if y ->> 'rol' <> 'negocio' then return jsonb_build_object('items', '[]'::jsonb, 'sin_leer', public.cfx_chat_sin_leer()); end if;
  l := coalesce(public.cfx_guia_app(), '[]'::jsonb);
  -- Sin guía propia (Centro de Mando): nada que mostrar.
  if jsonb_array_length(l) > 0 and not exists (select 1 from jsonb_array_elements(l) e where e ->> 'k' = 'verificar') then l := l || jsonb_build_array(jsonb_build_object('k', 'verificar', 't', 'Verifica tu identidad',
    'd', 'Tus clientes confían más en un negocio verificado. Toma 2 minutos.',
    'ok', exists (select 1 from public.cfx_verificaciones v where v.cuenta = (y ->> 'id')::uuid and v.estado = 'aprobada'), 'ir', 'verificar')); end if;
  return jsonb_build_object('items', l, 'sin_leer', public.cfx_chat_sin_leer());
end $$;

revoke all on function public.cfx_al_cm(text, text, text) from public, anon, authenticated;
revoke all on function public.cfx_cm_vincular(text, text, text, text), public.cfx_cm_estado(), public.cfx_chat_mio(), public.cfx_chat_sin_leer(), public.cfx_chat_enviar(text),
  public.cfx_chat_bandeja(), public.cfx_chat_hilo(uuid), public.cfx_chat_responder(uuid, text), public.cfx_guia() from public, anon;
grant execute on function public.cfx_cm_vincular(text, text, text, text), public.cfx_cm_estado(), public.cfx_chat_mio(), public.cfx_chat_sin_leer(), public.cfx_chat_enviar(text),
  public.cfx_chat_bandeja(), public.cfx_chat_hilo(uuid), public.cfx_chat_responder(uuid, text), public.cfx_guia() to authenticated;
revoke all on function public.cfx_guia_app() from public, anon, authenticated;
-- ---------------------------------------------------------------------
-- CodeFix · Inventario (igual en las 6 apps; lo usa el Centro de Mando → Apps → Respaldo y limpieza).
--   Muestra las tablas que esta versión ya NO usa (restos de versiones antiguas) con cuántas filas tienen.
--   Nada se borra solo: las vacías se borran con un toque; las que tienen datos piden descargar el respaldo y escribir "sí".
--   cfx_tablas() = las tablas que crea este archivo (la revisa pruebas/inventario.py --verificar).
-- ---------------------------------------------------------------------
create or replace function public.cfx_tablas() returns text[] language sql immutable as $$ select array['public.auditoria', 'public.cfx_chat', 'public.cfx_config', 'public.cfx_cupones', 'public.cfx_exentos', 'public.cfx_keys', 'public.cfx_pagos', 'public.cfx_registro', 'public.cfx_verificaciones', 'public.cm_puentes', 'public.config', 'public.espacios', 'public.invitaciones', 'public.items', 'public.notificaciones', 'public.pagos', 'public.perfiles', 'public.planes', 'public.push_subs', 'public.secretos', 'public.textos', 'public.uso_dia'] $$;
create or replace function public.cfx_inventario() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r record; n bigint; out jsonb := '[]'::jsonb;
begin
  perform public.super_check();
  for r in select s.nspname || '.' || c.relname as t, pg_total_relation_size(c.oid) as b from pg_class c join pg_namespace s on s.oid = c.relnamespace
           where s.nspname in ('public', 'privado') and c.relkind in ('r', 'p') and not (s.nspname || '.' || c.relname = any (public.cfx_tablas()))
           and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e') order by 1
  loop
    execute 'select count(*) from ' || r.t into n;
    out := out || jsonb_build_object('tabla', r.t, 'filas', n, 'bytes', r.b);
  end loop;
  return out;
end $$;
create or replace function public.cfx_inventario_datos(p_tabla text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare j jsonb;
begin
  perform public.super_check();
  if not exists (select 1 from jsonb_array_elements(public.cfx_inventario()) x where x ->> 'tabla' = p_tabla) then raise exception 'Esa tabla no está en la lista de sobrantes'; end if;
  execute 'select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from (select * from ' || p_tabla || ' limit 20000) t' into j;
  return j;
end $$;
create or replace function public.cfx_inventario_borrar(p_tabla text, p_confirmacion text default '') returns text
language plpgsql security definer set search_path = '' as $$
declare x jsonb;
begin
  perform public.super_check();
  select e into x from jsonb_array_elements(public.cfx_inventario()) e where e ->> 'tabla' = p_tabla;
  if x is null then raise exception 'Esa tabla no está en la lista de sobrantes'; end if;
  if (x ->> 'filas')::bigint > 0 and lower(trim(coalesce(p_confirmacion, ''))) not in ('sí', 'si') then
    raise exception 'La tabla tiene % filas: descarga el respaldo y escribe "sí" para borrarla', x ->> 'filas';
  end if;
  execute 'drop table ' || p_tabla || ' cascade';
  return p_tabla || ' borrada';
end $$;
revoke all on function public.cfx_tablas(), public.cfx_inventario(), public.cfx_inventario_datos(text), public.cfx_inventario_borrar(text, text) from public, anon;
grant execute on function public.cfx_inventario(), public.cfx_inventario_datos(text), public.cfx_inventario_borrar(text, text) to authenticated;
-- <<< CFX núcleo

-- La versión de la app ya no se libera al correr este archivo: se libera desde el panel (Actualizar la app → Liberar).

select 'Centro de Mando instalado v' || public.db_version() as resultado;
