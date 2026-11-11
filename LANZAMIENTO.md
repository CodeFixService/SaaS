# 🚀 Lanzamiento de Órbita: configuración paso a paso (G23)
Lo que YA está configurado no se toca (links de pago que pegaste, precios guardados). Solo llena lo que esté vacío.

## 1 · Publicar (tú, en el CM)
1. **CM → Apps → Órbita** → 🧪 Probar → ✅ → **⚡ Actualizar base** → abrir en incógnito → 🚀 Liberar.
2. **CM → Apps → Centro de Mando** y **Barbería**: suben solos (main). Barbería: 🚀 Liberar 2.73.
3. Edge Functions: **no hay que tocarlas** (el correo al comprador usa la función "enviar" que ya tienes).

## 2 · Correo (tú, si no está) — sin esto no salen los correos al comprador
**Órbita (entra como admin) → Administración → Ajustes → Correo (Gmail)**: Gmail + contraseña de aplicación (myaccount.google.com → Seguridad → Contraseñas de aplicaciones). Límite ~450 correos al día.

## 3 · Precios (tú, CM → Pagos)
- Negocio: **$3.000/mes** · Cliente Premium: **$2.000/mes**. Prueba gratis 7 días (déjala: retiene).

## 4 · 🧩 Venta de módulos (tú, CM → Apps → Órbita → 🧩)
1. 💰 Vender módulos: **prendido**.
2. Precios recomendados (por mes): sueltos $990 · **📊 Medir anuncios $990** · **🌐 Dominio propio $1.990** (te pide trabajo a ti).
3. Packs: 🌱 Básico $1.990 · 🚀 Crecer $2.990 ⭐ Más elegido · 💎 Completo $3.990 (trae los nuevos solo). Anual = 10 meses. Premium −20 %.
4. 🔗 Links de monto fijo de Mercado Pago: uno de 1 mes y uno de 1 año por cada pack (y por Medir y Dominio). Mercado Pago → Cobrar → Link de pago → Monto fijo → pega aquí.
5. Cómo lo ve el **negocio** (G25): Más → ⭐ **Mi plan y módulos** (Free/Pro arriba, 🧩 Módulos abajo) → **▶️ Probar** abre un ejemplo animado (no toca su tienda) → Comprar · Cerrar (o ✕). Sin prueba gratis.
6. ⏰ **Todo vence solo** (G25): mensual a los 30 días, anual a los 365, regalo en los días que des. Nada queda permanente: el negocio renueva en Mi plan.
7. 🧾 **Detalle de compra** (G25): el negocio lo ve en Pedidos (pedido pagado) y el cliente en Mis pedidos; si hay boleta SII, su N° va adentro. 🌐 **Mi dominio**: Más → Tu tienda → Mi dominio.
   Si entra a un módulo que no tiene (ej. Más → Mensajes, Pedidos → Estadísticas/Promociones, Mi equipo, sellos) ve **▶️ Probar módulo**. Si TÚ lo apagas para todos (CM → 🧩) ve "no está disponible por ahora".

## 5 · Cuando un negocio pide 🌐 dominio (te llega aviso al CM)
Cloudflare → Workers → **aplicaciones** → Settings → Domains & Routes → **Add → Custom domain** → escribe el dominio. (El dominio debe estar en tu Cloudflare o el cliente te pasa sus DNS.) Abre solo su tienda.

## 6 · Textos listos para TU tienda / perfil CodeFix (pega donde falte)
- **Descripción (Mi tienda → 📇 Perfil y políticas → Sobre tu negocio):**
  `Tu tienda online lista en 5 minutos: catálogo, pedidos por WhatsApp, pagos con Mercado Pago y despacho a todo Chile. Sin comisiones por venta.`
- **Cambios y devoluciones:** `Cambios y devoluciones hasta 10 días desde que recibes tu compra, sin uso y con su embalaje. Escríbenos por WhatsApp y lo resolvemos.`
- **Envíos:** `Despachamos en 24 a 48 h hábiles. Santiago con reparto propio; regiones por Starken o Chilexpress con código de seguimiento.`
- **Bienvenida de WhatsApp Business:** la copias en Ajustes → 📲 Vender en redes (ya viene armada con tu link).

## 7 · Lo que debe hacer CADA negocio nuevo (lo guía "Lo que me falta")
Logo y nombre → WhatsApp → productos con foto → link de pago o ⚡ Mercado Pago → 🚚 Despacho (comunas + resto de Chile) → 📄 RUT y política de cambios → compartir el link.

## 8 · Antes de abrir las ventas
- LIMPIEZA FINAL de Órbita: supabase/limpieza/1_contar.sql → revisar → 2_borrar.sql → Storage → vaciar buckets.
- Boleta automática (OpenFactura) va como **beta**: prueba 1 boleta real antes de ofrecerla.
- Mercado Pago automático para tu cobro: falta tu **Access Token de producción**.

## 🧹 Probar una app como recién instalada (sin incógnito)
CM → Apps → tarjeta de la app → **🧹 Limpiar y abrir**. Borra caché, datos guardados y sesión de ESA app en tu teléfono y la abre al tiro (vuelves a iniciar sesión). Desde el 10/11 los cambios van directo a main: si algo sale mal, avísale a Claude y se revierte.
