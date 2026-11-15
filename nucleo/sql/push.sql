-- ---------- G61 a · 📲 Push insistente (núcleo): cada aviso se reenvía hasta que el celular confirma que llegó ----------
-- La función de la app (enviar/servidor) anota cada envío por dispositivo (cfx_push_anotar) con un "grupo" (= el aviso).
-- El service worker, al recibirlo, confirma (cfx_push_recibido) → se cortan los reenvíos de ese aviso en TODOS los dispositivos.
-- Sin confirmación se reenvía a los 1, 2, 5, 10, 15 y 30 min y luego cada 1 h, hasta 48 h (más es spam: Google/Apple lo bloquean).
-- Abrir la app también corta lo pendiente de ese celular (cfx_push_abri). Suscripción muerta (404/410) → cfx_push_muerto.
create table if not exists public.cfx_push_entrega (
  id          bigserial primary key,
  grupo       uuid not null,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  payload     text not null,
  intentos    int not null default 0,
  proximo     timestamptz not null default now() + interval '1 minute',
  recibido_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (grupo, endpoint)
);
create index if not exists cfx_push_entrega_prox on public.cfx_push_entrega (proximo) where recibido_at is null;
create index if not exists cfx_push_entrega_end on public.cfx_push_entrega (endpoint);
alter table public.cfx_push_entrega enable row level security;
revoke all on public.cfx_push_entrega from anon, authenticated;

-- p_lista: [{ grupo, endpoint, p256dh, auth, payload }] (solo la función de la app, con la clave de servidor)
create or replace function public.cfx_push_anotar(p_lista jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into public.cfx_push_entrega (grupo, endpoint, p256dh, auth, payload)
  select (x->>'grupo')::uuid, x->>'endpoint', x->>'p256dh', x->>'auth', x->>'payload'
  from jsonb_array_elements(coalesce(p_lista, '[]'::jsonb)) x
  where x->>'grupo' ~ '^[0-9a-f-]{36}$' and coalesce(x->>'endpoint', '') like 'https://%'
  on conflict (grupo, endpoint) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.cfx_push_anotar(jsonb) from public, anon, authenticated;
grant execute on function public.cfx_push_anotar(jsonb) to service_role;

-- Lo que toca reenviar ahora (y deja agendado el siguiente intento). Limpia lo viejo.
create or replace function public.cfx_push_tomar(p_max int default 200) returns setof public.cfx_push_entrega
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.cfx_push_entrega where created_at < now() - interval '50 hours' or recibido_at < now() - interval '1 day';
  return query
  update public.cfx_push_entrega e set intentos = e.intentos + 1,
    proximo = now() + case e.intentos when 0 then interval '1 minute' when 1 then interval '3 minutes' when 2 then interval '5 minutes'
      when 3 then interval '5 minutes' when 4 then interval '15 minutes' else interval '1 hour' end
  where e.id in (select x.id from public.cfx_push_entrega x where x.recibido_at is null and x.proximo <= now() and x.created_at > now() - interval '48 hours'
                 order by x.proximo limit greatest(1, least(coalesce(p_max, 200), 500)) for update skip locked)
  returning e.*;
end $$;
revoke all on function public.cfx_push_tomar(int) from public, anon, authenticated;
grant execute on function public.cfx_push_tomar(int) to service_role;

-- El service worker confirma que llegó (el grupo es un uuid al azar que solo viaja cifrado en el aviso).
create or replace function public.cfx_push_recibido(p_grupo uuid) returns boolean
language sql security definer set search_path = '' as $$
  with u as (update public.cfx_push_entrega set recibido_at = now() where grupo = p_grupo and recibido_at is null returning 1)
  select count(*) > 0 from u;
$$;
grant execute on function public.cfx_push_recibido(uuid) to anon, authenticated;

-- Abrir la app en un celular = ya vio sus avisos: se corta lo pendiente de ese celular (y de esos avisos en los otros).
create or replace function public.cfx_push_abri(p_endpoint text) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.cfx_push_entrega set recibido_at = now()
  where recibido_at is null and grupo in (select grupo from public.cfx_push_entrega where endpoint = p_endpoint and recibido_at is null);
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.cfx_push_abri(text) to anon, authenticated;

-- Suscripción dada de baja (404/410): no se reintenta más a ese celular.
create or replace function public.cfx_push_muerto(p_endpoint text) returns void
language sql security definer set search_path = '' as $$ delete from public.cfx_push_entrega where endpoint = p_endpoint; $$;
revoke all on function public.cfx_push_muerto(text) from public, anon, authenticated;
grant execute on function public.cfx_push_muerto(text) to service_role;

