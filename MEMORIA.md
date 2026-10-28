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
