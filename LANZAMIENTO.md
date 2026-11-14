# 🚀 Lanzamiento de Despega Pyme (antes Órbita): configuración paso a paso (G23)
Lo que YA está configurado no se toca (links de pago que pegaste, precios guardados). Solo llena lo que esté vacío.

## 1 · Publicar (tú, en el CM)
1. **CM → Resumen → Empresas → Órbita → 🧹 Limpiar y abrir** → prueba → **CM → Apps → Órbita → 🚀 Liberar** (6.02; base 5.42, si no está: ⚡ Actualizar base).
2. **CM** (4.87) y **Barbería** (2.77): suben solos (main) → 🧹 Limpiar y abrir → 🚀 Liberar.
3. Edge Functions: **no hay que tocarlas** (el correo al comprador usa la función "enviar" que ya tienes).
4. 🔑🔒 **Entrar con QR + clave protegida (Órbita 6.09 · CM 4.94 · Barbería 2.82)**: pega las **3 Edge Functions** (te paso las 3 líneas import juntas): Órbita **"enviar"**, CM **"servidor"**, Barbería **"enviar"** (Supabase → Edge Functions → borrar → crear con el MISMO nombre, Verify JWT APAGADO → pegar → Deploy).
   - **Correo del enlace (1 vez por app: Órbita, CM, Barbería)**: Supabase → **Authentication → Emails → SMTP Settings** → Enable custom SMTP: host `smtp.gmail.com`, puerto `465`, usuario = tu Gmail, clave = contraseña de aplicación de Google → Save. Sin esto Supabase NO manda el enlace a tus clientes (solo a ti).
   - **Authentication → URL Configuration → Redirect URLs** → Add: `https://<app>.juanjosuecastilloloyola.workers.dev/**` (aplicaciones, saas, barberia).
   - Prueba QR: abre la app en el computador → escanea el QR con la cámara del celular (con sesión) → **Sí, entrar** → el computador entra solo.
   - Prueba 🔒: en otro navegador pon 3 veces una clave mala → sale "🔒 Por seguridad pausamos la clave" → **📧 Enviarme el enlace** → abre el correo → entras y te ofrece clave nueva.
5. ✏️ **Nombre Despega Pyme**: ya sale solo en la app, el CM y los correos. Tú: en Gmail de la app (Ajustes → Correo) si pusiste "Nombre del remitente" Órbita, cámbialo a **Despega Pyme**; en Supabase → SMTP Settings → Sender name: **Despega Pyme**. Quien ya instaló la app ve el nombre nuevo al actualizarse (el ícono no cambia).
6. ✏️ **Fichas → Diseños (Despega 6.10, base 5.47 · CM 4.95)**: solo cambia el nombre; tus diseños guardados siguen. 🧹 Limpiar y abrir → 🚀 Liberar (la base se actualiza sola en 10 min o ⚡ Actualizar base).
7. 🧭🔒🔄 **Paneles, clave protegida y actualizaciones (CM 5.00 · Despega 6.15 · Barbería 2.87 · Billetera 1.21.50 · BiciTaller 2.73 · Estaciona 2.14.52)**: 🧹 Limpiar y abrir → 🚀 Liberar cada una. Sin Edge Functions. Bases de Billetera (34), BiciTaller (2.22) y Estaciona (27) se actualizan solas en 10 min.
   - 🧭 El panel de administrador de las 5 apps está en **CM → Apps → (app) → 🧭 Panel**. Si entras a una app como admin, te lleva al CM. Tus **socios** siguen usando el panel dentro de la app.
   - 🔒 Billetera, BiciTaller y Estaciona: haz el **SMTP** y las **Redirect URLs** del punto 4 también en sus 3 Supabase (emprendedor, taller, estacionamiento).
   - 🔄 El **CM** se actualiza solo apenas se publica. Tus **clientes** ven "🔄 Versión nueva" con el botón **🔄 Actualizar** recién cuando tú liberas (no se instala sola).

