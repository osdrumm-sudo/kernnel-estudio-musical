# Kernnel Estudio musical · Metriqa

**Realizado por OSS/26.** Aplicación web para estudiar y organizar canciones, repertorios, compases, anotaciones y sesiones con metrónomo.

- **Aplicación:** https://kernnel.app/
- **Manual público:** https://manual.kernnel.app/#manual
- **Novedades verificables en GitHub:** [CHANGELOG.md](CHANGELOG.md)
- **Protocolo de validación:** [docs/validacion-prepublicacion.md](docs/validacion-prepublicacion.md)

## Funciones presentes en la rama oficial `main`

- Inicio con panel lateral desplegado, formulario independiente **Crear repertorio**, repertorios desplegables y opciones **Estudiar, Editar y Eliminar** por canción; la eliminación mueve la canción a papelera.
- Canciones con estructura por compases, secciones, anotaciones y marcadores; guardado y respaldo JSON.
- Metrónomo local, BPM original y de práctica, **acentos elegibles por pulso y por canción**, controles de reproducción y repetición de tramos.
- Acceso obligatorio con Google y usuarios autorizados por invitación (PR #7).
- Sincronización incremental automática de canciones y repertorios, historial de hasta 20 revisiones por elemento y tratamiento de conflictos (PR #8).
- Mejoras de navegación, reproducción, anotaciones gráficas y perfil (PR #10 y #11). **Repertorios** en la navegación superior de Edición y Estudio: abre una lista y regresa al repertorio elegido. Al abandonar Edición, permite guardar, descartar o cancelar.
- Temas claro, oscuro y automático; alto contraste; módulos con colores diferenciados; avisos de novedades.
- Aplicación web instalable (PWA) y funcionamiento local sin conexión después de la primera carga y autorización compatibles.

**Importante:** que el código esté en `main` no garantiza por sí solo que las reglas vigentes en Firebase coincidan con el repositorio. Los accesos, la sincronización entre dispositivos y las reglas deben validarse con cuentas reales. Las canciones privadas no deben subirse al repositorio público.

## Cómo usar

1. Abre https://kernnel.app/ y accede con una cuenta Google autorizada.
2. En **Inicio**, crea o selecciona un repertorio y una canción.
3. Utiliza **Edición** para organizar compases, secciones y anotaciones. En Edición o Estudio pulsa **Repertorios** en el encabezado para escoger uno; desde Edición confirma si deseas guardar antes de salir.
4. En **Estudio**, ajusta el BPM de práctica, selecciona los pulsos que deseas acentuar desde **Metrónomo y audio** y utiliza Reproducir, Detener, Ir a compás o Loop.
5. En herramientas, utiliza **Respaldos y papelera** para exportar un JSON de seguridad. Guarda el archivo fuera del navegador.
6. En **Sincronización Google**, comprueba el estado de los cambios: antes de cerrar o cambiar de equipo, espera la confirmación «Guardado en la nube», si hay Internet.

### Datos, permisos y continuidad

- El acceso se controla con Firebase Authentication y las reglas de Firestore; la app no debe mostrar bibliotecas de cuentas distintas.
- Los cambios locales pendientes pueden sincronizarse al reconectar; no editar simultáneamente una misma canción en dos dispositivos sin revisar los conflictos.
- Un respaldo JSON exportado es una copia adicional independiente de la nube.
- La PWA y el almacenamiento local dependen de las restricciones del navegador y del dispositivo; conservar respaldos externos.
- El dominio principal usa GitHub Pages, y la configuración DNS/HTTPS debe verificarse de manera independiente.

## Pruebas y mantenimiento

El workflow [`validacion-kernnel.yml`](.github/workflows/validacion-kernnel.yml) comprueba sintaxis y ejecuta `node --test tests/*.test.cjs` con datos ficticios. No despliega, no usa cuentas reales y no modifica Firebase.

```bash
node --test tests/*.test.cjs
```

Antes de publicar cambios de lógica, datos o permisos: realizar copia JSON, ejecutar pruebas, verificar permisos y almacenamiento, y probar en Windows y Safari/iPad. Consulta el [protocolo](docs/validacion-prepublicacion.md).

## Desarrollos deliberadamente congelados

Estas mejoras **no forman parte de la versión principal**:

1. [PR #12](https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/12): notas avanzadas, progreso y salas compartidas; requiere validación Firebase y de usuarios.
2. [Issue #13](https://github.com/osdrumm-sudo/kernnel-estudio-musical/issues/13): Metriqa 3.0 híbrida con métricas variables, metrónomo adaptativo, capas por instrumento y visor MusicXML/PDF.
3. [Demos Instrument Hub y Timeline](https://github.com/osdrumm-sudo/kernnel-estudio-musical/tree/prototipos/metriqa-practica-3-4/prototipos/practica-3-4): pruebas HTML aisladas del proyecto oficial, sin integrarse al motor principal.

Los archivos de demostración publicados bajo `/demos/` no usan cuentas ni datos de producción. No representan funcionalidades disponibles dentro de la aplicación principal.

## Estructura técnica

Aplicación estática en HTML/CSS/JavaScript (incluye Web Audio y Service Worker), sincronización de datos por Firebase Authentication/Firestore y GitHub Pages para publicación. El manual público está en un repositorio independiente: `osdrumm-sudo/kernnel-guia-oficial`.

## Estudio futuro (sin implementar)

- [Propuesta de reproductor musical personal](docs/propuesta-reproductor-musical-futuro.md): archivos de audio aportados por cada usuario, reproducción y bucle A/B. Se evaluarán almacenamiento, permisos, cuotas y funcionamiento en iPad antes de programarlo. **La app actual no incluye este reproductor.**
