# Kernnel Estudio musical

**Realizado por OSS/26** · Evolución comercial prevista: Metriqa.

Aplicación web de estudio musical con canciones, compases, anotaciones, repertorios, metrónomo y trabajo sin conexión tras una autorización previa. Código estático (HTML, CSS y JavaScript), servido mediante GitHub Pages; identidad y datos remotos en Firebase.

## Estado de la implementación (17 de noviembre de 2026)

- **PR #7 fusionado (12/11):** acceso obligatorio con Google, autorización por invitación, panel del administrador y aislamiento de biblioteca local por UID.
- **PR #8 fusionado (13/11):** sincronización incremental automática de canciones y repertorios. Se inicia tras entrar con una cuenta autorizada y transmite cambios después de aproximadamente 1,5 s de inactividad.
- **Validación pendiente:** la fusión en GitHub no prueba que las reglas vigentes en Firebase coincidan con `firestore.rules`, ni certifica el despliegue, el login real, Safari/iPad o la sincronización entre equipos.
- `main` es la rama publicada prevista. Confirmar la configuración y el despliegue efectivo de GitHub Pages antes de declarar cualquier cambio disponible en producción.

## Acceso e infraestructura existente

| Elemento | Referencia |
| --- | --- |
| Aplicación | https://kernnel.app/ |
| Manual independiente | https://manual.kernnel.app/ |
| Repositorio del manual | https://github.com/osdrumm-sudo/kernnel-guia-oficial |
| Proyecto Firebase | `kernnel-studio` |
| Administrador de la aplicación | `ols.bds@gmail.com` |
| Reglas de seguridad versionadas | [firestore.rules](firestore.rules) |

El dominio `www.kernnel.app` y las reglas DNS de Cloudflare deben comprobarse por separado. El archivo de reglas versionado **no se publica automáticamente** en Firestore desde GitHub Pages. El rol de administrador de la app no equivale a permisos administrativos de las consolas Firebase o Cloudflare.

## Flujo de uso actual

1. Abrir `https://kernnel.app/` con conexión a Internet y entrar con Google.
2. La cuenta administradora tiene acceso directo; las demás requieren una autorización activa. Un usuario no autorizado puede solicitar acceso.
3. Tras ingresar, se carga la biblioteca local de esa cuenta y se inicia la reconciliación con Firestore. Se sincronizan **canciones y repertorios**; preferencias globales y papelera permanecen locales.
4. Las modificaciones se guardan en este equipo y se intentan enviar automáticamente a la nube. Comprobar el indicador **«Guardado en la nube»** antes de cambiar de dispositivo.
5. Sin red se trabaja con la autorización previamente validada y los datos locales; los cambios se envían cuando vuelve la conexión. La revocación de acceso requiere conectividad para revalidarse.
6. Si dos dispositivos editan el mismo elemento, la aplicación conserva el contenido remoto y una copia identificada como conflicto. Existe historial de hasta 20 revisiones por elemento, recuperables como copias.

**La sincronización no sustituye un respaldo externo.** Exportar periódicamente **«Exportar todo (JSON)»**, confirmar que el archivo existe y conservar otra copia fuera del dispositivo. No borrar el almacenamiento del navegador ni cambiar de origen web para «actualizar» la aplicación: puede perderse contenido local.

## Preparación y comprobación de Firebase

Antes de efectuar pruebas con datos importantes:

1. En Firebase Authentication, verificar Google habilitado y dominios de ingreso autorizados. El código exige proveedor Google y correo verificado; revisar si correo/contraseña sigue habilitado, aunque las reglas de datos exijan Google.
2. En Firestore (base `(default)`), comparar las reglas **publicadas** con [firestore.rules](firestore.rules). Nunca dar por aplicada una regla sólo porque exista en GitHub.
3. En entorno de prueba o emulador, comprobar acceso autorizado al propio UID, prohibición de lectura entre usuarios, denegación a no autorizados, formato de documentos y carácter inmutable de fragmentos.
4. Con datos ficticios, probar ingreso del administrador, solicitud/aprobación/revocación de invitado y restauración entre dos dispositivos. Probar cambios offline y conflicto.
5. Revisar cuota de Firestore. Hay retención lógica de hasta 20 revisiones, pero cargas interrumpidas y fallos de limpieza pueden dejar fragmentos huérfanos.

No incluir secretos de cuentas de servicio en el repositorio ni en el frontend. La configuración web pública de Firebase **no es** una credencial de administrador.

## Pruebas automatizadas y CI

Desde la raíz del repositorio con Node instalado:

```sh
node --test tests/*.test.cjs
```

Las pruebas de acceso y sincronización existentes usan dobles de Firebase. `tests/backup-contract.test.cjs`, recuperado y adaptado del PR #3, cubre exportación JSON, integridad de repertorios, fusión, validación de entradas e inexistencia de credenciales en datos ficticios. El workflow `.github/workflows/validacion-kernnel.yml` ejecuta la suite para cambios de código o pruebas y **no despliega** la aplicación.

Estas pruebas no sustituyen ensayos con Firebase autenticado, sus reglas reales ni navegadores físicos. Antes de integrar cualquier PR, revisar el resultado de CI y confirmar manualmente los casos afectados.

## Documentación técnica

- [Sincronización incremental y límites](docs/sincronizacion-incremental.md)
- [Protocolo de validación de producción](docs/validacion-prepublicacion.md)
- [Historial del PR #7](https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/7)
- [Historial del PR #8](https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/8)

Las instrucciones históricas de copias manuales y las referencias al estado «no fusionado» se consideran **superadas** por el código actual. Los archivos antiguos se preservan únicamente como documentación histórica.
