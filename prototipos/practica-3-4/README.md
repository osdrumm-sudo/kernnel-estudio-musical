# Metriqa — Prototipos de práctica 3 y 4

**Estado:** demostraciones independientes para evaluación, no integradas en la aplicación oficial.  
**Rama:** `prototipos/metriqa-practica-3-4` (nace de `main`).  
**Decisiones de producto:** [evolución híbrida #13](https://github.com/osdrumm-sudo/kernnel-estudio-musical/issues/13) y [PR #12 pendiente](https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/12).

## Archivos

| Prototipo | Archivo | Qué permite probar |
| --- | --- | --- |
| Opción 3 · Instrument Hub | [Abrir demo](./Metriqa_Opcion_3_Instrument_Hub.html) | Selección de batería, guitarra, bajo, teclado o voz; datos guía por instrumento; metrónomo Web Audio; secciones 4/4, 7/8 y 6/8; BPM de práctica y bucle |
| Opción 4 · Timeline | [Abrir demo](./Metriqa_Opcion_4_Timeline.html) | Línea temporal de 16 compases; selección de compás; cambio de cifra indicadora, BPM, unidad de pulso y acentos; aplicación por compás o sección; metrónomo y guardado local cuando el navegador lo permite |

## Cómo probar

1. En GitHub, abrir el HTML deseado y usar **Download raw file** (Descargar archivo sin procesar); también puedes clonar o descargar el ZIP de esta rama.
2. Abrir el archivo HTML en Chrome, Edge, Firefox o Safari. Ambos son autocontenidos (HTML, CSS y JavaScript) y no necesitan cuenta ni conexión de red.
3. Pulsar **Reproducir**: el navegador exige una interacción para activar el audio. Verificar el volumen y la salida de sonido.
4. Opción 3: cambiar de instrumento y sección, activar repetición y escuchar las acentuaciones.
5. Opción 4: elegir compás, editar configuración rítmica y probarla con **Reproducir**. El guardado usa `localStorage`, que algunos navegadores bloquean con `file://`.
6. Atajos: **Espacio** reproduce/pausa; **Escape** detiene (salvo al editar campos).

## Alcance y restricciones

- El material por instrumento, las notas y las figuras mostradas son **ilustrativos**; no son partituras de producción ni pistas reales.
- No hay importación MusicXML/MXL/PDF, cuentas Google, Firestore, sincronización entre músicos, salas colaborativas ni integración con las canciones existentes.
- El metrónomo se genera localmente con Web Audio. Los cambios de cifra/tempo/pulso son funcionales dentro de cada demo, no dentro de `main`.
- La configuración local del prototipo 4 puede perderse al borrar los datos del navegador o al abrir `file://` en un entorno restrictivo.
- Ambas demos son exclusivamente material de exploración. Para incorporarlas a Metriqa será necesario adaptar el modelo de canción, el motor de reproducción y las pruebas de regresión.
- **No fusionar esta rama a `main` sin validación**, respaldo de datos, pruebas en Windows/iPad y revisión del PR #12 congelado.
