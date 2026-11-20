# Kernnel Estudio musical

**Realizado por OSS/26** · Metriqa es la evolución comercial prevista de Kernnel; el producto publicado y el código conservan por ahora el nombre **Kernnel**.

Aplicación web musical para organizar canciones, compases y repertorios, estudiar con metrónomo, escribir notas y trabajar con salas privadas. Interfaz en español de Chile. Aplicación estática alojada mediante GitHub Pages, Firebase Authentication para ingresar y Cloud Firestore para los datos de cada cuenta.

## Estado del código — 20 de noviembre de 2026

- **PR #7 (12/11):** ingreso obligatorio con Google y autorización por invitación.
- **PR #8 (13/11):** sincronización incremental de canciones y repertorios.
- **PR #10 (18/11):** mejoras de Inicio, Edición y Estudio.
- **PR #11 (19/11):** corrección de nombre de perfil.
- **PR #12:** notas por canción, adjuntos de imagen/PDF, avance de estudio y salas privadas por invitación. Estas funciones **requieren publicar las nuevas reglas de Firestore** y probarlas con cuentas reales. Integrar el PR en GitHub no publica automáticamente esas reglas.

La presencia de un archivo en la rama principal no certifica que la web esté desplegada ni que los permisos del proyecto Firebase ya coincidan con él.

## Enlaces y repositorios

| Recurso | Dirección |
| --- | --- |
| Aplicación | https://kernnel.app/ |
| Manual oficial | https://manual.kernnel.app/#manual |
| Repositorio de la aplicación | https://github.com/osdrumm-sudo/kernnel-estudio-musical |
| Repositorio del manual | https://github.com/osdrumm-sudo/kernnel-guia-oficial |
| Firebase | https://console.firebase.google.com/ (proyecto `kernnel-studio`) |

El alias `https://www.kernnel.app/` debe redirigir a `https://kernnel.app/`. El DNS, SSL y las reglas de Cloudflare se comprueban por separado; **no** se dan por verificados solo porque las URLs estén escritas en el código.

## Funciones principales

### Inicio y repertorios
- Crear canciones y repertorios; asociar una canción a uno o varios repertorios, o dejarla sin repertorio.
- Crear repertorios independientemente y elegir BPM al agregar una canción.
- Ver notas, progreso y accesos a Edición y Estudio.

### Edición
- Modificar título, compases, secciones de color y anotaciones de la partitura.
- Ajustar número total de compases; guardar cambios localmente.

### Estudio
- Practicar con metrónomo Web Audio, tempo independiente, cuenta previa, selección de rango y repetición.
- Registrar avance por compases y aperturas de la vista de Estudio.
- Crear notas por canción y adjuntar imágenes o PDF dentro de los límites de tamaño definidos por la aplicación.

### Salas privadas
- El director crea una sala e invita hasta 30 cuentas Google por correo.
- El director comparte la partitura y controla el tramo, tempo y repetición.
- Los invitados autorizados ven la sala y escuchan un metrónomo producido **en su propio dispositivo**; no se transmite audio en tiempo real desde un servidor.
- Requiere conexión y reglas de Firestore compatibles. Esta función **no equivale a una sesión de audio de latencia cero** ni se considera validada hasta la prueba entre cuentas reales.
- Para impedir el acceso de todos los participantes, el director puede cerrar la sala; la revocación individual de invitaciones no está implementada en las reglas actuales.

## Acceso, almacenamiento y respaldos

1. Ingresar desde https://kernnel.app/ con Google. La cuenta administradora es `ols.bds@gmail.com`; las demás necesitan aprobación explícita.
2. La biblioteca local se separa por UID. No existe un modo invitado anónimo.
3. Canciones y repertorios se sincronizan automáticamente con Firestore después de aproximadamente 1,5 s de inactividad. Las notas y el progreso utilizan módulos adicionales de persistencia y sincronización.
4. Sin conexión, la biblioteca ya autorizada puede usarse localmente; los datos pendientes se envían al reconectar. Las salas necesitan conexión.
5. Ante ediciones simultáneas de canciones o repertorios, se conserva un duplicado de conflicto y existe un historial recuperable de hasta 20 versiones por elemento.
6. La apariencia y la papelera permanecen locales. Los límites de Firestore, las cargas incompletas y el almacenamiento del navegador siguen siendo riesgos operativos.

**Exportar periódicamente «Exportar todo (JSON)» y comprobar el archivo descargado.** Conservar otra copia fuera del dispositivo. No limpiar datos de Safari/Chrome ni del origen web como procedimiento de actualización.

## Seguridad y reglas

Las reglas versionadas están en [firestore.rules](firestore.rules). **GitHub Pages no publica reglas a Firestore**. Antes de habilitar funciones nuevas en el proyecto real:

1. Revisar `firestore.rules` en GitHub y la versión publicada en **Firebase Console → Firestore Database → Reglas**.
2. Probar en un emulador o ambiente de pruebas: acceso solo al UID autorizado, denegación entre cuentas y restricciones de salas y adjuntos.
3. Publicar expresamente las reglas compatibles en Firebase, sin reemplazarlas por reglas abiertas.
4. Probar con dos usuarios y dos dispositivos: login, solicitud de acceso, revocación, notas, progreso, invitación a una sala y cierre.
5. Revisar uso/cuotas de Firestore y la limpieza de fragmentos de versiones antiguas.

La configuración pública de Firebase para aplicaciones web no es una clave privada de servicio. Nunca subir cuentas de servicio, tokens, archivos JSON de canciones reales o contraseñas a un repositorio público.

## Pruebas y publicación

Requiere Node.js. Desde la raíz:

```sh
node --test tests/*.test.cjs
```

GitHub Actions ejecuta estas pruebas y revisa sintaxis e integridad de rutas internas. Los tests con dobles de Firebase **no certifican las reglas reales**. El workflow también inspecciona el estado HTTP de los dominios, pero no modifica DNS ni Firestore.

La aplicación y el manual son repositorios independientes. Fusionar cambios de aplicación **puede publicar la web** según cómo esté configurado GitHub Pages; requiere revisión previa.

Consultar [validación anterior a la publicación](docs/validacion-prepublicacion.md) y [sincronización incremental](docs/sincronizacion-incremental.md).

## Documentación oficial

- [Firestore: reglas de seguridad](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [GitHub Pages](https://docs.github.com/en/pages)
