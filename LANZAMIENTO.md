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
   - 🔄 El **CM** se actualiza solo apenas se publica.
8. 📋 **CM 5.02 · Despega 6.18**: en **Resumen → Empresas** ahora hay solo **🧹 Limpiar** (antes "Limpiar y abrir"). **Ver app**, **🧭 Panel**, **Respaldo y limpieza** y **Respaldar todas** están en **CM → Apps**. Control tiene ícono propio (escudo). Correos y Planes ya no salen cortados a mitad. 🧹 Limpiar → 🚀 Liberar (sin base ni Edge). Tus **clientes** ven "🔄 Versión nueva" con el botón **🔄 Actualizar** recién cuando tú liberas (no se instala sola).
9. 🏷️ **Avisos por categoría (núcleo 2.74 · CM 5.04 · Despega 6.20 · las 6 con base nueva)**: en **CM → Apps → 🚀 Liberar** ahora marcas casillas (🔒 Seguridad · ⚙️ Funcionamiento · 🖥️ Sistema · ✏️ Mejoras · 🎁 Premios/novedades). Tus usuarios solo ven eso, nunca qué se hizo. El **📝 Detalle** es opcional y solo lo ves tú en Control → 📜 Registro.

## 2 · Correo (tú, si no está) — G42f: 1 solo Gmail tuyo para todas las apps
**CM → Control → ✉️ Correo**: tu Gmail + contraseña de aplicación (myaccount.google.com → Seguridad → Contraseñas de aplicaciones) → **Guardar en todas las apps**. Abajo, en la misma pantalla, están los botones a Supabase → SMTP de cada app (correos de entrar y cambiar clave). Límite ~450 correos al día.
Los correos de cada tienda a SUS clientes salen con el Gmail de la tienda: **Despega → Más → 🏪 Mi tienda → ✉️ Correo de tu tienda** (lo hace cada negocio; sin él sus clientes solo reciben notificaciones).

## 3 · Precios (tú, CM → Pagos)
- Negocio: **$3.000/mes** · Cliente Premium: **$2.000/mes**. Prueba gratis 7 días (déjala: retiene).
- 🔗 **Link de pago abierto** (G28): Mercado Pago → Cobrar → Link de pago → **sin monto** → pégalo en CM → Pagos → 🔗 **Link general de pago** → Guardar en las 7 apps. Sirve para TODO (pago de cada app, Premium, módulos y packs; G30: los links con monto fijo ya no se muestran, salvo los antiguos para borrarlos): la app muestra el total con 📋 Copiar monto y el comprobante.

- ⚡ **Mercado Pago automático** (G85, recomendado): Mercado Pago → Tu negocio → Configuración → Credenciales → **Credenciales de producción** → copia el **Access Token** (APP_USR-…) → CM → Pagos → ⚡ Mercado Pago automático → pégalo → **Conectar en las 7 apps**. Desde ahí: la persona toca ⚡ Pagar con Mercado Pago, paga y su plan se activa solo (te llega push "⚡ Pago automático"). El link abierto sigue igual (esos los apruebas tú en Por revisar).
- 🏷️ Cupones: CM → Pagos → 🏷️ Crear o ver cupones (ej. VERANO 20%): la persona lo escribe en la caja del cupón y ve el precio tachado.

## 4 · 🧩 Venta de módulos (tú, CM → Apps → Órbita → 🧩)
1. 💰 Vender módulos: **prendido**.
2. Precios recomendados (por mes): sueltos $990 · **📊 Medir anuncios $990** · **🌐 Dominio propio $1.990** (te pide trabajo a ti).
3. Packs (G112 b, iguales en las 6; ⭐ Normal = el destacado; cada pack sale más barato que sus sueltos; Completo trae los nuevos solo):
   | App | 🌱 Básico | ⭐ Normal | 💎 Completo |
   |---|---|---|---|
   | Despega | $1.990 · cupones, sellos, calificaciones | $2.990 · + chat, carrito, redes, estadísticas | $3.990 · los 20 |
   | Barbería | $1.490 · recordatorios, sellos | $2.490 · + campañas, antifalta, espera, reseñas | $2.990 · los 12 |
   | Billetera | $1.490 · acuerdo, escalonado | $1.990 · + aviso vence, gastos fijos, cierre de caja | $2.490 · los 7 |
   | BiciTaller | $1.490 · presupuesto, aviso listo, mantención | $2.490 · + stock, garantías, reseñas, promos | $3.490 · los 12 |
   | Estaciona | $1.490 · destacar, descuentos | $1.990 · + avísame, frecuentes, tarifas | $2.490 · los 8 |
   Se cambian en CM → Apps → (app) → 🧩. Las bases que ya tenías cambiadas a mano NO se tocan. Anual = 10 meses. Premium −20 %.
4. 🔗 Links de monto fijo: **opcionales** (G28). Con el link abierto de Pagos basta. Si ya tienes alguno, va en 🔗 Links con monto fijo (opcional) y ese plan lo usa.
5. Cómo lo ve el **negocio** (G25): Más → ⭐ **Mi plan y módulos** (Free/Pro arriba, 🧩 Módulos abajo) → **▶️ Probar** abre un ejemplo animado (no toca su tienda) → Comprar · Cerrar (o ✕). Sin prueba gratis.
6. ⏰ **Todo vence solo** (G25): mensual a los 30 días, anual a los 365, regalo en los días que des. Nada queda permanente: el negocio renueva en Mi plan.
7. 🧾 **Detalle de compra** (G25): el negocio lo ve en Pedidos (pedido pagado) y el cliente en Mis pedidos; si hay boleta SII, su N° va adentro. 🌐 **Mi dominio**: Más → Tu tienda → Mi dominio.
   Si entra a un módulo que no tiene (ej. Más → Mensajes, Pedidos → Estadísticas/Promociones, Mi equipo, sellos) ve **▶️ Probar módulo**. Si TÚ lo apagas para todos (CM → 🧩) ve "no está disponible por ahora".
8. 🎁 **Campaña de lanzamiento** (G74 b, las 6): CM → Apps → <app> → 🧩 → tarjeta **🎁 Campaña de lanzamiento** → marca los módulos → Meses de regalo (3 sugerido) → Termina el (fecha) → **🎁 Lanzar campaña**.
   Negocio: Más → 🧩 Módulos ve arriba "Lanzamiento: N módulos GRATIS por 3 meses" y en cada uno **GRATIS 3 meses** → **🎁 Activar gratis** (o desde ▶️ Probar) → lo tiene al tiro ("🎁 Regalo hasta el…"). Una vez por módulo.
   El día después de "Termina el" se apaga sola (o **⏹️ Terminar hoy**): los nuevos ven el precio; los que activaron siguen hasta su fecha y 7 días antes les llega el aviso para pagar (Premium −20 %).
   G81: **✅ Todos los módulos** de un toque · meses con botones (1 · 3 · 6 · 12) · **Dura** 15/30/60/90 días (pone "Termina el" solo).
9. 🔑 **Keys** (G81 d, las 6) — CM → Control → elige la app → **🔑 Keys**:
   - **Qué activa**: ⭐ Premium (negocio o cliente) · 📦 Pack (Básico/Normal/Completo) · un módulo suelto (solo negocios).
   - **Cuántas** 1 · 5 · 10 · 20 y **Días** 30 · 90 · 180 · 1 año → **🔑 Crear keys** → **📋 Copiar todas** (trae el texto listo: qué activa, días, códigos y dónde canjear).
   - Cada key sirve **1 sola vez** (no hay keys de "5 usos": se filtran). Para 5 negocios → crea 5.
   - Negocio canjea: Premium → Mi plan → **🔑 Tengo una key** · módulo/pack → Más → 🧩 Módulos → **🔑 Tengo una key**. Si ya tiene ese módulo activo, la key NO se gasta (le avisa).
   - Tú también puedes aplicarla: CM → Control → Negocios → 🔑 Key en ese negocio. **Revocar** = deja de servir (si no se usó).

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
Logo y nombre → WhatsApp → productos con foto → link de pago o ⚡ Mercado Pago → 🚚 Despacho (comunas + resto de Chile) → 📄 RUT y política de cambios → ✉️ su Gmail (Mi tienda → ✉️ Correo) → compartir el link.

## 8 · Antes de abrir las ventas
- LIMPIEZA FINAL de Órbita (tú, en Supabase de Órbita → SQL Editor): pega Aplicaciones/supabase/limpieza/1_contar.sql → Run → revisa los números → pega 2_borrar.sql → Run → Storage → cada bucket → seleccionar todo → Delete. Quedan solo los admins y la configuración.
- G30 (Órbita 6.05): Pedidos → 🎟️ **Cupones y sellos** (la tarjeta de sellos se movió ahí desde Mi tienda) · Más → 🧾 Boletas y 🚚 Despacho traen **📖 ¿Cómo se usa?** · Más → 🧾 Boletas → **📋 Registro de ventas** → 🧾 Ver: formato boleta (logo, RUT, fecha, hora, total, firma) → 🖨️ Imprimir o guardar PDF.
- G32 a/b (Órbita 6.06, bd 5.44): Caja → cobrar → **🧾 Boleta SII** (o Reporte → **SII** en cada venta). Automática = tu cuenta OpenFactura (API key en Más → 🧾 Boletas); Manual (gratis) = emites en sii.cl y escribes el N°. Más → 🧾 Boletas → **❓ ¿Necesito boleta?** y **⚡ Boleta automática paso a paso**.
- Boleta automática (OpenFactura) va como **beta**: prueba 1 boleta real antes de ofrecerla.
- Mercado Pago automático para tu cobro: falta tu **Access Token de producción**.

