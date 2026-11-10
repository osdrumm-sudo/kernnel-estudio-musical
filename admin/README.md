# Kernnel — Administración de estadísticas básicas

Estado: IMPLEMENTADO EN RAMA, NO PUBLICADO NI CONECTADO A CUENTAS REALES.
Ruta prevista cuando se autorice la publicación: https://kernnel.app/admin/

## Alcance
- Firebase Authentication: inicio de sesión con correo y contraseña; solo UIDs aprobados en el servidor.
- Cloudflare Web Analytics: visitas y páginas vistas, serie diaria para los últimos 7 y 30 días.
- Firebase: recuento exacto de usuarios y lista paginada de 50 (correo, verificación, creación, último acceso, estado).
- Solo lectura: la plataforma no modifica ni consulta canciones, repertorios, Firestore o respaldos.
- No utiliza el Worker anterior app-studio-26 (Urgnet).

## Seguridad
El panel (HTML/CSS/JS estático) es público por GitHub Pages, pero ninguna información privada se entrega sin autenticación y autorización en el Worker. El navegador entrega un ID token reciente de Firebase. El Worker consulta a Google Identity Toolkit (accounts:lookup) para validarlo y comprueba el UID exacto contra ADMIN_UIDS, que debe mantenerse exclusivamente como secreto en Cloudflare. Ningún correo otorga privilegios por sí solo.

Los datos de visitas se obtienen desde Cloudflare GraphQL; los usuarios desde Identity Toolkit projects.accounts:query con una cuenta de servicio restringida al permiso firebaseauth.users.get. Los tokens API nunca deben publicarse en GitHub, HTML o navegador.

La API exige HTTPS, restringe CORS a https://kernnel.app, solo permite GET, devuelve Cache-Control: no-store y no exporta contraseñas ni tokens de terceros. El servidor deniega todo acceso si no existe una lista ADMIN_UIDS.

## Pasos de activación (requieren configuración manual y autorización)
1. Confirmar que kernnel.app ya muestra Kernnel, no Urgnet en www; conservar el respaldo JSON comprobado.
2. Firebase Console → proyecto kernnel-studio → Authentication → Users. Identificar el UID de la cuenta que administrará; no confundirlo con usuario de GitHub o Cloudflare.
3. Firebase Authentication → Settings → Authorized domains: asegurarse de que kernnel.app esté autorizado.
4. Crear una cuenta de servicio Google Cloud para el proyecto kernnel-studio que disponga únicamente de lectura de cuentas (firebaseauth.users.get). No conceder Owner/Editor. Si está prohibido generar claves, no desactivar restricciones de seguridad.
5. Crear un Worker NUEVO, independiente del proyecto Urgnet. Desde una copia local del repositorio entrar al directorio admin/worker y utilizar Cloudflare Wrangler (npx wrangler login).
6. Configurar estas variables SECRETAS con npx wrangler secret put NOMBRE, desde admin/worker:
   - ADMIN_UIDS: UID real del administrador (varios UIDs separados por coma).
   - FIREBASE_API_KEY: API key pública web del mismo proyecto de Firebase que Kernnel.
   - GOOGLE_SERVICE_ACCOUNT_JSON: credencial JSON de servicio del proyecto, restringida a la lectura de usuarios. No compartirla por chat o GitHub.
   - CF_ACCOUNT_ID: identificador de cuenta Cloudflare que contendrá Web Analytics.
   - CF_ANALYTICS_TOKEN: token de Cloudflare con permisos limitados de lectura de analítica GraphQL.
7. Las variables públicas de wrangler.toml son FIREBASE_PROJECT_ID = kernnel-studio y ALLOWED_ORIGIN = https://kernnel.app.
8. Tras probarlo, desplegar desde admin/worker con npx wrangler deploy; el Worker se llama kernnel-admin-api y usa workers.dev, no el Worker Urgnet.
9. Escribir la URL HTTPS resultante en admin/config.js, propiedad window.KERNNEL_ADMIN_API_URL. Nunca colocar allí secretos ni UIDs. La URL debe apuntar a un subdominio workers.dev válido o api.kernnel.app.
10. Publicar el frontend en la ruta /admin/ solamente después de probar login autorizado y denegado, CORS y estadísticas.

## Activación de la medición de visitas
- Cloudflare → Web Analytics → Add a site, hostname kernnel.app.
- Como la aplicación está en GitHub Pages y DNS only, utilizar instalación manual del beacon oficial.
- Cloudflare proporciona un identificador PÚBLICO de sitio para el script. Es diferente del token privado CF_ANALYTICS_TOKEN.
- Después de publicar el aviso de privacidad, insertar el script oficial de Cloudflare antes del cierre de body en el index.html de la aplicación principal; no instalarlo en /admin/ para evitar contabilizar visitas administrativas.
- No duplicar métodos manual y automático.
- El histórico solo comienza desde que se habilita el seguimiento. Si el plan Cloudflare no expone el dataset GraphQL esperado, mostrar error sin inventar cifras.

## Puesta a prueba
En admin/ ejecutar:
  npm run check
  npm test

Con usuarios reales, validar que una cuenta corriente no vea información, la cuenta administrativa pueda ver métricas, CORS rechace orígenes externos, y el backend no guarde contraseñas. No registrar ni enviar información musical.

## Privacidad
- Lista de cuentas y correos sólo visible para UID autorizado.
- No se unen visitas con usuarios identificados; no se envían correos a Cloudflare Analytics.
- No se almacenan estadísticas en base de datos propia.
- Informar en el sitio sobre el seguimiento, proveedor, finalidad, derechos y datos de contacto responsable.
- Conservar controles de acceso y respaldos externos independientes.

## Limitaciones
El frontend de /admin/ es estático y sólo representa el panel. La protección de datos reside en el Worker, que requiere secretos configurados por el propietario. Este entregable es una base lista para desplegar una vez configurada y validada, no un panel ya conectado a cuentas reales.

Referencias:
https://developers.cloudflare.com/web-analytics/get-started/
https://developers.cloudflare.com/analytics/graphql-api/
https://firebase.google.com/docs/reference/rest/auth
https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/projects.accounts/query
