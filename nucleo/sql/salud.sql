
-- ---------- Salud (G8): errores de la app en los teléfonos, ping anti-pausa y último respaldo ----------
-- Errores: carga.js manda cada error de JavaScript (agrupado por mensaje + lugar). Se guardan hasta 300 distintos y 30 días.
create table if not exists public.cfx_errores (
  id bigint generated always as identity primary key, firma text not null unique, mensaje text not null, donde text not null default '',
  pagina text not null default '', navegador text not null default '', version text not null default '', veces int not null default 1,
  con_cuenta boolean not null default false, creado timestamptz not null default now(), ultimo timestamptz not null default now());
-- Salud: 'ping' (lo toca GitHub Actions para que Supabase no pause la base) y 'respaldo' (lo anota el respaldo diario).
create table if not exists public.cfx_salud (clave text primary key, valor jsonb not null default '{}', cuando timestamptz not null default now());
-- B13 Carga real: cuánto demora en abrir cada página en los teléfonos (carga.js, 1 vez por página y sesión). Por día y página; 30 días.
create table if not exists public.cfx_cargas (dia date not null default current_date, pagina text not null, veces int not null default 0, ms bigint not null default 0,
  lcp bigint not null default 0, con_lcp int not null default 0, lentas int not null default 0, cache int not null default 0, primary key (dia, pagina));
alter table public.cfx_cargas enable row level security;
revoke all on public.cfx_cargas from anon, authenticated;
alter table public.cfx_errores enable row level security;
alter table public.cfx_salud enable row level security;
revoke all on public.cfx_errores, public.cfx_salud from anon, authenticated;

