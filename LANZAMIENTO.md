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
3. Packs: 🌱 Básico $1.990 · 🚀 Crecer $2.990 ⭐ Más elegido · 💎 Completo $3.990 (trae los nuevos solo). Anual = 10 meses. Premium −20 %.
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
   - **Qué activa**: ⭐ Premium (negocio o cliente) · 📦 Pack (Básico/Crecer/Completo) · un módulo suelto (solo negocios).
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
