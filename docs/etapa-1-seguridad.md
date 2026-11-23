# Kernnel 2.0 — Etapa 1: seguridad y preparación
Fecha de referencia: 10 de noviembre de 2026

## Estado y alcance
- Rama principal de aplicación: `main` (sin modificar en esta etapa).
- Commit de referencia: `81c84a7aa656a0fe2a7ccea8a2fc07170c253ff1`.
- Rama de respaldo de código: `respaldo/kernnel-2-pre-etapa1-2026-11-10`.
- Rama de trabajo: `desarrollo/kernnel-2-etapa1-seguridad`.
- Manual: `osdrumm-sudo/kernnel-guia-oficial`; respaldo también creado desde `ac85c1c082efc1572849c64df43f07bf2e491f48`.
- No se cambian DNS, Firebase, esquema de datos, PWA de producción ni sitios publicados.

**Importante:** las ramas de respaldo almacenan versiones del **código**. No contienen las canciones guardadas en navegadores o en Google Firestore. No son copias de seguridad de datos personales.

## Contrato de datos vigente (verificado en código)
- Guardado local: clave `compases-v1` en localStorage y base `compases-db` en IndexedDB; la carga considera la versión válida con mayor `updatedAt`.
- Respaldo JSON completo: `temas`, `sel`, `repertorios`, `papelera`, `prefs`, `backupAt`, `updatedAt`.
- Repertorios: arrays `songs` con identificadores de canciones, sin duplicar sus registros.
- Las canciones pueden contener notas, nombres, pulsos, imágenes integradas, secciones con colores personalizados y preferencias de estudio.
- Transferencias selectivas: `format: compases-transfer`, `version: 2`.
- La importación tiene opción de fusionar copias o reemplazar todo. La sincronización manual con Firebase también permite reemplazar la biblioteca local. Se requiere confirmación explícita en interfaz.
- La restauración de respaldos completos usa `normalize()`, que valida los campos principales y elimina referencias de repertorio a canciones inexistentes.

## Verificaciones automatizadas
Comando desde la raíz de la rama de desarrollo:

```sh
node --test tests/backup-contract.test.cjs
```

Las seis pruebas usan únicamente datos ficticios y cubren:
1. Exportación completa con imágenes, compases, secciones, sesiones, papelera y preferencias.
2. Lectura del JSON completo mediante `normalize()`, conservando referencias de repertorios.
3. Exportación de un repertorio e importación con nuevas identificaciones.
4. Exportación individual sin alterar la biblioteca fuente.
5. Rechazo de importaciones de estructura claramente inválida.
6. Ausencia de campos de contraseñas o credenciales en los datos de prueba exportados.

El flujo `.github/workflows/seguridad-etapa1.yml` ejecuta estas pruebas en la rama y no tiene pasos de despliegue.

## Precauciones detectadas (pendientes, no modificadas en Etapa 1)
1. Restaurar desde la papelera una canción eliminada conserva el tema, pero no restaura automáticamente sus vínculos anteriores con repertorios. Corregir en Etapa 3.
2. El campo `backupAt` se actualiza cuando se prepara el respaldo; no existe confirmación del navegador de que el archivo efectivamente haya quedado descargado. Verificar el archivo en Descargas.
3. Las copias de Firebase son manuales: una recuperación remota sustituye el estado local. Descargar un respaldo JSON previo para no sobrescribir cambios sin copia.
4. Datos locales no migran entre dominios web. `kernnel.app` y la URL de GitHub Pages utilizan orígenes diferentes.
5. El validador de importación no equivale a un análisis exhaustivo de la integridad de datos; respaldar antes de probar importaciones y no importar archivos desconocidos.

## Procedimiento para respaldos reales previo a la migración de dominios
Este procedimiento requiere la interacción del usuario en **el navegador/dispositivo donde están sus canciones reales**:

1. Abrir la aplicación actual bajo su origen original: https://osdrumm-sudo.github.io/kernnel-estudio-musical/
2. Entrar a **Respaldos y papelera** y elegir **Exportar todo (JSON)**.
3. Comprobar en Descargas que exista un archivo `kernnel-estudio-respaldo-AAAA-MM-DD.json` no vacío.
4. Conservar una segunda copia fuera del dispositivo. No publicar el archivo en un repositorio público ni compartir credenciales.
5. Antes de importar en un origen nuevo, verificar una copia de prueba: nombres y número de canciones, repertorios, notas, secciones y, donde corresponda, imágenes incrustadas.
6. Mantener el origen anterior accesible hasta confirmar la recuperación en el nuevo dominio.
7. Solo cuando se valide este procedimiento autorizar la migración de dominio y la restauración en producción.

**Estado actual:** las pruebas sobre datos ficticios no prueban la integridad de los datos reales; no se ha recibido ni exportado un JSON real de ningún dispositivo.

## Puertas de control antes de Etapa 2
- [x] Crear punto de respaldo del código de ambos repositorios.
- [x] Crear ramas aisladas de desarrollo para ambos repositorios.
- [x] Auditar rutas locales, JSON y sincronización remota mediante revisión del código.
- [x] Incorporar pruebas automatizadas al repositorio de desarrollo.
- [x] Ejecución CI confirmada en GitHub Actions: https://github.com/osdrumm-sudo/kernnel-estudio-musical/actions/runs/42817610799 (resultado: success, pruebas sin despliegue).
- [ ] Usuario: exportar y comprobar un respaldo JSON real antes de la migración y cualquier importación de datos.
- [ ] Probar flujos interactivos y PWA en dispositivos (Etapa 6).

No fusionar, desplegar ni redirigir dominios durante la Etapa 1.
