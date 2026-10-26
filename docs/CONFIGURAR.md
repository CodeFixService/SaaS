# Puesta en marcha de CodeFix (una sola vez)

Proyecto de Supabase: `https://vqevujjraisrcoirswuq.supabase.co` (ya está puesto en `shared/config.js`).
Administrador: `juanjosuecastilloloyola@gmail.com` (el usuario que ya creaste en Supabase).

---

## 1. Base de datos (y tareas automáticas)
1. Supabase → **SQL Editor** → **New query**.
2. Pega el contenido de [`supabase/instalar-corto.sql`](../supabase/instalar-corto.sql) (5 líneas: descarga e instala la versión
   correcta de [`supabase/instalar.sql`](../supabase/instalar.sql)) → **Run**. Debe decir "Success".
3. Para actualizar a una versión nueva: lo mismo, con el `instalar-corto.sql` nuevo. No borra datos.

> Si tu repositorio es privado, el atajo no puede descargar el archivo: en ese caso pega el `instalar.sql` completo.
>
> Tu usuario administrador queda reconocido solo. Revisa en **Authentication → Users** que tu correo
> diga "Confirmed". Si no, ábrelo y toca **Confirm email**.

## 2. Inicio de sesión (Authentication)
En **Authentication → Sign In / Providers**:
- **Email**: activado.
- **Allow new users to sign up**: **activado**. Los clientes se crean su cuenta desde la página de su negocio.
  Nadie más puede registrarse: la base de datos rechaza cualquier cuenta que no sea cliente de un negocio,
  o que no haya sido creada por ti (negocios) o por el negocio (su equipo).
- **Confirm email**: recomendado **desactivado**, así el cliente entra al tiro. Si lo dejas activado, el
  cliente tendrá que confirmar su correo antes de entrar.

En **Authentication → URL Configuration** (sirve para "olvidé mi contraseña"):
- **Site URL**: la dirección donde está la app. Para probar en GitHub Pages: `https://codefixservice.github.io/SaaS/`
  (después, la de Cloudflare: `https://TU-DOMINIO.pages.dev/`).
- **Redirect URLs**: agrega `https://codefixservice.github.io/SaaS/**` y, cuando la tengas, `https://TU-DOMINIO.pages.dev/**`.

## 3. Tareas automáticas
Ya quedan creadas con el paso 1 (cada 5 minutos: libera horas sin pago, recordatorios, vencimientos y limpieza diaria;
cada minuto: notificaciones al celular). Si alguna vez quieres reinstalarlas solas, usa [`supabase/cron.sql`](../supabase/cron.sql).

## 4. Función "servidor" (crear cuentas y enviar notificaciones)
1. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nombre: **`servidor`** (exacto, en minúscula).
3. Borra el ejemplo y pega la línea de [`supabase/functions/servidor/corto.ts`](../supabase/functions/servidor/corto.ts)
   (carga la versión correcta de `index.ts` desde GitHub) → **Deploy**. Si el repositorio es privado, pega el `index.ts` completo.
4. Deja **Verify JWT** como viene (activado).

## 5. Activar las notificaciones al celular
1. Entra a la app con tu correo de administrador.
2. **Ajustes → 🔔 Notificaciones → Crear claves**.
3. Toca **Probar función servidor**: debe decir "✅ Funciona".
4. En cada celular, la persona toca la campanita → **Activar**. En iPhone primero hay que instalar la app
   (Compartir → "Agregar a inicio") y abrirla desde ese ícono.

## 6. Precios y links de pago
**Administración → Ajustes**: pon el **precio mensual** y el **precio anual** de Pro, y sus dos links:
**Link de pago mensual** y **Link de pago anual** (deben empezar con `https://`) → **Guardar ajustes**.
Al tocar "Pasar a Pro", la persona elige mensual o anual y el botón de pagar abre el link de ese plan
(si el anual está vacío, usa el mensual). Después sube su comprobante y tú lo apruebas en **Pagos**
(el mensual suma 30 días; el anual, 365).

## 7. Publicar en Cloudflare Pages
1. Cloudflare → **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git**.
2. Elige el repositorio **CodeFixService/SaaS** y la rama **main**.
3. **Framework preset**: None · **Build command**: (vacío) · **Build output directory**: `/`
4. **Save and Deploy**. Te da una dirección tipo `https://codefix.pages.dev`.
5. Vuelve al paso 2 y pon esa dirección en **Site URL** y **Redirect URLs**.

Cada cambio que se suba a `main` se publica solo.

## 8. Primer negocio
**Negocios → Crear negocio**: nombre del negocio, dueño, correo y WhatsApp. La app arma el mensaje con su
acceso para mandárselo por WhatsApp. El negocio parte con 30 días de Premium de regalo (lo cambias en
**Ajustes → Reglas**).

El negocio, al entrar, ve una lista de lo que le falta: logo y colores, servicios, **link del abono**
(sin eso no recibe reservas online) y dirección. Su enlace para compartir es
`https://TU-DOMINIO/t/?s=nombre-del-negocio` (también tiene QR).

