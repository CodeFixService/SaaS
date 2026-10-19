-- =====================================================================
--  CodeFix · Base de datos (Supabase)
--  Supabase → SQL Editor → New query → pega TODO este archivo → Run.
--  Se puede volver a ejecutar sin perder datos (sirve para actualizar).
-- =====================================================================

-- Las funciones se revisan al usarse (así el orden de las secciones no importa).
set check_function_bodies = off;

-- ---------------------------------------------------------------------
-- 0. Ajustes generales
-- ---------------------------------------------------------------------
-- El único administrador general (se reconoce por su correo confirmado).
create or replace function public.admin_email() returns text
language sql immutable as $$ select 'juanjosuecastilloloyola@gmail.com'::text $$;

create or replace function public.db_version() returns text
language sql immutable as $$ select '2.3'::text $$;

-- Teléfono normalizado (solo números; celulares chilenos con 56 adelante).
create or replace function public.tel_norm(t text) returns text
language plpgsql immutable as $$
declare d text := regexp_replace(coalesce(t, ''), '\D', '', 'g');
begin
  if length(d) = 9 and left(d, 1) = '9' then return '56' || d; end if;
  if length(d) = 8 then return '569' || d; end if;
  return d;
end $$;

-- Configuración que el administrador cambia desde su panel.
create table if not exists public.config (
  clave  text primary key,
  valor  jsonb not null
);
insert into public.config (clave, valor) values
  ('minutos_pago', '30'),            -- tiempo para pagar el abono y subir el comprobante
  ('minutos_devolucion', '10'),      -- cancelar dentro de este tiempo: se devuelve el abono
  ('horas_cancelacion', '24'),       -- anticipación mínima para cancelar/reagendar con saldo a favor
  ('dias_saldo', '90'),              -- días que dura el saldo a favor
  ('dias_regalo_negocio', '30'),      -- Premium de regalo al crear un negocio
  ('dias_aviso_vencimiento', '3'),   -- aviso antes de que venza el Premium
  ('dias_comprobantes', '30'),       -- los comprobantes se borran solos después de estos días
  ('soporte_whatsapp', '""'),
  ('vapid_publica', '""')
on conflict (clave) do nothing;
alter table public.config enable row level security;

-- Textos de la app (el administrador los edita).
create table if not exists public.textos (
  clave  text primary key,
  valor  text not null default ''
);
insert into public.textos (clave, valor) values
  ('app_nombre', 'CodeFix'),
  ('app_lema', 'Reserva tu hora en el negocio de bicicletas'),
  ('reserva_pago', 'Para confirmar tu hora paga el abono con el botón "Pagar abono" y sube la foto o captura del comprobante. Tienes {minutos} minutos; si no, la hora se libera.'),
  ('reserva_politica', 'Puedes cancelar sin costo dentro de los primeros {devolucion} minutos (se te devuelve el abono). Después, si cancelas con {horas} horas o más de anticipación, el abono queda como saldo a favor para reagendar. Si cancelas con menos de {horas} horas o no llegas, pierdes el abono. El abono se descuenta del total del servicio.'),
  ('premium_negocio_titulo', 'CodeFix Premium'),
  ('premium_negocio_texto', 'Más reservas, tu equipo de mecánicos, estadísticas y recordatorios de mantención para que tus clientes vuelvan.'),
  ('premium_cliente_titulo', 'Cliente Premium'),
  ('premium_cliente_texto', 'Historial completo de tu bici, recordatorios de mantención y reserva con más anticipación.'),
  ('pago_instrucciones', 'Toca "Pagar", paga en Mercado Pago, toma una captura del comprobante y súbela aquí. Te avisamos apenas se apruebe.'),
  ('bienvenida_negocio', '¡Bienvenido! Completa tu perfil, tu horario, tus servicios y el link de pago del abono para empezar a recibir reservas.'),
  ('terminos', 'Al usar CodeFix aceptas que tus datos (nombre, teléfono y correo) se usen solo para gestionar tus reservas con el negocio.')
on conflict (clave) do nothing;
alter table public.textos enable row level security;

-- Planes: límites y beneficios (todo editable por el administrador).
create table if not exists public.planes (
  codigo        text primary key check (codigo in ('negocio_free', 'negocio_premium', 'cliente_free', 'cliente_premium')),
  nombre        text not null,
  descripcion   text not null default '',
  limites       jsonb not null default '{}',
  beneficios    jsonb not null default '[]',
  duracion_dias int not null default 30 check (duracion_dias between 1 and 3650)
);
insert into public.planes (codigo, nombre, descripcion, limites, beneficios) values
  ('negocio_free', 'Gratis', 'Lo básico para recibir reservas online.',
   '{"reservas_mes": 30, "servicios": 5, "promos": 1, "equipo": 0, "clientes_cuenta": 30, "estadisticas": false, "recordatorios": false}',
   '["Página de reservas con tu logo y colores", "Hasta 30 reservas online al mes", "5 servicios y 1 promoción", "Abono con comprobante y agenda con bloqueos", "Órdenes de trabajo y calificaciones"]'),
  ('negocio_premium', 'Premium', 'Todo para hacer crecer tu negocio.',
   '{"reservas_mes": 1000, "servicios": 60, "promos": 15, "equipo": 10, "clientes_cuenta": 2000, "estadisticas": true, "recordatorios": true}',
   '["Reservas online casi ilimitadas (1000 al mes)", "Hasta 10 mecánicos o recepción con su propia cuenta", "60 servicios y 15 promociones", "Estadísticas de ingresos, servicios y clientes", "Recordatorios de mantención para que tus clientes vuelvan", "Hasta 2000 clientes con cuenta"]'),
  ('cliente_free', 'Gratis', 'Reserva y sigue tu bici.',
   '{"historial": 3, "anticipacion_extra": 0, "recordatorios": false}',
   '["Reserva tu hora", "Sigue el estado de tu bici", "Tus últimas 3 visitas"]'),
  ('cliente_premium', 'Premium', 'Para ciclistas que cuidan su bici.',
   '{"historial": 1000, "anticipacion_extra": 15, "recordatorios": true}',
   '["Historial completo de tu bici", "Recordatorio cuando le toca mantención", "Reserva hasta 15 días antes que el resto", "Insignia de cliente Premium"]')
on conflict (codigo) do nothing;
alter table public.planes enable row level security;

-- Secretos (claves push): solo los lee el servidor.
create table if not exists public.secretos (
  clave  text primary key,
  valor  text not null
);
alter table public.secretos enable row level security;

-- ---------------------------------------------------------------------
-- 1. Negocios y perfiles
-- ---------------------------------------------------------------------
create table if not exists public.negocios (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid unique,
  nombre            text not null check (length(trim(nombre)) between 1 and 80),
  slug              text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  descripcion       text not null default '' check (length(descripcion) <= 500),
  direccion         text not null default '' check (length(direccion) <= 160),
  comuna            text not null default '' check (length(comuna) <= 60),
  telefono          text not null default '' check (length(telefono) <= 30),
  instagram         text not null default '' check (length(instagram) <= 60),
  logo              text check (logo is null or (logo ~ '^data:image/(jpeg|png|webp);base64,' and length(logo) <= 120000)),
  color             text not null default '#16a34a' check (color ~ '^#[0-9a-fA-F]{6}$'),
  icono             text not null default '🚲' check (length(icono) <= 8),
  -- Horario y agenda
  zona              text not null default 'America/Santiago',
  dias              int[] not null default '{1,2,3,4,5,6}',
  abre              time not null default '10:00',
  cierra            time not null default '19:00',
  colacion_desde    time,
  colacion_hasta    time,
  bloque_min        int not null default 60,
  cupos             int not null default 2 check (cupos between 1 and 20),
  anticipacion_dias int not null default 21 check (anticipacion_dias between 1 and 120),
  meses_mantencion  int not null default 4 check (meses_mantencion between 1 and 24),
  reservas_online   boolean not null default true,
  -- Plan
  premium_hasta     timestamptz,
  aviso_venc_para   timestamptz,
  aviso_vencido_para timestamptz,
  activo            boolean not null default true,
  suspendido        boolean not null default false,
  created_at        timestamptz not null default now(),
  check (cierra > abre),
  check ((colacion_desde is null) = (colacion_hasta is null) and (colacion_hasta is null or colacion_hasta > colacion_desde))
);
alter table public.negocios enable row level security;
alter table public.negocios add column if not exists horarios jsonb not null default '{}';   -- {"6": {"abre": "10:00", "cierra": "14:00"}}
alter table public.negocios add column if not exists max_dia int not null default 0;         -- 0 = sin límite de bicis por día
alter table public.negocios add column if not exists capacidad_dia int not null default 0;   -- mantenciones que se terminan por día (0 = no calcular entrega)
alter table public.negocios add column if not exists max_espera_dias int not null default 14; -- tope de días hasta la entrega
alter table public.negocios add column if not exists cobro_modo text not null default 'abono';  -- 'abono' | 'total'
alter table public.negocios add column if not exists cobro_pct int not null default 30;
alter table public.negocios add column if not exists despacho boolean not null default false;
alter table public.negocios add column if not exists despacho_costo int not null default 0;
alter table public.negocios add column if not exists limites_extra jsonb not null default '{}';  -- límites propios (súper admin)
alter table public.negocios drop constraint if exists negocios_bloque_min_check;
alter table public.negocios add constraint negocios_bloque_min_check check (bloque_min in (15, 20, 30, 45, 60, 90, 120, 180, 240));

create table if not exists public.perfiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  email            text not null,
  nombre           text not null default '' check (length(nombre) <= 80),
  telefono         text not null default '' check (length(telefono) <= 30),
  rol              text not null check (rol in ('admin', 'socio', 'negocio', 'equipo', 'cliente')),
  negocio_id        uuid references public.negocios (id) on delete cascade,
  premium_hasta    timestamptz,          -- Premium del cliente
  aviso_venc_para  timestamptz,
  aviso_vencido_para timestamptz,
  suspendido       boolean not null default false,
  visto_at         timestamptz,
  created_by       uuid,
  created_at       timestamptz not null default now()
);
create index if not exists perfiles_negocio_idx on public.perfiles (negocio_id, rol);
alter table public.perfiles enable row level security;

alter table public.negocios drop constraint if exists negocios_owner_fk;
alter table public.negocios add constraint negocios_owner_fk foreign key (owner_id) references public.perfiles (id) on delete set null
  deferrable initially deferred;

-- Invitaciones: las crea el servidor (función "servidor") antes de crear la cuenta.
create table if not exists public.invitaciones (
  email        text primary key,
  rol          text not null check (rol in ('socio', 'negocio', 'equipo', 'cliente')),
  nombre       text not null default '',
  telefono     text not null default '',
  negocio_id    uuid references public.negocios (id) on delete cascade,
  negocio_nombre text not null default '',
  created_by   uuid,
  created_at   timestamptz not null default now()
);
alter table public.invitaciones enable row level security;
alter table public.invitaciones drop constraint if exists invitaciones_rol_check;
alter table public.invitaciones add constraint invitaciones_rol_check check (rol in ('socio', 'negocio', 'equipo', 'cliente'));

-- ---------------------------------------------------------------------
-- 2. Quién soy
-- ---------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles p join auth.users u on u.id = p.id
    where p.id = auth.uid() and p.rol = 'admin' and not p.suspendido
      and lower(u.email) = public.admin_email() and u.email_confirmed_at is not null)
$$;

-- Socio: ve y administra todo, crea negocios, pero no borra ni cambia reglas, precios ni links.
create or replace function public.is_socio() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'socio' and not p.suspendido)
$$;

create or replace function public.is_staff() returns boolean
language sql stable as $$ select public.is_admin() or public.is_socio() $$;

-- Negocio donde trabaja la persona (dueño o equipo), si ambos están activos.
create or replace function public.negocio_de(uid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select p.negocio_id from public.perfiles p join public.negocios t on t.id = p.negocio_id
  where p.id = uid and p.rol in ('negocio', 'equipo') and not p.suspendido and not t.suspendido
$$;

-- Negocio al que pertenece la persona (cualquier rol).
create or replace function public.mi_negocio() returns uuid
language sql stable security definer set search_path = '' as $$
  select negocio_id from public.perfiles where id = auth.uid() and not suspendido
$$;

create or replace function public.es_dueno(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p join public.negocios x on x.id = p.negocio_id
                 where p.id = auth.uid() and p.rol = 'negocio' and p.negocio_id = t and not p.suspendido and not x.suspendido)
$$;

create or replace function public.negocio_es_premium(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select premium_hasta > now() from public.negocios where id = t), false)
$$;

create or replace function public.cliente_es_premium(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select premium_hasta > now() from public.perfiles where id = uid), false)
$$;