-- Sin cuenta también (el error puede pasar antes de entrar). Sin captcha: no crea cuentas ni avisa a nadie,
-- se agrupa por firma, tiene tope de filas y de veces, y se borra solo a los 30 días.
create or replace function public.cfx_error_anotar(p_mensaje text, p_donde text default '', p_pagina text default '', p_navegador text default '', p_version text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare m text := left(coalesce(p_mensaje, ''), 300); d text := left(coalesce(p_donde, ''), 600); f text;
begin
  if m = '' then return; end if;
  f := md5(m || '|' || split_part(d, E'\n', 1));
  update public.cfx_errores set veces = least(veces + 1, 1000000), ultimo = now(), pagina = left(coalesce(p_pagina, ''), 200),
    navegador = left(coalesce(p_navegador, ''), 120), version = left(coalesce(p_version, ''), 20), con_cuenta = con_cuenta or auth.uid() is not null
    where firma = f and ultimo < now() - interval '2 seconds';
  if found or exists (select 1 from public.cfx_errores where firma = f) then return; end if;
  delete from public.cfx_errores where ultimo < now() - interval '30 days';
  if (select count(*) from public.cfx_errores) >= 300 then return; end if;
  insert into public.cfx_errores (firma, mensaje, donde, pagina, navegador, version, con_cuenta)
    values (f, m, d, left(coalesce(p_pagina, ''), 200), left(coalesce(p_navegador, ''), 120), left(coalesce(p_version, ''), 20), auth.uid() is not null)
    on conflict (firma) do nothing;
end $$;
grant execute on function public.cfx_error_anotar(text, text, text, text, text) to anon, authenticated;

-- B13: sin cuenta también (la vitrina la abren clientes sin cuenta). Valores acotados, máximo 40 páginas por día y 1 fila por día y página.
create or replace function public.cfx_carga_anotar(p_pagina text, p_ms int, p_lcp int default null, p_cache boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare pg text := left(regexp_replace(lower(coalesce(p_pagina, '')), '[^a-z0-9/_.-]', '', 'g'), 60); m int := least(greatest(coalesce(p_ms, 0), 0), 60000);
  l int := least(greatest(coalesce(p_lcp, 0), 0), 60000);
begin
  if pg = '' or m = 0 then return; end if;
  if not exists (select 1 from public.cfx_cargas where dia = current_date and pagina = pg) then
    if (select count(*) from public.cfx_cargas where dia = current_date) >= 40 then return; end if;
    delete from public.cfx_cargas where dia < current_date - 30;
  end if;
  insert into public.cfx_cargas as c (dia, pagina, veces, ms, lcp, con_lcp, lentas, cache)
    values (current_date, pg, 1, m, l, (l > 0)::int, (m > 3000)::int, coalesce(p_cache, false)::int)
    on conflict (dia, pagina) do update set veces = c.veces + 1, ms = c.ms + excluded.ms, lcp = c.lcp + excluded.lcp, con_lcp = c.con_lcp + excluded.con_lcp,
      lentas = c.lentas + excluded.lentas, cache = c.cache + excluded.cache
    where c.veces < 100000;
end $$;
revoke all on function public.cfx_carga_anotar(text, int, int, boolean) from public;
grant execute on function public.cfx_carga_anotar(text, int, int, boolean) to anon, authenticated;

-- Marca de salud (solo la base: GitHub Actions la llama con la conexión del respaldo; ping la usa por dentro).
create or replace function public.cfx_salud_marca(p_clave text, p_valor jsonb default '{}') returns void
language sql security definer set search_path = '' as $$
  insert into public.cfx_salud (clave, valor, cuando) values (left(p_clave, 40), coalesce(p_valor, '{}'), now())
  on conflict (clave) do update set valor = excluded.valor, cuando = now()
$$;
revoke all on function public.cfx_salud_marca(text, jsonb) from public, anon, authenticated;

-- Ping anti-pausa: el plan gratis de Supabase pausa la base tras 7 días sin uso. GitHub Actions (SaaS: salud.yml) lo llama cada día.
create or replace function public.cfx_ping() returns text
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce((select cuando from public.cfx_salud where clave = 'ping'), '-infinity') < now() - interval '10 minutes' then
    perform public.cfx_salud_marca('ping', '{}');
  end if;
  return 'ok';
end $$;
grant execute on function public.cfx_ping() to anon, authenticated;

-- Centro de Mando → Control → 🩺 Salud.
create or replace function public.cfx_salud() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return jsonb_build_object(
    'ping', (select cuando from public.cfx_salud where clave = 'ping'),
    'respaldo', (select valor || jsonb_build_object('cuando', cuando) from public.cfx_salud where clave = 'respaldo'),
    'analisis', (select valor || jsonb_build_object('cuando', cuando) from public.cfx_salud where clave = 'analisis'),
    'carga', coalesce((select jsonb_agg(c order by c.veces desc) from (select pagina, sum(veces)::int veces, (sum(ms) / nullif(sum(veces), 0))::int ms,
        (sum(lcp) / nullif(sum(con_lcp), 0))::int lcp, sum(lentas)::int lentas, sum(cache)::int cache
      from public.cfx_cargas where dia > current_date - 7 group by pagina order by sum(veces) desc limit 20) c), '[]'),
    'errores_24h', (select coalesce(sum(veces), 0) from public.cfx_errores where ultimo > now() - interval '24 hours'),
    'errores', coalesce((select jsonb_agg(to_jsonb(e) - 'firma' order by e.ultimo desc) from (select * from public.cfx_errores order by ultimo desc limit 100) e), '[]'));
end $$;
revoke all on function public.cfx_salud() from public, anon;
grant execute on function public.cfx_salud() to authenticated;

create or replace function public.cfx_errores_borrar(p_id bigint default null) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform <CHK>;
  delete from public.cfx_errores where p_id is null or id = p_id;
  get diagnostics n = row_count;
  perform public.cfx_anotar('errores borrados', case when p_id is null then 'todos (' || n || ')' else '#' || p_id end);
  return n;
end $$;
revoke all on function public.cfx_errores_borrar(bigint) from public, anon;
grant execute on function public.cfx_errores_borrar(bigint) to authenticated;
