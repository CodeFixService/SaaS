-- ---------------------------------------------------------------------
-- CodeFix · Socios comunes (lo reparte nucleo/sincronizar.py). Los usan Billetera, Órbita y Estaciona (las otras apps tienen
-- sus propios socios). El socio entra con su correo y administra igual que el admin (cada app lo reconoce en su función de
-- administrador), pero solo el administrador dueño agrega o quita socios (CM → Control → 🤝 Socios). Lo que hace queda en el registro.
-- ---------------------------------------------------------------------
create table if not exists public.cfx_socios (email text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nombre text not null default '' check (length(nombre) <= 60), creado timestamptz not null default now());
alter table public.cfx_socios enable row level security;
revoke all on public.cfx_socios from anon, authenticated;
create or replace function public.cfx_es_socio() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from public.cfx_socios s join auth.users u on lower(u.email) = s.email where u.id = auth.uid())
$$;
create or replace function public.cfx_socios_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return coalesce((select jsonb_agg(jsonb_build_object('email', s.email, 'nombre', s.nombre, 'creado', s.creado, 'tiene_cuenta', exists (select 1 from auth.users u where lower(u.email) = s.email)) order by s.creado) from public.cfx_socios s), '[]');
end $$;
create or replace function public.cfx_socio_guardar(p_email text, p_nombre text default '', p_si boolean default true) returns void
language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(p_email));
begin
  perform <CHK>;
  if public.cfx_es_socio() then raise exception 'Solo el administrador agrega o quita socios'; end if;
  if coalesce(p_si, true) then
    insert into public.cfx_socios (email, nombre) values (e, left(coalesce(trim(p_nombre), ''), 60)) on conflict (email) do update set nombre = excluded.nombre;
    perform public.cfx_anotar('socio', 'agregó a ' || e);
  else
    delete from public.cfx_socios where email = e;
    perform public.cfx_anotar('socio', 'quitó a ' || e);
  end if;
end $$;
revoke all on function public.cfx_es_socio(), public.cfx_socios_lista(), public.cfx_socio_guardar(text, text, boolean) from public, anon;
grant execute on function public.cfx_es_socio(), public.cfx_socios_lista(), public.cfx_socio_guardar(text, text, boolean) to authenticated;

