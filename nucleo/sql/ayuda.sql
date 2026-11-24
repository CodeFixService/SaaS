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
  perform <CHK>;
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
  perform <CHK>;
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
  perform <CHK>;
  return (select coalesce(jsonb_agg(x order by x.ultimo desc), '[]') from (
    select c.cuenta, max(c.email) as email, max(c.nombre) as nombre, max(c.rol) as rol, max(c.creado) as ultimo,
      (array_agg(c.texto order by c.id desc))[1] as texto, (array_agg(c.de order by c.id desc))[1] as de,
      count(*) filter (where c.de = 'persona' and not c.leido) as sin_leer
    from public.cfx_chat c group by c.cuenta order by max(c.creado) desc limit 200) x);
end $$;

create or replace function public.cfx_chat_hilo(p_cuenta uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  update public.cfx_chat set leido = true where cuenta = p_cuenta and de = 'persona' and not leido;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'de', de, 'texto', texto, 'creado', creado) order by id), '[]')
          from (select * from public.cfx_chat where cuenta = p_cuenta order by id desc limit 200) x);
end $$;

create or replace function public.cfx_chat_responder(p_cuenta uuid, p_texto text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare t text := trim(coalesce(p_texto, '')); i bigint; o public.cfx_chat;
begin
  perform <CHK>;
  if t = '' or length(t) > 1000 then raise exception 'Escribe la respuesta (máx. 1000 letras)'; end if;
  select * into o from public.cfx_chat where cuenta = p_cuenta order by id desc limit 1;
  if o.id is null then raise exception 'Conversación no encontrada'; end if;
  insert into public.cfx_chat (cuenta, email, nombre, rol, de, texto, leido) values (p_cuenta, o.email, o.nombre, o.rol, 'soporte', t, false) returning id into i;
  update public.cfx_chat set leido = true where cuenta = p_cuenta and de = 'persona' and not leido;
  perform public.cfx_avisar(p_cuenta, '💬 Soporte te respondió', left(t, 200));
  return i;
end $$;

-- El administrador escribe primero a una cuenta (consejos o recomendaciones): queda en su chat de soporte (🛟) y en CM → Mensajes.
create or replace function public.cfx_chat_iniciar(p_cuenta uuid, p_texto text, p_email text default '', p_nombre text default '', p_rol text default 'negocio') returns bigint
language plpgsql security definer set search_path = '' as $$
declare t text := trim(coalesce(p_texto, '')); i bigint; o public.cfx_chat;
begin
  perform <CHK>;
  if t = '' or length(t) > 1000 then raise exception 'Escribe el mensaje (máx. 1000 letras)'; end if;
  select * into o from public.cfx_chat where cuenta = p_cuenta order by id desc limit 1;
  insert into public.cfx_chat (cuenta, email, nombre, rol, de, texto, leido)
  values (p_cuenta, coalesce(o.email, left(coalesce(p_email, ''), 200)), coalesce(o.nombre, left(coalesce(p_nombre, ''), 120)), coalesce(o.rol, left(coalesce(p_rol, 'negocio'), 20)), 'soporte', t, false)
  returning id into i;
  perform public.cfx_avisar(p_cuenta, '💬 Soporte te escribió', left(t, 200));
  return i;
end $$;
revoke all on function public.cfx_chat_iniciar(uuid, text, text, text, text) from public, anon;
grant execute on function public.cfx_chat_iniciar(uuid, text, text, text, text) to authenticated;

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

-- ---------- 4) G55 🐞🎁 Reporte de fallas con premio ----------
-- Cualquiera con cuenta (Más → Cuenta y ayuda → 🐞 Reportar una falla) cuenta qué pasó, con foto opcional; la app adjunta sola
-- versión, pantalla, celular y sus últimos errores. Le llega al Centro de Mando (aviso + push) y se ve en CM → Mensajes → 🐞 Fallas.
-- "🎁 Es real" suma 15 días de Premium al negocio (clientes y equipo: solo las gracias, no pagan), una vez por reporte.
create table if not exists public.cfx_fallas (
  id        bigserial primary key,
  cuenta    uuid not null,
  email     text not null default '',
  nombre    text not null default '',
  rol       text not null default '',
  texto     text not null check (length(texto) between 5 and 1500),
  foto      text check (foto is null or (foto ~ '^data:image/(webp|jpeg|png);base64,' and length(foto) <= 400000)),
  datos     jsonb not null default '{}',
  estado    text not null default 'nuevo' check (estado in ('nuevo', 'revisando', 'listo', 'real', 'no')),
  respuesta text not null default '',
  dias      int not null default 0,
  creado    timestamptz not null default now(),
  resuelto  timestamptz
);
-- G155 🔧 'listo' = Claude lo arregló (nota en 'arreglo'); queda abierta hasta que Josué la marca ✅ Revisada en el CM. Nunca se cierra sola.
alter table public.cfx_fallas add column if not exists arreglo text not null default '';
alter table public.cfx_fallas add column if not exists listo timestamptz;
alter table public.cfx_fallas drop constraint if exists cfx_fallas_estado_check;
alter table public.cfx_fallas add constraint cfx_fallas_estado_check check (estado in ('nuevo', 'revisando', 'listo', 'real', 'no'));
create index if not exists cfx_fallas_cuenta_idx on public.cfx_fallas (cuenta, creado);
create index if not exists cfx_fallas_estado_idx on public.cfx_fallas (estado, id);
alter table public.cfx_fallas enable row level security;
revoke all on public.cfx_fallas from anon, authenticated;

