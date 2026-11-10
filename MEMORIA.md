# MEMORIA (resumen corto para chats nuevos)

**Qué es:** plataforma SaaS multi-negocio (Chile). Base copiada de BiciTaller (repo Taller) y generalizada.
**Infra:** Cloudflare Pages + Supabase (`vqevujjraisrcoirswuq`) + GitHub. Todo gratis.
**Super admin:** juanjosuecastilloloyola@gmail.com (control total).

## Roles
- **admin**: todo.
- **socio**: ve y administra todo, crea negocios y da Premium. NO borra, suspende ni cambia ajustes/reglas/links/precios.
- **negocio** (dueño), **equipo**, **cliente** (con o sin cuenta).

## Rubros
Tabla `rubros` con modelo `reservas` | `catalogo` | `ordenes` + etiquetas (nombres por rubro). Cada negocio tiene `rubro_id`.

## Pagos
- Admin: links de Premium (mensual/anual) + link de socio.
- Negocio: link de abono o monto completo.
- Pendiente: Mercado Pago y Webpay con interruptor + claves en Ajustes.

## Etapas
1. ✅ (v2.0–2.1) Base de datos, socio, rubros, RUT (`rut_valido`), panel admin.
2. ✅ Módulo catálogo (v2.2): `c/` tienda + carro, `p/` pedido (pago + comprobante), panel `negocio/catalogo.js` (productos, cobro total/abono %, despacho, pedidos). Stock apartado 30 min. RUT validado en servidor.
2c. ✅ (v2.3) Súper admin: 📊 Ficha por negocio (métricas del mes, cobro, límites, equipo, últimos), ⚙️ Configurar (cobro abono/total, % abono, límites propios `limites_extra` que pisan al plan), 🧩 Rubros en Ajustes, resumen por rubro. Reservas con cobro 'total' cobran el precio del servicio.
2b. ⏳ Módulo órdenes (taller mecánico/servicio técnico) y etiquetas por rubro.
3. ⏳ Pagos automáticos (Mercado Pago + Webpay) + cliente.

## Versiones (v3.3)
- La app no se actualiza sola: sw.js guarda cada versión (`cm-app-<v>`); el admin libera en **Versiones** (config `version_liberada`, `version_min`; solo súper admin).
- `version.json` = { version, bd, funcion }. Al publicar: subir `VERSION` en shared/config.js y version.json, `db_version()` en instalar.sql, y apuntar instalar-corto.sql y corto.ts al commit nuevo.
- instalar.sql instala también desde cero (sección A0: perfiles, avisos, push, auditoría).

## Mis aplicaciones (v3.4)
- admin/apps.js: tarjeta por app (APPS: repo, URL, cómo leer la base y la versión liberada, cómo liberar). Lee version.json y config pública desde raw GitHub `main`.
- Liberar por app: CM admin_config_guardar · Billetera admin_guardar_ajustes · CodeFix Apps admin_set_setting · Barbería admin_ajuste · Estaciona admin_guardar_textos · BiciTaller no aplica.
- instalar.sql libera la versión al final (subir el número en cada versión) y ya no borra precios, links ni textos propios al actualizar.

## Núcleo compartido (nucleo/, v1.0)
- Archivos comunes de las 5 apps + Centro de Mando: iconos.js, instalar.js, tema.css (diseño común: misma familia visual, cada app con su color).
- Para repartirlo: `python3 nucleo/sincronizar.py <carpeta con los repos>` (copia, enlaza en las páginas, agrega al service worker y escribe nucleo.json).
- El Centro de Mando → Apps muestra la versión del núcleo de cada app y avisa si falta sincronizar.
- Cuentas: cada app es un proyecto Supabase propio → un correo = una cuenta por app (lo asegura Supabase); el mismo correo puede usarse en otra app.

## v4.3 · Anotar rápido, Listas y actualización automática (base 3.6)
- Barra de abajo: Hoy · Tablero · **+** (anotar) · Listas · Panel. Arriba: ⋯ = Más (Metas, Notas, Ideas, Problemas, Diario, Logros, Aterrizar).
- (v4.3 tenía Listas tipo `falta`; en v4.4 se reemplazan por Pedidos y las antiguas se pasan a pedido o se borran desde Pedidos.)
- Avisos (`tareas_periodicas`): lo de mañana a las 08:00 del día anterior; tareas con hora y recordatorios, 1 hora antes.
- **Actualización automática**: cron `cm-auto` cada 10 min → `auto_actualizar()` lee version.json de GitHub (main). Si `bd` es mayor, ejecuta instalar.sql; si solo cambió la app, la libera. La app instala sola la versión liberada (sin botón).
- Al publicar: subir `VERSION` (config.js + version.json) y, si cambia la base, `db_version()` + `bd` en version.json. Nada más.

## v4.4 · Lo que me falta, Pedidos, avisos insistentes y + con voz (base 3.7)
- Barra: Hoy · Tablero · + · Pedidos · Panel. Arriba: lupa (buscar en todo), foto/⋯ (Más), campana.
- **Hoy** (`m-hoy.js`): Atrasado · Hoy (por hora) · Próximos días · Sin fecha · Ideas · Problemas · Notas · Hábitos, con casilla para tachar (`CM.completar`). Tareas con `datos.rep` [1..7] se repiten.
- **+** (`CM.anotar` + `CM.entender`): dictado por voz y detección de tipo/fecha/hora en español ("mañana a las 10…", "idea:", "recuérdame…", "pedido de…").
- **Pedidos** (`m-pedidos.js`): tipo `pedido` (titulo = para quién, fecha = entrega, estado abierto→listo→hecho, datos { tel, hora, abono, total, nota, items[{que,color,cant,nota,foto}] }). PDF con fotos (uno o todos), compartir, WhatsApp al cliente.
- **Fotos solo en el teléfono** (`CM.fotos`, IndexedDB `cm-fotos`): pedidos y foto de perfil. El servidor guarda solo texto.
- Avisos: mañana 08:00 del día antes (incluye pedidos), 1 h antes, insiste +15 min y +1 h (`prefs.insistir`), "¿Algo que anotar?" 2 veces/día (`cabeza`, `cabeza_h1/h2`), plan de la semana domingo 20:00 (`plan_semana`). Recordatorio único queda `avisado` hasta tacharlo.
- Botones en la notificación (Listo / 1 hora más): `sw.js` llama `notif_accion(id_notificacion, accion)` (anon; la notificación es la llave, 3 días).
- Panel: lo que falta por categoría, pedidos (por entregar, saldo por cobrar) y QR/link de invitación (`index.html?registro=1`).

## Núcleo 1.5 y estado al 28/10/2026 (para retomar en un chat nuevo)
- **Repos** (CodeFixService): SaaS (Centro de Mando, tiene `nucleo/`), Emprendedor (Billetera), Aplicaciones (CodeFix Apps/FichaPro), Barberia, Taller (BiciTaller), Estacionamiento (Estaciona). Cada uno con su Supabase y Cloudflare (main).
- **Ramas**: se trabaja en `nucleo` y, ya probado, se pasa a `main` (el dueño lo autorizó: "probado → directo a main"). `nucleo` = `main` en las 6 al cierre.
- **Núcleo** (`saas/nucleo/`, se reparte con `python3 nucleo/sincronizar.py <carpeta con los 6 repos>`):
  tema.css (diseño común + barra), iconos.js, instalar.js, barra.js ([principal][principal][ + ][principal][Más]; config por página con `window.CFX_BARRA`),
  auto.js (`CodeFixAuto`: la app se instala sola cuando está liberada), fotos.js (`CFX_FOTO`: comprobante 1000px/110KB, vitrina 1080px/220KB, portada, documento, perfil, logo),
  voz.js (micrófono en todo campo de texto; `data-sin-voz` lo apaga).
- **Actualización**: cada instalar.sql trae `auto_actualizar()` + cron `cfx-auto`/`cm-auto` cada 10 min: si version.json (main) trae base nueva, ejecuta instalar.sql. **No libera la app**: se libera a mano (panel de cada app o Centro de Mando → Apps → Liberar). Quitado "Copiar consulta" de los paneles.
- **Cada cambio**: subir VERSION de la app (+ version.json; Barbería: app y db_version iguales + verificar_*.sql). Si cambia la base: subir su versión (CM `db_version`, Billetera `privado.config.version_bd` + `BD` en core.js, Estaciona `config.version_bd` + `BD` en admin.js, Taller/Aplicaciones `db_version()` + `bd` en version.json).
- **Versiones en main**: CM 4.7 (base 3.8) · Billetera 1.12.1 (base 11) · CodeFix Apps 5.9 (base 5.4) · Barbería 2.8 · BiciTaller 2.8 (base 2.0) · Estaciona 2.4.1 (base 5).
- **Pendiente del dueño**: pegar UNA vez la consulta corta de cada app (supabase/instalar-corto.sql, apunta a main) en su Supabase. Entregárselas al final, una por app y en orden.
- **Pruebas**: Postgres local + simulador de Supabase con Playwright (rutas *.supabase.co → rpc/REST sobre Postgres), revisar a 360 px, sin errores en consola.
- **Pendientes (en orden)**:
  1. ✅ (ver "P1 hecho" abajo) Limpieza y respaldo: borrar chats y notificaciones (cualquier cuenta); borrado automático a los 30 días con aviso 2 días antes; respaldo descargable por empresa; el admin respalda y borra registros/comprobantes; recordar eliminar productos/servicios sin stock o que ya no se ofrecen; inventario de tablas/config sobrantes (borrar solo lo vacío o sin uso; lo que tenga datos, mostrar al dueño con respaldo y pedir "sí").
  2. ✅ (ver "P2 hecho") Pagos ordenados: mensual, anual y "otro pago" personalizado.
  3. ✅ (ver "P3 y P4 hechos") Interruptores de funciones por plan (como Barbería) en las 6 + completar funciones de admin que faltan (textos editables, avisos masivos, socios, keys/cupones, registro, planes) + pasar a global las exclusivas que sirvan (verificación de identidad solo en Estaciona).
  4. ✅ Centro de Mando como súper panel (control rápido de cada app: liberar, avisar a todos, precios, textos).
  5. ✅ (ver "P5 hecho") Cuentas de clientes con sensación Premium; verificación humana (Cloudflare Turnstile) cuando el dueño lo configure.
  6. ✅ Entrega: `docs/ENTREGA.md` (descripción de cada app + las 6 consultas + pasos).

## P1 hecho (28/10/2026) · Limpieza y respaldo · núcleo 1.6
- **Versiones en main**: CM 4.8 (base 3.9) · Billetera 1.13.0 (base 12) · CodeFix Apps 5.10 (base 5.5) · Barbería 2.9 · BiciTaller 2.9 (base 2.1) · Estaciona 2.5.0 (base 6).
- **Núcleo**: `respaldo.js` → `CFX_RESPALDO.excel(nombre, {Hoja: filas})` (.xlsx real, sin librerías) y `.json`.
- **En las 6**: borrar un aviso (✕) o todos; borrar un chat completo (para ambos; Estaciona no deja si hay denuncia abierta).
  Avisos y mensajes se guardan **30 días**; aviso "🧹 Limpieza automática" máx. 1/semana, siempre ≥2 días antes (columna `aviso_limpieza_at`).
  Cada lunes recordatorio de lo que ya no se ofrece (Apps: productos agotados >30 d; Barbería/Taller: servicios ocultos y ofertas vencidas; Estaciona: pausados >30 d).
  Respaldo Excel del negocio: `mi_respaldo()` (Billetera usa `exportar_datos`).
- **API común del admin (igual en las 6, la usa CM → Apps)**: `cfx_respaldo()`, `cfx_limpieza()` → [{clave,titulo,detalle,filas}], `cfx_limpiar(clave)`,
  `cfx_inventario()` (tablas que no están en `cfx_tablas()`), `cfx_inventario_datos(tabla)`, `cfx_inventario_borrar(tabla, 'sí')`. Nada se borra solo.
  El bloque común (pagos + inventario) vive en `nucleo/sql/` y lo reparte `sincronizar.py` (marcas "CFX núcleo"); verificar con `pruebas/inventario.py <repo> --verificar`.
- **CM → Apps**: botón 🧹 Respaldo y limpieza por app (Excel, limpiezas con conteo, tablas sobrantes) y "Respaldar todas las apps conectadas".
- **Arreglado**: CM borraba la tabla `pagos` en cada actualización (ahora solo si es la del sistema antiguo) y vaciaba invitaciones.
- **BiciTaller**: `schema.sql`/`cron.sql` re-sincronizados con `instalar.sql`; editar schema.sql y correr `node supabase/generar.mjs`.
- **Pruebas** (`saas/pruebas/`): `stub.sql` + `base.sh <repo>` (base local), `actualizar.sh <repo>` (main → nuevo), `sim.js` (Supabase simulado en Playwright: auth, rest, rpc, storage, functions, realtime),
  `h.js` (abrir app a 360 px y juntar errores), `*_p1.sql` y `*_ui.js` por app. `npm install` en esa carpeta; Postgres en /var/tmp/pgb:54329.

## P2 hecho (28/10/2026) · Pagos desde un solo panel · núcleo 1.7
- **Versiones en main**: CM 4.9 (base 4.0) · Billetera 1.14.0 (base 13) · CodeFix Apps 5.11 (base 5.6) · Barbería 2.10 · BiciTaller 2.10 (base 2.2) · Estaciona 2.6.0 (base 7).
- **Decisiones del dueño**: precios iguales en las 6. Negocio: primer pago $4.900 = 30 días Premium; luego $4.900/mes o $49.900/año (o queda Free).
  Cliente: $3.000/mes, $29.900/año. Negocios NUEVOS bloqueados hasta su primer pago (regla `exigir_inicio`, solo para los creados desde `inicio_desde`).
  Link de pago SIN monto (la persona escribe el monto) + comisión % que se suma solo al pagar por link; o transferencia. "Otro monto" libre.
- **SQL común** `nucleo/sql/pagos.sql` (tablas `cfx_config`, `cfx_pagos`, `cfx_exentos`; `cfx_pago_estado`, `cfx_pago_pedir`, `cfx_precios` (anon),
  admin: `cfx_pagos_config(_guardar)`, `cfx_pagos_lista`, `cfx_pago_comprobante`, `cfx_pago_resolver(id, aprobar, dias, motivo)`, `cfx_exento(_email)`).
  Ganchos por app (antes de las marcas "CFX núcleo"): `cfx_yo()`, `cfx_dar_premium(uuid, rol, dias)`, `cfx_avisar`, `cfx_avisar_admin`.
  El comprobante (foto ~110 KB en la tabla) se borra al aprobar/rechazar.
- **JS común** `nucleo/pagos.js`: `CFX_PAGOS.abrir({rpc})` (planes, link/transferencia, comprobante) y `CFX_PAGOS.revisar({rpc, salir})` (pantalla de activación, `<dialog>` siempre al frente).
  Integrado en: CM (app y Más → Pasar a Pro), Billetera (inicio + Mi plan + portada con precios centrales), Apps (Mi plan, empresa y cliente), Barbería (Mi plan),
  BiciTaller (taller y cliente), Estaciona (Premium; el primer pago se pide al publicar el primer estacionamiento, `comoNegocio`).
- **CM → Pagos** (`admin/pagos.js`): formulario único "Guardar en las 6 apps", lista de comprobantes por revisar de todas las apps (aprobar con días / rechazar con motivo)
  y "Cuentas sin primer pago" (eximir por correo). Usa las conexiones de Apps (`MisApps.preparar/cliente/conectar`).
- Los pagos antiguos de cada app (sus tablas y paneles propios) quedan solo como historial.

## P3 y P4 hechos (28/10/2026) · Control de las 6 apps desde el Centro de Mando · núcleo 1.8
- **Versiones en main**: CM 4.10 (base 4.1) · Billetera 1.15.0 (base 14) · CodeFix Apps 5.12 (base 5.7) · Barbería 2.11 · BiciTaller 2.11 (base 2.3) · Estaciona 2.7.0 (base 8).
- **SQL común** `nucleo/sql/admin.sql`: `cfx_planes`/`cfx_plan_guardar` (interruptores sí/no y límites, cada app los aplica como antes),
  `cfx_textos`/`cfx_texto_guardar`, `cfx_aviso_masivo(destino: todos|negocios|clientes|premium|gratis)`, keys (`cfx_keys_crear/lista`, `cfx_key_revocar`, `cfx_key_canjear`
  → da Premium y exime del primer pago), cupones (`cfx_cupones_lista`, `cfx_cupon_guardar/borrar`, `cfx_cupon_ver`; se aplican en pagos.js), verificación de identidad
  (`cfx_verif_enviar/estado/lista/fotos/resolver`, `cfx_rut_ok`; fotos se borran al revisar) y `cfx_registro` (todo lo que hace el admin desde el núcleo).
  Ganchos por app: `cfx_planes_app`, `cfx_plan_guardar_app`, `cfx_textos_app`, `cfx_texto_guardar_app`, `cfx_destinatarios`, `cfx_marcar_verificado` (Estaciona marca `verificado`).
