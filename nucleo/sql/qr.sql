
-- ---------- G32 d · 🔑 Entrar con QR (núcleo): el celular con sesión aprueba y el computador entra sin escribir la clave ----------
-- 1) El computador (sin cuenta) pide un código: cfx_qr_crear → { token (va en el QR), codigo (6 letras para escribir), secreto (solo el PC) }.
-- 2) El celular con sesión lo abre o lo escribe: cfx_qr_ver muestra qué computador es → "Sí, entrar" = cfx_qr_aprobar.
-- 3) El computador pregunta cada 2 s (cfx_qr_estado). Aprobado → la Edge Function (clave de servidor) canjea UNA vez (cfx_qr_canjear)
--    y devuelve un enlace mágico de un solo uso; el computador lo usa y queda con sesión. Vence a los 2 minutos.
create table if not exists public.cfx_login_qr (
  token       text primary key,
  codigo      text not null,
  secreto     text not null,              -- sha256 del secreto (el secreto real solo lo tiene el computador)
  equipo      text,
  user_id     uuid references auth.users(id) on delete cascade,
  aprobado_at timestamptz,
  usado_at    timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists cfx_login_qr_codigo on public.cfx_login_qr (codigo);
alter table public.cfx_login_qr enable row level security;
revoke all on public.cfx_login_qr from anon, authenticated;

create or replace function public.cfx_qr_crear(p_equipo text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t text; c text; s text; L text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; b bytea; i int;
begin
  delete from public.cfx_login_qr where created_at < now() - interval '10 minutes';
  if (select count(*) from public.cfx_login_qr where created_at > now() - interval '2 minutes') > 300 then
    return jsonb_build_object('ok', false, 'error', 'Muchos intentos. Espera un minuto.');
  end if;
  t := encode(extensions.gen_random_bytes(18), 'hex');
  s := encode(extensions.gen_random_bytes(24), 'hex');
  loop
    b := extensions.gen_random_bytes(6); c := '';
    for i in 0..5 loop c := c || substr(L, 1 + get_byte(b, i) % length(L), 1); end loop;
    exit when not exists (select 1 from public.cfx_login_qr where codigo = c and usado_at is null);
  end loop;
  insert into public.cfx_login_qr (token, codigo, secreto, equipo)
  values (t, c, encode(extensions.digest(s, 'sha256'), 'hex'), left(nullif(regexp_replace(coalesce(p_equipo, ''), '[^[:alnum:] ·.()-]', '', 'g'), ''), 60));
  return jsonb_build_object('ok', true, 'token', t, 'codigo', c, 'secreto', s, 'vence', 120);
end $$;
grant execute on function public.cfx_qr_crear(text) to anon, authenticated;

-- p = token del QR o el código de 6 letras. Solo códigos de menos de 2 minutos, sin aprobar.
create or replace function public.cfx_qr_buscar(p text) returns public.cfx_login_qr
language sql stable security definer set search_path = '' as $$
  select * from public.cfx_login_qr
  where (token = lower(trim(p)) or codigo = upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')))
    and created_at > now() - interval '2 minutes' and aprobado_at is null and usado_at is null
  order by created_at desc limit 1 $$;
revoke all on function public.cfx_qr_buscar(text) from public, anon, authenticated;

create or replace function public.cfx_qr_ver(p text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare q public.cfx_login_qr := public.cfx_qr_buscar(p);
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Primero inicia sesión en este celular'); end if;
  if q.token is null then return jsonb_build_object('ok', false, 'error', 'El código venció o no existe. En el computador toca "Otro código".'); end if;
  return jsonb_build_object('ok', true, 'equipo', coalesce(q.equipo, 'Computador'),
    'segundos', greatest(0, 120 - extract(epoch from now() - q.created_at)::int));
end $$;
revoke all on function public.cfx_qr_ver(text) from public, anon;
grant execute on function public.cfx_qr_ver(text) to authenticated;

-- El computador pregunta: esperando | aprobado | vencido (con su secreto: nadie más puede preguntar).
create or replace function public.cfx_qr_estado(p_token text, p_secreto text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select case when usado_at is not null then 'vencido'
                               when aprobado_at is not null and aprobado_at > now() - interval '2 minutes' then 'aprobado'
                               when aprobado_at is null and created_at > now() - interval '2 minutes' then 'esperando'
                               else 'vencido' end
    from public.cfx_login_qr where token = p_token and secreto = encode(extensions.digest(coalesce(p_secreto, ''), 'sha256'), 'hex')), 'vencido') $$;
grant execute on function public.cfx_qr_estado(text, text) to anon, authenticated;


-- ---------- G32 f · 🔒 3 claves malas: no se bloquea la cuenta, solo la clave y el QR; se entra con el enlace al correo (gratis) ----------
-- Se cuenta por correo (exista o no la cuenta: no revela nada). Al entrar con el enlace (amr otp/magiclink) se desbloquea.
create table if not exists public.cfx_login_fallos (
  email      text primary key,
  fallos     int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.cfx_login_fallos enable row level security;
revoke all on public.cfx_login_fallos from anon, authenticated;

create or replace function public.cfx_login_bloqueado(p_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select fallos >= 3 from public.cfx_login_fallos where email = lower(trim(coalesce(p_email, '')))), false) $$;
grant execute on function public.cfx_login_bloqueado(text) to anon, authenticated;

-- Clave mala → suma 1 y responde si quedó bloqueada (y cuántos intentos quedan).
create or replace function public.cfx_login_fallo(p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(coalesce(p_email, ''))); n int;
begin
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false); end if;
  delete from public.cfx_login_fallos where updated_at < now() - interval '30 days';
  insert into public.cfx_login_fallos (email, fallos) values (e, 1)
  on conflict (email) do update set fallos = least(public.cfx_login_fallos.fallos + 1, 99), updated_at = now()
  returning fallos into n;
  return jsonb_build_object('ok', true, 'bloqueado', n >= 3, 'quedan', greatest(0, 3 - n));
end $$;
grant execute on function public.cfx_login_fallo(text) to anon, authenticated;

-- Con sesión: clave correcta (sin bloqueo) o entró por el enlace del correo → contador a cero. 'estaba' = venía bloqueada (ofrecer cambiar la clave).
create or replace function public.cfx_login_desbloquear() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare e text := lower(coalesce(auth.jwt() ->> 'email', '')); f int; enlace boolean;
begin
  if auth.uid() is null or e = '' then return jsonb_build_object('ok', false); end if;
  enlace := exists (select 1 from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) a where a ->> 'method' in ('otp', 'magiclink', 'email/signup', 'recovery'));
  select fallos into f from public.cfx_login_fallos where email = e;
  if f is null then return jsonb_build_object('ok', true, 'estaba', false); end if;
  if f >= 3 and not enlace then return jsonb_build_object('ok', false, 'bloqueado', true); end if;
  delete from public.cfx_login_fallos where email = e;
  return jsonb_build_object('ok', true, 'estaba', f >= 3);
end $$;
revoke all on function public.cfx_login_desbloquear() from public, anon;
grant execute on function public.cfx_login_desbloquear() to authenticated;

-- Aprobar (celular) y canjear (solo la Edge Function, clave de servidor: marca el código usado UNA vez y entrega el correo).
-- El QR también queda cerrado mientras la cuenta esté protegida.
create or replace function public.cfx_qr_aprobar(p text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare q public.cfx_login_qr := public.cfx_qr_buscar(p);
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Primero inicia sesión en este celular'); end if;
  if public.cfx_login_bloqueado(auth.jwt() ->> 'email') then return jsonb_build_object('ok', false, 'error', '🔒 Tu cuenta está protegida por 3 claves malas. Entra en el computador con el enlace de tu correo.'); end if;
  if q.token is null then return jsonb_build_object('ok', false, 'error', 'El código venció o no existe. En el computador toca "Otro código".'); end if;
  update public.cfx_login_qr set user_id = auth.uid(), aprobado_at = now() where token = q.token and aprobado_at is null;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.cfx_qr_aprobar(text) from public, anon;
grant execute on function public.cfx_qr_aprobar(text) to authenticated;

create or replace function public.cfx_qr_canjear(p_token text, p_secreto text) returns text
language plpgsql security definer set search_path = '' as $$
declare u uuid; m text;
begin
  update public.cfx_login_qr set usado_at = now()
  where token = p_token and secreto = encode(extensions.digest(coalesce(p_secreto, ''), 'sha256'), 'hex')
    and aprobado_at is not null and aprobado_at > now() - interval '2 minutes' and usado_at is null
  returning user_id into u;
  if u is null then return null; end if;
  m := (select email from auth.users where id = u);
  if public.cfx_login_bloqueado(m) then return null; end if;
  return m;
end $$;
revoke all on function public.cfx_qr_canjear(text, text) from public, anon, authenticated;
grant execute on function public.cfx_qr_canjear(text, text) to service_role;
