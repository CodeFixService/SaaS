# APP.md · 🛸 Centro de Mando (CM)

Leer esto antes que el código (G42j). Repo SaaS · id `mando` · Supabase vqevujjraisrcoirswuq.
⛔ El CM es de Josué: NO lleva 🧩 módulos ni candados. Aquí vive el **núcleo original** (`nucleo/`).

## Qué hace
1. **Administración de las 6 apps** (`/admin/`, solo admin y socio): liberar versiones, usuarios, pagos, soporte, analítica, control y el panel propio de cada app.
2. **App personal de Josué** (`/app/`): Hoy, Pedidos, Metas, Tablero, Insights, Panel, Más (+ Cerebro interno).

## Pantallas
| URL | Qué es |
|---|---|
| `/` | Entrada (logo con 2 órbitas 🌌). Admin/socio → `/admin/`, el resto → `/app/` |
| `/admin/#resumen` | Resumen · Empresas · 🧹 Limpiar |
| `/admin/#apps` | Una tarjeta por app: versión, bd, 🚀 Liberar, ↗ Abrir app, 🧭 panel de la app · 🧩 venta de módulos de ESA app (precios, packs, 🎁 Campaña de lanzamiento G74 b, 🎁 Regalar) |
| `/admin/#usuarios` `#pagos` `#mensajes` `#analitica` | Usuarios, pagos, soporte (💬 chat + 🐞 Fallas reportadas con 🎁 15 días, G55) y análisis nocturno de las 6 apps |
| `/admin/#control` | 🔔 claves push, 📜 Registro, ✉️ Correo (Gmail + clave 16 letras), funciones cfx_* comunes |
| `/admin/#ajustes` | Ajustes (Registro y Versiones también por `#registro` / `#versiones`) |
| `/app/#hoy` `#pedidos` `#metas` `#tablero` `#insights` `#panel` `#mas` | App personal (CM.ir(hash)) |

## Archivos clave
- `admin/admin.js` (rutas y permisos), `apps.js` (liberar), `control.js`, `pagos.js`, `mensajes.js`, `analitica.js`.
- `admin/panel.js` + `panel-<app>.js`: panel de cada app (solo lo propio, G42f). Panel nuevo → `<script>` en admin/index.html + FILES de sw.js.
- `app/cm.js` (núcleo de la app personal), `app/m-*.js` (una pantalla cada uno), `app/estilo.js`.
- `shared/app.js` (conexión, sesión, push), `shared/config.js` (VERSION/DB_VERSION; ⚠️ tiene el correo: solo Edit).
- `shared/galaxia.css` 🌌 SOLO CM (después de tema.css): estrellas en oscuro, órbitas, degradados. Se apaga con 🎨 fondo propio y con reduced-motion.
- `nucleo/` = original del núcleo (JS, tema.css, sql/, vendor/). `nucleo/sincronizar.py <carpeta padre>` lo copia a las 6 apps (NUNCA a Contenido). Versión en `nucleo/nucleo.json`.
- `supabase/instalar.sql` (bd; db_version l.147) · `supabase/functions/servidor` (versión "funcion" en version.json).
- `analisis/analisis.py` + `.github/workflows/` (análisis, respaldo y salud nocturnos).
- `pruebas/`: central.js (132 ok), celular.js (`node celular.js saas`), g4x_*.js por punto, base.sh, h.js.

## Tablas propias (además de las cfx_* del núcleo)
perfiles, espacios, items, pedidos/pagos, planes, config, textos, notificaciones, push_subs, secretos, invitaciones, vinculos, compartidos, compartido_log, cm_puentes, uso_dia, auditoria.

## Versiones
`shared/config.js` VERSION/DB_VERSION + `version.json` (notas = SOLO categorías G44b) + `instalar.sql` l.147.
Ahora: app 5.34 · bd 4.51 · función 3.4 · núcleo 3.02. Avisos: CFX_DIALOGO.confirmar/pedir/avisar (nunca confirm/prompt de Chrome).

## Reglas propias
- Bootstrap: solo utilidades (`vendor/`), nunca el completo (choca .btn/.card/.modal/.row/.toast). tema.css mapea --bs-* → --cfx-*.
- El título de cabecera (`.cfx-cab-h h1`) no se adorna.
- Colores nuevos con var(--cfx-*)/var(--brand) (respetan 🎨 Colores a tu gusto).
- G85: CM → Control elige la app con la 🗂️ caja de apps (MisApps.cajaApps, imágenes en config 'apps_imagenes'). CM → Pagos = un solo pago general (link abierto + transferencia) + ⚡ Mercado Pago automático (token en cada app, cfx_mp_*) + 🏷️ Cupones.

- G87 A: Control → Negocios usa cfx_negocios (núcleo) → cfx_cuentas_app(rol, q) + cfx_quitar_premium(uuid) que define CADA app (las 6 + CM ya la tienen). El menú de secciones de Control lleva data-cfx-pestanas (deslizar la página cambia de sección). Tiras con mouse: ayuda.js tiraMouse(). Prueba: pruebas/g87a.js.
- G89 (G87 E/C/J): Apps → 🧹 Respaldo y limpieza → ↺ Ingresos de prueba (cfx_ingresos_cero; no borra pagos). SOCIO = solo agrega: edit_check lo rechaza, agrega_check (avisos con motivo), preparar_borrado no lo deja borrar. Usuarios → Nueva cuenta (WhatsApp +56 9 con CFX_CL.tel, clave temporal, 💬 Enviar por WhatsApp) y 🔑 Clave (función servidor accion 'restablecer', solo admin). Clave temporal = núcleo cfx_clave_temporal + ventana obligatoria en qr.js. Pruebas: g87e.js, g87c.js, g87j.js.
- G90: Resumen → 💰 Dinero (admin/dinero.js, núcleo cfx_dinero en cada app; morosos → WhatsApp) · 🔔 cfx_alertas_revisar cada 15 min (negocio nuevo, errores) · Usuarios → + Cuenta elige la app (otras → PanelApps.abrir con { seccion, boton }) · window.CM_SOCIO oculta Liberar/Ajustes/Planes/Textos/imágenes/Dinero · Pagos muestra 🎁/🔑 key_regalo. Pruebas: g90.js, g90b.js, g90c.js.
- G93 (G87 D): Tablero → ✅ Checklists (app/m-checklist.js; items tipo 'checklist' { p, ok, rubro, base } y 'plantilla'; rubro en prefs.rubro; plantillas de fábrica por rubro en FAB, editar = tu copia, ↺ vuelve a fábrica). Control → 📢 Anuncios (admin/anuncios.js; tabla cm_campanas + cm_campana_guardar/publicada/borrar; publica con núcleo cfx_anuncios_publicar en cada app; la tarjeta con ✕ la pone ayuda.js). Ojo: un botón con "volver" en su aria-label hace history.back() (núcleo) → usar otro texto o data-sin-atras. Pruebas: g93a.js, g93b.js.
