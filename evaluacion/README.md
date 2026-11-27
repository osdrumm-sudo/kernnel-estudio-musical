# Portal de evaluadores · Metriqa Full e Inicial

**Estado:** rama de revisión, sin despliegue ni cambios de datos reales. No fusionar con main hasta validar reglas Firebase, autenticación y cuentas reales.

## Acceso y arquitectura
- Ruta prevista /evaluacion/, integrada a la navegación de Metriqa. El enlace solo se muestra al administrador principal o cuando evaluationRoles registra el UID con permisos efectivos. Esto no reemplaza las reglas de Firestore.
- Google Authentication y configuración pública actual de Firebase (firebase-config.js); jamás se guardan credenciales en el repositorio.
- El administrador se reconoce mediante el correo de administración ya existente en cloud.js y firestore.rules, no por un selector manipulable. Las reglas vuelven a comprobarlo en el servidor.
- Administrador ve **Full** e **Inicial / Free**, puede marcar evaluadores en ambas o limitar por versión. Un evaluador ve solo las versiones asignadas. La selección no altera su cuenta comercial ni habilita un plan real.
- **Inicial / Free NO está publicada.** El checklist sirve para registrar pendientes y marcar «Bloqueado» hasta que exista una versión evaluable. No se inventa enlace a ella.

## Colecciones nuevas, aisladas de canciones
1. evaluationProfiles/{uid}: UID, correo autenticado, nombre y última visita al portal. Solo el propietario actualiza su perfil; el administrador puede listar perfiles.
2. evaluationRoles/{uid}: correo, active, versions=[full,initial], updatedAt. Solo la administración crea, modifica y revoca.
3. evaluationReports/{uid}_{version}: evaluaciones separadas por cuenta y versión, con dictamen por ítem, nota, revisión y sello de tiempo. El propietario autorizado escribe; administración puede leer los informes, **no** bibliotecas musicales.
4. La lista de usuarios ya logueados se completa también desde usageSessions, ya existente y accesible solo por el administrador. Un usuario sin actividad registrada puede necesitar entrar al portal para aparecer.

## Formulario
- 127 entradas de seguimiento, basadas en hoja de ruta 27/11, decisiones BAT-01/02/03 y PR #21/#22/#24/#25/#26. Incluye 81 de Full, 40 de Inicial y 6 controles compartidos.
- Resultados: Sin evaluar / Aprobado / Incidencia / Bloqueado o aún no disponible / No aplica.
- Cada ítem tiene casilla de verificación, criterio de aceptación, prioridad, referencia y observación.
- Filtros por texto, prioridad y resultado, progreso y resumen administrativo de informes.
- Borrador local por UID/versión, exportación JSON, guardado explícito con transacción Firestore y revisión optimista. Si otro dispositivo cambió el informe, hay que resolverlo antes de guardar.
- No se modifica ninguna canción, repertorio, minieditor ni archivo privado con este portal.

## Reconciliación de reglas recibidas (27/11/2026)
Se integró en `firestore.rules` el bloque QA sobre el texto completo proporcionado por el administrador (239 líneas), en lugar de sustituir las reglas vigentes por la versión del repositorio. Se conservaron **sin cambios** los permisos de `studyNotes`, `studyProgress`, `studyRooms`, invitaciones, partituras por partes, reloj de salas, biblioteca incremental, acceso Google y estadísticas. Se añadió solamente el bloque de `evaluationProfiles`, `evaluationRoles` y `evaluationReports` antes del cierre denegatorio.

**No se ha desplegado en Firebase**. Las reglas aportadas son una copia suministrada por el usuario; no equivalen a una lectura verificada de la configuración desplegada. Pendiente validación de compilación y pruebas de reglas con Firebase Emulator, diferenciando administrador, evaluador asignado, usuario sin rol y revocado. El CI de GitHub solo verifica código, pruebas estáticas y detección de regresiones.

## Procedimiento obligatorio de puesta en marcha
1. Revisar y conservar una copia de firestore.rules actual de **la consola de Firebase** (las reglas reales podrían diferir del repositorio).
2. Integrar las reglas de QA de esta rama mediante una revisión **no destructiva** de todas las reglas actuales. Validar sintaxis y permisos en Firebase Emulator con una identidad administradora, un evaluador autorizado, otro usuario y una cuenta revocada. Confirmar que los accesos actuales a canciones permanecen intactos.
3. Desplegar reglas en Firebase con autorización explícita del responsable y registrar la versión desplegada.
4. Verificar que el dominio de prueba esté autorizado en Authentication y que se pueda cargar /evaluacion/ por HTTPS. Una rama GitHub **no** publica automáticamente el subdirectorio en kernnel.app. Una URL de producción requiere fusión/despliegue o un entorno de preview independiente.
5. Probar inicio con un usuario previamente registrado en usageSessions, asignarle permisos, verificar acceso Full/Inicial y revocarlos.
6. Guardar informe en Full, guardar otro en Inicial, cambiar cuenta, revisar aislamiento y conflictos entre dos dispositivos.
7. Comprobar ruta al portal desde la sesión de Metriqa y ausencia del enlace para un usuario sin rol.
8. Ejecutar node --test tests/*.test.cjs; probar Chrome/Windows, Safari/iPad y una cuenta de QA real.
9. Solo después de aprobar lo anterior y respaldar, solicitar publicación controlada.

## Alcance pendiente
- Reglas Firebase **aún no desplegadas**.
- Sin prueba real de Firebase/Google, QA móvil, Firebase Emulator ni despliegue público.
- No hay versión Inicial navegable independiente; sus pruebas pueden permanecer bloqueadas hasta que se publique.
- No se asignó ningún evaluador real ni se consultaron informes personales.
- La lista de pendientes es un corte a fecha 27 de noviembre de 2026; su contenido se actualiza en evaluacion/pendientes.js, pero las respuestas de cada usuario se conservan mediante IDs de ítem estables.
