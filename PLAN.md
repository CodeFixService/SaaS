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
- G35 Enlaces directos a WhatsApp Business ✅ G18 (Ajustes → 📲: link, bienvenida, respuesta rápida y wa.me para la bio; vitrina y ficha con mensaje listo)
- G36 Catálogo para Google e Instagram ✅ G18 (/t/feed?s= RSS g:* para Merchant Center y Meta; &f=json; caché de Cloudflare 1 h)
- G37 API pública y webhooks ✅ G18 (Pro: POST firmado HMAC por pedido nuevo/cambio de estado, cola con reintentos; lectura = feed JSON; docs/webhooks.md)

## Extras ya hechos (fuera de la lista)
U1-U14 · Reparar la app · variantes + ficha · Te puede gustar · stock por opción · pedido nuevo · fotos WebP · inventario en Caja · equipo con roles · vitrina · boleta SII · respaldo + ping + errores (G8) · rama pruebas · comprobante WhatsApp + push potentes (G10)

## Grupos que siguen (uno por chat)
G11 A4 + A5 + A6 + A9 ✅ · G12 C19 + C14 ✅ · G12b C15-C16 ✅ · G13 C17-C18 + B10-B11 ✅ · G14 B12-B13 + D21-22 ✅ · G15 E24-E25 + E27 ✅ · G16 E28-E29 + F30 ✅ · G17 F31-F33 ✅ · G18 G35-G37 ✅ · G19 🧩 módulos de pago por negocio ✅ (Órbita + CM; las otras apps en su turno)

## Ideas nuevas (anotadas 10/11/2026)
- 🧠 Cerebro como MÓDULO del Centro de Mando (solo para Josué, en el panel): explico un video y genera ganchos visuales que retengan. NO recuperar la app Cerebro aparte. Cambiar la temática → verlo en otro chat.
- Revisión global de la tienda en celular ✅ (núcleo 2.56, Órbita 5.94, CM 4.79; receta en MEMORIA → "Revisión celular de la tienda": pruebas/celular.js). Replicar en cada app en su turno.

## G20 · Tienda (Órbita) a fondo, luego lo mismo en las otras apps (anotado 10/11/2026) · núcleo 2.57 · Órbita 5.95 (bd 5.40) · CM 4.80 (bd 4.26)
- H1 Bootstrap 5.3.8 global (solo utilidades, vendor/; el grid choca con .row) + orillas parejas, difuminado que no tapa, íconos solos redondos, texto largo bajo el botón ✅
- H2 🔔 Campana (núcleo): ventana de avisos (deslizar = borrar, tocar = completo con ‹ ›). Globito arreglado: sumaba "Lo que me falta" (tareas de la guía) ✅
- H3 Deslizar el dedo a izquierda/derecha cambia de pestaña (núcleo barra.js) ✅
- H4 Caja: 🎤 venta por voz en la misma pantalla (núcleo voz.js CFX_PEDIDO + analisis.py "voz") ✅
- H5 CM parte en el Panel + Control → 🏪 Negocios (por app: +1 mes / +3 meses / +1 año / quitar / 🔑 key) ✅ (Órbita; las otras apps: ganchos en su turno)
- H6 🧪 Probar abre "limpio" (?cfx-limpio: borra caché y service worker; incógnito real no se puede abrir desde una página) ✅
- H7 Limpieza: docs/REQUISITOS.md (viejo) borrado ✅ · LIMPIEZA FINAL lista en Aplicaciones/supabase/limpieza/ (1_contar.sql → 2_borrar.sql) — la corre Josué
- Regla nueva: CM va directo a main (sin rama pruebas). Órbita sigue con pruebas.
- Barbería 2.72 ✅ (campana, 🏪 ganchos, 🎤 dictar hora y corte, celular 320, limpieza) · Sigue: BiciTaller → Billetera → Estaciona, una a la vez (núcleo 2.57 + G20 + receta "Revisión celular").

