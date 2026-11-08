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

-- Para la app (esconde lo apagado): {"chat": true, ...}
create or replace function public.cfx_modulos() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  return coalesce((select jsonb_object_agg(k, public.cfx_modulo(k)) from unnest(public.cfx_modulos_de_app()) k), '{}');
end $$;

-- Para el Centro de Mando: con nombre y para qué sirve.
create or replace function public.cfx_modulos_admin() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform <CHK>;
  return coalesce((select jsonb_agg(jsonb_build_object('clave', k, 'nombre', coalesce(c.nombre, k), 'detalle', coalesce(c.detalle, ''),
      'activo', public.cfx_modulo(k)) order by o)
    from unnest(public.cfx_modulos_de_app()) with ordinality u(k, o)
    left join (values ('chat', '💬 Chat', 'Mensajes entre personas: 3 seguidos sin respuesta, 100 al día, bloquear y reportar.'),
                      ('calificaciones', '⭐ Calificaciones', 'El cliente califica al negocio y el negocio al cliente.'),
                      ('cupones', '🏷️ Cupones', 'Códigos de descuento del negocio para sus clientes.'),
                      ('sellos', '🎟️ Tarjeta de sellos', 'Cada compra suma un sello; al completar la meta, premio.'),
                      ('carrito', '🛒 Recordar carrito', 'Si el cliente deja productos en el carrito, al día siguiente le llega un aviso (una vez).')) c(clave, nombre, detalle) on c.clave = k), '[]');
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
