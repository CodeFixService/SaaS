# Entrega · CodeFix (28/10/2026 · etapa final)

## Qué hace cada app (para explicárselo a tus clientes)

Todas: arriba a la derecha la campana, el plan (FREE o PRO) y tu foto; al tocar la foto: inicio, mi cuenta, guía para partir, chat con soporte, términos, Premium y cerrar sesión.
Los Ajustes se ven como tarjetas. Todas se instalan en el celular como una app (sin tienda), avisan con notificaciones, funcionan con plan **Gratis** y **Premium**,
se pagan con transferencia, link o tarjeta y permiten descargar un **respaldo en Excel**. Los datos de cada persona solo los ve ella.

**1. Centro de Mando** — Tu cabeza ordenada en el celular. Anotas al tiro (también con la voz) tareas, pedidos, ideas y recordatorios;
la app te avisa a tiempo, te arma el día, te recuerda lo que falta y te dice cuándo descansar. Con Pro: sin límites, análisis y revisión semanal.

**2. Billetera · Libreta de Cobros** — Ventas, gastos y fiado en 3 segundos. Cada cliente tiene un link con PIN donde ve lo que debe,
confirma sus compras y sube su comprobante. Cobras por WhatsApp con mensajes listos (respetando horarios y la ley), ventas en cuotas,
caja y reportes. Funciona sin internet.

**3. Órbita (antes FichaPro)** — Tu tienda y tu publicidad en un solo lugar. Haces fichas atractivas para WhatsApp e Instagram,
tienes tienda online con carrito y despacho por comuna, tus clientes piden y pagan el total (con comprobante), y llevas tu caja con stock y reportes. Incluye mensajes,
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
3. **Órbita** (Supabase `gilsamacgappycibcqhq`)
```sql
create extension if not exists http with schema extensions;
do $$ begin
  execute (select content from extensions.http_get('https://raw.githubusercontent.com/CodeFixService/Aplicaciones/main/supabase/instalar.sql?t=' || extract(epoch from now())::bigint));
end $$;
select 'Órbita instalada v' || public.db_version() as resultado;
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
2. **Pagos** → pon el link de pago (sin monto), el cargo por pago online, el link de tarjeta (opcional), los datos de transferencia y tu WhatsApp → **Guardar en las 6 apps**.
   Desde ese momento los negocios **nuevos** deben hacer su primer pago ($4.900 = 30 días Premium) para usar la app.
3. Para entrar como negocio de prueba: crea la cuenta en la app y en **Pagos → Cuentas sin primer pago** exímela con su correo.
4. **Control** → avisos a todos, planes (interruptores), textos, keys, cupones, verificaciones y registro.
5. **Apps** → **Liberar** cada versión cuando la pruebes (o "Liberar todo").
6. (Opcional) **Control → 🤖 Humano**: site key de Cloudflare Turnstile y luego en cada Supabase → Authentication → CAPTCHA.
7. **Mensajes** → todo lo que te escriben desde el 🛟 de las 6 apps llega aquí, con aviso al tiro (igual que los pagos por revisar).
8. **Pagos → 🎁 Liberar el registro**: N días gratis para una app o las 6 (las cuentas creadas en ese tiempo quedan en gratis).
9. **Apps → Panel de la app**: abre el panel de cada app ya iniciado (después de conectarla una vez).

## Manual corto (para ti y para tus clientes)
- **Tú (Centro de Mando)**: Resumen (lo que espera en las 6 apps) · Apps (conectar, liberar versiones, respaldos) · Pagos (precios y comprobantes de las 6) ·
  Control (avisos a todas las cuentas de las 6, planes, textos, keys, cupones, verificaciones) · Mensajes (soporte de las 6) · Ajustes (versión, generales, notificaciones, registro).
- **Panel admin de cada app**: solo lo propio de esa app (reglas, notificaciones, socios, calificaciones, registro…). Precios, planes, avisos a todos y versiones ya no están ahí.
- **Negocio**: la barra de abajo (celular) o el menú lateral (computador) con el + al centro; "Más" en tarjetas; la foto arriba abre su cuenta y la ayuda.
- **Cliente**: igual, con su plan FREE o PREMIUM arriba y el chat de soporte en el menú de la foto.

## Al terminar esta etapa
- No hay que pegar ninguna consulta: las bases se actualizan solas en máximo 10 minutos (CM base 4.5, Billetera 18, Órbita 5.11).
- Libera en CM → Apps (o Ajustes → Versión del CM): CM 4.16 · Billetera 1.18.0 · Órbita 5.18 · Barbería 2.17 · BiciTaller 2.17 · Estaciona 2.10.0.