create or replace function public.cfx_falla_enviar(p_texto text, p_foto text default null, p_datos jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); u uuid := (y ->> 'id')::uuid; t text := trim(coalesce(p_texto, '')); f text := nullif(trim(coalesce(p_foto, '')), ''); d jsonb := coalesce(p_datos, '{}'); i bigint;
begin
  if u is null then raise exception 'Inicia sesión'; end if;
  if length(t) < 5 then raise exception 'Cuéntanos qué pasó (mínimo 5 letras)'; end if;
  if length(t) > 1500 then raise exception 'Máximo 1500 letras'; end if;
  if f is not null and (f !~ '^data:image/(webp|jpeg|png);base64,' or length(f) > 400000) then raise exception 'La foto no sirve: usa una captura o foto JPG/PNG'; end if;
  if jsonb_typeof(d) <> 'object' or length(d::text) > 8000 then d := '{}'; end if;
  -- G138 (Josué): reportar sin tope chico (antes 3 al día). Solo 1 minuto entre reportes y 30 al día por cuenta, contra el abuso.
  if exists (select 1 from public.cfx_fallas where cuenta = u and creado > now() - interval '1 minute') then raise exception 'Espera 1 minuto antes de enviar otro reporte'; end if;
  if (select count(*) from public.cfx_fallas where cuenta = u and creado > now() - interval '1 day') >= 30 then raise exception 'Ya enviaste 30 reportes hoy. Mañana puedes enviar más 🙏'; end if;
  if (select count(*) from public.cfx_fallas where estado in ('nuevo', 'revisando')) >= 500 then raise exception 'Recibimos muchos reportes. Prueba de nuevo mañana 🙏'; end if;
  delete from public.cfx_fallas where estado in ('real', 'no') and resuelto < now() - interval '180 days';
  insert into public.cfx_fallas (cuenta, email, nombre, rol, texto, foto, datos)
  values (u, coalesce(y ->> 'email', ''), left(coalesce(y ->> 'nombre', ''), 80), coalesce(y ->> 'rol', ''), t, f, d) returning id into i;
  perform public.cfx_al_cm('🐞 Falla: ' || coalesce(nullif(y ->> 'nombre', ''), y ->> 'email', 'reporte'), left(t, 200), 'falla');
  return jsonb_build_object('id', i);
end $$;

-- Mis últimos reportes (para que la persona vea en qué van).
-- premio: si a esta cuenta le tocan los 15 días (solo negocios: clientes y equipo no pagan).
create or replace function public.cfx_fallas_mias() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('premio', coalesce(public.cfx_yo() ->> 'rol', '') = 'negocio', 'lista',
    (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'texto', left(texto, 80), 'estado', estado, 'dias', dias, 'creado', creado) order by id desc), '[]')
     from (select * from public.cfx_fallas where cuenta = auth.uid() order by id desc limit 5) x))
$$;

-- Administrador: lista (sin la foto), detalle (con la foto; lo marca "revisando") y respuesta.
create or replace function public.cfx_fallas_lista(p_estado text default 'abiertos') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'cuenta', f.cuenta, 'email', f.email, 'nombre', f.nombre, 'rol', f.rol, 'texto', f.texto,
      'con_foto', f.foto is not null, 'datos', f.datos, 'estado', f.estado, 'respuesta', f.respuesta, 'dias', f.dias, 'creado', f.creado, 'resuelto', f.resuelto,
      'arreglo', f.arreglo, 'listo', f.listo,
      'premiados', (select count(*) from public.cfx_fallas g where g.cuenta = f.cuenta and g.estado = 'real')) order by f.id desc), '[]')
    from (select * from public.cfx_fallas where case coalesce(p_estado, 'abiertos') when 'abiertos' then estado in ('nuevo', 'revisando', 'listo') when 'todos' then true else estado = p_estado end
          order by id desc limit 200) f);
