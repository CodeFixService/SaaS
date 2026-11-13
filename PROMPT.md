G36 · CodeFix (Josué, ing. informático, Chile)

ROL: Respuestas CORTAS. Josué usa el teléfono: pasos uno por uno, lo que pega listo, QUIÉN (cliente/negocio/administrador) y DÓNDE (menú y botón exactos). Prompt actualizado SIEMPRE en bloque de código, COMPLETO (máx. ~8.000 caracteres). "No hagas código" = solo analizar. Si propone algo: 1 línea NECESARIO/ÚTIL/INNECESARIO + por qué. Si delega: decidir y avisar. "OK" → OK. Chat largo → avisar y partir otro. Lento pero seguro: probar como Josué antes de decir "listo". AHORRAR: grep/sed -n, agrupar, no releer; Python largo → scratchpad. FUSIONAR: lo que vaya junto se hace en una pasada; lo que Josué pega va en UN paso al final.
🧩 Cada módulo independiente (pro_o_modulo/Cuenta.puede). Ultra intuitivo: cada pantalla dice qué pasa + 1 botón claro. Lo reutilizable → núcleo (1 vez) para todas las apps.
PRIORIDAD: primero lo pendiente; mejoras nuevas → PLAN.md y al FINAL (salvo que convenga ya: avisar). Meta: TIENDA (Despega Pyme, ex Órbita) lista.
REGLA G33: en boleta, pagos, NFC, impresora, dominio e integraciones, Claude ELIGE la opción más recomendada y avisa (una sola).
REGLA G31: vender IGUAL con o sin RUT; solo cambia el comprobante. Nunca exigir RUT.
⛔ CEREBRO (Contenido): NO tocar. Al sincronizar núcleo NUNCA incluir contenido.

LISTA MAESTRA: SaaS/PLAN.md (grep -n "G3[2-9]\|L1", marcar ✅). Detalle: SaaS/MEMORIA.md (tail). Guía Josué: SaaS/LANZAMIENTO.md (actualizarla).

ESTADO (14/11/2026, todo en main): núcleo 2.66 · CM 4.94 (bd 4.29) · Despega Pyme 6.09 (bd 5.46) · Barbería 2.82 (bd 2.75). central.js 132 ok.
HECHO G32 d+f: 🔑 QR en CM/Barbería + 🔒 3 claves malas → enlace al correo (núcleo qr.sql + qr.js CFX_QR.clave/despues; Edge ya pegadas). Prueba g32_clave.js cm|bar|orb. Detalle MEMORIA "G32 d+f".
HECHO G33 ✏️: nombre visible "Despega Pyme" (ids, repo, Worker, Supabase e ícono sin cambio).
CM DESPLIEGUE: falló del 11/11 al 14/11 por "Cloudflare API unknown error" (no código). 14/11 354ee2d = success (CM 4.94 en línea). Si se repite: Josué reintenta ESE commit (Reintentar en un build viejo publica código viejo).

PENDIENTE DE JOSUÉ (paso 3-4 de G32): SMTP Gmail en Supabase de las 3 apps (contraseña de aplicación: myaccount.google.com/apppasswords) + Redirect URLs (Authentication → URL Configuration → Add URL: https://<aplicaciones|saas|barberia>.juanjosuecastilloloyola.workers.dev/**) → probar QR + 🔒 → 🚀 Liberar. Edge Functions ya pegadas.

HACER AHORA (en orden, fusionando):
1) G33b ✏️ "Fichas" → "Diseños" en Despega Pyme: menú index.html (l.~575), título apps/fichas, landing n/, catálogo, pedidos, planes ("60 diseños"), textos (~125, git grep -n -i ficha; concordancia: un diseño, tus diseños publicados). Ruta apps/fichas/ e ids sin cambio.
2) G33 🌐 Dominio desde el panel (CM → Control → 🌐 Dominio): dominio universal CodeFix (codefix.cl o appcodefix.cl en nic.cl) + token Cloudflare 1 vez (secreto en "servidor") → Custom Domains por subdominio (despega., cm., barberia., billetera., bicitaller., estaciona.); links/QR/correos/manifest usan cfx_config 'dominio_base' (vacío = workers.dev). Checklist ⏳/✅ con los 2 nameservers para nic.cl. Dominio del negocio: CNAME tiendas.<dominio_base> + Custom Hostname por API.
3) G34 🧭 Panel universal en el CM: inventariar paneles admin (Despega apps/admin, Barbería, Billetera, BiciTaller, Estaciona) → lo que falta a CM → Apps → cada app (+ QR) → probar → recién ahí quitar el panel. Admin NO se borra: si public.admin_email() entra en una app → directo al CM. Sin Cerebro.
4) G35 🧩 Billetera, BiciTaller, Estaciona → núcleo 2.66 con modulos.js + qr.js (+ 🔒 clave en su ingreso, iniciar como CM app.js; ayuda.js trae "Despega Pyme"). Sin Cerebro.
5) G36 🔄 Actualizaciones (núcleo): admin → se instala sola al publicar; usuarios → al liberar, aviso con botón "🔄 Actualizar". Ver Aplicaciones/shared/cuenta.js revisarActualizacion + núcleo auto.js; probar ambos roles en todas.
DESPUÉS (ver PLAN): L1 limpieza · revisión celular · INDUCCION.md · G37 · G38 · G39 · Khipu/Flow/Webpay, courier, factura 33, sucursales. AL FINAL: G32 e) 💳 NFC.

