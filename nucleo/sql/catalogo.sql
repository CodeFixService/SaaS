-- ---------------------------------------------------------------------
-- CodeFix · G142 b 📚 Catálogo de texto: lo que cada negocio escribe y no estaba en la lista de fábrica (nucleo/catalogo.js)
--   queda en SU lista (marcas, modelos, colores…) y le aparece al autocompletar. Igual en las 7 (lo reparte nucleo/sincronizar.py).
--   cfx_catalogo_mio(lista)          → ['Bici Pepe 3000', …] (las más usadas primero; máx. 300).
--   cfx_catalogo_sumar(lista, valor) → suma o cuenta 1 uso más (máx. 500 por lista y negocio; nunca molesta: sin negocio no hace nada).
-- ---------------------------------------------------------------------
create table if not exists public.cfx_catalogo_propio (
  negocio uuid not null,
  lista   text not null check (lista ~ '^[a-z_]{2,20}$'),
  valor   text not null check (length(valor) between 2 and 60),
  usos    int not null default 1,
  creado  timestamptz not null default now()
);
create unique index if not exists cfx_catalogo_propio_uq on public.cfx_catalogo_propio (negocio, lista, lower(valor));
alter table public.cfx_catalogo_propio enable row level security;
revoke all on public.cfx_catalogo_propio from anon, authenticated;

create or replace function public.cfx_catalogo_mio(p_lista text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select jsonb_agg(valor order by usos desc, creado desc) from (
    select valor, usos, creado from public.cfx_catalogo_propio
    where negocio = public.cfx_negocio_cuenta(auth.uid()) and lista = p_lista order by usos desc, creado desc limit 300) x), '[]'::jsonb)
$$;

create or replace function public.cfx_catalogo_sumar(p_lista text, p_valor text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare n uuid := public.cfx_negocio_cuenta(auth.uid()); v text := regexp_replace(trim(coalesce(p_valor, '')), '[[:cntrl:]]|\s+', ' ', 'g');
begin
  if n is null or coalesce(p_lista, '') !~ '^[a-z_]{2,20}$' or length(v) not between 2 and 60 then return; end if;
  update public.cfx_catalogo_propio set usos = usos + 1 where negocio = n and lista = p_lista and lower(valor) = lower(v);
  if found or (select count(*) from public.cfx_catalogo_propio where negocio = n and lista = p_lista) >= 500 then return; end if;
  insert into public.cfx_catalogo_propio (negocio, lista, valor) values (n, p_lista, v) on conflict do nothing;
end $$;

revoke all on function public.cfx_catalogo_mio(text), public.cfx_catalogo_sumar(text, text) from public, anon;
grant execute on function public.cfx_catalogo_mio(text), public.cfx_catalogo_sumar(text, text) to authenticated;