## 🧹 Probar una app como recién instalada (sin incógnito)
CM → **Resumen** → Empresas → tarjeta de la app → **🧹 Limpiar** (desde CM 5.02 es lo único ahí; lo demás está en Apps). Las ramas 🧪 Probar están apagadas hasta terminar todas las apps. Borra caché, datos guardados y sesión de ESA app en tu teléfono y la abre al tiro (vuelves a iniciar sesión). Desde el 10/11 los cambios van directo a main: si algo sale mal, avísale a Claude y se revierte.

## 💈 Barbería 2.94 (bd 2.79) · 🧩 módulos, 🧾 comprobante y Premium con fecha
1. Cloudflare → Barbería en **Listo** → CM → Resumen → Empresas → Barbería → **🧹 Limpiar** → prueba: Más → Caja → toca un corte → **🧾 Comprobante**.
2. (Cuando quieras vender módulos) CM → Apps → 💈 Barbería → **🧩** → prender "Vender módulos". Sin prenderlo todo sigue igual (solo Premium).
3. CM → Apps → **🚀 Liberar**. La base se actualiza sola (ya no se reinstala cada 10 min).

## 🚲 Probar módulos BiciTaller (tú, en el celular; antes CM → Apps → 🚲 → 🧩 venta prendida)
- G74a Hoy → ＋ Nueva orden → agrega arreglos → ✅ Lista → 💵 Cobrar y entregar · Hoy → 🧾 Presupuesto → 📲 Enviar presupuesto · Hoy → 💵 Caja → ＋ Nueva venta → 💵 Cobrar → Cierre del día
- G59c 🚦 Tablero → Lista → 📲 Avisar
- G59d Más → 📦 Repuestos → ✨ → entregar → 🛒 pedido → 📥 Llegó
- G59e Más → 🏷️ Bicis usadas → ＋ → ✅ Todo bien → 📷 → 📣 Publicar → 👀 Ver en mi página · Más → 🔄 Parte de pago
- G59f orden → 🪪 Pasaporte → Crear → 🖨️ Sticker QR → 📲 Enviar al dueño → (como cliente) 🚨 Me la robaron
- G86 📍 (2 teléfonos) pasaporte → 📲 Enviar al dueño → (dueño) 🚨 Me la robaron (casilla 🕵️ marcada) → (otro teléfono) escanea el sticker → Permitir ubicación → (dueño y taller) llega el aviso → 📍 Dónde está → 🗺️ Abrir en el mapa → camina: el punto se mueve solo
- G59g Más → 🚐 A domicilio → ⚙️ prender + recargo → Guardar → (como cliente) tu página → 🏠 Que vengan a mi casa → Reservar → (taller) Ruta del día → 🗺️ Abrir la ruta → 🚐 Voy en camino
- G59h orden lista → 🛡️ Garantía → Dar garantía → 📲 Enviar al cliente → (cliente) 🛡️ Usar mi garantía → (taller) Hoy → ✅ Lo arreglé
- G74c Más → 🏪 Perfil → ⭐ Reseñas en Google → pega el link (Google Maps → tu taller → Pedir reseñas → Copiar link) → 💾 Guardar link → orden entregada → ⭐ Pedir reseña · (cliente) su link → ⭐ 5 estrellas → ⭐ Dejar reseña en Google
- G59i Más → 🔁 Planes de mantención → ＋ Nuevo plan (ej. Rodador $15.000 · 1 visita · 10%) → ＋ Sumar cliente → 💰 Cobrar y sumar → abre una orden de ese teléfono → ✅ Usar el plan (total −10%) → (cliente) su link muestra "Tu plan" · tu página muestra los planes con 📲 Lo quiero

## G84 c 🔎 Filtros de Estaciona (probar)
1. Estaciona → ➕ Publicar (o Más → Mis estacionamientos → Editar) → marca 📹 Cámara y 🚪 Portón automático → Guardar.
2. Mapa → arriba toca el chip 📹 Cámara o 🚪 Portón (o el botón de filtros) → solo quedan los que lo tienen.

## G84 d+e ⏰🔔🔁 Estaciona 2.14.81 (probar con 2 cuentas, después de ⬆️ Actualizar base de datos)
- ⏰ Reserva por hora confirmada → 15 min antes de terminar llega "⏰ Tu estacionamiento termina a las…" (día: 2 h antes · mes: 3 días antes). El dueño también se entera.
- 🔔 (cuenta Premium) Más → Cuenta → Alerta de zona → activar → cuando otra persona termina o cancela un arriendo en uso cerca, llega "🔔 Se liberó un estacionamiento cerca" (máx. 1 cada 30 min).
- 🔁 Reserva por MES confirmada → Reservas → abrirla → "Renovar cada mes" → Prender. 5 días antes de terminar llega "🔁 Toca renovar tu mes" → 💳 Pagar → 📤 Subir comprobante → (dueño) ✅ Aceptar = un mes más. Si el dueño rechaza, o quien arrienda toca "No renovar", deja de renovarse.

## G87 A 🐞 CM 5.30 (probar)
- CM → Más → Control → elegir 🚲 BiciTaller en la caja → 🏪 Negocios: debe salir tu taller de prueba (también Billetera, Estaciona y Centro de Mando; antes decía "aún no tiene la lista"). Requiere ⬆️ Actualizar base en BiciTaller, Billetera, Estaciona y CM.
- Menú de Control: se corre con el dedo; deslizando el dedo por la página (fuera del menú) pasa a la sección vecina; en computador, con la rueda del mouse o arrastrando.

## G89 🧹🔐⚡ CM 5.31 · las 7 apps (probar, después de ⬆️ Actualizar base en las 7 y la función "servidor" del CM v3.4)
- CM → Apps → (cada app) 🧹 Respaldo y limpieza → **↺ Volver a cero**: los ingresos de los resúmenes quedan en $0 (los pagos no se borran). "Contar todo otra vez" lo deshace.
- Despega: si un producto sale en la vitrina pero no en tu Caja → abre la Caja: ahora aparece solo (para editarlo o borrarlo). Los que tienen error: CM → Apps → 🚀 Despega → 🧹 → "🗑️ Productos con error" → Borrar.
- CM → Usuarios → **+ Cuenta**: tipo, nombre, WhatsApp (+56 9), correo → Crear → **💬 Enviar por WhatsApp**. Al entrar, la persona DEBE crear su clave.
- CM → Usuarios → **🔑 Clave** (en cada persona): le pone clave temporal y te arma el WhatsApp.
- Socio: ya NO puede dar Pro, suspender, cambiar ajustes ni eliminar (solo agregar avisos con motivo). Pruébalo con tu cuenta de socio.
- 🪪 Verificación: el RUT se escribe sin el dígito final (sale solo) y las fotos de la cédula abren la cámara.
- 🛰️ Función del CM (1 vez, ANTES de probar 🔑 Clave): Supabase (CM vqevujjraisrcoirswuq) → Edge Functions → servidor → Code → borra todo y pega:
  `import 'https://raw.githubusercontent.com/CodeFixService/SaaS/b9c0a0ab3d044d167984cb1282de25120a5a0a8d/supabase/functions/servidor/index.ts';` → Deploy (Verify JWT APAGADO).

## G90 💰🔔🔑 CM 5.32 · las 7 apps (probar, después de CM → Apps → ⬆️ Actualizar base en las 7)
1. CM → Resumen → tarjeta 💰 Dinero: toca una app (detalle por Premium/módulo) · 🔴 Morosos → 💬 Cobrar por WhatsApp · ⏳ Vencen.
2. CM → Usuarios → + Cuenta → elige Barbería: se abre su 🧭 panel con ➕ Crear barbería listo.
3. Con Mercado Pago conectado: en una app → Premium → marca 🎁 "Es para otra cuenta" → paga poco con cupón → al volver: key + 📋 Copiar + 🧾 Ver comprobante. Canjéala en otra cuenta (Premium → 🔑 Tengo una key).
4. Entra como socio al CM: no ve 💰 Dinero, 🚀 Liberar ni Planes/Textos.
5. A los 15 min de un negocio nuevo te llega 🔔 "🆕 Negocio nuevo".


## G91 🚲 BiciTaller 3.07 (probar, después de CM → Apps → 🚲 BiciTaller → ⬆️ Actualizar base: debe quedar 2.47)
1. 📸 Abre una orden → en un ítem toca **📷 Foto del daño** → saca la foto. Pide aprobación: el cliente la ve en su link.
2. 🧑‍🔧 Hoy → Tablero: arriba salen los botones **Todos · cada mecánico · Sin asignar** con cuántas bicis tiene cada uno; toca uno para filtrar.
3. 📍 Entra como CLIENTE → Inicio → **🚲 Mis bicis → ➕ Registrar mi bici** → 🖨️ QR. Escanea el QR con otro teléfono: NO pide ubicación ni muestra mantenciones. Ahora en tu app toca **🚨 Me la robaron** → vuelve a escanear: pide ubicación → en tu ficha sale el **mapa** con el punto.
4. 📄 En esa ficha (o en el taller: Más → 🪪 Pasaporte → la bici) toca **📄 Constancia para Carabineros** → Imprimir o guardar PDF. En el taller también: **📲 Avisar al dueño**.
5. 🗓️ Más → ⏰ Horario: tarjetas **Sábado** y **Domingo** (horario, cada cuánto, bicis a la vez, máximo del día; vacío = igual que lunes a viernes) → 💾 Guardar. Abajo **⛔ Días cerrados**: Desde/Hasta → ⛔ Cerrar esos días (✅ Abrir lo deshace).
6. 🧾 Más → 💵 Caja → en un cobro toca **🧾** → escribe el N° de la boleta del SII → 💾 Guardar · **🧾 Comprobante** para imprimir o mandar por WhatsApp.
7. 🛒 (con el módulo 📦) Más → 📦 Repuestos → ✏️ uno → marca **🛒 Mostrar en mi tienda** (tipo, descripción, 📷 foto) → 💾. Abre tu página de reservas: sale **🛒 Tienda** → Agregar → **📲 Pedir por WhatsApp**.
8. 📊 (Premium) Más → 📊 Estadísticas: abajo **🧑‍🔧 Por mecánico · 💵 Caja de este mes · 🔩 Lo más vendido · 📥 Descargar (Excel)**.

