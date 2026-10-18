# CodeFix

App web (PWA) multi-negocio para Chile: reservas, catálogo u órdenes según el rubro, abono con comprobante,
agenda, clientes, calificaciones, promociones, planes Gratis/Premium, socio y panel de súper administrador.
Resumen corto del proyecto: [`MEMORIA.md`](MEMORIA.md).
Servidor: **Supabase** (plan gratis). Publicación: **Cloudflare Pages**.

➡️ Configuración paso a paso: [`docs/CONFIGURAR.md`](docs/CONFIGURAR.md)

## Perfiles
| Perfil | Quién lo crea | Qué hace |
|---|---|---|
| **Administrador** | — (correo fijo) | Crea negocios, ve todo (actividad, clientes, reservas, uso del servidor), da/quita Premium y días, aprueba pagos, edita precios, links, planes, reglas y textos, envía avisos, borra calificaciones y limpia el servidor. |
| **Negocio** (dueño) | El administrador | Perfil (logo, colores, ícono), horario, servicios, link del abono, promociones, equipo, agenda, reservas, trabajos, clientes, estadísticas y recordatorios. |
| **Equipo** (mecánico / recepción) | El dueño del negocio | Agenda, revisar comprobantes, trabajar reservas y clientes. No cambia perfil, precios, links ni plan. |
| **Cliente con cuenta** | Él mismo, desde la página de su negocio | Queda asociado a ese negocio: sus reservas, historial de la bici, avisos y Premium. |
| **Cliente sin cuenta** | — | Reserva con nombre y WhatsApp, paga el abono y sube el comprobante desde el enlace de su reserva. |

## Reserva y abono
1. El cliente elige servicio, día y hora (respeta duración del servicio, cupos, colación y bloqueos).
2. La hora queda **retenida 30 minutos** mientras paga el abono con el link del negocio.
3. Sube la foto del comprobante → la reserva queda **en revisión** y la hora sigue apartada.
4. El negocio aprueba (queda **confirmada**) o rechaza (la hora se libera). Si no sube nada en 30 min, se libera sola.

**Cancelaciones**: dentro de los primeros 10 minutos → se devuelve el abono (el negocio lo marca como devuelto).
Después, con 24 h o más de anticipación → queda como **saldo a favor** para reagendar (90 días, todas las veces
que cumpla los plazos). Con menos de 24 h o si no llega → pierde el abono. El abono se descuenta del total.
Todos estos tiempos los cambia el administrador en **Ajustes → Reglas**.

## Pagos
Todo por **link de pago** (Mercado Pago) + foto del comprobante, dentro de la app:
- **Premium del negocio y del cliente** → al administrador (2 links por plan, uno activo; precio editable).
- **Abono de la reserva** → al negocio (2 links propios, uno activo; solo el negocio los ve).

## Gratis vs Premium (todo editable en Ajustes → Planes)
| | Negocio gratis | Negocio Premium |
|---|---|---|
| Reservas online al mes | 30 | 1000 |
| Servicios / promociones activas | 5 / 1 | 60 / 15 |
| Equipo con cuenta | — | 10 |
| Clientes con cuenta | 30 | 2000 |
| Estadísticas y recordatorios de mantención | — | ✅ |

| | Cliente gratis | Cliente Premium |
|---|---|---|
| Historial de la bici | Últimas 3 visitas | Completo |
| Reservar con anticipación extra | — | +15 días |
| Aviso cuando le toca mantención | — | ✅ |

Cuando vence el Premium, el negocio queda en gratis: no pierde nada, pero no puede agregar más de lo que permite
el plan hasta renovar. Se avisa 3 días antes con el botón para pagar.

## Calificaciones
El cliente califica al negocio y el negocio al cliente (una vez por visita). Solo se muestra el **promedio de estrellas**;
los comentarios los ve el calificado y el administrador.

## Avisos
Campanita dentro de la app, en vivo, y notificación push al celular (función `servidor` + cron).
El correo queda preparado para una etapa siguiente.

## Estructura
```
index.html            Inicio de sesión
admin/                Panel del administrador
negocio/               Panel del negocio y su equipo
cliente/              App del cliente con cuenta
t/?s=<negocio>         Página pública del negocio: reservar y crear cuenta
r/?t=<token>          Página de la reserva: pagar, comprobante, cancelar, reagendar, seguir la bici, calificar
shared/               Estilos, núcleo (sesión, campanita, push, imágenes) y librerías
supabase/schema.sql   Base de datos completa (tablas, reglas de seguridad y funciones)
supabase/cron.sql     Tareas automáticas
supabase/functions/servidor/index.ts   Crear cuentas y enviar push
```

© CodeFix · Josué Castillo.
