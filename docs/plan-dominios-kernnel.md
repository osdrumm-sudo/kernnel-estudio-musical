# Kernnel 2.0 — Plan de dominios PREPARADO (NO ACTIVADO)
Fecha: 10 de noviembre de 2026

> **Prohibido fusionar o activar por separado.** Este archivo contiene la configuración de destino, no describe DNS vigente. No se ha tenido acceso de administración a Cloudflare ni a la configuración de Pages del usuario.
> La activación requiere autorización expresa, respaldo JSON REAL de las canciones y validación del origen actual.

## Topología aprobada

| Nombre | Función | Repositorio / acción |
|---|---|---|
| `https://kernnel.app/` | Aplicación Kernnel Estudio musical | `osdrumm-sudo/kernnel-estudio-musical`, archivo `CNAME`: `kernnel.app` |
| `https://www.kernnel.app/` | Acceso secundario: redirección a `https://kernnel.app/` | Configurar `www` en DNS hacia GitHub Pages y retirar interceptaciones antiguas. Redirección automática de GitHub Pages cuando el dominio principal es el apex. |
| `https://manual.kernnel.app/` | Manual oficial | `osdrumm-sudo/kernnel-guia-oficial`, archivo `CNAME`: `manual.kernnel.app` |

Las referencias HTML preparadas en las ramas cambian los enlaces app ↔ manual. **Estas ramas no se deben fusionar todavía.**

## Registros DNS de DESTINO para Cloudflare (NO aplicar aún)

| Tipo | Nombre (Host) | Contenido (Target) | Proxy Cloudflare | TTL |
|---|---|---|---|---|
| A | `@` | `185.199.108.153` | DNS only (nube gris) | Auto |
| A | `@` | `185.199.109.153` | DNS only (nube gris) | Auto |
| A | `@` | `185.199.110.153` | DNS only (nube gris) | Auto |
| A | `@` | `185.199.111.153` | DNS only (nube gris) | Auto |
| CNAME | `www` | `osdrumm-sudo.github.io` | DNS only (nube gris) | Auto |
| CNAME | `manual` | `osdrumm-sudo.github.io` | DNS only (nube gris) | Auto |

Opcional (GitHub Pages también admite IPv6; añadir solo si se confirma que no existen entradas incompatibles):

| Tipo | Nombre | Contenido | Proxy |
|---|---|---|---|
| AAAA | `@` | `2606:50c0:8000::153` | DNS only |
| AAAA | `@` | `2606:50c0:8001::153` | DNS only |
| AAAA | `@` | `2606:50c0:8002::153` | DNS only |
| AAAA | `@` | `2606:50c0:8003::153` | DNS only |

**ATENCIÓN**: los valores de `CNAME` apuntan al dominio de usuario `osdrumm-sudo.github.io`, **sin la ruta del repositorio**. Los dos sitios de GitHub Pages se distinguen por el dominio personalizado configurado en su repositorio.

### Registros que NO deben eliminarse
No borrar indiscriminadamente DNS de correo o verificación (`MX`, `TXT`, SPF, DKIM, DMARC, verificaciones de Firebase y de GitHub). Antes de actuar, exportar o fotografiar la zona actual y comprobar conflictos entre A/AAAA/ALIAS/CNAME.

### Ruta antigua de www
La dirección `www.kernnel.app` está informada como redireccionada a una página anterior. Antes de activarla como alias de la app:
- Auditar **Cloudflare Workers Routes, Workers Custom Domains, Redirect Rules, Page Rules, Bulk Redirects y DNS**.
- Localizar cualquier regla o Worker que intercepte `www.kernnel.app/*` o la ruta raíz.
- Retirar/deshabilitar **solo** las reglas que interfieran en el cambio, cuando se autorice; no borrar Workers ni reglas de otros servicios.
- La opción principal de este plan es `CNAME www` con **DNS only** y redirección automática de GitHub Pages (no configurar una segunda redirección de Cloudflare en paralelo).
- Si se decide implementar redirección directamente en Cloudflare, diseñar por separado un Redirect Rule con DNS proxied; no mezclar ambos mecanismos.

## Preparación GitHub (sin fusionar)

- App: `CNAME` nuevo con `kernnel.app`, enlace del menú Manual dirigido a `https://manual.kernnel.app/#manual`.
- Manual: cambio de `CNAME` de `kernnel.app` a `manual.kernnel.app`, enlaces «Abrir Kernnel» dirigidos a `https://kernnel.app/`.
- La URL actual de GitHub Pages de la app debe conservarse operativa hasta haber exportado el respaldo. Al asignar un dominio personalizado GitHub Pages puede redirigir las visitas a la URL anterior, y **NO transporta el localStorage**.
- En la configuración GitHub Pages de cada repositorio deberá verse el dominio correcto y «Enforce HTTPS», **después** de que GitHub emita certificado y el DNS esté correcto.
- Verificar la propiedad de `kernnel.app` en **GitHub, Settings personales → Pages → Verified domains**. El valor real del TXT de verificación lo genera GitHub: **no inventarlo**. Conservar dicho TXT luego de verificar.

