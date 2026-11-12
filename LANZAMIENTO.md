# 🚀 Lanzamiento de Órbita: configuración paso a paso (G23)
Lo que YA está configurado no se toca (links de pago que pegaste, precios guardados). Solo llena lo que esté vacío.

## 1 · Publicar (tú, en el CM)
1. **CM → Resumen → Empresas → Órbita → 🧹 Limpiar y abrir** → prueba → **CM → Apps → Órbita → 🚀 Liberar** (6.02; base 5.42, si no está: ⚡ Actualizar base).
2. **CM** (4.87) y **Barbería** (2.77): suben solos (main) → 🧹 Limpiar y abrir → 🚀 Liberar.
3. Edge Functions: **no hay que tocarlas** (el correo al comprador usa la función "enviar" que ya tienes).

## 2 · Correo (tú, si no está) — sin esto no salen los correos al comprador
**Órbita (entra como admin) → Administración → Ajustes → Correo (Gmail)**: Gmail + contraseña de aplicación (myaccount.google.com → Seguridad → Contraseñas de aplicaciones). Límite ~450 correos al día.

## 3 · Precios (tú, CM → Pagos)
- Negocio: **$3.000/mes** · Cliente Premium: **$2.000/mes**. Prueba gratis 7 días (déjala: retiene).
- 🔗 **Link de pago abierto** (G28): Mercado Pago → Cobrar → Link de pago → **sin monto** → pégalo en CM → Pagos → 🔗 Link de pago abierto → Guardar en las 7 apps. Sirve para TODO (Premium, módulos y packs): la app muestra el total con 📋 Copiar monto y el comprobante.

## 4 · 🧩 Venta de módulos (tú, CM → Apps → Órbita → 🧩)
1. 💰 Vender módulos: **prendido**.
2. Precios recomendados (por mes): sueltos $990 · **📊 Medir anuncios $990** · **🌐 Dominio propio $1.990** (te pide trabajo a ti).
3. Packs: 🌱 Básico $1.990 · 🚀 Crecer $2.990 ⭐ Más elegido · 💎 Completo $3.990 (trae los nuevos solo). Anual = 10 meses. Premium −20 %.
4. 🔗 Links de monto fijo: **opcionales** (G28). Con el link abierto de Pagos basta. Si ya tienes alguno, va en 🔗 Links con monto fijo (opcional) y ese plan lo usa.
5. Cómo lo ve el **negocio** (G25): Más → ⭐ **Mi plan y módulos** (Free/Pro arriba, 🧩 Módulos abajo) → **▶️ Probar** abre un ejemplo animado (no toca su tienda) → Comprar · Cerrar (o ✕). Sin prueba gratis.
6. ⏰ **Todo vence solo** (G25): mensual a los 30 días, anual a los 365, regalo en los días que des. Nada queda permanente: el negocio renueva en Mi plan.
7. 🧾 **Detalle de compra** (G25): el negocio lo ve en Pedidos (pedido pagado) y el cliente en Mis pedidos; si hay boleta SII, su N° va adentro. 🌐 **Mi dominio**: Más → Tu tienda → Mi dominio.
   Si entra a un módulo que no tiene (ej. Más → Mensajes, Pedidos → Estadísticas/Promociones, Mi equipo, sellos) ve **▶️ Probar módulo**. Si TÚ lo apagas para todos (CM → 🧩) ve "no está disponible por ahora".

## 5 · 🌐 Dominio de los negocios (Cloudflare for SaaS, G29)
**Una sola vez (tú, en Cloudflare, con tu dominio ya comprado, ej. codefix.cl):**
1. tu dominio → **DNS** → Add record: Tipo **AAAA** · Nombre **tiendas** · IPv6 **100::** · nube **naranja** (Proxied) → Save.
2. **SSL/TLS → Custom Hostnames** → Enable (plan Free) → **Fallback origin** = `tiendas.codefix.cl` → Add.
3. **Workers Routes** → Add route: `*/*` → Worker **aplicaciones** → Save. (Las otras apps con subdominio propio usan "Custom domain" en su Worker: tiene prioridad sobre esta ruta.)
4. CM → **Control** → **Órbita** → **🌐 Dominio** → Destino del CNAME = `tiendas.codefix.cl` → **Guardar**.

**Cada negocio (te llega aviso al CM "🌐 Dominio nuevo: www.sutienda.cl"):**
- Cloudflare → tu dominio → **SSL/TLS → Custom Hostnames → Add custom hostname** → `www.sutienda.cl` → Add. (La lista está en CM → Control → Órbita → 🌐 Dominio.)
- El negocio ya ve en Órbita → Más → Mi dominio: **CNAME www → tiendas.codefix.cl** (con 📋) + redirigir la raíz a www, y el estado ⏳ Pendiente → ✅ Activo (botón 🔄 Revisar).

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
CM → **Resumen** → Empresas → tarjeta de la app → **🧹 Limpiar y abrir** (desde CM 4.86; ya no está en Apps). Las ramas 🧪 Probar están apagadas hasta terminar todas las apps. Borra caché, datos guardados y sesión de ESA app en tu teléfono y la abre al tiro (vuelves a iniciar sesión). Desde el 10/11 los cambios van directo a main: si algo sale mal, avísale a Claude y se revierte.