end $$;

create or replace function public.cfx_falla_ver(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare f public.cfx_fallas;
begin
  perform <CHK>;
  update public.cfx_fallas set estado = 'revisando' where id = p_id and estado = 'nuevo';
  select * into f from public.cfx_fallas where id = p_id;
  if f.id is null then raise exception 'Reporte no encontrado'; end if;
  return jsonb_build_object('id', f.id, 'estado', f.estado, 'foto', f.foto);
end $$;

create or replace function public.cfx_falla_resolver(p_id bigint, p_real boolean, p_mensaje text default '', p_dias int default 15) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare f public.cfx_fallas; m text := left(trim(coalesce(p_mensaje, '')), 500); n int := 0; h timestamptz;
begin
  perform <CHK>;
  select * into f from public.cfx_fallas where id = p_id for update;
  if f.id is null then raise exception 'Reporte no encontrado'; end if;
  if f.estado in ('real', 'no') then raise exception 'Este reporte ya se respondió'; end if;
  if p_real then
    if f.rol = 'negocio' then
      n := coalesce(p_dias, 15);
      if n not between 1 and 60 then raise exception 'De 1 a 60 días'; end if;
      h := public.cfx_dar_premium(f.cuenta, f.rol, n);
      if h is null then raise exception 'No se encontró la cuenta (¿la borró?)'; end if;
      perform public.cfx_avisar(f.cuenta, '🎁 Gracias: tu reporte era real', 'Sumamos ' || n || ' días de Premium (hasta el ' || to_char(h at time zone 'America/Santiago', 'DD-MM-YYYY') || '). ' ||
        coalesce(nullif(m, ''), '¡Gracias por ayudarnos a mejorar!'));
    else
      perform public.cfx_avisar(f.cuenta, '🙌 Gracias: tu reporte era real', coalesce(nullif(m, ''), 'Ya lo estamos arreglando. ¡Gracias por ayudarnos a mejorar!'));
    end if;
  else
    perform public.cfx_avisar(f.cuenta, '🐞 Revisamos tu reporte', coalesce(nullif(m, ''),
      'Gracias por avisarnos. Lo revisamos y en ese punto la app funciona bien. Si vuelve a pasar, escríbenos al 💬 Chat con soporte.'));
  end if;
  update public.cfx_fallas set estado = case when p_real then 'real' else 'no' end, respuesta = m, dias = n, resuelto = now() where id = f.id;
  perform public.cfx_anotar('falla', case when p_real then 'real' || case when n > 0 then ' (+' || n || ' días Premium)' else '' end else 'no es falla' end || ' · #' || f.id || ' ' || f.email);
  return jsonb_build_object('estado', case when p_real then 'real' else 'no' end, 'dias', n, 'hasta', h);
end $$;
-- ---------- G155 🔧 Túnel de fallas para Claude ----------
-- Josué crea la llave en CM → Mensajes → 🐞 Fallas → 🔧 Túnel para Claude (el CM la fija en las 6 bases). La base guarda SOLO su huella sha256.
-- Con la llave (cabecera x-tunel-key) se puede: ver las fallas abiertas (sin correo, nombre ni cuenta) y marcarlas 🔧 Lista para revisar.
-- NO se puede responder, premiar, borrar ni cerrar: eso lo hace solo Josué (✅ Revisada / ❌ No es falla / ↩️ Sigue fallando).
create table if not exists public.cfx_tunel (
  id     int primary key default 1 check (id = 1),
  hash   text not null check (hash ~ '^[0-9a-f]{64}$'),
  creado timestamptz not null default now(),
  usado  timestamptz
);
alter table public.cfx_tunel enable row level security;
revoke all on public.cfx_tunel from anon, authenticated;

create or replace function public.cfx_tunel_ok() returns boolean
language plpgsql security definer set search_path = '' as $$
declare k text; h text;
begin
  begin k := (nullif(current_setting('request.headers', true), '')::jsonb) ->> 'x-tunel-key'; exception when others then k := null; end;
  if k is null or length(k) < 32 or length(k) > 200 then return false; end if;
  select t.hash into h from public.cfx_tunel t where t.id = 1;
  if h is null or encode(pg_catalog.sha256(convert_to(k, 'UTF8')), 'hex') <> h then return false; end if;
  update public.cfx_tunel set usado = now() where id = 1 and (usado is null or usado < now() - interval '1 minute');
  return true;
end $$;

-- Admin: crear/cambiar (p_hash = sha256 en hex de la llave) o cerrar (null) el túnel; y ver su estado.
create or replace function public.cfx_tunel_fijar(p_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare h text := lower(trim(coalesce(p_hash, '')));
begin
  perform <CHK>;
  if h = '' then
    delete from public.cfx_tunel where id = 1;
    perform public.cfx_anotar('tunel', '🔧 túnel de fallas cerrado');
    return jsonb_build_object('activo', false);
  end if;
  if h !~ '^[0-9a-f]{64}$' then raise exception 'Llave inválida'; end if;
  insert into public.cfx_tunel (id, hash) values (1, h) on conflict (id) do update set hash = excluded.hash, creado = now(), usado = null;
  perform public.cfx_anotar('tunel', '🔧 llave nueva del túnel de fallas');
  return jsonb_build_object('activo', true);
end $$;

create or replace function public.cfx_tunel_estado() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare t public.cfx_tunel;
begin
  perform <CHK>;
  select * into t from public.cfx_tunel where id = 1;
  return jsonb_build_object('activo', t.id is not null, 'creado', t.creado, 'usado', t.usado);
end $$;

-- Claude (con la llave): fallas abiertas (o todas), sin datos de la persona.
create or replace function public.cfx_tunel_fallas(p_todas boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.cfx_tunel_ok() then raise exception 'Sin permiso'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'rol', f.rol, 'texto', f.texto, 'con_foto', f.foto is not null, 'datos', f.datos,
      'estado', f.estado, 'arreglo', f.arreglo, 'respuesta', f.respuesta, 'creado', f.creado, 'listo', f.listo, 'resuelto', f.resuelto) order by f.id), '[]')
    from (select * from public.cfx_fallas where coalesce(p_todas, false) or estado in ('nuevo', 'revisando', 'listo') order by id desc limit 200) f);