## G23 · Lanzamiento de la tienda ✅ (núcleo 2.58 · Órbita 5.97 bd 5.41 · CM 4.82 bd 4.27)
- 📄 Políticas (Ley 19.496) ✅ · 📦 Despacho a todo Chile ✅ · ✉️ Correo al comprador ✅ · 🚚 Código de seguimiento ✅ · 📊 Medir anuncios 🧩 ✅ · 🌐 Dominio propio 🧩 ✅ · Boleta automática "beta" ✅
- DESPUÉS: Khipu/Flow/Webpay · courier con etiquetas · stock con Mercado Libre · factura 33 · gift cards · sucursales · suscripciones.
- Configuración paso a paso: SaaS/LANZAMIENTO.md
## G24 · Validar G23 + arreglos antes de 🚀 (anotado 10/11/2026) — desde 10/11 TODO va directo a main (Josué prueba con CM → Apps → 🧹 Limpiar y abrir; si falla, se revierte el commit)
- B1 ✅ (G25: base 5.41/5.42, guardar→recargar→sigue) (probable causa: ⚡ lee instalar.sql de main, que estaba en 5.40; con Órbita en main ya debería quedar en 5.41 → VERIFICAR) Despacho "Resto de Chile" vuelve a "No despacho" al guardar (Josué hizo ⚡). Revisar: ¿db_version de pruebas = 5.41? (⚡ podría leer instalar.sql de main, que sigue en 5.40). Arreglar y probar como Josué: dueño guarda → recarga → sigue.
- B2 ✅ (G25: FAQ + nota en Despacho) No ve 🚚 Seguimiento: sale solo en Pedidos con un pedido CON despacho. Dejar pedido de ejemplo / explicarlo en la ayuda.
- B3 ✅ (G25: link → n/?ref, la raíz no deja registrarse) Invita y gana: el link de invitado pide iniciar sesión (antes entraba). Revisar.
- M1 ✅ (G25: Mi plan y módulos en una hoja, Free/Pro + módulos, sin 🎁 gratis; núcleo 2.59 · Órbita 5.98) ▶️ Probar = demo animada + 🎁 prueba + Comprar + ✕/Cerrar; candado en chat/cupones/stats/equipo/sellos/redes/campañas; botones en una línea; precio de Mi plan sin cortar. Falta: separar Free/Pro del listado. · 🧩 Módulos: separar Free / Pro (lo básico del negocio) de los módulos (aparte, siempre visibles). Sin el módulo: "Probar" muestra una DEMO visual con datos de ejemplo (no usa su negocio) + Comprar.
- M2 ✅ (G28: núcleo 2.63 · CM 4.88 · Órbita 6.03 · Barbería 2.78; prueba pruebas/g28_link.js) 💳 Un solo link de pago ABIERTO (sin monto) para todo (Premium, módulos, packs): la pantalla muestra el monto con 📋 Copiar y guía "pega el monto y paga" + comprobante. Reemplaza los links de monto fijo (seguir aceptándolos si existen).
- M3 ✅ (código G29: CM 4.89 · Órbita 6.04 bd 5.43; prueba pruebas/g29_dominio.js · falta Josué: dominio + pasos Cloudflare en LANZAMIENTO.md §5) 🌐 Dominio: Josué compra UN dominio en Cloudflare para todas las apps (subdominios por app). Dominio del negocio: pega su dominio + pasos claros de DNS (CNAME) y llega directo a su tienda (web/PWA). Revisar si se automatiza con Cloudflare for SaaS (custom hostnames) o queda manual.
- L1 🧹 LIMPIEZA FINAL con aviso: borrar productos/perfiles/datos de todas las cuentas menos admins; a los antiguos, aviso "Migramos a una versión nueva: vuelve a cargar tus productos" + guía; a los nuevos, guía "Tu negocio en 5 minutos" (crear cuenta, links de pago, despacho, políticas).
- T1 ✅ 🧹 CM → Apps → Limpiar y abrir (núcleo 2.60 carga.js ?cfx-cero: caché, SW, localStorage, sessionStorage, IndexedDB y cookies) · Barbería: faltaba wrangler.jsonc (ramas ≠ main fallaban al compilar).
- G26 ✅ CM 4.86: 🧹 Limpiar y abrir pasa a Resumen → Empresas (tarjeta y detalle de cada app; el CM sigue con "Ver app"). Ramas de prueba APAGADAS (admin/apps.js RAMAS_PRUEBA=false; prender con true al terminar todas las apps). central.js 132 ok.
- B4 ✅ 🧾 (G25, Josué) Boleta de COMPRA del pedido online: hoy hay 3 cosas sueltas (Comprobante de venta por WhatsApp en Caja/Pedidos, Boleta SII manual/OpenFactura, detalle del pedido). Unir en Pedidos: al quedar pagado se genera solo el "🧾 Detalle de compra" (cliente lo ve en Mis pedidos, se le avisa, 📤 compartir/🖨️) y si hay Boleta SII el folio va en ese mismo detalle. Caja (venta en el local) sigue con su comprobante. Legal: sin folio SII no es boleta → decir "Detalle de compra".
- B5 ✅ 🌐 (G25) Dominio propio escondido en Ajustes → Vender en redes: sacarlo a su propia fila "🌐 Mi dominio" en Tu tienda (y "Mi link" en Hoy). Con M3.
- M4 ✅ 🗂️ (G25) Agrupar Ajustes: Tu tienda (Mi tienda+políticas, 💳 Pagos, 🚚 Despacho, 🧾 Boletas, 🌐 Mi dominio, 🧑‍🍳 Equipo) · Vender más (📲 Redes, 📊 Medir anuncios) · Tu plan (Mi plan + 🧩 Módulos en una sola hoja, con M1).
- R1 ✅ ⏰ (G25) Renovación obligatoria: Órbita bd 5.42, todo Pro vence por fecha (sin permanente); módulos ya vencían. Falta revisar lo mismo en las otras apps cuando se retomen.
- REGLA (G25, Josué): módulos 100% independientes (revisado: hoy ninguno depende de otro) y ultra intuitivo: en cada pantalla, qué está pasando + siguiente paso. Revisarlo en la pasada celular.
- Luego: celular.js 320/360 claro/oscuro de todo G23, central.js, y recién ahí 🚀.
- G27 ✅ núcleo 2.62 · Órbita 6.02 · CM 4.87 · Barbería 2.77 (sin SQL):
  - S1 👆 Deslizar: el gesto mueve SOLO el menú tocado (barra.js). Dedo en un menú que se corre → se corre él; que cabe → pestaña vecina de ESE menú. Dedo en la página → solo el menú principal (nav.tabs.sub / [role=tablist]); nunca Día/7 días/30 días. Causa extra: la pestañita ⌄ de la cuenta tapaba la orilla derecha del menú (ayuda.js la achica). tema.css: overscroll-behavior-x: contain en todos los menús. Prueba: pruebas/g27_deslizar.js (320/360, dedo real por CDP).
  - S2 🎤 Micrófono: voz.js lo pone DENTRO de la página junto al campo (absoluto, z-index 2): se va con el campo, queda bajo cabecera/menú/barra y sale de la página al apagarse. Mismo voz.js en todos los campos. Prueba: pruebas/g27_micro.js.
