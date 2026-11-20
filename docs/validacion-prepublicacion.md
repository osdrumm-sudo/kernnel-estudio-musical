# Protocolo de validación previa a publicación

Fecha: 17-11-2026. Estado: **pendiente de ejecución con servicios reales**.

Este documento describe verificaciones, no certifica que se hayan superado. Una fusión de GitHub puede publicar el sitio, por lo que **no fusionar este PR sin autorización del titular**.

## A. Integridad y control de cambios

- [ ] Confirmar un respaldo JSON descargado y conservado fuera de cada dispositivo con material relevante. No subir esos archivos privados a GitHub.
- [ ] Verificar que el cambio parte de la versión actual de `main`; revisar el diff completo, incluyendo Service Worker y reglas si cambian.
- [ ] Comprobar que no se han añadido secretos, datos reales, claves de servicio ni configuraciones privadas.
- [ ] Verificar GitHub Actions: suite `node --test tests/*.test.cjs` aprobada y comprobaciones de sintaxis; si CI falla, no fusionar.

## B. Firebase Authentication y permisos

- [ ] Iniciar con el Google administrador `ols.bds@gmail.com`; comprobar que el panel administrativo aparece únicamente en esta sesión.
- [ ] Iniciar como usuario no autorizado y verificar bloqueo, solicitud de permiso y ausencia de lectura de datos.
- [ ] Aprobar a un usuario de prueba, comprobar acceso a su biblioteca y después revocarlo; confirmar bloqueo al reconectar.
- [ ] Comprobar sesión persistente y cierre de sesión también tras uso offline.
- [ ] Comparar la versión de reglas realmente publicada en Firestore con `firestore.rules`.
- [ ] Ejecutar pruebas en el emulador de reglas (no añadidas en este PR): sólo propietario autorizado, petición de usuario no autorizado denegada, intentos entre UID denegados, fragmentos inmutables y datos con esquema incorrecto rechazados.

## C. Sincronización PC y móvil

- [ ] En el PC, iniciar con una cuenta de prueba y crear una canción y un repertorio ficticios.
- [ ] Esperar indicador `Guardado en la nube`; iniciar la misma cuenta en el teléfono y confirmar recuperación automática.
- [ ] Editar desde el teléfono y confirmar el resultado en PC.
- [ ] Sin conexión, editar un elemento y reconectar; confirmar que el cambio no desaparece.
- [ ] Editar el mismo elemento en dos dispositivos desconectados, reconectar uno a uno y verificar original, duplicado por conflicto y sus fechas.
- [ ] Recuperar una revisión desde historial y confirmar que no destruye la versión vigente.
- [ ] Cambiar de cuenta y verificar que ninguna biblioteca ajena aparezca; repetir con varias pestañas.
- [ ] Comprobar que una actualización de la PWA no obliga a borrar los datos locales.

## D. Operación, publicación y gastos

- [ ] Verificar `kernnel.app`, `manual.kernnel.app` y redirección de `www.kernnel.app`; revisar DNS y HTTPS en Cloudflare.
- [ ] Verificar funcionamiento en Windows/Firefox o Chromium y en Safari/iPad o iPhone.
- [ ] Revisar el consumo de Firestore en plan Spark y posibles fragmentos huérfanos.
- [ ] Actualizar las instrucciones del manual público para la experiencia vigente; es otro repositorio y no se modifica en este PR.
- [ ] Obtener aprobación explícita del propietario para fusionar el PR y realizar cualquier cambio en producción.

## Límites de las pruebas incluidas

- La suite Node usa datos ficticios y dobles de Firebase, no cuentas reales ni Firestore publicado.
- Un respaldo de código en GitHub no es respaldo de canciones almacenadas en navegador/Firestore.
- La normalización de JSON no constituye validación exhaustiva de todos los campos ni prueba de ciberseguridad.
- Este PR no cambia `firebase-config.js`, `firestore.rules`, DNS, credenciales ni interfaz publicada.