- **JS común**: `pagos.js` ahora con "Tengo un cupón" y "Tengo una key"; `verificar.js` (`CFX_VERIFICAR.abrir({rpc})`), con botón en cada app (CM Más, Billetera Mi cuenta,
  Apps Mi perfil, Barbería Más, BiciTaller Mi cuenta). Estaciona mantiene su verificación propia (#/verificar) y su panel.
- **CM**: pestaña **Control** (`admin/control.js`): eliges la app y manejas Avisar (o en las 6), Planes, Textos, Keys, Cupones (guardar en las 6), Verificaciones y Registro.
  **Resumen** con tablero "Las 6 apps" (pagos y verificaciones por revisar, versiones por liberar). Barra: Resumen · Apps · + · Pagos · Control.
- **Pendiente de P3**: socios en las apps que no los tienen (Billetera, Apps, Estaciona); CodeFix Apps no tiene textos editables (sus textos están en el HTML).

## P5 hecho (28/10/2026) · Sensación Premium y verificación humana · núcleo 1.9
- **Versiones en main (al cierre)**: CM 4.12 (base 4.3) · Billetera 1.16.1 (base 16) · CodeFix Apps 5.14 (base 5.9) · Barbería 2.13 · BiciTaller 2.13 (base 2.5) · Estaciona 2.8.1 (base 10).
- El bloqueo del primer pago solo corre si hay link o transferencia configurados; al configurar la primera forma de pago se reinicia `inicio_desde`.
- `premium.js` → `CFX_PREMIUM.marcar({premium, id, hasta, beneficios})`: con Premium la app se ve dorada (línea arriba, pestaña activa y botón +) y saluda una vez
  ("¡Ya eres Premium!"; no sale si hay pantalla de pago abierta). Se llama al cargar la cuenta en las 6 (clientes y negocios; nunca admin).
- `humano.js` (va PRIMERO en el `<head>`; sincronizar.py lo pone ahí): envuelve `fetch` y, si la app tiene site key (`cfx_humano()`, pública), pide Turnstile antes de
  entrar o crear cuenta y manda el token a Supabase (`gotrue_meta_security.captcha_token`). Se configura en CM → Control → 🤖 Humano (guardar en las 6) y después en cada
  Supabase: Authentication → Attack Protection → CAPTCHA → Turnstile con la secret key. Orden: primero la site key, después Supabase.
- Pruebas: `CFX_SIN_HOLA` apaga el saludo en el navegador de prueba (h.js; `conHola: true` lo deja).

## Ronda 2 (28/10/2026) — hecho
- **Íconos galácticos** nuevos en las 6 apps (generador: SVG → PNG con Playwright; fondo espacio + nebulosa del color de cada app + glifo con brillo).
- **FichaPro → Órbita** (marca de la app Aplicaciones; el módulo de fichas se llama "Fichas"). Archivos internos (fichapro.json) sin cambio.
- **Abrir en la app**: manifiestos con launch_handler, handle_links y related_applications; instalar.js detecta la app instalada
  (getInstalledRelatedApps) y ofrece "Abrir la app" (intent sin paquete: Android la abre en la app, sin elegir navegador).
- **CM Hoy vs Tablero**: Hoy solo muestra lo con fecha (atrasado/hoy/próximos) + ideas/notas/hábitos; lo del tablero (sin fecha, en curso,
  proyectos) queda en el Tablero y en Hoy solo hay un resumen con acceso.
- **Núcleo 2.0**: `ayuda.js` + `sql/ayuda.sql` (🛟: guía para partir con `cfx_guia_app()` por app, chat de soporte `cfx_chat_*`,
  términos por tipo de negocio, puente de avisos al CM `cfx_al_cm` → CM `cfx_aviso_externo` con secreto por app en `cm_puentes`).
- **Pagos**: transferencia (sin cargo), link y tarjeta (cargo por pago online visible en línea aparte, % editable en CM), varios meses (2–11),
  copiar cada dato, pasos 1-2-3-4, días sugeridos enteros (`cfx_dias_sugeridos`), liberar registro N días (`cfx_liberar`).
- **CM**: vista Mensajes (bandeja de las 6), Pagos con tarjeta/liberar, "Panel de la app" abre el panel ya iniciado (sesión de entrega
  guardada al conectar, `?cfx-entrar=` leído por humano.js).
- **Órbita despacho por comuna**: `profiles.despacho`, `costo_despacho`, `guardar_despacho`, línea "🚚 Despacho a …" en el pedido; `shared/despacho.js`.
- Pruebas nuevas: `apl_r2.sql`, `cm_r2.sql`, `r2_ui.js`.
- Versiones: CM 4.13/BD 4.4 · Billetera 1.17/BD 17 · Órbita 5.15/BD 5.10 · Barbería 2.14 · BiciTaller 2.14/BD 2.6 · Estaciona 2.9/BD 11.
- No hecho (decidido): renombrar repos (Cloudflare Pages queda ligado al nombre; los dominios no dependen del nombre del repo); comisión oculta (no: se cobra transparente).

## Etapa final (28/10/2026) · Cabecera, Ajustes y limpieza para vender · núcleo 2.2
- **Versiones en main**: CM 4.16 (base 4.5) · Billetera 1.18.0 (base 18) · Órbita 5.18 (base 5.11) · Barbería 2.17 · BiciTaller 2.17 (base 2.6) · Estaciona 2.10.0 (base 11).
- **Cabecera común** (`ayuda.js`): una sola llamada por app al tener la cuenta, también para el admin:
  `CFX_AYUDA.iniciar({ rpc, app, admin, premium, pro, id, hasta, nombre, email, foto, cuenta, panel, quitar, salir })`.
  Pone a la derecha del encabezado [🔔 campana de la app (una sola; las repetidas se esconden)] [FREE/PRO] [foto o iniciales].
  La foto abre el menú: Ir al inicio, Mi cuenta, Panel de administración, Volver, Guía, Chat con soporte, Términos, Premium y Cerrar sesión (pide confirmar).
  Reemplaza al ⋮ (`.cfx-boya` ya no existe). `quitar` = selector de lo que ya está en el menú (ADMIN, persona, casa, píldora del plan…). Admin = PRO.
  También marca la sensación Premium (`CFX_PREMIUM.marcar`, nunca al admin); `pro` solo cambia la insignia (p. ej. prueba Pro en Billetera).
- **Ajustes en cuadrícula**: `CFX_AJUSTES.montar(el, [{ k, ico, t, d, abrir(zona) | nodo }], { arriba })` → `{ abrir(k), grilla() }`. "←" vuelve a las tarjetas.
  Usado en CM admin, Billetera admin, Órbita admin (secciones `.aj` existentes como `nodo`), Barbería admin, BiciTaller admin y Estaciona admin. Barbería dueño y Billetera/Órbita/Taller "Más" ya eran cuadrícula.
- **Quitado de las apps (se hace en el CM)**: precios y links Premium, planes, textos, keys, cupones, avisos masivos, pagos Premium antiguos, soporte antiguo y versiones/liberar.
  Se conservó lo propio: Billetera conexiones extra (y su pestaña Pagos para esos paquetes), reglas, notificaciones push/servidor, registro, socios, calificaciones, marca, mantención.
  CM admin: Planes y Registro pasan a Ajustes (Planes del CM = Control → Planes); `#registro`/`#versiones` siguen funcionando.
  Soporte de Billetera y Barbería → chat común (`CFX_AYUDA.chat`, llega a CM → Mensajes).
- **Avisos**: CM → Control → Avisar viene marcado "Enviar en las 6 apps". `cfx_destinatarios('todos')` = todas las cuentas (CM suma socios, Billetera dueños y ayudantes, Órbita equipo).
- **Diseño**: en computador `main` centrado con ancho máx. 1040 px (sin el espacio vacío de Billetera); el + centrado en su círculo; micrófono proporcional al campo (18–30 px).
- **Pruebas**: `pruebas/recorrido.js` (ANCHO=360|768|1280) entra como admin, negocio y cliente a las 6, abre cada pestaña, Ajustes y el menú de la foto; informe en `capturas/recorrido-<ancho>.txt`.
  Si npm no tiene red: módulo `pg` mínimo propio (NODE_PATH) — solo para pruebas locales.

## v4.17 (base 4.6) · Cerebro, la 7ª app (28/10/2026)
- **Cerebro · Contenido para redes** (repo Contenido, Supabase `vndqseptmymgqyxumbqy`, worker `contenido`): en CM → Apps (liberar con admin_config_guardar), en sincronizar.py (núcleo, chequeo super_check) y en el puente de avisos ('contenido' → Cerebro).
- sincronizar.py: ya no deja comas dobles al agregar archivos a la lista del service worker.
- Arreglado: "Ya tengo cuenta" en la entrada no hacía nada (el código quedaba dentro de un comentario).

## Etapa final · detalles (28/10/2026, noche) · núcleo 2.3
- **Versiones en main**: CM 4.18 (base 4.7) · Billetera 1.19.0 (base 19) · Órbita 5.19 (base 5.12) · Barbería 2.18 · BiciTaller 2.18 (base 2.7) · Estaciona 2.11.0 (base 12).
  (Cerebro/Contenido se trabaja en otro chat: aquí no se toca; sincronizar.py lo salta si no está en /home/user.)
- **CM Panel ⇄ App**: `CFX_AYUDA.iniciar({ atajo: { ir, t } })` pone un botón fijo en la cabecera (en celulares chicos solo el ícono).
- **Barra**: siempre 2 a cada lado del + (si sobran, el 4º lugar es "Más"; con 3 botones queda un espacio vacío `.cfx-vacio`). La barra no se muestra hasta estar ordenada (`html.cfx-barra-lista`).
- **Tiras deslizables** (.seg, .chips, .subtabs, .tabs…): `barra.js` recuerda su posición al redibujarse y solo se mueve lo justo para mostrar la opción elegida (`CodeFixTiras.ajustar`). Billetera `centrarActivos` y Estaciona `centrarSeg` ya no centran.
- **Flechas**: botones con solo ‹ › ← → pasan a SVG centrado (ayuda.js). ‹ sin etiqueta = "Anterior" (no dispara el "volver").
- **Registro**: `cfx_registro_borrar(dias)` (0 = todo; borra cfx_registro y la tabla `auditoria` de la app) + `CFX_AJUSTES.registro(el, rpc, { lista })` con 2 botones. En Billetera, Barbería, BiciTaller, Estaciona (sección nueva) y CM → Control → Registro (cualquier app).
- **CM → Control → 🔔 Notificaciones**: muestra si cada app tiene claves push y las crea desde ahí (una vez por app).
- **Órbita textos editables**: tabla `textos` (login y registro de negocios), elementos `data-texto`; se editan en CM → Control → Textos.
- **Chats**: Barbería admin sin Mensajes (consejos van por `cfx_chat_iniciar` al 🛟 de la barbería); BiciTaller y Órbita sin chat arriba (va en Más con su número).
- **Pagos**: el comprobante se achica hasta caber (≤ ~290 KB) aunque la foto sea enorme.
- **Diseño**: fondo con brillo suave, íconos de Ajustes en cuadro con brillo, entrada animada de tarjetas al bajar, listas de 4+ tarjetas cortas que se apilan (`.cfx-apilar`, solo celular/tablet; `data-sin-pila` lo apaga).
- **Pruebas nuevas**: `final_ui.js` (en todo.sh) y el chequeo "+ al centro" en `recorrido.js`.

## Etapa final · 7 apps (29/10/2026) · núcleo 2.4
- **Versiones en main**: CM 4.19 (base 4.7) · Billetera 1.20.0 (base 19) · Órbita 5.20 (base 5.12) · Barbería 2.19 · BiciTaller 2.19 (base 2.7) · Estaciona 2.12.0 (base 12) · Cerebro 1.3 (base 1.3).
- **⇄ Panel en todas**: `ayuda.js` pone solo el atajo para el admin con sesión iniciada (`CFG.admin` y no `CFG.socio`; Barbería, BiciTaller y Cerebro pasan `socio`) en las 6 apps → `CFX_AYUDA.panelCM()` (panel del CM). El CM pasa su `atajo` (Panel ⇄ App); `atajo: null` lo apaga.
  Direcciones en un solo lugar: `CFX_AYUDA.web(worker, sub)` (cuenta `juanjosuecastilloloyola.workers.dev`); admin/apps.js la usa (`a.web`).
- **Ícono de las notificaciones**: `nucleo/insignia.py` (lo llama sincronizar.py) saca la silueta blanca de icons/icon-512.png → `icons/badge.png` (Android pinta el badge solo con la transparencia; antes salía un cuadrado blanco). Los sw.js usan `badge: 'icons/badge.png'`.
- **Notificaciones sin claves**: instalar.js ya no muestra "el administrador aún no activa las notificaciones": cierra la ventana y vuelve a ofrecer en 1 día. Claves: CM → Control → 🔔 (Cerebro incluido).
- **Cerebro (Contenido) completo**: núcleo 2.4, Empresa en cuadrícula de Ajustes (Perfil, Otra empresa, Mi cuenta, Espacio; admin: Notificaciones y Registro con botones para borrar), sin tarjetas apiladas, en recorrido.js (`sh` propio) y todo.sh (guia.js).
- **Arreglos de revisión**: micrófono que quedaba suelto (voz.js se esconde si el campo ya no tiene el foco), correo largo en el menú de la foto (admin sin nombre = "Administrador"), Órbita sin PRO repetido en Fichas y sin el cuadro del logo junto a "‹" en celular,
  Billetera "＋ Cliente" (no se confunde con el + de la barra), BiciTaller "¿Tienes un taller?" pasa de botón flotante a Cuenta, Cerebro "✅ Publicada" sin cortarse.
- **Pruebas**: recorrido.js revisa el ⇄ Panel (solo admin, va al CM). sim.js acepta `columns` con comillas (insert de varias filas de supabase-js).

## Detalles (29/10/2026) · núcleo 2.5
- **Versiones en main**: CM 4.20 · Billetera 1.20.1 · Órbita 5.21 · Barbería 2.20 · BiciTaller 2.20 · Estaciona 2.12.1 · Cerebro 1.4 (bases sin cambios salvo db_version de Barbería 2.20).
- **Menú de la foto (ayuda.js)**: sesión del admin (`CFG.admin` y no `CFG.socio`) → solo "Cerrar sesión" (con confirmación), sin botón Cerrar (afuera/Esc). **instalar.js** no ofrece notificaciones si la página ya tiene un aviso propio `[data-cfx-push]` (Barbería admin y avisos.js lo marcan).
- **Órbita 5.22**: tienda t/ con Productos · Ofertas · Pedido en una fila (`.seg` nowrap, solo en t/index.html).
- **Barbería admin**: 4º botón 👥 Usuarios (`v-usuarios`: Clientes/Barberos, reusa pintarBarberias); Barberías queda solo con barberías. CM Usuarios: buscador con margen de 14px.

## Paquete grande (29/10/2026) · núcleo 2.6
- **Versiones en main**: CM 4.21 · Billetera 1.20.2 · Órbita 5.23 · Barbería 2.21 · BiciTaller 2.21 · Estaciona 2.13.0 · Cerebro 1.5 (bases sin cambio de versión salvo db_version Barbería 2.21).
- **Núcleo**: login con tira "otras apps CodeFix" (ayuda.js `otrasApps`, sin CM ni Cerebro; `data-sin-apps` la apaga); admin/socio ven ADMIN/SOCIO en la cabecera y en el menú (no PRO/FREE); `cfx_series(meses)` en sql/admin.sql (llega con la próxima base de cada app).
- **CM**: Resumen → Empresas (tarjeta por app + ventana con gráficos de cuentas e ingresos; sin cfx_series usa cfx_pagos_lista aprobados); Apps ya no muestra números; Pagos revisa también las conexiones extra de Billetera (admin_pagos / admin_resolver_pago).
- **Estaciona**: avisos en ventana; Más como BiciTaller (íconos de línea, ← volver); admin con barra propia (Resumen · Lugares · + · Usuarios · Ajustes), Verificaciones/Denuncias en el Resumen, sin números de plata; arrendatario sin tareas de dueño.
- **Otros**: Billetera admin sin Pagos (4º botón Registro); Cerebro "Borrar todos mis datos"; Órbita un solo aviso de notificaciones y nombre sin cortarse; BiciTaller "Administración" y ❓ que se esconde al bajar; Billetera sin "›" suelta.
- **Pendiente (turnos propios)**: socios en Billetera/Órbita/Estaciona, sacar números de plata de los paneles de Barbería/Billetera/Órbita/BiciTaller, referidos (núcleo + CM), cuentas vinculadas y compartir en la app de anotar, equipo en Estaciona. Funciones viejas de Barbería (pagos/keys/planes) se quedan: las usan sus pruebas.

## Compartir, referidos y socios (30/10/2026) · núcleo 2.7
- **Versiones en main**: CM 4.22 (base 4.8) · Billetera 1.21.0 (base 20) · Órbita 5.24 (base 5.13) · Barbería 2.22 · BiciTaller 2.22 (base 2.8) · Estaciona 2.14.0 (base 13) · Cerebro 1.6 (base 1.4). Las bases se actualizan solas.
- **+**: solo el botón del centro lleva + (ayuda.js `sinMas` quita "+ " y el ícono + de otros botones); el + del centro es oscuro (`--cfx-mas-ink: #111827`).
- **CM Apps** solo libera/conecta; Ver app, Panel, Respaldo y limpieza (también del CM) y Respaldar todas están en Resumen → Empresas.
- **Compartir (app de anotar)**: vincular con código (Más → Cuentas vinculadas, `vinculo_codigo/vincular/mis_vinculos/desvincular`), `compartir(item, con)`, lo ajeno se lee por RLS (`compartido_conmigo`) y se cambia con `compartido_guardar` (pedido: no cambia qué/cantidad; ✓, "No hay" tachado y reemplazo aparte). Estados tarea/proyecto: Pendiente · Haciendo · En revisión · Listo. Trigger `compartido_aviso` avisa y guarda historial.
- **Referidos (núcleo, sql/referidos.sql)**: `?ref=CODIGO` → `cfx_ref_registrar` al entrar; menú "🎁 Invita y gana" (no admin, no CM/Cerebro); CM → Control → 🎁 Referidos (ranking, dar días + sticker, premio automático `dias_auto` al primer pago aprobado del invitado).
- **Socios comunes (núcleo, sql/socios.sql)**: Billetera/Órbita/Estaciona aceptan `cfx_es_socio()` en su función de admin; solo el dueño los agrega/quita en CM → Control → 🤝 Socios; ayuda.js pregunta `cfx_es_socio` para mostrar SOCIO.
- **Pruebas nuevas**: cm_compartir.sql, cm_compartir_ui.js, cm_referidos.sql, socios_est.sql (en todo.sh).

## Animaciones (30/10/2026) · núcleo 2.8
- **Versiones en main**: CM 4.23 · Billetera 1.21.1 · Órbita 5.25 · Barbería 2.23 · BiciTaller 2.23 · Estaciona 2.14.1 · Cerebro 1.7 (bases sin cambio).
- **Apilar**: barra.js revisa cada vez (si la lista se redibujó o la sección estaba escondida), también al tocar pestañas/hash; antes quedaba sin apilar al volver.
- **Animaciones (tema.css, solo transform/opacity, apagadas con "reducir movimiento")**: entrada de sección (`.view.on`), tarjetas escalonadas, ventanas que suben (zoom en escritorio), botones que se hunden, ícono de la barra que salta, insignias con pulso.

## Arreglo bucle y Billetera pegada (30/10/2026) · núcleo 2.9
- **Versiones en main**: CM 4.24 · Billetera 1.21.2 · Órbita 5.26 · Barbería 2.24 · BiciTaller 2.24 · Estaciona 2.14.2 · Cerebro 1.8.
- **Sin bucle de actualización**: CM `actualizarSola(lib)` no recarga si lo bajado es más viejo que lo liberado (hosting aún publicando) y máx. 2 recargas por versión en 30 min; núcleo auto.js igual (máx. 2 intentos por versión / 30 min). Liberar solo cuando el hosting ya tenga la versión.
- **Billetera en computador**: `.app.con-nav` con 28px a cada lado (el núcleo le quitaba el padding y quedaba pegado al menú lateral).

## Cabecera CM y + sin texto (30/10/2026) · núcleo 2.10
- **Versiones en main**: CM 4.25 · Billetera 1.21.3 · Órbita 5.27 · Barbería 2.25 · BiciTaller 2.25 · Estaciona 2.14.3 · Cerebro 1.9.
- CM app sin lupa en la cabecera (Buscar en Más → Secciones) y chip Trabajo/Descanso más chico en celular.
- + del centro: tema.css oculta su texto aunque la barra aún no se arme (`nav :is(.cfx-mas,.nuevo,.nav-mas,.mas-grande)`), y barra.js le quita texto y etiquetas (queda aria-label).

## Pago, menú y chat (30/10/2026) · núcleo 2.11
- **Versiones en main**: CM 4.26 · Billetera 1.21.4 · Órbita 5.28 · Barbería 2.26 · BiciTaller 2.26 · Estaciona 2.14.5 · Cerebro 1.10 (bases sin cambio salvo db_version Barbería 2.26).
- **pagos.js**: solo 3 planes 1 mes · 3 meses (`meses` m=3, link `link_3meses` en CM → Pagos) · 1 año (sin "Otro monto" ni selector de meses); activación = 1 mes (30 días) + 3 meses + 1 año. Banco y Tipo de cuenta sin "Copiar". Pestañas con ícono arriba (Transferencia sin cortarse). Registro dice "tu primer pago te da 30 días" (ya no 7 días).
- **ayuda.js**: ventanas se ajustan a `visualViewport` (chat sobre el teclado en iPhone); menú sin anillo de foco cortado. **tema.css**: `.cfx-grilla` tarjetas del mismo alto (112px, filas 1fr) e `.ic-caja` 40px. Órbita: el logo ya no reemplaza la foto/iniciales del menú.
- **Estaciona 2.14.5**: Ajustes del admin sin el spinner de carga que quedaba girando bajo la cuadrícula (admin.js limpia C antes de montar).

## Nítido y avisos obligatorios (30/10/2026) · núcleo 2.12
- **Versiones en main**: CM 4.27 · Billetera 1.21.5 · Órbita 5.29 · Barbería 2.27 · BiciTaller 2.27 · Estaciona 2.14.6 · Cerebro 1.11 (bases sin cambio salvo db_version Barbería 2.27).
- **instalar.js**: con sesión las notificaciones son obligatorias (velo `.cfx-hoja-velo`, sin "Ahora no"; iPhone sin instalar → instalar obligatorio). Solo si activar falla aparece "Seguir sin avisos por ahora" (24 h). Pruebas: h.js pone `CFX_SIN_OBLIGAR` (opts.conAvisos lo apaga).
- **Cabecera**: ⇄ solo ícono en celular, campana/⇄/foto de 36px redondas; títulos con "…" pasan a `.cfx-titulo` (2 líneas, letra 14–18px). Tiras de botones que no caben → `.cfx-desliza` (se deslizan y se desvanecen en la orilla). tema.css: bordes/sombras más marcados (también en oscuro) y animaciones de 0,2 s. BiciTaller ❓ del cliente va en la cabecera; Billetera "＋ Cliente" junto al título (ya no flota).

## Avisos deslizables y emergentes (30/10/2026) · núcleo 2.13
- **Versiones en main**: CM 4.28 · Billetera 1.21.6 · Órbita 5.30 · Barbería 2.28 · BiciTaller 2.28 · Estaciona 2.14.7 · Cerebro 1.12 (bases sin cambio salvo db_version Barbería 2.28).
- **ayuda.js `CFX_ANIM`**: botones `[aria-label="Borrar aviso"]` se esconden y su fila se borra deslizando (llama al mismo botón: cada app sigue borrando solo lo suyo); `salirTodos()` (cada app lo llama tras confirmar "Borrar todos"/"Limpiar"); `emergente({titulo,cuerpo,abrir})` arriba de todo (popover). Estaciona/Órbita lo muestran cuando sube el contador; CM/BiciTaller/Cerebro/Billetera/Barbería en vez del toast.
- **Selectores de acción** (`select` sin id/name con 1ª opción "…", p. ej. "⭐ Premium…", "Acción…") → botón con flecha + hoja de opciones (cambia el select y dispara change). Pruebas: la ✕ se toca con `evaluate(b => b.click())`.
- **Cabecera admin (31/10)**: en el panel del admin (y socios) todas las apps dicen solo "Administración", sin logo (Barbería `Avisos.montar({ sinLogo })`, Estaciona cambia el logo en `navAdmin`). Negocios y clientes siguen con su logo y nombre. Versiones: Billetera 1.21.7 · Órbita 5.31 · Barbería 2.29 · BiciTaller 2.29 · Estaciona 2.14.8.

## Menú de la foto, carrusel de servidores y push del CM (31/10/2026) · núcleo 2.14
- **Versiones en main**: CM 4.29 (base 4.9) · Billetera 1.21.8 (base 21) · Órbita 5.32 (base 5.14) · Barbería 2.30 · BiciTaller 2.30 (base 2.9) · Estaciona 2.14.9 (base 14) · Cerebro 1.13 (base 1.5). Las bases se actualizan solas.
- **Foto de arriba** = solo "Cerrar sesión". `cuentaEnMas()` agrega "Cuenta y ayuda" (Mi cuenta, Panel, Guía, Chat con soporte, Términos, Plan, Invita y gana) al final de Más/Ajustes/Cuenta/Perfil (pestaña activa o hash). Admin dueño no lo ve.
- **`cfx_servidor()`** (sql/admin.sql, en las 7): uso de la base, cuentas, tablas y tareas de pg_cron con su última corrida. **`CFX_SERVIDORES.montar`**: carrusel en CM → Resumen (CM + apps conectadas; abierto/cerrado vale para todas). Barbería/BiciTaller/Órbita: su tarjeta "Servidor" queda solo como "🧹 Limpieza".
- **Push del CM**: el trabajo `bt-push` (antes solo en cron.sql, pegado a mano) ahora va en instalar.sql → sin él no salían las notificaciones del CM. El carrusel avisa si una app no tiene tarea de push o si falló.
- **⇄ Panel en computador (31/10)**: `.cfx-cab>.cfx-atajo` con !important (Órbita lo pintaba como cuadrito con el ícono arriba). Versiones: CM 4.30 · Billetera 1.21.9 · Órbita 5.33 · Barbería 2.31 · BiciTaller 2.31 · Estaciona 2.14.10 · Cerebro 1.14.

## Perfil común (31/10/2026) · núcleo 2.15
- **Versiones en main**: CM 4.31 · Billetera 1.21.10 · Órbita 5.34 · Barbería 2.32 · BiciTaller 2.32 · Estaciona 2.14.11 · Cerebro 1.15 (bases sin cambio salvo db_version Barbería 2.32).
- **`CFX_PERFIL`** (ayuda.js): "Mi perfil" en el menú de la foto + `montar(el, extra)` en la pantalla de cada app. Secciones Foto y nombre · Color y modo · Avanzado (notificaciones, contraseña, eliminar) + `secciones` propias (Órbita: Mi tienda con `nodo`). Cada app solo entrega `window.CFX_PERFIL_APP` (adaptador); lo que falta lo pone `BASE` (foto/color/modo en el celular, push vía `CodeFixInstalar.pushActiva/activarPush`). Herencia: `{ __proto__: base, … }` (CM/Cerebro `App.perfil` en shared/app.js; Billetera `LC.perfil` en core.js; Órbita en cuenta.js; BiciTaller `perfilApp(c)` en shared/app.js; Barbería perfil.js; Estaciona app.js; CM en estilo.js porque m-mas carga tarde). Sin adaptador: solo foto y avanzado.
- Carrusel de servidores: "cola" cuenta como tarea de push (Billetera lc-cola). Prueba nueva: pruebas/perfil_ui.js (CM, Billetera, Barbería); recorrido.js abre Mi perfil.
- **CM 4.32 · base 4.10 (31/10)**: instalar.sql borra la tarea vieja `cf-pedidos` (llamaba a pedidos_tareas, que ya no existe → error en el carrusel). La base se actualiza sola (cm-auto).

## Opciones quietas (31/10/2026) · núcleo 2.16
- **Versiones en main**: CM 4.33 · Billetera 1.21.11 · Órbita 5.35 · Barbería 2.33 · BiciTaller 2.33 · Estaciona 2.14.12 · Cerebro 1.16 (bases sin cambio salvo db_version Barbería 2.33).
- **CFX_AJUSTES/CFX_PERFIL sin saltos**: ya no hay `scrollTo(0,0)`; `aLaVista(w)` solo mueve si la sección quedó fuera de la vista. Toda opción del perfil pasa por `quieto()` (guarda y repone scroll de la página y de la ventana aunque la app repinte). Color/modo se marcan en su lugar, sin redibujar. Botones de modo: grilla de 3 con ícono arriba y estilo propio (no heredan el botón de la app).
- **Estaciona**: cambiar el modo ya no recarga la página: `Mapa.repintar()` cambia solo las teselas (también al cambiar el modo del sistema). Prueba nueva: pruebas/perfil_quieto.js (CM y Estaciona).

## Perfil galáctico, arriba y una sola flecha (31/10/2026) · núcleo 2.17
- **Versiones en main**: CM 4.34 · Billetera 1.21.12 · Órbita 5.36 · Barbería 2.34 · BiciTaller 2.34 · Estaciona 2.14.13 · Cerebro 1.17 (bases sin cambio salvo db_version Barbería 2.34).
- **Diseño propio del perfil** (`.cfx-pf-w`, `--pf`/`--pf2` = color de la app y degradado): campos, botones (48px, borde 1.5px, radio 14), Guardar y modo elegido con degradado y brillo, foto con anillo; no hereda nada de la app. **Perfil siempre arriba** (CM Más sin la tarjeta de foto repetida; Órbita antes de Más; BiciTaller cliente antes de Mi cuenta). CM conserva el perfil abierto aunque Más se repinte.
- **Una sola flecha** (CFX_AJUSTES anidado): al abrir una sección de adentro se esconde la flecha de afuera; cada flecha vuelve un paso. recorrido.js lo revisa.
- **Avisos de base falsos (31/10)**: Órbita admin tenía `DB_VERSION = '5.13'` fijo y Estaciona `BD = 13` (las bases ya iban en 5.14/14) → "se está actualizando sola" para siempre. Ahora salen de un solo lugar (Órbita `Core.dbVersion` en shared/core.js; Estaciona `EST_CONFIG.BD`) y el aviso solo aparece si la base está MÁS VIEJA. Al subir la base, súbela también ahí. Órbita 5.37 · Estaciona 2.14.14.
- **Botones con espacio y Las 7 apps (31/10) · núcleo 2.18**: `separarBotones()` (ayuda.js) agrupa botones seguidos dentro de `.card/.tarjeta` en `.cfx-btns-auto` (gap 10px, bajan ordenados). Perfil con margen abajo. CM: "Las 6 apps" → "Las 7 apps" y sus números en carrusel deslizable (`.car-apps` en shared/app.css). Versiones: CM 4.35 · Billetera 1.21.13 · Órbita 5.38 · Barbería 2.35 · BiciTaller 2.35 · Estaciona 2.14.15 · Cerebro 1.18.

## Menú Más en lista + hojas, fotos cuadradas (31/10/2026) · núcleo 2.19
- **Versiones en main**: CM 4.36 · Billetera 1.21.14 · Órbita 5.39 · Barbería 2.36 · BiciTaller 2.36 · Estaciona 2.14.16 · Cerebro 1.19 (bases sin cambio salvo db_version Barbería 2.36).
- **CFX_AJUSTES/CFX_MENU** (ayuda.js): filas en lista por grupo (`grupo`; Configuración y Cuenta y ayuda al final) y cada opción abre una **hoja desde abajo** (`CFX_MENU.hoja`, capa z-index 45: sobre la barra, bajo ventanas/avisos de cada app; se apilan; ✕, deslizar, tocar afuera, Escape o "atrás"). Ítems: `abrir(zona)` | `nodo` (se mueve a la hoja y vuelve) | `ir` | `accion`. `CFX_MENU.montar(el, items, { perfil })` = Más común (perfil compacto arriba + app + perfil en Configuración + Cuenta y ayuda sin repetidos por `k`). Sin flechas ni `scrollTo(0,0)`; tarjetas sin animación al bajar (tema.css). Si la opción abre su propia ventana, usar `accion` (no `abrir`, deja hoja vacía). Al mover un `nodo` a la hoja, no buscarlo con `el.querySelector` (Cerebro guarda la referencia antes).
- **Cada app**: CM Más (m-mas.js; adaptador del perfil en estilo.js), Cerebro Empresa, Billetera Más (`pintar` dibuja en la hoja con `enHoja`), Órbita Más (negocio) y Cuenta (cliente, en v-home), Barbería Perfil (cliente) y equipo.js (`seccion()` = hoja), BiciTaller Más (`body()` = hoja) y Cuenta cliente, Estaciona Más (#/mas/<sección> abre su hoja). **Fotos**: recorte cuadrado al centro (`cuadrada`, 640) y cabecera 36×36 fija; Barbería 360 px. Pruebas: menu_ui.js (7 apps), recorrido.js (hoja vacía / ventana encima), analisis_fotos.js.

## Análisis CodeFix aplicado (31/10/2026) · núcleo 2.20
- **Versiones en main**: CM 4.37 (base 4.11) · Billetera 1.21.15 (base 22) · Órbita 5.40 (base 5.15) · Barbería 2.37 · BiciTaller 2.37 (base 2.10) · Estaciona 2.14.17 (base 15) · Cerebro 1.20 (base 1.6). Las bases se actualizan solas.
- **Cabecera**: el ⇄ Panel oculto (`.cfx-oc`) ya no deja un círculo vacío. Títulos en 1 línea con "…". CM en PC muestra logo y nombre.
- **Íconos por clave** (ayuda.js `icono()`): las filas del menú aceptan `ico: 'perfil' | 'cuenta' | 'salir'…` (ICO_CLAVE), reconocen el título ("Mi perfil", "Cerrar sesión"…) y sin clave dibujan uno genérico (nunca vacío). iconos.js expone `CodeFixIconos.svg(nombre)` y `deEmoji()`.
- **Hojas**: título repetido escondido (`.cfx-tit-rep`), foco en la hoja (sin anillo doble en la ✕), ícono en el título. CFX_VERIFICAR cierra con Escape.
- **Espacio abajo**: 112 px + safe-area bajo la barra y el + (body y cajas con scroll `.cfx-pad-barra`). Chips con 40 px. PC: contenido 960 px centrado y `.stats/.kpis` con auto-fit (sin hueco a la derecha).
- **Campos**: `input[type=file]` → botón propio "Subir foto/archivo" con vista previa cuadrada (`data-nativo` lo deja como estaba); `<html lang="es-CL">` (fechas dd-mm-aaaa); letra mínima 12 px.
- **instalar.js**: nunca obligatorio. "Ahora no"/✕ → hasta la próxima apertura y máx. 1 vez al día; "Ya la instalé" → nunca más. Notificaciones = tarjeta chica arriba de Inicio (Activar · ✕ por 3 días). Barbería usa la misma tarjeta.
- **Nueva versión disponible**: `cfx_avisar_version(version, notas, app)` (sql/admin.sql, las 7; una vez por versión, tabla `cfx_versiones`). CM → Apps → Liberar pide la línea de novedades (por defecto `notas` de version.json) y la llama; el panel propio del CM también. Barbería ya no manda su aviso viejo al liberar.
- **Avisos nuevos**: Órbita "✅ Tu pedido fue aceptado" y "📦 Pedido para preparar" al equipo; BiciTaller "🔧 Tu bici está lista para retiro" y "📅 Te asignaron una reserva" al mecánico; Cerebro "🏢 Nueva empresa" al admin y "📅 Hoy publicas"; Billetera/Estaciona títulos con emoji. Cerebro no avisa "llegó material": quienes graban no tienen cuenta (lo marca el dueño).
- **Uso del servidor** fuera de los paneles de cada app (queda en CM → Resumen); se dejan los botones de limpieza.
- **Íconos de app**: Cerebro nuevo (cerebro de línea con brillo, centrado); `icons/icon-maskable-512.png` (20 % de margen) en CM, Órbita, Barbería, BiciTaller y Cerebro (Billetera y Estaciona ya tenían).
- **Por app**: Órbita cliente sin ⚙️/‹ ni perfil repetido y sin ❓ flotante con barra; Estaciona "Cargando mapa…" y créditos que se ajustan; Cerebro admin con "＋ Nueva empresa" plegado y pasos de Supabase plegados; BiciTaller "Para empezar" con círculos; Billetera listas con separador; CM filtros por app con espacio.
- **auditoria.js**: ignora lo que está dentro de un `<details>` cerrado y el encabezado fijo al buscar botones encimados (eran falsos positivos).
- **Núcleo 2.21 (31/10, tarde)**: los títulos en 1 línea y el centrado de 960 px en PC no habían llegado a las apps (se editaron después de sincronizar). El carrusel de servidores del CM muestra la causa real del error (antes todo lo que nombraba cfx_servidor decía "se está actualizando", también "permission denied" por conexión vencida) y las tarjetas ya no se estiran vacías. Versiones: CM 4.38 · Billetera 1.21.16 · Órbita 5.41 · Barbería 2.38 (base 2.38) · BiciTaller 2.38 · Estaciona 2.14.18 · Cerebro 1.21.
- **Núcleo 2.22 (31/10, noche)**: `nucleo/carga.js` (va en el `<head>`, antes de crear Supabase): barra de luz arriba en toda consulta >250 ms, botón tocado con puntitos y ✓, "Cargando…" pasa a esqueleto con brillo. API `CFX_CARGA.{boton,esqueleto,barra}`. Órbita: precios en CLP sin decimales (`Core.money`, `Core.precioNum` lee "10.000"). Permisos `cfx_servidor`/`cfx_series` en `admin.sql` (las apps que revocan todo los perdían al reinstalar). Prueba central: `pruebas/central.js` (7 apps, si pasa no se rompió nada).
- **Pendiente (en orden)**: Órbita variantes al crear producto (color/talla/forma/tipo, cada una con precio, stock y foto) → tienda estilo Shein (grilla 2 col, ficha con barra fija "Agregar", "Te puede gustar", aviso "volvió el stock" por variante). Informe completo de UI/avisos: `/home/user/ANALISIS_CODEFIX.md` (muchas cosas ya hechas en núcleo 2.20–2.21).
- **Órbita 5.43**: catálogo con tarjetas estilo tienda (foto cuadrada arriba, borde/sombra con `--brand`, entrada escalonada suave) y `opciones` como botones (colores → muestra redonda vía `colorDe`, tallas → pastillas); el `select.opc` sigue oculto y es lo que lee el carrito. Falta: variantes con precio/stock/foto propios (requiere tabla nueva) + ficha con barra fija "Agregar".
- **Plan Cerebro (para después)**: 1) tablero semanal con todas las ideas apiladas por estado (Por grabar→Grabado→Editado→Publicado); 2) rol grabador invitado por link, entrega con LINK del video (Drive/Fotos, nunca subir video) + push "🎬 X grabó"; 3) aprobar/repetir con aviso y ranking.
- **Núcleo 2.25 – PIN de la app**: tabla `cfx_pin` + `cfx_pin_estado/guardar/verificar` (sql/ayuda.sql, hash sha256 con el id, 5 fallos → 5 min). Se pone en Mi perfil → Avanzado; pantalla de PIN al abrir y tras 5 min en segundo plano (`sessionStorage cfx-pin-ok`); "¿Olvidaste tu PIN?" cierra sesión y deja entrar con contraseña. Menú: una sola fila "Mi perfil" arriba de Configuración (núcleo 2.24). `theme_color` de los manifest = fondo (barra de Android neutra).