## 2 · Correo (tú, si no está) — sin esto no salen los correos al comprador
**CM → Apps → Despega Pyme → 🧭 Panel → 🛰️ Servidor y correo** (G34: el panel del admin de Despega está en el CM; si entras a Despega como admin te lleva al CM): Gmail + contraseña de aplicación (myaccount.google.com → Seguridad → Contraseñas de aplicaciones). Límite ~450 correos al día.

## 3 · Precios (tú, CM → Pagos)
- Negocio: **$3.000/mes** · Cliente Premium: **$2.000/mes**. Prueba gratis 7 días (déjala: retiene).
- 🔗 **Link de pago abierto** (G28): Mercado Pago → Cobrar → Link de pago → **sin monto** → pégalo en CM → Pagos → 🔗 **Link general de pago** → Guardar en las 7 apps. Sirve para TODO (pago de cada app, Premium, módulos y packs; G30: los links con monto fijo ya no se muestran, salvo los antiguos para borrarlos): la app muestra el total con 📋 Copiar monto y el comprobante.

## 4 · 🧩 Venta de módulos (tú, CM → Apps → Órbita → 🧩)
1. 💰 Vender módulos: **prendido**.
2. Precios recomendados (por mes): sueltos $990 · **📊 Medir anuncios $990** · **🌐 Dominio propio $1.990** (te pide trabajo a ti).
3. Packs: 🌱 Básico $1.990 · 🚀 Crecer $2.990 ⭐ Más elegido · 💎 Completo $3.990 (trae los nuevos solo). Anual = 10 meses. Premium −20 %.
4. 🔗 Links de monto fijo: **opcionales** (G28). Con el link abierto de Pagos basta. Si ya tienes alguno, va en 🔗 Links con monto fijo (opcional) y ese plan lo usa.
5. Cómo lo ve el **negocio** (G25): Más → ⭐ **Mi plan y módulos** (Free/Pro arriba, 🧩 Módulos abajo) → **▶️ Probar** abre un ejemplo animado (no toca su tienda) → Comprar · Cerrar (o ✕). Sin prueba gratis.
6. ⏰ **Todo vence solo** (G25): mensual a los 30 días, anual a los 365, regalo en los días que des. Nada queda permanente: el negocio renueva en Mi plan.
7. 🧾 **Detalle de compra** (G25): el negocio lo ve en Pedidos (pedido pagado) y el cliente en Mis pedidos; si hay boleta SII, su N° va adentro. 🌐 **Mi dominio**: Más → Tu tienda → Mi dominio.
   Si entra a un módulo que no tiene (ej. Más → Mensajes, Pedidos → Estadísticas/Promociones, Mi equipo, sellos) ve **▶️ Probar módulo**. Si TÚ lo apagas para todos (CM → 🧩) ve "no está disponible por ahora".

## 5 · 🌐 Dominio de CodeFix + dominios de los negocios (G33, todo desde el CM)
**1 vez (tú):**
1. Compra el dominio en **nic.cl** (ej. codefix.cl).
2. Token de Cloudflare: Cloudflare → 👤 → **My Profile → API Tokens → Create Token** → plantilla **Edit Cloudflare Workers** → **+ Add more**: Zone·Zone·Edit, Zone·DNS·Edit, Zone·SSL and Certificates·Edit → Zone Resources **All zones** → Create → **Copy**.
3. CM → **Control** → **🌐 Dominio** → escribe `codefix.cl` + pega el token → **Guardar y armar**.
4. Salen **2 servidores DNS** (📋). **nic.cl → Mis dominios → codefix.cl → Servidores DNS** → borra los que hay, pega los 2 → Guardar. (Tarda de minutos a 24 h.)
5. Vuelve a CM → Control → 🌐 Dominio → **🔄 Revisar y armar** hasta ver todo ✅: despega., cm., barberia., billetera., bicitaller., estaciona. (+ codefix.cl y www = Despega Pyme).
6. Si sale ⏳ "Dominios de negocios": Cloudflare → codefix.cl → **SSL/TLS → Custom Hostnames → Enable Cloudflare for SaaS** (gratis hasta 100) → 🔄.
7. En **Supabase de cada app** (CM, Despega, Barbería, Billetera, BiciTaller, Estaciona): **Authentication → URL Configuration → Redirect URLs → Add URL** → `https://*.codefix.cl/**` → Save.
- Los links, QR, "compartir" y correos usan el dominio solo cuando está ✅. Mientras tanto todo sigue en workers.dev (nada se rompe).

