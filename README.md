# Kernnel Estudio musical
**Realizado por OSS/26** · Logo definitivo pendiente.

Aplicación web para gestionar canciones, compases, anotaciones, repertorios y metrónomo.
Requiere acceso autorizado con Google, conserva el trabajo local sin conexión tras el primer ingreso y ofrece **copias manuales en Google Firestore** mediante Firebase Authentication.

## Pasos de instalación gratuita

1. Crea un repositorio **público** en https://github.com/new, por ejemplo `kernnel-estudio-musical`.
2. Sube **el contenido** de esta carpeta a la raíz del repositorio (no la carpeta exterior).
3. En GitHub: Settings → Pages → Build and deployment → **Deploy from a branch** → `main` → `/(root)` → Save.
4. El sitio quedará en `https://TU_USUARIO.github.io/kernnel-estudio-musical/`. Esta URL es HTTPS.
5. En https://console.firebase.google.com crea un proyecto en el plan **Spark (gratis)**. No vincules una cuenta de facturación.
6. Agrega una aplicación **Web** en Firebase, copia los valores públicos de configuración en `firebase-config.js`.
7. Firebase → Authentication → Sign-in method → **Google: habilitado**. Si Firebase solicita dominios autorizados, añade `TU_USUARIO.github.io` en Authentication → Settings → Authorized domains.
8. Firebase → Firestore Database → Crear base de datos **(default)**, modo Production, edición Standard. En la pestaña Rules pega el contenido de `firestore.rules` y pulsa Publish.
9. Sube el `firebase-config.js` actualizado al repositorio. Espera la publicación de GitHub Pages y abre desde Safari en el iPad.
10. En menú **Sincronización Google**, inicia sesión con Google, y pulsa **Guardar copia en Google**. En el otro dispositivo, inicia sesión con la misma cuenta y pulsa **Recuperar desde Google**.

## Importante: datos y seguridad

- La app **mantiene la biblioteca en el dispositivo** y su modo offline. Google se utiliza para almacenar una copia completa cuando pulsas el botón correspondiente.
- **No hay fusión automática** de cambios de distintos dispositivos. Siempre exporta un respaldo JSON antes de recuperar y comprueba qué dispositivo tiene la versión más reciente antes de subir.
- La restauración reemplaza todos los datos locales de la instalación donde la ejecutas.
- El código del repositorio público puede verlo cualquiera, pero las reglas de Firestore permiten leer y escribir cada respaldo solo al usuario autenticado dueño.
- El objeto `firebaseConfig` es público por diseño; **nunca incluyas contraseñas, certificados, claves privadas ni claves de administrador en el repositorio**.
- Las imágenes incrustadas en canciones se guardan en fragmentos de Firestore hasta 25 MB por respaldo. No se necesita Cloud Storage ni plan Blaze. Las copias antiguas no se borran automáticamente y ocupan cuota; inicialmente se recomienda hacer pruebas con pocos archivos.
- Para migrar canciones guardadas en Netlify, **exporta JSON allí e impórtalo en el nuevo GitHub Pages**: son orígenes distintos y no comparten almacenamiento local.
- Debes usar GitHub Pages con URL HTTPS (no abrir `index.html` desde Archivos).
- Los módulos de Firebase requieren Internet; el modo local y metrónomo siguen funcionando offline después de instalar la PWA.
- Las cuotas del plan Spark de Firestore son limitadas. Si te acercas a ellas, revisa Usage y utiliza los respaldos JSON como alternativa.

## Límites de esta entrega

La app y su módulo de nube son una **versión de integración preparada**, no se han probado todavía contra tu proyecto Firebase ni una cuenta GitHub real, ya que es necesaria su configuración y autorización. Las acciones de nube son manuales y no sincronizan en segundo plano.

## Enlaces oficiales
- https://docs.github.com/en/pages/quickstart
- https://firebase.google.com/docs/firestore/pricing
- https://firebase.google.com/docs/firestore/security/get-started
- https://firebase.google.com/docs/web/setup

## Preparación de dominios Kernnel 2.0 (NO ACTIVADA)

- **Aplicación**: https://kernnel.app/
- **Alias con redirección**: https://www.kernnel.app/ → https://kernnel.app/
- **Manual**: https://manual.kernnel.app/

Esta configuración está preparada solamente en la rama `preparacion/dominios-kernnel-2026-11-10`. Consultar `docs/plan-dominios-kernnel.md` antes de fusionar, crear DNS o modificar GitHub Pages. La URL GitHub Pages anterior debe utilizarse para exportar los respaldos JSON reales antes del cambio de origen.


## Acceso por invitación — noviembre de 2026

- Administrador único de la aplicación: `ols.bds@gmail.com`. No otorga permisos IAM de la consola Firebase.
- Login obligatorio con Google; los demás correos requieren un documento `authorizedEmails/{correo}` con `active: true`.
- En Sincronización Google, el administrador dispone de «Administrar accesos»: solicitudes, autorización directa y revocación.
- La solicitud se crea después del ingreso con Google y contiene nombre, correo verificado, motivo, estado y fecha del servidor. No se envían correos automáticos.
- Las bibliotecas locales se separan por UID (`compases-v1:{uid}`). El material de prueba anterior queda intacto bajo su clave antigua y no se asigna automáticamente a ninguna cuenta.
- El acceso sin conexión usa el registro de la última autorización en este navegador. No es una licencia antifraude ni cifra los datos locales; una revocación requiere reconexión. Las reglas siguen protegiendo los datos en Firestore.
- La sincronización sigue siendo manual: Guardar copia en Google / Recuperar desde Google. Iniciar sesión no reemplaza silenciosamente una biblioteca local.
- Cerrar sesión sin conexión deja pendiente cerrar también la sesión Firebase al reconectar.
- El proveedor Google y los dominios deben estar habilitados en Firebase. Las reglas se publican separadamente de GitHub Pages.

### Validación de esta entrega

`node --test tests/access.test.cjs` verifica ocho escenarios de acceso con Firebase simulado. También se comprobó la sintaxis y el inicio real del SDK en navegador sin sesión. Falta la prueba integral autenticada con la cuenta administradora, una cuenta invitada y un iPad. No se han ejecutado pruebas de reglas en el emulador de Firestore.
