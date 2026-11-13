# Sincronización incremental v1

## Estado de entrega
Cambio preparado; no activar frontend antes de publicar las reglas adjuntas en Firebase.
Pruebas: `node --test tests/*.test.cjs`. Pruebas de reconciliación y adaptador con dobles de Firebase; no certifican reglas reales ni Safari. El navegador local de pruebas no pudo iniciarse por una restricción del entorno (socket Operation not permitted).

## Persistencia y protocolo
- `users/{uid}/syncItems/{kind~encodedId}`: puntero transaccional, hash SHA-256, nombre, identidad, fecha local de modificación, timestamp de servidor, borrado lógico e historial de 20 revisiones.
- `users/{uid}/syncVersions/{uuid}/parts/{0000}`: fragmentos inmutables de JSON canónico, hasta 140000 unidades UTF-16, sin cortar pares sustitutos; 25 MiB por elemento.
- Se escriben partes antes del puntero. Una transacción compara la revisión leída con la revisión base. Si otra escritura ganó, se vuelve a reconciliar; nunca se reemplaza silenciosamente.
- Tres vías: contenido local, hash/revisión base del dispositivo y cabeza remota. Sólo un elemento modificado genera escrituras. Se consultan las cabeceras para detectar cambios y se descargan sólo los payloads necesarios.
- `_sync.base` y `_sync.times` viajan con la biblioteca local en IndexedDB/localStorage. No son credenciales. El hash no incluye esos metadatos.
- La fecha de modificación se toma del reloj del dispositivo; no decide quién gana. Los relojes desajustados pueden mostrar fechas distintas. El conflicto se decide por revisión y contenido.
- Los elementos suprimidos conservan tombstone para impedir que un equipo desactualizado los resucite por accidente. Si el equipo sí los editó, se conserva esa edición como copia.

## Conflictos y recuperación
Se mantiene la cabeza remota y se crea una copia con ID determinista del elemento y de las revisiones en conflicto. Un reintento no crea otra copia de ese mismo conflicto. La copia muestra «Duplicada por conflicto», la fecha local y la fecha de la otra versión. Eliminar localmente mientras otro equipo edita conserva el contenido editado y muestra aviso.
Las copias de canciones no se añaden automáticamente a todos los repertorios para no alterar asociaciones editadas en otro dispositivo. Se encuentran en Canciones sin repertorio. Los repertorios duplicados conservan las asociaciones válidas existentes.
El historial recupera como copia nueva. Las canciones eliminadas aún pueden recuperarse desde revisiones anteriores del historial. Una recuperación de repertorio no reconstruye canciones ya eliminadas; recuperar primero esas canciones y revisar asociaciones.

## Retención y cuota
Se mantienen 20 entradas por elemento, incluida la actual. Después de confirmar una nueva revisión se eliminan los fragmentos de versiones descartadas. Un fallo de limpieza o una subida interrumpida antes del commit puede dejar fragmentos huérfanos; revisar la cuota y añadir recolección periódica en servidor si crece el uso. No hay servicio de limpieza programado incluido.
El guardado tiene debounce de 1,5 s y reintento con espera creciente, hasta 60 s. Una edición en curso de envío queda pendiente para la siguiente ejecución. No se intenta guardar por red dentro de beforeunload como garantía de durabilidad.

## Migración desde copias manuales
Si no hay cabeceras incrementales y no se ha comprobado el respaldo anterior en ese dispositivo, se lee `kernnelSaves/latest` y sus fragmentos. Se valida tamaño y formato. Se fusiona con contenido local; diferencias con mismo ID se conservan como copias. Las copias antiguas permanecen intactas.
Actualizar todos los dispositivos. Clientes antiguos continúan usando el sistema de copias manuales y no pueden participar en el protocolo incremental. No seguir editando con versiones antiguas después de migrar.

## Activación
1. Exportar JSON de cualquier dispositivo con material que deba conservarse.
2. Firebase > Firestore Database > Reglas: publicar el archivo completo `firestore.rules` de esta rama. Mantiene las rutas anteriores y suma las nuevas.
3. Verificar en emulador/reglas: usuario autorizado sólo su UID, no autorizado denegado, escrituras con forma inválida denegadas, partes existentes inmutables.
4. Integrar frontend y verificar la actualización PWA sin borrar datos locales.
5. Ingresar en celular y PC con la misma cuenta. Crear canción y repertorio, esperar Guardado en la nube, abrir el segundo equipo y comprobar carga automática.
6. Probar una edición distinta de la misma canción con ambos equipos offline; reconectar por separado, comprobar original y duplicada con fechas.
7. Recuperar una versión del historial y verificar la copia; probar cierre con cambios pendientes.

## Alcance y límites
Sincroniza canciones completas (incluidos ajustes de práctica) y repertorios. Preferencias globales de apariencia y papelera se mantienen por dispositivo. No es edición colaborativa de caracteres ni un respaldo ilimitado. Las reglas protegen por UID; el recibo offline previo no es una licencia antifraude. La prueba de Auth existente sigue usando mocks.
