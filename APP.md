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
| `/admin/#control` | 🔔 claves push (+ CM: claves nuevas y 🧪 probar servidor), 📜 Registro (CM: CSV y vaciar), ✉️ Correo, 🌐 Dominio de CodeFix (tiendas: solo mirar), 🛒 app ML de CodeFix · G145: UN solo lugar por cosa |
| `/admin/#ajustes` | Versión, Ajustes generales, Mi cuenta (`#versiones` → Versión · `#registro` → Control → 📜) |
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
Ahora: app 5.55 · bd 4.67 · función 3.7 · núcleo 3.22 (G114: 🐞 Tablero "Mover atrás" ya no hace Volver) (G99 a: ⚡ aviso instantáneo de Mercado Pago, núcleo cfx_mp_notif/cfx_mp_aviso; G98: Mercado Pago de cada negocio en nucleo/sql/mp_negocio.sql). Avisos: CFX_DIALOGO.confirmar/pedir/avisar (nunca confirm/prompt de Chrome).

## Reglas propias
- Bootstrap: solo utilidades (`vendor/`), nunca el completo (choca .btn/.card/.modal/.row/.toast). tema.css mapea --bs-* → --cfx-*.
- El título de cabecera (`.cfx-cab-h h1`) no se adorna.
- Colores nuevos con var(--cfx-*)/var(--brand) (respetan 🎨 Colores a tu gusto).
- G146 (núcleo 3.41): 🛒 CFX_CARRITO en ui.js (montar/poner/mostrar): carrito flotante redondo sobre el menú + ✕ → 🛒 chico en la cabecera; ↑ y barras [data-cfx-sobre-menu] usan --cfx-carro-b (alto real del menú).
- G85: CM → Control elige la app con la 🗂️ caja de apps (MisApps.cajaApps, imágenes en config 'apps_imagenes'). G113: la caja es del núcleo (CFX_CAJA en ui.js, CSS .ca en tema.css); también el filtro de espacios de /app/ (CM.alSelectorEspacio) y el de 🎬 Estudio. CM → Pagos = un solo pago general (link abierto + transferencia) + ⚡ Mercado Pago automático (token en cada app, cfx_mp_*) + 🏷️ Cupones.

- G87 A: Control → Negocios usa cfx_negocios (núcleo) → cfx_cuentas_app(rol, q) + cfx_quitar_premium(uuid) que define CADA app (las 6 + CM ya la tienen). El menú de secciones de Control lleva data-cfx-pestanas (deslizar la página cambia de sección). Tiras con mouse: ayuda.js tiraMouse(). Prueba: pruebas/g87a.js.
- G89 (G87 E/C/J): Apps → 🧹 Respaldo y limpieza → ↺ Ingresos de prueba (cfx_ingresos_cero; no borra pagos). SOCIO = solo agrega: edit_check lo rechaza, agrega_check (avisos con motivo), preparar_borrado no lo deja borrar. Usuarios → Nueva cuenta (WhatsApp +56 9 con CFX_CL.tel, clave temporal, 💬 Enviar por WhatsApp) y 🔑 Clave (función servidor accion 'restablecer', solo admin). Clave temporal = núcleo cfx_clave_temporal + ventana obligatoria en qr.js. Pruebas: g87e.js, g87c.js, g87j.js.
- G131 b: Apps → 🧹 Respaldo y limpieza → 🖼️ Fotos de cuentas borradas (núcleo cfx_fotos_sin_cuenta; el Borrar va por la API de Storage, no por cfx_limpiar). Prueba: g131b.js + cm_apps.js.
- G90: Resumen → 💰 Dinero (admin/dinero.js, núcleo cfx_dinero en cada app; morosos → WhatsApp) · 🔔 cfx_alertas_revisar cada 15 min (negocio nuevo, errores) · Usuarios → + Cuenta elige la app (otras → PanelApps.abrir con { seccion, boton }) · window.CM_SOCIO oculta Liberar/Ajustes/Planes/Textos/imágenes/Dinero · Pagos muestra 🎁/🔑 key_regalo. Pruebas: g90.js, g90b.js, g90c.js.
- G93 (G87 D): Tablero → ✅ Checklists (app/m-checklist.js; items tipo 'checklist' { p, ok, rubro, base } y 'plantilla'; rubro en prefs.rubro; plantillas de fábrica por rubro en FAB, editar = tu copia, ↺ vuelve a fábrica). Control → 📢 Anuncios (admin/anuncios.js; tabla cm_campanas + cm_campana_guardar/publicada/borrar; publica con núcleo cfx_anuncios_publicar en cada app; la tarjeta con ✕ la pone ayuda.js). Ojo: un botón cuyo aria-label EMPIEZA con "volver"/"atrás" hace history.back() (núcleo, G114) → usar otro texto o data-sin-atras. Pruebas: g93a.js, g93b.js.