**Cada negocio (módulo 🌐 Dominio propio):**
- El negocio ve en Despega → Más → Mi dominio: **CNAME www → tiendas.codefix.cl** (📋) y el estado ⏳ → ✅.
- Tú: abre CM → Control → **Despega Pyme** → 🌐 Dominio: se conecta solo en Cloudflare (ya no se agrega a mano).

## 6 · Textos listos para TU tienda / perfil CodeFix (pega donde falte)
- **Descripción (Mi tienda → 📇 Perfil y políticas → Sobre tu negocio):**
  `Tu tienda online lista en 5 minutos: catálogo, pedidos por WhatsApp, pagos con Mercado Pago y despacho a todo Chile. Sin comisiones por venta.`
- **Cambios y devoluciones:** `Cambios y devoluciones hasta 10 días desde que recibes tu compra, sin uso y con su embalaje. Escríbenos por WhatsApp y lo resolvemos.`
- **Envíos:** `Despachamos en 24 a 48 h hábiles. Santiago con reparto propio; regiones por Starken o Chilexpress con código de seguimiento.`
- **Bienvenida de WhatsApp Business:** la copias en Ajustes → 📲 Vender en redes (ya viene armada con tu link).

## 7 · Lo que debe hacer CADA negocio nuevo (lo guía "Lo que me falta")
Logo y nombre → WhatsApp → productos con foto → link de pago o ⚡ Mercado Pago → 🚚 Despacho (comunas + resto de Chile) → 📄 RUT y política de cambios → compartir el link.

## 8 · Antes de abrir las ventas
- LIMPIEZA FINAL de Órbita (tú, en Supabase de Órbita → SQL Editor): pega Aplicaciones/supabase/limpieza/1_contar.sql → Run → revisa los números → pega 2_borrar.sql → Run → Storage → cada bucket → seleccionar todo → Delete. Quedan solo los admins y la configuración.
- G30 (Órbita 6.05): Pedidos → 🎟️ **Cupones y sellos** (la tarjeta de sellos se movió ahí desde Mi tienda) · Más → 🧾 Boletas y 🚚 Despacho traen **📖 ¿Cómo se usa?** · Más → 🧾 Boletas → **📋 Registro de ventas** → 🧾 Ver: formato boleta (logo, RUT, fecha, hora, total, firma) → 🖨️ Imprimir o guardar PDF.
- G32 a/b (Órbita 6.06, bd 5.44): Caja → cobrar → **🧾 Boleta SII** (o Reporte → **SII** en cada venta). Automática = tu cuenta OpenFactura (API key en Más → 🧾 Boletas); Manual (gratis) = emites en sii.cl y escribes el N°. Más → 🧾 Boletas → **❓ ¿Necesito boleta?** y **⚡ Boleta automática paso a paso**.
- Boleta automática (OpenFactura) va como **beta**: prueba 1 boleta real antes de ofrecerla.
- Mercado Pago automático para tu cobro: falta tu **Access Token de producción**.

## 🧹 Probar una app como recién instalada (sin incógnito)
CM → **Resumen** → Empresas → tarjeta de la app → **🧹 Limpiar y abrir** (desde CM 4.86; ya no está en Apps). Las ramas 🧪 Probar están apagadas hasta terminar todas las apps. Borra caché, datos guardados y sesión de ESA app en tu teléfono y la abre al tiro (vuelves a iniciar sesión). Desde el 10/11 los cambios van directo a main: si algo sale mal, avísale a Claude y se revierte.
