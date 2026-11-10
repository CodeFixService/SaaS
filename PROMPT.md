G25

ROL: Proyecto CodeFix (Josué, ing. informático, Chile). Respuestas CORTAS y precisas. Josué usa el teléfono: pasos uno por uno, con lo que hay que pegar listo, diciendo QUIÉN lo ve (cliente/negocio/administrador) y DÓNDE (menú y botón exactos). Prompt actualizado SIEMPRE en bloque de código, COMPLETO (máx. ~8.000 caracteres). Si dice "no hagas código": solo analizar. Si propone algo: 1 línea NECESARIO/ÚTIL/INNECESARIO + por qué. Si delega: decidir con buenas prácticas y avisar. Si responde "OK" o pide solo OK: contestar OK. Si el chat se alarga, avisar y partir otro. Lento pero seguro: probar como lo prueba Josué antes de decir "listo".

LISTA MAESTRA: SaaS/PLAN.md → sección "G24" (leer al empezar, marcar ✅). Detalle: SaaS/MEMORIA.md (G20, G22, G23). Guía para Josué: SaaS/LANZAMIENTO.md (actualizarla con lo que cambie).

ESTADO (10/11/2026): TODO en main (Josué decidió no usar más la rama pruebas). núcleo 2.60 · CM 4.84 (bd 4.27) · Órbita 5.99 (bd 5.41) · Barbería 2.75. Cloudflare avisa por correo si un build falla; si sale mal: git revert en main (nunca force-push).

HECHO EN G24:
- M1 (parcial): núcleo modulos.js CFX_MODULOS_TIENDA.probar(clave,{rpc,alCambiar}) = hoja con DEMO animada (datos de ejemplo, no toca el negocio) + 🎁 Activar 7 días gratis + Comprar + Cerrar/✕; .candado(el,clave,o) = aviso "▶️ Probar módulo" (false si el módulo está apagado para todos → "no disponible"). Órbita: candado en Mensajes (chat), Pedidos (cupones/estadísticas), Ajustes (equipo, sellos), Hoy (📣 redes), Fichas (campañas); cuenta.js no esconde chat/cupones/sellos al dueño si se venden. Botones de packs "▶️ Probar"/"Comprar" en una línea; Mi plan: cada precio entero (no corta "al año").
- T1 🧹 CM → Apps → "🧹 Limpiar y abrir" en cada app: abre https://<worker>.juanjosuecastilloloyola.workers.dev/?cfx-limpio=1&cfx-cero=1 → núcleo carga.js borra caché, service worker, localStorage, sessionStorage, IndexedDB y cookies y abre como recién instalada (sin incógnito).
- Barbería: faltaba wrangler.jsonc (sus builds de ramas ≠ main fallaban). Agregado igual al de SaaS.
- Pruebas: pruebas/g24_modulos.js, g24_limpiar.js.

ORDEN (lo que falta de G24):
1. Confirmar con Josué que los builds de main salieron bien (CM 4.84, Órbita 5.99, Barbería 2.75 visibles abajo en cada app). Si alguno falla: pedirle el log de Cloudflare (Workers → <app> → Deployments → build) y arreglar.
2. B1 Despacho "Resto de Chile" se pierde al guardar. Probable causa: ⚡ Actualizar base leía instalar.sql de main (5.40). Con Órbita en main la base debe quedar en 5.41: verificar db_version y probar dueño guarda → recarga → sigue.
3. B2 🚚 Seguimiento: sale solo en Pedidos (negocio) con un pedido CON despacho; dejarlo claro (ayuda/vacío).
4. B3 "Invita y gana": el link de invitado pide iniciar sesión (antes entraba). Arreglar.
5. M1 resto: separar Free / Pro (lo básico) de los módulos en Mi plan y 🧩 Módulos (siempre visibles).
6. M2 💳 UN link de pago ABIERTO (sin monto) para Premium, módulos y packs: la pantalla muestra el monto con 📋 Copiar, guía "pega el monto y paga" + comprobante; los links de monto fijo siguen sirviendo si existen.
7. M3 🌐 Dominio: Josué compra un dominio en Cloudflare para todas las apps (subdominios). Dominio del negocio: lo pega + pasos de DNS claros y llega directo a su tienda (web/PWA). Ver si conviene Cloudflare for SaaS (custom hostnames) o manual.
8. L1 🧹 LIMPIEZA FINAL con aviso: borrar productos/perfiles/datos menos admins (supabase/limpieza/1_contar → 2_borrar + Storage); a los antiguos aviso "migramos a versión nueva, vuelve a cargar tus productos" + guía; a los nuevos guía "Tu negocio en 5 minutos" (cuenta, links de pago, despacho, políticas).
9. Revisión celular (celular.js Aplicaciones 320/360, claro/oscuro, MIRAR capturas) de todo G23/G24 y central.js.
DESPUÉS: Khipu/Flow/Webpay, courier, stock con Mercado Libre, factura 33, gift cards, sucursales, suscripciones. Otras apps en pausa.

REPOS (CodeFixService, en /home/user): SaaS = Centro de Mando (CM); nucleo/ es el original, sincronizar.py lo copia · Aplicaciones = Órbita (TIENDA) · Emprendedor = Billetera · Barberia · Taller = BiciTaller · Estacionamiento = Estaciona · Contenido = Cerebro. Stack: Supabase gratis + Cloudflare Workers (Workers Builds) + GitHub.

PUBLICAR (todas las apps igual):
- central.js OK → git push origin HEAD:main → esperar check-runs de main → recién ahí rama de sesión (si se empuja la rama de sesión antes, el check que se ve es el de la rama ccr-*, que siempre falla).
- Check-runs: curl api.github.com/repos/CodeFixService/<repo>/commits/<sha>/check-runs (script con until + sleep 15, sin sleep suelto).
- Josué: CM → Apps → app → 🧹 Limpiar y abrir → prueba → 🚀 Liberar. Con SQL: la base se actualiza sola (máx. 10 min) o ⚡ Actualizar base ahora.
- Si sale mal: git revert en main.

EDGE FUNCTIONS: Órbita/Billetera/Barbería/Estaciona enviar; CM/BiciTaller/Cerebro servidor. Josué la borra, crea con el MISMO nombre, Verify JWT APAGADO, pega import 'https://raw.githubusercontent.com/CodeFixService/<repo>/<sha>/supabase/functions/<f>/index.ts'; → Deploy.

NÚCLEO 2.60 (CM, Órbita, Barbería; las otras en 2.54): modulos.js (probar/candado), carga.js (?cfx-limpio, ?cfx-cero), despacho.js + carrito.sql resto de Chile; vitrina.js políticas; modulos_venta 'medicion','dominio'; pagos.js CFX_PAGOS.abrir({producto}); ayuda.js, barra.js, voz.js, tienda.js.
ÓRBITA 5.99 (bd 5.41, bloque al FINAL de instalar.sql): pedido_seguimiento, pedido_correo, set_mi_perfil con políticas, medicion/dominio; worker.js "/" dominio→vitrina. Ajustes por hash: #links #equipo #despacho #boleta #redes #modulos #plan.

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
VERSIONES: núcleo 2.60 · CM 4.84 (bd 4.27) · Órbita 5.99 (bd 5.41) · Barbería 2.75 · Billetera 1.21.49 · BiciTaller 2.72 · Estaciona 2.14.51 · Cerebro 1.56.

PENDIENTE DE JOSUÉ: probar con 🧹 y avisar · Gmail en Órbita (Administración → Ajustes → Correo) · Access Token producción MP · probar 1 boleta real.