## G92 🔤🧾 las 7 apps (probar, después de CM → Apps → ⬆️ Actualizar base en las 7)
1. Cualquier app → 👤 Mi perfil → 🎨 Color y modo → mueve **🔤 Tamaño de letra** y toca **Delgada / Normal / Gruesa**: cambia al tiro y queda guardado.
2. 🚲 BiciTaller → Más → **🧾 Boleta SII** → completa RUT, razón social, giro, dirección, comuna → 💾 Guardar. (⚡ Automática solo si tienes API key de OpenFactura.)
3. Caja → 🧾 en un cobro → ✍️ anota el N° (o ⚡ Emitir si es automática).
4. 💈 Barbería (dueño) → Más → **🧾 Boleta SII** → datos → Guardar → Caja → toca un corte → **🧾 Boleta SII** → escribe el N° → 🧾 Comprobante lo muestra.

## G93 ✅📢 CM 5.34 · las 7 apps (probar, después de CM → Apps → ⬆️ Actualizar base en las 7; CM debe quedar bd 4.51)
1. App del CM (tu cuenta de prueba, no admin) → **Tablero** → arriba **✅ Checklists** → 🏷️ Mi rubro: elige uno → toca **Usar** en una plantilla → tacha pasos → 🎉 al terminar → **↺ Reiniciar** para reusarla.
2. En la plantilla toca **✏️** → cambia los pasos (uno por línea) → Guardar: queda "tuya"; **↺** vuelve a la de fábrica. **+ Crear desde cero** para una propia.
3. CM → Más → Control → **📢 Anuncios** → **+ Campaña** → nombre, objetivo, apps → en el conjunto elige **A quién** → **+ Anuncio** (📷 Imagen, título, texto, botón y link como `https://…` o `#premium`) → Guardar → **🚀 Publicar**.
4. Entra a una de esas apps con una cuenta normal: a los segundos sale la tarjeta **📣 Novedad** abajo → **✕** la cierra y no vuelve.
5. CM → 📢 Anuncios → **📊 Resultados** (vistas, clics, cerrados) · **📤 Compartir** (en el anuncio) abre el menú del teléfono → Instagram historia/post/reel.
6. 🎬 Estudio/Cerebro: en **Cerebro** → Empresa → 🗂️ Respaldo, guía y borrar → **⬇️ Respaldo Excel** → guárdalo → avísame "respaldo listo" para portar el motor al CM.

## G102 🚚 Courier Chilexpress · Despega 6.57 (después de CM → Apps → ⬆️ Actualizar base en las 7: CM 4.59 · Despega 5.77 · Barbería 3.07 · Billetera 62 · BiciTaller 2.58 · Estaciona 59; funciones SIN cambio)
Cada tienda usa SU cuenta de Chilexpress (CodeFix no pone nada). Para probar, con tu cuenta de tienda en Despega:
1. En el computador: **developers.wschilexpress.com** → crea cuenta → **Productos** → suscríbete a **Cotizador**, **Coberturas** y **Envíos** → **Perfil** → copia la **Primary key** de cada uno.
2. Despega → **Más** → "Tu tienda" → **🚚 Courier Chilexpress** (sin el módulo: **▶️ Probar módulo** → 🎁 Probar 7 días) → **⚙️ Conexión y datos de retiro** → pega las llaves · marca **🧪 Llaves de prueba** si son de prueba · comuna, calle, número y teléfono desde donde envías → **💾 Guardar** → dice "✅ Chilexpress conectado".
3. **💲 Cotizar un envío** → escribe "Temuco" → **💲 Cotizar** → salen los servicios con precio.
4. Etiquetas (solo con contrato): pega la llave de **Envíos** y tu **N° de cliente TCC** (te lo da tu ejecutivo Chilexpress) → **💾 Guardar** → dice "🏷️ etiquetas activas".
5. **Pedidos** → un pedido con 🚚 Despacho ya pagado → **🏷️ Etiqueta Chilexpress** → revisa calle/número → elige servicio → **🏷️ Crear etiqueta** → sale la etiqueta (**🖨️ Imprimir** o **⬇️ Descargar**) y al cliente le llega el código de seguimiento.

## G102 b 💲 Tarifa Chilexpress en el carrito · núcleo 3.14 · Despega 6.62 (después de CM → Apps → ⬆️ Actualizar base en las 7: CM 4.63 · Despega 5.81 · Barbería 3.11 · Billetera 66 · BiciTaller 2.62 · Estaciona 63; funciones SIN cambio)
Necesita el paso G102 hecho (Chilexpress conectado). Con tu cuenta de tienda en Despega:
1. **Más** → "Tu tienda" → **🚚 Despacho** → "Resto de Chile" → **💲 Tarifa Chilexpress** → en "Si Chilexpress no responde, cobrar" pon un precio (o 0 = por pagar) → **Guardar**.
2. Abre tu tienda pública (o el catálogo con una cuenta de cliente) → agrega un producto → **🛒 Pedido** → **🚚 Despacho** → Comuna: **📦 Otra comuna o región…** → elige región → escribe "Temuco" → a los segundos dice "🚚 Despacho Chilexpress a Temuco: $X".
3. Haz el pedido → en **Pedidos** sale la línea "🚚 Chilexpress a Temuco" sumada al total.

## G101 🛒 Mercado Libre · Despega 6.56 · CM 5.41 (después de CM → Apps → ⬆️ Actualizar base en las 7: CM 4.58 · Despega 5.76 · Barbería 3.06 · Billetera 61 · BiciTaller 2.57 · Estaciona 58; funciones SIN cambio)
Una sola vez (Josué, en el computador):
1. Abre **developers.mercadolibre.cl** → entra con tu cuenta de ML → **Mis aplicaciones** → **Crear aplicación**.
2. Nombre "CodeFix Despega" · **URI de redirect**: la que muestra **CM → Control → 🛒 Mercado Libre** (la URL de Despega, termina en /) · Permisos: **read, write, offline_access** · Tópicos: ninguno → **Crear**.
3. Copia **App ID** y **Clave secreta** → **CM → Control → 🛒 Mercado Libre** → pégalos → **Guardar en Despega** → dice "✅ Listo".
Probar (cuenta de tienda en Despega, con una publicación activa en ML):
4. **Más** → "Vender más" → **🛒 Mercado Libre** (sin el módulo: **▶️ Probar módulo** → 🎁 Probar 7 días) → **🔗 Conectar Mercado Libre** → acepta en ML → vuelves solo y dice "✅ Conectado como TU_APODO".
5. **📥 Unir publicaciones** → en cada publicación elige su producto de la tienda. En "Unidas" sale "⏳ Se manda N a Mercado Libre" → a los 5 min (o **🔄 Sincronizar**) pasa a "✅ N en los dos lados" y en ML se ve ese stock.
6. Vende 1 en ML (compra de prueba) → a los 5 min llega 🔔 "🛒 Vendiste en Mercado Libre" y el stock de la tienda bajó 1. **⏸️ Pausar** detiene todo; **Desconectar** borra el permiso pero guarda las uniones.

## G100 ⚡ Cobrar sin link con Mercado Pago · BiciTaller 3.16 · Estaciona 2.14.92 (después de redeploy de **servidor** de BiciTaller con su corto.ts y CM → Apps → ⬆️ Actualizar base: BiciTaller 2.56 · Estaciona 57)
1. **BiciTaller** (dueño) → **Más** → **💳 Abono** → conecta **⚡ Tu Mercado Pago** → en Espacio 1 pon solo el **monto** (link vacío) → marca **Activo** → **💾 Guardar** → en **Hoy** ya no sale "Configura el cobro del abono".
2. Con otro teléfono reserva desde la vitrina → en la reserva sale solo **⚡ Pagar $… con Mercado Pago** (sin botón de link).
3. **Estaciona** (dueño sin link) → conecta ⚡ en **Más** → **💳 Links de pago** → en el inicio ya no sale "Configura cómo te pagan".

## G99 ⚡ Aviso instantáneo de Mercado Pago · las 7 apps (después de CM → Apps → ⬆️ Actualizar base en las 7: CM 4.57 · Despega 5.75 · Barbería 3.05 · Billetera 60 · BiciTaller 2.55 · Estaciona 56)
1. Redeploy de las 6 funciones (1 vez): Supabase (cada proyecto) → **Edge Functions** → función → **Code** → borra todo → pega la línea de `supabase/functions/<f>/corto.ts` de ese repo → **Deploy** (Verify JWT APAGADO). CM y BiciTaller: "servidor" · Despega, Barbería, Billetera y Estaciona: "enviar".
2. Probar: paga algo chico con ⚡ Mercado Pago y NO vuelvas a la app (cierra la pestaña de MP) → en segundos llega "✅ Pago aprobado" (antes: hasta 1 minuto).
3. Si no la redeployas no se rompe nada: sigue confirmando al volver y cada 1 min.