## A1 · Legal en el núcleo (05/11/2026) · núcleo 2.30
- **Versiones**: CM 4.48 (base 4.12) · Billetera 1.21.26 (base 23) · Órbita 5.54 (base 5.16) · Barbería 2.48 · BiciTaller 2.48 (base 2.11) · Estaciona 2.14.28 (base 16) · Cerebro 1.32 (base 1.7). A0 (versión 1.01) quedó en pausa por decisión del dueño.
- **Ley 21.719** (modifica la 19.628, vigente 1-dic-2026): `ayuda.js` → `CFX_LEGAL { version: 2, desde, revisar, terminos, privacidad }`. Términos al día + **Política de privacidad** nueva (responsable, datos, bases legales, encargados Supabase/Cloudflare, transferencia internacional, plazos, derechos ARCO+portabilidad+bloqueo, 30+30 días, brechas → Agencia, menores de 14, almacenamiento local). Fila "Política de privacidad" en Cuenta y ayuda. Lo propio por app en `PRIV`.
- **Aceptación con versión**: `sql/legal.sql` (tabla `cfx_legal` cuenta+versión+fecha+agente; `cfx_legal_estado()`, `cfx_legal_aceptar(v)`, admin `cfx_legal_resumen()`). Al entrar (no admin) si la versión aceptada < `CFX_LEGAL.version` sale ventana fija (sin Escape ni tocar afuera; casilla + Aceptar o Salir). Si la base aún no tiene `cfx_legal_*`, no pide nada. Para cambiar textos: subir `LEGAL.version` y sincronizar.
- Billetera y Estaciona ya no tienen ventana propia de términos (la pide el núcleo). Órbita mantiene "Antes de empezar" y Billetera el alta, pero al aceptar ahí llaman `cfx_legal_aceptar` (no pregunta dos veces).
- **Pendiente del dueño**: razón social, RUT y domicilio de CodeFix para la sección "Responsable" (hoy dice "CodeFix (Chile)" + chat de soporte).
- Prueba: `pruebas/legal_ui.js` (CM, Billetera, Órbita vieja y nueva, BiciTaller, Estaciona). menu_ui.js: avisos de "perfil de arriba" y fallas de Barbería ya existían en main.

