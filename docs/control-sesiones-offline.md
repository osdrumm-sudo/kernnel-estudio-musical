# Metriqa Free — continuidad offline y control de sesiones

## Condición de uso propuesta
Utiliza una sola sesión de edición por cuenta. Si se interrumpe Internet, conserva el trabajo en el mismo dispositivo, completa la edición allí y comprueba el guardado en la nube antes de cerrar sesión y cambiar de dispositivo. Si se detecta actividad concurrente, el trabajo conflictivo permanece local y no se confirma en la nube. Dos equipos sin conexión no pueden detectar la actividad mutua hasta reconectar. No borres los datos del navegador mientras haya cambios pendientes; exporta un respaldo si el almacenamiento local falla.

## Implementación aislada
- Aviso al perder conexión y al acceder con autorización offline, guardado local inmediato solicitado al puente existente.
- Reserva transaccional por UID/dispositivo antes de sincronizar; se comprueba de nuevo antes de publicar el puntero de cada versión. Reserva persistente durante offline; se libera al cerrar sesión con guardado confirmado. No se libera por temporizador.
- Prevalidación de biblioteca: si hay cambios locales y remotos respecto de la base conocida, se bloquea la sincronización antes de escribir, incluso cuando afectan canciones distintas. No se generan duplicados remotos en el flujo protegido. Si el bloqueo acaba de adquirirse, se libera cuando la prevalidación falla.
- Cambios conflictivos se mantienen en la biblioteca local de la cuenta, sin confirmación remota; no se borran automáticamente. Falta una interfaz de resolución y de borrador separado de la biblioteca local.
- PWA incluye el módulo de sesión. Reglas Firestore propuestas para la reserva; no desplegadas.

## Límites y tareas pendientes antes de publicar
- La reserva es cooperativa para clientes actualizados, no una garantía de seguridad frente a clientes antiguos o manipulados; falta autorización de servidor que vincule cada escritura a la reserva y valide derechos/cuotas. Las transacciones por elemento no son una confirmación atómica de toda la biblioteca: una caída durante el envío puede dejar elementos previamente confirmados; no se promete revertirlos.
- El identificador es por instalación de navegador; dos pestañas de la misma instalación comparten identidad. Debe probarse y resolverse la concurrencia entre pestañas.
- Si se pierde el dispositivo o se borra su almacenamiento, hace falta un mecanismo de recuperación de reserva explícito que no destruya trabajo pendiente.
- Falta integrar los derechos Free, contador, cuotas y beneficio provisional en todas las rutas de edición/importación/restauración y revalidarlos en servidor. El motor puro existe; no se debe aplicar indiscriminadamente a cuentas existentes.
- Firebase Emulator, pruebas reales de autenticación/reglas, offline en Safari/iPad/Windows, interrupción durante subida y cambio de cuenta siguen pendientes. No modificar main, Firebase de producción ni Full.
