-- ---------------------------------------------------------------------
-- CodeFix · Referidos (igual en las 7 apps; lo reparte nucleo/sincronizar.py). Se administra desde CM → Control → Referidos.
--   Cada usuario (negocio o cliente, nunca el admin) tiene su código. Quien se registra con él queda asociado a esa cuenta.
--   El admin ve quién invitó a quién, da días de Premium o manda un sticker de ánimo. Premio automático (opcional):
--   cuando el invitado paga su primer Premium, quien lo invitó recibe N días (cfx_config 'referidos' → dias_auto; 0 = apagado).
--   Usa lo que cada app define para los pagos: cfx_yo(), cfx_dar_premium(uuid, text, int) y cfx_avisar(uuid, text, text).
-- ---------------------------------------------------------------------
create table if not exists public.cfx_ref_codigos (cuenta uuid primary key, codigo text not null unique check (codigo ~ '^[A-Z0-9]{4,12}$'), creado timestamptz not null default now());
create table if not exists public.cfx_referidos (
  invitado uuid primary key, invito uuid not null, codigo text not null, email text not null default '', nombre text not null default '',
  creado timestamptz not null default now(), premiado boolean not null default false, dias_dados int not null default 0, stickers int not null default 0);
create index if not exists cfx_referidos_invito_idx on public.cfx_referidos (invito);
alter table public.cfx_ref_codigos enable row level security;
alter table public.cfx_referidos enable row level security;
revoke all on public.cfx_ref_codigos, public.cfx_referidos from anon, authenticated;
insert into public.cfx_config (clave, valor) values ('referidos', '{"dias_auto": 0}') on conflict (clave) do nothing;

-- Mi código para invitar (y cuántos se registraron con él). El admin no tiene.
create or replace function public.cfx_ref_mio() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); c text; i int := 0;
begin
  if y is null or y ->> 'rol' = 'admin' then return null; end if;
  select codigo into c from public.cfx_ref_codigos where cuenta = (y ->> 'id')::uuid;
  while c is null and i < 20 loop
    c := upper(left(regexp_replace(translate(coalesce(nullif(y ->> 'nombre', ''), split_part(y ->> 'email', '@', 1)), 'áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN'), '[^A-Za-z]', '', 'g'), 6));
    c := (case when length(c) < 2 then 'CF' else c end) || lpad((floor(random() * 10000))::int::text, 4, '0'); i := i + 1;
    begin insert into public.cfx_ref_codigos (cuenta, codigo) values ((y ->> 'id')::uuid, c); exception when unique_violation then c := null; end;
  end loop;
  return jsonb_build_object('codigo', c, 'invitados', (select count(*) from public.cfx_referidos where invito = (y ->> 'id')::uuid),
    'pagaron', (select count(*) from public.cfx_referidos r where r.invito = (y ->> 'id')::uuid and r.premiado));