- G28 ✅ M2 💳 link abierto: ya funcionaba en pagos.js (c.link = link general); faltaba dejarlo claro. CM → Pagos: "🔗 Link de pago abierto" primero; links de monto fijo dentro de "Links con monto fijo (opcional)" (se abre solo si hay alguno). CM → Apps → 🧩: links fijos de módulos = opcionales. pagos.js: si un plan no tiene link, no queda botón vacío (aviso). Con descuento Premium el link fijo del módulo no se usa (no calza el monto). cm_pagos.js ya fallaba antes ("l":795 del comprobante, no es de G28).
- G28 ✅ Barbería 2.79: Administración mostraba siempre "La base es 2.73 y la app la 2.78" (comparaba con la versión de la APP). Ahora version.json trae "bd": "2.73" y admin.js compara con bd (como Órbita). Al cambiar SQL en Barbería: subir db_version() Y "bd". Prueba: pruebas/g28_bd_barberia.js.
- G32 (anotado 13/11/2026, Josué) · Boleta y acceso:
  a) ✅ (Órbita 6.06, bd 5.44: Caja → 🧾 Boleta SII tras cobrar y en Reporte → SII; tabla boletas_caja + boleta_caja) 🧾 Emitir boleta DESDE la app: el SII no tiene API pública para su sistema gratuito → se hace con proveedor (OpenFactura ya está como "Automática" beta). Hacer: botón "🧾 Emitir boleta" también en Caja (venta en local/servicio), modo Automática como el principal y guía paso a paso (inicio de actividades → cuenta OpenFactura → API key → listo). Manual queda como respaldo.
  b) ✅ (Ajustes → 🧾 Boletas → ❓ ¿Necesito boleta? y ⚡ Boleta automática paso a paso) 📖 Guía "¿Necesito boleta?": diferencias claras: sin inicio de actividades (vende igual, comprobante, regla G31) · con inicio de actividades (boleta SII: desde la app con Automática o en sii.cl) · pagos con máquina de tarjeta (el voucher puede valer como boleta si la máquina está habilitada para eso: verificar en sii.cl y con el proveedor; efectivo/transferencia sí necesitan boleta). Sin inventar: solo lo comprobado.
  c) ✅ (Órbita 6.07 · núcleo 2.64 bluetooth=(self) · prueba pruebas/g32_impresora.js) 🖨️ Bluetooth: SÍ impresora térmica (Web Bluetooth, Chrome Android/PC; iPhone no) para imprimir la boleta/comprobante. NO máquinas de pago (SumUp/MP Point/Transbank necesitan su app o SDK nativo: no se puede desde la web).
  d) 🔑 Núcleo: iniciar sesión con QR. En PC la pantalla de inicio muestra QR + correo/contraseña; el celular con sesión lo escanea → "¿Entrar en el computador?" → Sí → el PC entra. En celular: solo correo/contraseña (+ "Entrar en un computador" para escanear). Tabla de solicitudes con vencimiento 2 min + Edge Function (genera magic link con service role; nunca la clave en el cliente). Primero Órbita, luego las otras apps.
  e) ⏭️ AL FINAL (mejora de Josué: primero dejar listo lo pendiente) 💳 Cobrar con tarjeta en el celular (NFC "Tap on Phone"): la web NO puede leer tarjetas (Web NFC no lee EMV; requiere app certificada). Hacer: en Caja, pago "💳 Tarjeta (celular)" → botón que abre la app del proveedor que elija el negocio (Klap Tap on Phone, SumUp, Mercado Pago Point Tap; Android con NFC) → vuelve y marca la venta como pagada con tarjeta. Sin comisiones nuestras.
  📌 Decisión 13/11/2026 (Josué): proveedor de boleta = OpenFactura (cada negocio usa SU cuenta y SU API key; CodeFix no cobra extra). Gratis comprobado = boleta manual en sii.cl / app SII (sin API) → queda como opción gratis. NO confirmado que OpenFactura tenga plan gratis: no decirlo en la app; la guía dice "revisa precios en openfactura.cl".
