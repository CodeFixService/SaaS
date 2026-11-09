-- Datos de prueba del análisis nocturno (E24/E27) para Órbita: un negocio, 3 clientes y 4 productos.
-- python3 analisis/analisis.py "<base>" y después se revisa cfx_analisis_mio() como el dueño.
set session_replication_role = replica; -- sin el trigger de registro (la base de prueba tiene el registro cerrado)
insert into auth.users (id, email, created_at, last_sign_in_at) values
  ('00000000-0000-0000-0000-0000000000e1', 'an_tienda@x.cl', now() - interval '120 days', now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000000e2', 'an_ana@x.cl', now() - interval '100 days', now() - interval '40 days'),
  ('00000000-0000-0000-0000-0000000000e3', 'an_beto@x.cl', now() - interval '20 days', now())
on conflict do nothing;
insert into public.profiles (id, email, empresa, role, telefono, created_at) values
  ('00000000-0000-0000-0000-0000000000e1', 'an_tienda@x.cl', 'Tienda Análisis', 'user', null, now() - interval '120 days'),
  ('00000000-0000-0000-0000-0000000000e2', 'an_ana@x.cl', 'Ana Pérez', 'client', '912345678', now() - interval '100 days'),
  ('00000000-0000-0000-0000-0000000000e3', 'an_beto@x.cl', 'Beto', 'client', null, now() - interval '20 days')
on conflict (id) do update set empresa = excluded.empresa, role = excluded.role, telefono = excluded.telefono, created_at = excluded.created_at;
insert into public.catalog_items (owner_id, client_key, nombre, precio, stock, created_at) values
  ('00000000-0000-0000-0000-0000000000e1', 'an1', 'Pan amasado', 1500, 10, now() - interval '90 days'),
  ('00000000-0000-0000-0000-0000000000e1', 'an2', 'Queque viejo', 5000, 5, now() - interval '60 days'),
  ('00000000-0000-0000-0000-0000000000e1', 'an3', 'Mermelada', 3000, null, now() - interval '40 days'),
  ('00000000-0000-0000-0000-0000000000e1', 'an4', 'Recién llegado', 2000, 3, now() - interval '10 days');
-- Ana compraba cada 10 días y no compra hace 40 (en riesgo). Beto compra seguido (no). Invitada por teléfono: cada 30, hace 61 (en riesgo).
insert into public.pedidos (negocio_id, cliente_id, invitado_nombre, invitado_tel, lineas, subtotal, total, entrega, estado, created_at)
select '00000000-0000-0000-0000-0000000000e1', c::uuid, n, t, jsonb_build_array(jsonb_build_object('clave', 'an1', 'cant', 1, 'nombre', 'Pan amasado', 'precio', m)), m, m, 'retiro', 'entregado', now() - (d || ' days')::interval
from (values ('00000000-0000-0000-0000-0000000000e2', null, null, 70, 10000), ('00000000-0000-0000-0000-0000000000e2', null, null, 60, 10000),
             ('00000000-0000-0000-0000-0000000000e2', null, null, 50, 10000), ('00000000-0000-0000-0000-0000000000e2', null, null, 40, 10000),
             ('00000000-0000-0000-0000-0000000000e3', null, null, 12, 3000), ('00000000-0000-0000-0000-0000000000e3', null, null, 2, 3000),
             (null, 'Carla', '+56 9 8765 4321', 91, 4000), (null, 'Carla', '+56 9 8765 4321', 61, 4000)) v(c, n, t, d, m);
reset session_replication_role;
