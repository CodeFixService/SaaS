-- ---------- Calificaciones en dos direcciones (C15): el cliente califica al negocio y el negocio al cliente (módulo 'calificaciones') ----------
-- Una calificación por "ref" (pedido, reserva, arriendo…) y por lado. Estrellas 1-5 y comentario opcional (300).
-- Gancho que pone cada app que las usa (y 'calificaciones' en cfx_modulos_app()):
--   cfx_calif_ref(ref, u) jsonb   quién califica esa ref: {"ref": text, "negocio": uuid, "cliente": uuid|null, "cliente_ref": text|null, "de_negocio": bool}
--                                 ("ref" = la referencia de verdad, p. ej. el id del pedido cuando llega su token)
--                                 o {"error": "..."} (no existe, aún no se puede, no es tuyo). u puede ser null (invitado con token).
-- Para mostrar: cfx_calif_negocio(n) y cfx_calif_cliente(c, ref) → {"promedio", "total"}; cfx_calif_hecha(ref, de_negocio).
-- Si el módulo está apagado no se califica, los promedios vuelven null y cfx_calif_hecha dice true (no aparece "Califica").
create table if not exists public.cfx_calificaciones (
  ref          text not null,
  de_negocio   boolean not null,
  negocio_id   uuid not null,
  cliente_id   uuid references auth.users (id) on delete set null,
  cliente_ref  text,
  estrellas    int not null check (estrellas between 1 and 5),
  comentario   text not null default '' check (char_length(comentario) <= 300),
  creado       timestamptz not null default now(),
  primary key (ref, de_negocio)
);
create index if not exists cfx_calif_negocio_idx on public.cfx_calificaciones (negocio_id) where not de_negocio;
create index if not exists cfx_calif_cliente_idx on public.cfx_calificaciones (cliente_id) where de_negocio;
create index if not exists cfx_calif_cref_idx on public.cfx_calificaciones (cliente_ref) where de_negocio and cliente_ref is not null;
alter table public.cfx_calificaciones enable row level security;
revoke all on public.cfx_calificaciones from anon, authenticated;

-- Calificar: {"ok": true} o {"ok": false, "error"}.
create or replace function public.cfx_calificar(p_ref text, p_estrellas int, p_comentario text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  if not public.cfx_modulo('calificaciones') then return jsonb_build_object('ok', false, 'error', 'Las calificaciones no están disponibles'); end if;
  if p_estrellas is null or p_estrellas < 1 or p_estrellas > 5 then return jsonb_build_object('ok', false, 'error', 'Elige de 1 a 5 estrellas'); end if;
  if coalesce(trim(p_ref), '') = '' then return jsonb_build_object('ok', false, 'error', 'No encontrado'); end if;
  r := public.cfx_calif_ref(p_ref, auth.uid());
  if r is null or r ? 'error' or r ->> 'negocio' is null then return jsonb_build_object('ok', false, 'error', coalesce(r ->> 'error', 'No encontrado')); end if;
  insert into public.cfx_calificaciones (ref, de_negocio, negocio_id, cliente_id, cliente_ref, estrellas, comentario)
  values (coalesce(r ->> 'ref', p_ref), coalesce((r ->> 'de_negocio')::boolean, false), (r ->> 'negocio')::uuid, (r ->> 'cliente')::uuid,
          nullif(left(r ->> 'cliente_ref', 60), ''), p_estrellas, left(trim(coalesce(p_comentario, '')), 300))
  on conflict (ref, de_negocio) do nothing;
  if not found then return jsonb_build_object('ok', false, 'error', 'Ya fue calificado'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ¿Ya calificó ese lado? (con el módulo apagado: true, para no pedirlo)
create or replace function public.cfx_calif_hecha(p_ref text, p_de_negocio boolean) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.cfx_modulo('calificaciones') then return true; end if;
  return exists (select 1 from public.cfx_calificaciones where ref = p_ref and de_negocio = p_de_negocio);
end $$;

-- Lo que los clientes dicen del negocio.
create or replace function public.cfx_calif_negocio(p_negocio uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.cfx_modulo('calificaciones') then return null; end if;
  return (select jsonb_build_object('promedio', round(avg(estrellas), 1), 'total', count(*))
          from public.cfx_calificaciones where negocio_id = p_negocio and not de_negocio);
end $$;

-- Lo que los negocios dicen del cliente (por su cuenta o, si es invitado, por su referencia: teléfono…).
create or replace function public.cfx_calif_cliente(p_cliente uuid, p_cliente_ref text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.cfx_modulo('calificaciones') or (p_cliente is null and coalesce(p_cliente_ref, '') = '') then return null; end if;
  return (select jsonb_build_object('promedio', round(avg(estrellas), 1), 'total', count(*))
          from public.cfx_calificaciones where de_negocio
            and ((p_cliente is not null and cliente_id = p_cliente) or (p_cliente is null and cliente_ref = p_cliente_ref)));
end $$;

-- Al borrar un negocio o una ref (lo llama la app).
create or replace function public.cfx_calif_borrar(p_negocio uuid, p_ref text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.cfx_calificaciones where negocio_id = p_negocio and (p_ref is null or ref = p_ref);
end $$;

revoke all on function public.cfx_calif_hecha(text, boolean), public.cfx_calif_negocio(uuid), public.cfx_calif_cliente(uuid, text),
  public.cfx_calif_borrar(uuid, text) from public, anon, authenticated;
revoke all on function public.cfx_calificar(text, int, text) from public;
grant execute on function public.cfx_calificar(text, int, text) to anon, authenticated;