## U1-U4 · núcleo 2.31 (05/11/2026)
- **Versiones en main**: CM 4.49 (base 4.13) · Billetera 1.21.27 (base 24) · Órbita 5.55 (base 5.17) · Barbería 2.49 · BiciTaller 2.49 (base 2.12) · Estaciona 2.14.29 (base 17) · Cerebro 1.33 (base 1.8).
- **U1 voz.js**: dictado se corta tras 2,5 s de silencio (7 s sin voz, 60 s máx., corte forzado si el navegador no avisa); botón se esconde tras 3 s y vuelve al tocar el campo; nunca en contraseña, email, numeric/tel, teléfono, RUT, códigos, precio ni monto. Micrófono con z-index máximo (quedaba bajo capas fijas). Usa `SpeechRecognition` sin prefijo si existe.
- **U2 barra.js**: barra de abajo que se esconde sola (aparece al cargar, navegar, subir y al final; se esconde al bajar o tras 4 s); asa o deslizar arriba la muestra; nunca en PC ni con ventana abierta. `CodeFixBarra.ver/ocultar`, `window.CFX_BARRA_FIJA`.
- **U3 ayuda.js**: sin PRO arriba; campana y foto 32 px; ☰ solo en teléfono (`.cfx-cab-extra`, atajo, plan, Mi perfil, Cerrar sesión); `data-cfx-queda` deja un botón arriba.
- **U4 admin.sql**: `cfx_actualizar_ahora(p_programar)` programa tarea única pg_cron 'cfx-ahora' (bloque DO, no función SQL: "cache lookup failed") y anota en `cfx_registro` accion 'auto'. CM → Apps: "⚡ Actualizar base ahora" con causa real; Liberar muestra "Liberando…" y corta a los 20 s.
- **Regla de pruebas (Josué)**: antes de main se corre UNA sola prueba general (`pruebas/central.js`); no crear pruebas por cada cambio. central.js necesita la base `barberia_prueba` (`./base.sh /home/user/barberia barberia_prueba`).
- **Pendiente nuevo (Josué)**: modo sin conexión (núcleo: caché + cola de cambios que se envía al volver); vincular cuentas con un código (cliente↔negocio y negocio↔negocio); chat entre cuentas vinculadas (en el núcleo, una vez).

## U10 · núcleo 2.32 (05/11/2026)
- **Versiones en main**: CM 4.50 · Billetera 1.21.28 · Órbita 5.56 · Barbería 2.50 (db_version 2.50) · BiciTaller 2.50 · Estaciona 2.14.30 · Cerebro 1.34 (bases sin otro cambio).
- **Botón + con su color final desde la primera carga**: carga.js (en el `<head>`) pone al abrir el último `--brand` guardado (`localStorage cfx-brand`, se guarda solo al cambiar el estilo inline del `<html>`) y la clase `cfx-premium` si la última vez era PRO (`cfx-premium`, la escribe `CFX_PREMIUM.marcar`). Antes el + partía con otro color y cambiaba al llegar la cuenta.
- Barra: `-webkit-tap-highlight-color: transparent` (sin mancha oscura al tocar en Android) y anillo solo con teclado (`:focus-visible`).

## U7+U8+U9 · núcleo 2.33 (05/11/2026)
- **Versiones en main**: CM 4.51 · Billetera 1.21.29 · Órbita 5.57 · Barbería 2.51 (db_version 2.51) · BiciTaller 2.51 · Estaciona 2.14.31 · Cerebro 1.35 (bases sin otro cambio).
- **U7 cabecera**: arriba solo la campana; foto, FREE/PRO, ⇄ atajo y ☰ quedan ocultos (siguen en el DOM: BiciTaller cliente usa `.cfx-plan` de referencia). Teléfono: sin logo (`img` y `[class*=logo]` de ≤3 letras/emoji → `.cfx-sin-logo`; `h1::before` de Órbita). Flecha de volver (`ES_VOLVER` o `.cfx-flecha`) → `.cfx-volver`, cuadrado limpio 38 px con sombra.
- **U8 pestañita** `.cfx-pest` (centro, colgando de la cabecera `.cfx-cab-h`; lleva el contador de pendientes) → panel `.cfx-pnl` que baja desde arriba: foto 56 px, nombre, correo, plan; botones propios de la cabecera (solo teléfono), ⇄ "Cambiar de app/cuenta" (admin/atajo), Mi plan/Pasar a PRO, Mi perfil, Cerrar sesión. Cierra con velo, Escape, flecha ↑ o deslizar arriba. Sin cabecera: va dentro de la boya fija.
- **U9 cinta PRO**: `.cfx-cinta` 3 px dorada bajo la cabecera (`html.cfx-premium`); la línea fija de arriba de premium.js solo queda si no hay cabecera (`html:not(.cfx-con-cinta)`).
- Pruebas viejas (u_ui, r2_ui) aún buscan `.cfx-ham`/`.cfx-av` visibles: quedaron desactualizadas (la regla es central.js).

## Arreglos de Josué tras U7-U9 · núcleo 2.34 (05/11/2026)
- **Versiones en main**: CM 4.52 · Billetera 1.21.30 · Órbita 5.58 · Barbería 2.52 (db_version 2.52) · BiciTaller 2.52 · Estaciona 2.14.32 · Cerebro 1.36.
- **Pestañita**: tapaba la tarjeta principal. Ahora delgada (34×12 px, flecha 12 px) a la orilla derecha, justo bajo la campana (a mano del pulgar derecho; `--cfx-pest-d` la centra bajo la campana). Área para tocar más grande que el dibujo. El contador va a su izquierda.
- **Barra de abajo, misma regla en todas**: al bajar se esconde, al subir aparece (y arriba del todo, al cargar y al cambiar de pantalla). Ya no reaparece al llegar al final (rebote) ni se esconde sola a los 4 s.

## U6 · Más sin repetidos · núcleo 2.35 (05/11/2026)
- **Versiones en main**: CM 4.53 · Billetera 1.21.31 · Órbita 5.59 · Barbería 2.53 (db_version 2.53) · BiciTaller 2.53 · Estaciona 2.14.33 · Cerebro 1.37.
- **Regla común** (ayuda.js `enBarra()`, usada por CFX_MENU al pintar): una fila del Más se quita si coincide con un botón visible de la barra o con el + por destino (ruta+hash normalizados, `index.html` = carpeta), por clave (`k` = data-v/r/k/tab/hash) o por nombre (sin emojis ni contadores). No cuenta el botón que abre el propio menú (mas/ajustes/perfil/cuenta) ni los sobrantes `.cfx-oculto`.
- Revisado: Órbita (Productos `caja/#productos` y Clientes `fichas/#clientes` abren otra pestaña: no son repetidos) y Estaciona sin repetidos hoy; la regla evita que aparezcan en adelante.

## Recuperar contraseña arreglado (06/11/2026) · CM 4.54 · BiciTaller 2.54 · Cerebro 1.38
- **Síntoma (Josué, BiciTaller)**: el enlace del correo daba ERR_FAILED; con el enlace del panel de Supabase se podía escribir la clave pero "Guardar y entrar" se quedaba pegado.
- **Causa 1 (CM, BiciTaller, Cerebro)**: en index.html, con `#type=recovery` se mostraba la clave nueva y se cortaba con `return` ANTES de conectar los botones → `bNueva` sin acción. Ahora la revisión de sesión/recuperación va al final, después de los botones. `bNueva` valida 6 caracteres y muestra "Guardando…".
- **Causa 2 (BiciTaller)**: `redirectTo` era `ROOT + 'index.html'`; Cloudflare redirige a `/` y el sw.js entregaba la respuesta con marca de redirección → Chrome ERR_FAILED. Ahora `redirectTo: App.ROOT` (CM y Cerebro igual) y sw.js usa `limpia()` (como CM y Cerebro).
- Órbita (`rootUrl()`), Billetera (`RAIZ`) y Estaciona ya volvían a la raíz. Si el correo llega antes de este cambio, pedir uno nuevo. La URL raíz de cada app debe estar en Supabase → Authentication → URL Configuration → Redirect URLs.

## Campana siempre y pestañita firme · núcleo 2.36 (06/11/2026)
- **Versiones en main**: CM 4.55 · Billetera 1.21.32 · Órbita 5.60 · Barbería 2.54 (db_version 2.54) · BiciTaller 2.55 · Estaciona 2.14.34 · Cerebro 1.39.
- Paneles de administración de Billetera y Órbita no tenían campana y la pestañita salía deforme (la app estilaba todo botón de la cabecera). Ahora: si la pantalla no trae campana, el núcleo pone la suya (`.cfx-campana-n`, abre hoja "Avisos": estado de los avisos al teléfono + "Activar avisos" con `CodeFixInstalar.activarPush`); si después aparece la de la app, la del núcleo se quita. `.cfx-pest` con medidas `!important` (34×12).