- 📌 REGLA G33 (13/11/2026, Josué): en boleta, pagos, NFC, impresora y demás integraciones, Claude ELIGE la opción más recomendada (más fácil, rápida y con menos pasos para el usuario) y avisa; no dejar varias opciones confusas.
- G33 · ✏️ Nombre nuevo para Órbita (antes de comprar dominio y lanzar): propuesta "Despega" (pyme que avanza, se entiende al tiro). Antes de cambiar: Josué revisa que esté libre en nic.cl (despega.cl) e INAPI (marca, clase 9/42); si no, alternativas "Pymax" o "Véndelo". Cambiar: textos visibles, manifest/íconos, correos, CM, LANZAMIENTO.md. NO cambiar repo, Worker ni Supabase (nombres internos).
  - 13/11 Josué: OK "Despega" si está libre y sin problema legal; si no, "Despega" + apellido (ej. "Despega Pyme"). ⚠️ Riesgo: "Despegar" (Despegar.com) es marca famosa → Josué revisa INAPI clases 35/42 antes de pagar. Un SOLO nombre visible (cliente y negocio ven lo mismo).
  - ✅ DECIDIDO 13/11: nombre "Despega Pyme" (más distinto de "Despegar" = menos riesgo INAPI) · dominio despegapyme.cl (mismo nombre, no confunde). despega.cl estaba libre (no comprar: 1 solo nombre). Falta Josué: confirmar despegapyme.cl libre + INAPI clase 35/42 → comprar.
  - 🔁 CAMBIO 13/11 Josué: "Despega Pyme" = solo NOMBRE visible de Órbita (no dominio). Dominio = UNO universal de CodeFix para todas las apps (Josué elige: codefix.cl si está libre, si no appcodefix.cl) con subdominio por app (despega.<dominio> = Órbita, cm., barberia., billetera., bicitaller., estaciona.). Cada negocio compra SU dominio y lo pega (G29). NO comprar despegapyme.cl.
  - 🌐 Dominio desde el panel (G33 regla: más fácil): .cl solo se compra en nic.cl → Josué compra ahí y en nic.cl → Mis dominios → Servidores DNS pega los 2 de Cloudflare (plan gratis). CM → Control → 🌐 Dominio → "Dominio de CodeFix": pegar despega.cl (+ token API Cloudflare 1 vez, secreto en "servidor") → ✅ se arma solo: Custom Domains de cada Worker (despega.cl = Órbita, cm./barberia./… subdominios), todos los links visibles, QR, correos, compartir y manifest usan el dominio nuevo (cfx_config 'dominio_base' en CM y cada app; vacío = workers.dev como hoy). Checklist ⏳/✅ por paso.
  - Dominio del negocio (G29 ya existe): destino CNAME = tiendas.<dominio_base> automático; con el token, el Custom Hostname del negocio se agrega solo (hoy manual). El cliente ve el dominio del negocio; por dentro pasa por el nuestro.
