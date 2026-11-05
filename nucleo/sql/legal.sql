-- ---------------------------------------------------------------------
-- CodeFix · Legal (igual en las 7 apps; lo reparte nucleo/sincronizar.py).
--   Términos y Política de privacidad con versión (Ley 19.628 modificada por la Ley 21.719, vigente desde el 1-dic-2026).
--   El texto vive en nucleo/ayuda.js (CFX_LEGAL.version). Aquí solo queda la prueba de quién aceptó qué versión y cuándo.
--   cfx_legal_estado()          → última versión aceptada por la cuenta (0 = ninguna).
--   cfx_legal_aceptar(version)  → guarda la aceptación (una fila por versión, nunca se pisa).
--   cfx_legal_resumen()         → admin: cuántas cuentas aceptaron cada versión.
-- ---------------------------------------------------------------------
create table if not exists public.cfx_legal (
  cuenta    uuid not null,
  version   int  not null check (version between 1 and 10000),
  aceptado  timestamptz not null default now(),
  agente    text not null default '',
  primary key (cuenta, version)
);
alter table public.cfx_legal enable row level security;
revoke all on public.cfx_legal from anon, authenticated;

create or replace function public.cfx_legal_estado() returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(max(version), 0) from public.cfx_legal where cuenta = auth.uid()
$$;

create or replace function public.cfx_legal_aceptar(p_version int) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'Inicia sesión para aceptar.'; end if;
  if p_version is null or p_version < 1 or p_version > 10000 then raise exception 'Versión no válida.'; end if;
  insert into public.cfx_legal (cuenta, version, agente)
  values (u, p_version, left(coalesce(current_setting('request.headers', true)::jsonb ->> 'user-agent', ''), 300))
  on conflict (cuenta, version) do nothing;
end $$;

create or replace function public.cfx_legal_resumen() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform <CHK>;
  return coalesce((select jsonb_agg(jsonb_build_object('version', version, 'cuentas', n, 'ultima', u) order by version desc)
    from (select version, count(*) n, max(aceptado) u from public.cfx_legal group by version) x), '[]'::jsonb);
end $$;

revoke all on function public.cfx_legal_estado(), public.cfx_legal_aceptar(int), public.cfx_legal_resumen() from public, anon;
grant execute on function public.cfx_legal_estado(), public.cfx_legal_aceptar(int), public.cfx_legal_resumen() to authenticated;