## G98 ⚡ Mercado Pago de cada negocio · Barbería 3.25 · BiciTaller 3.14 · Estaciona 2.14.90 (probar, después de CM → Apps → ⬆️ Actualizar base en las 7: CM 4.56 · Despega 5.74 · Barbería 3.04 · Billetera 59 · BiciTaller 2.54 · Estaciona 55)
Necesitas una cuenta de Mercado Pago de prueba o la tuya (el pago es real: usa un abono chico, ej. $500).
1. **Barbería** (cuenta de barbería) → **Más** → **💳 Links de pago** → tarjeta **⚡ Tu Mercado Pago** → pega el Access Token (Mercado Pago → Tu negocio → Configuración → Credenciales → **Credenciales de producción**) → **⚡ Conectar** → dice "✅ Activo · tu nombre".
2. Con otro teléfono reserva por el link de la barbería → en la reserva toca **⚡ Pagar con Mercado Pago** → paga → vuelve → en segundos dice **¡Tu hora está agendada!** (sin comprobante). Al barbero le llega "📅 … · ⚡ abono pagado con Mercado Pago".
3. **BiciTaller** → **Más** → **💳 Abono** → misma tarjeta → **⚡ Conectar** → reserva desde la vitrina con otro teléfono → **⚡ Pagar $… con Mercado Pago** → queda **✅ Confirmada** sola.
4. **Estaciona** (dueño) → **Más** → **💳 Links de pago** → tarjeta arriba → **⚡ Conectar**. Con otra cuenta reserva → **⚡ Pagar $… con Mercado Pago** → queda confirmada sin que el dueño toque nada. En un arriendo por mes con 🔁 Renovar prendido, 5 días antes aparece **⚡ Pagar … con Mercado Pago** para el mes siguiente.
5. Para volver a link + comprobante: misma tarjeta → **Desconectar**.

## G96 b 🏬📣 Sucursales · Promo destacada · Despega 6.53 · Barbería 3.24 · BiciTaller 3.13 (probar, después de CM → Apps → ⬆️ Actualizar base en las 7: CM 4.55 · Despega 5.73 · Barbería 3.03 · Billetera 58 · BiciTaller 2.53 · Estaciona 54)
1. Despega (cuenta de tienda) → **Más** → "Tu tienda" → **🏬 Sucursales y bodegas** (sin el módulo: **▶️ Probar módulo**) → Nombre "Local Mall" → **Agregar sucursal**. Se crea sola la principal **⭐ Casa matriz** con todo tu stock de hoy.
2. En "Stock por sucursal" escribe cuánto hay en Local Mall (ej. 5) → el total sube 5. **⇄ Mover mercadería**: producto, Desde Casa matriz, Hacia Local Mall, 3 → **⇄ Mover** (el total no cambia).
3. **Caja** → arriba de los medios de pago: **🏬 Vendes desde** → elige Local Mall → vende 1 → en Sucursales baja en Local Mall y en el total. Los pedidos online siempre salen de la Casa matriz.
4. **Más** → "Vender más" → **📣 Promo destacada** → Título + foto + Botón "Ver" + Link https://… → **📣 Publicar promo**. Con un cliente de tu tienda: abre la app → a los segundos sale la tarjeta "📣 Tu tienda · …" con ✕. En la hoja ves 👁️ la vieron · 👆 la tocaron. Máx. 3 al aire (⏸️ Pausar).
5. Lo mismo en **Barbería** (Más → 📣 Promo destacada; la ven quienes reservaron contigo) y **BiciTaller** (Más → 📣 Promo destacada; la ven tus clientes con cuenta). Tus 🏷️ Ofertas/Promociones de siempre no cambian.

## G96 🧩 Módulos de tienda · Despega 6.52 (probar, después de CM → Apps → ⬆️ Actualizar base en las 7: CM 4.54 · Despega 5.72 · Barbería 3.02 · Billetera 57 · BiciTaller 2.52 · Estaciona 53)
1. Despega (cuenta de tienda) → **Más** → grupo "Vender más": **🎁 Gift cards** · **🛒 Carritos olvidados** · **🔁 Compras recurrentes** y en "Tu tienda" **📦 Stock mínimo y proveedores**. Sin el módulo: qué hace + **▶️ Probar módulo** (🎁 7 días).
2. **🎁 Gift cards** → Monto 15000 → **🎁 Crear gift card** → **💬 Enviar por WhatsApp**. En la **Caja**: medio **🎁 Gift card** → Cobrar → escribe el código → descuenta del saldo. En el carrito del cliente: escribe el código en "Cupón o gift card" → ve su saldo → el pedido sale con ese descuento (si se cancela, el saldo vuelve).
3. **🛒 Carritos olvidados** (con un cliente que dejó productos sin pedir) → **💬 WhatsApp** → abre el chat con el texto listo y queda "✓ le escribiste".
4. **🔁 Compras recurrentes** → Cliente + producto + cada 7/14/30 días → 🔁 Guardar. Ese día (9 AM) el pedido se crea solo y al cliente le llega el aviso. El cliente lo ve en Pedidos → **⏸️ Pausar**.
5. **📦 Stock mínimo y proveedores** → + Agregar proveedor (nombre + WhatsApp) → en cada producto: mínimo y proveedor → cuando baja te llega 📦 aviso → **💬 Pedir** abre WhatsApp del proveedor con la lista.

## G95 🎁 Prueba 7 días por botón · las 7 apps (probar, después de CM → Apps → ⬆️ Actualizar base en las 7: CM 4.53 · Despega 5.71 · Barbería 3.01 · Billetera 56 · BiciTaller 2.51 · Estaciona 52)
1. Crea una cuenta NUEVA de negocio en cualquier app (ej. BiciTaller /n/) → entra: parte **Free** (ya no regala Premium al registrarse).
2. Toca **⭐ Premium / Pasar a Pro / Mi plan** → arriba sale **🎁 Prueba Premium 7 días gratis** → **🎁 Probar 7 días gratis** → **Continuar** → la app queda en Premium 7 días. Ábrela otra vez: ya no ofrece la prueba.
3. Más → **🧩 Módulos** (con "Vender módulos" prendido en CM → Apps → 🧩) → cada módulo trae **🎁 Probar 7 días** (verde) → tócalo → "🎁 Prueba gratis hasta…" y ese botón desaparece. Otro módulo sigue con su botón.
4. Anti-trampa: CM → Control → Negocios → borra esa cuenta → regístrate otra vez con el MISMO correo → Premium y el módulo ya probado NO muestran 🎁 (los otros módulos sí).
5. CM → **Control** → elige la app → **🎁 Pruebas**: quién probó qué y cuándo ("(cuenta borrada)" si ya no existe). Los días se cambian en Apps → 🧩 Módulos → Días de prueba (0 = sin prueba).

## G94 🎬💰🅿️ CM 5.35 · Billetera 1.21.81 · Estaciona 2.14.86 · las 7 apps (probar, después de CM → Apps → ⬆️ Actualizar base en las 7: CM 4.52 · Despega 5.70 · Barbería 3.00 · Billetera 55 · BiciTaller 2.50 · Estaciona 51)
1. 🎬 **Estudio** (solo tu cuenta admin): app del CM → **Cerebro** → arriba **🎬 Estudio** → elige el Espacio (ej. Ciclaselfie) → **🎯 Espacio**: objetivo 💰/📈/💬/🔁, público, hashtags y ritmo → 💾 Guardar.
2. **📚 Base** → **⬇️ Plantilla** → ábrela en Excel, llena tema / categoria / texto → guárdala como CSV → **⬆️ Subir CSV**.
3. **💡 Idea** → elige la red → **✨ Generar idea** → 8 cajas, cada una con **📋 Copiar** y **🔄 Otra** · "2 ganchos más" con su puntaje · **📋 Copiar prompt para Claude** · **💾 Guardar idea**.
4. **📅 Semana** → **📅 Armar la semana** → 💾 Guardar todas → toca una → ✅ Publicada + métricas (a los 7 días) → **📊 Qué funciona** muestra temas, ganchos, formatos, redes, horas y días. También **⬆️ Subir historial** (plantilla o export de Meta Business Suite / TikTok Studio).
5. 💰 **Billetera** (cuenta de negocio): Más → **🧩 Módulos** (con "Vender módulos" apagado dice "incluidos") · un cliente que debe → **📝 Acuerdo** → Crear → 📲 Enviar link → el cliente abre su link, pone su nombre y **✍️ Acepto** → te llega el aviso.
6. Billetera → Más → **🧮 Link para el contador** → 🔗 Crear link → ábrelo en otro teléfono (ve ingresos/gastos del mes y ⬇️ planilla, sin nombres) → ⛔ Desactivar.
7. Billetera → Más → **🔁 Gastos fijos** → ＋ (ej. Arriendo día 1) → queda anotado en la Caja de este mes (1 sola vez). Cobrar a un cliente atrasado → el tono sale solo (📈 Cobranza escalonada).
8. 🅿️ **Estaciona** (2 cuentas): dueño → Más → **🏷️ Descuento por estadía larga** (ej. 10 % desde 3) → otra cuenta reserva 4 → el total sale con −10 %.
9. Estaciona: dueño acepta la reserva → quien arrienda abre la reserva → **🔑 Mi pase para entrar** (QR + código) → dueño → Más → **🔑 Control de acceso** → escribe el código (o 📷 Escanear) → ✅ VIGENTE → 🟢 Entrada / 🔴 Salida.
10. Estaciona → Más → **💰 Ganancias y ocupación** (mes, % por lugar, mejor día, ⬇️ planilla) · **🧩 Módulos** (tienda) · el ⭐ destacado del mapa ahora también se compra suelto.

## G103 💳🧾 Webpay con Flow + factura 33 · núcleo 3.10 · CM 5.43 · Despega 6.58 · Barbería 3.29 · Billetera 1.21.89 · BiciTaller 3.19 · Estaciona 2.14.95 (bases: CM 4.60 · Despega 5.78 · Barbería 3.08 · Billetera 63 · BiciTaller 2.59 · Estaciona 60)
0. EDGE: redeploy de las 6 funciones con su **corto.ts nuevo** (traen el regreso desde Flow; reemplaza el redeploy pendiente de G99/G100).
1. 💳 **Flow** (para que paguen con Webpay débito/crédito, transferencia o MACH): crea tu cuenta en **flow.cl** (persona o empresa) → Mi cuenta → **Integración → API Keys** → copia **API Key** y **Secret Key**.
2. CM → **Pagos** → tarjeta **💳 Webpay con Flow** → pega las 2 llaves → **Conectar en las 7 apps** (todas ✅). Si son de sandbox.flow.cl marca "Son llaves de pruebas".
3. Prueba: en cualquier app → ⭐ Premium → **💳 Webpay** → Pagar con Webpay → paga $ chico con cupón → vuelves a la app y dice 🎉 Pago aprobado (CM recibe "⚡ Pago automático").
4. 🧾 **Factura** (Despega): Ajustes → Boleta SII → llena **Código de actividad** (6 números, sii.cl → Mi SII) → Guardar. En la vitrina, el comprador abre **🧾 Necesito factura** y pone los datos de su empresa → en Pedidos sale "Pide factura" → **Emitir factura SII** (OpenFactura) o **Anotar N° factura SII** (manual). Si el cliente la pide por WhatsApp: Pedidos → **🧾 Dar factura**.

