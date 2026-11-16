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
Ahora: app 5.10 · bd 4.33 · función 3.2 · núcleo 2.79. Avisos: CFX_DIALOGO.confirmar/pedir/avisar (nunca confirm/prompt de Chrome).

## Reglas propias
- Bootstrap: solo utilidades (`vendor/`), nunca el completo (choca .btn/.card/.modal/.row/.toast). tema.css mapea --bs-* → --cfx-*.
- El título de cabecera (`.cfx-cab-h h1`) no se adorna.
- Colores nuevos con var(--cfx-*)/var(--brand) (respetan 🎨 Colores a tu gusto).
