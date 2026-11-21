-- ---------------------------------------------------------------------
-- CodeFix · G140 🎨 Personalizar (igual en las 7 apps; lo reparte nucleo/sincronizar.py).
--   Lo que cada persona elige en Mi perfil → 🎨 Personalizar (colores a su gusto, letra y barra de abajo) queda en su cuenta:
--   en otro celular se ve igual. El color y el modo de la app los guarda cada app como antes.
--   cfx_personal()                → lo guardado de la cuenta ({} si nada).
--   cfx_personal_guardar(datos)   → guarda solo lo permitido (col, letra, barra, v) y con tamaño acotado.
-- ---------------------------------------------------------------------
create table if not exists public.cfx_personal (
  cuenta   uuid primary key references auth.users (id) on delete cascade,
  datos    jsonb not null default '{}'::jsonb,
  cambiado timestamptz not null default now()
);
alter table public.cfx_personal enable row level security;
revoke all on public.cfx_personal from anon, authenticated;

create or replace function public.cfx_personal() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select datos from public.cfx_personal where cuenta = auth.uid()), '{}'::jsonb)
$$;

create or replace function public.cfx_personal_guardar(p_datos jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare u uuid := auth.uid(); d jsonb;
begin
  if u is null then raise exception 'Inicia sesión para guardar.'; end if;
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then raise exception 'Datos no válidos.'; end if;
  if octet_length(p_datos::text) > 6000 then raise exception 'Demasiados datos.'; end if;
  d := jsonb_strip_nulls(jsonb_build_object(
    'v', case when jsonb_typeof(p_datos -> 'v') = 'number' then p_datos -> 'v' end,
    'col', case when jsonb_typeof(p_datos -> 'col') = 'object' then p_datos -> 'col' end,
    'letra', case when jsonb_typeof(p_datos -> 'letra') = 'object' then p_datos -> 'letra' end,
    'barra', case when jsonb_typeof(p_datos -> 'barra') = 'object' then p_datos -> 'barra' end));
  insert into public.cfx_personal (cuenta, datos, cambiado) values (u, d, now())
  on conflict (cuenta) do update set datos = excluded.datos, cambiado = now();
end $$;

revoke all on function public.cfx_personal(), public.cfx_personal_guardar(jsonb) from public, anon;
grant execute on function public.cfx_personal(), public.cfx_personal_guardar(jsonb) to authenticated;