## G104 🧩 Más módulos Billetera y Estaciona · núcleo 3.11 · CM 5.44 · Despega 6.59 · Barbería 3.30 · Billetera 1.21.90 · BiciTaller 3.20 · Estaciona 2.14.96 (bases: CM 4.61 · Despega 5.79 · Barbería 3.09 · Billetera 64 · BiciTaller 2.60 · Estaciona 61; funciones SIN cambio)
0. CM → Apps → **⬆️ Actualizar base** en las 7 → 🚀 Liberar.
1. 💰 **Billetera** → Más: **📤 Cuentas por pagar** (＋ Nueva → proveedor, monto, vence → ✅ Pagar → queda gasto en Caja; el Inicio avisa 3 días antes) · **💵 Cierre de caja** (efectivo con que partiste + lo que contaste → dice si cuadra, sobra o falta) · **🔔 Aviso de vencimiento** (solo: el día antes y el día que vence le llega aviso al cliente que activó "🔔 Avisarme…" en su link).
2. 🅿️ **Estaciona** → Más: **🌙 Tarifa fin de semana y noche** (+20 % sábado/domingo) · **🔁 Clientes frecuentes** (premio % desde la reserva N) · **📅 Cerrar fechas** · **🔔 Lista de espera** (en la ficha ocupada sale "Avísame cuando se libere"; al ponerlo Disponible les llega el aviso).
3. 🎁 Lanzamiento: CM → Apps → **Billetera** → 🧩 → **🎁 Campaña** → marca los 7 módulos → **3 meses** → hasta la fecha que quieras → Guardar. Igual en **Estaciona** (8 módulos). Después se cobran solos.

## G32 e 📲 Tarjeta en el celular · núcleo 3.17 · Despega 6.65 · BiciTaller 3.26 (sin base ni funciones)
1. Android con NFC y la app de cobro instalada (Mercado Pago, SumUp o Klap Tap on Phone; cada una pide su registro).
2. Despega → **Caja** → agrega un producto → **📲 Tarjeta (celular)** → **💵 Cobrar** → sale el monto → elige tu app → **📲 Abrir** → cobra ahí (📋 Copiar el monto) → vuelve → **✅ Se aprobó** → Reporte: 💳 Tarjeta.
3. BiciTaller → Más → **💵 Caja** → ＋ Nueva venta → Cobrar → **📲 Tarjeta (celular)** → igual que arriba.
4. Cancelar no registra nada. En iPhone o PC avisa que funciona en Android con NFC.

## G109 💈 Membresías que se pagan solas · Barbería 3.36 (base: Barbería 3.14; núcleo y funciones SIN cambio)
0. CM → Apps → **⬆️ Actualizar base** en Barbería → 🚀 Liberar.
1. Teléfono 1 (dueño de barbería de prueba): Más → 💳 Links de pago → **⚡ Tu Mercado Pago** conectado · Más → 🔁 Membresías → **+ Nueva membresía** para el cliente de prueba (precio chico, ej. $1.000, 1 mes) → Guardar.
2. Teléfono 2 (ese cliente): Inicio → **🔁 Tu membresía** → **⚡ Pagar sola cada mes** → revisa el correo (el de su Mercado Pago) → Seguir → autoriza la tarjeta → vuelve → sale **⚡ Se paga sola cada mes** + Quitar.
3. Teléfono 1: 🔔 "⚡ Membresía que se paga sola" · en 🔁 Membresías sale **⚡ Se paga sola con tarjeta**. Cuando MP cobre (1 día antes de que venza): +1 mes y entra a la Caja.
4. Teléfono 1 → Editar → **Quitar pago automático** → Sí (o el cliente desde su Inicio). Cambiar el precio o pausarla también lo apaga.

## G108 🔁 Premium y módulos con renovación automática · núcleo 3.16 · CM 5.49 · Despega 6.64 · Barbería 3.35 · Billetera 1.21.95 · BiciTaller 3.25 · Estaciona 2.16 (bases: CM 4.65 · Despega 5.83 · Barbería 3.13 · Billetera 68 · BiciTaller 2.64 · Estaciona 65; funciones SIN cambio)
0. CM → Apps → **⬆️ Actualizar base** en las 7 → 🚀 Liberar. Necesita ⚡ Mercado Pago de CodeFix conectado (CM → Pagos).
1. Teléfono 2 (cuenta de negocio de prueba, cualquier app) → ⭐ Premium → **1 mes** → ⚡ Mercado Pago → marca **🔁 Renovar solo cada mes** → revisa el correo (el de su Mercado Pago) → **🔁 Autorizar en Mercado Pago** → autoriza la tarjeta → vuelve → sale **🔁 ¡Listo!** con la fecha del 1.er cobro.
2. Al cobrar MP (minutos después): 🔔 "✅ Pago aprobado" y Premium +30 días. Tú: 🔔 "🔁 Renovación automática cobrada" y en CM → Pagos → ⚡ Mercado Pago → **🔁 Renovaciones automáticas** sale la persona.
3. Teléfono 2 → ⭐ Premium → arriba **🔁 Se renueva solo cada mes** → **Quitar renovación automática** → Sí → desaparece (lo pagado sigue).
4. Igual con un 🧩 módulo (Más → 🧩 Módulos → uno → 1 mes → 🔁 Renovar solo). 3 meses y 🎁 regalo NO ofrecen renovación (son pagos sueltos).

## G107 💳 Webpay con el Flow de cada negocio · núcleo 3.15 · CM 5.48 · Despega 6.63 · Barbería 3.34 · Billetera 1.21.94 · BiciTaller 3.24 · Estaciona 2.15 (bases: CM 4.64 · Despega 5.82 · Barbería 3.12 · Billetera 67 · BiciTaller 2.63 · Estaciona 64; funciones SIN cambio)
0. CM → Apps → **⬆️ Actualizar base** en las 7 → 🚀 Liberar.
1. Dueño (Barbería, BiciTaller, Estaciona o Despega): donde está **⚡ Tu Mercado Pago** ahora sale debajo **💳 Tu Webpay con Flow** → pega API Key + Secret Key (flow.cl → Mis datos → Integración; marca 🧪 si son de sandbox) → **💳 Conectar** → dice ✅ Activo.
2. Teléfono 2 (cliente): reserva/pedido por pagar → sale **💳 Pagar con Webpay** (y ⚡ Mercado Pago si también está) → paga → vuelve solo → queda confirmado sin comprobante. Dueño recibe 🔔 "💳 … pagado con Webpay".
3. Dueño: desmarca "Cobrar con Webpay" → Guardar → el cliente ya no ve el botón.

## G106 ⚡ Pago automático con tarjeta (Estaciona) · núcleo 3.13 · CM 5.46 · Despega 6.61 · Barbería 3.32 · Billetera 1.21.92 · BiciTaller 3.22 · Estaciona 2.14.98 (bases: CM 4.62 · Despega 5.80 · Barbería 3.10 · Billetera 65 · BiciTaller 2.61 · Estaciona 62; funciones SIN cambio)
0. CM → Apps → **⬆️ Actualizar base** en las 7 → 🚀 Liberar.
1. 🅿️ Teléfono 1 (dueño): Más → 💳 Links de pago → ⚡ Tu Mercado Pago **conectado** (Access Token de producción).
2. Teléfono 2 (quien arrienda): reserva **por mes** confirmada → abre la reserva → tarjeta **⚡ Pagar solo cada mes** → **⚡ Activar pago automático** → confirma el correo de SU Mercado Pago → Seguir → autoriza la tarjeta en MP → vuelve y dice **✅ Activo**.
3. Teléfono 1: llega 🔔 "⚡ Pago automático activado" y en la reserva sale "⚡ Se paga solo cada mes con tarjeta". El cobro se hace solo 2 días antes de terminar el mes → 🔔 "⚡ Mes pagado solo" y la reserva sigue 1 mes más.
4. Teléfono 2: **Quitar** → se apaga en Mercado Pago (el arriendo sigue; el mes siguiente se paga como antes).


## G111 parte 2 · 🧹 Ver cuentas de prueba (no borra nada)
1. Supabase → abre la app (Despega, Barbería, Billetera, BiciTaller, Estaciona, CM; **no** Cerebro) → **SQL Editor** → **New query**.
2. Pega el archivo `nucleo/sql/cuentas_lista.sql` del repo SaaS → **Run**.
3. Pantallazo (o **Export → CSV**) → mándaselo a Claude escribiendo los **n** que se BORRAN (ej. "Despega: 3, 5, 7").
4. Claude arma el SQL de borrado solo con esas cuentas (con respaldo).

## G121 · 📏 ¿Cuánto pesa cada app? (tú, 2 min por app)
1. Supabase → elige la app → **SQL Editor** → **+ New query**.
2. Pega todo `nucleo/sql/peso.sql` (repo SaaS) → **Run**. Solo lee, no cambia nada.
3. Mándame 1 pantallazo por app (las 6). Fila clave: **🗄️ Base total** (% de 500 MB).