end $$;
-- La cuenta nueva que llegó con un código queda asociada (una sola vez, solo en sus primeros 3 días, nunca consigo misma).
create or replace function public.cfx_ref_registrar(p_codigo text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare y jsonb := public.cfx_yo(); o uuid; quien text;
begin
  if y is null or y ->> 'rol' = 'admin' then return false; end if;
  if (select created_at from auth.users where id = (y ->> 'id')::uuid) < now() - interval '3 days' then return false; end if;
  select cuenta into o from public.cfx_ref_codigos where codigo = upper(trim(p_codigo));
  if o is null or o = (y ->> 'id')::uuid then return false; end if;
  insert into public.cfx_referidos (invitado, invito, codigo, email, nombre) values ((y ->> 'id')::uuid, o, upper(trim(p_codigo)), coalesce(y ->> 'email', ''), coalesce(y ->> 'nombre', ''))
    on conflict (invitado) do nothing;
  if not found then return false; end if;
  quien := coalesce(nullif(y ->> 'nombre', ''), split_part(y ->> 'email', '@', 1));
  perform public.cfx_avisar(o, '🎉 ' || quien || ' se registró con tu código', 'Gracias por recomendarnos. ¡Sigue invitando!');
  return true;
end $$;
-- Panel: quién invitó a quién (con correo de ambos), si el invitado ya pagó y lo que se le ha dado a quien invitó.
create or replace function public.cfx_ref_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return jsonb_build_object('config', (select valor from public.cfx_config where clave = 'referidos'), 'filas', coalesce((select jsonb_agg(x order by x.creado desc) from (
    select r.invitado, r.email, r.nombre, r.creado, r.codigo, r.invito, u.email invito_email, r.premiado, r.dias_dados, r.stickers,
      exists (select 1 from public.cfx_pagos g where g.cuenta = r.invitado and g.estado = 'aprobado') pago
    from public.cfx_referidos r left join auth.users u on u.id = r.invito limit 1000) x), '[]'));
end $$;
-- Dar días de Premium y/o mandar un sticker (mensaje de ánimo) a quien invita.
create or replace function public.cfx_ref_premiar(p_cuenta uuid, p_dias int default 0, p_mensaje text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare hasta timestamptz; d int := greatest(0, least(coalesce(p_dias, 0), 365)); n int;
begin
  perform <CHK>;
  select count(*) into n from public.cfx_referidos where invito = p_cuenta;
  if n = 0 then raise exception 'Esa cuenta no ha invitado a nadie'; end if;
  if d > 0 then
    hasta := public.cfx_dar_premium(p_cuenta, 'otro', d);
    update public.cfx_referidos set dias_dados = dias_dados + d where invitado = (select invitado from public.cfx_referidos where invito = p_cuenta order by creado desc limit 1);
  end if;
  if coalesce(trim(p_mensaje), '') <> '' or d > 0 then
    perform public.cfx_avisar(p_cuenta, left(coalesce(nullif(trim(p_mensaje), ''), '🏆 ¡Gracias por invitar!'), 90),
      case when d > 0 then '🎁 Te regalamos ' || d || ' días de Premium por recomendarnos (' || n || ' invitado' || case when n > 1 then 's' else '' end || ').' else 'Vas en ' || n || ' invitado' || case when n > 1 then 's' else '' end || '. ¡Sigue así!' end);
    update public.cfx_referidos set stickers = stickers + 1 where invitado = (select invitado from public.cfx_referidos where invito = p_cuenta order by creado desc limit 1);
  end if;
  perform public.cfx_anotar('referido', 'premio a ' || coalesce((select email from auth.users where id = p_cuenta), p_cuenta::text) || ': ' || d || ' días');
  return jsonb_build_object('dias', d, 'hasta', hasta);
end $$;
create or replace function public.cfx_ref_config_guardar(p_dias_auto int) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  insert into public.cfx_config (clave, valor) values ('referidos', jsonb_build_object('dias_auto', greatest(0, least(coalesce(p_dias_auto, 0), 365))))
    on conflict (clave) do update set valor = excluded.valor;
  return (select valor from public.cfx_config where clave = 'referidos');
end $$;
-- Premio automático: al aprobarse el primer pago del invitado, quien lo invitó recibe dias_auto días (una sola vez por invitado).
create or replace function public.cfx_ref_al_pagar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.cfx_referidos; d int := coalesce(((select valor from public.cfx_config where clave = 'referidos') ->> 'dias_auto')::int, 0);
begin
  if new.estado <> 'aprobado' or old.estado = 'aprobado' then return new; end if;
  select * into r from public.cfx_referidos where invitado = new.cuenta and not premiado for update;
  if r.invitado is null then return new; end if;
  update public.cfx_referidos set premiado = true, dias_dados = dias_dados + case when d > 0 then d else 0 end where invitado = r.invitado;
  if d > 0 then
    perform public.cfx_dar_premium(r.invito, 'otro', d);
    perform public.cfx_avisar(r.invito, '🎁 ¡Ganaste ' || d || ' días de Premium!', coalesce(nullif(r.nombre, ''), split_part(r.email, '@', 1)) || ' pagó su Premium gracias a tu invitación.');
  end if;
  return new;
end $$;
drop trigger if exists cfx_ref_al_pagar on public.cfx_pagos;
create trigger cfx_ref_al_pagar after update of estado on public.cfx_pagos for each row execute function public.cfx_ref_al_pagar();
revoke all on function public.cfx_ref_al_pagar() from public, anon, authenticated;
revoke all on function public.cfx_ref_mio(), public.cfx_ref_registrar(text), public.cfx_ref_lista(), public.cfx_ref_premiar(uuid, int, text), public.cfx_ref_config_guardar(int) from public, anon;
grant execute on function public.cfx_ref_mio(), public.cfx_ref_registrar(text), public.cfx_ref_lista(), public.cfx_ref_premiar(uuid, int, text), public.cfx_ref_config_guardar(int) to authenticated;

