# Entrega · CodeFix (28/10/2026)

## Qué hace cada app (para explicárselo a tus clientes)

Todas: se instalan en el celular como una app (sin tienda), avisan con notificaciones, funcionan con plan **Gratis** y **Premium**,
se pagan con link o transferencia y permiten descargar un **respaldo en Excel**. Los datos de cada persona solo los ve ella.

**1. Centro de Mando** — Tu cabeza ordenada en el celular. Anotas al tiro (también con la voz) tareas, pedidos, ideas y recordatorios;
la app te avisa a tiempo, te arma el día, te recuerda lo que falta y te dice cuándo descansar. Con Pro: sin límites, análisis y revisión semanal.

**2. Billetera · Libreta de Cobros** — Ventas, gastos y fiado en 3 segundos. Cada cliente tiene un link con PIN donde ve lo que debe,
confirma sus compras y sube su comprobante. Cobras por WhatsApp con mensajes listos (respetando horarios y la ley), ventas en cuotas,
caja y reportes. Funciona sin internet.

**3. CodeFix Apps · FichaPro y Caja** — Tu tienda y tu publicidad en un solo lugar. Haces fichas atractivas para WhatsApp e Instagram,
tienes tienda online con carrito, tus clientes piden y pagan (con comprobante), y llevas tu caja con stock y reportes. Incluye mensajes,
cupones, tarjeta de sellos y clientes Premium con descuentos.

**4. Barbería** — Reservas por barbero con abono y comprobante, agenda de cada uno, caja con comisiones, ofertas, chat con clientes,
recordatorios y lista negra para los que no llegan. El cliente reserva en segundos y recibe sus avisos.

**5. BiciTaller** — Reservas online del taller con abono, órdenes de trabajo con estados (recibida, en reparación, lista) y fotos
antes/después. El ciclista sigue su bici desde el celular, ve su historial y le llega el aviso cuando le toca mantención.

**6. Estaciona** — Mapa de estacionamientos en Santiago para arrendar o publicar, con personas verificadas (RUT y cédula), reserva con
comprobante, chat seguro, calificaciones y ubicación exacta solo al aceptar el arriendo.

## Las 6 consultas (pegar UNA vez en el SQL Editor de cada Supabase, en este orden)
Después cada base se actualiza sola cada 10 minutos.

1. **Centro de Mando** (Supabase `vqevujjraisrcoirswuq`)
```sql
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/SaaS/main/supabase/instalar.sql?t=' || extract(epoch from now())::bigint));
end $$;
select 'Centro de Mando instalado v' || public.db_version() as resultado;
```
2. **Billetera** (Supabase `zbgfvxsqajtixjzxoxeu`)
```sql
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/Emprendedor/main/supabase/instalar.sql?t=' || extract(epoch from now())::bigint));
end $$;
select 'Libreta instalada v' || valor as resultado from privado.config where clave = 'version_bd';
```
3. **CodeFix Apps** (Supabase `gilsamacgappycibcqhq`)
```sql
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/Aplicaciones/main/supabase/instalar.sql?t=' || extract(epoch from now())::bigint));
end $$;
select 'CodeFix Apps instalada v' || public.db_version() as resultado;
```
4. **Barbería** (Supabase `gxlabxuttnxvzkucckef`)
```sql
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/Barberia/main/supabase/instalar.sql?t=' || extract(epoch from now())::bigint));
end $$;
select 'Barbería instalada v' || public.db_version() as resultado;
```
5. **BiciTaller** (Supabase `iwvjthcmufirbnotgixi`)
```sql
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/Taller/main/supabase/instalar.sql?t=' || extract(epoch from now())::bigint));
end $$;
```
6. **Estaciona** (Supabase `wphxtspicejywwzlbuux`)
```sql
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/Estacionamiento/main/supabase/instalar.sql?t=' || extract(epoch from now())::bigint));
end $$;
select 'Estaciona instalada v' || (select valor #>> '{}' from public.config where clave = 'version_bd') as resultado;
```

## Después de pegarlas (todo desde el Centro de Mando)
1. **Apps** → toca **Conectar** en cada app con tu mismo correo y clave de administrador de esa app (no necesitas usuarios de prueba).
2. **Pagos** → pon el link de pago (sin monto), la comisión del link, los datos de transferencia y tu WhatsApp → **Guardar en las 6 apps**.
   Desde ese momento los negocios **nuevos** deben hacer su primer pago ($4.900 = 30 días Premium) para usar la app.
3. Para entrar como negocio de prueba: crea la cuenta en la app y en **Pagos → Cuentas sin primer pago** exímela con su correo.
4. **Control** → avisos a todos, planes (interruptores), textos, keys, cupones, verificaciones y registro.
5. **Apps** → **Liberar** cada versión cuando la pruebes (o "Liberar todo").
6. (Opcional) **Control → 🤖 Humano**: site key de Cloudflare Turnstile y luego en cada Supabase → Authentication → CAPTCHA.
