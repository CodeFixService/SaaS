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
- B10 Índices y consultas (quitar los select('*'))
- B11 Carga diferida por pantalla
- B12 Caché inteligente en el service worker
- B13 Medir el tiempo de carga real

## C. Pasar al núcleo (universal)
- C14 Chat con sus reglas (3 seguidos, 100 al día, bloquear, reportar)
- C15 Calificaciones en ambas direcciones
- C16 Cupones y tarjeta de sellos
- C17 Carrito y despacho (tienda.js, despacho.js)
- C18 Auditoría y limpieza automática
- C19 Módulos enchufables que se activan desde el CM

## D. Arranque fácil
- D20 Tienda lista en 5 minutos ✅
- D21 Cargar productos desde foto, Excel o catálogo de WhatsApp
- D22 Plantillas de tienda por rubro
- D23 Barra de progreso de la tienda ✅

## E. Analítica e inteligencia
- E24 Motor en Python con GitHub Actions
- E25 Pestaña Analítica en el CM
- E26 "Qué hacer hoy" para el dueño ✅ G9
- E27 Avisos de clientes en riesgo y productos que no se mueven
- E28 Predicción de stock y ventas
- E29 Segmentos automáticos de clientes + campañas sugeridas

## F. Visual y premium
- F30 Panel con gráficos en vivo
- F31 Animaciones suaves y estados de carga
- F32 Vitrina pública con buen SEO y vista previa al compartir por WhatsApp
- F33 Modo oscuro y temas por rubro

## G. Conexiones
- G34 Pago automático Mercado Pago ✅ G4 (Webpay después)
- G35 Enlaces directos a WhatsApp Business
- G36 Catálogo para Google e Instagram
- G37 API pública y webhooks

## Extras ya hechos (fuera de la lista)
U1-U14 · Reparar la app · variantes + ficha · Te puede gustar · stock por opción · pedido nuevo · fotos WebP · inventario en Caja · equipo con roles · vitrina · boleta SII · respaldo + ping + errores (G8) · rama pruebas · comprobante WhatsApp + push potentes (G10)

## Grupos que siguen (uno por chat)
G11 A4 + A5 + A6 + A9 ✅ · G12 C19 + C14-C16 · G13 C17-C18 + B10-B11 · G14 B12-B13 + D21-22 · G15 E24-E25 + E27 · G16 E28-E29 + F30 · G17 F31-F33 · G18 G35-G37
