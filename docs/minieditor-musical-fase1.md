# Metriqa Full — Minieditor Musical · Fase 1 (primera entrega)

**Estado:** segunda entrega de la Fase 1: escritura, persistencia y reloj musical compartido integrados; la Fase 1 aún no está completa. La rama de respaldo es respaldo/metriqa-publico-2026-11-24 (commit 623c0fb).

## Incluido en esta entrega

- Núcleo de notación estructurada versión 2, 960 ticks por negra.
- Compases con identificadores estables, métrica heredada y capacidad de representar cambios por secciones.
- Creación explícita de fragmentos rítmicos, melódicos y percusivos, inicialmente de un compás.
- Inserción táctil de notas y silencios con figuras normales y tresillos, dos voces, alturas MIDI y algunos instrumentos de batería.
- Vista simplificada de pentagrama y cuadrícula, ambas construidas desde los mismos eventos.
- Eliminación de eventos y deshacer de acciones durante la sesión.
- Persistencia dentro de la canción mediante los respaldos JSON y sincronización existentes, sin modificar reglas de Firebase.
- Caché PWA de los nuevos recursos.
- Reloj musical único (`music-clock.js`) para eventos Web Audio, pulsos y cursor: 960 ticks por negra, métrica por compás cuando existe en el modelo y cuenta de entrada que no se repite dentro de loops.
- Programación de clics anticipada con `AudioContext.currentTime`, posición visual interpolada mediante `requestAnimationFrame`, y salto de eventos atrasados después de suspensiones, evitando doble conteo.
- Loop exacto por ticks en el motor; acción «Practicar fragmento» que prepara el intervalo sin iniciar automáticamente el audio.
- Cursor continuo sobre la vista simplificada de fragmento y resaltado simultáneo de figuras activas (sin reproducción sintetizada de notas).
- Pruebas de continuidad 4/4 → 6/8, tresillos, bucles, cuenta de entrada, acentos y 1000 vueltas sin deriva acumulada.
- Cambiar BPM detiene la reproducción actual para iniciar una nueva planificación estable.
- Se bloquea temporalmente agregar o quitar compases en canciones que ya usan música v2, hasta contar con remapeo estructural seguro.
- Protección básica ante la eliminación de un compás con fragmentos enlazados.
- La canción se conserva en formato antiguo hasta que el usuario pulsa «Habilitar Minieditor».

## Deliberadamente no incluido aún

- La reproducción sintetizada de figuras no está incluida (se mantiene como función futura).
- Anacrusas completas, tempo progresivo y edición visual de loops con subdivisiones arbitrarias aún no están incluidos. El motor sí acepta límites exactos y «Practicar fragmento» los utiliza.
- Escritura que atraviese compases, ligaduras, flams, drags y edición compleja.
- Cambios de métrica editables con previsualización desde la interfaz.
- Visor MusicXML, PDF y exportación musical.
- Autorización comercial Free/Full.

**Advertencia:** no interpretar este primer corte como Fase 1 terminada. La visualización del pentagrama es inicial, no produce todavía partitura grabada ni exportable. No se ha desplegado ninguna estructura nueva de Firebase.

## Reglas de compatibilidad

- No migrar automáticamente canciones preexistentes.
- No transformar comentarios antiguos en figuras.
- Mantener temas, repertorios y el protocolo de sincronización actual.
- Almacenamiento musical en tema.musica con schemaVersion 2.
- La sincronización sigue considerando la canción completa como unidad de conflicto.
- Descartar la suposición de que una PWA actualizada equivale a respaldo de datos privados.
- Antes de publicación: ejecutar pruebas, comprobación sintáctica y revisión de los cambios.

## Siguientes entregas de la Fase 1

1. Fragmentos de varios compases y selección editable de límites de práctica por subdivisión desde la interfaz.
2. Edición estructural segura de compases, validaciones y pruebas de recuperación.
3. Integración visual de dos compases de anticipación y panel fijo de Estudio.
4. Pruebas reales de Safari/iPad, dispositivos Windows y sincronización con cuentas de prueba.

La publicación en main debe hacerse únicamente tras verificar CI. Las pruebas automatizadas no sustituyen a las pruebas en dispositivos reales.