end $$;

create or replace function public.cfx_tunel_foto(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare f text;
begin
  if not public.cfx_tunel_ok() then raise exception 'Sin permiso'; end if;
  select foto into f from public.cfx_fallas where id = p_id;
  return jsonb_build_object('id', p_id, 'foto', f);
end $$;

-- Claude marca 🔧 Lista para revisar (con nota de qué arregló y en qué versión). Josué la revisa y la cierra en el CM.
create or replace function public.cfx_tunel_listo(p_id bigint, p_nota text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n text := left(trim(coalesce(p_nota, '')), 500); f public.cfx_fallas;
begin
  if not public.cfx_tunel_ok() then raise exception 'Sin permiso'; end if;
  if length(n) < 3 then raise exception 'Escribe qué se arregló'; end if;
  update public.cfx_fallas set estado = 'listo', listo = now(),
    arreglo = left(case when arreglo = '' then '' else arreglo || E'\n' end || '🔧 ' || to_char(now() at time zone 'America/Santiago', 'DD-MM HH24:MI') || ' · ' || n, 2000)
    where id = p_id and estado in ('nuevo', 'revisando') returning * into f;
  if f.id is null then raise exception 'Solo se marca una falla abierta (nueva o revisando)'; end if;
  perform public.cfx_anotar('falla', '🔧 lista para revisar · #' || f.id);
  perform public.cfx_al_cm('🔧 Falla #' || f.id || ' lista para revisar', left(n, 200), 'falla');
  return jsonb_build_object('id', f.id, 'estado', f.estado);
end $$;

-- Admin: 📥 Descargar fallas (CM) → fotos de varias fallas de una vez, SIN cambiar su estado (bajarlas no es revisarlas).
create or replace function public.cfx_fallas_fotos(p_ids bigint[]) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  if coalesce(cardinality(p_ids), 0) > 200 then raise exception 'Máximo 200 fallas'; end if;
  return (select coalesce(jsonb_object_agg(f.id::text, f.foto), '{}') from public.cfx_fallas f where f.id = any (p_ids) and f.foto is not null);
end $$;

-- Josué: ↩️ Sigue fallando → vuelve a 'revisando' con su nota (Claude la ve en el túnel).
create or replace function public.cfx_falla_reabrir(p_id bigint, p_nota text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n text := left(trim(coalesce(p_nota, '')), 500); f public.cfx_fallas;
begin
  perform <CHK>;
  update public.cfx_fallas set estado = 'revisando', listo = null,
    arreglo = left(arreglo || E'\n' || '↩️ ' || to_char(now() at time zone 'America/Santiago', 'DD-MM HH24:MI') || ' · Sigue fallando' || case when n = '' then '' else ': ' || n end, 2000)
    where id = p_id and estado = 'listo' returning * into f;
  if f.id is null then raise exception 'Solo se devuelve una falla marcada 🔧 Lista'; end if;
  perform public.cfx_anotar('falla', '↩️ sigue fallando · #' || f.id);
  return jsonb_build_object('id', f.id, 'estado', f.estado);
end $$;
revoke all on function public.cfx_tunel_ok(), public.cfx_tunel_fijar(text), public.cfx_tunel_estado(), public.cfx_tunel_fallas(boolean), public.cfx_tunel_foto(bigint),
  public.cfx_tunel_listo(bigint, text), public.cfx_falla_reabrir(bigint, text), public.cfx_fallas_fotos(bigint[]) from public, anon, authenticated;
grant execute on function public.cfx_tunel_fijar(text), public.cfx_tunel_estado(), public.cfx_falla_reabrir(bigint, text), public.cfx_fallas_fotos(bigint[]) to authenticated;
grant execute on function public.cfx_tunel_fallas(boolean), public.cfx_tunel_foto(bigint), public.cfx_tunel_listo(bigint, text) to anon, authenticated;

revoke all on function public.cfx_falla_enviar(text, text, jsonb), public.cfx_fallas_mias(), public.cfx_fallas_lista(text), public.cfx_falla_ver(bigint),
  public.cfx_falla_resolver(bigint, boolean, text, int) from public, anon;
grant execute on function public.cfx_falla_enviar(text, text, jsonb), public.cfx_fallas_mias(), public.cfx_fallas_lista(text), public.cfx_falla_ver(bigint),
  public.cfx_falla_resolver(bigint, boolean, text, int) to authenticated;

-- ---------- PIN de la app (4 a 6 números), guardado en la cuenta. Se pide al abrir la app y tras 5 min sin usarla. ----------
create table if not exists public.cfx_pin (
  usuario    uuid primary key references auth.users (id) on delete cascade,
  hash       text not null,
  fallos     int not null default 0,
  espera     timestamptz,
  actualizado timestamptz not null default now()
);
alter table public.cfx_pin enable row level security;
revoke all on public.cfx_pin from anon, authenticated;

create or replace function public.cfx_pin_estado() returns boolean
language sql stable security definer set search_path = '' as $$ select exists (select 1 from public.cfx_pin where usuario = auth.uid()) $$;

create or replace function public.cfx_pin_guardar(p_pin text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  if coalesce(p_pin, '') = '' then delete from public.cfx_pin where usuario = auth.uid(); return false; end if;
  if p_pin !~ '^[0-9]{4,6}$' then raise exception 'El PIN debe tener de 4 a 6 números'; end if;
  insert into public.cfx_pin (usuario, hash) values (auth.uid(), encode(sha256(convert_to(auth.uid()::text || ':' || p_pin, 'UTF8')), 'hex'))
  on conflict (usuario) do update set hash = excluded.hash, fallos = 0, espera = null, actualizado = now();
  return true;
end $$;

create or replace function public.cfx_pin_verificar(p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.cfx_pin;
begin
  select * into r from public.cfx_pin where usuario = auth.uid();
  if not found then return jsonb_build_object('ok', true); end if;
  if r.espera is not null and r.espera > now() then return jsonb_build_object('ok', false, 'espera', ceil(extract(epoch from r.espera - now()))); end if;
  if r.hash = encode(sha256(convert_to(auth.uid()::text || ':' || coalesce(p_pin, ''), 'UTF8')), 'hex') then
    update public.cfx_pin set fallos = 0, espera = null where usuario = auth.uid(); return jsonb_build_object('ok', true);
  end if;
  update public.cfx_pin set fallos = case when r.fallos + 1 >= 5 then 0 else r.fallos + 1 end,
    espera = case when r.fallos + 1 >= 5 then now() + interval '5 minutes' else null end where usuario = auth.uid();
  return jsonb_build_object('ok', false, 'quedan', greatest(0, 4 - r.fallos), 'espera', case when r.fallos + 1 >= 5 then 300 else 0 end);
end $$;
revoke all on function public.cfx_pin_estado(), public.cfx_pin_guardar(text), public.cfx_pin_verificar(text) from public, anon;
grant execute on function public.cfx_pin_estado(), public.cfx_pin_guardar(text), public.cfx_pin_verificar(text) to authenticated;