## G112 a · 🧹 Sacar Cerebro (tú, 2 min)
1. Cloudflare → **Workers & Pages** → **contenido** → **Settings** → abajo **Delete** → escribe el nombre → **Delete**.
2. (Opcional) Supabase → proyecto de Cerebro → **Project Settings** → **Pause project**. Si ya no entras, no importa.
3. El repo **Contenido** queda guardado en GitHub (no lo borres: nada se pierde). Su motor ya está en CM → 🎬 Estudio.

## G122 b + G128 c · 🧹 Fotos huérfanas · 🏦 Abono por transferencia en BiciTaller · núcleo 3.32 · CM 5.65 bd 4.70 · Despega 6.81 bd 5.90 · Barbería 3.52 bd 3.20 · Billetera 1.21.112 bd 74 · BiciTaller 3.42 bd 2.70 · Estaciona 2.32 bd 72 (funciones SIN cambio)
0. Cloudflare **Listo** en las 6 → CM → Apps → **⬆️ Actualizar base** en las 6 → 🚀 **Liberar todo**.
1. 🧹 No tienes que hacer nada: cuando un dueño entra (1 vez por semana), se borran de Storage SOLO sus fotos de más de 7 días que no estén en ninguna tabla (producto/servicio/oferta/bici borrados). Las que se usan, nunca.
2. 🚲 BiciTaller (taller) → Más → **💳 Abono**: borra el link, llena **🏦 Datos de transferencia**, marca el espacio activo → **💾 Guardar** → se guarda sin error (antes pedía link o MP).
3. Haz una reserva en tu página → en la reserva sale **"🏦 1️⃣ Transfiere $…"** con tus datos + **📋 Copiar datos** + **2️⃣ Subir foto del comprobante**.

## G128 b · ⚠️ Aviso "tus clientes no pueden pagar" · núcleo 3.31 · CM 5.64 · Despega 6.80 · Barbería 3.51 · Billetera 1.21.111 · BiciTaller 3.41 · Estaciona 2.31 bd 71 (funciones SIN cambio)
0. Cloudflare Listo → CM → Apps → 🅿️ Estaciona → ⬆️ Actualizar base (debe quedar 71) → 🚀 Liberar todo.
1. 💈 Barbería (dueño): Más → 💳 Links de pago → borra link y datos de banco (con abono > 0) → Inicio: arriba "⚠️ Tus clientes no pueden reservar online" → **Configurar** te lleva a Links de pago. Vuelve a poner tus datos: el aviso se va.
2. 🅿️ Estaciona (dueño): Más → 🚗 Mis estacionamientos: sin link/banco/MP sale "⚠️ Tus arrendatarios no pueden pagar en línea". Con solo 🏦 datos de banco ya no sale, y quien reserva ve "🏦 Transfiere $…" + 📋 Copiar datos.
3. 🚲 BiciTaller (taller): abre una orden de un cliente CON cuenta → botón **💬 Chat** (el mismo chat de Mensajes). Orden sin cuenta: no aparece (queda 📲 WhatsApp y 🔗 enlace).

## G143 · 🔤 Una letra para todas + 🧭 barra igual en las 7 · núcleo 3.39 · CM 5.72 · Despega 6.88 · Barbería 3.59 · Billetera 1.21.119 · BiciTaller 3.49 · Estaciona 2.39 · base y funciones SIN cambio
0. Cloudflare **Listo** en las 6 → CM → Apps → 🚀 **Liberar todo** (no hay que actualizar base).
1. Abre cada app en el teléfono: la barra de abajo se ve IGUAL en todas (íconos del mismo tamaño y centrados; en BiciTaller y Barbería ya no se ven chicos ni corridos).
2. Mi perfil (tu foto) → **🎨 Personalizar** → **Tipo de letra**: toca Montserrat → cambia al tiro toda la app · vuelve a **Inter** (la de fábrica).
3. **Grosor de letra**: Delgada / Normal / Gruesa → ahora SÍ se nota (también en la barra de abajo).
4. **🔤 Tamaño de letra**: mueve hasta 125 % → crece el TEXTO (no la pantalla entera) y nada se sale del ancho.
5. Abre la misma app en otro teléfono con tu cuenta → queda tu letra.

## G142 · 🎁 Prueba de módulos uniforme + 🚲 Recibir bici completo + 📱 redes por persona + 📲 NFC · núcleo 3.38 · CM 5.71 bd 4.75 · Despega 6.87 bd 5.96 · Barbería 3.58 bd 3.25 · Billetera 1.21.118 bd 79 · BiciTaller 3.48 bd 2.75 · Estaciona 2.38 bd 77 · funciones SIN cambio
0. Cloudflare **Listo** en las 6 → CM → Apps → **⬆️ Actualizar base** en las 6 → 🚀 **Liberar todo**.
1. 🎁 Con una cuenta de dueño NUEVA (correo que nunca probó módulos), en cada app: Más → 🧩 Módulos → toca **▶️ Ver demo** de un módulo → arriba sale **🎁 Probar 7 días gratis** (sin bajar) → tócalo → queda activo 7 días.
2. Con tu correo de siempre (ya probaste): la hoja ahora DICE "⌛ Ya usaste tu prueba gratis de este módulo con este correo" (antes el botón desaparecía sin aviso: por eso no lo veías).
3. 💈 Barbería (dueño Free): toca algo ⭐ de un módulo (ej. Clientes que no vuelven) → sale **🎁 Probar Clientes que no vuelven 7 días gratis** además de ⭐ Ver Premium.
4. 🚲 BiciTaller → Hoy → **🚲 Recibir bici · Nueva orden**: nombre, WhatsApp, correo (opcional) → en **Bici** escribe "tre ma" → toca **Trek Marlin 5**.
5. Baja a **📋 Ingreso completo**: aro, talla, grupo, color (todos sugieren al escribir) · toca lo que **Trae** (Luces, Candado…) · toca cada parte en **Cómo llega** (⬜ → ✅ → 🔧 → ⚠️, vibra) · **N° de serie**: 📷 Escanear (Android) o 📸 Leer con foto · **📷 Sacar foto** (hasta 4) · el cliente **firma con el dedo** → **✅ Recibir bici**.
6. En la orden sale la tarjeta **📋 Ingreso de la bici** (✏️ Editar) y **🧾 Orden de trabajo** → **🖨️ Imprimir / PDF** o **📤 Compartir** con el cliente.
7. Más → **🧾 Órdenes y presupuestos**: botones 🚲 Recibir bici / 💰 Presupuesto y la lista de bicis en el taller (toca una = abre).
8. 👤 Cliente sin cuenta: crea una orden con el correo de alguien que NO tiene cuenta → esa persona se registra en tu link con ESE correo y lo **confirma** → en su app ve su bici y la orden. (Sin confirmar el correo no se asocia nada.)
9. 📱 Barbería (dueño o barbero): Más → ⚙️ Ajustes → Cuenta y ayuda → **📱 Mis redes personales** → pega tu Instagram → 💾 → abre el link /b/ de la barbería: en "Nuestro equipo" sale tu ícono bajo tu nombre. (BiciTaller: igual para el dueño y mecánicos.)
10. 🧾 Cualquier comprobante de venta: abajo dice "Síguenos: Instagram @…" con las redes del negocio (Más → Mis redes).
11. 📲 BiciTaller (Android con Chrome): Más → 🪪 Pasaportes → abre uno → **📲 Grabar etiqueta NFC** → acerca una etiqueta NFC (NTAG213, ~$300 c/u) → al acercar otro teléfono abre el pasaporte.

## G141 · 📱 Mis redes + 🎬 Estudio por link · núcleo 3.37 · CM 5.70 bd 4.74 · Despega 6.86 bd 5.95 · Barbería 3.57 bd 3.24 · Billetera 1.21.117 bd 78 · BiciTaller 3.47 bd 2.74 · Estaciona 2.37 bd 76 · funciones SIN cambio
0. Cloudflare **Listo** en las 6 → CM → Apps → **⬆️ Actualizar base** en las 6 → 🚀 **Liberar todo**.
1. 💈 Barbería (dueño): Más → **📱 Mis redes** → pega el link de tu Instagram (cópialo desde Instagram → tu perfil → Compartir perfil) → sale "Instagram · @tu_usuario ✓" → **➕ Agregar** → igual con TikTok → **💾 Guardar mis redes**.
2. Abre tu link de reservas (/b/?b=…): bajo el nombre salen los íconos; tócalos → abren tu perfil.
3. Repite en 🚀 Despega (Más → 🔗 Mis redes → mira /t/ de tu tienda), 🚲 BiciTaller (/t/), 💰 Billetera (link de un cliente) y 🅿️ Estaciona (ficha de tu estacionamiento).
4. 🎬 Estudio (cualquier app con el módulo o probándolo): si no tienes base → **💡 ¿No sabes qué publicar?** → escribe qué vendes → **✨ Dame ideas ahora** → sale la idea con sus cajas 📋.
5. 📊 **Qué funciona** → **🔗 Anotar publicación por link** → pega el link de un reel/TikTok tuyo (sale la red y la fecha) → **📸 Leer pantallazo** → elige el pantallazo de sus Estadísticas (la 1.ª vez demora ~10 s) → los números quedan en verde → corrige si alguno no calza → 💾.
6. Con 5 o más anotadas: cifras, 📈 línea semanal, barras y **🧭 Qué hacer ahora**. Toca una barra: abajo sale su detalle.

## G140 · 🎨 Personalizar · núcleo 3.36 · CM 5.69 bd 4.73 · Despega 6.85 bd 5.94 · Barbería 3.56 bd 3.23 · Billetera 1.21.116 bd 77 · BiciTaller 3.46 bd 2.73 · Estaciona 2.36 bd 75 (funciones SIN cambio)
0. Cloudflare **Listo** en las 6 → CM → Apps → **⬆️ Actualizar base** en las 6 → 🚀 **Liberar todo**.
1. En el celular, cualquier app → Más → **Mi perfil** → **🎨 Personalizar**: arriba **Temas listos** → toca **Océano**: cambia el fondo al tiro.
2. Baja a **Barra de abajo**: toca **Flotante**, **Solo íconos**, **Píldora** y **Grande** → la vista previa y la barra real cambian.
3. **✏️ Nombre de cada botón** → cambia "Inicio" por "Casa" → la barra dice "Casa"; **↺** lo devuelve.
4. Entra con la MISMA cuenta en otro celular (o el computador) → queda igual (se guarda en tu cuenta).
5. Abajo **↩️ Volver todo a lo de fábrica** → todo como antes (el color de la app y el modo quedan).