## U11 Íconos en todo el texto · núcleo 2.37 (06/11/2026)
- **Versiones en main**: CM 4.56 · Billetera 1.21.33 · Órbita 5.61 · Barbería 2.55 (db_version 2.55) · BiciTaller 2.56 · Estaciona 2.14.35 · Cerebro 1.40.
- `iconos.js` ya no mira solo el emoji del inicio de botones/títulos: recorre todos los textos y cambia cada emoji conocido en cualquier posición ("Hola, Ana 👋", "🌴 …<br>🔴 …", "con ➕."). Al inicio deja margen (`.ic-e`); en medio/final `.ic-e.en`; solo `.ic-e.solo`. Fuera: `option` (no admite íconos), chat, campos, avatares, `.no-ico`/`data-emoji`, selectores de ≥6 botones-emoji. Los avisos emergentes (toast) ahora también se convierten.
- 28 íconos nuevos: pulgar, derecha, abajo, arriba, torta, comida, ropa, belleza, huella, planta, taza, sueno, carpeta, enchufe, senal, bateria(Baja), video, bot, ojoNo, medalla, triste, control, audifonos, numeros, pelota, dado (+ ✋🙌🙏 → mano, más caras y corazones). Cubre los rubros de Órbita.

## U5 Datos en bruto inteligentes · núcleo 2.38 (06/11/2026)
- **Versiones en main**: CM 4.57 · Billetera 1.21.34 · Órbita 5.62 · Barbería 2.56 (db_version 2.56) · BiciTaller 2.57 · Estaciona 2.14.36 · Cerebro 1.41.
- `nucleo/datos.js` (enlazado en todas las páginas por sincronizar.py). Detecta el tipo de cada `<input>` (data-tipo, name, id, placeholder, inputmode, autocomplete, label; separa camelCase "fTel") → monto, telefono, rut, fecha, patente, correo. Fuera: buscadores, password/date/etc., `data-tipo="no"`, `.no-datos`.
- Pone ejemplo en gris si no hay placeholder. Normaliza en change / Enter / submit / pointerdown en otro elemento (antes de que la app lea): "10 mil", "2 lucas", "1,5 millones", "$15.990" → dígitos; teléfono chileno → `569XXXXXXXX` (mismo formato que wa.me y las apps; +otro país se respeta); RUT → 12.345.678-5 (borde ámbar si DV no calza, no bloquea); fecha d/m/aa → dd-mm-aaaa; patente → mayúsculas sin guiones; correo → minúsculas. Lo que no entiende lo deja igual ("9,99", "10000").
- Aprende por campo (localStorage `cfx-datos`): si el negocio escribe "15 mil", el ejemplo pasa a "Ej: 15 mil".
- Mostrar: `CodeFixDatos.mostrar(tipo, v)` o `<span data-dato="monto">` ($10.000, +56 9 1234 5678, …).

## U12 Vitrina de la tienda · núcleo 2.39 (06/11/2026)
- **Versiones en main**: CM 4.58 · Billetera 1.21.35 · Órbita 5.63 (bd 5.18) · Barbería 2.57 (db_version 2.57) · BiciTaller 2.58 · Estaciona 2.14.37 · Cerebro 1.42.
- `nucleo/vitrina.js` (no `perfil.js`: Barbería ya tiene uno propio). `CodeFixVitrina.montar(nodo, t)`: portada con banner del color, logo, nombre, rubro, Abierto/Cerrado/Vacaciones, estrellas, descripción, 📍 dirección+comuna (Google Maps), horario, correo, "Tienda desde", redes (Instagram/Facebook/TikTok/web) y botones WhatsApp + Compartir. `editor(nodo, perfil)` / `leer(nodo)` para Ajustes.
- Órbita: `profiles.perfil jsonb` + `set_mi_perfil(jsonb)` (descripcion 400, direccion, comuna, instagram, facebook, tiktok, web→https, correo validado; quita < >). `tienda_publica` y `tienda_info` devuelven perfil, rubro y desde. t/index.html usa la vitrina (reemplaza el cuadro de estado); Ajustes → Mi tienda → "📇 Perfil de tu tienda" (solo guarda si cargó, para no borrar).
- central.js revisa la tienda pública con perfil (tienda "vitrina").

## U14 Arreglos de pantalla · núcleo 2.40 (06/11/2026)
- **Versiones en main**: CM 4.59 · Billetera 1.21.36 · Órbita 5.64 (bd 5.18; core.js APP_VERSION al día) · Barbería 2.58 (db_version 2.58) · BiciTaller 2.59 · Estaciona 2.14.38 · Cerebro 1.43.
- **Pago con tarjeta** (pagos.js): "Copiar monto" y "💳 Abrir pago con tarjeta" uno bajo otro, ancho completo, mismo alto, con relleno (antes cortado y descuadrado).
- **Sin línea amarilla** bajo la cabecera (`.cfx-cinta` oculta; PRO se sigue notando en pestaña activa/+ dorados) y 16 px de espacio entre la cabecera y lo que sigue (`.cfx-cab-h + *`), así la pestañita no pisa la tira de pestañas.
- **PRO entero**: `.pill`, `.pill.pro`, `.pill.gold`, `.cfx-plan` sin saltos de línea ni achicarse (tema.css).
- **Cifras** (tema.css `.cfx-cifras`): ícono arriba, número y texto abajo. Órbita → Fichas → Campañas → Mis suscriptores la usa.
- **Globito solo en la campana**: el número (pendientes + chat sin leer) ya no va junto a la flechita; va en la campana como atributo `data-cfx-n` (::after), que sobrevive si la app rehace su campana. Si la campana ya tiene su propio número, el del núcleo va a la izquierda (`data-cfx-n-izq`).
- **Espacio sobre la barra**: relleno inferior 112 → 136 px (el ➕ se ve completo al final).

## Pendientes anotados (06/11/2026)
- ~~Billetera "aún se está publicando"~~ ✅ (ver arreglo abajo).
- **Reparar app (núcleo, todas)**: botón "Reparar la app" en Ajustes → Configuración (lo más intuitivo posible): limpia caché/service worker, vuelve a cargar la sesión y la versión, y se arregla sola.
- Forma de trabajo: una función a la vez (máx. dos por chat); al cambiar de chat, prompt con resumen de lo hecho, lo en curso y lo que falta.

## Arreglo "aún se está publicando" (06/11/2026) · mismas versiones de U14
- **Causa**: el sw.js de Billetera (js/core.js `VERSION`), CM y Cerebro (shared/config.js `VERSION`) solo instala si la versión del código = version.json. En U14 (y antes en CM/Cerebro) se subió version.json sin el código → "Actualizar" fallaba siempre.
- Corregido: Billetera 1.21.36, CM 4.59, Cerebro 1.43; además Órbita `DB_VERSION` 5.18 y Barbería core `VERSION` 2.58 (solo se muestran).
- **central.js** ahora compara la versión del código con version.json en saas, emprendedor, Aplicaciones, barberia y contenido. Al subir versión: version.json + ese archivo.

## Botón "Reparar la app" (06/11/2026) · núcleo 2.41
- **ayuda.js** `reparar()`: confirma, borra `caches`, desregistra los service workers y recarga con `?cfx=…` (no toca localStorage: sesión, PIN y datos quedan).
- Va al final de **Configuración** en el menú común (CFX_MENU) y en "Cuenta y ayuda" suelto (apps sin menú común).
- Versiones: CM 4.60 · Billetera 1.21.37 · Órbita 5.65 · Barbería 2.59 · BiciTaller 2.60 · Estaciona 2.14.39 · Cerebro 1.44. central.js revisa el botón en las 7 apps.

## Órbita 5.66 (bd 5.19) · Variantes + ficha con barra "Agregar" (06/11/2026)
- Tabla `variantes` (owner_id, clave, nombre, precio, stock, orden). RPC `variantes_guardar(clave, lista)` (dueño; deja catalog_items.opciones con los nombres) y `variantes_de(negocio)` (público).
- `armar_pedido` cobra el precio de la opción y revisa su stock (`apartado_op`); `mover_stock` descuenta también la opción. Caja (venta en local) aún no descuenta por opción.
- Caja → producto: "💲 Precio y stock distinto por opción". shared/tienda.js: `CFX_FICHA` (cargar, con, agotada), opciones agotadas tachadas, precio de la tarjeta cambia con la opción, ficha (tocar foto o nombre) con cantidad y barra fija "Agregar · $".
- central.js prueba la ficha y el precio por opción en t/.

## Núcleo 2.42 · Fotos WebP (06/11/2026)
- nucleo/fotos.js: `CFX_FOTO_URL(canvas, q)` (WebP o JPEG si el teléfono no puede) y `CFX_ACHICAR(archivo|dataURL, tipo)` (lado, fondo blanco, baja calidad y luego tamaño hasta ~kb×1400). pagos.js (comprobante) y verificar.js (documento) lo usan; Órbita Core.fotoChica/comprobante también. Las bases ya aceptaban webp.
- Versiones: CM 4.61 · Cerebro 1.45 · Billetera 1.21.38 · Órbita 5.69 · Barbería 2.60 (bd 2.60) · BiciTaller 2.61 · Estaciona 2.14.40. central.js revisa la foto WebP en las 7 apps.

## Órbita 5.70 · D20 Tienda en 5 min + D23 barra de progreso (06/11/2026)
- index.html (cargarHoy): "Te falta configurar" pasa a "🚀 Tu tienda en 5 minutos": 7 pasos (rubro, logo, WhatsApp, horario, productos, link de pago, compartir) con barra (`.t5` en core.css), hechos con ✅ tachados; se oculta al completar. Compartir/QR marca `localStorage cfx:compartio`. central.js lo prueba.

## Órbita 5.71 (bd 5.21) · Grupo 1: inventario + Caja por opción + push al pedido + fichas WebP (06/11/2026)
- SQL 5.21: `caja_descontar` descuenta también la opción (it.opcion → variantes); `stock_sumar(clave, opcion, cant)` (dueño, ±, "Entró mercadería"); `inventario()` (dueño/equipo: clave, opcion null=producto, stock, apartado, precio); trigger `notifications_pedido_url`: un aviso 'apps/pedidos/' pasa a 'apps/pedidos/?p=<id>' (pedido creado/cambiado en la misma transacción).
- Caja: al vender un producto con opciones pide cuál (Core.elegir) y usa su precio; pendStock lleva opcion; traerStock usa inventario(); tarjeta 📦 Inventario en Productos (KPIs + ➕ Entró por producto/opción); stock bajo incluye opciones.
- Pedidos: ?p=id busca el pedido en las pestañas, lo marca y lo centra. Fichas: foto con CFX_ACHICAR('vitrina').
- central.js: push abre pedido exacto · inventario y venta por opción.

## Órbita 5.72 (bd 5.22) · Grupo 2: equipo con roles (06/11/2026)
- SQL 5.22: `profiles.equipo_rol` (vendedor|bodega|admin, default vendedor = comportamiento anterior); `equipo_puede(que)` (dueño todo; vendedor caja+pedidos; bodega inventario+pedidos; admin caja+inventario+pedidos+estadisticas); `equipo_rol(email, rol)` (dueño); `mi_equipo()` devuelve rol; `my_account()` trae equipo_rol; `caja_descontar` exige caja; `stock_sumar` acepta equipo con inventario (stock del negocio).
- Inicio → Mi equipo: elegir rol al crear y cambiarlo en la lista. Caja: bodega sin Vender/Reporte y abre Inventario; admin ve Vender + Inventario; equipo no ve "valor a costo". Pedidos: admin del equipo ve Estadísticas.
- central.js: equipo con roles (bodega).

## Órbita 5.75 (bd 5.23) · Grupo 4: Mercado Pago automático (06/11/2026)
- SQL 5.23: tabla `mp_cuentas` (owner_id, token, nick, activo; nadie la lee) y pedidos `mp_desde`/`mp_pago`. `mp_api` llama a api.mercadopago.com con la extensión `http` (sin Edge Function). `mp_guardar(token, activo)` valida con /users/me (null,null = desconectar); `mp_estado()`. `link_activo(o,'pedido')` agrega `mp: true` → el pedido queda 'pagando' aunque no haya link. `mp_pagar(ref, volver)` crea la preferencia (CLP, external_reference = id, vence con retenido_hasta, sin pagos en efectivo) y devuelve init_point. `mp_confirmar(id)` busca un pago aprobado (/v1/payments/search) con monto ≥ total → aprueba como un comprobante (stock, 'preparando', avisos). `mp_revisar(ref)` (público) y cron `mp-revisar` cada 2 min (`mp_revisar_pendientes`).
- Arreglo: `drop function mi_equipo()` antes de su definición vieja (volver a correr instalar.sql sobre 5.22 fallaba → la base no se actualizaba sola).
- UI: Ajustes → Links de pago: tarjeta ⚡ Mercado Pago automático (token, activo, desconectar). r/ (pedido): "⚡ Pagar con Mercado Pago" (sin comprobante si no hay otro link); al volver confirma solo. Catálogo → Mis pedidos: mismo botón (vuelve a r/).
- Pruebas: stub.sql simula `extensions.http` (http_log). central.js: Mercado Pago automático.

