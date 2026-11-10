-- ---------- Módulos enchufables (C19): se prenden y apagan desde el Centro de Mando → Mis aplicaciones → 🧩 Módulos ----------
-- Cada app dice qué módulos tiene con el gancho cfx_modulos_app() → text[] (si no lo tiene: ninguno). Por defecto quedan prendidos.
insert into public.cfx_config (clave, valor) values ('modulos', '{}') on conflict (clave) do nothing;

create or replace function public.cfx_modulos_de_app() returns text[]
language plpgsql stable security definer set search_path = '' as $$
declare r text[];
begin
  if to_regprocedure('public.cfx_modulos_app()') is null then return '{}'; end if;
  execute 'select public.cfx_modulos_app()' into r;
  return coalesce(r, '{}');
end $$;

create or replace function public.cfx_modulo(p_clave text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  return p_clave = any(public.cfx_modulos_de_app())
    and coalesce(((select valor from public.cfx_config where clave = 'modulos') ->> p_clave)::boolean, true);
end $$;

-- Para la app (esconde lo apagado): {"chat": true, ...}. Un negocio (o su equipo) ve lo que tiene activo (G19: módulos de pago).
create or replace function public.cfx_modulos() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n uuid := public.cfx_negocio_cuenta(auth.uid());
begin
  if n is not null and coalesce((public.cfx_venta() ->> 'activo')::boolean, false) then return public.cfx_modulos_de(n); end if;
  return coalesce((select jsonb_object_agg(k, public.cfx_modulo(k)) from unnest(public.cfx_modulos_de_app()) k), '{}');
end $$;

-- Para el Centro de Mando: con nombre y para qué sirve.
create or replace function public.cfx_modulos_admin() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return coalesce((select jsonb_agg(jsonb_build_object('clave', k, 'nombre', coalesce(c.nombre, k), 'detalle', coalesce(c.detalle, ''),
      'activo', public.cfx_modulo(k), 'precio', public.cfx_venta_precio(k),
      'negocios', (select count(*) from public.cfx_modulos_negocio m where m.modulo = k and m.hasta > now())) order by o)
    from unnest(public.cfx_modulos_de_app()) with ordinality u(k, o)
    left join public.cfx_modulos_catalogo() c on c.clave = k), '[]');
end $$;

create or replace function public.cfx_modulo_guardar(p_clave text, p_activo boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform <CHK>;
  if not coalesce(p_clave = any(public.cfx_modulos_de_app()), false) then raise exception 'Esta app no tiene ese módulo'; end if;
  insert into public.cfx_config (clave, valor) values ('modulos', jsonb_build_object(p_clave, coalesce(p_activo, true)))
  on conflict (clave) do update set valor = public.cfx_config.valor || excluded.valor;
  perform public.cfx_anotar('módulo', p_clave || case when coalesce(p_activo, true) then ' prendido' else ' apagado' end);
  return public.cfx_modulos_admin();
end $$;

revoke all on function public.cfx_modulos_de_app(), public.cfx_modulo(text) from public, anon, authenticated;
revoke all on function public.cfx_modulos(), public.cfx_modulos_admin(), public.cfx_modulo_guardar(text, boolean) from public, anon;
grant execute on function public.cfx_modulos() to anon, authenticated;
grant execute on function public.cfx_modulos_admin(), public.cfx_modulo_guardar(text, boolean) to authenticated;