---

## Límites del plan gratis de Supabase
- Base de datos: 500 MB. El panel **Resumen → Servidor** muestra cuánto se usa (🟢 / 🟡 70% / 🔴 90%).
- Los comprobantes se achican antes de subirse (~100-300 KB) y se borran solos a los 30 días.
- Cuando se acerque al límite: limpia desde el panel o pasa a Supabase Pro.

## Si algo falla
- **"No se pudo conectar con la función servidor"** → falta el paso 4 (o el nombre no es `servidor`).
- **"La base de datos es la versión X"** en el Resumen → vuelve a correr el paso 1.
- **El cliente no puede crear cuenta** → revisa el paso 2 ("Allow new users to sign up" activado) y que el
  negocio no haya llegado a su límite de clientes con cuenta.
- **No llegan notificaciones al celular** → pasos 3, 4 y 5, y que la persona haya tocado "Activar".

## Versiones y actualizaciones
- La versión de la app está en `version.json` y `shared/config.js` (se ve al pie de cada pantalla).
- Cuando se publica una versión nueva, a cada persona le aparece una ventana **"🔄 Hay una versión nueva → Actualizar ahora"**.
- Si la versión trae cambios en la base de datos, el **Resumen** del admin lo avisa: corre el `instalar-corto.sql` nuevo.

## 8. Actualizar a una versión nueva (cada vez que se publique una)
La app **no se actualiza sola**: cada teléfono sigue con su versión guardada hasta que tú la liberas.
Apenas hay una versión nueva en GitHub, **Administración → Resumen** muestra "🚀 Hay una versión nueva lista"
(también en **Ajustes → 🔄 Actualizar la app**). Sigue los 4 pasos; cada uno queda con ✓ verde cuando está listo:
1. **Base de datos** → **📋 Copiar consulta** → **↗ Abrir SQL Editor** → pega → **Run**. Debe decir `Centro de Mando instalado vX`. No borra datos.
2. **Función "servidor"** (solo si cambió) → **📋 Copiar código** → **↗ Abrir Edge Functions** → `servidor` → pega → **Deploy** → **🩺 Probar de nuevo**.
3. **Prueba en tu teléfono** → **⬇️ Actualizar mi teléfono**. Solo el tuyo cambia.
4. **🚀 Liberar para todos** (solo el súper administrador). Se bloquea si los pasos 1 o 2 no están listos.
A cada usuario le aparece "✨ Hay una versión nueva" con **Actualizar ahora**. Si un teléfono queda raro: **Más → Reparar la app** (no borra datos).
La app también funciona sin internet con la última versión guardada.

## 9. Mis aplicaciones (todas tus apps en un solo lugar)
**Administración → 🛰️ Apps** muestra una tarjeta por app: Centro de Mando, Billetera (Libreta de Cobros), CodeFix Apps,
Barbería, BiciTaller y Estaciona. Cada una trae su versión publicada y liberada, la versión de su base de datos, su
rendimiento (ingresos, cuentas, Pro, nuevos y activos) y botones para **abrir la app**, **abrir su admin**, **copiar su SQL**
de actualización, **abrir su SQL Editor** y **🚀 Liberar**. Con **🚀 Liberar todo lo que está listo** liberas todas de una.
- La primera vez toca **🔌 Conectar** en cada tarjeta y entra con tu cuenta de administrador de esa app (queda guardada en ese teléfono).
- La versión y la configuración pública se leen de GitHub (rama `main` de cada repositorio).
- En Centro de Mando y la Billetera, **correr el SQL ya deja liberada la versión**: todos ven "Actualizar" al tiro.
- BiciTaller se actualiza sola apenas se publica (no necesita liberar).

## 10. Dominio propio (un dominio para todas las apps)
Compra **un** dominio en Cloudflare (por ejemplo `codefix.app`) y en cada Worker: **Settings → Domains & Routes → Add → Custom domain**:

| App | Worker | Dirección con tu dominio |
|---|---|---|
| Centro de Mando | saas | `mando.codefix.app` |
| Billetera | emprendedor | `billetera.codefix.app` |
| CodeFix Apps | aplicaciones | `apps.codefix.app` |
| Barbería | barberia | `barberia.codefix.app` |
| BiciTaller | taller | `bicitaller.codefix.app` |
| Estaciona | estacionamiento | `estaciona.codefix.app` |

Los links de **Administración → Apps** se arman solos según dónde abras el Centro de Mando: desde
`saas.<tu-cuenta>.workers.dev` apuntan a los Workers; desde `mando.codefix.app` apuntan a `billetera.codefix.app`, etc.
No hay que cambiar código. Lo único: en el Supabase de cada app, **Authentication → URL Configuration**, agrega la
dirección nueva en *Site URL* y *Redirect URLs* (para "olvidé mi contraseña").
