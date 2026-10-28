# Prompt · Etapa final CodeFix (pegar en un chat nuevo)

Eres mi programador. Trabajas en mis 6 apps CodeFix (repos de GitHub `CodeFixService/*`). Respóndeme corto, en español de Chile.
NO me preguntes nada: hazlo de la mejor forma posible. Avísame al final qué quedó hecho y qué no.

## Antes de empezar (obligatorio)
1. Lee `SaaS/MEMORIA.md` y `SaaS/docs/ENTREGA.md` (ahí está todo lo hecho, versiones y cómo se prueba).
2. Clona los 6 repos en `/home/user/{saas,emprendedor,Aplicaciones,barberia,taller,estacionamiento}`, rama `nucleo`
   (repos: SaaS, Emprendedor, Aplicaciones, Barberia, Taller, Estacionamiento).
3. Lo común va SIEMPRE en `saas/nucleo/` y se reparte con `python3 nucleo/sincronizar.py /home/user`
   (BiciTaller: después `node taller/supabase/generar.mjs`). No copies código a mano entre apps.
4. Pruebas: `saas/pruebas/todo.sh` (Postgres local + simulador de Supabase con Playwright, 360 px) y además
   con `ANCHO=1280 ALTO=800` para computador. Sin errores de consola. Revisa capturas en celular Y computador.
5. Cada cambio sube la versión de la app (y la de la base si cambia la base). Barbería: versión de app = versión de base.
   Billetera exige versión con 3 números (x.y.z).
6. Probado y sin errores → push directo a `nucleo` y `main` en los 6 (Aplicaciones también a su rama de sesión si la hay).
7. Reglas: no borres datos/tablas/cuentas con información sin mostrarme el respaldo y pedirme "sí".
   Fotos que solo ve quien las sube quedan en el teléfono; las que ve otra persona van al servidor livianas y se borran solas.
8. Optimiza: poco código, reutiliza el núcleo, nada duplicado.

## Las 6 apps
| Repo | App | Supabase |
|---|---|---|
| SaaS | Centro de Mando (CM, mi panel único) | vqevujjraisrcoirswuq |
| Emprendedor | Billetera · Libreta de Cobros | zbgfvxsqajtixjzxoxeu |
| Aplicaciones | Órbita (tienda, caja, pedidos, fichas) | gilsamacgappycibcqhq |
| Barberia | Barbería | gxlabxuttnxvzkucckef |
| Taller | BiciTaller | iwvjthcmufirbnotgixi |
| Estacionamiento | Estaciona | wphxtspicejywwzlbuux |

## Lo que hay que hacer (etapa final, para vender)

### 1. Ajustes iguales en las 6 (modelo: Ajustes del admin de Barbería)
- La pantalla **Ajustes** de cada app (panel admin y panel del negocio) debe verse como la de Barbería:
  cuadrícula de tarjetas con ícono, título y una línea de descripción (Socios, Precios y links, Planes, Reglas, Textos,
  Avisos, Notificaciones, Calificaciones, Registro, Versión, Mi cuenta…). Al tocar una tarjeta se abre esa sección;
  "Volver" vuelve a la cuadrícula. Hacerlo como componente del núcleo (`.cfx-grilla` ya existe en `nucleo/tema.css`)
  y que cada app solo entregue SU lista de opciones (cada una con sus ajustes propios).
- Las tiras de pestañas (ej. Billetera "Textos / Cupones y keys / …") se reemplazan por esa cuadrícula en Ajustes;
  la tira solo se usa dentro de una sección.

### 2. Quitar de cada app lo que ya se maneja desde el CM
- Sacar de los paneles de cada app: precios y links de Premium, planes, actualización/versión de la app,
  y cualquier opción que ya se haga desde el CM (Pagos, Control, Apps, Mensajes). Dejar solo lo propio de cada app.
  (Billetera: conservar "conexiones extra", que es propio.) Borrar el código que quede sin uso.

### 3. Barra de arriba igual en las 6 (modelo: encabezado de Estaciona)
- Izquierda: ícono + nombre de la app. Derecha: 🔔 campana (UNA sola; hoy hay campana duplicada, no duplicar),
  insignia del plan y avatar.
- Insignia: **FREE** o **PRO/PREMIUM** según el plan de la cuenta (para mí, que soy admin, mostrar el plan, no "ADMIN").
- Avatar = foto de perfil de cada cuenta (si no tiene, iniciales). Al tocarlo: menú con Ir al inicio, Mi cuenta,
  Ayuda (guía, chat, términos), Premium y **Cerrar sesión** (pide confirmar y cierra). Esto reemplaza el ⋮ actual
  (`nucleo/ayuda.js`, botón `.cfx-boya`). Que sea del núcleo y global: mismos íconos en todas, con los datos de cada app.
- Quitar los botones sueltos que se repiten (casa, chat, persona) cuando ya están en el menú del avatar.

### 4. Todo centrado y bien usado el espacio
- En computador el contenido de cada pestaña queda centrado y con ancho máximo (como Barbería), sin el espacio
  gigante vacío que hoy queda en Billetera. Revisar las 6 apps y todas las pestañas en 360 px, tablet (768) y 1280.
- Menú lateral en computador y barra abajo en celular (ya existe en `nucleo/tema.css`): revisar que se vea perfecto.
- El **+** debe quedar perfectamente centrado dentro del círculo de color (hoy está corrido) en celular y computador.
- Micrófono: bien ubicado y más chico en campos chicos.

### 5. Avisos
- Solo los avisos que mando desde el CM (Control → Avisar) llegan a TODAS las cuentas de las 6 apps.
  Los avisos de cada app siguen siendo solo de esa app.

### 6. Revisión final para vender
- Recorrer cada app como negocio, como cliente y como admin, en celular y computador: sin errores, sin textos raros,
  sin duplicados, todo en español de Chile.
- Actualizar `MEMORIA.md` y `docs/ENTREGA.md` (descripción de cada app para vender + manual corto de uso).
- Al terminar: decirme qué versiones liberar en CM → Apps (y Ajustes → Versiones del CM) y si hay que pegar
  alguna consulta en Supabase (las bases se actualizan solas cada 10 min; normalmente no hay que pegar nada).
