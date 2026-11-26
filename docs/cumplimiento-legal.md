# Metriqa — cumplimiento legal preventivo (P0)

Fecha: 2026-11-25. Rama independiente de main; sin despliegue. Chile: Ley 19.628 y modificación por Ley 21.719 vigente desde el 2026-12-01; Ley 19.496 y Ley 17.336 según corresponda. Evaluar requisitos extranjeros antes de habilitar cada mercado.

## Decisiones de producto aprobadas
- Pantalla inicial tipo instalador: elección explícita del país de uso, presentación de términos y condiciones, botón de aceptación; no habilitar la aplicación sin aceptar términos. Configurar versiones territoriales del sitio y restricciones correspondientes.
- Crear procedimiento de eliminación de datos y cuentas de usuarios.
- Eliminar la alternativa de subir tablaturas y partituras. No incorporar nuevas funciones de carga de estos materiales.
- Los incidentes atribuibles a la infraestructura del proveedor de datos se gestionarán con dicho proveedor.

## Salvaguardas necesarias (precisiones jurídicas y técnicas, no decisiones de producto adicionales)
- Selección de país antes de autenticación; mantener configuración territorial con mercados habilitados, textos legales versionados y validación de servidor. No considerar el país autodeclarado como única determinación de ley aplicable. No usar geolocalización precisa. No habilitar mercados no evaluados. Arquitectura propuesta: código común y rutas territoriales; dominios, mercados adicionales y regiones de almacenamiento pendientes de definición.
- País elegido no equivale a ubicación física de datos. Firebase Authentication declara procesamiento exclusivo en EE. UU.; Firestore depende de configuración regional efectiva. Revisar contrato de tratamiento, subencargados, bases de licitud y garantías de transferencia por territorio antes de habilitarlo. No prometer residencia local sin verificación.
- Facilitar lectura y descarga de términos y política de privacidad antes de aceptar; registrar UID, versión de términos y fecha/hora de aceptación, país y versión de aviso. No preseleccionar aceptación. Separar consentimiento opcional (p. ej., estadísticas no imprescindibles) de términos obligatorios; definir bases de licitud por finalidad. No exigir consentimientos innecesarios para usar el servicio. Mantener mecanismo de rechazo y nueva aceptación cuando proceda.
- Diseñar opción visible de eliminación desde perfil, reautenticación, advertencia y confirmación, exportación opcional previa, revocación de accesos y borrado mediante servicio privilegiado verificable. Inventariar Firebase Auth, perfil, solicitudes, lista de autorizados, estadísticas por UID/correo, biblioteca, historial/versiones, respaldos antiguos, reservas de sesión, derechos Free, aceptación y borradores; incluir limpieza de copias locales en el dispositivo disponible, impedir resurrección al reconectar, distinguir copias exportadas o dispositivos desconectados fuera de control y retenciones legales justificadas con plazos. Confirmar resultado y ofrecer canal para otros derechos. No ejecutar borrados reales durante desarrollo.
- Revisar adjuntos de imagen en anotaciones de pulso (index.html, FileReader y campo img sincronizado), importaciones JSON, restauraciones e historial. Un archivo de imagen puede contener partituras o tablaturas; ocultar un botón no basta. Propuesta conservadora: desactivar nuevas cargas de imágenes hasta definir si se conservan otros usos legítimos; no borrar adjuntos históricos sin autorización y procedimiento. Mantener anotaciones propias y estructuras de estudio; prohibir distribución no autorizada de material protegido y habilitar canal de reclamación.
- Responsabilidad compartida: Firebase responde por obligaciones propias de infraestructura según contrato y ley. Metriqa conserva deberes de seguridad, configuración de permisos, minimización y respuesta a incidentes en su ámbito; no excluir derechos legales del usuario ni trasladar íntegramente responsabilidad mediante términos. Registrar incidentes, contener, investigar causa, contactar proveedor y notificar autoridad/titulares cuando corresponda.
- Pendiente política de retención (incluye estadísticas y respaldos), edad mínima y tratamiento de menores, identidad/contacto del responsable, canal de derechos, revisión de contratos y condiciones comerciales, y validación jurídica final.

## Pruebas de aceptación
1. Rechazar términos impide alta/uso, con acceso a documentación; aceptación explícita queda registrada y no se falsifica por cliente.
2. País habilitado muestra textos/restricciones correctos; país no habilitado no permite registro; cambio territorial no evade restricciones aplicables.
3. Eliminación de cuenta revoca acceso y purga datos definidos en inventario, incluidos subcolecciones e historiales; reconexión de dispositivo antiguo no restaura datos eliminados. Simular fallos y reintentos idempotentes.
4. Nuevas cargas prohibidas son bloqueadas en interfaz, importación y servidor, sin destruir datos históricos. No prometer detección infalible de contenido protegido.
5. Simulación de incidente distingue infraestructura y aplicación, registra evidencia y permite cumplir notificaciones.
6. Pruebas con datos ficticios y Firebase aislado. No publicar ni modificar producción hasta certificar.

## Referencias oficiales
- https://www.bcn.cl/leychile/navegar?f=2026-12-01&i=1209272 (arts. 14 quinquies, 14 sexies, 15 bis y transferencias internacionales)
- https://www.bcn.cl/leychile/Navegar?idLey=19496
- https://firebase.google.com/support/privacy/
- https://firebase.google.com/terms/data-processing-terms

Este documento es un alcance técnico preventivo, no una certificación jurídica. No se han verificado región real de Firestore, contrato vigente del proyecto ni datos de producción.
