# 🔒 Seguridad y ley · CodeFix (G112 c, 18/11/2026)

Revisión de las 6 apps + CM (todas usan el mismo núcleo, así que cada punto vale para todas).
✅ = ya está y lo revisa una prueba · ⏳ = en la cola (PLAN.md G112 c).

## 1. Pagos
| Punto | Estado |
|---|---|
| Las tarjetas NUNCA pasan por CodeFix: el pago se hace en la página de Mercado Pago o de Flow (PCI DSS: lo cumplen ellos) | ✅ |
| Un pago se da por pagado solo si el SERVIDOR le pregunta a MP/Flow (no se le cree al aviso ni al teléfono), y revisa monto completo + N° usado 1 vez | ✅ |
| Firma HMAC-SHA256 en cada llamada a Flow | ✅ |
| Link abierto y transferencia: el admin aprueba con pantallazo | ✅ |
| Llaves de pago (MP Access Token, Flow API Key/Secret, también las de cada negocio): tablas bloqueadas (nadie las lee después de guardarlas, ni la app) + disco cifrado de Supabase (AES-256) | ✅ |
| Llaves de pago cifradas TAMBIÉN dentro de la base (Supabase Vault), así ni un respaldo las muestra | ⏳ c1 |

## 2. Cuentas y datos
| Punto | Estado |
|---|---|
| Contraseñas: Supabase Auth (bcrypt, nunca en texto) · clave temporal al azar con cambio obligado · nada de "demo123" | ✅ |
| 3 intentos fallidos → bloqueo · Turnstile anti-robots (ingreso, registro, recuperar clave) | ✅ |
| Reglas por fila (RLS) en TODAS las tablas · invitados sin funciones de admin (CM → Control → Seguridad lo revisa solo) | ✅ |
| Encabezados de seguridad (CSP, frame-ancestors, nosniff, permisos de cámara) en todas | ✅ |
| Todo viaja por HTTPS (Cloudflare + Supabase) | ✅ |
| Respaldo diario de cada base CIFRADO (gpg con RESPALDO_CLAVE), 14 días | ✅ |
| Carnet: la foto se BORRA al resolver la revisión | ✅ |
| Lo que se muestra en pantalla pasa por esc/CFX_URL (sin inyección de código) | ✅ |

## 3. Ley chilena
| Ley | Qué pide | Estado |
|---|---|---|
| 19.628 → **21.719** (datos personales, vigente dic. 2026) | Términos y privacidad con versión · consentimiento guardado · derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo con plazos · registro de **brechas** y aviso a la Agencia y a los afectados | ✅ (núcleo legal.sql; "Mis datos y privacidad" en cada app; CM → Control → Datos) |
| **21.663** (ciberseguridad) | Medidas de seguridad + aviso de incidentes. CodeFix NO es "servicio esencial", igual se cumple con el registro de brechas | ✅ |
| **19.496** (consumidor) | Retracto 10 días en compras a distancia · garantía legal 6 meses · política de cambios de cada tienda | ✅ (textos de ayuda + términos) |
| SII | Boleta en todas · factura (33) en Despega | ✅ |

## 4. Cola (en orden)
- ⏳ **c1** Llaves de pago y token de Cloudflare a **Supabase Vault** (cifrado dentro de la base). Base vieja no se rompe: si no hay Vault, sigue como hoy.
- ⏳ **c2** Rotación: CM → Pagos muestra cuándo se pegó cada llave y avisa a los 12 meses "🔄 Cámbiala".