## G139 · 🛒 Pagar antes del pedido · núcleo 3.35 · CM 5.68 · Despega 6.84 bd 5.93 · Barbería 3.55 · Billetera 1.21.115 · BiciTaller 3.45 · Estaciona 2.35 (solo Despega cambia base; funciones SIN cambio)
0. Cloudflare **Listo** en las 6 → CM → Apps → 🛒 Despega → **⬆️ Actualizar base** (debe quedar 5.93) → 🚀 **Liberar todo**.
1. Con tu cuenta de cliente → tienda → agrega $20.000 → **Pedido**: el botón ahora dice **⚡ Pagar $20.000** y abajo "Pagas primero…". Tócalo → se abre **Mercado Pago** al tiro (paga algo chico con cupón si quieres probar real).
2. Al pagar → a la tienda le llega 🔔 **"💳 Pagado: prepara el pedido de …"** (antes de pagar NO le llega nada).
3. Tienda → **Pedidos** → el pedido → **✅ Listo** → aparece **📲 Avisar: ✅ listo** → abre WhatsApp con el mensaje listo. (Despacho: 🚚 En camino igual.)
4. Si la tienda solo tiene 🏦 transferencia: el cliente ve "🏦 Pagar todo ahora · por transferencia" y el dueño ve "⚠️ Sin ⚡ Mercado Pago ni 💳 Webpay → Configurar".

## G138 · 🐞 Errores de Josué 21/11 · núcleo 3.34 · CM 5.67 bd 4.72 · Despega 6.83 bd 5.92 · Barbería 3.54 bd 3.22 · Billetera 1.21.114 bd 76 · BiciTaller 3.44 bd 2.72 · Estaciona 2.34 bd 74 (funciones SIN cambio)
0. Cloudflare **Listo** en las 6 → CM → Apps → **⬆️ Actualizar base** en las 6 → 🚀 **Liberar todo** (cubre también G131 b). En el celular: cierra y abre la app (o Más → Reparar la app).
1. Despega → **Chat** → abre un chat → toca el campo y escribe 2 líneas: el 🎙️ queda **dentro**, en la esquina de abajo a la derecha. La cabecera (Mensajes) **no se sube**; la barra de abajo se esconde mientras escribes y vuelve al cerrar el teclado.
2. Con tu cuenta de cliente Premium → Cuenta → **Mi Caja** → Reporte y Finanzas: abajo ya **no** sale "Cuenta y ayuda".
3. Tienda → carrito largo (**🛒 Mi pedido**) → baja: el título queda pegado bajo las pestañas, con fondo y color, sin mezclarse con "Total".
4. Más → ⚙️ Ajustes → **🐞 Reportar una falla**: envía 2 seguidos → el 2.º dice "Espera 1 minuto"; al minuto, pasa (hasta 30 al día).

## G131 b · 🖼️ Fotos de cuentas borradas · núcleo 3.33 · CM 5.66 bd 4.71 · Despega 6.82 bd 5.91 · Barbería 3.53 bd 3.21 · Billetera 1.21.113 bd 75 · BiciTaller 3.43 bd 2.71 · Estaciona 2.33 bd 73 (funciones SIN cambio)
0. Cloudflare **Listo** en las 6 → CM → Apps → **⬆️ Actualizar base** en las 6 → 🚀 **Liberar todo**.
1. CM → **Apps** → una app → **🧹 Respaldo y limpieza** → en **2. Limpieza** aparece **🖼️ Fotos de cuentas borradas · N por borrar** (sin 🌙: solo a mano).
2. Si N > 0 → **Borrar** → dice "N fotos borradas". Las fotos que algo aún usa (otra fila, un respaldo) se quedan.

## G129–G131 · 🐞 Errores de Josué · núcleo 3.30 · CM 5.63 · Despega 6.79 · Barbería 3.50 · Billetera 1.21.110 · BiciTaller 3.40 · Estaciona 2.30 (bases y funciones SIN cambio; mismo 🚀 Liberar que G128)
1. **G129** Estaciona → **Más → 🧩 Módulos** (celular): la tarjeta **⭐ Más elegido** se ve normal (etiqueta horizontal, chips abajo del texto, precio en una línea, Ver demo / Comprar bajo el precio).
2. **G130** Billetera → **Más**: las pestañas terminan en **⚙️ Ajustes** (ya no existe "Cuenta y ayuda"). Desliza a ⚙️ Ajustes: al final están 💬 Chat con soporte, 🐞 Reportar una falla, 📄 Términos, 🔒 Privacidad, 🗂️ Mis datos y 🚪 Cerrar sesión (último).
3. Billetera → Más → **Billeteras conectadas** (o Comprobantes, Reportes): abajo YA NO sale "Cuenta y ayuda". Repite el paso 2 en Barbería y Estaciona: ahora sí aparece 💬 **Chat con soporte** en ⚙️ Ajustes.
4. **G131** Mándame pantallazo de **CM → Control → 🩺 Salud** (errores de las 6). Si no se ve completo: Supabase de cada app → **SQL Editor** → Run: `select veces, ultimo::date, version, left(mensaje,120) mensaje, left(donde,80) donde, left(pagina,60) pagina from cfx_errores order by ultimo desc limit 30;` → pantallazo del resultado.

## G128 · 🛒 Cobro de pedidos · núcleo 3.29 · CM 5.62 bd 4.69 · Despega 6.78 bd 5.89 · Barbería 3.49 bd 3.19 · Billetera 1.21.109 bd 73 · BiciTaller 3.39 bd 2.69 · Estaciona 2.29 bd 70 (funciones SIN cambio)
0. Cloudflare **Listo** en las 6 → CM → Apps → **⬆️ Actualizar base** en las 6 → 🚀 **Liberar todo**.
1. ✅ (19/11: tu tienda **codefix** tiene ⚡ Mercado Pago y no tiene 🏦 transferencia → el paso 2 no muestra el aviso; sáltalo o pon transferencia para probarlo) **Tu tienda de prueba: ¿qué medio tiene?** Supabase de Despega → **SQL Editor** → pega y **Run**: `select empresa, slug, coalesce(trim(datos_pago),'') <> '' transferencia, public.link_activo(id,'pedido') medios from profiles where role='user';` → si `medios` sale vacío, tus clientes hoy "💰 Pagan al retirar".
2. Despega → **Hoy**: sin medio sale **⚠️ Tus clientes no pueden pagar en línea → Configurar**. Pon tus datos de 🏦 transferencia (Ajustes → Mi tienda) → el aviso se va.
3. **Caja** → un producto → **🛒 Venta online** → elige 💵 **Abono** 30 % → Guardar. Otro → 🛠️ **Servicio** + 💰 **Pagar al retirar**. Otro → 🔑 **Acceso digital** + escribe un link → Guardar.
4. Abre tu tienda (/t/) en incógnito → agrega el del abono → **💳 ¿Cómo pagas?** muestra ⚡ Todo ahora / 💵 Abono → elige Abono → Enviar → en /r/ sale **💵 Paga tu abono** + **📋 Copiar enlace / 📲 Mandarme por WhatsApp**.
5. Sube un pantallazo como comprobante → Despega → **Pedidos** → **✅ Aprobar pago** → dice "💵 Abono pagado · 💰 cobra $X al entregar". Pedido sin cuenta: **📲 Enviar enlace al cliente**.
6. Compra el 🔑 acceso digital → apruébalo → en /r/ aparece **🔑 Tu acceso** (antes no se ve).
7. Con cuenta de cliente: Mis pedidos → **💬 Chat del pedido** → escribe → en Pedidos de la tienda aparece **💬 Chat del pedido (1)**. (No sale en Mensajes; se borra 7 días después de cerrar.)
8. 🧾 Boleta: sale sola si tienes OpenFactura automática (Ajustes → Boleta SII); si no, en el pedido pagado está **🧾 Emitir / Anotar N°**. Con abono, sale al entregar (por el total).

## G123 · 🎬 Estudio: 🔄 Cambiar todo + Espacio por app · núcleo 3.28 · CM 5.61 · Despega 6.77 · Barbería 3.48 · Billetera 1.21.108 · BiciTaller 3.38 · Estaciona 2.28 (bases y funciones SIN cambio; va junto con G122: un solo Liberar)
1. CM → Cerebro → 🎬 Estudio → **🎯 Espacio** → **📱 App**: elige Despega → **✨ Base de fábrica** → dice "✨ N filas sumadas".
2. **💡 Idea** → ✨ Generar idea → en ✍️ Copy y #️⃣ Hashtags toca **🔄 Otra** (cambian) → abajo **🔄 Cambiar todo** (cambia todo de una vez).
3. Con la idea abierta, cambia el Espacio en la caja ▾ → sale otra idea de ese espacio.
4. En una app con el módulo 🎬 (ej. Barbería → Más → Estudio): mismos 🔄.

