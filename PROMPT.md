G26

ROL: Proyecto CodeFix (Josué, ing. informático, Chile). Respuestas CORTAS y precisas. Josué usa el teléfono: pasos uno por uno, con lo que hay que pegar listo, diciendo QUIÉN lo ve (cliente/negocio/administrador) y DÓNDE (menú y botón exactos). Prompt actualizado SIEMPRE en bloque de código, COMPLETO (máx. ~8.000 caracteres). Si dice "no hagas código": solo analizar. Si propone algo: 1 línea NECESARIO/ÚTIL/INNECESARIO + por qué. Si delega: decidir con buenas prácticas y avisar. Si responde "OK" o pide solo OK: contestar OK. Si el chat se alarga, avisar y partir otro. Lento pero seguro: probar como lo prueba Josué antes de decir "listo".

LISTA MAESTRA: SaaS/PLAN.md → sección "G24" (y G25) (leer al empezar, marcar ✅). Detalle: SaaS/MEMORIA.md (G20, G22, G23). Guía para Josué: SaaS/LANZAMIENTO.md (actualizarla con lo que cambie).

ESTADO (11/11/2026): TODO en main. núcleo 2.61 · CM 4.85 (bd 4.27) · Órbita 6.01 (bd 5.42) · Barbería 2.76. Builds OK. Cloudflare avisa por correo si un build falla; si sale mal: git revert en main (nunca force-push).

HECHO EN G24:
- M1 (parcial): núcleo modulos.js CFX_MODULOS_TIENDA.probar(clave,{rpc,alCambiar}) = hoja con DEMO animada (datos de ejemplo, no toca el negocio) + 🎁 Activar 7 días gratis + Comprar + Cerrar/✕; .candado(el,clave,o) = aviso "▶️ Probar módulo" (false si el módulo está apagado para todos → "no disponible"). Órbita: candado en Mensajes (chat), Pedidos (cupones/estadísticas), Ajustes (equipo, sellos), Hoy (📣 redes), Fichas (campañas); cuenta.js no esconde chat/cupones/sellos al dueño si se venden. Botones de packs "▶️ Probar"/"Comprar" en una línea; Mi plan: cada precio entero (no corta "al año").
- T1 🧹 CM → Apps → "🧹 Limpiar y abrir" en cada app: abre https://<worker>.juanjosuecastilloloyola.workers.dev/?cfx-limpio=1&cfx-cero=1 → núcleo carga.js borra caché, service worker, localStorage, sessionStorage, IndexedDB y cookies y abre como recién instalada (sin incógnito).
- Barbería: faltaba wrangler.jsonc (sus builds de ramas ≠ main fallaban). Agregado igual al de SaaS.
- Pruebas: pruebas/g24_modulos.js, g24_limpiar.js.

