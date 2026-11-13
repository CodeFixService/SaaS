-- ---------- G33 🌐 Dominio de CodeFix (núcleo 2.69, se puede volver a correr) ----------
-- El CM (Control → 🌐 Dominio) arma los dominios en Cloudflare y le guarda a cada app su dirección: ej. https://despega.codefix.cl/
-- "activo" = Cloudflare ya lo sirve. Mientras no esté activo (o vacío) todo sigue en workers.dev como hoy.
-- Público (no es secreto): las apps lo usan para armar links, QR y correos.
insert into public.cfx_config (clave, valor) values ('sitio', '{"dominio": "", "url": "", "activo": false}') on conflict (clave) do nothing;
create or replace function public.cfx_sitio() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select valor from public.cfx_config where clave = 'sitio'), '{"dominio": "", "url": "", "activo": false}'::jsonb) $$;
revoke all on function public.cfx_sitio() from public;
grant execute on function public.cfx_sitio() to anon, authenticated;
-- Dirección de la app para correos y links del servidor: null si no hay dominio activo (se usa la de siempre).
create or replace function public.cfx_sitio_url() returns text
language sql stable security definer set search_path = '' as $$
  select case when (valor->>'activo')::boolean and coalesce(valor->>'url', '') <> '' then valor->>'url' end
  from public.cfx_config where clave = 'sitio' $$;
revoke all on function public.cfx_sitio_url() from public;
grant execute on function public.cfx_sitio_url() to anon, authenticated;
create or replace function public.cfx_sitio_guardar(p_dominio text, p_url text, p_activo boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d text := nullif(lower(trim(regexp_replace(coalesce(p_dominio, ''), '^https?://|/.*$|\.$', '', 'gi'))), '');
        u text := nullif(lower(trim(coalesce(p_url, ''))), '');
begin
  perform <CHK>;
  if d is not null and (d !~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$' or length(d) > 80) then raise exception 'Escribe solo el dominio, ej: codefix.cl'; end if;
  if u is not null and (u !~ '^https://([a-z0-9-]+\.)+[a-z]{2,24}/$' or d is null or right(u, length(d) + 1) <> d || '/') then raise exception 'Dirección no válida'; end if;
  insert into public.cfx_config (clave, valor) values ('sitio', jsonb_build_object('dominio', coalesce(d, ''), 'url', coalesce(u, ''), 'activo', d is not null and u is not null and coalesce(p_activo, false)))
    on conflict (clave) do update set valor = excluded.valor;
  return public.cfx_sitio();
end $$;
revoke all on function public.cfx_sitio_guardar(text, text, boolean) from public, anon;
grant execute on function public.cfx_sitio_guardar(text, text, boolean) to authenticated;