## G122 · 🖼️ Fotos a Storage · núcleo 3.27 · CM 5.60 bd 4.68 · Despega 6.76 bd 5.88 · Barbería 3.47 bd 3.18 · Billetera 1.21.107 bd 72 · BiciTaller 3.37 bd 2.68 · Estaciona 2.27 bd 69 (funciones SIN cambio)
0. Cloudflare **Listo** en las 6 → CM → Apps → **⬆️ Actualizar base** en las 6 → 🚀 **Liberar todo**. (La base crea sola el almacén público **vitrina** en Storage de cada app.)
1. Despega → **Caja** → un producto → **📷 foto** → Guardar → abre tu catálogo: la foto se ve. (Supabase de Despega → **Storage** → **vitrina**: aparece el archivo.)
2. Barbería → ⋯ Más → **Servicios** (o Portafolio / Ofertas / Portada) → sube una foto → Guardar → se ve en tu página.
3. BiciTaller → Bicis usadas → una con foto → Guardar → se ve en su página.
4. Las fotos viejas pasan solas: cada vez que el dueño entra, 10 fotos viejas se mudan a Storage (se siguen viendo igual). Comprobantes y carnet NO van ahí (siguen privados).
5. En 1 semana: pega `nucleo/sql/peso.sql` (G121) → **🖼️ Fotos dentro de la base** debe bajar.

## G118 · 📊 Planilla de carga masiva · núcleo 3.26 · CM 5.59 · Despega 6.75 bd 5.87 · Barbería 3.46 · Billetera 1.21.105 · BiciTaller 3.36 · Estaciona 2.26 (va junto con G117: un solo Liberar)
0. CM → Apps → Despega → **⬆️ Actualizar base** (5.87) → Cloudflare **Listo** en las 6 → CM → Apps → 🚀 **Liberar todo**.
1. Despega → **Caja** → **Productos** → arriba **📊 Planilla única** → **⬇️ Descargar planilla** (Excel con ejemplos de tu rubro).
2. Ábrela en Excel o Google Sheets, cambia/agrega 2 productos (uno con el mismo nombre de uno que ya tienes) → guarda → **⬆️ Subir planilla** → dice **🆕 Se crean 1 · 🔄 se actualizan 1** → **✅ Confirmar**.
3. Escribe una letra en un precio y súbela: sale **⚠️ 1 con error · Fila N: precio…** y esa fila no se carga.
4. **🤖 Pídele a Claude** → **📋 Copiar texto** → pégalo aquí en Claude con tu lista → pega la respuesta en el cuadro → **👀 Ver qué se carga**.
5. Barbería y BiciTaller → ⋯ Más → **Servicios** → abajo **📊 Cargar o actualizar muchos** (igual). Billetera → **Clientes** → abajo **📊 Cargar muchos clientes** (marca la autorización; los que ya están no se tocan).

## G117 · 🗂️ Ajustes ordenados (horario y datos de banco) · va junto con G118 (solo Despega cambia base: 5.87)
1. Ya hecho en G118 paso 0.
2. Despega → ⋯ Más → **Mi tienda**: el horario sale por días. **⚡ Rápido** = Lun a Vie, Sáb y Dom; **📅 Día por día** = cada día; **＋ colación** agrega un 2.º tramo. Abajo dice **👀 Así lo ven tus clientes**. Si tu horario estaba escrito raro, sale tal cual con **📅 Pasar a días** (no se pierde si no lo tocas).
3. Mismo lugar, **Datos para transferencia**: banco (lista), tipo, N°, RUT (✅ si está bien), nombre y correo. Tus datos viejos salen arriba y los campos ya vienen llenos: revisa y toca **Guardar mi tienda**.
4. Barbería → ⋯ Más → **💳 Links de pago** → datos de transferencia por campos → **Guardar**.
5. Estaciona → ⋯ Más → **💳 Links de pago** → en un espacio toca **🏦 Escribir datos de banco por campos** → llena → **Guardar espacio**. (✏️ Volver a texto libre si lo usas para otra cosa.)
6. Teléfono 2 (cliente): en el pedido (Despega) o la reserva (Estaciona) sale **📋 Copiar todo / Copiar datos**.

## G116 · 🎨 Menú Más y pie iguales · núcleo 3.23 · CM 5.56 · Despega 6.72 · Barbería 3.43 · Billetera 1.21.102 · BiciTaller 3.33 · Estaciona 2.23 (bases y funciones SIN cambio)
1. Cloudflare → **Listo** en las 6 apps → CM → **Apps** → 🚀 **Liberar todo**.
2. En el teléfono, en cada app: toca **⋯ Más** (abajo a la derecha): abre **Ajustes directo**, sin ventanita. En Barbería y BiciTaller, **Clientes** está arriba en la lista.
3. Despega → ⋯ Más: se ven las opciones (antes salía en blanco), y también **Cupones y sellos** y **Estadísticas**. Desliza con el dedo sobre la lista: pasa a **Tu tienda**, **Vender más**…
4. Baja hasta el final en cualquier pantalla: el pie **© … derechos reservados** queda abajo del todo, sin un hueco grande.
5. Despega → ⋯ Más → **Despacho**: la lista de comunas sube y baja con el dedo sin cerrar la hoja.

## G114 · 🐞 Tablero: mover hacia atrás · núcleo 3.22 · CM 5.55 · Despega 6.71 · Barbería 3.42 · Billetera 1.21.101 · BiciTaller 3.32 · Estaciona 2.22 (bases y funciones SIN cambio)
1. Cloudflare → **Listo** en las 6 apps → CM → **Apps** → 🚀 **Liberar todo**.
2. En el teléfono: CM (tu app personal) → **Tablero** → en una tarea de **En revisión** toca la flecha **←**: pasa a **Haciendo** y sigues en el Tablero. Otra vez **←**: pasa a **Pendiente**.
3. La flecha **→** sigue llevándola hacia adelante. Los botones "Volver" de las apps siguen volviendo.

## G113 · 🎨 Uniformidad · núcleo 3.21 · CM 5.54 · Despega 6.70 · Barbería 3.41 · Billetera 1.21.100 · BiciTaller 3.31 · Estaciona 2.21 (bases y funciones SIN cambio)
1. Cloudflare → **Listo** en las 6 apps → CM → **Apps** → 🚀 **Liberar todo**: el aviso muestra cada app en su fila (nombre + versión).
2. Cualquier app → **Más**: arriba las categorías como pestañas; desliza de lado (una categoría por página).
3. **⇅** (al lado de las pestañas) → ↑ ↓ para ordenar, ✏️ para cambiar el nombre → **Cerrar**. Sale de y vuelve a entrar: sigue igual. "Volver al orden de fábrica" lo deshace.
4. En el computador (pantalla ancha): las opciones del Más salen en tarjetas del mismo tamaño, una al lado de la otra.
5. CM (tu app personal) → **Tablero**: el espacio se elige en la caja (toca ▾ → Cicloservice…), ya no en botones que se salen.

## G112 d · 🎬 Estudio de contenido (módulo) · núcleo 3.20 · CM 5.53 bd 4.67 · Despega 6.69 bd 5.86 · Barbería 3.40 bd 3.17 · Billetera 1.21.99 bd 71 · BiciTaller 3.30 bd 2.67 · Estaciona 2.20 bd 68
1. Cloudflare → **Listo** en las 6 apps. CM → **Apps** → ⬆️ **Actualizar base** en LAS 5 con negocios (y el CM) → 🚀 **Liberar**.
2. Entra como dueño de prueba (cualquier app) → **Más** → 🎬 **Estudio de contenido** → ▶️ **Probar módulo** (7 días gratis).
3. **📚 Base** → ⬇️ **Plantilla** (ábrela en Excel, llénala) → ⬆️ **Subir CSV**, o **＋ Agregar** (tema + texto).
4. **💡 Idea** → ✨ **Generar idea** → salen 8 cajas con 📋 **Copiar** → 💾 **Guardar idea**.
5. **📅 Semana** → toca la idea → pon vistas/clientes → 💾 **Guardar métricas** → **📊 Qué funciona** muestra tus números.
6. CM → Pagos/Módulos: el 🎬 aparece en ⭐ Normal y 💎 Completo.

## G112 c1+c2 · 🔒 Llaves en Vault + 🔄 aviso de cambio · núcleo 3.19 · CM 5.52 · Despega 6.68 · Barbería 3.39 · Billetera 1.21.98 · BiciTaller 3.29 · Estaciona 2.19 (bases: CM 4.66 · Despega 5.85 · Barbería 3.16 · Billetera 70 · BiciTaller 2.66 · Estaciona 67; función "servidor" del CM 3.7)
1. Supabase → proyecto del **CM** → **Edge Functions** → **servidor** → **Code** → borra todo y pega:
   `import 'https://raw.githubusercontent.com/CodeFixService/SaaS/a7745025160300f85131cddd00cf12f36b527e13/supabase/functions/servidor/index.ts';`
   → **Deploy** (Verify JWT APAGADO).
2. Cloudflare → **Listo** en las 6 apps.
3. CM → **Apps** → ⬆️ **Actualizar base** en LAS 6 → 🚀 **Liberar**. Las llaves que ya tenías (Mercado Pago, Flow, Turnstile, GitHub, Cloudflare y las de cada negocio) pasan SOLAS a Vault. No hay que volver a pegarlas.
4. Revisar: Supabase → cualquier app → **Integrations** → **Vault** → **Secrets**: salen con nombre `cfx_…` (ej. `cfx_cfg_mp_token`).
5. Probar: CM → **Pagos** → ⚡ Mercado Pago dice "✓ Activo … · 🔑 fecha". Si una llave tiene más de 1 año sale "🔄 … crea una nueva" → la pegas y **Conectar en todas las apps**.

## G127 ✉️ Billetera: "Error sending confirmation email"
1. CM → Control → ✉️ Correo → botón **Supabase → SMTP** de **Billetera** (o supabase.com → proyecto emprendedor → Authentication → Emails → SMTP Settings).
2. Enable custom SMTP: host `smtp.gmail.com` · puerto `465` · usuario = tu Gmail · clave = contraseña de aplicación de Google · Sender name: Billetera → **Save**.
3. Vuelve a crear la libreta. (Atajo si no quieres correo: Authentication → Sign In / Providers → Email → apagar **Confirm email** → Save: la cuenta entra al tiro.)

