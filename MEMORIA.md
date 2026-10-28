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
  1. Limpieza y respaldo: borrar chats y notificaciones (cualquier cuenta); borrado automático a los 30 días con aviso 2 días antes; respaldo descargable por empresa; el admin respalda y borra registros/comprobantes; recordar eliminar productos/servicios sin stock o que ya no se ofrecen; inventario de tablas/config sobrantes (borrar solo lo vacío o sin uso; lo que tenga datos, mostrar al dueño con respaldo y pedir "sí").
  2. Pagos ordenados: mensual, anual y "otro pago" personalizado (admin y cada negocio).
  3. Interruptores de funciones por plan (como Barbería) en las 6 + completar funciones de admin que faltan (textos editables, avisos masivos, socios, keys/cupones, registro, planes) + pasar a global las exclusivas que sirvan (verificación de identidad solo en Estaciona).
  4. Centro de Mando como súper panel (control rápido de cada app: liberar, avisar a todos, precios, textos).
  5. Cuentas de clientes con sensación Premium; verificación humana (Cloudflare Turnstile) cuando el dueño lo configure.
  6. Al final: descripción de cada app para entregar a clientes + las 6 consultas para pegar.
