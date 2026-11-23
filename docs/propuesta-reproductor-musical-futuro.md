# Estudio de viabilidad: reproductor musical de práctica (NO implementado)

**Estado:** propuesta futura. No instalar librerías, crear pantallas, bases de datos o API en producción durante esta etapa.

## Objetivo
Permitir que cada usuario asocie archivos de audio propios a las canciones que debe estudiar y los reproduzca desde Metriqa, sin distribuir música ajena mediante GitHub ni compartirla accidentalmente entre cuentas.

## Alcance inicial propuesto
- Biblioteca personal: agregar archivo de audio desde el dispositivo, asignarlo a una canción del repertorio y editar título, intérprete, duración y notas.
- Reproducir, pausar, detener, barra de progreso, volumen, avanzar o retroceder y repetir entre dos posiciones A/B.
- Velocidad de práctica configurable (p. ej. 0.75×–1.25×); estudiar preservación de tono según compatibilidad del navegador y comprobar calidad real en iPad.
- Marcadores por tiempo (entrada, verso, solo, puente) independientes de los compases escritos en Metriqa.
- Acceso únicamente desde el contexto de la canción y la cuenta activa; interfaz adaptada a pantalla pequeña.

## Arquitectura sugerida
1. **Metadatos:** objeto vinculado al UID y al identificador de la canción, separado del formato de los compases. Mantener versión, tamaño, formato y última modificación.
2. **Audio local primero:** selector de archivos del usuario, etiqueta `HTMLAudioElement` / Media APIs, almacenamiento IndexedDB para Blob si el navegador admite la capacidad y la cuota. No guardar el audio en Firestore ni como campo del JSON de canciones.
3. **Respaldo:** exportar un inventario de referencias; evaluar empaquetado de audio como respaldo independiente. No asumir que exportar el JSON de Metriqa incluye automáticamente archivos musicales.
4. **Nube opcional posterior:** evaluar almacenamiento de objetos protegido por reglas, costos, cuotas, autorización, tamaño máximo, derechos de acceso, borrado y recuperación. No activar ni configurar Firebase Storage ahora.
5. **Offline:** solo garantizar reproducción del audio realmente almacenado en el dispositivo; detectar espacio disponible y evitar perder archivos silenciosamente. Probar políticas de almacenamiento y suspensión en Safari/iPad/iPhone.
6. **Seguridad:** validar tipo, duración y tamaño. No enviar nombres de archivos, audios ni otros datos privados a GitHub público, analíticas o servidores de terceros.

## Riesgos y decisiones pendientes
- Cuotas locales, espacio disponible y limpieza de datos del navegador; el usuario debe disponer de copias originales fuera de Metriqa.
- Permisos y derechos de uso de los archivos cargados por el usuario; no ofrecer descargas públicas ni catálogo de canciones comerciales.
- Audio en segundo plano y cambios de salida del dispositivo; probar Safari/iOS y Windows.
- **Sincronización audio–metrónomo/partitura:** no prometer alineación automática. Para lograrla se necesitarían referencias de tiempo, BPM y compases, corrección de deriva y posiblemente un mapa de tempo. Se recomienda separar esta capacidad de la primera entrega.
- Control de reproducción al cambiar de canción, cerrar sesión, desconectar o eliminar una referencia.

## Pruebas de aceptación propuestas para una etapa futura
- Importar y reproducir un archivo permitido, pausar, acelerar, marcar A/B y repetir.
- Mantener la separación de archivos entre dos usuarios autorizados.
- Probar Windows y Safari/iPad, espacio lleno, archivo corrupto, sin conexión y recuperación tras reiniciar.
- Eliminar una canción y decidir si sus audios se borran, conservan o exportan.
- Registrar tamaño de la biblioteca; no superar cuotas sin advertir al usuario.

**No se implementa** el reproductor ni se modifica la estructura actual de la aplicación en este PR.