REPOS (CodeFixService, /home/user): SaaS = CM (nucleo/ original; admin/apps.js = CM → Apps; admin/control.js = Control) · Aplicaciones = Despega Pyme · Emprendedor = Billetera · Barberia · Taller = BiciTaller · Estacionamiento = Estaciona · Contenido = Cerebro (NO tocar). Stack: Supabase gratis + Cloudflare Workers Builds + GitHub.

PUBLICAR: 1) central.js OK 2) git push origin HEAD:main 3) check-suites del sha (app cloudflare-workers-and-pages: success; check-runs puede mostrar solo uno) 4) push a la rama de sesión. Error de código → git revert en main (nunca force-push). Error "Cloudflare API unknown error" → Josué reintenta ESE commit. Josué: CM → Resumen → Empresas → app → 🧹 Limpiar y abrir → prueba → CM → Apps → 🚀 Liberar (SQL: sola en 10 min o ⚡ Actualizar base).
EDGE: Despega/Billetera/Barbería/Estaciona "enviar"; CM/BiciTaller "servidor". Josué: borra, crea MISMO nombre, Verify JWT APAGADO, pega import 'https://raw.githubusercontent.com/CodeFixService/<repo>/<sha>/supabase/functions/<f>/index.ts'; → Deploy.

VERSIONES (dónde): Despega shared/core.js APP_VERSION/DB_VERSION + version.json; SQL: db_version() ~l.5362 + cabecera VERSIÓN ~5427 (cfx_tablas ~7067). CM shared/config.js VERSION/DB_VERSION + version.json, instalar.sql l.147. Barbería shared/core.js l.11 + version.json ("bd") + instalar.sql l.21. Núcleo nucleo/nucleo.json. SQL del núcleo cambia la bd de CM, Despega y Barbería.

REGLAS:
- No dañar lo existente; solo lo pedido; revisar si ya existe.
- Subir versión de cada app tocada (ver arriba).
- Archivo nuevo en shared/ → FILES de sw.js (OPCIONAL no se agrega solo).
- Núcleo tocado → scratchpad/sync con symlinks SOLO saas, Aplicaciones, barberia (+ emprendedor, taller, estacionamiento desde G35) → python3 SaaS/nucleo/sincronizar.py <carpeta>; luego git checkout icons/badge.png. OPCIONAL qr.js: Aplicaciones, saas, barberia.
- innerHTML: CFX_ESC/CFX_URL o Core.esc. Tabla nueva → python3 pruebas/inventario.py <repo> --verificar.
- SQL re-ejecutable; {error} sin raise; HTTP con extensión http, nunca en trigger. Solo admin → perform public.cfx_es_admin(); interna → revoke from public, anon, authenticated.
- UI: textos cortos; probar 320 px y oscuro. iconos.js cambia emojis por íconos (en pruebas no buscar el emoji).

PRUEBAS: como Josué (guardar → recargar → ver). Script por punto SaaS/pruebas/g3x_xxx.js (modelo g32_clave.js), que FALLE con el código viejo. Antes ./base.sh /home/user/<repo> <bd>. Edge simuladas: abrir(repo, bd, {funciones:{enviar: async (b,u,{su})=>…}}). Enlace mágico: fetch <sb.supabaseUrl>/auth/v1/verify {token_hash:'th-<id>'} → about:blank → /#access_token=…&type=magiclink. Despega: clave ≥ 6, localStorage cfx:tour:orbita-inicio='1'. Barbería: usuario vía user_invites (owner). RUT 76.123.456-0. Admin = public.admin_email(). URLs externas: page.route. central.js: (./base.sh /home/user/barberia barberia_prueba && node central.js; echo FIN) > log (~4 min, 132 ok). Capturas pruebas/capturas/<repo>/ (MIRARLAS).

ENTORNO /home/user: for p in saas:SaaS emprendedor:Emprendedor barberia:Barberia taller:Taller estacionamiento:Estacionamiento contenido:Contenido; do ln -s ${p#*:} ${p%%:*}; done. Postgres 16 (B=/usr/lib/postgresql/16/bin): mkdir -p /var/tmp/pgdata /var/tmp/pgb; chown postgres ambos; su postgres -c "$B/initdb -A trust -D /var/tmp/pgdata"; su postgres -c "$B/pg_ctl -D /var/tmp/pgdata -o '-k /var/tmp/pgb -p 54329' -l /var/tmp/pg.log start". cd SaaS/pruebas && npm i. Sin red a Supabase/workers.dev/nic.cl/dash.cloudflare.

SUPABASE: CM vqevujjraisrcoirswuq · Despega gilsamacgappycibcqhq · Barbería gxlabxuttnxvzkucckef · Billetera zbgfvxsqajtixjzxoxeu · BiciTaller iwvjthcmufirbnotgixi · Estaciona wphxtspicejywwzlbuux.
WORKERS: <nombre>.juanjosuecastilloloyola.workers.dev (saas, aplicaciones, barberia, emprendedor, taller, estacionamiento).
VERSIONES: núcleo 2.66 · CM 4.94 · Despega 6.09 · Barbería 2.82 · Billetera 1.21.49 · BiciTaller 2.72 · Estaciona 2.14.51.
OTROS DE JOSUÉ: dominio en nic.cl · INAPI "Despega Pyme" 35/42 · link general MP (CM → Pagos) · Gmail en Despega (remitente "Despega Pyme") · Access Token producción MP · openfactura.cl + 1 boleta real.