HECHO EN G25: ▶️ Probar = solo ejemplo (sin 🎁 gratis) · Ajustes: Tu tienda (Pagos, Despacho, Boletas, 🌐 Mi dominio, Equipo) / Vender más (Redes) / ⭐ Mi plan y módulos (una hoja; #modulos abre ahí) · 🧾 Detalle de compra (Pedidos y Mis pedidos del cliente, con N° boleta SII) · B1 ✅ B2 ✅ (FAQ) B3 ✅ (CFX_REF_RUTA='n/' en config.js) · ⏰ bd 5.42: todo Pro vence por fecha (trigger profiles_vence), nunca permanente. Pruebas: g25_ui.js, central.js 131 ok.

ORDEN (lo que falta):
1. Josué prueba con 🧹: CM 4.85, Órbita 6.01, Barbería 2.76 + ⚡ Actualizar base (Órbita 5.42).
2. M2 💳 UN link de pago ABIERTO (sin monto) para Premium, módulos y packs: muestra el monto con 📋 Copiar + comprobante; los de monto fijo siguen sirviendo.
3. M3 🌐 Dominio: Josué compra dominio en Cloudflare; ver Cloudflare for SaaS (custom hostnames) para que el negocio solo pegue un CNAME.
4. L1 🧹 LIMPIEZA FINAL con aviso (supabase/limpieza/1_contar → 2_borrar + Storage) + guía "Tu negocio en 5 minutos".
5. Revisión celular (celular.js 320/360, claro/oscuro, MIRAR capturas) y central.js → 🚀.
6. ⏰ Renovación obligatoria en las otras apps cuando se retomen.
DESPUÉS: Khipu/Flow/Webpay, courier, stock con Mercado Libre, factura 33, gift cards, sucursales, suscripciones. Otras apps en pausa.

REPOS (CodeFixService, en /home/user): SaaS = Centro de Mando (CM); nucleo/ es el original, sincronizar.py lo copia · Aplicaciones = Órbita (TIENDA) · Emprendedor = Billetera · Barberia · Taller = BiciTaller · Estacionamiento = Estaciona · Contenido = Cerebro. Stack: Supabase gratis + Cloudflare Workers (Workers Builds) + GitHub.

PUBLICAR (todas las apps igual):
- central.js OK → git push origin HEAD:main → esperar check-runs de main → recién ahí rama de sesión (si se empuja la rama de sesión antes, el check que se ve es el de la rama ccr-*, que siempre falla).
- Check-runs: curl api.github.com/repos/CodeFixService/<repo>/commits/<sha>/check-runs (script con until + sleep 15, sin sleep suelto).
- Josué: CM → Apps → app → 🧹 Limpiar y abrir → prueba → 🚀 Liberar. Con SQL: la base se actualiza sola (máx. 10 min) o ⚡ Actualizar base ahora.
- Si sale mal: git revert en main.

EDGE FUNCTIONS: Órbita/Billetera/Barbería/Estaciona enviar; CM/BiciTaller/Cerebro servidor. Josué la borra, crea con el MISMO nombre, Verify JWT APAGADO, pega import 'https://raw.githubusercontent.com/CodeFixService/<repo>/<sha>/supabase/functions/<f>/index.ts'; → Deploy.

NÚCLEO 2.61 (CM, Órbita, Barbería; las otras en 2.54): modulos.js (probar/candado), carga.js (?cfx-limpio, ?cfx-cero), despacho.js + carrito.sql resto de Chile; vitrina.js políticas; modulos_venta 'medicion','dominio'; pagos.js CFX_PAGOS.abrir({producto}); ayuda.js, barra.js, voz.js, tienda.js.
ÓRBITA 6.01 (bd 5.42, bloques al FINAL de instalar.sql; 5.42 = profiles_vence): pedido_seguimiento, pedido_correo, set_mi_perfil con políticas, medicion/dominio; worker.js "/" dominio→vitrina. Ajustes por hash: #links #equipo #despacho #boleta #redes #modulos #plan.

REGLAS:
- No dañar lo existente; solo lo pedido; revisar si ya existe. Lo reutilizable va UNA vez en el núcleo; lo que se cobra va como 🧩 módulo; con la venta apagada no cambia nada.
- Subir versión de cada app tocada: Órbita shared/core.js APP_VERSION/DB_VERSION + version.json (+ db_version y cabecera "VERSIÓN x.y" al final de instalar.sql si hay SQL). CM: shared/config.js + version.json. Barbería: shared/core.js VERSION + version.json. Núcleo: nucleo/nucleo.json.
- Archivo nuevo en shared/ de Órbita → FILES de sw.js.
- Núcleo tocado → sincronizar a CM, Órbita, Barbería (carpeta temporal con symlinks saas, Aplicaciones, barberia → python3 SaaS/nucleo/sincronizar.py <carpeta>; luego git checkout icons/badge.png).
- innerHTML: CFX_ESC/CFX_URL o Core.esc. Tabla nueva → pruebas/inventario.py --verificar.
- SQL: re-ejecutable; {error} sin raise; HTTP saliente con extensión http, nunca en trigger. Solo admin → perform <CHK>; interna → revoke from public, anon, authenticated.
- UI: títulos cortos; texto largo → .cfx-nota-btn; probar 320 px y oscuro. No rm con globs.

PRUEBAS: probar COMO JOSUÉ (guardar → recargar → ver). Script chico por punto en SaaS/pruebas. Antes: ./base.sh /home/user/Aplicaciones <bd>. central.js (131 ok) antes de cada push: ./base.sh /home/user/barberia barberia_prueba && node central.js; echo FIN (en fondo + until grep FIN). Órbita de prueba: localStorage cfx:tour:orbita-inicio='1'.

ENTORNO: ln -s en /home/user: saas→SaaS, emprendedor→Emprendedor, barberia→Barberia, taller→Taller, estacionamiento→Estacionamiento, contenido→Contenido. Postgres 16 (B=/usr/lib/postgresql/16/bin): useradd postgres; mkdir -p /var/tmp/pgdata /var/tmp/pgb; chown postgres; initdb -A trust; pg_ctl -o '-k /var/tmp/pgb -p 54329' start. cd SaaS/pruebas && npm i. wrangler para revisar builds: npm i wrangler@4 en /tmp y wrangler deploy --dry-run. Sin red a Supabase/workers.dev.

SUPABASE: CM vqevujjraisrcoirswuq · Órbita gilsamacgappycibcqhq · Barbería gxlabxuttnxvzkucckef · Billetera zbgfvxsqajtixjzxoxeu · BiciTaller iwvjthcmufirbnotgixi · Estaciona wphxtspicejywwzlbuux · Cerebro vndqseptmymgqyxumbqy.
WORKERS: <nombre>.juanjosuecastilloloyola.workers.dev (saas, aplicaciones, barberia, emprendedor, taller, estacionamiento, contenido).
VERSIONES: núcleo 2.61 · CM 4.85 (bd 4.27) · Órbita 6.01 (bd 5.42) · Barbería 2.76 · Billetera 1.21.49 · BiciTaller 2.72 · Estaciona 2.14.51 · Cerebro 1.56.

PENDIENTE DE JOSUÉ: probar con 🧹 y avisar · Gmail en Órbita (Administración → Ajustes → Correo) · Access Token producción MP · probar 1 boleta real.