- G95 (4.53): 🎁 prueba 7 días por botón en el núcleo (pagos.sql cfx_pruebas_usadas por hash de correo, cfx_pro_probar; modulos_venta cfx_negocio_dueno) · Control → 🎁 Pruebas (cfx_pruebas_admin). Prueba: pruebas/g95.js.
- G99 a (5.40 · bd 4.57 · función 3.5 · núcleo 3.07): ⚡ aviso instantáneo de Mercado Pago (núcleo cfx_mp_notif/cfx_mp_aviso; gancho cfx_mp_aviso_url_app en instalar.sql; servidor atiende ?cfx_mp=). Prueba: pruebas/g99.js.
- G108 (5.49 · bd 4.65 · núcleo 3.16): 🔁 Premium/módulos con renovación automática (núcleo pagos.sql cfx_mp_suscribir/cfx_mp_sub_*, preapproval de MP con el token de CodeFix; pagos.js casilla 🔁 Renovar solo). CM → Pagos → ⚡ Mercado Pago → 🔁 Renovaciones automáticas (cfx_mp_subs_admin en las 7). Prueba: pruebas/g108.js.

## 🎬 Estudio (G94, bd 4.52)
- App → Cerebro → 🎬 Estudio (solo rol admin): app/m-estudio.js (+ app/est-motor.js y app/est-importador.js, copias de Contenido/app; cargan a pedido). items est_conf / est_base / est_idea (constraint items_tipo_check). Prueba: pruebas/g94a.js.
- Núcleo: catálogo de módulos +8 (Billetera: acuerdo, contador, escalonado, gastos_fijos · Estaciona: destacar, acceso, descuentos, ganancias) en nucleo/sql/modulos_venta.sql + demos en nucleo/modulos.js.
- 🎬 G112 d · est-motor.js y est-importador.js pasaron al núcleo (shared/): el 🎬 Estudio del CM (app/m-estudio.js) los carga de ../shared/. Los negocios de las 5 apps tienen el mismo motor como módulo 'estudio' (núcleo estudio.js + sql/estudio.sql).
- G140 (núcleo 3.36): Mi perfil → 🎨 Personalizar (ex Color y modo): temas listos, barra de abajo (tipo/tamaño/nombres), ↩️ de fábrica; se guarda en public.cfx_personal (nucleo/sql/personal.sql). Prueba: SaaS/pruebas/g140.js.
- 📱 G141 (núcleo 3.37): 🔗 Mis redes (CodeFixVitrina.redes + nucleo/sql/redes.sql, gancho cfx_redes_llave_app en instalar/schema) y 🎬 Estudio por link + 📸 pantallazo + 📊 gráficos + 💡 ideas sin base (nucleo/est-links.js). Pruebas: SaaS/pruebas/g141.js, g141b.js.
- 🛡️ G144 (núcleo 3.40): sin fila "Panel de administración" ni limpieza/respaldo dentro de la app (todo en CM → Apps) · .cfx-num/.cfx-redondo (círculo perfecto) · 🎤/⬜ = íconos de línea · 💬 WhatsApp del registro → Mis redes (cfx_redes_con_wa; gancho cfx_whatsapp_app donde aplica; uno solo, el botón antiguo se oculta con redes.unWa) · .assetsignore: notas, SQL y pruebas NO se publican.
- 🙂 G148 (5.77, núcleo 3.43): perfiles sin ícono → foto o la letra del nombre (el ícono guardado se conserva, no se muestra).