- G34 · 🧭 Panel universal en el CM: eliminar el panel de administrador DENTRO de cada app (Órbita apps/admin, Barbería, Billetera, BiciTaller, Estaciona; ⛔ Cerebro NO se toca). Primero inventariar qué hace cada uno que el CM no hace y llevarlo al CM → Apps → cada app (ajustes por app) y al lado Resumen/Control; QR de cada app en el CM. Recién cuando todo esté en el CM y probado, quitar el panel de la app (sin perder funciones).
  - 13/11 Josué (G34 detalle): NO borrar el usuario admin ni su clave (se sigue usando en el CM). Solo quitar el ACCESO de la app: si el admin (public.admin_email()) inicia sesión en cualquier app → va directo al CM (panel), nunca a la app ni a su panel interno. Si entra desde el CM, se queda en el CM. Igual en todas las apps (menos Cerebro). Probar: login admin en app → termina en el CM; login negocio → app normal; 🧹 Limpiar y abrir sigue funcionando.
- G35 · 🧩 Módulos en TODAS las apps (menos el CM, que no lleva módulos): Billetera, BiciTaller, Estaciona y Cerebro pasan a núcleo 2.63 con modulos.js (pro_o_modulo/Cuenta.puede), igual que Órbita y Barbería.
  - 13/11 Josué: Barbería sigue CON módulos (ya está en 2.63). ⛔ Cerebro (Contenido): NO tocar nada (Josué perdió acceso a su base). G35 = Billetera, BiciTaller, Estaciona.
