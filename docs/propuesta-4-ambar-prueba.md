# Metriqa Full — Propuesta gráfica 4, prueba funcional

**Estado:** capa de interfaz integrada a Metriqa, propuesta grafito cálido + ámbar suave, basada en la cuarta imagen elegida. Usa las canciones, notas, imágenes, compases y metrónomo reales de la aplicación; no es un reproductor de música grabada ni una maqueta que simule tus datos.

## Acceso

- Aplicación: https://kernnel.app/
- Entrar con una cuenta Google **ya autorizada**. No se modifica la política de acceso ni se crean cuentas públicas.
- La apariencia ámbar se activa por defecto. El botón **◐ Vista clásica / ◐ Propuesta 4 · Ámbar** de la cabecera alterna los diseños. Guarda esta preferencia **solo en el navegador**.
- Accesibilidad: el ajuste Alto contraste del usuario sigue disponible.

## Pruebas funcionales sugeridas

1. **Inicio**: verifica tus repertorios, crea uno, expande sus canciones y prueba Estudiar, Editar y Eliminar (si eliminas una canción de prueba, recupérala desde Papelera).
2. **Estudio**: abre una canción; el encabezado muestra su nombre, cifra indicadora, BPM y cantidad de compases reales.
3. **Cambio de canción**: usa **Cambiar canción** en la vista ámbar, sin regresar a Inicio.
4. **Estructura**: selecciona una sección de la franja superior; salta al primer compás de esa sección.
5. **Posición**: arrastra la barra de progreso o pulsa un bloque de compás; el metrónomo se detiene al saltar, para evitar desincronizaciones.
6. **Metrónomo**: usa los controles Reproducir, Pausar y Detener; observa la activación de los pulsos y del compás actual.
7. **Tempo**: prueba el BPM original/de práctica y los botones −/+ existentes.
8. **Acentos**: abre **⚙ Ajustes y acentos**; dentro de Metrónomo y audio activa uno o varios pulsos. Puedes volver al acento solo en el primero.
9. **Loop**: en Estudio, elige un intervalo (desde/hasta), reproduce repetidamente y desactívalo.
10. **Comentarios y notas**: comprueba las anotaciones asociadas al compás actual. La pestaña Notas muestra los textos guardados y la pestaña Comentarios también los comentarios por pulso.
11. **Imágenes de partitura**: si la canción tiene imágenes adjuntas a un pulso, aparecen como miniaturas ampliables. Usa **Ver partitura completa** para ver y consultar la vista tradicional de compases.
12. **Edición**: el botón **Añadir desde Edición** abre el compás activo en el editor, donde puedes cambiar notas, marcadores y adjuntar imágenes. Al salir de Edición se pide Guardar, Salir sin guardar o Cancelar.
13. **Repertorios**: usa el botón superior Repertorios para cambiar de repertorio desde cualquier pantalla de trabajo.
14. **Móvil/iPad**: gira la pantalla, abre Ajustes y acentos, consulta compases y vuelve a Inicio. Comprueba que ningún control tape la partitura o los comentarios.
15. **Diseño clásico**: alterna la paleta y verifica que datos y canciones no cambien.

## Lo que la pantalla representa

- La barra horizontal es **avance por compases**, no tiempo real de un audio. No muestra duración de una grabación.
- La estructura utiliza las secciones existentes que tú introdujiste; si no hay secciones, aparece Tema completo.
- El metrónomo sigue usando la métrica y los acentos configurables **de cada canción**. No incorpora cambios de métrica por compás ni reproducción sincronizada de pistas.
- Las imágenes son **los archivos adjuntos por el usuario** en Edición. No se inventan partituras ni se importan automáticamente.
- La sección de notas es de consulta en Estudio. Para editarlas, pulsa **Añadir desde Edición**.
- El botón Full de la barra lateral identifica la edición de desarrollo. **Todavía no comprueba pagos, suscripciones ni permisos por plan**.

## Comercialización prevista (no implementada)

- **Full en desarrollo**: repertorios y canciones sin los futuros límites comerciales.
- **Free futura**: máximo **2 repertorios y 4 canciones por repertorio**.
- No añadir límites Free, bloqueo de funciones ni cobros antes de cerrar la experiencia Full y el sistema de licencias.

## Límites del alcance y desarrollos congelados

No se han integrado PR #12 (salas/notas y progreso avanzados), issue #13 (métricas variables, motor híbrido y MusicXML/PDF) ni los prototipos congelados Instrument Hub/Timeline. El reproductor de audio del usuario está documentado en issue #15, **sin implementación**.

## Integridad de datos

Esta actualización añade una capa de presentación y navegación. No modifica autenticación, reglas Firebase, estructuras de canciones, almacenamiento ni sincronización. Las pruebas automáticas con datos ficticios no sustituyen una prueba con Google/Firebase reales y dispositivos físicos.
