# PLAN CodeFix (lista maestra A–G)
Origen: análisis de Órbita del 05/11/2026. Marcar ✅ al terminar. Esta lista manda; el prompt solo la resume.

## A. Base y seguridad
- A0 Versión visible 1.01 + build interno — EN PAUSA
- A1 Legal en el núcleo (Ley 21.719, términos con versión) ✅
- A2 Consentimientos (publicidad aparte) ✅ G6
- A3 Derechos de datos (ver/descargar/corregir/borrar/oponerse) + registro + brechas ✅ G6
- A4 Un solo instalador de base ✅ G11 (Órbita sin schema.sql/cron.sql; CM sin cron.sql; BiciTaller sigue generando instalar.sql desde schema.sql)
- A5 Tablas duplicadas ✅ G11 (Órbita bd 5.30: pagos→cfx_pagos, licenses→cfx_keys, resenas archivada y borrada. cupones/cfx_cupones y messages/cfx_chat NO son dobles: tienda vs Premium y cliente↔tienda vs soporte)
- A6 Una sola función esc ✅ G11 (núcleo 2.47 seguro.js: CFX_ESC, CFX_HTML, CFX_URL; Órbita y núcleo la usan. Falta: copias propias de las otras 6 apps, en su turno)
- A7 Revisión anon/buckets ✅ G7
- A8 Encabezados de seguridad (CSP, frame) ✅ G7
- A9 Docs corregidas ✅ G11 (README/CONFIGURAR → Cloudflare, términos → Ajustes → Zona peligrosa) · Repo privado EN PAUSA (grupo propio)

## B. Velocidad
- B10 Índices y consultas (quitar los select('*')) ✅ G13 (Órbita sin select('*'); índices de lo que corre cada minuto y de las listas)
- B11 Carga diferida por pantalla ✅ G13 (Core.script: el QR se baja al usarlo. ayuda.js medido en G14: ~15 ms con la copia del teléfono → no se parte)
- B12 Caché inteligente en el service worker ✅ G14 (Órbita: actualizar pregunta si cambió cada archivo (304) y las fotos viejas se borran: 1 por producto, máx. 400)
- B13 Medir el tiempo de carga real ✅ G14 (núcleo 2.52: carga.js → cfx_carga_anotar → cfx_cargas; CM → Control → 🩺 Salud → ⚡ Carga)

## C. Pasar al núcleo (universal)
- C14 Chat con sus reglas (3 seguidos, 100 al día, bloquear, reportar) ✅ G12 (núcleo 2.49 chat.sql; Órbita lo usa; las otras apps en su turno)
- C15 Calificaciones en ambas direcciones ✅ G12b (núcleo 2.50 calificaciones.sql; Órbita bd 5.33; las otras apps en su turno)
- C16 Cupones y tarjeta de sellos ✅ G12b (núcleo 2.50 fidelidad.sql: cfx_descuentos + cfx_sellos; Órbita bd 5.33)
- C17 Carrito y despacho (tienda.js, despacho.js) ✅ G13 (núcleo 2.51 carrito.sql + tienda.js/despacho.js opcionales; módulo 🛒 Recordar carrito)
- C18 Auditoría y limpieza automática ✅ G13 (limpieza.sql: una lista + 🌙 automática cada noche; Órbita: un solo registro cfx_registro)
- C19 Módulos enchufables que se activan desde el CM ✅ G12 (modulos.sql + CM → Mis aplicaciones → 🧩 Módulos)

## D. Arranque fácil
- D20 Tienda lista en 5 minutos ✅
- D21 Cargar productos desde foto, Excel o catálogo de WhatsApp ✅ G14 (Órbita Caja → Productos → 📥; CFX_RESPALDO.leer/csv del núcleo lee .xlsx y CSV)
- D22 Plantillas de tienda por rubro ✅ G14 (Core.plantilla(rubro): productos de ejemplo por rubro, se revisan antes de agregar)
- D23 Barra de progreso de la tienda ✅

## E. Analítica e inteligencia
- E24 Motor en Python con GitHub Actions ✅ G15 (SaaS analisis.yml + analisis/analisis.py cada noche en las 7 bases; núcleo 2.54 analisis.sql)
- E25 Pestaña Analítica en el CM ✅ G15 (CM → Más → 📊 Analítica; "Análisis nocturno" en 🩺 Salud)
- E26 "Qué hacer hoy" para el dueño ✅ G9
- E27 Avisos de clientes en riesgo y productos que no se mueven ✅ G15 (Órbita → Hoy → 🔎 Para vender más + tareas en ✅ Qué hacer hoy; módulo 🔎 en el CM)
- E28 Predicción de stock y ventas ✅ G16 (analisis.py: ritmo del stock + venta online → ⏳ Se acaba pronto en Hoy y Estadísticas; 🔮 venta estimada de la semana)
- E29 Segmentos automáticos de clientes + campañas sugeridas ✅ G16 (Pedidos → Estadísticas → 👥 Tus clientes: VIP, frecuentes, nuevos, en riesgo, perdidos + cupón cfx_descuentos y WhatsApp)

## F. Visual y premium
- F30 Panel con gráficos en vivo ✅ G16 (Órbita → Pedidos → Estadísticas: hoy en vivo cada 30 s, ventas por día y por hora)
- F31 Animaciones suaves y estados de carga ✅ G17 (vitrina: tarjetas esqueleto y marco con brillo para fotos; animación solo la 1ª vez; Pedidos con esqueleto)
- F32 Vitrina pública con buen SEO y vista previa al compartir por WhatsApp ✅ G17 (worker.js en /t/*: título, og:*, schema.org; /t/og = logo o foto; link por producto ?p= con 🔗)
- F33 Modo oscuro y temas por rubro ✅ G17 (claro/oscuro/auto en Mi perfil; color por rubro si no eligió; marca oscura se aclara en modo oscuro)

## G. Conexiones
- G34 Pago automático Mercado Pago ✅ G4 (Webpay después)
- G35 Enlaces directos a WhatsApp Business
- G36 Catálogo para Google e Instagram
- G37 API pública y webhooks

## Extras ya hechos (fuera de la lista)
U1-U14 · Reparar la app · variantes + ficha · Te puede gustar · stock por opción · pedido nuevo · fotos WebP · inventario en Caja · equipo con roles · vitrina · boleta SII · respaldo + ping + errores (G8) · rama pruebas · comprobante WhatsApp + push potentes (G10)

## Grupos que siguen (uno por chat)
G11 A4 + A5 + A6 + A9 ✅ · G12 C19 + C14 ✅ · G12b C15-C16 ✅ · G13 C17-C18 + B10-B11 ✅ · G14 B12-B13 + D21-22 ✅ · G15 E24-E25 + E27 ✅ · G16 E28-E29 + F30 ✅ · G17 F31-F33 ✅ · G18 G35-G37

## Antes de lanzar (cuando Josué diga "listo")
- LIMPIEZA FINAL: dejar TODOS los usuarios (auth + perfil + plan) pero sin datos: productos, opciones/stock, fotos de buckets, diseño/tienda, pedidos, ventas, clientes, promociones, comprobantes. Primero un SQL que solo cuenta por usuario; luego el borrado.
