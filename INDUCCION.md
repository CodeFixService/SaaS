# INDUCCION.md · Cómo trabajar en CodeFix (leer en 5 minutos)

Para una sesión nueva (Claude o persona). 🧠 Memoria viva y prompt: `PROMPT.md` (leer primero). Lo de cada app está en su `APP.md`; la lista de tareas en `PLAN.md`; lo que hace Josué en `LANZAMIENTO.md`.

## 1. Mapa
| Repo | App | id | Notas |
|---|---|---|---|
| SaaS | 🛸 Centro de Mando (CM) | mando | Núcleo original en `nucleo/`. Sin módulos. |
| Aplicaciones | 🚀 Despega Pyme | orbita | Tienda + caja + pedidos. Boleta SII. |
| Barberia | 💈 Barbería | barberia | |
| Emprendedor | 💰 Billetera | billetera | |
| Taller | 🚲 BiciTaller | taller | SERVER_VERSION en la función. |
| Estacionamiento | 🅿️ Estaciona | estaciona | |
| Contenido | 🧠 Cerebro | — | ⛔ NO tocar ni sincronizar. |

## 2. Preparar el entorno (/home/user)
```bash
for p in saas:SaaS emprendedor:Emprendedor barberia:Barberia taller:Taller estacionamiento:Estacionamiento contenido:Contenido; do ln -sfn ${p#*:} ${p%%:*}; done
B=/usr/lib/postgresql/16/bin; mkdir -p /var/tmp/pgdata /var/tmp/pgb; chown postgres /var/tmp/pgdata /var/tmp/pgb
su postgres -c "$B/initdb -A trust -D /var/tmp/pgdata"
su postgres -c "$B/pg_ctl -D /var/tmp/pgdata -o '-k /var/tmp/pgb -p 54329' -l /var/tmp/pg.log start"
cd SaaS/pruebas && npm i
./base.sh /home/user/barberia barberia_prueba   # central.js la necesita (G145)
```
Sin red a Supabase. Sin deno: `.ts` con `node --experimental-strip-types --check`.

## 3. Reglas de oro
- No dañar lo existente; solo lo pedido; `grep` antes de tocar.
- Subir la versión de cada app tocada (dónde: sección Versiones de su APP.md).
- Núcleo: se edita SOLO en `SaaS/nucleo/` → `python3 SaaS/nucleo/sincronizar.py <carpeta padre con symlinks>` (nunca contenido) → `git checkout icons/badge.png` en cada repo.
- Archivo nuevo en `shared/` o `admin/` → FILES de `sw.js`.
- Archivos con el correo de Josué (config.js, instalar.sql, schema.sql): editar a mano, sin scripts ni diffs.
- SQL re-ejecutable (correr 2 veces); `{error}` sin raise; admin → `perform public.cfx_es_admin()`.
- Pantallas: `esc`/`CFX_ESC`/`CFX_URL`; colores con `var(--cfx-*)`; probar 320 px y oscuro.
- Vender igual con o sin RUT (G31). Free/Pro/Módulo lo decide Claude (G39).

## 4. Probar como Josué
- `./base.sh /home/user/<repo> <bd>` → script `pruebas/g4x_*.js` que FALLE con el código viejo.
- Celular: `node celular.js saas Aplicaciones` (320/360, claro/oscuro) → `capturas/celular-<app>.txt`.
- Todo: `node central.js` (~5 min, 132 ok).
- 🧪 TRUCOS (movidos de PROMPT.md, G131 b): Llaves: leer con public.cfx_secreto(valor) (el stub local trae Vault: la tabla tiene 'vault:…'). Login de las 6: g66.js (sonda: sonda_g116b.js). Modelos de prueba: g102b.js, g103.js, g95.js, g112d.js; SQL puro: g112.js, g112c1.js, g131b.js; admin en SQL sin sesión: g112c2.js (cuentas sin disparar el registro de la app: session_replication_role = replica). Billetera: la app vive en /app/ (login en /#ingresar). Despega: el cliente necesita user_invites antes de crearUsuario; hoja del Más = .cfx-hoja-m, abrir con /#clave + p.reload(); notifications.target_id. BiciTaller/Estaciona confirmar → '[data-si]'. Admin de Barbería/BiciTaller/Billetera redirige al CM. Misma URL no recarga → p.reload(). Dedo real: abrir(…, { tactil: true }) + CDP touch (g126.js). g113.js Barbería/BiciTaller fallan desde G116 (prueba vieja, no la app). Función como otra persona: set_config('request.jwt.claim.sub') (admin Billetera: privado.fijar_admin()). Mercado Pago: stub http_respuestas (g85.js). 2.º teléfono: t.nuevo() (g86.js, g94c.js). t.sinModales borra las hojas (Estaciona: abrir la hoja tocando su texto). Capturas: pruebas/capturas/<repo>/. Emojis = íconos (buscar texto sin emoji). Tienda de módulos: prender modulos_venta.activo. Cliente de Barbería: crearUsuario { rol: 'cliente', barberia: codigo, nombre, telefono }; de taller: { rol: 'cliente', taller }. Taller nuevo parte FREE (prueba Premium = cfx_pro_probar). Más de BiciTaller: tocar 'text=… >> visible=true'. g33_dominio: ./base.sh /home/user/SaaS p_g33 antes. NO recrear bases de central.js mientras corre. central: (./base.sh /home/user/barberia barberia_prueba && node central.js; echo FIN) > scratchpad/central.log, en segundo plano. Push: add_repo access push. g141.js OCR real: OCR_DIR=node_modules de tesseract.js@5.1.1 + core + @tesseract.js-data/spa.

## 5. Publicar
1) central.js OK → 2) `git push origin HEAD:main` → 3) Josué: Cloudflare en Listo → 4) push a la rama de sesión.
Error → `git revert` en main (nunca force-push). Función cambiada → sha del commit en version.json "funcion".
Josué: CM → Resumen → Empresas → 🧹 Limpiar → probar → CM → Apps → 🚀 Liberar.