## Plan de activación coordinada (solo tras aprobación separada)

0. **Puerta obligatoria:** exportar y comprobar respaldo JSON de datos reales desde la app en su URL de origen actual, conservar segunda copia externa, probar recuperación en entorno aislado. No confiar únicamente en un respaldo de código o en Google.
1. **Preflight:** guardar zona DNS vigente y reglas de Cloudflare, confirmar cuenta GitHub dueña del dominio y estado actual del certificado. Verificar `kernnel.app` en GitHub con su TXT real.
2. **Manual primero:** preparar el `CNAME manual → osdrumm-sudo.github.io`, configurar GitHub Pages del repositorio del manual a `manual.kernnel.app` y fusionar el PR del manual en coordinación, comprobando resolución DNS, HTTPS y la página correcta. Este movimiento libera el apex actualmente utilizado por el manual.
3. **Aplicación:** fusionar el PR de la app / establecer dominio personalizado `kernnel.app` en su GitHub Pages, aplicar los registros `A @` aprobados, esperar el certificado y comprobar que la raíz muestre la aplicación y no el manual.
4. **www:** eliminar la ruta/Worker/regla anterior que intercepte `www.kernnel.app` y configurar `CNAME www → osdrumm-sudo.github.io` en modo DNS only. Confirmar que `https://www.kernnel.app/` redirija a `https://kernnel.app/` sin presentar la web antigua.
5. **Firebase:** en Firebase Authentication → Settings → Authorized domains agregar `kernnel.app` si faltara. Mantener las autorizaciones existentes hasta comprobar login; **no modificar `authDomain`** suponiendo que el sitio esté alojado en Firebase Hosting: la app está en GitHub Pages. Mantener Firestore y sus reglas intactos.
6. **Enlaces y PWA:** comprobar app→manual, manual→app, `manifest.webmanifest`, el service worker y los recursos CSS/JS. Verificar instalación de PWA en móvil; una instalación en el nuevo dominio es separada de la instalada desde GitHub Pages.
7. **Datos:** importar una copia segura en el nuevo origen y comprobar canciones, compases, colores, imágenes, múltiples repertorios, sesiones y papelera. Verificar copia manual en Firestore con sesión autenticada.
8. **Cierre:** registrar resultados y mantener temporalmente la copia JSON, URL anterior y puntos de reversión; anunciar cambio solo después de las pruebas.

**Orden crítico**: el manual tiene hoy `CNAME=kernnel.app`. No asignar `kernnel.app` a la app antes de liberar ese dominio del manual. El cambio debe ejecutarse en una ventana coordinada; puede producir una interrupción breve de acceso al manual.

## Validación prevista al activar

- `https://kernnel.app/` → aplicación Kernnel, con logo/menú/estudio.
- `https://www.kernnel.app/` → HTTP 301/308 u otra redirección permanente a `https://kernnel.app/` (no web antigua).
- `https://manual.kernnel.app/` → manual correcto, buscador y navegación.
- Certificado TLS válido y candado HTTPS en las tres direcciones.
- Búsqueda/selección de canciones, metrónomo, almacenamiento, respaldo y login Firebase.
- No hay registros DNS wildcard `*.kernnel.app` ni CNAME apuntando a rutas con `/kernnel-estudio-musical/`.

## Plan de reversión

1. Tener guardadas las configuraciones previas de DNS, Rules y GitHub Pages antes de cambiar nada.
2. Si falla la migración, **no borrar datos ni desinstalar la PWA**. Mantener JSON externo independiente.
3. Revertir las configuraciones de GitHub Pages y DNS con los registros guardados; la ruta Worker antigua solo si corresponde y tras verificar que no interfiere.
4. Esperar propagación DNS/HTTPS y validar por URL, no solo por el contenido en caché.
5. Priorizar el acceso a los datos desde su origen original cuando aún sea posible; los datos locales de un origen no aparecen mágicamente en el otro.

## Limitaciones actuales
- No disponemos de lectura autenticada de la zona DNS ni de Workers/Redirect Rules de Cloudflare.
- No está verificado el estado DNS/TLS real de los tres dominios; no aplicar el plan sin inspeccionar la zona.
- No hay confirmación del respaldo JSON de canciones reales ni prueba de recuperación en el dominio nuevo.
- Ninguna modificación de esta rama cambia la web publicada.

## Documentación oficial
- GitHub Pages: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- GitHub Pages, dominio verificado: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages
- Firebase, redirecciones: https://firebase.google.com/docs/auth/web/redirect-best-practices