## Órbita 5.76 (bd 5.24) · Grupo 5: Boleta SII (06/11/2026)
- SQL 5.24: tabla `boleta_cuentas` (owner_id, modo manual|openfactura, apikey oculta, rut, razon, giro, direccion, comuna, auto). Pedidos: `boleta_folio/url/at/error/intentos`. `rut_normal(text)` (módulo 11). `boleta_estado()` (dueño y equipo; fin de key solo dueño), `boleta_guardar(jsonb)` (null = quitar), `boleta_dte` arma boleta 39 (precios con IVA, receptor 66666666-6, descuento en DscRcgGlobal, "Otros" si falta), `of_api` POST api.haulmer.com/v2/dte/document (header apikey + Idempotency-Key cfx-<pedido>), `boleta_intentar` (guarda FOLIO y SELF_SERVICE.url, avisa al cliente), `boleta_emitir(id)` (equipo con Pedidos), `boleta_anotar(id, folio)` (manual; null borra), cron `boleta-emitir` cada 5 min (`boleta_pendientes`: pagados en línea o entregados, 3 días, 5 intentos). `pedidos_tienda`, `mis_pedidos` y `ver_pedido` traen `boleta`.
- UI: Ajustes → 🧾 Boleta SII (#boleta). Pedidos: botón 🧾 Emitir/Anotar boleta y "Boleta N°". Cliente (r/ y Mis pedidos): "Boleta electrónica N° X · razón (RUT) · Ver boleta".
- Ojo: formato OpenFactura no verificado contra su documentación (el host no estaba permitido): probar con una boleta real antes de ofrecerla. Ventas de Caja aún sin boleta.
- Pruebas: central.js "Órbita: boleta SII" (stub haulmer).

## GRUPO 6 · A2 Consentimientos + A3 Derechos + registro + brechas · núcleo 2.43 (06/11/2026)
- **Versiones**: CM 4.62 (bd 4.14) · Billetera 1.21.39 (25) · Órbita 5.77 (5.25) · Barbería 2.61 · BiciTaller 2.62 (2.13) · Estaciona 2.14.41 (18) · Cerebro 1.46 (1.9).
- **SQL (nucleo/sql/legal.sql)**: `cfx_consent` (+ historial `cfx_consent_hist`): 'ofertas' (CodeFix, parte en NO) y 'negocios' (ofertas del negocio, parte en SÍ, se retira). `cfx_consent_estado/guardar`, `cfx_acepta(cuenta, tipo)` (interna). `cfx_derechos` (acceso, rectificación, supresión, oposición, portabilidad, bloqueo; vence a 30 días, prórroga +30 una vez): `cfx_derecho_pedir/derechos_mios`, admin `cfx_derechos_lista/derecho_responder(id, responder|prorrogar|rechazar, texto)` (avisa al titular). `cfx_mis_datos()` = copia JSON de toda tabla con columna de dueño (cuenta/owner_id/user_id/cliente_id/target_id…; sin hash/pin/token/clave/apikey; sin cfx_pin, cfx_keys, boleta_cuentas, push_subscriptions, cfx_verificaciones) y queda como solicitud de portabilidad respondida. `cfx_brechas` + `cfx_brechas_lista/brecha_guardar(jsonb)/brecha_marcar(id, agencia|cerrar)/brecha_avisar(id, destino, título, cuerpo)`. `cfx_privacidad_resumen()`. Todo anota en `cfx_registro`.
- `cfx_aviso_masivo` acepta destino **'ofertas'** (publicidad: solo quienes aceptaron). Barbería `guardar_oferta` no avisa a clientes con 'negocios' = no. Si otra app empieza a mandar ofertas a clientes: filtrar con `cfx_acepta(id, 'negocios')` y sumarla a `CON_NEGOCIOS` en ayuda.js.
- **App (ayuda.js)**: Cuenta y ayuda → "🗂️ Mis datos y privacidad" (no admin; `CFX_LEGAL.misDatos()`): interruptores de ofertas, 📥 Descargar mis datos (JSON al instante), corregir / oponerme / bloquear / borrar (solicitud con texto), Mis solicitudes con estado y fecha límite. Privacidad punto "Tus derechos" apunta ahí (sin subir LEGAL.version).
- **CM → Control → 🔒 Datos** (por app): resumen (en curso, vencen <5 días, brechas abiertas, consentimientos), solicitudes con días restantes (Responder / Prorrogar / No acoger), brechas (Registrar, Editar, Ya avisé a la Agencia, Avisar a los afectados, Cerrar) y Registro de actividades de tratamiento (fijo en admin/control.js `RAT`). Supresión: se borra la cuenta en el panel de la app y luego se responde.
- Prueba: central.js (CM) usuario acepta ofertas, descarga copia y pide rectificación; admin responde, registra brecha y avisa.

## GRUPO 7 · A7 anon/buckets + A8 encabezados + Turnstile · núcleo 2.44 (06/11/2026)
- **Versiones**: CM 4.63 (bd 4.15) · Billetera 1.21.40 (26) · Órbita 5.78 (5.26) · Barbería 2.62 · BiciTaller 2.63 (2.14) · Estaciona 2.14.42 (19) · Cerebro 1.47 (1.10).
- **A7 (nucleo/sql/seguridad.sql, va al final del núcleo)**: en Supabase anon recibe permiso para toda función nueva y `revoke ... from public` NO se lo quita.
  Un `do` le quita a anon (y public) toda función plpgsql cuyo primer paso es `perform <CHK>` (ej. cm_puente_secreto, cfx_humano_guardar, cfx_respaldo, cfx_limpieza).
  Buckets públicos sin límite → 5 MB y solo webp/jpeg/png (Órbita fichas). `cfx_seguridad()` (admin) = tablas sin RLS, anon escribe, anon lee, funciones anon, buckets, humano.
  CM → Control → 🛡️ Seguridad la muestra por app.
- **A8 (nucleo/_headers → raíz de cada repo con sincronizar.py, paso 7)**: nosniff, Referrer-Policy, X-Frame-Options, HSTS 1 año, Permissions-Policy (cámara/micrófono/ubicación/pago solo la app),
  COOP same-origin-allow-popups y CSP (object-src none, base-uri/frame-ancestors/form-action self, script-src self + inline + wasm + Turnstile + jsdelivr). Sirve en Cloudflare Pages y Workers;
  GitHub Pages lo ignora. pruebas/h.js aplica el bloque "/*" del _headers para que las pruebas vean lo mismo.
- **Turnstile**: humano.js también pide la verificación en recover/otp/resend (si no, con CAPTCHA en Supabase fallaba "olvidé mi contraseña").
  Compras sin cuenta: CM → 🤖 Humano guarda además la **secret key** (`cfx_humano_guardar(site, secreto)`: null = no cambiar, '' = quitar) en `cfx_secretos` (sin acceso desde la app).
  `cfx_humano()` dice `invitados` = hay secret. humano.js agrega `p_humano` a las RPC de `INVITADO` (hoy solo `crear_pedido_invitado`); `cfx_humano_ok(token)` lo revisa con
  challenges.cloudflare.com/turnstile/v0/siteverify (si Cloudflare no responde, deja pasar). Para sumar otra app (ej. Barbería reservar_invitado): agregar `p_humano text default null`
  (drop de la firma vieja), llamar `cfx_humano_ok` y sumarla a `INVITADO`.

## GRUPO 8 · Respaldo pg_dump + ping anti-pausa + monitoreo de errores · núcleo 2.45 (07/11/2026)
- **Versiones**: CM 4.64 (bd 4.16) · Billetera 1.21.41 (27) · Órbita 5.79 (5.27) · Barbería 2.63 · BiciTaller 2.64 (2.15) · Estaciona 2.14.43 (20) · Cerebro 1.48 (1.11).
- **SQL (nucleo/sql/salud.sql, antes de seguridad.sql)**: `cfx_errores` (agrupado por firma md5(mensaje|1ª línea de dónde), `veces`, máx. 300 filas, 30 días) y `cfx_salud` (clave 'ping' / 'respaldo').
  `cfx_error_anotar(mensaje, donde, pagina, navegador, version)` y `cfx_ping()` abiertas a anon (sin Turnstile: no crean cuentas ni avisan, con tope).
  `cfx_salud_marca(clave, jsonb)` solo la base (la llama respaldo.yml con la conexión). Admin: `cfx_salud()` y `cfx_errores_borrar(id|null)`.
- **carga.js**: escucha `error` y `unhandledrejection` → POST a rpc/cfx_error_anotar con la URL/anon de `window.*_CONFIG` (y su VERSION si tiene). Máx. 5 por apertura, sin repetir,
  ignora ruido (sin internet, extensiones, ResizeObserver, "Script error."). En localhost no manda salvo `window.CFX_ERRORES_LOCAL = true`. API `CFX_CARGA.anotarError(msg, donde)`.
- **CM → Control → 🩺 Salud** (por app): último ping, último respaldo (MB), errores 24 h y la lista con Borrar / Borrar todos.
- **SaaS/.github/workflows/salud.yml**: cada día 11:23 UTC llama cfx_ping() en las 7 (nucleo/proyectos.json, lo escribe sincronizar.py paso 8). Falla → correo de GitHub.
  (Billetera mantiene su ping.yml viejo; se puede borrar.)
- **SaaS/.github/workflows/respaldo.yml**: cada día 07:41 UTC, pg_dump 17 (-Fc; public, privado, auth, storage, cron) por app, cifrado gpg AES256 con `RESPALDO_CLAVE`,
  artefacto 14 días. Secretos `CENTRO_DE_MANDO, BILLETERA, ORBITA, BARBERIA, BICITALLER, ESTACIONA, CEREBRO` = cadena **Session pooler** (la directa es IPv6).
  Falta secreto → se salta con aviso. Restaurar: `gpg -d X.dump.gpg > X.dump && pg_restore --no-owner --no-acl -d "<cadena>" X.dump`.
- Prueba: central.js (las 7) anota un error a mano y uno lanzado, llama cfx_ping; CM → Control → Salud muestra y borra.

## Cierre G8 + CM 4.65 (07/11/2026)
- Actions probado: Salud ✅ las 7. Respaldo ✅ 6 (CM 0,13 MB · Billetera 0,62 · Órbita 0,51 · Barbería 0,20 · BiciTaller 0,15 · Estaciona 0,14); CEREBRO sin secreto (se salta).
  Las de sa-east-1 y Billetera fallaban con aws-0 ("tenant/user not found"): se arreglaron pegando la cadena exacta de Supabase → Connect → Session pooler.
- CM 4.65: en Mis aplicaciones el botón "⚡ Actualizar base ahora" (cfx_actualizar_ahora → auto_actualizar en máx. 1 min) aparece siempre en cada app conectada, no solo cuando falta base.
- Ideas de Josué para DESPUÉS de terminar la tienda:
  · Actualización NUNCA automática: al negocio/cliente le aparece el botón "Actualizar" (como en Billetera) y la app se actualiza solo cuando lo toca.
- ✅ HECHO (CM 4.65): Mis aplicaciones → "🧪 Probar vX" cuando la rama fija `pruebas` del repo trae version.json más nueva que main. Link = https://pruebas-<worker>.juanjosuecastilloloyola.workers.dev/
  (vista previa de Cloudflare Workers Builds, misma base real). Flujo: central.js OK → push a `pruebas` → Josué prueba → OK → main → Liberar.
  Requiere en Cloudflare, por cada worker: Settings → Build → Branch control → "Builds for non-production branches" ON, y Settings → Domains & Routes → Preview URLs ON.
- ✅ CM 4.66 (bd 4.17): ✅ Confirmar (habilitado tras abrir 🧪 Probar, por versión en localStorage) y ↩️ Deshacer en cada tarjeta con rama pruebas.
  SQL en SaaS/supabase/instalar.sql (no núcleo; solo vive en la base del CM): gh_api (interna) + cm_github / cm_github_guardar / cm_pruebas(repo, 'confirmar'|'deshacer'),
  token fine-grained en cfx_secretos 'github' (CM → Apps → 🔑 GitHub). Confirmar = PATCH main→sha de pruebas (si no es fast-forward, POST /merges). Deshacer = pruebas vuelve a main (force).
  SaaS ahora tiene wrangler.jsonc con "previews": {} (Cloudflare Preview command: npx wrangler preview). Link de prueba fijo: https://pruebas-<worker>.juanjosuecastilloloyola.workers.dev/ ✅.
  Sumar una app: wrangler.jsonc con previews + rama pruebas (Claude) · Cloudflare → worker → Configuration → Preview: "Builds for preview branches" ON (Josué).

## Órbita 5.80 (bd 5.28) · G9: E26 ✅ Qué hacer hoy + ❓ ayuda y 🧭 recorrido (07/11/2026)
- SQL 5.28: `hoy_negocio` suma nuevos, preparando, listos, sin_leer (mensajes), boleta_error (3 días), abierto, vacaciones y pro_dias.
- index.html: tarjeta "✅ Qué hacer hoy" (hacerHoy: tareas en orden de urgencia con número; según rol del equipo; "🎉 Todo al día"). Botón "❓ Ayuda" en la tarjeta (el ❓ flotante se oculta con la barra): Ver el recorrido · Preguntas frecuentes (7) · Escribir a soporte. Cliente sigue con chat directo.
- shared/tour.js (propio de Órbita por ahora; pasarlo al núcleo cuando otra app lo use): `CFX_TOUR.iniciar(pasos, {clave, forzar})`, 1ª vez (localStorage cfx:tour:<clave>), espera ventanas abiertas, salta pasos ocultos.
- Primer ciclo por la rama pruebas de Órbita. central.js: "Órbita: qué hacer hoy + ayuda y recorrido".

## G10 · 🧾 Comprobante de venta + 🔔 push potentes · Órbita 5.81 (bd 5.29) · núcleo 2.46 (07/11/2026)
- shared/comprobante.js (solo Órbita, en FILES de sw.js): `CFX_COMPROBANTE.abrir({negocio, fecha, numero, cliente, tel, items, descuento, total, medio, entrega})` → hoja con el resumen ("No es boleta electrónica"), teléfono editable, 💬 WhatsApp (wa.me/<tel>?text=; sin teléfono usa navigator.share), 📤 Compartir, 📋 Copiar.
- Caja: botón "🧾 Comprobante de la venta" tras Cobrar (se oculta al agregar otro producto) y 🧾 en cada venta del reporte. Pedidos: "🧾 Comprobante" en cada pedido.
- SQL 5.29: `pedidos_tienda` devuelve `medio` ('mercadopago' si mp_pago, 'transferencia' si comprobante_at).
- Push: sw.js de las 7 con `renotify: !!d.tag` (renotify sin tag hace fallar showNotification) y vibrate; Órbita: avisos con url apps/pedidos/ quedan a la vista (requireInteraction) y vibran más.
  Órbita enviar/index.ts: `pushConReintento` (TTL 259200, urgency 'high', 2 reintentos en 429/5xx). Se despliega pegando corto.ts en Supabase → Edge Functions → enviar. Las otras 6 apps: mismo cambio en su función cuando les toque (requiere redeploy manual; Barbería ya tenía urgency high).
- Núcleo ayuda.js: "🔔 Probar aviso" en Mi perfil → Avanzado (visible con avisos activos; showNotification del service worker).
- central.js: comprobante de pedido por WhatsApp · comprobante de venta en Caja · 🔔 Probar aviso.

## G11 · A4 + A5 + A6 + A9 docs · Órbita 5.82 (bd 5.30) · núcleo 2.47 · CM 4.68 (bd 4.18) (07/11/2026)
- A4: Órbita sin `supabase/schema.sql` ni `cron.sql` (eran copias viejas; todo está en instalar.sql). CM sin `cron.sql`: `bt-tareas` (cada 5 min) pasó a instalar.sql junto a cm-auto. BiciTaller igual: schema.sql + cron.sql son la fuente y `node supabase/generar.mjs` arma instalar.sql.
- A5 (Órbita bd 5.30): bloque después de "<<< CFX núcleo" copia `licenses`→`cfx_keys` (hash sha256 del código, las sin usar siguen sirviendo), `pagos`→`cfx_pagos` (en_revision → pendiente en CM → Pagos) y archiva `resenas` en cfx_registro ('reseña archivada'); borra cada tabla solo si quedó todo copiado. `redeem_license` ahora llama a `cfx_key_canjear`. Se borraron admin_create/revoke_license, admin_stats, *_resena, subir_pago_premium, mis_pagos, admin_pagos, admin_pago_comprobante, admin_revisar_pago. admin_resumen/admin_negocios/admin_ingresos/es_cuenta_inactiva/cfx_respaldo leen cfx_pagos/cfx_keys.
  NO son dobles: `cupones` (de cada tienda) vs `cfx_cupones` (descuento del Premium) y `messages` (cliente↔tienda) vs `cfx_chat` (soporte con el CM).
- A6: `nucleo/seguro.js` (va primero en el <head>, CABEZA de sincronizar): `CFX_ESC`, `CFX_HTML` (plantilla que escapa), `CFX_URL` (frena javascript:). Núcleo y Órbita (core, tienda, comprobante, tour, despacho) usan CFX_ESC; vitrina pasa los links de redes por CFX_URL; comprobante de Pedidos y fotos de t/ escapados. Las otras 6 apps tienen copias propias de esc: cambiarlas en su turno.
- A9 docs: README/CONFIGURAR de Órbita, CM, BiciTaller, Estaciona y Billetera apuntan a Cloudflare Workers; términos de Órbita: "⚙️ Ajustes → Zona peligrosa → Eliminar mi cuenta". Repos privados siguen EN PAUSA.

## Núcleo 2.48 · límite de keys arreglado (08/11/2026)
- `cfx_key_canjear` (nucleo/sql/admin.sql): una key mala anota 'key fallida' y devuelve `{error}` sin raise (el raise deshacía el registro y el límite de 10/hora nunca contaba). nucleo/pagos.js lanza el error si viene `r.error`.
- Órbita `redeem_license` (bd 5.31) revisa `r ? 'error'`. central.js: 11 intentos → "Demasiados intentos".
- Versiones: CM 4.69 (bd 4.19) · Órbita 5.83 (bd 5.31) · Barbería 2.66 · BiciTaller 2.67 (bd 2.16) · Estaciona 2.14.46 (21) · Billetera 1.21.44 (28) · Cerebro 1.51 (1.12).
- Limpieza final antes de lanzar: anotada en PLAN.md ("Antes de lanzar").

## G12 (parte 1) · C19 módulos + C14 chat al núcleo · núcleo 2.49 · Órbita 5.84 (bd 5.32) · CM 4.70 (bd 4.20) (08/11/2026)
- C19 `nucleo/sql/modulos.sql`: cfx_config 'modulos' ({clave: bool}, por defecto prendido). La app dice qué módulos tiene con el gancho `cfx_modulos_app()` → text[] (sin gancho: ninguno). `cfx_modulo(k)` (interna), `cfx_modulos()` (pública, para esconder), `cfx_modulos_admin()` / `cfx_modulo_guardar(k, bool)` (<CHK>, anota en cfx_registro). CM → Mis aplicaciones → tarjeta conectada → 🧩 Módulos (solo si la app tiene alguno). JS: `CFX_MODULOS.activo(k, rpc)` en ayuda.js; Órbita usa `Cuenta.modulos()` → body.sin-<k> (core.css esconde [data-k=chat] y links a apps/mensajes/) y Mensajes dice "no está disponible".
- C14 `nucleo/sql/chat.sql`: tablas cfx_mensajes (de, para, texto, creado, leido), cfx_bloqueos (quien, a), cfx_reportes. RPC cfx_msg_restantes/enviar/lista/sin_leer/hilo/bloquear/reportar/borrar + admin cfx_msg_reportes/resolver. Reglas: N seguidos sin respuesta (gancho; null = sin límite), 100/día, bloqueo de los dos lados, 10 reportes/día (aviso al admin con cfx_avisar_admin). Ganchos de la app: cfx_chat_puede, cfx_chat_seguidos, cfx_chat_quien, cfx_chat_aviso, cfx_chat_suspender. Todo plpgsql (los ganchos pueden faltar en apps sin chat).
- Órbita bd 5.32: bloque después de "<<< CFX núcleo" copia messages/blocks/reports → cfx_* (mismos id) y borra las viejas + drop de send_message, chat_list, chat_messages, chat_remaining, block_contact, report_message, admin_resolve_report, chat_borrar. my_contacts, can_message, chat_limite y conexiones siguen en Órbita. El admin de Órbita lee reportes con cfx_msg_reportes (ya no carga todos los perfiles).
- Las otras apps (Barbería tiene messages/blocks/reports iguales; BiciTaller y Estaciona "mensajes" propios) pasan al chat del núcleo en su turno: poner los ganchos + 'chat' en cfx_modulos_app y migrar como Órbita.
- Siguiente: C15 calificaciones (2 direcciones) + C16 cupones/sellos al núcleo, como módulos ('calificaciones', 'cupones', 'sellos' ya tienen nombre en cfx_modulos_admin).
- Orden real con pruebas: la base se actualiza leyendo MAIN (auto_actualizar/⚡ usan raw .../main/), así que con SQL nuevo: ✅ Confirmar → ⚡ Actualizar base (esperar que diga la versión nueva) → probar en incógnito → 🚀 Liberar. 🧪 Probar antes de Confirmar muestra la pantalla nueva con la base vieja (da error si usa funciones nuevas).
- CM 4.71: barra.js del núcleo ya no apila tarjetas dentro de la hoja de Ajustes (.cfx-hm-zona; se veían encimadas en Registro de cambios). Solo copiado al CM: las otras 6 lo reciben en el próximo sincronizar (G12b).

## G12b · C15 calificaciones en 2 direcciones + C16 cupones y tarjeta de sellos al núcleo · núcleo 2.50 · Órbita 5.86 (bd 5.33) · CM 4.72 (bd 4.21) (08/11/2026)
- `nucleo/sql/calificaciones.sql` (módulo 'calificaciones'): tabla cfx_calificaciones (ref text, de_negocio, negocio_id, cliente_id, cliente_ref = tel del invitado, estrellas 1-5, comentario ≤300; pk ref+de_negocio). `cfx_calificar(ref, estrellas, comentario)` (anon y authenticated; {ok, error}). Internas: cfx_calif_hecha(ref, de_negocio) (apagado → true: no pide calificar), cfx_calif_negocio(n) y cfx_calif_cliente(c, ref) → {promedio, total} (apagado → null), cfx_calif_borrar(n, ref). Gancho: `cfx_calif_ref(ref, u)` → {ref (la de verdad), negocio, cliente, cliente_ref, de_negocio} o {error}. negocio_id SIN clave foránea (en Barbería/BiciTaller el negocio es una tabla, no una cuenta).
- `nucleo/sql/fidelidad.sql` (módulos 'cupones' y 'sellos'): cfx_descuentos (cupones del NEGOCIO; no confundir con cfx_cupones del Premium), cfx_sellos_cfg (owner_id, meta 2-30, premio), cfx_sellos (negocio_id, cliente_id, cantidad, premios). RPC: cfx_desc_guardar/borrar/lista, cfx_desc_validar(n, código) (cliente), cfx_sellos_guardar(meta, premio) (meta null = apagar), cfx_sellos_mios(n). Internas para la app: cfx_desc_pct (sin sumar uso), cfx_desc_usar (después de guardar el pedido), cfx_sellos_cfg_de(n), cfx_sello_sumar(n, cliente) (a la meta: vuelve a 0, premios+1 y cfx_sellos_aviso), cfx_fid_borrar(n). Ganchos: cfx_fid_dueno(u), cfx_fid_activo(n, módulo) (Órbita: is_pro), cfx_fid_cliente(u, n) (puede_comprar), cfx_sellos_aviso(n, c, premio).
- Órbita bd 5.33: bloque después de "<<< CFX núcleo" copia calificaciones/cupones/sellos/profiles.sellos_meta+premio → núcleo y borra tablas y columnas; drop de guardar_cupon, borrar_cupon, mis_cupones, validar_cupon, mis_sellos, calificar_pedido. Redefine ahí (sql): estrellas_tienda, tienda_info, mis_pedidos, pedidos_tienda. Editadas en su lugar (plpgsql): set_mi_tienda (llama cfx_sellos_guardar si el módulo está prendido; misma firma), actualizar_pedido, guardar_pedido, ver_pedido, hoy_negocio, mi_respaldo. Trigger borrar_fidelidad en profiles y pedidos (antes lo hacían las FK). JS: cfx_calificar (Pedidos, catálogo y r/), cfx_desc_* (Pedidos → Promociones), cfx_desc_validar y cfx_sellos_mios (catálogo). core.css: body.sin-cupones esconde [data-v=cupones] y .m-cupones; sin-sellos .m-sellos; sin-calificaciones .m-calif.
- Las otras apps (Barbería/BiciTaller/Estaciona con calificaciones propias por reserva/arriendo; Billetera con cupones propios) los adoptan en su turno: ganchos + módulo en cfx_modulos_app + migración después de "<<< CFX núcleo". Sincronizar 2.50 llevó también barra.js arreglado a las 7.

## G14 · B12 caché del SW + B13 tiempo de carga + D21 importar productos + D22 plantillas por rubro · núcleo 2.52 · Órbita 5.88 (bd 5.35) · CM 4.74 (bd 4.23) (08/11/2026)
- B13 (núcleo salud.sql): tabla cfx_cargas (día + página, 30 días, máx. 40 páginas/día); cfx_carga_anotar(p_pagina, p_ms, p_lcp, p_cache) sin cuenta; cfx_salud() devuelve 'carga' (7 días). carga.js mide load + LCP 3 s después de abrir, 1 vez por página y sesión (CFX_CARGA.anotarCarga). CM: Control → 🩺 Salud → ⚡ Carga.
- B12 (Órbita sw.js): instalarVersion con cache 'no-cache' (304 si no cambió); ordenarFotos(): en 'cfx-imagenes' queda la última ?v= de cada foto y máx. 400 (al actualizar, al activar y 1 vez al día al abrir). ayuda.js medido: 117 ms la 1ª vez con CPU ×6, ~15 ms después → no se parte.
- D21 (núcleo respaldo.js): CFX_RESPALDO.leer(archivo) (.xlsx con DecompressionStream, .csv, .txt) y CFX_RESPALDO.csv(texto). Órbita Caja → Productos → 📥 Cargar muchos de una vez: Excel/CSV (busca Nombre, Precio, Categoría, Stock, Costo, Descripción, Opciones), pegar lista o catálogo de WhatsApp, varias fotos (nombre y precio a mano) y ✨ Plantilla. Vista previa editable; los repetidos van sin marcar; respeta el límite del plan; publica, stock y foto.
- D22 (Órbita core.js): PLANTILLAS por rubro + Core.plantilla(rubro).

## G13 · C17 carrito y despacho + C18 limpieza y registro al núcleo + B10 índices + B11 carga diferida · núcleo 2.51 · Órbita 5.87 (bd 5.34) · CM 4.73 (bd 4.22) (08/11/2026)
- nucleo/sql/carrito.sql: cfx_carritos (cliente FK auth.users, negocio sin FK) + cfx_carrito_guardar(n, items) (gancho cfx_carrito_puede(u, n)); internas cfx_carrito_vaciar, cfx_carrito_borrar(cuenta), cfx_carritos_recordar (pg_cron 'cfx-carritos' :23, de 10 a 20 h Chile, módulo 'carrito' = 🛒 Recordar carrito, gancho cfx_carrito_aviso(c, n, k) → bool). Despacho sin tabla: cfx_comuna_norm, cfx_despacho_limpio(cfg) y cfx_despacho_costo(cfg, entrega, dir, monto) (puras, internas).
- nucleo/sql/limpieza.sql: cfx_limpieza()/cfx_limpiar(clave) ahora son del núcleo: ítems "n_…" (registro >180 d, errores >30 d, reportes resueltos >90 d, carritos >30 d) + gancho cfx_limpieza_app()/cfx_limpiar_app(clave) (las 7 apps renombradas). cfx_limpieza_auto() cada noche (pg_cron 'cfx-limpieza' 07:40 UTC) si cfx_config 'limpieza_auto' (por defecto true); última corrida en cfx_salud 'limpieza'. CM: Resumen → tarjeta de la app → 🧹 Respaldo y limpieza → interruptor 🌙 (cfx_limpieza_auto_ver/guardar).
- JS opcional del núcleo: nucleo/tienda.js y nucleo/despacho.js (OPCIONAL en sincronizar.py: solo se copian a Aplicaciones; no se enlazan solos).
- Órbita bd 5.34: carritos → cfx_carritos y auditoria → cfx_registro (copiadas y borradas en el bloque después del núcleo). guardar_carrito/recordar_carritos/costo_despacho/guardar_despacho quedan como envoltorios (la 5.86 sigue andando). auditar() usa cfx_anotar; admin_auditoria devuelve jsonb. Cron 'recordar-carritos' quitado. Índices B10: pedidos pagando/estado, notifications por enviar, push_subscriptions, requests, conexiones, avisos_stock, notification_reads, publicacion_vistas, user_invites. B11: qrcode.js se carga al tocar QR (Core.script).

## CM 4.75 · núcleo 2.53: "Cuenta y ayuda" pegado abajo de Hoy (09/11/2026)
- Bug (usuario normal del CM, red lenta): cuentaEnMas() (nucleo/ayuda.js) corría mientras Más aún cargaba (render espera mi_uso) y, como querySelectorAll devuelve en orden del documento, el ancla era <main> → el bloque quedaba abajo de TODAS las pantallas (Hoy, Pedidos…).
- Arreglo: ancla = .view.on/.vista.on/section.on visible (main solo si no hay vista); espera si la vista está vacía o tiene [data-cfx-menu] (la app montará CFX_MENU ahí; CM: #menuMas); se quita sola al salir de Más o si hay .cfx-mmas visible.
- Solo se copió a SaaS/shared; las otras apps lo reciben en su próxima sincronización. central.js: "CM: Hoy sin menú de cuenta extra tras volver de Más" (con mi_uso lento 1,5 s).

## G15 · E24 Python en GitHub Actions + E25 📊 Analítica en el CM + E27 clientes en riesgo y productos quietos · núcleo 2.54 · CM 4.76 (bd 4.24) · Órbita 5.89 (bd 5.36) (09/11/2026)
- E24 SaaS/.github/workflows/analisis.yml (cron 08:07 UTC + Run workflow; mismos secretos del respaldo: Session pooler de cada app; sin secreto se salta) corre `python3 analisis/analisis.py` (solo librería estándar + psql).
  Lee `cfx_analisis_datos()` (interna), calcula y guarda con `cfx_analisis_guardar(jsonb)` (interna) → tabla cfx_analisis (clave 'app' + una fila por negocio) y cfx_salud 'analisis'.
- Núcleo nucleo/sql/analisis.sql (en sql_comun antes de seguridad): base general de todas las apps (auth.users por día, activos 7/30 d, cfx_pagos aprobados) + gancho `cfx_analisis_datos_app()` → {ventas [{n, c, f, m, l}], clientes {c: {nombre, tel}}, productos [{n, k, nombre, stock, creado}], negocios [{id, nombre, creado, ingreso}]} y gancho `cfx_analisis_negocio(u)` → uuid. `cfx_analisis_app()` (<CHK>, CM) y `cfx_analisis_mio()` (negocio; null si el módulo 'analisis' está apagado). "previo" = stock de anoche (datos.mov): si el stock cambió cuenta como movimiento (ventas de Caja).
- Reglas Python: cliente en riesgo = 2+ días de compra, ritmo = mediana de días entre compras (mín. 7), en riesgo si no compra hace ≥ max(2×ritmo, ritmo+14) y ≤ 180 d (máx. 10, por total gastado). Producto quieto = 30 días sin venta online ni cambio de stock, creado hace 30+ d, con stock (o sin control) (máx. 15). App: usuarios, nuevos 30 d vs 30 anteriores, activos, Premium, ventas/ticket/top 5/negocios dormidos (14 d) y consejos.
- E25 CM: pestaña 📊 Analítica (admin/analitica.js, en Más): lista de apps conectadas + detalle (tarjetas, barras de 30 días con día/valor al tocar, 💡 consejos, 🏆 top). Control → 🩺 Salud muestra "Análisis nocturno".
- E27 Órbita (bd 5.36): ganchos en el bloque 5.36 (antes del núcleo; dueño o equipo admin); módulo 'analisis' en cfx_modulos_app. index.html → Hoy: tarjeta #hoyRecuperar "🔎 Para vender más" (💬 Escribir por wa.me con mensaje listo, productos quietos + 🏷️ Crear promoción / 📦 Ver productos) y tareas en ✅ Qué hacer hoy (data-ir hace scroll).
- Las otras apps: solo números generales hasta que tengan su gancho cfx_analisis_datos_app (Barbería: reservas; BiciTaller: órdenes; etc.) en su turno.
- Pruebas: pruebas/analisis_datos.sql + central.js "Órbita: G15 …" (2) y "CM: 📊 Analítica …".

## G16 · E28 predicción + E29 segmentos y campañas + F30 Estadísticas en vivo · CM 4.77 · Órbita 5.90 (bd 5.37) (09/11/2026)
- CM 4.77: el ícono 'grafico' faltaba en IC de shared/app.js (Más → Analítica salía sin ícono).
- analisis.py (por negocio, sin cambiar SQL del núcleo): `acaba` (stock que alcanza ≤ 14 días; ritmo = máx(unidades online 28 d / 28, ritmo del stock)), `semana` (promedio de 4 semanas con pesos .4/.3/.2/.1 + semana pasada + mejor día de 8 semanas) y `segmentos` {riesgo, perdidos, vip, nuevos, frecuentes, ocasionales} → {total, lista (máx. 30)}. Cada cliente en un solo grupo, en ese orden. VIP = 2+ compras, total ≥ el del top 20 %, compró en 90 d. Perdido = >180 d, o 1 compra hace >90 d.
  mov[k] ahora es [stock, fecha_mov, ritmo/día, fecha_cálculo, días_observados] (lo que baja el stock por día; las subidas son reposición). Compatible con el formato viejo de 2 valores.
- Órbita bd 5.37: estadisticas_tienda() lee la tienda con negocio_de (sirve al equipo admin) y suma hoy {pedidos, monto}, dias (30) y horas (24) de pedidos pagados/entregados.
- Órbita 5.90: Pedidos → Estadísticas (Pro): "Hoy · En vivo" (se refresca cada 30 s si la pestaña está a la vista), 📈 Ventas por día y 🕐 ¿A qué hora te compran? (barras SVG, tocar muestra el valor), 🔮 Esta semana (venderías / semana pasada / mejor día + ⏳ Se acaba pronto) y 👥 Tus clientes (5 grupos; campaña sugerida; 🏷️ Crear cupón VUELVE15/VUELVE20/GRACIAS10/SEGUNDA10 de 14 días, solo dueño y módulo cupones; 💬 WhatsApp con el código). Hoy: ⏳ Se acaba pronto en 🔎 Para vender más + tarea en ✅ Qué hacer hoy (no al vendedor).
- Pruebas: analisis_datos.sql (Café molido y Dora) + central.js "Órbita: G16 predicción y segmentos…" y "Órbita: G16 Estadísticas en vivo…".

## G17 · F31 animaciones y carga + F32 vitrina con SEO y vista previa + F33 modo oscuro y temas por rubro · Órbita 5.91 (bd 5.37, sin SQL) (09/11/2026)
- F32 Órbita: worker.js (raíz) + wrangler.jsonc "main" y assets.run_worker_first ["/t/*"] (binding ASSETS). /t/?s=slug[&p=clave]: pone title, description, canonical, og:* (product con precio CLP), twitter y JSON-LD (Store con dirección, sameAs, estrellas y hasOfferCatalog de 30; o Product con offers). /t/og: logo o foto del producto (data: → bytes; si no hay, icons/icon-512.png). Lee SUPABASE_URL/KEY de shared/config.js; caché en memoria 2 min; si Supabase no responde en 1,5 s manda la página tal cual. robots.txt: Allow /t/.
- t/index.html: ?p=clave abre la ficha; window.CFX_LINK_PRODUCTO(k); tarjetas con data-k. tienda.js (núcleo opcional, copiado a nucleo/): 🔗 Compartir en la ficha si existe CFX_LINK_PRODUCTO; 4 tarjetas esqueleto (.t-sk) si #grid parte vacío; .foto-esq mientras llega la foto; #grid.t-visto apaga la animación de entrada después de la 1ª vez.
- F31: Pedidos #lista parte con "Cargando…" (carga.js lo vuelve esqueleto). Lo demás ya existía (barra de carga, botones ocupado/✓, .view fade, prefers-reduced-motion).
- F33: Core.colorRubro(rubro) (por nombre o primera palabra). Ajustes → Mi tienda: al guardar el rubro sin color elegido, toma el del rubro (set_mi_color). La vitrina sin color usa el del rubro. Core.tema.aplicar: en modo oscuro una marca con luz < 0,3 se aclara 45 % (se recalcula al cambiar el modo o data-theme). El selector claro/oscuro/auto ya estaba en Mi perfil (ayuda.js BASE).
- Pruebas: central.js "Órbita G17: …" (7): Worker con mocks de ASSETS y fetch → sim, ficha por ?p=, oscuro + rubro, esqueleto con red lenta. Capturas vitrina-producto y vitrina-oscuro.

## G18 · G35 WhatsApp Business + G36 catálogo Google/Instagram + G37 webhooks · Órbita 5.92 (bd 5.38) (10/11/2026)
- G37 se decidió alcance A: webhooks salientes (Pro) + lectura pública por el feed JSON. Sin API de escritura (riesgo sin demanda).
- SQL 5.38: tablas `webhooks` (owner_id pk, url, secreto whsec_…, activo, fallos, ultimo_at/status; nadie la lee) y `webhook_envios` (cola: evento, pedido_id, cuerpo, intentos, proximo, estado pendiente|ok|error, status, respuesta; se borra a los 7 días).
  `webhook_url_ok` (https a dominio público: sin IP, localhost, .local/.internal…, sin usuario:clave, solo puerto 443). Trigger `pedidos_webhook` (after insert or update of estado; solo Pro y activo; nunca rompe el pedido) arma `webhook_cuerpo` (pedido, líneas, cliente nombre/teléfono, estado_anterior).
  `webhook_enviar(p_id)` (cron 'webhooks' cada minuto, 25 por vuelta, timeout 5 s, extensión http): headers X-CodeFix-Evento, X-CodeFix-Id, X-CodeFix-Firma t=unix,v1=hex HMAC-SHA256(secreto, t.cuerpo). Reintentos 1, 5, 30 min, 2 h, 12 h (6 intentos); 20 fallos seguidos → pausa + notify_user (./#redes).
  RPC dueño (role user/admin, `webhook_dueno`): `conexiones_estado()` (slug, empresa, telefono, pro, webhook + 10 envíos), `webhook_guardar(url, activo)` (null = quitar), `webhook_secreto_nuevo()`, `webhook_probar()` (ping inmediato, 10 por hora).
- worker.js: `/t/feed?s=slug` RSS 2.0 g:* (id = clave, precio "N CLP", in_stock/out_of_stock, image_link /t/og…&v=, brand, identifier_exists no; solo con precio > 0) y `&f=json` (CORS *). 404 sin tienda; 503 no-store si Supabase no responde. `conCache`: /t/og y /t/feed en caches.default (solo respuestas buenas).
- Órbita 5.92: Ajustes → 📲 Vender en redes (#redes, cRedes): cajas con 📋 Copiar (link, bienvenida, respuesta rápida, wa.me para la bio; link del feed con pasos Google/Meta) + 🔌 Avisos a tu sistema (Pro). docs/webhooks.md (para el programador: cuerpo, firma en Node/Python, reintentos).
- Vitrina: `t.wa_texto` (vitrina.js, opcional: las otras apps quedan igual; copiado solo a Órbita y al núcleo) y `CFX_WA_PRODUCTO(k, nombre, precio, opcion)` en t/index.html → tienda.js muestra 💬 Pedir por WhatsApp en la ficha.
- Pruebas: stub.sql http_log guarda headers. central.js "Órbita G18: …" (3): feed XML/JSON, Pedir por WhatsApp, webhooks (UI + firma + reintento). Capturas redes y redes-oscuro.
- Revisar con Josué: Meta podría no aceptar fotos WebP en el catálogo (Google sí); si las rechaza, ver conversión.
- Arreglos de pruebas (no de las apps): G16 cupón compara con hoy_cl() (antes current_date fallaba de 21 a 24 h de Chile); analisis_datos.sql Carla 92/62 días (con el cambio de hora de septiembre, cerca de medianoche daba cada = 31 y salía de riesgo). central.js: 129 ok.

## G19 · 🧩 Módulos de pago por negocio · núcleo 2.55 · Órbita 5.93 (bd 5.39) · CM 4.78 (bd 4.25) (10/11/2026)
- Estrategia (Josué delegó): Premium barato (negocio $3.000, cliente $2.000: se cambia en CM → Pagos) y las funciones se venden aparte por negocio, sea Free o Premium.
  Tomado de: Shopify/Tiendanube (prueba gratis por app, se activa sola), HubSpot/Zoho (packs bueno-mejor-todo con ahorro grande vs. sueltos), Canva/Notion (el bloqueo aparece donde está la función y lleva a probar),
  Spotify/Duolingo ("⭐ Más elegido" en el pack del medio), Stripe/Shopify (aviso antes de vencer; al vencer se apaga sin borrar datos), anual = 10 meses (2 gratis).
- Precios por defecto (cfx_config 'modulos_venta', se editan en CM): suelto $990/mes; 🌱 Básico $1.990 (cupones, sellos, calificaciones); 🚀 Crecer $2.990 ⭐ (+ chat, carrito, redes, estadísticas); 💎 Completo $3.990 (todos, también los nuevos: '*').
  Premium −20 %. Prueba 7 días: una vez por módulo y un solo pack por negocio. Precio 0 = incluido gratis para todos. Venta APAGADA por defecto = todo igual que antes (las otras apps no cambian).
- Núcleo sql/modulos_venta.sql (va después de modulos.sql): tablas `cfx_modulos_negocio` (negocio, modulo, hasta, origen prueba|pago|regalo, avisado) y `cfx_modulos_pruebas` (negocio, item; packs como 'pack:k').
  `cfx_modulos_catalogo()` (nombre y detalle de 13 claves), `cfx_venta()`, `cfx_venta_on()`, `cfx_venta_precio(k)`, `cfx_venta_activa(k)` (se vende y precio > 0), `cfx_venta_modulos(item)`, `cfx_negocio_cuenta(u)` (gancho opcional `cfx_negocio_de_cuenta`; si no, cfx_analisis_negocio; si no, la misma cuenta),
  `cfx_negocio_premium(n)` (gancho `cfx_es_premium`), `cfx_modulo_de(k, n)`, `cfx_modulo_mio(k)`, `cfx_modulos_de(n)` (anon: lo de una tienda), `cfx_modulos_dar(n, item, días, origen)` (alarga desde lo vigente; ≤ 0 quita), `cfx_modulos_tienda()` (pantalla del negocio),
  `cfx_modulo_probar(item)` (solo el dueño), `cfx_modulos_avisar()` (cron 'cfx-modulos' 13:17 UTC: 3 días antes, una vez), `cfx_modulos_borrar(n)`. CM: `cfx_venta_admin()`, `cfx_venta_guardar(p)` (precios y links llegan completos; nulls se ignoran), `cfx_modulo_regalar(email, item, días)`.
- Núcleo cambiado: pagos.sql (`cfx_pagos.producto`; `cfx_pago_pedir(..., p_producto)` solo dueño, mensual|anual; `cfx_pago_resolver` con producto activa el módulo y no el Premium; lista con producto). modulos.sql (`cfx_modulos()` de un negocio = lo suyo con la venta prendida; admin con precio y nº de negocios).
  fidelidad (con venta: módulo comprado en vez del Pro), chat (si una parte es negocio debe tener el chat; con soporte siempre), calificaciones (por el negocio del pedido), carrito (solo tiendas con el módulo; las demás quedan avisadas), analisis (cfx_analisis_mio).
- Núcleo JS: pagos.js `CFX_PAGOS.abrir({ rpc, producto: { clave, nombre, mensual, anual, links: { m, a } } })` (1 mes / 1 año, link de monto fijo, sin cupón ni key, nunca obligatorio; p_producto solo si hay producto → apps con base vieja siguen igual).
  modulos.js (OPCIONAL de Aplicaciones): `CFX_MODULOS_TIENDA.montar(el, { rpc, alCambiar })`: Mensual/Anual, 3 packs (ahorro vs sueltos, ⭐ Más elegido), sueltos con estado (✅ Activo / 🎁 Prueba hasta), incluidos, aviso Premium.
- Órbita bd 5.39: `pro_o_modulo(n, k)` y `mis_modulos(u)` (junto a is_pro, plpgsql), `limite_equipo(n)` (con módulo: el cupo mayor de los planes). Pasan a módulo con la venta prendida: 📈 estadisticas (estadisticas_tienda), 🧑‍🍳 equipo (prepare_user_invite),
  📣 campanas (schedule_notification y subscribe_negocio), 📲 redes (kit_whatsapp), 🔗 webhooks (trigger, guardar, probar; conexiones_estado trae 'modulo'), 🛒 carrito (cfx_carrito_aviso). Respaldo, finanzas, colores, plantillas y límites siguen en Premium.
  my_account trae `mods`. Ganchos 5.39: cfx_negocio_de_cuenta (user → él; equipo → su negocio; cliente/admin → null), cfx_es_premium = is_pro, cfx_modulos_app con 11 claves. borrar_fidelidad llama cfx_modulos_borrar.
- Órbita 5.93: Ajustes → 🧩 Módulos (#modulos, cModulos, solo dueño y con venta prendida). Cuenta.puede(k) / Cuenta.conModulos(). Bloqueos de cupones/estadísticas (Pedidos), envío automático (Fichas), Vender por WhatsApp (Hoy), equipo y webhooks dicen "🧩" y llevan a #modulos. Al probar o pagar, la app se recarga.
- CM 4.78: Apps → tarjeta → 🧩: 💰 Vender módulos (switch), precio por módulo, precio base, descuento Premium, días de prueba, meses del anual, precio de cada pack, 🔗 links de monto fijo (1 mes / 1 año por módulo y pack), 🎁 regalar/quitar por correo y "Negocios con módulos". Pagos muestra "🧩 módulo".
- Sincronizado SOLO a Órbita y al CM (carpeta temporal con symlinks). Barbería, BiciTaller, Billetera, Estaciona y Cerebro siguen en núcleo 2.54 hasta la próxima sincronización completa (con venta apagada no cambia nada).
- Pendiente (no hecho): cobro automático de módulos con Mercado Pago (preferencia con el monto exacto y activación sola) → necesita el Access Token de producción de CodeFix; hoy es link de monto fijo + comprobante + ✅ en CM → Pagos.
  Equipo con el módulo vencido: sus cuentas siguen entrando (solo no se pueden crear nuevas).
- Pruebas: central.js "Órbita G19: …" (prueba de pack, compra con transferencia, aprobación, anual, seguridad) y "CM G19: …" (precio, guardar, regalar). Capturas modulos, modulos-pagar, modulos-oscuro, cm_modulos_venta.

## Revisión celular de la tienda · núcleo 2.56 · Órbita 5.94 · CM 4.79 (10/11/2026)
**Receta para replicar en cada app (rápido):**
1. `ANCHO=360 node auditoria.js <app>` (barra + Ajustes) y `node celular.js <app>` (TODAS las páginas × 320/360 × claro/oscuro × cada cuenta). Para otra app: agregar su entrada en `APPS` de celular.js (cuentas, datos de ejemplo con nombres LARGOS y precios grandes, y `PAGINAS` por rol).
2. Leer `capturas/celular-<app>.txt` y MIRAR las capturas 320 (lo que el script no ve: palabras partidas, placeholders cortados).
3. Arreglar, repetir con `ANCHOS=320` hasta 0 hallazgos, y central.js.
**Qué revisa celular.js:** se sale del ancho · cortado por el borde (fuera de tiras con scroll) · texto cortado en botón · botones encimados (auditoria.revisar, ahora ignora lo que pasa bajo una franja pegada/fija) · tapado por la barra.
**Arreglos del núcleo (llegan a todas al sincronizar):**
- tema.css: botones/.chip/.pill con `overflow-wrap: normal` (antes heredaban `anywhere` de .card y salía "Efectiv-o", "Comprob-ante"); ≤360 px menos relleno en botones de tarjeta.
- ayuda.js: título de la hoja (.cfx-hm-cab h2) baja de línea en vez de cortarse (nombre largo del producto entero); `tiras()` no convierte en tira deslizable una fila con `flex-wrap: wrap`.
- tienda.js: Agregar/Preguntar apilados y enteros en la grilla de 2 (≤360 px sin ícono).
**Órbita:** Caja → medios de pago con ícono arriba y precio en su propia fila (≤360 px) · vitrina: pestañas Productos/Ofertas/Pedido sin ícono ≤350 px.
**Falsos positivos conocidos:** 409 al subir fichapro.json (dos subidas a la vez en el simulador) · auditoria "avatar visibles: 0" (el avatar ya no va en la cabecera) y "falta ⇄ Panel" (admin de prueba sin admin_email).
**Núcleo 2.56 solo sincronizado a CM y Órbita;** las otras 5 siguen en 2.54 y lo reciben en su turno.

## G20 · Tienda a fondo · núcleo 2.57 · Órbita 5.95 (bd 5.40) · CM 4.80 (bd 4.26) (10/11/2026)
- H1 Bootstrap: nucleo/vendor/bootstrap-utilities.min.css (5.3.8, SOLO utilidades: sin reboot/grid/componentes porque .row/.card/.btn chocan con core.css). sincronizar.py (VENDOR_CSS) lo copia a <css>/vendor/, lo enlaza ANTES de la hoja propia y lo agrega al SW.
  tema.css: --cfx-orilla 16 px (12 px ≤360); tiras .cfx-desliza con padding/scroll-padding en la orilla y difuminado de 22 px; .cfx-redondo (ayuda.js redondos(): botón de solo ícono ≤56 px casi cuadrado); .cfx-nota-btn (texto largo abajo del botón).
- H2 ayuda.js: CFX_AYUDA.iniciar({ avisos: { lista, leer, borrar, limpiar } }) → la campana abre ventanaAvisos() (hoja; filas deslizables con el mismo deslizable(); "Borrar todos"); tocar = unAviso() con título completo, texto, imagen, Abrir/Ver más y ‹ ›.
  Globito = avisos sin leer + chat de soporte. ANTES sumaba pend() de cfx_guia ("Lo que me falta") → por eso seguía marcando. Órbita: cuenta.js pasa my_inbox / mark_notification_read / ocultar_aviso / limpiar_mis_avisos.
- H3 barra.js: deslizar ≥80 px horizontal (<700 ms) cambia de pestaña: primero nav.tabs.sub / [role=tablist] / .seg(s) / .seg2 / .tabs2 / [data-cfx-pestanas] a la vista (la más cercana sobre el dedo); si no, la barra de abajo (sin + ni Más). No actúa en campos, hojas, diálogos, tiras con scroll, avisos deslizables ni a 18 px de la orilla (gesto atrás). Apagar: data-cfx-sin-deslizar. CodeFixBarra.pasar(dir).
- H4 voz.js: CFX_PEDIDO.leer(texto, catalogo, frecuentes) (sirve sin micrófono) y CodeFixVoz.escuchar({ parcial }). Números en palabras ("treinta y cinco", "media docena"), plural/femenino, tildes, 1 letra de diferencia, opción (color/talla). analisis.py → datos.voz (top 40 por unidades 90 días + cantidad típica) por cfx_analisis_mio.
  Órbita Caja: 🎤 junto al buscador → tarjeta "Venta por voz" (frase editable, líneas con cantidad/producto/opción/stock) → Agregar a la venta → Cobrar descuenta stock y deja el comprobante. Frecuentes = ventas de la Caja (90 d) + análisis.
- H5 CM: manifest start_url admin/ + app/ manda al Panel al abrir (sessionStorage cm-abierto). Control → 🏪 Negocios (primera sección; la app se elige arriba): Negocios/Clientes, buscar, +1 mes/+3 meses/+1 año/Quitar, 🔑 Key.
  Núcleo admin.sql: cfx_negocios(q, rol), cfx_premium_cuenta(cuenta, rol, días; 0 = quitar), cfx_key_aplicar(cuenta, rol, email, código). Ganchos por app: cfx_cuentas_app(rol, q) y cfx_quitar_premium(uuid) (Órbita bd 5.40; las otras apps los ponen en su turno: sin ellos se avisa).
- H6 carga.js: ?cfx-limpio=… borra caché + service worker y recarga sin el parámetro. CM 🧪 Probar lo agrega (una página no puede abrir incógnito).
- H7 Aplicaciones/supabase/limpieza/1_contar.sql (solo cuenta: cuentas que se van, admins que quedan, fotos por bucket y filas por tabla/columna uuid) y 2_borrar.sql (borra en todas las tablas public con columnas uuid de esas cuentas, varias pasadas por llaves foráneas, cfx_analisis y auth.users). Quedan admins (role admin o admin_email). Storage se vacía a mano. Probado en local.
- Pruebas: script g20 (campana, deslizar, voz con stock y comprobante) + SQL de Negocios; celular.js 320 sin hallazgos.

## Cómo subir versión en cada app (copia de las reglas, 10/11/2026)
- CM/Cerebro: shared/config.js VERSION/DB_VERSION + db_version en instalar.sql · Billetera: js/core.js VERSION y BD + version_bd · Órbita: shared/core.js APP_VERSION/DB_VERSION + db_version (bloque 5.26) y bloque "VERSIÓN x.y" arriba del último · Barbería: shared/core.js VERSION + db_version en instalar.sql, verificar_20.sql y verificar_actualizacion.sql · Estaciona: sw.js + js/config.js BD + version_bd · BiciTaller: sw.js CACHE + shared/config.js DB_VERSION + schema.sql + node supabase/generar.mjs.
- SQL: set_config($1...) junto a otra función con $1 → castear $1::uuid. _headers solo en nucleo/_headers.
- CM va directo a main desde G20 (sin 🧪 pruebas). ⚠️ Workers Builds "saas" falla al instante desde 92c0d2d (sin detalle en GitHub): ver error en Cloudflare.