- 📌 REGLA G31 (anotado 13/11/2026, Josué): Órbita sirve IGUAL a la pyme sin formalizar (sin RUT de empresa) y a la formalizada: mismas funciones y puede vender igual. Diferencia solo en el comprobante: con datos de boleta (RUT, razón social, giro, dirección) sale completo y con boleta SII; sin RUT sale con el nombre de la tienda, sin RUT y "No es boleta electrónica". Nunca inventar RUT ni pedirlo para vender. Hoy G30 ya funciona así; revisar que ninguna pantalla nueva exija RUT y mostrar en el registro/guía la diferencia ("Formaliza tu negocio para emitir boleta SII").
- G30 ✅ (CM 4.90 · Órbita 6.05; prueba pruebas/g30_ventas.js): 🎟️ "Cupones y sellos" en Pedidos (sellos movidos desde Mi tienda; guardar Mi tienda los conserva) · 📖 instructivos desplegables en Boletas y Despacho · 📋 Registro de ventas (pedidos pagados + Caja) en formato boleta con logo, RUT, fecha/hora y firma + 🖨️ Imprimir/PDF (shared/comprobante.js) · CM: un solo 🔗 Link general de pago (los de monto fijo se ocultan si están vacíos).
- G29 ✅ M3 código: CM → Control → Órbita → 🌐 Dominio (destino del CNAME en cfx_config 'dominio' + lista de dominios para Custom Hostnames). Órbita → Mi dominio: CNAME www → destino con 📋, redirigir raíz, estado ⏳/✅ (fetch https://www.<dominio>/cfx-dominio; el Worker responde {slug} con CORS). dominio_guardar quita 'www.' (antes el Worker no lo encontraba). Custom Hostname se agrega A MANO (automatizar con API solo si Josué lo pide).
- M3 🌐 Dominio (decidido G28): hoy es MANUAL (dominio_guardar avisa al CM → Josué agrega el dominio en Workers → aplicaciones → Custom domain; eso exige que el dominio esté en SU Cloudflare = no sirve para dominios de clientes). Camino: Cloudflare for SaaS (plan Free, 100 dominios gratis, luego US$0,10/mes c/u): 1) Josué compra codefix.cl (o similar) en Cloudflare; 2) DNS: tiendas.codefix.cl (AAAA 100:: proxied) = fallback origin; 3) SSL/TLS → Custom Hostnames → Fallback origin = tiendas.codefix.cl; 4) Workers Routes: */* → aplicaciones (sirve todos los custom hostnames); 5) por cada negocio: Custom Hostnames → Add → www.sutienda.cl (validación HTTP automática por el CNAME). El negocio solo pone CNAME www → tiendas.codefix.cl (y redirige la raíz a www en su proveedor). Automatizar el paso 5 = Edge Function con token de Cloudflare (API custom_hostnames) cuando dominio_guardar → después de lanzar si hay pocos dominios, a mano está bien.

## Antes de lanzar (cuando Josué diga "listo")
- Precios: CM → Pagos → negocio $3.000/mes y cliente $2.000/mes (Premium barato). CM → Apps → Órbita → 🧩 → 💰 Vender módulos (prendido) y revisar precios/packs; link abierto en CM → Pagos (los de monto fijo son opcionales).
- LIMPIEZA FINAL (cambió en G20): borrar TODAS las cuentas menos los administradores, con sus datos y avisos. Órbita y Barbería: supabase/limpieza/1_contar.sql (solo cuenta) y 2_borrar.sql; fotos: Storage → cada bucket → Delete.
