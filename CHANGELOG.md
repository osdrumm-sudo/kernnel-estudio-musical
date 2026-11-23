# Historial de actualizaciones · Kernnel / Metriqa

El contenido de esta página describe **funcionalidades publicadas en la rama `main`**. Las propuestas y prototipos experimentales se enumeran por separado y **no están activados** en la aplicación principal.

## 23 de noviembre de 2026 · Vista Full, propuesta 4 (grafito y ámbar)
- Nueva interfaz de Estudio de bajo contraste, basada en la paleta 4 aprobada, con opción **Vista clásica** para alternar sin cambiar canciones.
- Secciones reales navegables, vista de posición por compases, selección de canción, indicadores de pulso y acento.
- Comentarios/notas por compás, imágenes de extractos adjuntas y apertura de la partitura completa existente.
- Acceso visible a Metrónomo y audio en escritorio y móvil, sin activar el reproductor de audio futuro.
- Preferencia visual guardada localmente; sin cambios en Firebase, modelo de canciones ni derechos de acceso.
- [Pruebas y limitaciones de la propuesta](docs/propuesta-4-ambar-prueba.md).

## 23 de noviembre de 2026 · Repertorios, navegación y clic acentuado
- Formulario **Crear repertorio** directamente en Inicio y panel lateral desplegado en esa pantalla; Edición y Estudio comienzan con las herramientas contraídas.
- Nuevo acceso superior **Repertorios** en Edición y Estudio, con selector de listas y retorno al repertorio elegido.
- Al abandonar Edición, aviso con tres opciones: Guardar y salir, Salir sin guardar, Cancelar.
- Botón **Eliminar** en cada canción de un repertorio expandido; confirmación y recuperación desde la papelera, conservando referencias a sus repertorios.
- Metrónomo con **acentos configurables por pulso** y guardados por canción, compatible con canciones ya existentes.
- [Evaluación futura del reproductor musical](docs/propuesta-reproductor-musical-futuro.md), **sin implementación**.

## 23 de noviembre de 2026 · Mantenimiento y legibilidad
- Nuevo panel desplegable «Novedades de la plataforma» en Inicio, con acceso al manual y a este historial.
- Diferenciación cromática de los módulos de herramientas en temas claro y oscuro; se conserva el alto contraste.
- Comprobaciones automáticas de sintaxis JavaScript, acceso, sincronización y respaldos ficticios mediante GitHub Actions, sin publicar ni tocar datos reales.
- Documento de validación para PC, iPad, permisos, respaldos, dominio y caché.
- Actualización de la documentación y de la versión de caché de la PWA para entregar los recursos de interfaz actualizados.

## 19 de noviembre de 2026 · Perfil e interfaz
- [PR #11](https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/11): corrección del guardado del nombre para mostrar, con mecanismo local de respaldo.
- [PR #10](https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/10): mejoras en Inicio, Edición y Estudio; controles de reproducción, loop y anotaciones con imágenes.

## 12–13 de noviembre de 2026 · Cuentas y sincronización
- [PR #7](https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/7): acceso obligatorio con Google, invitaciones y gestión administrativa de permisos.
- [PR #8](https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/8): sincronización incremental de canciones y repertorios; historial y manejo de conflictos.

## En evaluación y sin integrar en la aplicación principal
- [PR #12](https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/12): notas, progreso, salas privadas y sincronización de estudio. **Congelado**, pendiente de verificación real en Firebase y dispositivos.
- [Issue #13](https://github.com/osdrumm-sudo/kernnel-estudio-musical/issues/13): Metriqa híbrida, métricas variables, metrónomo adaptativo, capas de instrumento y visor MusicXML/PDF. **Congelado**.
- [Prototipos de práctica](https://github.com/osdrumm-sudo/kernnel-estudio-musical/tree/prototipos/metriqa-practica-3-4/prototipos/practica-3-4): Instrument Hub y Timeline. Las demostraciones HTML están aisladas; **no forman parte del motor oficial**.

> Nota: los cambios de código no demuestran por sí mismos que la configuración remota de Firebase esté actualizada ni que las pruebas en dispositivos físicos se hayan superado. Consulta [validación de publicación](docs/validacion-prepublicacion.md).