-- Límite de un plan (número o verdadero/falso), según si el negocio/cliente es Premium.
create or replace function public.limite_negocio(t uuid, clave text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  -- Primero el límite propio del negocio (lo pone el súper admin); si no, el de su plan.
  return coalesce((select n.limites_extra -> clave from public.negocios n where n.id = t), (select limites -> clave from public.planes
    where codigo = case when public.negocio_es_premium(t) then 'negocio_premium' else 'negocio_free' end));
end $$;
create or replace function public.limite_cliente(uid uuid, clave text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select limites -> clave from public.planes
  where codigo = case when public.cliente_es_premium(uid) then 'cliente_premium' else 'cliente_free' end
$$;

create or replace function public.cfg_int(c text) returns int
language sql stable security definer set search_path = '' as $$
  select (valor #>> '{}')::int from public.config where clave = c
$$;

-- ---------------------------------------------------------------------
-- 3. Cuentas nuevas (registro cerrado)
--   · Admin: por correo.  · Negocio y equipo: solo con invitación (servidor).
--   · Cliente: se registra desde la página de SU negocio y queda asociado a él.
-- ---------------------------------------------------------------------
create or replace function public.slug_de(txt text) returns text
language plpgsql immutable as $$
declare s text;
begin
  s := lower(translate(coalesce(txt, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'));
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := trim(both '-' from s);
  if length(s) < 3 then s := s || '-negocio'; end if;
  return left(s, 50);
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  inv public.invitaciones;
  em text := lower(new.email);
  t public.negocios;
  sl text;
  tid uuid;
begin
  if em = public.admin_email() then
    insert into public.perfiles (id, email, nombre, rol) values (new.id, em, 'Administrador', 'admin')
    on conflict (id) do nothing;
    return new;
  end if;

  select * into inv from public.invitaciones where email = em and created_at > now() - interval '1 day';
  if inv.email is not null then
    if inv.rol = 'negocio' then
      sl := public.slug_de(inv.negocio_nombre);
      while exists (select 1 from public.negocios where slug = sl) loop
        sl := left(public.slug_de(inv.negocio_nombre), 44) || '-' || substr(md5(random()::text), 1, 5);
      end loop;
      insert into public.negocios (owner_id, nombre, slug, telefono, premium_hasta)
      values (new.id, left(inv.negocio_nombre, 80), sl, inv.telefono,
              now() + make_interval(days => coalesce(public.cfg_int('dias_regalo_negocio'), 30)))
      returning id into tid;
      insert into public.perfiles (id, email, nombre, telefono, rol, negocio_id, created_by)
      values (new.id, em, left(inv.nombre, 80), inv.telefono, 'negocio', tid, inv.created_by);
    else
      insert into public.perfiles (id, email, nombre, telefono, rol, negocio_id, created_by)
      values (new.id, em, left(inv.nombre, 80), inv.telefono, inv.rol, inv.negocio_id, inv.created_by);
    end if;
    delete from public.invitaciones where email = em;
    return new;
  end if;

  -- Cliente que se registra desde la página de su negocio.
  if meta ->> 'rol' = 'cliente' and (meta ->> 'negocio') ~ '^[0-9a-f-]{36}$' then
    select * into t from public.negocios where id = (meta ->> 'negocio')::uuid and activo and not suspendido;
    if t.id is null then raise exception 'Este negocio no está recibiendo clientes nuevos'; end if;
    if (select count(*) from public.perfiles where negocio_id = t.id and rol = 'cliente')
       >= coalesce((public.limite_negocio(t.id, 'clientes_cuenta'))::int, 30) then
      raise exception 'Este negocio llegó a su límite de clientes con cuenta';
    end if;
    insert into public.perfiles (id, email, nombre, telefono, rol, negocio_id)
    values (new.id, em, left(trim(coalesce(meta ->> 'nombre', '')), 80), left(trim(coalesce(meta ->> 'telefono', '')), 30), 'cliente', t.id);
    return new;
  end if;

  raise exception 'El registro está cerrado. Pide tu acceso a tu negocio.';
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Si el administrador ya había creado su usuario antes de correr este archivo.
insert into public.perfiles (id, email, nombre, rol)
select u.id, lower(u.email), 'Administrador', 'admin' from auth.users u
where lower(u.email) = public.admin_email()
on conflict (id) do nothing;

-- Lo llama SOLO el servidor antes de crear una cuenta de negocio o de equipo.
drop function if exists public.preparar_cuenta(uuid, text, text, text, text, text);
create or replace function public.preparar_cuenta(p_caller uuid, p_email text, p_nombre text, p_telefono text,
  p_rol text, p_negocio_nombre text, p_negocio uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c public.perfiles;
  em text := lower(trim(coalesce(p_email, '')));
  admin boolean;
  tid uuid;
begin
  select * into c from public.perfiles where id = p_caller and not suspendido;
  if c.id is null then return jsonb_build_object('ok', false, 'error', 'Sin permiso'); end if;
  admin := (c.rol = 'admin' and c.email = public.admin_email()) or c.rol = 'socio';
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'error', 'Correo no válido'); end if;
  if trim(coalesce(p_nombre, '')) = '' then return jsonb_build_object('ok', false, 'error', 'Escribe el nombre'); end if;
  if exists (select 1 from auth.users where lower(email) = em) then
    return jsonb_build_object('ok', false, 'error', 'Ese correo ya tiene cuenta');
  end if;
  if p_rol = 'socio' then
    if not (c.rol = 'admin' and c.email = public.admin_email()) then return jsonb_build_object('ok', false, 'error', 'Solo el súper administrador crea socios'); end if;
    insert into public.invitaciones (email, rol, nombre, telefono, created_by)
    values (em, 'socio', trim(p_nombre), trim(coalesce(p_telefono, '')), c.id)
    on conflict (email) do update set rol = excluded.rol, nombre = excluded.nombre, telefono = excluded.telefono,
      negocio_nombre = '', negocio_id = null, created_by = excluded.created_by, created_at = now();
    return jsonb_build_object('ok', true);
  end if;
  if p_rol = 'negocio' then
    if not admin then return jsonb_build_object('ok', false, 'error', 'Solo el administrador crea negocios'); end if;
    if trim(coalesce(p_negocio_nombre, '')) = '' then return jsonb_build_object('ok', false, 'error', 'Escribe el nombre del negocio'); end if;
    -- En cuentas de negocio, p_negocio trae el rubro elegido.
    insert into public.invitaciones (email, rol, nombre, telefono, negocio_nombre, rubro_id, created_by)
    values (em, 'negocio', trim(p_nombre), trim(coalesce(p_telefono, '')), trim(p_negocio_nombre),
            (select id from public.rubros where id = p_negocio), c.id)
    on conflict (email) do update set rol = excluded.rol, nombre = excluded.nombre, telefono = excluded.telefono,
      negocio_nombre = excluded.negocio_nombre, negocio_id = null, rubro_id = excluded.rubro_id,
      created_by = excluded.created_by, created_at = now();
    return jsonb_build_object('ok', true);
  end if;
  if p_rol not in ('equipo', 'cliente') then return jsonb_build_object('ok', false, 'error', 'Tipo de cuenta no válido'); end if;
  -- Equipo y clientes: el admin elige el negocio; el dueño, el suyo.
  tid := case when admin then p_negocio when c.rol = 'negocio' then public.negocio_de(c.id) end;
  if tid is null or not exists (select 1 from public.negocios where id = tid) then
    return jsonb_build_object('ok', false, 'error', case when admin then 'Elige el negocio' else 'Sin permiso' end);
  end if;
  if not admin and p_rol = 'equipo' and (select count(*) from public.perfiles where negocio_id = tid and rol = 'equipo')
     >= coalesce((public.limite_negocio(tid, 'equipo'))::int, 0) then
    return jsonb_build_object('ok', false, 'error', case when public.negocio_es_premium(tid)
      then 'Llegaste al máximo de personas en tu equipo' else 'Tu equipo es una función Premium. Activa Premium para agregar mecánicos.' end);
  end if;
  insert into public.invitaciones (email, rol, nombre, telefono, negocio_id, created_by)
  values (em, p_rol, trim(p_nombre), trim(coalesce(p_telefono, '')), tid, c.id)
  on conflict (email) do update set rol = excluded.rol, nombre = excluded.nombre, telefono = excluded.telefono,
    negocio_id = excluded.negocio_id, negocio_nombre = '', created_by = excluded.created_by, created_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.cancelar_invitacion(p_email text) returns void
language sql security definer set search_path = '' as $$
  delete from public.invitaciones where email = lower(trim(p_email))
$$;

-- ---------------------------------------------------------------------
-- 4. Servicios, promociones y bloqueos de agenda
-- ---------------------------------------------------------------------
create table if not exists public.servicios (
  id            uuid primary key default gen_random_uuid(),
  negocio_id     uuid not null references public.negocios (id) on delete cascade,
  nombre        text not null check (length(trim(nombre)) between 1 and 80),
  descripcion   text not null default '' check (length(descripcion) <= 300),
  precio        int not null default 0 check (precio >= 0),
  duracion_min  int not null default 60 check (duracion_min between 10 and 480),
  activo        boolean not null default true,
  orden         int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists servicios_t_idx on public.servicios (negocio_id);
alter table public.servicios enable row level security;
alter table public.servicios add column if not exists adicional boolean not null default false;  -- se suma a un servicio principal

create table if not exists public.promos (
  id            uuid primary key default gen_random_uuid(),
  negocio_id     uuid not null references public.negocios (id) on delete cascade,
  titulo        text not null check (length(trim(titulo)) between 1 and 80),
  texto         text not null default '' check (length(texto) <= 400),
  precio        int check (precio >= 0),
  precio_antes  int check (precio_antes >= 0),
  hasta         date,
  activa        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists promos_t_idx on public.promos (negocio_id);
alter table public.promos enable row level security;

-- Bloqueos: un día completo (desde/hasta vacíos) o un tramo de horas.
create table if not exists public.bloqueos (
  id         uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.negocios (id) on delete cascade,
  fecha      date not null,
  desde      time,
  hasta      time,
  motivo     text not null default '' check (length(motivo) <= 80),
  created_at timestamptz not null default now(),
  check ((desde is null) = (hasta is null) and (hasta is null or hasta > desde))
);
create index if not exists bloqueos_f_idx on public.bloqueos (negocio_id, fecha);
alter table public.bloqueos enable row level security;

-- Límites del plan al crear servicios y promociones.
create or replace function public.limites_catalogo() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n int; lim int;
begin
  if tg_table_name = 'servicios' then
    if tg_op = 'INSERT' then
      select count(*) into n from public.servicios where negocio_id = new.negocio_id;
      lim := coalesce((public.limite_negocio(new.negocio_id, 'servicios'))::int, 5);
      if n >= lim then raise exception 'Tu plan permite % servicios. Activa Premium para tener más.', lim; end if;
    end if;
  elsif tg_table_name = 'promos' then
    if (to_jsonb(new) ->> 'activa')::boolean and (tg_op = 'INSERT' or not (to_jsonb(old) ->> 'activa')::boolean) then
      select count(*) into n from public.promos where negocio_id = new.negocio_id and activa and id <> new.id;
      lim := coalesce((public.limite_negocio(new.negocio_id, 'promos'))::int, 1);
      if n >= lim then raise exception 'Tu plan permite % promociones activas. Activa Premium para tener más.', lim; end if;
    end if;
  end if;
  if tg_op = 'UPDATE' and new.negocio_id <> old.negocio_id then raise exception 'No se puede cambiar de negocio'; end if;
  return new;
end $$;
drop trigger if exists servicios_lim on public.servicios;
create trigger servicios_lim before insert or update on public.servicios for each row execute function public.limites_catalogo();
drop trigger if exists promos_lim on public.promos;
create trigger promos_lim before insert or update on public.promos for each row execute function public.limites_catalogo();

-- ---------------------------------------------------------------------
-- 5. Links de pago (2 por tipo; solo uno activo a la vez)
--   abono           → del negocio (le llega al negocio). Solo lo ve el negocio.
--   premium_negocio  → del administrador (el negocio paga su Premium).
--   premium_cliente → del administrador (el cliente paga su Premium).
-- ---------------------------------------------------------------------
create table if not exists public.links_pago (
  id         uuid primary key default gen_random_uuid(),
  negocio_id  uuid references public.negocios (id) on delete cascade,  -- null = del administrador
  tipo       text not null check (tipo in ('abono', 'premium_negocio', 'premium_cliente')),
  slot       smallint not null check (slot in (1, 2)),
  monto      int not null default 0 check (monto >= 0),
  url        text not null default '' check (url = '' or url ~ '^https://'),
  texto      text not null default '' check (length(texto) <= 300),
  activo     boolean not null default false,
  updated_at timestamptz not null default now(),
  check ((tipo = 'abono') = (negocio_id is not null))
);
create unique index if not exists links_pago_uni on public.links_pago (coalesce(negocio_id, '00000000-0000-0000-0000-000000000000'::uuid), tipo, slot);
alter table public.links_pago enable row level security;

insert into public.links_pago (negocio_id, tipo, slot, monto, texto, activo)
select null, x.tipo, x.slot, 4990, '', x.slot = 1
from (values ('premium_negocio', 1::smallint), ('premium_negocio', 2::smallint),
             ('premium_cliente', 1::smallint), ('premium_cliente', 2::smallint)) x(tipo, slot)
where not exists (select 1 from public.links_pago l where l.negocio_id is null and l.tipo = x.tipo and l.slot = x.slot);

create or replace function public.link_activo(p_negocio uuid, p_tipo text) returns public.links_pago
language sql stable security definer set search_path = '' as $$
  select * from public.links_pago
  where tipo = p_tipo and negocio_id is not distinct from p_negocio and activo and url <> '' and monto > 0
  order by slot limit 1
$$;

-- ---------------------------------------------------------------------
-- 6. Reservas (también son la orden de trabajo de la bici)
-- ---------------------------------------------------------------------
create table if not exists public.reservas (
  id                 uuid primary key default gen_random_uuid(),
  negocio_id          uuid not null references public.negocios (id) on delete cascade,
  servicio_id        uuid references public.servicios (id) on delete set null,
  servicio_nombre    text not null default '',
  precio             int not null default 0,
  fecha              date not null,
  hora               time not null,
  hora_fin           time not null,
  nombre             text not null check (length(trim(nombre)) between 1 and 80),
  telefono           text not null default '' check (length(telefono) <= 30),
  tel_norm           text not null default '',
  email              text not null default '' check (length(email) <= 120),
  bici               text not null default '' check (length(bici) <= 120),
  nota               text not null default '' check (length(nota) <= 500),
  cliente_id         uuid references public.perfiles (id) on delete set null,
  origen             text not null default 'online' check (origen in ('online', 'cliente', 'negocio')),
  estado             text not null default 'por_pagar' check (estado in (
                       'por_pagar', 'en_revision', 'confirmada', 'recibida', 'en_reparacion', 'esperando_repuesto',
                       'lista', 'completada', 'no_asistio', 'rechazada', 'expirada', 'cancelada')),
  expira_at          timestamptz,
  abono_monto        int not null default 0,
  abono_estado       text not null default 'pendiente' check (abono_estado in (
                       'pendiente', 'en_revision', 'pagado', 'rechazado', 'devolver', 'devuelto', 'saldo', 'perdido',
                       'aplicado', 'sin_abono', 'no_pagado')),
  saldo_hasta        timestamptz,
  motivo             text not null default '' check (length(motivo) <= 300),
  -- Trabajo
  mecanico_id        uuid references public.perfiles (id) on delete set null,
  items              jsonb not null default '[]' check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 60),
  total              int not null default 0,
  diagnostico        text not null default '' check (length(diagnostico) <= 1000),
  notas_internas     text not null default '' check (length(notas_internas) <= 1000),
  proxima_mantencion date,
  historial          jsonb not null default '[]',
  reagendada         int not null default 0,
  recordado          boolean not null default false,
  mantencion_avisada boolean not null default false,
  token              text not null unique default replace(gen_random_uuid()::text, '-', ''),
  comprobante_at     timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  completada_at      timestamptz
);
create index if not exists reservas_f_idx on public.reservas (negocio_id, fecha);
create index if not exists reservas_e_idx on public.reservas (negocio_id, estado);
create index if not exists reservas_tel_idx on public.reservas (tel_norm);
create index if not exists reservas_cli_idx on public.reservas (cliente_id);
alter table public.reservas enable row level security;
alter table public.reservas add column if not exists entrega_estimada date;

-- Comprobantes (imagen liviana). Se borran solos después de N días.
create table if not exists public.comprobantes (
  id          uuid primary key default gen_random_uuid(),
  reserva_id  uuid references public.reservas (id) on delete cascade,
  pago_id     uuid,
  imagen      text not null check (imagen ~ '^data:image/(jpeg|png|webp);base64,' and length(imagen) <= 600000),
  created_at  timestamptz not null default now(),
  check ((reserva_id is null) <> (pago_id is null))
);
create index if not exists comprobantes_r_idx on public.comprobantes (reserva_id);
create index if not exists comprobantes_p_idx on public.comprobantes (pago_id);
alter table public.comprobantes enable row level security;

-- Pagos de Premium (negocio o cliente → administrador).
create table if not exists public.pagos (
  id           uuid primary key default gen_random_uuid(),
  perfil_id    uuid not null references public.perfiles (id) on delete cascade,
  negocio_id    uuid references public.negocios (id) on delete cascade,
  tipo         text not null check (tipo in ('premium_negocio', 'premium_cliente')),
  monto        int not null default 0,
  estado       text not null default 'en_revision' check (estado in ('en_revision', 'aprobado', 'rechazado')),
  nota         text not null default '' check (length(nota) <= 300),
  created_at   timestamptz not null default now(),
  resuelto_at  timestamptz
);
create index if not exists pagos_e_idx on public.pagos (estado, created_at);
alter table public.pagos enable row level security;
alter table public.comprobantes drop constraint if exists comprobantes_pago_fk;
alter table public.comprobantes add constraint comprobantes_pago_fk foreign key (pago_id) references public.pagos (id) on delete cascade;

-- Calificaciones: el cliente califica al negocio y el negocio al cliente (una vez por visita).
create table if not exists public.calificaciones (
  id          uuid primary key default gen_random_uuid(),
  reserva_id  uuid not null references public.reservas (id) on delete cascade,
  negocio_id   uuid not null references public.negocios (id) on delete cascade,
  autor       text not null check (autor in ('cliente', 'negocio')),
  tel_norm    text not null default '',          -- cliente calificado (cuando autor = negocio)
  estrellas   int not null check (estrellas between 1 and 5),
  comentario  text not null default '' check (length(comentario) <= 300),
  created_at  timestamptz not null default now(),
  unique (reserva_id, autor)
);
create index if not exists calif_t_idx on public.calificaciones (negocio_id, autor);
create index if not exists calif_tel_idx on public.calificaciones (tel_norm, autor);
alter table public.calificaciones enable row level security;

-- Notificaciones dentro de la app (campanita) y push.
create table if not exists public.notificaciones (
  id            uuid primary key default gen_random_uuid(),
  para          uuid not null references public.perfiles (id) on delete cascade,
  titulo        text not null,
  cuerpo        text not null default '',
  url           text not null default '',
  leida         boolean not null default false,
  push_enviado  boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists notif_para_idx on public.notificaciones (para, created_at desc);
create index if not exists notif_push_idx on public.notificaciones (push_enviado, created_at) where not push_enviado;
alter table public.notificaciones enable row level security;

create table if not exists public.push_subs (
  endpoint    text primary key,
  perfil_id   uuid not null references public.perfiles (id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
alter table public.push_subs enable row level security;

-- Registro de acciones del administrador.
create table if not exists public.auditoria (
  id          bigserial primary key,
  quien       uuid,
  accion      text not null,
  detalle     text not null default '',
  created_at  timestamptz not null default now()
);
alter table public.auditoria enable row level security;

-- ---------------------------------------------------------------------
-- 7. Avisos (campanita)
-- ---------------------------------------------------------------------
create or replace function public.avisar(p_para uuid, p_titulo text, p_cuerpo text, p_url text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notificaciones (para, titulo, cuerpo, url)
  select p_para, left(p_titulo, 90), left(coalesce(p_cuerpo, ''), 240), coalesce(p_url, '')
  where p_para is not null
$$;

-- A todo el negocio (dueño y equipo activos).
create or replace function public.avisar_negocio(p_negocio uuid, p_titulo text, p_cuerpo text, p_url text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notificaciones (para, titulo, cuerpo, url)
  select p.id, left(p_titulo, 90), left(coalesce(p_cuerpo, ''), 240), coalesce(p_url, '')
  from public.perfiles p where p.negocio_id = p_negocio and p.rol in ('negocio', 'equipo') and not p.suspendido
$$;

create or replace function public.avisar_admin(p_titulo text, p_cuerpo text, p_url text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notificaciones (para, titulo, cuerpo, url)
  select p.id, left(p_titulo, 90), left(coalesce(p_cuerpo, ''), 240), coalesce(p_url, '')
  from public.perfiles p where p.rol = 'admin' and p.email = public.admin_email()
$$;

create or replace function public.auditar(p_accion text, p_detalle text) returns void
language sql security definer set search_path = '' as $$
  insert into public.auditoria (quien, accion, detalle) values (auth.uid(), p_accion, left(coalesce(p_detalle, ''), 500))
$$;

-- ---------------------------------------------------------------------
-- 8. Políticas de lectura (las escrituras pasan por funciones)
-- ---------------------------------------------------------------------
drop policy if exists "ver perfiles" on public.perfiles;
create policy "ver perfiles" on public.perfiles for select to authenticated
  using (id = auth.uid() or public.is_staff() or (negocio_id is not null and negocio_id = public.negocio_de(auth.uid())));

drop policy if exists "ver negocio" on public.negocios;
create policy "ver negocio" on public.negocios for select to authenticated
  using (public.is_staff() or id = public.mi_negocio());

drop policy if exists "ver servicios" on public.servicios;
create policy "ver servicios" on public.servicios for select to authenticated using (negocio_id = public.mi_negocio() or public.is_staff());
drop policy if exists "dueño servicios" on public.servicios;
create policy "dueño servicios" on public.servicios for all to authenticated
  using (public.es_dueno(negocio_id)) with check (public.es_dueno(negocio_id));

drop policy if exists "ver promos" on public.promos;
create policy "ver promos" on public.promos for select to authenticated using (negocio_id = public.mi_negocio() or public.is_staff());
drop policy if exists "dueño promos" on public.promos;
create policy "dueño promos" on public.promos for all to authenticated
  using (public.es_dueno(negocio_id)) with check (public.es_dueno(negocio_id));

drop policy if exists "ver bloqueos" on public.bloqueos;
create policy "ver bloqueos" on public.bloqueos for select to authenticated using (negocio_id = public.negocio_de(auth.uid()));
drop policy if exists "negocio bloqueos" on public.bloqueos;
create policy "negocio bloqueos" on public.bloqueos for all to authenticated
  using (negocio_id = public.negocio_de(auth.uid())) with check (negocio_id = public.negocio_de(auth.uid()));

drop policy if exists "ver reservas" on public.reservas;
create policy "ver reservas" on public.reservas for select to authenticated
  using (negocio_id = public.negocio_de(auth.uid()) or cliente_id = auth.uid());

drop policy if exists "mis avisos" on public.notificaciones;
create policy "mis avisos" on public.notificaciones for select to authenticated using (para = auth.uid());
drop policy if exists "leer mis avisos" on public.notificaciones;
create policy "leer mis avisos" on public.notificaciones for update to authenticated
  using (para = auth.uid()) with check (para = auth.uid());
drop policy if exists "borrar mis avisos" on public.notificaciones;
create policy "borrar mis avisos" on public.notificaciones for delete to authenticated using (para = auth.uid());

drop policy if exists "ver textos" on public.textos;
create policy "ver textos" on public.textos for select to anon, authenticated using (true);
drop policy if exists "ver planes" on public.planes;
create policy "ver planes" on public.planes for select to anon, authenticated using (true);

revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate on all tables in schema public from authenticated;
grant select on public.perfiles, public.negocios, public.servicios, public.promos, public.bloqueos, public.reservas,
  public.notificaciones, public.textos, public.planes to authenticated;
grant select on public.textos, public.planes to anon;
grant insert, update, delete on public.servicios, public.promos, public.bloqueos to authenticated;
grant update (leida), delete on public.notificaciones to authenticated;

-- En vivo (Realtime): avisos y reservas.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notificaciones') then
      alter publication supabase_realtime add table public.notificaciones;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'reservas') then
      alter publication supabase_realtime add table public.reservas;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 9. Cuenta y datos públicos
-- ---------------------------------------------------------------------
create or replace function public.config_publica() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'config', (select jsonb_object_agg(clave, valor) from public.config),
    'textos', (select jsonb_object_agg(clave, valor) from public.textos),
    'planes', (select jsonb_object_agg(codigo, jsonb_build_object('nombre', nombre, 'descripcion', descripcion,
                 'limites', limites, 'beneficios', beneficios, 'duracion_dias', duracion_dias)) from public.planes),
    'premium_negocio', (select jsonb_build_object('monto', l.monto, 'url', l.url, 'texto', l.texto)
                       from public.link_activo(null, 'premium_negocio') l where l.id is not null),
    'premium_cliente', (select jsonb_build_object('monto', l.monto, 'url', l.url, 'texto', l.texto)
                        from public.link_activo(null, 'premium_cliente') l where l.id is not null))
$$;

create or replace function public.mi_cuenta() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'email', p.email, 'nombre', p.nombre, 'telefono', p.telefono, 'rol', p.rol,
    'suspendido', p.suspendido or coalesce(t.suspendido, false),
    'is_admin', public.is_admin(), 'is_socio', public.is_socio(),
    'negocio_id', p.negocio_id,
    'negocio', case when t.id is null then null else jsonb_build_object(
       'id', t.id, 'nombre', t.nombre, 'slug', t.slug, 'logo', t.logo, 'color', t.color, 'icono', t.icono,
       'telefono', t.telefono, 'premium', public.negocio_es_premium(t.id), 'premium_hasta', t.premium_hasta) end,
    'premium', case when p.rol = 'cliente' then public.cliente_es_premium(p.id)
                    when p.rol in ('negocio', 'equipo') then public.negocio_es_premium(p.negocio_id)
                    else true end,
    'premium_hasta', case when p.rol = 'cliente' then p.premium_hasta else t.premium_hasta end)
  from public.perfiles p left join public.negocios t on t.id = p.negocio_id
  where p.id = auth.uid()
$$;

create or replace function public.registrar_visto() returns void
language sql security definer set search_path = '' as $$
  update public.perfiles set visto_at = now()
  where id = auth.uid() and (visto_at is null or visto_at < now() - interval '5 minutes')
$$;

create or replace function public.mi_perfil_guardar(p_nombre text, p_telefono text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if trim(coalesce(p_nombre, '')) = '' then raise exception 'Escribe tu nombre'; end if;
  update public.perfiles set nombre = left(trim(p_nombre), 80), telefono = left(trim(coalesce(p_telefono, '')), 30)
  where id = auth.uid();
end $$;

-- Promedio de estrellas.
create or replace function public.nota_negocio(t uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('promedio', round(avg(estrellas)::numeric, 1), 'total', count(*))
  from public.calificaciones where negocio_id = t and autor = 'cliente'
$$;
create or replace function public.nota_cliente(tel text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('promedio', round(avg(estrellas)::numeric, 1), 'total', count(*))
  from public.calificaciones where tel_norm = public.tel_norm(tel) and autor = 'negocio' and public.tel_norm(tel) <> ''
$$;

-- Página pública del negocio (por su enlace).
create or replace function public.negocio_publico(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id, 'nombre', t.nombre, 'slug', t.slug, 'descripcion', t.descripcion, 'direccion', t.direccion,
    'comuna', t.comuna, 'telefono', t.telefono, 'instagram', t.instagram, 'logo', t.logo, 'color', t.color, 'icono', t.icono,
    'dias', t.dias, 'abre', to_char(t.abre, 'HH24:MI'), 'cierra', to_char(t.cierra, 'HH24:MI'),
    'horarios', t.horarios, 'max_dia', t.max_dia, 'capacidad_dia', t.capacidad_dia,
    'colacion_desde', to_char(t.colacion_desde, 'HH24:MI'), 'colacion_hasta', to_char(t.colacion_hasta, 'HH24:MI'),
    'anticipacion_dias', t.anticipacion_dias, 'hoy', (now() at time zone t.zona)::date,
    'reservas_online', t.reservas_online and (public.link_activo(t.id, 'abono')).id is not null,
    'abono', (public.link_activo(t.id, 'abono')).monto, 'cobro_modo', t.cobro_modo,
    'nota', public.nota_negocio(t.id),
    'acepta_cuentas', (select count(*) from public.perfiles where negocio_id = t.id and rol = 'cliente')
                      < coalesce((public.limite_negocio(t.id, 'clientes_cuenta'))::int, 30),
    'servicios', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'nombre', s.nombre, 'descripcion', s.descripcion,
                    'precio', s.precio, 'duracion_min', s.duracion_min, 'adicional', s.adicional) order by s.adicional, s.orden, s.nombre), '[]')
                  from public.servicios s where s.negocio_id = t.id and s.activo),
    'promos', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'titulo', o.titulo, 'texto', o.texto, 'precio', o.precio,
                 'precio_antes', o.precio_antes, 'hasta', o.hasta) order by o.created_at desc), '[]')
               from public.promos o where o.negocio_id = t.id and o.activa and (o.hasta is null or o.hasta >= (now() at time zone t.zona)::date)))
  from public.negocios t
  where (t.slug = lower(p_slug) or t.id::text = p_slug) and t.activo and not t.suspendido
$$;

-- ---------------------------------------------------------------------
-- 10. Agenda: horas libres (considera duración, cupos, colación,
--     bloqueos y las horas retenidas mientras pagan)
-- ---------------------------------------------------------------------
create or replace function public.ocupa_hora(r public.reservas) returns boolean
language sql stable as $$
  select r.estado not in ('rechazada', 'expirada', 'cancelada')
     and not (r.estado = 'por_pagar' and r.expira_at <= now())
$$;

create or replace function public.horas_libres(p_negocio uuid, p_fecha date, p_min int, p_excluir uuid default null)
returns setof text
language plpgsql stable security definer set search_path = '' as $$
declare
  c public.negocios;
  paso int; dur int; ini int; fin int; m int; k int; x int;
  c_ini int; c_fin int; ahora timestamp; ok boolean; n int;
begin
  select * into c from public.negocios where id = p_negocio;
  if c.id is null or not c.activo or c.suspendido then return; end if;
  if not (extract(dow from p_fecha)::int = any (c.dias)) then return; end if;
  if exists (select 1 from public.bloqueos b where b.negocio_id = p_negocio and b.fecha = p_fecha and b.desde is null) then return; end if;
  ahora := now() at time zone c.zona;
  paso := c.bloque_min;
  dur := (ceil(greatest(coalesce(p_min, paso), 1)::numeric / paso) * paso)::int;
  -- Horario propio del día (si tiene) y cupo máximo de bicis por día.
  ini := (extract(epoch from coalesce((c.horarios -> (extract(dow from p_fecha)::int)::text ->> 'abre')::time, c.abre)) / 60)::int;
  fin := (extract(epoch from coalesce((c.horarios -> (extract(dow from p_fecha)::int)::text ->> 'cierra')::time, c.cierra)) / 60)::int;
  if c.max_dia > 0 and (select count(*) from public.reservas r where r.negocio_id = p_negocio and r.fecha = p_fecha
      and public.ocupa_hora(r) and (p_excluir is null or r.id <> p_excluir)) >= c.max_dia then return; end if;
  c_ini := (extract(epoch from c.colacion_desde) / 60)::int;
  c_fin := (extract(epoch from c.colacion_hasta) / 60)::int;
  m := ini;
  while m + dur <= fin loop
    ok := true;
    if p_fecha + make_interval(mins => m) <= ahora + interval '30 minutes' then ok := false; end if;
    if ok and c_ini is not null and m < c_fin and m + dur > c_ini then ok := false; end if;
    if ok and exists (select 1 from public.bloqueos b where b.negocio_id = p_negocio and b.fecha = p_fecha and b.desde is not null
                      and m < (extract(epoch from b.hasta) / 60)::int and m + dur > (extract(epoch from b.desde) / 60)::int) then
      ok := false;
    end if;
    k := 0;
    while ok and k * paso < dur loop
      x := m + k * paso;
      select count(*) into n from public.reservas r
      where r.negocio_id = p_negocio and r.fecha = p_fecha and public.ocupa_hora(r)
        and (p_excluir is null or r.id <> p_excluir)
        and x < (extract(epoch from r.hora_fin) / 60)::int and x + paso > (extract(epoch from r.hora) / 60)::int;
      if n >= c.cupos then ok := false; end if;
      k := k + 1;
    end loop;
    if ok then return next to_char(make_time(m / 60, m % 60, 0), 'HH24:MI'); end if;
    m := m + paso;
  end loop;
end $$;

-- Días con horas libres (para pintar el calendario de reserva).
create or replace function public.dias_libres(p_negocio uuid, p_min int) returns setof date
language plpgsql stable security definer set search_path = '' as $$
declare c public.negocios; d date; hoy date; extra int := 0; me public.perfiles;
begin
  select * into c from public.negocios where id = p_negocio and activo and not suspendido;
  if c.id is null then return; end if;
  select * into me from public.perfiles where id = auth.uid();
  if me.rol = 'cliente' and me.negocio_id = p_negocio then extra := coalesce((public.limite_cliente(me.id, 'anticipacion_extra'))::int, 0); end if;
  hoy := (now() at time zone c.zona)::date;
  for d in select generate_series(hoy, hoy + c.anticipacion_dias + extra, interval '1 day')::date loop
    if exists (select 1 from public.horas_libres(p_negocio, d, p_min)) then return next d; end if;
  end loop;
end $$;

create or replace function public.minutos_servicio(p_negocio uuid, p_servicio uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((select duracion_min from public.servicios where id = p_servicio and negocio_id = p_negocio),
                  (select bloque_min from public.negocios where id = p_negocio))
$$;

create or replace function public.historial_mas(h jsonb, e text) returns jsonb
language sql stable as $$
  select coalesce(h, '[]'::jsonb) || jsonb_build_object('estado', e, 'at', now(), 'por', auth.uid())
$$;

-- ---------------------------------------------------------------------
-- 11. Reservar (sin cuenta o con cuenta de cliente)
-- ---------------------------------------------------------------------
drop function if exists public.reservar(uuid, uuid, date, text, text, text, text, text, text);
create or replace function public.reservar(p_negocio uuid, p_servicio uuid, p_fecha date, p_hora text,
  p_nombre text, p_telefono text, p_email text, p_bici text, p_nota text, p_extras uuid[] default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  ex jsonb; ex_nombres text; ex_precio int; ent date;
  c public.negocios; s public.servicios; me public.perfiles; l public.links_pago;
  hoy date; extra int := 0; mins int; nom text; tel text; r public.reservas; n int;
begin
  select * into c from public.negocios where id = p_negocio and activo and not suspendido;
  if c.id is null or not c.reservas_online then return jsonb_build_object('ok', false, 'error', 'Este negocio no está recibiendo reservas online'); end if;
  l := public.link_activo(p_negocio, 'abono');
  if l.id is null then return jsonb_build_object('ok', false, 'error', 'El negocio aún no configura el pago del abono'); end if;
  select * into me from public.perfiles where id = auth.uid();
  if me.id is not null and (me.rol <> 'cliente' or me.negocio_id <> p_negocio) then me := null; end if;
  if me.id is not null then extra := coalesce((public.limite_cliente(me.id, 'anticipacion_extra'))::int, 0); end if;
  nom := left(trim(coalesce(nullif(trim(p_nombre), ''), me.nombre, '')), 80);
  tel := left(trim(coalesce(nullif(trim(p_telefono), ''), me.telefono, '')), 30);
  if nom = '' then return jsonb_build_object('ok', false, 'error', 'Escribe tu nombre'); end if;
  if length(public.tel_norm(tel)) < 9 then return jsonb_build_object('ok', false, 'error', 'Escribe tu WhatsApp'); end if;
  if p_servicio is not null then
    select * into s from public.servicios where id = p_servicio and negocio_id = p_negocio and activo and not adicional;
    if s.id is null then return jsonb_build_object('ok', false, 'error', 'Elige un servicio'); end if;
  end if;
  hoy := (now() at time zone c.zona)::date;
  if p_fecha < hoy or p_fecha > hoy + c.anticipacion_dias + extra then
    return jsonb_build_object('ok', false, 'error', 'Esa fecha no está disponible');
  end if;
  -- Límite del plan del negocio (reservas online del mes).
  select count(*) into n from public.reservas
  where negocio_id = p_negocio and origen <> 'negocio' and estado not in ('expirada', 'rechazada')
    and created_at >= date_trunc('month', now());
  if n >= coalesce((public.limite_negocio(p_negocio, 'reservas_mes'))::int, 30) then
    return jsonb_build_object('ok', false, 'error', 'El negocio no tiene más cupos online este mes. Escríbele por WhatsApp.');
  end if;
  -- Anti-abuso: máximo 2 reservas activas por teléfono en el negocio.
  select count(*) into n from public.reservas z
  where z.negocio_id = p_negocio and z.tel_norm = public.tel_norm(tel) and z.fecha >= hoy
    and z.estado in ('por_pagar', 'en_revision', 'confirmada') and public.ocupa_hora(z);
  if n >= 2 then return jsonb_build_object('ok', false, 'error', 'Ya tienes 2 reservas activas en este negocio'); end if;

  perform pg_advisory_xact_lock(hashtext('reserva:' || p_negocio::text || p_fecha::text));
  mins := coalesce(s.duracion_min, c.bloque_min);
  if not exists (select 1 from public.horas_libres(p_negocio, p_fecha, mins) h where h = p_hora) then
    return jsonb_build_object('ok', false, 'error', 'Esa hora ya no está disponible. Elige otra.');
  end if;
  mins := (ceil(mins::numeric / c.bloque_min) * c.bloque_min)::int;
  -- Entrega estimada según la cola del negocio (si calcula capacidad diaria).
  ent := public.estimar_entrega(p_negocio, p_fecha, p_hora::time, null);
  if ent is not null and ent > p_fecha + c.max_espera_dias then
    return jsonb_build_object('ok', false, 'error', 'Ese día el negocio ya tiene la cola llena. Elige otro día.');
  end if;
  -- Servicios adicionales (suman precio, no tiempo de agenda).
  select coalesce(jsonb_agg(jsonb_build_object('nombre', x.nombre, 'cant', 1, 'precio', x.precio) order by x.nombre), '[]'),
         string_agg(x.nombre, ' + ' order by x.nombre), coalesce(sum(x.precio), 0)
    into ex, ex_nombres, ex_precio
  from public.servicios x where x.negocio_id = p_negocio and x.activo and x.adicional and x.id = any (coalesce(p_extras, '{}'));
  insert into public.reservas (negocio_id, servicio_id, servicio_nombre, precio, fecha, hora, hora_fin, nombre, telefono, tel_norm,
    email, bici, nota, cliente_id, origen, estado, expira_at, abono_monto, abono_estado, historial, items, total, entrega_estimada)
  values (p_negocio, s.id, left(coalesce(s.nombre, 'Revisión general') || coalesce(' + ' || ex_nombres, ''), 300), coalesce(s.precio, 0) + ex_precio, p_fecha, p_hora::time,
    p_hora::time + make_interval(mins => mins), nom, tel, public.tel_norm(tel),
    left(lower(trim(coalesce(nullif(p_email, ''), me.email, ''))), 120), left(trim(coalesce(p_bici, '')), 120),
    left(trim(coalesce(p_nota, '')), 500), me.id, case when me.id is null then 'online' else 'cliente' end,
    'por_pagar', now() + make_interval(mins => coalesce(public.cfg_int('minutos_pago'), 30)),
    case when c.cobro_modo = 'total' and coalesce(s.precio, 0) + ex_precio > 0 then coalesce(s.precio, 0) + ex_precio else l.monto end, 'pendiente',
    public.historial_mas('[]', 'por_pagar'),
    case when s.id is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('nombre', s.nombre, 'cant', 1, 'precio', s.precio)) end || ex,
    coalesce(s.precio, 0) + ex_precio, ent)
  returning * into r;
  perform public.avisar_negocio(p_negocio, '📅 Nueva reserva', nom || ' · ' || to_char(p_fecha, 'DD/MM') || ' ' || p_hora ||
    ' · esperando abono', '/negocio/#reservas');
  return jsonb_build_object('ok', true, 'token', r.token);
end $$;

-- Detalle de la reserva por su enlace (sin cuenta).
create or replace function public.reserva_estado_vencido(r public.reservas) returns public.reservas
language plpgsql security definer set search_path = '' as $$
begin
  if r.estado = 'por_pagar' and r.expira_at <= now() then
    update public.reservas set estado = 'expirada', abono_estado = 'no_pagado', historial = public.historial_mas(historial, 'expirada'),
      updated_at = now() where id = r.id returning * into r;
  end if;
  return r;
end $$;

create or replace function public.reserva_ver(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.reservas; c public.negocios; l public.links_pago; cita timestamptz; dev int; hrs int; tipo text;
begin
  select * into r from public.reservas where token = p_token and length(p_token) >= 20;
  if r.id is null then return null; end if;
  r := public.reserva_estado_vencido(r);
  select * into c from public.negocios where id = r.negocio_id;
  l := public.link_activo(r.negocio_id, 'abono');
  cita := (r.fecha + r.hora) at time zone c.zona;
  dev := coalesce(public.cfg_int('minutos_devolucion'), 10);
  hrs := coalesce(public.cfg_int('horas_cancelacion'), 24);
  tipo := case
    when r.estado = 'por_pagar' then 'libre'
    when r.estado not in ('en_revision', 'confirmada') then null
    when now() - r.created_at <= make_interval(mins => dev) and r.reagendada = 0 then 'devolucion'
    when cita - now() >= make_interval(hours => hrs) then 'saldo'
    else 'pierde' end;
  return jsonb_build_object(
    'token', r.token, 'estado', r.estado, 'abono_estado', r.abono_estado, 'abono_monto', r.abono_monto,
    'expira_at', r.expira_at, 'fecha', r.fecha, 'hora', to_char(r.hora, 'HH24:MI'), 'servicio', r.servicio_nombre,
    'servicio_id', r.servicio_id, 'minutos', (extract(epoch from (r.hora_fin - r.hora)) / 60)::int, 'precio', r.precio, 'nombre', r.nombre, 'telefono', r.telefono, 'bici', r.bici,
    'motivo', r.motivo, 'items', r.items, 'total', r.total, 'diagnostico', r.diagnostico,
    'proxima_mantencion', r.proxima_mantencion, 'saldo_hasta', r.saldo_hasta, 'created_at', r.created_at, 'entrega_estimada', r.entrega_estimada,
    'historial', (select coalesce(jsonb_agg(jsonb_build_object('estado', h ->> 'estado', 'at', h ->> 'at')), '[]') from jsonb_array_elements(r.historial) h),
    'cita', cita, 'cancelar', tipo,
    'reagendar', (r.estado = 'confirmada' and cita - now() >= make_interval(hours => hrs))
              or (r.estado = 'cancelada' and r.abono_estado = 'saldo' and r.saldo_hasta > now()),
    'pagar_url', case when r.estado = 'por_pagar' then l.url end,
    'calificada', exists (select 1 from public.calificaciones where reserva_id = r.id and autor = 'cliente'),
    'negocio', jsonb_build_object('id', c.id, 'nombre', c.nombre, 'slug', c.slug, 'telefono', c.telefono, 'logo', c.logo,
      'color', c.color, 'icono', c.icono, 'direccion', c.direccion, 'comuna', c.comuna),
    'minutos_devolucion', dev, 'horas_cancelacion', hrs);
end $$;

-- El cliente sube la foto del comprobante del abono.
create or replace function public.reserva_comprobante(p_token text, p_imagen text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.reservas;
begin
  select * into r from public.reservas where token = p_token and length(p_token) >= 20 for update;
  if r.id is null then return jsonb_build_object('ok', false, 'error', 'Reserva no encontrada'); end if;
  r := public.reserva_estado_vencido(r);
  if r.estado = 'expirada' then return jsonb_build_object('ok', false, 'error', 'Se acabó el tiempo para pagar y la hora se liberó. Reserva de nuevo.'); end if;
  if r.estado <> 'por_pagar' then return jsonb_build_object('ok', false, 'error', 'Esta reserva ya tiene comprobante'); end if;
  if p_imagen !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' or length(p_imagen) > 600000 then
    return jsonb_build_object('ok', false, 'error', 'Imagen no válida o muy pesada');
  end if;
  delete from public.comprobantes where reserva_id = r.id;
  insert into public.comprobantes (reserva_id, imagen) values (r.id, p_imagen);
  update public.reservas set estado = 'en_revision', abono_estado = 'en_revision', comprobante_at = now(), expira_at = null,
    historial = public.historial_mas(historial, 'en_revision'), updated_at = now() where id = r.id;
  perform public.avisar_negocio(r.negocio_id, '🧾 Comprobante por revisar', r.nombre || ' · ' || to_char(r.fecha, 'DD/MM') || ' ' ||
    to_char(r.hora, 'HH24:MI') || ' · $' || r.abono_monto, '/negocio/#reservas');
  return jsonb_build_object('ok', true);
end $$;

-- Cancelar según las reglas (10 minutos: se devuelve · 24 h: saldo a favor · después: se pierde).
create or replace function public.reserva_cancelar(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb; r public.reservas; ab text; msg text;
begin
  v := public.reserva_ver(p_token);
  if v is null then return jsonb_build_object('ok', false, 'error', 'Reserva no encontrada'); end if;
  if v ->> 'cancelar' is null then return jsonb_build_object('ok', false, 'error', 'Esta reserva ya no se puede cancelar'); end if;
  select * into r from public.reservas where token = p_token for update;
  ab := case v ->> 'cancelar'
          when 'libre' then 'no_pagado'
          when 'devolucion' then case when r.estado = 'en_revision' or r.estado = 'confirmada' then 'devolver' else 'no_pagado' end
          when 'saldo' then 'saldo'
          else 'perdido' end;
  update public.reservas set estado = 'cancelada', abono_estado = ab, expira_at = null,
    saldo_hasta = case when ab = 'saldo' then now() + make_interval(days => coalesce(public.cfg_int('dias_saldo'), 90)) end,
    historial = public.historial_mas(historial, 'cancelada'), updated_at = now()
  where id = r.id;
  msg := case ab when 'devolver' then 'Devuelve el abono de $' || r.abono_monto || ' a ' || r.nombre || ' (' || r.telefono || ')'
                 when 'saldo' then 'Queda con saldo a favor de $' || r.abono_monto || ' para reagendar'
                 when 'perdido' then 'Canceló tarde: pierde el abono'
                 else 'Canceló antes de pagar' end;
  perform public.avisar_negocio(r.negocio_id, case when ab = 'devolver' then '💸 Cancelación: devolver abono' else '❌ Reserva cancelada' end,
    r.nombre || ' · ' || to_char(r.fecha, 'DD/MM') || ' ' || to_char(r.hora, 'HH24:MI') || ' · ' || msg, '/negocio/#reservas');
  return jsonb_build_object('ok', true, 'abono', ab);
end $$;

-- Reagendar (con 24 h de anticipación, o usando el saldo a favor).
create or replace function public.reserva_reagendar(p_token text, p_fecha date, p_hora text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb; r public.reservas; c public.negocios; hoy date; mins int; extra int := 0;
begin
  v := public.reserva_ver(p_token);
  if v is null then return jsonb_build_object('ok', false, 'error', 'Reserva no encontrada'); end if;
  if not (v ->> 'reagendar')::boolean then
    return jsonb_build_object('ok', false, 'error', 'Ya no se puede reagendar (faltan menos de ' || (v ->> 'horas_cancelacion') || ' horas o venció el saldo)');
  end if;
  select * into r from public.reservas where token = p_token for update;
  select * into c from public.negocios where id = r.negocio_id and activo and not suspendido;
  if c.id is null then return jsonb_build_object('ok', false, 'error', 'El negocio no está recibiendo reservas'); end if;
  if r.cliente_id is not null then extra := coalesce((public.limite_cliente(r.cliente_id, 'anticipacion_extra'))::int, 0); end if;
  hoy := (now() at time zone c.zona)::date;
  if p_fecha < hoy or p_fecha > hoy + c.anticipacion_dias + extra then return jsonb_build_object('ok', false, 'error', 'Esa fecha no está disponible'); end if;
  perform pg_advisory_xact_lock(hashtext('reserva:' || r.negocio_id::text || p_fecha::text));
  mins := (extract(epoch from (r.hora_fin - r.hora)) / 60)::int;
  if not exists (select 1 from public.horas_libres(r.negocio_id, p_fecha, mins, r.id) h where h = p_hora) then
    return jsonb_build_object('ok', false, 'error', 'Esa hora ya no está disponible. Elige otra.');
  end if;
  update public.reservas set fecha = p_fecha, hora = p_hora::time, hora_fin = p_hora::time + make_interval(mins => mins),
    estado = 'confirmada', abono_estado = 'pagado', saldo_hasta = null, recordado = false, reagendada = reagendada + 1,
    entrega_estimada = public.estimar_entrega(r.negocio_id, p_fecha, p_hora::time, r.id),
    historial = public.historial_mas(historial, 'reagendada'), updated_at = now()
  where id = r.id;
  perform public.avisar_negocio(r.negocio_id, '🔁 Reserva reagendada', r.nombre || ' · ahora el ' || to_char(p_fecha, 'DD/MM') || ' ' || p_hora,
    '/negocio/#agenda');
  return jsonb_build_object('ok', true);
end $$;

-- El cliente califica al negocio (después de la visita).
create or replace function public.reserva_calificar(p_token text, p_estrellas int, p_comentario text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.reservas;
begin
  select * into r from public.reservas where token = p_token and length(p_token) >= 20;
  if r.id is null or r.estado not in ('completada', 'lista') then
    return jsonb_build_object('ok', false, 'error', 'Podrás calificar cuando el negocio termine tu servicio');
  end if;
  if p_estrellas not between 1 and 5 then return jsonb_build_object('ok', false, 'error', 'Elige de 1 a 5 estrellas'); end if;
  insert into public.calificaciones (reserva_id, negocio_id, autor, estrellas, comentario)
  values (r.id, r.negocio_id, 'cliente', p_estrellas, left(trim(coalesce(p_comentario, '')), 300))
  on conflict (reserva_id, autor) do update set estrellas = excluded.estrellas, comentario = excluded.comentario, created_at = now();
  perform public.avisar_negocio(r.negocio_id, '⭐ Nueva calificación', r.nombre || ' te calificó con ' || p_estrellas || ' estrellas', '/negocio/#mas');
  return jsonb_build_object('ok', true);
end $$;

-- App del cliente con cuenta.
create or replace function public.cliente_inicio() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.perfiles; t public.negocios; lim int;
begin
  select * into me from public.perfiles where id = auth.uid() and rol = 'cliente';
  if me.id is null then return null; end if;
  select * into t from public.negocios where id = me.negocio_id;
  lim := coalesce((public.limite_cliente(me.id, 'historial'))::int, 3);
  return jsonb_build_object(
    'negocio', public.negocio_publico(t.slug),
    'premium', public.cliente_es_premium(me.id), 'premium_hasta', me.premium_hasta,
    'mi_nota', public.nota_cliente(me.telefono),
    'activas', (select coalesce(jsonb_agg(jsonb_build_object('token', r.token, 'estado', r.estado, 'fecha', r.fecha,
                  'hora', to_char(r.hora, 'HH24:MI'), 'servicio', r.servicio_nombre, 'abono_estado', r.abono_estado,
                  'saldo_hasta', r.saldo_hasta) order by r.fecha, r.hora), '[]')
                from public.reservas r where r.cliente_id = me.id
                  and ((r.estado in ('por_pagar', 'en_revision', 'confirmada', 'recibida', 'en_reparacion', 'esperando_repuesto', 'lista')
                        and public.ocupa_hora(r))
                       or (r.estado = 'cancelada' and r.abono_estado = 'saldo' and r.saldo_hasta > now()))),
    'historial', (select coalesce(jsonb_agg(x order by x.fecha desc), '[]') from (
                  select r.token, r.estado, r.fecha, to_char(r.hora, 'HH24:MI') as hora, r.servicio_nombre as servicio, r.total,
                         r.bici, r.diagnostico, r.items, r.proxima_mantencion,
                         exists (select 1 from public.calificaciones q where q.reserva_id = r.id and q.autor = 'cliente') as calificada
                  from public.reservas r where r.cliente_id = me.id and r.estado in ('completada', 'no_asistio')
                  order by r.fecha desc limit lim) x),
    'limite_historial', lim);
end $$;

-- ---------------------------------------------------------------------
-- 12. Panel del negocio (dueño y equipo)
-- ---------------------------------------------------------------------
create or replace function public.negocio_panel() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.negocios; tid uuid := public.negocio_de(auth.uid()); hoy date; dueno boolean;
begin
  if tid is null then raise exception 'Sin acceso al negocio'; end if;
  select * into t from public.negocios where id = tid;
  hoy := (now() at time zone t.zona)::date;
  dueno := public.es_dueno(tid);
  return jsonb_build_object(
    'negocio', to_jsonb(t) - 'aviso_venc_para' - 'aviso_vencido_para',
    'dueno', dueno, 'hoy', hoy, 'premium', public.negocio_es_premium(tid),
    'plan', (select jsonb_build_object('codigo', codigo, 'nombre', nombre, 'limites', limites) from public.planes
             where codigo = case when public.negocio_es_premium(tid) then 'negocio_premium' else 'negocio_free' end),
    'nota', public.nota_negocio(tid),
    'uso', jsonb_build_object(
      'reservas_mes', (select count(*) from public.reservas where negocio_id = tid and origen <> 'negocio'
                        and estado not in ('expirada', 'rechazada') and created_at >= date_trunc('month', now())),
      'servicios', (select count(*) from public.servicios where negocio_id = tid),
      'promos', (select count(*) from public.promos where negocio_id = tid and activa),
      'equipo', (select count(*) from public.perfiles where negocio_id = tid and rol = 'equipo'),
      'clientes_cuenta', (select count(*) from public.perfiles where negocio_id = tid and rol = 'cliente')),
    'equipo', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nombre', coalesce(nullif(p.nombre, ''), p.email), 'email', p.email,
                 'rol', p.rol, 'suspendido', p.suspendido, 'visto_at', p.visto_at) order by p.rol desc, p.created_at), '[]')
               from public.perfiles p where p.negocio_id = tid and p.rol in ('negocio', 'equipo')),
    'links', case when dueno then (select coalesce(jsonb_agg(jsonb_build_object('slot', l.slot, 'monto', l.monto, 'url', l.url,
                 'texto', l.texto, 'activo', l.activo) order by l.slot), '[]') from public.links_pago l where l.negocio_id = tid and l.tipo = 'abono') end,
    'pago_pendiente', (select jsonb_build_object('id', id, 'monto', monto, 'created_at', created_at) from public.pagos
                       where negocio_id = tid and tipo = 'premium_negocio' and estado = 'en_revision' order by created_at desc limit 1),
    'por_revisar', (select count(*) from public.reservas where negocio_id = tid and estado = 'en_revision'),
    'por_devolver', (select count(*) from public.reservas where negocio_id = tid and abono_estado = 'devolver'));
end $$;

create or replace function public.negocio_guardar(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare tid uuid := public.negocio_de(auth.uid()); sl text;
begin
  if tid is null or not public.es_dueno(tid) then raise exception 'Solo el dueño del negocio puede cambiar esto'; end if;
  if p ? 'slug' then
    sl := public.slug_de(p ->> 'slug');
    if exists (select 1 from public.negocios where slug = sl and id <> tid) then raise exception 'Ese enlace ya lo usa otro negocio'; end if;
  end if;
  update public.negocios set
    nombre = coalesce(nullif(trim(p ->> 'nombre'), ''), nombre),
    slug = coalesce(sl, slug),
    descripcion = coalesce(p ->> 'descripcion', descripcion),
    direccion = coalesce(p ->> 'direccion', direccion),
    comuna = coalesce(p ->> 'comuna', comuna),
    telefono = coalesce(p ->> 'telefono', telefono),
    instagram = coalesce(p ->> 'instagram', instagram),
    logo = case when p ? 'logo' then nullif(p ->> 'logo', '') else logo end,
    color = coalesce(p ->> 'color', color),
    icono = coalesce(nullif(p ->> 'icono', ''), icono),
    dias = coalesce((select array_agg(x::int) from jsonb_array_elements_text(p -> 'dias') x), dias),
    abre = coalesce((p ->> 'abre')::time, abre),
    cierra = coalesce((p ->> 'cierra')::time, cierra),
    colacion_desde = case when p ? 'colacion_desde' then nullif(p ->> 'colacion_desde', '')::time else colacion_desde end,
    colacion_hasta = case when p ? 'colacion_hasta' then nullif(p ->> 'colacion_hasta', '')::time else colacion_hasta end,
    bloque_min = coalesce((p ->> 'bloque_min')::int, bloque_min),
    cupos = coalesce((p ->> 'cupos')::int, cupos),
    anticipacion_dias = coalesce((p ->> 'anticipacion_dias')::int, anticipacion_dias),
    meses_mantencion = coalesce((p ->> 'meses_mantencion')::int, meses_mantencion),
    reservas_online = coalesce((p ->> 'reservas_online')::boolean, reservas_online),
    horarios = case when p ? 'horarios' and jsonb_typeof(p -> 'horarios') = 'object' then p -> 'horarios' else horarios end,
    max_dia = coalesce(least(greatest((p ->> 'max_dia')::int, 0), 200), max_dia),
    capacidad_dia = coalesce(least(greatest((p ->> 'capacidad_dia')::int, 0), 100), capacidad_dia),
    max_espera_dias = coalesce(least(greatest((p ->> 'max_espera_dias')::int, 1), 120), max_espera_dias)
  where id = tid;
  if exists (select 1 from public.negocios t, jsonb_each(t.horarios) h where t.id = tid
             and (h.value ->> 'cierra')::time <= (h.value ->> 'abre')::time) then
    raise exception 'Revisa el horario: el cierre debe ser después de la apertura';
  end if;
  return public.negocio_panel();
end $$;

-- Links de pago del abono (2 espacios, uno activo).
create or replace function public.link_guardar(p_tipo text, p_slot int, p_monto int, p_url text, p_texto text, p_activar boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare tid uuid;
begin
  if p_tipo = 'abono' then
    tid := public.negocio_de(auth.uid());
    if tid is null or not public.es_dueno(tid) then raise exception 'Solo el dueño del negocio'; end if;
  elsif p_tipo in ('premium_negocio', 'premium_cliente') then
    if not public.is_admin() then raise exception 'Solo el administrador'; end if;
    tid := null;
  else raise exception 'Tipo no válido'; end if;
  if p_slot not in (1, 2) then raise exception 'Espacio no válido'; end if;
  if coalesce(p_url, '') <> '' and p_url !~ '^https://' then raise exception 'El link debe empezar con https://'; end if;
  if p_activar and (coalesce(p_url, '') = '' or coalesce(p_monto, 0) <= 0) then raise exception 'Para activarlo pon el monto y el link'; end if;
  insert into public.links_pago (negocio_id, tipo, slot, monto, url, texto, activo)
  values (tid, p_tipo, p_slot, greatest(coalesce(p_monto, 0), 0), coalesce(p_url, ''), left(coalesce(p_texto, ''), 300), coalesce(p_activar, false))
  on conflict (coalesce(negocio_id, '00000000-0000-0000-0000-000000000000'::uuid), tipo, slot)
  do update set monto = excluded.monto, url = excluded.url, texto = excluded.texto, activo = excluded.activo, updated_at = now();
  if p_activar then
    update public.links_pago set activo = false where tipo = p_tipo and negocio_id is not distinct from tid and slot <> p_slot;
  end if;
  if tid is null then perform public.auditar('link', p_tipo || ' espacio ' || p_slot || ' $' || p_monto || case when p_activar then ' (activo)' else '' end); end if;
end $$;

-- Reservas del negocio en un rango de fechas (con la nota del cliente).
drop function if exists public.negocio_reservas(date, date, text[]);
create or replace function public.negocio_reservas(p_desde date, p_hasta date, p_estados text[] default null, p_id uuid default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x.fecha, x.hora), '[]') from (
    select r.id, r.fecha, to_char(r.hora, 'HH24:MI') as hora, to_char(r.hora_fin, 'HH24:MI') as hora_fin, r.nombre, r.telefono,
      r.email, r.bici, r.nota, r.servicio_id, r.servicio_nombre, r.precio, r.estado, r.abono_monto, r.abono_estado, r.expira_at,
      r.origen, r.cliente_id, r.mecanico_id, r.items, r.total, r.diagnostico, r.notas_internas, r.proxima_mantencion,
      r.token, r.motivo, r.reagendada, r.created_at, r.comprobante_at, r.saldo_hasta, r.entrega_estimada,
      exists (select 1 from public.comprobantes k where k.reserva_id = r.id) as tiene_comprobante,
      public.nota_cliente(r.telefono) as nota_cliente,
      exists (select 1 from public.calificaciones q where q.reserva_id = r.id and q.autor = 'negocio') as calificado,
      (select count(*) from public.reservas z where z.negocio_id = r.negocio_id and z.tel_norm = r.tel_norm and z.estado = 'no_asistio') as faltas
    from public.reservas r
    where r.negocio_id = public.negocio_de(auth.uid())
      and ((p_id is not null and r.id = p_id) or (p_id is null
        and ((r.fecha between p_desde and p_hasta) or (p_estados is not null and r.estado = any (p_estados)))
        and (p_estados is null or r.estado = any (p_estados))
        and not (r.estado = 'por_pagar' and r.expira_at <= now())))
  ) x
$$;

create or replace function public.negocio_comprobante(p_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select k.imagen from public.comprobantes k join public.reservas r on r.id = k.reserva_id
  where k.reserva_id = p_id and r.negocio_id = public.negocio_de(auth.uid())
  order by k.created_at desc limit 1
$$;

-- Aprobar o rechazar el comprobante del abono.
create or replace function public.negocio_revisar(p_id uuid, p_aprobar boolean, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.reservas;
begin
  select * into r from public.reservas where id = p_id and negocio_id = public.negocio_de(auth.uid()) for update;
  if r.id is null then raise exception 'Reserva no encontrada'; end if;
  if r.estado <> 'en_revision' then raise exception 'Esta reserva no está en revisión'; end if;
  update public.reservas set
    estado = case when p_aprobar then 'confirmada' else 'rechazada' end,
    abono_estado = case when p_aprobar then 'pagado' else 'rechazado' end,
    motivo = case when p_aprobar then '' else left(coalesce(p_motivo, ''), 300) end,
    historial = public.historial_mas(historial, case when p_aprobar then 'confirmada' else 'rechazada' end), updated_at = now()
  where id = r.id;
  perform public.avisar(r.cliente_id, case when p_aprobar then '✅ Reserva confirmada' else '❌ Comprobante rechazado' end,
    to_char(r.fecha, 'DD/MM') || ' ' || to_char(r.hora, 'HH24:MI') || case when p_aprobar then ' · ¡Te esperamos!' else ' · ' || coalesce(p_motivo, '') end,
    '/r/?t=' || r.token);
end $$;

-- Cambiar el estado del trabajo (recibida → reparación → lista → completada, no llegó, cancelar).
create or replace function public.negocio_estado(p_id uuid, p_estado text) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.reservas; c public.negocios; ab text;
begin
  select * into r from public.reservas where id = p_id and negocio_id = public.negocio_de(auth.uid()) for update;
  if r.id is null then raise exception 'Reserva no encontrada'; end if;
  if p_estado not in ('confirmada', 'recibida', 'en_reparacion', 'esperando_repuesto', 'lista', 'completada', 'no_asistio', 'cancelada') then
    raise exception 'Estado no válido';
  end if;
  if r.estado in ('por_pagar', 'en_revision', 'rechazada', 'expirada', 'cancelada') then
    raise exception 'Primero confirma la reserva (revisa el comprobante)';
  end if;
  select * into c from public.negocios where id = r.negocio_id;
  ab := r.abono_estado;
  if p_estado = 'completada' and ab = 'pagado' then ab := 'aplicado'; end if;
  if p_estado = 'no_asistio' and ab = 'pagado' then ab := 'perdido'; end if;
  if p_estado = 'cancelada' and ab = 'pagado' then ab := 'devolver'; end if;
  update public.reservas set estado = p_estado, abono_estado = ab,
    completada_at = case when p_estado = 'completada' then now() else completada_at end,
    proxima_mantencion = case when p_estado = 'completada' and proxima_mantencion is null
                              then (current_date + make_interval(months => c.meses_mantencion))::date else proxima_mantencion end,
    historial = public.historial_mas(historial, p_estado), updated_at = now()
  where id = r.id;
  perform public.avisar(r.cliente_id,
    case p_estado when 'recibida' then '🚲 Recibimos tu bici' when 'en_reparacion' then '🔧 Tu bici está en reparación'
      when 'esperando_repuesto' then '📦 Esperando un repuesto' when 'lista' then '✅ ¡Tu bici está lista!'
      when 'completada' then '🎉 ¡Gracias por venir!' when 'no_asistio' then '🚫 No llegaste a tu hora'
      when 'cancelada' then '❌ El negocio canceló tu reserva' else '📅 Reserva actualizada' end,
    c.nombre || ' · ' || to_char(r.fecha, 'DD/MM'), '/r/?t=' || r.token);
end $$;

-- Detalle del trabajo: servicios y repuestos, diagnóstico, mecánico.
create or replace function public.negocio_trabajo(p_id uuid, p_items jsonb, p_diagnostico text, p_notas text,
  p_mecanico uuid, p_proxima date) returns void
language plpgsql security definer set search_path = '' as $$
declare tid uuid := public.negocio_de(auth.uid()); tot int;
begin
  if tid is null then raise exception 'Sin acceso'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'Ítems no válidos'; end if;
  if p_mecanico is not null and not exists (select 1 from public.perfiles where id = p_mecanico and negocio_id = tid and rol in ('negocio', 'equipo')) then
    raise exception 'Mecánico no válido';
  end if;
  select coalesce(sum(greatest(coalesce((i ->> 'cant')::numeric, 1), 0) * greatest(coalesce((i ->> 'precio')::numeric, 0), 0)), 0)::int
    into tot from jsonb_array_elements(p_items) i;
  update public.reservas set items = p_items, total = tot, diagnostico = left(coalesce(p_diagnostico, ''), 1000),
    notas_internas = left(coalesce(p_notas, ''), 1000), mecanico_id = p_mecanico, proxima_mantencion = p_proxima, updated_at = now()
  where id = p_id and negocio_id = tid;
  if not found then raise exception 'Reserva no encontrada'; end if;
end $$;

-- Reserva hecha por el negocio (teléfono, mesón): sin abono.
create or replace function public.negocio_reserva_manual(p_fecha date, p_hora text, p_servicio uuid, p_nombre text,
  p_telefono text, p_bici text, p_nota text, p_sobrecupo boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare tid uuid := public.negocio_de(auth.uid()); c public.negocios; s public.servicios; mins int;
begin
  if tid is null then raise exception 'Sin acceso'; end if;
  select * into c from public.negocios where id = tid;
  if trim(coalesce(p_nombre, '')) = '' then raise exception 'Escribe el nombre del cliente'; end if;
  if p_servicio is not null then select * into s from public.servicios where id = p_servicio and negocio_id = tid; end if;
  mins := coalesce(s.duracion_min, c.bloque_min);
  perform pg_advisory_xact_lock(hashtext('reserva:' || tid::text || p_fecha::text));
  if not coalesce(p_sobrecupo, false) and not exists (select 1 from public.horas_libres(tid, p_fecha, mins) h where h = p_hora) then
    raise exception 'Esa hora no está libre (marca "sobrecupo" para agendar igual)';
  end if;
  mins := (ceil(mins::numeric / c.bloque_min) * c.bloque_min)::int;
  insert into public.reservas (negocio_id, servicio_id, servicio_nombre, precio, fecha, hora, hora_fin, nombre, telefono, tel_norm,
    bici, nota, origen, estado, abono_monto, abono_estado, historial, items, total, entrega_estimada)
  values (tid, s.id, coalesce(s.nombre, 'Revisión general'), coalesce(s.precio, 0), p_fecha, p_hora::time, p_hora::time + make_interval(mins => mins),
    left(trim(p_nombre), 80), left(trim(coalesce(p_telefono, '')), 30), public.tel_norm(p_telefono), left(trim(coalesce(p_bici, '')), 120),
    left(trim(coalesce(p_nota, '')), 500), 'negocio', 'confirmada', 0, 'sin_abono', public.historial_mas('[]', 'confirmada'),
    case when s.id is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('nombre', s.nombre, 'cant', 1, 'precio', s.precio)) end,
    coalesce(s.precio, 0), public.estimar_entrega(tid, p_fecha, p_hora::time, null));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.negocio_devuelto(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.reservas set abono_estado = 'devuelto', historial = public.historial_mas(historial, 'abono_devuelto'), updated_at = now()
  where id = p_id and negocio_id = public.negocio_de(auth.uid()) and abono_estado = 'devolver';
  if not found then raise exception 'No hay abono por devolver'; end if;
end $$;

-- El negocio califica al cliente.
create or replace function public.negocio_calificar(p_id uuid, p_estrellas int, p_comentario text) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.reservas;
begin
  select * into r from public.reservas where id = p_id and negocio_id = public.negocio_de(auth.uid());
  if r.id is null then raise exception 'Reserva no encontrada'; end if;
  if r.estado not in ('completada', 'lista', 'no_asistio') then raise exception 'Califica al cliente después de la visita'; end if;
  if p_estrellas not between 1 and 5 then raise exception 'Elige de 1 a 5 estrellas'; end if;
  if r.tel_norm = '' then raise exception 'La reserva no tiene teléfono'; end if;
  insert into public.calificaciones (reserva_id, negocio_id, autor, tel_norm, estrellas, comentario)
  values (r.id, r.negocio_id, 'negocio', r.tel_norm, p_estrellas, left(trim(coalesce(p_comentario, '')), 300))
  on conflict (reserva_id, autor) do update set estrellas = excluded.estrellas, comentario = excluded.comentario, created_at = now();
end $$;

-- Clientes del negocio (por teléfono), con su nota y su historial.
create or replace function public.negocio_clientes() returns jsonb
language sql stable security definer set search_path = '' as $$
  with tid as (select public.negocio_de(auth.uid()) as id),
  r as (
    select r.tel_norm, max(r.nombre) as nombre, max(r.telefono) as telefono, max(r.email) as email,
      count(*) filter (where r.estado = 'completada') as visitas, count(*) filter (where r.estado = 'no_asistio') as faltas,
      max(r.fecha) filter (where r.estado = 'completada') as ultima, coalesce(sum(r.total) filter (where r.estado = 'completada'), 0) as gastado,
      max(r.proxima_mantencion) as proxima
    from public.reservas r, tid where r.negocio_id = tid.id and r.tel_norm <> '' and r.estado not in ('expirada')
    group by r.tel_norm),
  c as (select p.id, p.nombre, p.telefono, p.email, public.tel_norm(p.telefono) as tel_norm, public.cliente_es_premium(p.id) as premium
        from public.perfiles p, tid where p.negocio_id = tid.id and p.rol = 'cliente')
  select coalesce(jsonb_agg(jsonb_build_object(
    'tel_norm', coalesce(r.tel_norm, c.tel_norm), 'nombre', coalesce(c.nombre, r.nombre), 'telefono', coalesce(r.telefono, c.telefono),
    'email', coalesce(c.email, r.email), 'cuenta', c.id is not null, 'cliente_id', c.id, 'premium', coalesce(c.premium, false),
    'visitas', coalesce(r.visitas, 0), 'faltas', coalesce(r.faltas, 0), 'ultima', r.ultima, 'gastado', coalesce(r.gastado, 0),
    'proxima', r.proxima, 'nota', public.nota_cliente(coalesce(r.telefono, c.telefono))) order by coalesce(c.nombre, r.nombre)), '[]')
  from r full join c on c.tel_norm = r.tel_norm
  where (select id from tid) is not null
$$;

create or replace function public.negocio_equipo_suspender(p_id uuid, p_suspender boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.perfiles set suspendido = p_suspender
  where id = p_id and rol = 'equipo' and public.es_dueno(negocio_id);
  if not found then raise exception 'Sin permiso'; end if;
end $$;

-- Estadísticas (Premium).
create or replace function public.negocio_estadisticas() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare tid uuid := public.negocio_de(auth.uid());
begin
  if tid is null then raise exception 'Sin acceso'; end if;
  if not coalesce((public.limite_negocio(tid, 'estadisticas'))::boolean, false) then
    return jsonb_build_object('bloqueado', true);
  end if;
  return jsonb_build_object(
    'meses', (select coalesce(jsonb_agg(x order by x.mes), '[]') from (
       select to_char(date_trunc('month', completada_at), 'YYYY-MM') as mes, count(*) as trabajos, sum(total) as ingresos
       from public.reservas where negocio_id = tid and estado = 'completada' and completada_at > now() - interval '6 months'
       group by 1) x),
    'servicios', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (
       select servicio_nombre as nombre, count(*) as n from public.reservas where negocio_id = tid and estado = 'completada'
         and completada_at > now() - interval '90 days' group by 1 order by 2 desc limit 8) x),
    'faltas', (select count(*) from public.reservas where negocio_id = tid and estado = 'no_asistio' and fecha > current_date - 90),
    'abonos_perdidos', (select coalesce(sum(abono_monto), 0) from public.reservas where negocio_id = tid and abono_estado = 'perdido'
                        and updated_at > now() - interval '90 days'),
    'canceladas', (select count(*) from public.reservas where negocio_id = tid and estado = 'cancelada' and updated_at > now() - interval '90 days'),
    'online', (select count(*) from public.reservas where negocio_id = tid and origen <> 'negocio' and created_at > now() - interval '90 days'
               and estado not in ('expirada', 'rechazada')));
end $$;

-- Mantenciones por recordar (Premium).
create or replace function public.negocio_recordatorios() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare tid uuid := public.negocio_de(auth.uid());
begin
  if tid is null then raise exception 'Sin acceso'; end if;
  if not coalesce((public.limite_negocio(tid, 'recordatorios'))::boolean, false) then return jsonb_build_object('bloqueado', true); end if;
  return jsonb_build_object('lista', (select coalesce(jsonb_agg(x order by x.proxima), '[]') from (
    select distinct on (r.tel_norm) r.nombre, r.telefono, r.bici, r.proxima_mantencion as proxima, r.fecha as ultima
    from public.reservas r where r.negocio_id = tid and r.estado = 'completada' and r.proxima_mantencion <= current_date + 15
      and not exists (select 1 from public.reservas z where z.negocio_id = tid and z.tel_norm = r.tel_norm and z.fecha > r.fecha
                      and z.estado not in ('expirada', 'rechazada', 'cancelada'))
    order by r.tel_norm, r.fecha desc) x));
end $$;

-- Limpiar comprobantes ya revisados (botón del negocio).
create or replace function public.negocio_limpiar_comprobantes() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from public.comprobantes k using public.reservas r
  where k.reserva_id = r.id and r.negocio_id = public.negocio_de(auth.uid()) and public.es_dueno(r.negocio_id)
    and r.estado <> 'en_revision';
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- 13. Premium: pagar con link y subir el comprobante (negocio o cliente → admin)
-- ---------------------------------------------------------------------
create or replace function public.premium_pagar(p_tipo text, p_imagen text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.perfiles; l public.links_pago; pg public.pagos; quien text;
begin
  select * into me from public.perfiles where id = auth.uid() and not suspendido;
  if me.id is null then return jsonb_build_object('ok', false, 'error', 'Inicia sesión'); end if;
  if p_tipo = 'premium_negocio' and not (me.rol = 'negocio' and public.es_dueno(me.negocio_id)) then
    return jsonb_build_object('ok', false, 'error', 'Solo el dueño del negocio');
  end if;
  if p_tipo = 'premium_cliente' and me.rol <> 'cliente' then return jsonb_build_object('ok', false, 'error', 'Solo clientes'); end if;
  if p_tipo not in ('premium_negocio', 'premium_cliente') then return jsonb_build_object('ok', false, 'error', 'Tipo no válido'); end if;
  l := public.link_activo(null, p_tipo);
  if l.id is null then return jsonb_build_object('ok', false, 'error', 'El pago aún no está disponible'); end if;
  if p_imagen !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' or length(p_imagen) > 600000 then
    return jsonb_build_object('ok', false, 'error', 'Imagen no válida o muy pesada');
  end if;
  if exists (select 1 from public.pagos where perfil_id = me.id and estado = 'en_revision') then
    return jsonb_build_object('ok', false, 'error', 'Ya tienes un comprobante en revisión');
  end if;
  insert into public.pagos (perfil_id, negocio_id, tipo, monto) values (me.id, case when p_tipo = 'premium_negocio' then me.negocio_id end, p_tipo, l.monto)
  returning * into pg;
  insert into public.comprobantes (pago_id, imagen) values (pg.id, p_imagen);
  quien := case when p_tipo = 'premium_negocio' then (select nombre from public.negocios where id = me.negocio_id)
                else coalesce(nullif(me.nombre, ''), me.email) || ' (cliente)' end;
  perform public.avisar_admin('💰 Pago Premium por revisar', quien || ' · $' || l.monto, '/admin/#pagos');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.mi_pago_pendiente() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', id, 'monto', monto, 'estado', estado, 'created_at', created_at, 'nota', nota)
  from public.pagos where perfil_id = auth.uid() order by created_at desc limit 1
$$;

-- ---------------------------------------------------------------------
-- 14. Panel del administrador
-- ---------------------------------------------------------------------
create or replace function public.admin_check() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'Solo el administrador'; end if;
end $$;

-- Acciones que solo hace el súper administrador (borrar, reglas, precios, links, textos).
create or replace function public.super_check() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Solo el súper administrador'; end if;
end $$;

create or replace function public.admin_resumen() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare tablas jsonb;
begin
  perform public.admin_check();
  select jsonb_object_agg(t, pg_total_relation_size(('public.' || t)::regclass)) into tablas
  from unnest(array['perfiles', 'negocios', 'servicios', 'promos', 'reservas', 'comprobantes', 'pagos', 'calificaciones',
                    'notificaciones', 'push_subs', 'auditoria']) t;
  return jsonb_build_object(
    'negocios', (select count(*) from public.negocios),
    'negocios_premium', (select count(*) from public.negocios where premium_hasta > now()),
    'negocios_activos_7d', (select count(distinct p.negocio_id) from public.perfiles p where p.rol in ('negocio', 'equipo') and p.visto_at > now() - interval '7 days'),
    'clientes', (select count(*) from public.perfiles where rol = 'cliente'),
    'clientes_premium', (select count(*) from public.perfiles where rol = 'cliente' and premium_hasta > now()),
    'equipo', (select count(*) from public.perfiles where rol = 'equipo'),
    'reservas_mes', (select count(*) from public.reservas where created_at >= date_trunc('month', now()) and estado not in ('expirada', 'rechazada')),
    'reservas_hoy', (select count(*) from public.reservas where created_at >= current_date),
    'pagos_por_revisar', (select count(*) from public.pagos where estado = 'en_revision'),
    'ingresos_mes', (select coalesce(sum(monto), 0) from public.pagos where estado = 'aprobado' and resuelto_at >= date_trunc('month', now())),
    'por_vencer', (select count(*) from public.negocios where premium_hasta between now() and now() + interval '7 days'),
    'uso', jsonb_build_object('db_bytes', pg_database_size(current_database()), 'db_limite', 500 * 1024 * 1024, 'tablas', tablas,
      'comprobantes', (select count(*) from public.comprobantes), 'comprobantes_bytes', (select coalesce(sum(length(imagen)), 0) from public.comprobantes),
      'logos_bytes', (select coalesce(sum(length(logo)), 0) from public.negocios),
      'notificaciones', (select count(*) from public.notificaciones), 'reservas', (select count(*) from public.reservas)),
    'version', public.db_version());
end $$;

create or replace function public.admin_negocios() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_check();
  return (select coalesce(jsonb_agg(x order by x.created_at desc), '[]') from (
    select t.id, t.nombre, t.slug, t.telefono, t.comuna, t.logo, t.color, t.icono, t.premium_hasta, t.premium_hasta > now() as premium,
      t.activo, t.suspendido, t.created_at, t.reservas_online,
      o.email, o.nombre as dueno, o.visto_at as dueno_visto,
      (select max(p.visto_at) from public.perfiles p where p.negocio_id = t.id and p.rol in ('negocio', 'equipo')) as visto_at,
      (select count(*) from public.perfiles p where p.negocio_id = t.id and p.rol = 'cliente') as clientes_cuenta,
      (select count(*) from public.perfiles p where p.negocio_id = t.id and p.rol = 'equipo') as equipo,
      (select count(distinct r.tel_norm) from public.reservas r where r.negocio_id = t.id and r.tel_norm <> '') as clientes,
      (select count(*) from public.reservas r where r.negocio_id = t.id and r.created_at >= date_trunc('month', now())
         and r.estado not in ('expirada', 'rechazada')) as reservas_mes,
      (select count(*) from public.reservas r where r.negocio_id = t.id and r.estado not in ('expirada', 'rechazada')) as reservas_total,
      (select count(*) from public.servicios s where s.negocio_id = t.id) as servicios,
      (select count(*) from public.promos s where s.negocio_id = t.id and s.activa) as promos,
      (public.link_activo(t.id, 'abono')).id is not null as cobra_abono,
      public.nota_negocio(t.id) as nota, public.negocio_rubro(t.id) as rubro
    from public.negocios t left join public.perfiles o on o.id = t.owner_id) x);
end $$;

create or replace function public.admin_clientes() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_check();
  return (select coalesce(jsonb_agg(x order by x.created_at desc), '[]') from (
    select p.id, p.rol, p.nombre, p.email, p.telefono, p.premium_hasta, p.premium_hasta > now() as premium, p.suspendido, p.visto_at,
      p.created_at, t.nombre as negocio, t.id as negocio_id, public.nota_cliente(p.telefono) as nota,
      (select count(*) from public.reservas r where r.cliente_id = p.id and r.estado = 'completada') as visitas
    from public.perfiles p left join public.negocios t on t.id = p.negocio_id where p.rol in ('cliente', 'equipo') limit 5000) x);
end $$;

-- Dar o quitar Premium (días; 0 = quitar).
create or replace function public.admin_premium(p_tipo text, p_id uuid, p_dias int) returns void
language plpgsql security definer set search_path = '' as $$
declare h timestamptz; owner uuid; nom text;
begin
  perform public.admin_check();
  if p_tipo = 'negocio' then
    update public.negocios set premium_hasta = case when coalesce(p_dias, 0) <= 0 then now()
      else greatest(coalesce(premium_hasta, now()), now()) + make_interval(days => p_dias) end
    where id = p_id returning premium_hasta, owner_id, nombre into h, owner, nom;
    if not found then raise exception 'Negocio no encontrado'; end if;
    perform public.avisar_negocio(p_id, case when p_dias > 0 then '⭐ Premium activado' else 'Tu Premium terminó' end,
      case when p_dias > 0 then 'Tu Premium está activo hasta el ' || to_char(h at time zone 'America/Santiago', 'DD/MM/YYYY') else 'Tu negocio volvió a la versión gratis.' end,
      '/negocio/#mas');
  elsif p_tipo = 'cliente' then
    update public.perfiles set premium_hasta = case when coalesce(p_dias, 0) <= 0 then now()
      else greatest(coalesce(premium_hasta, now()), now()) + make_interval(days => p_dias) end
    where id = p_id and rol = 'cliente' returning premium_hasta, nombre into h, nom;
    if not found then raise exception 'Cliente no encontrado'; end if;
    perform public.avisar(p_id, case when p_dias > 0 then '⭐ Premium activado' else 'Tu Premium terminó' end,
      case when p_dias > 0 then 'Activo hasta el ' || to_char(h at time zone 'America/Santiago', 'DD/MM/YYYY') else 'Volviste a la versión gratis.' end, '/cliente/');
  else raise exception 'Tipo no válido'; end if;
  perform public.auditar('premium', p_tipo || ' ' || coalesce(nom, '') || ': ' || case when p_dias > 0 then '+' || p_dias || ' días' else 'quitado' end);
end $$;

create or replace function public.admin_suspender(p_tipo text, p_id uuid, p_suspender boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  if p_tipo = 'negocio' then
    update public.negocios set suspendido = p_suspender where id = p_id;
  else
    update public.perfiles set suspendido = p_suspender where id = p_id and rol <> 'admin';
  end if;
  perform public.auditar(case when p_suspender then 'suspender' else 'reactivar' end, p_tipo || ' ' || p_id);
end $$;

create or replace function public.admin_pagos(p_estado text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_check();
  return (select coalesce(jsonb_agg(x order by x.created_at desc), '[]') from (
    select g.id, g.tipo, g.monto, g.estado, g.nota, g.created_at, g.resuelto_at,
      coalesce(t.nombre, nullif(p.nombre, ''), p.email) as quien, p.email, p.telefono,
      case when g.tipo = 'premium_negocio' then t.premium_hasta else p.premium_hasta end as premium_hasta,
      exists (select 1 from public.comprobantes k where k.pago_id = g.id) as tiene_comprobante
    from public.pagos g join public.perfiles p on p.id = g.perfil_id left join public.negocios t on t.id = g.negocio_id
    where p_estado is null or g.estado = p_estado limit 300) x);
end $$;

create or replace function public.admin_pago_comprobante(p_id uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_check();
  return (select imagen from public.comprobantes where pago_id = p_id order by created_at desc limit 1);
end $$;

create or replace function public.admin_pago_resolver(p_id uuid, p_aprobar boolean, p_nota text) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.pagos; dias int;
begin
  perform public.admin_check();
  select * into g from public.pagos where id = p_id for update;
  if g.id is null or g.estado <> 'en_revision' then raise exception 'Este pago ya fue revisado'; end if;
  update public.pagos set estado = case when p_aprobar then 'aprobado' else 'rechazado' end, nota = left(coalesce(p_nota, ''), 300),
    resuelto_at = now() where id = g.id;
  if p_aprobar then
    select duracion_dias into dias from public.planes where codigo = case when g.tipo = 'premium_negocio' then 'negocio_premium' else 'cliente_premium' end;
    if g.tipo = 'premium_negocio' then perform public.admin_premium('negocio', g.negocio_id, coalesce(dias, 30));
    else perform public.admin_premium('cliente', g.perfil_id, coalesce(dias, 30)); end if;
  else
    perform public.avisar(g.perfil_id, '❌ Pago rechazado', coalesce(nullif(p_nota, ''), 'Revisa el comprobante e inténtalo de nuevo.'),
      case when g.tipo = 'premium_negocio' then '/negocio/#mas' else '/cliente/' end);
  end if;
  perform public.auditar('pago', g.tipo || ' $' || g.monto || ' ' || case when p_aprobar then 'aprobado' else 'rechazado' end);
end $$;

create or replace function public.admin_links() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.super_check();
  return (select coalesce(jsonb_agg(jsonb_build_object('tipo', tipo, 'slot', slot, 'monto', monto, 'url', url, 'texto', texto,
    'activo', activo) order by tipo, slot), '[]') from public.links_pago where negocio_id is null);
end $$;

create or replace function public.admin_plan_guardar(p_codigo text, p_nombre text, p_descripcion text, p_limites jsonb,
  p_beneficios jsonb, p_duracion int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  if jsonb_typeof(p_limites) <> 'object' or jsonb_typeof(p_beneficios) <> 'array' then raise exception 'Datos no válidos'; end if;
  update public.planes set nombre = left(trim(p_nombre), 40), descripcion = left(coalesce(p_descripcion, ''), 300),
    limites = p_limites, beneficios = p_beneficios, duracion_dias = greatest(1, least(coalesce(p_duracion, 30), 3650))
  where codigo = p_codigo;
  if not found then raise exception 'Plan no encontrado'; end if;
  perform public.auditar('plan', p_codigo);
end $$;

create or replace function public.admin_config_guardar(p_clave text, p_valor jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  if p_clave not in ('minutos_pago', 'minutos_devolucion', 'horas_cancelacion', 'dias_saldo', 'dias_regalo_negocio',
                     'dias_aviso_vencimiento', 'dias_comprobantes', 'soporte_whatsapp', 'vapid_publica') then
    raise exception 'Ajuste no válido';
  end if;
  insert into public.config (clave, valor) values (p_clave, p_valor) on conflict (clave) do update set valor = excluded.valor;
  perform public.auditar('ajuste', p_clave || ' = ' || p_valor::text);
end $$;

create or replace function public.admin_texto_guardar(p_clave text, p_valor text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  update public.textos set valor = left(coalesce(p_valor, ''), 2000) where clave = p_clave;
  if not found then raise exception 'Texto no encontrado'; end if;
  perform public.auditar('texto', p_clave);
end $$;

create or replace function public.admin_calificaciones() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_check();
  return (select coalesce(jsonb_agg(x order by x.created_at desc), '[]') from (
    select q.id, q.autor, q.estrellas, q.comentario, q.created_at, t.nombre as negocio, r.nombre as cliente
    from public.calificaciones q join public.negocios t on t.id = q.negocio_id join public.reservas r on r.id = q.reserva_id
    order by q.created_at desc limit 300) x);
end $$;

create or replace function public.admin_calificacion_borrar(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  delete from public.calificaciones where id = p_id;
  perform public.auditar('calificacion_borrada', p_id::text);
end $$;

-- Aviso masivo a la campanita.
create or replace function public.admin_aviso(p_destino text, p_titulo text, p_cuerpo text) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform public.admin_check();
  if trim(coalesce(p_titulo, '')) = '' then raise exception 'Escribe el título'; end if;
  insert into public.notificaciones (para, titulo, cuerpo, url)
  select p.id, left(p_titulo, 90), left(coalesce(p_cuerpo, ''), 240), ''
  from public.perfiles p where not p.suspendido and p.rol <> 'admin'
    and (p_destino = 'todos' or (p_destino = 'negocios' and p.rol = 'negocio') or (p_destino = 'equipos' and p.rol in ('negocio', 'equipo'))
         or (p_destino = 'clientes' and p.rol = 'cliente'));
  get diagnostics n = row_count;
  perform public.auditar('aviso', p_destino || ': ' || p_titulo);
  return n;
end $$;

create or replace function public.admin_auditoria() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_check();
  return (select coalesce(jsonb_agg(x order by x.id desc), '[]') from (select * from public.auditoria order by id desc limit 200) x);
end $$;

-- Limpieza del servidor.
create or replace function public.limpiar(p_que text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a int := 0; b int := 0; c int := 0; d int := 0; dias int := coalesce(public.cfg_int('dias_comprobantes'), 30);
begin
  if auth.uid() is not null then perform public.super_check(); end if;
  if p_que in ('comprobantes', 'todo', 'auto') then
    delete from public.comprobantes k where k.created_at < now() - make_interval(days => case when p_que = 'comprobantes' then 0 else dias end)
      and not exists (select 1 from public.reservas r where r.id = k.reserva_id and r.estado = 'en_revision')
      and not exists (select 1 from public.pagos g where g.id = k.pago_id and g.estado = 'en_revision');
    get diagnostics a = row_count;
  end if;
  if p_que in ('notificaciones', 'todo', 'auto') then
    delete from public.notificaciones where (leida and created_at < now() - interval '30 days') or created_at < now() - interval '120 days';
    get diagnostics b = row_count;
  end if;
  if p_que in ('reservas', 'todo', 'auto') then
    delete from public.reservas where estado in ('expirada', 'rechazada') and updated_at < now() - interval '60 days';
    get diagnostics c = row_count;
  end if;
  if p_que in ('otros', 'todo', 'auto') then
    delete from public.auditoria where created_at < now() - interval '365 days';
    delete from public.invitaciones where created_at < now() - interval '2 days';
    get diagnostics d = row_count;
  end if;
  if auth.uid() is not null then perform public.auditar('limpieza', p_que); end if;
  return jsonb_build_object('comprobantes', a, 'notificaciones', b, 'reservas', c, 'otros', d);
end $$;

-- Claves push (las genera el panel del admin).
create or replace function public.admin_push_claves(p_publica text, p_privada text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  if p_publica !~ '^[A-Za-z0-9_-]{80,100}$' or p_privada !~ '^[A-Za-z0-9_-]{40,50}$' then raise exception 'Claves no válidas'; end if;
  insert into public.secretos (clave, valor) values ('vapid_privada', p_privada) on conflict (clave) do update set valor = excluded.valor;
  insert into public.config (clave, valor) values ('vapid_publica', to_jsonb(p_publica)) on conflict (clave) do update set valor = excluded.valor;
  delete from public.push_subs where true;  -- las suscripciones con la clave anterior ya no sirven
  perform public.auditar('push', 'claves nuevas');
end $$;

-- ---------------------------------------------------------------------
-- 15. Push (celular)
-- ---------------------------------------------------------------------
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

-- Solo el servidor: avisos pendientes de enviar por push.
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

-- ---------------------------------------------------------------------
-- 16. Tareas automáticas (cada 5 minutos con pg_cron)
-- ---------------------------------------------------------------------
create or replace function public.tareas_periodicas() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n_exp int := 0; n_rec int := 0; n_venc int := 0; r record; dias_av int := coalesce(public.cfg_int('dias_aviso_vencimiento'), 3);
begin
  -- 1) Horas retenidas sin pago: se liberan.
  with x as (
    update public.reservas set estado = 'expirada', abono_estado = 'no_pagado', historial = public.historial_mas(historial, 'expirada'), updated_at = now()
    where estado = 'por_pagar' and expira_at <= now() returning cliente_id, token)
  select count(*) into n_exp from x;

  -- 2) Recordatorio el día antes de la hora (clientes con cuenta).
  for r in select x.id, x.cliente_id, x.token, x.hora, t.nombre from public.reservas x join public.negocios t on t.id = x.negocio_id
           where x.estado = 'confirmada' and not x.recordado and x.cliente_id is not null
             and (x.fecha + x.hora) at time zone t.zona between now() and now() + interval '24 hours' loop
    perform public.avisar(r.cliente_id, '⏰ Mañana tienes hora', r.nombre || ' a las ' || to_char(r.hora, 'HH24:MI'), '/r/?t=' || r.token);
    update public.reservas set recordado = true where id = r.id;
    n_rec := n_rec + 1;
  end loop;

  -- 3) Mantención (clientes Premium con la función activa).
  for r in select x.id, x.cliente_id, t.nombre, t.slug from public.reservas x join public.negocios t on t.id = x.negocio_id
           where x.estado = 'completada' and not x.mantencion_avisada and x.cliente_id is not null and x.proxima_mantencion <= current_date
             and coalesce((public.limite_cliente(x.cliente_id, 'recordatorios'))::boolean, false) loop
    perform public.avisar(r.cliente_id, '🔧 Le toca mantención a tu bici', 'Reserva tu hora en ' || r.nombre, '/t/?s=' || r.slug);
    update public.reservas set mantencion_avisada = true where id = r.id;
  end loop;

  -- 4) Premium por vencer y vencido (negocios y clientes), con botón para pagar.
  for r in select id, premium_hasta from public.negocios
           where premium_hasta between now() and now() + make_interval(days => dias_av) and aviso_venc_para is distinct from premium_hasta loop
    perform public.avisar_negocio(r.id, '⏳ Tu Premium vence pronto', 'Vence el ' || to_char(r.premium_hasta at time zone 'America/Santiago', 'DD/MM') ||
      '. Toca para pagar y subir tu comprobante.', '/negocio/#plan');
    update public.negocios set aviso_venc_para = premium_hasta where id = r.id;
    n_venc := n_venc + 1;
  end loop;
  for r in select id, premium_hasta from public.negocios
           where premium_hasta < now() and premium_hasta > now() - interval '30 days' and aviso_vencido_para is distinct from premium_hasta loop
    perform public.avisar_negocio(r.id, 'Tu Premium venció', 'Tu negocio volvió a la versión gratis. Renueva cuando quieras.', '/negocio/#plan');
    update public.negocios set aviso_vencido_para = premium_hasta where id = r.id;
  end loop;
  for r in select id, premium_hasta from public.perfiles
           where rol = 'cliente' and premium_hasta between now() and now() + make_interval(days => dias_av) and aviso_venc_para is distinct from premium_hasta loop
    perform public.avisar(r.id, '⏳ Tu Premium vence pronto', 'Toca para renovarlo.', '/cliente/#plan');
    update public.perfiles set aviso_venc_para = premium_hasta where id = r.id;
  end loop;
  for r in select id, premium_hasta from public.perfiles
           where rol = 'cliente' and premium_hasta < now() and premium_hasta > now() - interval '30 days' and aviso_vencido_para is distinct from premium_hasta loop
    perform public.avisar(r.id, 'Tu Premium venció', 'Volviste a la versión gratis.', '/cliente/#plan');
    update public.perfiles set aviso_vencido_para = premium_hasta where id = r.id;
  end loop;

  -- 5) Limpieza automática (una vez al día, a las 4 de la mañana).
  if extract(hour from now() at time zone 'America/Santiago') = 4 and extract(minute from now()) < 5 then
    perform public.limpiar('auto');
  end if;
  return jsonb_build_object('expiradas', n_exp, 'recordatorios', n_rec, 'vencimientos', n_venc);
end $$;

-- ---------------------------------------------------------------------
-- 17. Permisos de las funciones
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.config_publica(), public.negocio_publico(text), public.horas_libres(uuid, date, int, uuid), public.dias_libres(uuid, int),
  public.reservar(uuid, uuid, date, text, text, text, text, text, text, uuid[]), public.reserva_ver(text), public.reserva_comprobante(text, text),
  public.reserva_cancelar(text), public.reserva_reagendar(text, date, text), public.reserva_calificar(text, int, text),
  public.db_version(), public.tel_norm(text)
to anon, authenticated;

grant execute on function
  public.is_admin(), public.negocio_de(uuid), public.mi_negocio(), public.es_dueno(uuid), public.ocupa_hora(public.reservas),
  public.mi_cuenta(), public.registrar_visto(), public.mi_perfil_guardar(text, text), public.cliente_inicio(),
  public.negocio_panel(), public.negocio_guardar(jsonb), public.link_guardar(text, int, int, text, text, boolean),
  public.negocio_reservas(date, date, text[], uuid), public.negocio_comprobante(uuid), public.negocio_revisar(uuid, boolean, text),
  public.negocio_estado(uuid, text), public.negocio_trabajo(uuid, jsonb, text, text, uuid, date),
  public.negocio_reserva_manual(date, text, uuid, text, text, text, text, boolean), public.negocio_devuelto(uuid),
  public.negocio_calificar(uuid, int, text), public.negocio_clientes(), public.negocio_equipo_suspender(uuid, boolean),
  public.negocio_estadisticas(), public.negocio_recordatorios(), public.negocio_limpiar_comprobantes(),
  public.premium_pagar(text, text), public.mi_pago_pendiente(),
  public.admin_resumen(), public.admin_negocios(), public.admin_clientes(), public.admin_premium(text, uuid, int),
  public.admin_suspender(text, uuid, boolean), public.admin_pagos(text), public.admin_pago_comprobante(uuid),
  public.admin_pago_resolver(uuid, boolean, text), public.admin_links(), public.admin_plan_guardar(text, text, text, jsonb, jsonb, int),
  public.admin_config_guardar(text, jsonb), public.admin_texto_guardar(text, text), public.admin_calificaciones(),
  public.admin_calificacion_borrar(uuid), public.admin_aviso(text, text, text), public.admin_auditoria(), public.limpiar(text),
  public.admin_push_claves(text, text), public.push_guardar(text, text, text), public.push_quitar(text)
to authenticated;
-- Usadas por las políticas de seguridad.
grant execute on function public.is_admin(), public.negocio_de(uuid), public.mi_negocio(), public.es_dueno(uuid) to authenticated;
-- (v1.3: chat y borrado en la sección 18, más abajo)
-- Las de solo-servidor (preparar_cuenta, cancelar_invitacion, push_pendientes, push_borrar_endpoint, tareas_periodicas)
-- quedan sin permiso para la app: solo las usa la función "servidor" (rol service_role) y pg_cron.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on all functions in schema public to service_role';
  end if;
end $$;


-- =====================================================================
-- 18. (v1.3) Chat: cliente ↔ su negocio · negocio ↔ administrador
--     cliente_id vacío = conversación del negocio con el administrador.
-- =====================================================================
create table if not exists public.mensajes (
  id          uuid primary key default gen_random_uuid(),
  negocio_id   uuid not null references public.negocios (id) on delete cascade,
  cliente_id  uuid references public.perfiles (id) on delete cascade,
  autor       uuid references public.perfiles (id) on delete set null,
  de_negocio   boolean not null,
  texto       text not null check (length(trim(texto)) between 1 and 1000),
  leido       boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists mensajes_conv_idx on public.mensajes (negocio_id, cliente_id, created_at desc);
alter table public.mensajes enable row level security;

create or replace function public.chat_puede(t uuid, c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.negocio_de(auth.uid()) = t
      or (c is null and public.is_admin())
      or (c = auth.uid() and exists (select 1 from public.perfiles p where p.id = c and p.rol = 'cliente' and p.negocio_id = t and not p.suspendido))
$$;

drop policy if exists "ver mensajes" on public.mensajes;
create policy "ver mensajes" on public.mensajes for select to authenticated using (public.chat_puede(negocio_id, cliente_id));
grant select on public.mensajes to authenticated;
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'mensajes') then
    alter publication supabase_realtime add table public.mensajes;
  end if;
end $$;

create or replace function public.chat_enviar(p_negocio uuid, p_cliente uuid, p_texto text) returns void
language plpgsql security definer set search_path = '' as $$
declare dt boolean; quien text; t public.negocios;
begin
  if not public.chat_puede(p_negocio, p_cliente) then raise exception 'Sin permiso'; end if;
  if trim(coalesce(p_texto, '')) = '' then raise exception 'Escribe un mensaje'; end if;
  if (select count(*) from public.mensajes where autor = auth.uid() and created_at > now() - interval '10 minutes') >= 40 then
    raise exception 'Muchos mensajes seguidos. Espera unos minutos.';
  end if;
  select * into t from public.negocios where id = p_negocio;
  dt := coalesce(public.negocio_de(auth.uid()) = p_negocio, false);
  insert into public.mensajes (negocio_id, cliente_id, autor, de_negocio, texto) values (p_negocio, p_cliente, auth.uid(), dt, left(trim(p_texto), 1000));
  if dt and p_cliente is not null then
    perform public.avisar(p_cliente, '💬 ' || t.nombre, left(trim(p_texto), 120), '/cliente/#chat');
  elsif dt then
    perform public.avisar_admin('💬 ' || t.nombre, left(trim(p_texto), 120), '/admin/#chat');
  else
    select coalesce(nullif(nombre, ''), email) into quien from public.perfiles where id = auth.uid();
    perform public.avisar_negocio(p_negocio, '💬 ' || case when p_cliente is null then 'CodeFix (soporte)' else quien end,
      left(trim(p_texto), 120), '/negocio/#chat');
  end if;
end $$;

-- Mensajes de una conversación (marca como leídos los recibidos).
create or replace function public.chat_leer(p_negocio uuid, p_cliente uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare dt boolean;
begin
  if not public.chat_puede(p_negocio, p_cliente) then raise exception 'Sin permiso'; end if;
  dt := coalesce(public.negocio_de(auth.uid()) = p_negocio, false);
  update public.mensajes set leido = true
  where negocio_id = p_negocio and cliente_id is not distinct from p_cliente and not leido and de_negocio <> dt;
  return (select coalesce(jsonb_agg(x order by x.created_at), '[]') from (
    select id, texto, created_at, de_negocio = dt as mio from public.mensajes
    where negocio_id = p_negocio and cliente_id is not distinct from p_cliente order by created_at desc limit 150) x);
end $$;

-- Conversaciones de quien entra (con no leídos).
create or replace function public.chat_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me public.perfiles; tid uuid := public.negocio_de(auth.uid());
begin
  select * into me from public.perfiles where id = auth.uid();
  if tid is not null then
    return (select coalesce(jsonb_agg(x order by x.ultimo desc nulls last), '[]') from (
      select null::uuid as cliente_id, 'CodeFix (soporte)' as nombre, tid as negocio_id,
        (select max(created_at) from public.mensajes m where m.negocio_id = tid and m.cliente_id is null) as ultimo,
        (select count(*) from public.mensajes m where m.negocio_id = tid and m.cliente_id is null and not m.leido and not m.de_negocio) as no_leidos
      union all
      select p.id, coalesce(nullif(p.nombre, ''), p.email), tid, max(m.created_at),
        count(*) filter (where not m.leido and not m.de_negocio)
      from public.mensajes m join public.perfiles p on p.id = m.cliente_id
      where m.negocio_id = tid group by p.id, p.nombre, p.email) x);
  elsif public.is_admin() then
    return (select coalesce(jsonb_agg(x order by x.ultimo desc), '[]') from (
      select null::uuid as cliente_id, t.nombre, t.id as negocio_id, max(m.created_at) as ultimo,
        count(*) filter (where not m.leido and m.de_negocio) as no_leidos
      from public.mensajes m join public.negocios t on t.id = m.negocio_id
      where m.cliente_id is null group by t.id, t.nombre) x);
  elsif me.rol = 'cliente' then
    return jsonb_build_array(jsonb_build_object('cliente_id', me.id, 'negocio_id', me.negocio_id,
      'nombre', (select nombre from public.negocios where id = me.negocio_id),
      'no_leidos', (select count(*) from public.mensajes m where m.negocio_id = me.negocio_id and m.cliente_id = me.id and not m.leido and m.de_negocio)));
  end if;
  return '[]'::jsonb;
end $$;

-- =====================================================================
-- 19. (v1.3) Borrar cuentas (solo el administrador; lo ejecuta la función "servidor")
-- =====================================================================
create or replace function public.preparar_borrado(p_caller uuid, p_tipo text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.perfiles; ids uuid[];
begin
  if not exists (select 1 from public.perfiles where id = p_caller and rol = 'admin' and email = public.admin_email() and not suspendido) then
    return jsonb_build_object('ok', false, 'error', 'Solo el administrador');
  end if;
  if p_tipo = 'negocio' then
    select array_agg(id) into ids from public.perfiles where negocio_id = p_id and rol <> 'admin';
    insert into public.auditoria (quien, accion, detalle)
    select p_caller, 'borrar_negocio', nombre from public.negocios where id = p_id;
    return jsonb_build_object('ok', true, 'ids', coalesce(to_jsonb(ids), '[]'::jsonb), 'negocio', p_id);
  end if;
  select * into p from public.perfiles where id = p_id;
  if p.id is null then return jsonb_build_object('ok', false, 'error', 'Usuario no encontrado'); end if;
  if p.rol = 'admin' then return jsonb_build_object('ok', false, 'error', 'No puedes borrar al administrador'); end if;
  if p.rol = 'negocio' then return jsonb_build_object('ok', false, 'error', 'Es el dueño: elimina el negocio completo'); end if;
  insert into public.auditoria (quien, accion, detalle) values (p_caller, 'borrar_usuario', p.rol || ' ' || p.email);
  return jsonb_build_object('ok', true, 'ids', jsonb_build_array(p.id));
end $$;

create or replace function public.borrar_negocio(p_id uuid) returns void
language sql security definer set search_path = '' as $$ delete from public.negocios where id = p_id $$;

revoke execute on function public.chat_puede(uuid, uuid), public.chat_enviar(uuid, uuid, text), public.chat_leer(uuid, uuid),
  public.chat_lista(), public.preparar_borrado(uuid, text, uuid), public.borrar_negocio(uuid),
  public.preparar_cuenta(uuid, text, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.chat_puede(uuid, uuid), public.chat_enviar(uuid, uuid, text), public.chat_leer(uuid, uuid),
  public.chat_lista() to authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on all functions in schema public to service_role';
  end if;
end $$;


-- =====================================================================
-- 20. (v1.5) Entrega estimada, chat con fotos y límite, perfil Premium del cliente
-- =====================================================================
update public.config set valor = '"+56950868263"' where clave = 'soporte_whatsapp' and valor = '""';
update public.config set valor = '5' where clave = 'dias_aviso_vencimiento' and valor = '3';

-- Cola: cada día de trabajo el negocio termina "capacidad_dia" bicis. La bici entra a la cola
-- en el orden de su hora de entrega y sale el primer día en que le alcanza la capacidad.
create or replace function public.estimar_entrega(p_negocio uuid, p_fecha date, p_hora time, p_excluir uuid default null) returns date
language plpgsql stable security definer set search_path = '' as $$
declare c public.negocios; hoy date; f date[]; k int; hechas int := 0; llegadas int; d date; i int := 0;
begin
  select * into c from public.negocios where id = p_negocio;
  if c.id is null or c.capacidad_dia <= 0 then return null; end if;
  hoy := (now() at time zone c.zona)::date;
  -- Cola en orden de llegada (fecha y hora de entrega de la bici), incluyendo la nueva.
  select array_agg(x.fecha order by x.fecha, x.hora) into f from (
    select r.fecha, r.hora from public.reservas r
    where r.negocio_id = p_negocio and public.ocupa_hora(r) and (p_excluir is null or r.id <> p_excluir) and r.fecha >= hoy - 60
      and r.estado in ('por_pagar', 'en_revision', 'confirmada', 'recibida', 'en_reparacion', 'esperando_repuesto')
    union all select p_fecha, p_hora) x;
  k := (select count(*) from unnest(f) WITH ORDINALITY u(fe, n) where u.fe < p_fecha)
     + (select count(*) from public.reservas r where r.negocio_id = p_negocio and public.ocupa_hora(r) and (p_excluir is null or r.id <> p_excluir)
          and r.estado in ('por_pagar', 'en_revision', 'confirmada', 'recibida', 'en_reparacion', 'esperando_repuesto')
          and r.fecha = p_fecha and r.hora <= p_hora) + 1;
  -- Cada día de trabajo se terminan "capacidad_dia" bicis de las que ya llegaron.
  loop
    d := hoy + i;
    if extract(dow from d)::int = any (c.dias)
       and not exists (select 1 from public.bloqueos b where b.negocio_id = p_negocio and b.fecha = d and b.desde is null) then
      select count(*) into llegadas from unnest(f) u(fe) where u.fe <= d;
      hechas := least(hechas + c.capacidad_dia, llegadas);
      if hechas >= k then return d; end if;
    end if;
    i := i + 1;
    exit when i > 400;
  end loop;
  return null;
end $$;

create or replace function public.entrega_estimada(p_negocio uuid, p_fecha date, p_hora text) returns date
language sql stable security definer set search_path = '' as $$ select public.estimar_entrega(p_negocio, p_fecha, p_hora::time, null) $$;

-- Chat: foto adjunta y máximo 3 mensajes seguidos (cliente → negocio y negocio → administrador).
alter table public.mensajes add column if not exists imagen text check (imagen is null or (imagen ~ '^data:image/(jpeg|png|webp);base64,' and length(imagen) <= 400000));
alter table public.mensajes drop constraint if exists mensajes_texto_check;
alter table public.mensajes add constraint mensajes_texto_check check (length(texto) <= 1000 and (length(trim(texto)) > 0 or imagen is not null));

drop function if exists public.chat_enviar(uuid, uuid, text);
create or replace function public.chat_enviar(p_negocio uuid, p_cliente uuid, p_texto text, p_imagen text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare dt boolean; quien text; t public.negocios; n int;
begin
  if not public.chat_puede(p_negocio, p_cliente) then raise exception 'Sin permiso'; end if;
  if trim(coalesce(p_texto, '')) = '' and p_imagen is null then raise exception 'Escribe un mensaje'; end if;
  if p_imagen is not null and (p_imagen !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' or length(p_imagen) > 400000) then
    raise exception 'Imagen no válida o muy pesada';
  end if;
  dt := coalesce(public.negocio_de(auth.uid()) = p_negocio, false);
  -- Máximo 3 seguidos sin respuesta: el cliente al negocio y el negocio al administrador.
  if (not dt and p_cliente is not null) or (dt and p_cliente is null) then
    select count(*) into n from public.mensajes
    where negocio_id = p_negocio and cliente_id is not distinct from p_cliente and de_negocio = dt
      and created_at > coalesce((select max(created_at) from public.mensajes where negocio_id = p_negocio
                                 and cliente_id is not distinct from p_cliente and de_negocio <> dt), '-infinity');
    if n >= 3 then raise exception 'Ya enviaste 3 mensajes. Espera la respuesta para escribir de nuevo.'; end if;
  end if;
  select * into t from public.negocios where id = p_negocio;
  insert into public.mensajes (negocio_id, cliente_id, autor, de_negocio, texto, imagen)
  values (p_negocio, p_cliente, auth.uid(), dt, left(trim(coalesce(p_texto, '')), 1000), p_imagen);
  if dt and p_cliente is not null then
    perform public.avisar(p_cliente, '💬 ' || t.nombre, coalesce(nullif(left(trim(p_texto), 120), ''), '📷 Foto'), '/cliente/#chat');
  elsif dt then
    perform public.avisar_admin('💬 ' || t.nombre, coalesce(nullif(left(trim(p_texto), 120), ''), '📷 Foto'), '/admin/#chat');
  else
    select coalesce(nullif(nombre, ''), email) into quien from public.perfiles where id = auth.uid();
    perform public.avisar_negocio(p_negocio, '💬 ' || case when p_cliente is null then 'CodeFix (soporte)' else quien end,
      coalesce(nullif(left(trim(p_texto), 120), ''), '📷 Foto'), '/negocio/#chat');
  end if;
end $$;

create or replace function public.chat_leer(p_negocio uuid, p_cliente uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare dt boolean;
begin
  if not public.chat_puede(p_negocio, p_cliente) then raise exception 'Sin permiso'; end if;
  dt := coalesce(public.negocio_de(auth.uid()) = p_negocio, false);
  update public.mensajes set leido = true
  where negocio_id = p_negocio and cliente_id is not distinct from p_cliente and not leido and de_negocio <> dt;
  return (select coalesce(jsonb_agg(x order by x.created_at), '[]') from (
    select id, texto, imagen, created_at, de_negocio = dt as mio from public.mensajes
    where negocio_id = p_negocio and cliente_id is not distinct from p_cliente order by created_at desc limit 150) x);
end $$;

create or replace function public.chat_limpiar(p_negocio uuid, p_cliente uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.chat_puede(p_negocio, p_cliente) then raise exception 'Sin permiso'; end if;
  delete from public.mensajes where negocio_id = p_negocio and cliente_id is not distinct from p_cliente;
end $$;

-- Perfil del cliente: foto, color, ícono y descripción (Premium).
alter table public.perfiles add column if not exists foto text check (foto is null or (foto ~ '^data:image/(jpeg|png|webp);base64,' and length(foto) <= 120000));
alter table public.perfiles add column if not exists color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$');
alter table public.perfiles add column if not exists icono text check (icono is null or length(icono) <= 8);
alter table public.perfiles add column if not exists descripcion text not null default '' check (length(descripcion) <= 300);

create or replace function public.cliente_estilo(p_color text, p_icono text, p_foto text, p_descripcion text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.perfiles where id = auth.uid() and rol = 'cliente') then raise exception 'Solo clientes'; end if;
  if not public.cliente_es_premium(auth.uid()) then raise exception 'Personalizar tu perfil es Premium'; end if;
  update public.perfiles set color = nullif(p_color, ''), icono = nullif(p_icono, ''), foto = nullif(p_foto, ''),
    descripcion = left(coalesce(p_descripcion, ''), 300) where id = auth.uid();
end $$;

create or replace function public.mi_cuenta() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'email', p.email, 'nombre', p.nombre, 'telefono', p.telefono, 'rol', p.rol,
    'suspendido', p.suspendido or coalesce(t.suspendido, false),
    'is_admin', public.is_admin(), 'is_socio', public.is_socio(),
    'negocio_id', p.negocio_id,
    'foto', p.foto, 'color', p.color, 'icono', p.icono, 'descripcion', p.descripcion,
    'negocio', case when t.id is null then null else jsonb_build_object(
       'id', t.id, 'nombre', t.nombre, 'slug', t.slug, 'logo', t.logo, 'color', t.color, 'icono', t.icono,
       'telefono', t.telefono, 'premium', public.negocio_es_premium(t.id), 'premium_hasta', t.premium_hasta,
       'modelo', coalesce((public.negocio_rubro(t.id)) ->> 'modelo', 'reservas'), 'rubro', public.negocio_rubro(t.id)) end,
    'premium', case when p.rol = 'cliente' then public.cliente_es_premium(p.id)
                    when p.rol in ('negocio', 'equipo') then public.negocio_es_premium(p.negocio_id)
                    else true end,
    'premium_hasta', case when p.rol = 'cliente' then p.premium_hasta else t.premium_hasta end)
  from public.perfiles p left join public.negocios t on t.id = p.negocio_id
  where p.id = auth.uid()
$$;

revoke execute on function public.estimar_entrega(uuid, date, time, uuid), public.entrega_estimada(uuid, date, text),
  public.chat_enviar(uuid, uuid, text, text), public.chat_leer(uuid, uuid), public.chat_limpiar(uuid, uuid),
  public.cliente_estilo(text, text, text, text), public.mi_cuenta() from public, anon, authenticated;
grant execute on function public.entrega_estimada(uuid, date, text) to anon, authenticated;
grant execute on function public.chat_enviar(uuid, uuid, text, text), public.chat_leer(uuid, uuid), public.chat_limpiar(uuid, uuid),
  public.cliente_estilo(text, text, text, text), public.mi_cuenta() to authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on all functions in schema public to service_role';
  end if;
end $$;


-- =====================================================================
-- 21. (v2.0) Plataforma multi-negocio: rubros, socio y RUT
-- =====================================================================
-- Rubro = tipo de negocio. Cada rubro usa un modelo: reservas, catálogo u órdenes de trabajo.
create table if not exists public.rubros (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique check (length(trim(nombre)) between 2 and 60),
  modelo     text not null check (modelo in ('reservas', 'catalogo', 'ordenes')),
  icono      text not null default '🏪' check (length(icono) <= 8),
  etiquetas  jsonb not null default '{}',   -- {"servicio": "Corte", "profesional": "Barbero", "item": "Vehículo"}
  activo     boolean not null default true,
  orden      int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.rubros enable row level security;
drop policy if exists "ver rubros" on public.rubros;
create policy "ver rubros" on public.rubros for select to anon, authenticated using (activo or public.is_staff());

insert into public.rubros (nombre, modelo, icono, orden, etiquetas) values
  ('Barbería', 'reservas', '💈', 1, '{"servicio": "Servicio", "profesional": "Barbero"}'),
  ('Peluquería', 'reservas', '✂️', 2, '{"servicio": "Servicio", "profesional": "Estilista"}'),
  ('Estética y spa', 'reservas', '💆', 3, '{"servicio": "Tratamiento", "profesional": "Especialista"}'),
  ('Consulta / clínica', 'reservas', '🩺', 4, '{"servicio": "Atención", "profesional": "Profesional"}'),
  ('Taller de bicicletas', 'reservas', '🚲', 5, '{"servicio": "Servicio", "profesional": "Mecánico", "item": "Bicicleta"}'),
  ('Taller mecánico', 'ordenes', '🔧', 6, '{"servicio": "Trabajo", "profesional": "Mecánico", "item": "Vehículo"}'),
  ('Servicio técnico', 'ordenes', '🛠️', 7, '{"servicio": "Reparación", "profesional": "Técnico", "item": "Equipo"}'),
  ('Tienda', 'catalogo', '🛍️', 8, '{"servicio": "Producto"}'),
  ('Comida / delivery', 'catalogo', '🍔', 9, '{"servicio": "Producto"}')
on conflict (nombre) do nothing;

alter table public.negocios add column if not exists rubro_id uuid references public.rubros (id) on delete set null;
alter table public.invitaciones add column if not exists rubro_id uuid references public.rubros (id) on delete set null;

-- Al aceptar la invitación de un negocio, se le asigna su rubro.
create or replace function public.negocio_rubro_inicial() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.rubro_id is null then
    select i.rubro_id into new.rubro_id from public.invitaciones i join auth.users u on lower(u.email) = i.email
    where u.id = new.owner_id and i.rol = 'negocio';
  end if;
  return new;
end $$;
drop trigger if exists negocio_rubro_inicial on public.negocios;
create trigger negocio_rubro_inicial before insert on public.negocios
  for each row execute function public.negocio_rubro_inicial();

-- RUT chileno: valida el dígito verificador (acepta puntos y guion).
create or replace function public.rut_valido(p_rut text) returns boolean
language plpgsql immutable as $$
declare r text := upper(regexp_replace(coalesce(p_rut, ''), '[^0-9kK]', '', 'g'));
  cuerpo text; dv text; suma int := 0; mult int := 2; i int; res int;
begin
  if length(r) < 2 or length(r) > 9 then return false; end if;
  cuerpo := left(r, -1); dv := right(r, 1);
  if cuerpo !~ '^[0-9]+$' then return false; end if;
  for i in reverse length(cuerpo)..1 loop
    suma := suma + substr(cuerpo, i, 1)::int * mult;
    mult := case when mult = 7 then 2 else mult + 1 end;
  end loop;
  res := 11 - (suma % 11);
  return dv = case res when 11 then '0' when 10 then 'K' else res::text end;
end $$;

-- Rubros: el staff los ve; solo el súper administrador los crea o cambia.
create or replace function public.admin_rubros() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_check();
  return (select coalesce(jsonb_agg(x order by x.orden, x.nombre), '[]') from (
    select r.*, (select count(*) from public.negocios t where t.rubro_id = r.id) as negocios from public.rubros r) x);
end $$;

create or replace function public.admin_rubro_guardar(p_id uuid, p_nombre text, p_modelo text, p_icono text,
  p_etiquetas jsonb, p_activo boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  perform public.super_check();
  if p_id is null then
    insert into public.rubros (nombre, modelo, icono, etiquetas, activo, orden)
    values (trim(p_nombre), p_modelo, coalesce(nullif(p_icono, ''), '🏪'), coalesce(p_etiquetas, '{}'), coalesce(p_activo, true),
            (select coalesce(max(orden), 0) + 1 from public.rubros))
    returning id into rid;
  else
    update public.rubros set nombre = trim(p_nombre), modelo = p_modelo, icono = coalesce(nullif(p_icono, ''), icono),
      etiquetas = coalesce(p_etiquetas, etiquetas), activo = coalesce(p_activo, activo)
    where id = p_id returning id into rid;
    if rid is null then raise exception 'Rubro no encontrado'; end if;
  end if;
  perform public.auditar('rubro', trim(p_nombre) || ' (' || p_modelo || ')');
  return rid;
end $$;

-- Cambiar el rubro de un negocio: el súper admin siempre; el socio solo si aún no tiene.
create or replace function public.admin_negocio_rubro(p_negocio uuid, p_rubro uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.admin_check();
  update public.negocios set rubro_id = p_rubro
  where id = p_negocio and (public.is_admin() or rubro_id is null);
  if not found then raise exception 'Solo el súper administrador cambia el rubro'; end if;
  perform public.auditar('negocio_rubro', p_negocio::text);
end $$;

-- Rubro de cada negocio en el listado del panel.
create or replace function public.negocio_rubro(t uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', r.id, 'nombre', r.nombre, 'modelo', r.modelo, 'icono', r.icono, 'etiquetas', r.etiquetas)
  from public.negocios n join public.rubros r on r.id = n.rubro_id where n.id = t
$$;

revoke execute on function public.is_socio(), public.is_staff(), public.super_check(), public.admin_rubros(),
  public.admin_rubro_guardar(uuid, text, text, text, jsonb, boolean), public.admin_negocio_rubro(uuid, uuid),
  public.negocio_rubro(uuid), public.negocio_rubro_inicial() from public, anon, authenticated;
grant execute on function public.is_socio(), public.is_staff(), public.admin_rubros(),
  public.admin_rubro_guardar(uuid, text, text, text, jsonb, boolean), public.admin_negocio_rubro(uuid, uuid),
  public.negocio_rubro(uuid) to authenticated;
grant execute on function public.rut_valido(text) to anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on all functions in schema public to service_role';
  end if;
end $$;


-- (v2.1) Súper admin: editar los datos principales de cualquier negocio.
create or replace function public.admin_negocio_guardar(p_id uuid, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.super_check();
  update public.negocios set
    nombre = coalesce(nullif(trim(p ->> 'nombre'), ''), nombre),
    rubro_id = case when p ? 'rubro_id' then nullif(p ->> 'rubro_id', '')::uuid else rubro_id end,
    color = coalesce(nullif(p ->> 'color', ''), color),
    icono = coalesce(nullif(trim(p ->> 'icono'), ''), icono),
    telefono = coalesce(left(trim(p ->> 'telefono'), 30), telefono),
    comuna = coalesce(left(trim(p ->> 'comuna'), 60), comuna),
    reservas_online = coalesce((p ->> 'reservas_online')::boolean, reservas_online),
    activo = coalesce((p ->> 'activo')::boolean, activo)
  where id = p_id;
  if not found then raise exception 'Negocio no encontrado'; end if;
  perform public.auditar('negocio_editar', p_id::text);
end $$;
revoke execute on function public.admin_negocio_guardar(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.admin_negocio_guardar(uuid, jsonb) to authenticated;


-- =====================================================================
-- 22. (v2.2) Módulo CATÁLOGO: productos, carrito y pedidos sin cuenta
--     (tiendas, comida, etc.). Todo se calcula y valida en el servidor.
-- =====================================================================
alter table public.negocios add column if not exists cobro_pct int not null default 30;
alter table public.negocios add column if not exists despacho boolean not null default false;
alter table public.negocios add column if not exists despacho_costo int not null default 0;
alter table public.negocios drop constraint if exists negocios_cobro_check;
alter table public.negocios add constraint negocios_cobro_check check (cobro_modo in ('total', 'abono') and cobro_pct between 1 and 100
  and despacho_costo between 0 and 1000000);

create table if not exists public.productos (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references public.negocios (id) on delete cascade,
  nombre      text not null check (length(trim(nombre)) between 1 and 80),
  descripcion text not null default '' check (length(descripcion) <= 500),
  categoria   text not null default '' check (length(categoria) <= 40),
  precio      int not null check (precio between 0 and 100000000),
  stock       int check (stock is null or stock >= 0),          -- null = sin control de stock
  foto        text check (foto is null or (foto ~ '^data:image/(jpeg|png|webp);base64,' and length(foto) <= 200000)),
  activo      boolean not null default true,
  orden       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists productos_negocio_idx on public.productos (negocio_id, activo);
alter table public.productos enable row level security;
drop policy if exists "ver productos" on public.productos;
create policy "ver productos" on public.productos for select to authenticated
  using (negocio_id = public.negocio_de(auth.uid()) or public.is_staff());

create table if not exists public.pedidos (
  id            uuid primary key default gen_random_uuid(),
  negocio_id    uuid not null references public.negocios (id) on delete cascade,
  codigo        text not null unique,
  token         text not null unique,
  nombre        text not null,
  telefono      text not null,
  tel_norm      text not null,
  rut           text not null,
  email         text not null default '',
  entrega       text not null check (entrega in ('retiro', 'despacho')),
  direccion     text not null default '',
  nota          text not null default '',
  items         jsonb not null,             -- [{id, nombre, precio, cant}] con el precio del momento
  subtotal      int not null,
  despacho      int not null default 0,
  total         int not null,
  a_pagar       int not null,
  estado        text not null default 'por_pagar' check (estado in ('por_pagar', 'en_revision', 'confirmado', 'preparando',
                  'listo', 'entregado', 'rechazado', 'cancelado', 'expirado')),
  comprobante   text check (comprobante is null or length(comprobante) <= 600000),
  comprobante_at timestamptz,
  expira_at     timestamptz,
  nota_negocio  text not null default '',
  historial     jsonb not null default '[]',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists pedidos_negocio_idx on public.pedidos (negocio_id, estado, created_at desc);
alter table public.pedidos enable row level security;
drop policy if exists "ver pedidos" on public.pedidos;
create policy "ver pedidos" on public.pedidos for select to authenticated
  using (negocio_id = public.negocio_de(auth.uid()) or public.is_staff());

-- Link de pago de la tienda: el monto lo pone el cliente (link abierto), así que no se exige monto fijo.
create or replace function public.link_tienda(p_negocio uuid) returns public.links_pago
language sql stable security definer set search_path = '' as $$
  select * from public.links_pago where tipo = 'abono' and negocio_id = p_negocio and activo and url <> '' order by slot limit 1
$$;

-- Devuelve el stock de un pedido que no se concretó.
create or replace function public.pedido_devolver_stock(p_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.productos pr set stock = pr.stock + (i ->> 'cant')::int, updated_at = now()
  from public.pedidos pe, jsonb_array_elements(pe.items) i
  where pe.id = p_id and pr.id = (i ->> 'id')::uuid and pr.stock is not null
$$;

-- Vence los pedidos sin comprobante a tiempo (y libera su stock).
create or replace function public.pedidos_vencer(p_negocio uuid default null) returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in select id from public.pedidos where estado = 'por_pagar' and expira_at < now()
             and (p_negocio is null or negocio_id = p_negocio) for update skip locked loop
    update public.pedidos set estado = 'expirado', historial = public.historial_mas(historial, 'expirado'), updated_at = now() where id = r.id;
    perform public.pedido_devolver_stock(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.negocio_modelo(p_slug text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(r.modelo, 'reservas') from public.negocios n left join public.rubros r on r.id = n.rubro_id where n.slug = p_slug
$$;

-- Página pública de la tienda.
create or replace function public.catalogo_publico(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare t public.negocios; l public.links_pago;
begin
  select * into t from public.negocios where slug = p_slug and activo and not suspendido;
  if t.id is null then raise exception 'Esta tienda no está disponible'; end if;
  l := public.link_tienda(t.id);
  return jsonb_build_object(
    'id', t.id, 'nombre', t.nombre, 'slug', t.slug, 'logo', t.logo, 'color', t.color, 'icono', t.icono,
    'descripcion', t.descripcion, 'direccion', t.direccion, 'comuna', t.comuna, 'telefono', t.telefono, 'instagram', t.instagram,
    'rubro', public.negocio_rubro(t.id), 'nota', public.nota_negocio(t.id),
    'abierta', t.reservas_online and l.id is not null,
    'cobro_modo', t.cobro_modo, 'cobro_pct', t.cobro_pct, 'despacho', t.despacho, 'despacho_costo', t.despacho_costo,
    'minutos_pago', coalesce(public.cfg_int('minutos_pago'), 30),
    'productos', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nombre', p.nombre, 'descripcion', p.descripcion,
        'categoria', p.categoria, 'precio', p.precio, 'foto', p.foto, 'agotado', p.stock is not null and p.stock = 0,
        'stock', p.stock) order by p.orden, p.nombre), '[]')
      from public.productos p where p.negocio_id = t.id and p.activo));
end $$;

-- Crear un pedido sin cuenta. Precios, stock, RUT y totales se validan aquí, no en el navegador.
create or replace function public.pedido_crear(p_negocio uuid, p_items jsonb, p_nombre text, p_telefono text, p_rut text,
  p_email text, p_entrega text, p_direccion text, p_nota text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.negocios; it jsonb; pr public.productos; cant int; lista jsonb := '[]'; sub int := 0; desp int := 0;
  tot int; pagar int; tel text := public.tel_norm(p_telefono); cod text; tok text; usados int;
begin
  select * into t from public.negocios where id = p_negocio and activo and not suspendido;
  if t.id is null or not t.reservas_online or (public.link_tienda(t.id)).id is null then
    return jsonb_build_object('ok', false, 'error', 'Esta tienda no está recibiendo pedidos online ahora');
  end if;
  if length(trim(coalesce(p_nombre, ''))) < 2 then return jsonb_build_object('ok', false, 'error', 'Escribe tu nombre'); end if;
  if tel !~ '^569[0-9]{8}$' then return jsonb_build_object('ok', false, 'error', 'WhatsApp no válido (ej.: +56 9 1234 5678)'); end if;
  if not public.rut_valido(p_rut) then return jsonb_build_object('ok', false, 'error', 'RUT no válido: revisa el dígito verificador'); end if;
  if coalesce(p_email, '') <> '' and p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'error', 'Correo no válido'); end if;
  if p_entrega not in ('retiro', 'despacho') then return jsonb_build_object('ok', false, 'error', 'Elige retiro o despacho'); end if;
  if p_entrega = 'despacho' then
    if not t.despacho then return jsonb_build_object('ok', false, 'error', 'Esta tienda no hace despacho'); end if;
    if length(trim(coalesce(p_direccion, ''))) < 5 then return jsonb_build_object('ok', false, 'error', 'Escribe la dirección de despacho'); end if;
    desp := t.despacho_costo;
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    return jsonb_build_object('ok', false, 'error', 'El carro está vacío');
  end if;
  -- Anti-abuso: pedidos sin pagar del mismo WhatsApp y límite mensual del plan.
  if (select count(*) from public.pedidos where negocio_id = t.id and tel_norm = tel and estado = 'por_pagar') >= 2 then
    return jsonb_build_object('ok', false, 'error', 'Ya tienes pedidos esperando pago. Paga o cancela uno antes de hacer otro.');
  end if;
  select count(*) into usados from public.pedidos where negocio_id = t.id and created_at >= date_trunc('month', now())
    and estado not in ('expirado', 'cancelado', 'rechazado');
  if usados >= coalesce((public.limite_negocio(t.id, 'reservas_mes'))::int, 30) then
    return jsonb_build_object('ok', false, 'error', 'Esta tienda llegó a su máximo de pedidos online del mes. Escríbele por WhatsApp.');
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    cant := coalesce((it ->> 'cant')::int, 0);
    if cant not between 1 and 99 then return jsonb_build_object('ok', false, 'error', 'Cantidad no válida'); end if;
    select * into pr from public.productos where id = (it ->> 'id')::uuid and negocio_id = t.id and activo for update;
    if pr.id is null then return jsonb_build_object('ok', false, 'error', 'Un producto ya no está disponible. Actualiza la página.'); end if;
    if pr.stock is not null and pr.stock < cant then
      return jsonb_build_object('ok', false, 'error', 'Solo quedan ' || pr.stock || ' de "' || pr.nombre || '"');
    end if;
    if lista @> jsonb_build_array(jsonb_build_object('id', pr.id)) then return jsonb_build_object('ok', false, 'error', 'Producto repetido'); end if;
    lista := lista || jsonb_build_object('id', pr.id, 'nombre', pr.nombre, 'precio', pr.precio, 'cant', cant);
    sub := sub + pr.precio * cant;
  end loop;
  tot := sub + desp;
  if tot <= 0 then return jsonb_build_object('ok', false, 'error', 'El total no puede ser $0'); end if;
  pagar := case when t.cobro_modo = 'abono' then greatest(1, ceil(tot * t.cobro_pct / 100.0)::int) else tot end;
  -- Aparta el stock mientras paga.
  update public.productos x set stock = x.stock - (i ->> 'cant')::int, updated_at = now()
  from jsonb_array_elements(lista) i where x.id = (i ->> 'id')::uuid and x.stock is not null;
  loop
    cod := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.pedidos where codigo = cod);
  end loop;
  tok := replace(gen_random_uuid()::text, '-', '') || substr(md5(random()::text), 1, 8);
  insert into public.pedidos (negocio_id, codigo, token, nombre, telefono, tel_norm, rut, email, entrega, direccion, nota, items,
    subtotal, despacho, total, a_pagar, expira_at, historial)
  values (t.id, cod, tok, left(trim(p_nombre), 80), left(trim(p_telefono), 30), tel, upper(regexp_replace(p_rut, '[^0-9kK]', '', 'g')),
    left(trim(coalesce(p_email, '')), 120), p_entrega, left(trim(coalesce(p_direccion, '')), 200), left(trim(coalesce(p_nota, '')), 500),
    lista, sub, desp, tot, pagar, now() + make_interval(mins => coalesce(public.cfg_int('minutos_pago'), 30)), public.historial_mas('[]', 'por_pagar'));
  return jsonb_build_object('ok', true, 'codigo', cod, 'token', tok);
end $$;

-- Ver un pedido con su enlace secreto.
create or replace function public.pedido_ver(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.pedidos; t public.negocios; l public.links_pago;
begin
  if length(coalesce(p_token, '')) < 20 then return null; end if;
  select * into p from public.pedidos where token = p_token;
  if p.id is null then return null; end if;
  if p.estado = 'por_pagar' and p.expira_at < now() then perform public.pedidos_vencer(p.negocio_id); select * into p from public.pedidos where id = p.id; end if;
  select * into t from public.negocios where id = p.negocio_id;
  l := public.link_tienda(t.id);
  return jsonb_build_object('codigo', p.codigo, 'estado', p.estado, 'nombre', p.nombre, 'entrega', p.entrega, 'direccion', p.direccion,
    'items', p.items, 'subtotal', p.subtotal, 'despacho', p.despacho, 'total', p.total, 'a_pagar', p.a_pagar,
    'expira_at', p.expira_at, 'created_at', p.created_at, 'nota_negocio', p.nota_negocio, 'tiene_comprobante', p.comprobante is not null,
    'link', case when p.estado = 'por_pagar' then l.url end, 'link_texto', case when p.estado = 'por_pagar' then l.texto end,
    'negocio', jsonb_build_object('nombre', t.nombre, 'slug', t.slug, 'logo', t.logo, 'color', t.color, 'icono', t.icono,
      'telefono', t.telefono, 'direccion', t.direccion, 'comuna', t.comuna));
end $$;

create or replace function public.pedido_comprobante(p_token text, p_imagen text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.pedidos;
begin
  perform public.pedidos_vencer((select negocio_id from public.pedidos where token = p_token));
  select * into p from public.pedidos where token = p_token and length(p_token) >= 20 for update;
  if p.id is null then return jsonb_build_object('ok', false, 'error', 'Pedido no encontrado'); end if;
  if p.estado = 'expirado' then return jsonb_build_object('ok', false, 'error', 'Se acabó el tiempo para pagar. Haz el pedido de nuevo.'); end if;
  if p.estado <> 'por_pagar' then return jsonb_build_object('ok', false, 'error', 'Este pedido ya tiene comprobante'); end if;
  if p_imagen !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' or length(p_imagen) > 600000 then
    return jsonb_build_object('ok', false, 'error', 'Imagen no válida o muy pesada');
  end if;
  update public.pedidos set comprobante = p_imagen, comprobante_at = now(), estado = 'en_revision', expira_at = null,
    historial = public.historial_mas(historial, 'en_revision'), updated_at = now() where id = p.id;
  perform public.avisar_negocio(p.negocio_id, '🧾 Pedido por revisar', p.nombre || ' · #' || p.codigo || ' · $' || p.a_pagar, '/negocio/#pedidos');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.pedido_cancelar(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.pedidos;
begin
  select * into p from public.pedidos where token = p_token and length(p_token) >= 20 for update;
  if p.id is null then return jsonb_build_object('ok', false, 'error', 'Pedido no encontrado'); end if;
  if p.estado <> 'por_pagar' then return jsonb_build_object('ok', false, 'error', 'Este pedido ya no se puede cancelar aquí. Escríbele a la tienda.'); end if;
  update public.pedidos set estado = 'cancelado', historial = public.historial_mas(historial, 'cancelado'), updated_at = now() where id = p.id;
  perform public.pedido_devolver_stock(p.id);
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Panel de la tienda ----------
create or replace function public.negocio_productos() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare tid uuid := public.negocio_de(auth.uid());
begin
  if tid is null then raise exception 'Sin permiso'; end if;
  return jsonb_build_object(
    'productos', (select coalesce(jsonb_agg(p order by p.orden, p.nombre), '[]') from public.productos p where p.negocio_id = tid),
    'limite', public.limite_negocio(tid, 'servicios'),
    'cobro', (select jsonb_build_object('modo', cobro_modo, 'pct', cobro_pct, 'despacho', despacho, 'despacho_costo', despacho_costo,
                'link', (public.link_tienda(id)).id is not null, 'online', reservas_online)
              from public.negocios where id = tid));
end $$;

create or replace function public.producto_guardar(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare tid uuid := public.negocio_de(auth.uid()); pid uuid := nullif(p ->> 'id', '')::uuid; lim int;
begin
  if tid is null or not public.es_dueno(tid) then raise exception 'Solo el dueño de la tienda'; end if;
  if pid is null then
    lim := coalesce((public.limite_negocio(tid, 'servicios'))::int, 5);
    if (select count(*) from public.productos where negocio_id = tid) >= lim then
      raise exception 'Tu plan permite % productos. Activa Premium para agregar más.', lim;
    end if;
    insert into public.productos (negocio_id, nombre, descripcion, categoria, precio, stock, foto, activo)
    values (tid, trim(p ->> 'nombre'), coalesce(trim(p ->> 'descripcion'), ''), coalesce(trim(p ->> 'categoria'), ''),
      (p ->> 'precio')::int, nullif(p ->> 'stock', '')::int, nullif(p ->> 'foto', ''), coalesce((p ->> 'activo')::boolean, true))
    returning id into pid;
  else
    update public.productos set nombre = trim(p ->> 'nombre'), descripcion = coalesce(trim(p ->> 'descripcion'), ''),
      categoria = coalesce(trim(p ->> 'categoria'), ''), precio = (p ->> 'precio')::int, stock = nullif(p ->> 'stock', '')::int,
      foto = case when p ? 'foto' then nullif(p ->> 'foto', '') else foto end, activo = coalesce((p ->> 'activo')::boolean, activo), updated_at = now()
    where id = pid and negocio_id = tid;
    if not found then raise exception 'Producto no encontrado'; end if;
  end if;
  return pid;
end $$;

create or replace function public.producto_borrar(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare tid uuid := public.negocio_de(auth.uid());
begin
  if tid is null or not public.es_dueno(tid) then raise exception 'Solo el dueño de la tienda'; end if;
  delete from public.productos where id = p_id and negocio_id = tid;
end $$;

create or replace function public.negocio_cobro_guardar(p_modo text, p_pct int, p_despacho boolean, p_costo int) returns void
language plpgsql security definer set search_path = '' as $$
declare tid uuid := public.negocio_de(auth.uid());
begin
  if tid is null or not public.es_dueno(tid) then raise exception 'Solo el dueño de la tienda'; end if;
  update public.negocios set cobro_modo = p_modo, cobro_pct = p_pct, despacho = p_despacho, despacho_costo = greatest(0, coalesce(p_costo, 0))
  where id = tid;
end $$;

create or replace function public.negocio_pedidos(p_estados text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare tid uuid := public.negocio_de(auth.uid());
begin
  if tid is null then raise exception 'Sin permiso'; end if;
  perform public.pedidos_vencer(tid);
  return (select coalesce(jsonb_agg(x order by x.created_at desc), '[]') from (
    select id, codigo, nombre, telefono, rut, email, entrega, direccion, nota, items, subtotal, despacho, total, a_pagar, estado,
      comprobante is not null as tiene_comprobante, comprobante_at, expira_at, nota_negocio, created_at, token
    from public.pedidos where negocio_id = tid and (p_estados is null or estado = any (p_estados)) order by created_at desc limit 300) x);
end $$;

create or replace function public.pedido_comprobante_ver(p_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select comprobante from public.pedidos where id = p_id and negocio_id = public.negocio_de(auth.uid())
$$;

-- Avanzar el pedido. Flujo: en_revision → confirmado/rechazado → preparando → listo → entregado.
create or replace function public.pedido_estado(p_id uuid, p_estado text, p_nota text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare tid uuid := public.negocio_de(auth.uid()); p public.pedidos; ok boolean;
begin
  if tid is null then raise exception 'Sin permiso'; end if;
  select * into p from public.pedidos where id = p_id and negocio_id = tid for update;
  if p.id is null then raise exception 'Pedido no encontrado'; end if;
  ok := (p.estado = 'en_revision' and p_estado in ('confirmado', 'rechazado'))
     or (p.estado = 'por_pagar' and p_estado in ('confirmado', 'cancelado'))          -- pagó por otro medio / no pagó
     or (p.estado = 'confirmado' and p_estado in ('preparando', 'listo', 'entregado', 'cancelado'))
     or (p.estado = 'preparando' and p_estado in ('listo', 'entregado'))
     or (p.estado = 'listo' and p_estado = 'entregado');
  if not ok then raise exception 'No se puede pasar de "%" a "%"', p.estado, p_estado; end if;
  update public.pedidos set estado = p_estado, expira_at = null, nota_negocio = coalesce(nullif(trim(p_nota), ''), nota_negocio),
    historial = public.historial_mas(historial, p_estado), updated_at = now() where id = p.id;
  if p_estado in ('rechazado', 'cancelado') then perform public.pedido_devolver_stock(p.id); end if;
end $$;

-- Borrar comprobantes antiguos de pedidos (los llama la tarea automática).
create or replace function public.pedidos_tareas() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v int; b int;
begin
  v := public.pedidos_vencer(null);
  update public.pedidos set comprobante = null
  where comprobante is not null and comprobante_at < now() - make_interval(days => coalesce(public.cfg_int('dias_comprobantes'), 30));
  get diagnostics b = row_count;
  return jsonb_build_object('vencidos', v, 'comprobantes_borrados', b);
end $$;

revoke execute on function public.pedido_devolver_stock(uuid), public.pedidos_vencer(uuid), public.pedidos_tareas(),
  public.negocio_modelo(text), public.catalogo_publico(text),
  public.pedido_crear(uuid, jsonb, text, text, text, text, text, text, text), public.pedido_ver(text), public.pedido_comprobante(text, text),
  public.pedido_cancelar(text), public.negocio_productos(), public.producto_guardar(jsonb), public.producto_borrar(uuid),
  public.negocio_cobro_guardar(text, int, boolean, int), public.negocio_pedidos(text[]), public.pedido_comprobante_ver(uuid),
  public.pedido_estado(uuid, text, text) from public, anon, authenticated;
grant execute on function public.negocio_modelo(text), public.catalogo_publico(text),
  public.pedido_crear(uuid, jsonb, text, text, text, text, text, text, text), public.pedido_ver(text), public.pedido_comprobante(text, text),
  public.pedido_cancelar(text) to anon, authenticated;
grant execute on function public.negocio_productos(), public.producto_guardar(jsonb), public.producto_borrar(uuid),
  public.negocio_cobro_guardar(text, int, boolean, int), public.negocio_pedidos(text[]), public.pedido_comprobante_ver(uuid),
  public.pedido_estado(uuid, text, text) to authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on all functions in schema public to service_role';
  end if;
  -- Tarea automática de pedidos (cada 5 minutos), si pg_cron está instalado.
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'cf-pedidos';
    perform cron.schedule('cf-pedidos', '*/5 * * * *', 'select public.pedidos_tareas();');
  end if;
end $$;


-- =====================================================================
-- 23. (v2.3) Súper admin avanzado: cobro y límites por negocio, ficha del negocio, rubros
-- =====================================================================
alter table public.negocios add column if not exists limites_extra jsonb not null default '{}';
-- Por defecto: reservas cobran abono fijo; tiendas, el total. (Migración única desde v2.2.)
alter table public.negocios alter column cobro_modo set default 'abono';
do $$
begin
  if not exists (select 1 from public.config where clave = 'mig_cobro_23') then
    update public.negocios n set cobro_modo = 'abono'
    where cobro_modo = 'total' and coalesce((public.negocio_rubro(n.id)) ->> 'modelo', 'reservas') <> 'catalogo';
    insert into public.config (clave, valor) values ('mig_cobro_23', 'true');
  end if;
end $$;
-- Las tiendas nuevas parten cobrando el total.
create or replace function public.negocio_cobro_inicial() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.rubro_id is not null and (select modelo from public.rubros where id = new.rubro_id) = 'catalogo' then new.cobro_modo := 'total'; end if;
  return new;
end $$;
drop trigger if exists negocio_z_cobro_inicial on public.negocios;
create trigger negocio_z_cobro_inicial before insert on public.negocios for each row execute function public.negocio_cobro_inicial();

-- Súper admin: cobro (abono o total), pedidos online, despacho y límites propios de un negocio.
create or replace function public.admin_negocio_cobro(p_id uuid, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare lim jsonb := '{}'; k text;
begin
  perform public.super_check();
  for k in select unnest(array['reservas_mes', 'servicios', 'promos', 'equipo', 'clientes_cuenta']) loop
    if (p -> 'limites') ? k and coalesce(p -> 'limites' ->> k, '') ~ '^[0-9]{1,6}$' then lim := lim || jsonb_build_object(k, (p -> 'limites' ->> k)::int); end if;
  end loop;
  update public.negocios set
    cobro_modo = coalesce(p ->> 'cobro_modo', cobro_modo),
    cobro_pct = coalesce((p ->> 'cobro_pct')::int, cobro_pct),
    despacho = coalesce((p ->> 'despacho')::boolean, despacho),
    despacho_costo = coalesce((p ->> 'despacho_costo')::int, despacho_costo),
    limites_extra = case when p ? 'limites' then lim else limites_extra end
  where id = p_id;
  if not found then raise exception 'Negocio no encontrado'; end if;
  perform public.auditar('negocio_cobro', p_id::text || ' ' || p::text);
end $$;

-- Ficha completa de un negocio para el súper admin y el socio.
create or replace function public.admin_negocio_detalle(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare t public.negocios; mes timestamptz := date_trunc('month', now()); modelo text;
begin
  perform public.admin_check();
  select * into t from public.negocios where id = p_id;
  if t.id is null then raise exception 'Negocio no encontrado'; end if;
  modelo := coalesce((public.negocio_rubro(t.id)) ->> 'modelo', 'reservas');
  return jsonb_build_object(
    'modelo', modelo, 'rubro', public.negocio_rubro(t.id),
    'cobro', jsonb_build_object('modo', t.cobro_modo, 'pct', t.cobro_pct, 'despacho', t.despacho, 'despacho_costo', t.despacho_costo,
      'link', (public.link_tienda(t.id)).url, 'link_monto', (public.link_activo(t.id, 'abono')).monto),
    'limites_extra', t.limites_extra,
    'limites', (select jsonb_object_agg(k, public.limite_negocio(t.id, k)) from unnest(array['reservas_mes', 'servicios', 'promos', 'equipo', 'clientes_cuenta']) k),
    'premium', public.negocio_es_premium(t.id), 'premium_hasta', t.premium_hasta,
    'mes', case when modelo = 'catalogo' then jsonb_build_object(
        'pedidos', (select count(*) from public.pedidos where negocio_id = t.id and created_at >= mes and estado not in ('expirado', 'cancelado', 'rechazado')),
        'ventas', (select coalesce(sum(total), 0) from public.pedidos where negocio_id = t.id and created_at >= mes and estado in ('confirmado', 'preparando', 'listo', 'entregado')),
        'cobrado_online', (select coalesce(sum(a_pagar), 0) from public.pedidos where negocio_id = t.id and created_at >= mes and estado in ('confirmado', 'preparando', 'listo', 'entregado')),
        'por_revisar', (select count(*) from public.pedidos where negocio_id = t.id and estado = 'en_revision'),
        'productos', (select count(*) from public.productos where negocio_id = t.id),
        'agotados', (select count(*) from public.productos where negocio_id = t.id and stock = 0))
      else jsonb_build_object(
        'reservas', (select count(*) from public.reservas where negocio_id = t.id and created_at >= mes and estado not in ('expirada', 'rechazada')),
        'ventas', (select coalesce(sum(total), 0) from public.reservas where negocio_id = t.id and created_at >= mes and estado = 'completada'),
        'cobrado_online', (select coalesce(sum(abono_monto), 0) from public.reservas where negocio_id = t.id and created_at >= mes and abono_estado in ('pagado', 'aplicado')),
        'por_revisar', (select count(*) from public.reservas where negocio_id = t.id and estado = 'en_revision'),
        'servicios', (select count(*) from public.servicios where negocio_id = t.id)) end,
    'ultimos', case when modelo = 'catalogo' then
        (select coalesce(jsonb_agg(x), '[]') from (select codigo as ref, nombre, total, estado, created_at from public.pedidos
          where negocio_id = t.id order by created_at desc limit 10) x)
      else (select coalesce(jsonb_agg(x), '[]') from (select to_char(fecha, 'DD/MM') || ' ' || to_char(hora, 'HH24:MI') as ref, nombre, total, estado, created_at
          from public.reservas where negocio_id = t.id order by created_at desc limit 10) x) end,
    'equipo', (select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'email', email, 'rol', rol, 'visto_at', visto_at)), '[]')
      from public.perfiles where negocio_id = t.id and rol in ('negocio', 'equipo')));
end $$;

-- Resumen global por modelo de negocio (para el panel del súper admin).
create or replace function public.admin_resumen_modelos() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_check();
  return jsonb_build_object(
    'por_rubro', (select coalesce(jsonb_agg(x order by x.negocios desc), '[]') from (
      select coalesce(r.icono || ' ' || r.nombre, 'Sin rubro') as rubro, coalesce(r.modelo, 'reservas') as modelo, count(n.id) as negocios
      from public.negocios n left join public.rubros r on r.id = n.rubro_id group by r.icono, r.nombre, r.modelo) x),
    'pedidos_mes', (select count(*) from public.pedidos where created_at >= date_trunc('month', now()) and estado not in ('expirado', 'cancelado', 'rechazado')),
    'ventas_tiendas_mes', (select coalesce(sum(total), 0) from public.pedidos where created_at >= date_trunc('month', now())
      and estado in ('confirmado', 'preparando', 'listo', 'entregado')),
    'pedidos_por_revisar', (select count(*) from public.pedidos where estado = 'en_revision'));
end $$;

revoke execute on function public.negocio_cobro_inicial(), public.admin_negocio_cobro(uuid, jsonb), public.admin_negocio_detalle(uuid),
  public.admin_resumen_modelos() from public, anon, authenticated;
grant execute on function public.admin_negocio_cobro(uuid, jsonb), public.admin_negocio_detalle(uuid), public.admin_resumen_modelos() to authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on all functions in schema public to service_role';
  end if;
end $$;

-- Que la API de Supabase vea las funciones nuevas al instante.
notify pgrst, 'reload schema';
