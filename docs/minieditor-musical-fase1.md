# Metriqa Full — Minieditor Musical · Fase 1 (primera entrega)

**Estado:** implementación inicial de escritura y persistencia, pendiente del resto de la Fase 1. La rama de respaldo es respaldo/metriqa-publico-2026-11-24 (commit 623c0fb).

## Incluido en esta entrega

- Núcleo de notación estructurada versión 2, 960 ticks por negra.
- Compases con identificadores estables, métrica heredada y capacidad de representar cambios por secciones.
- Creación explícita de fragmentos rítmicos, melódicos y percusivos, inicialmente de un compás.
- Inserción táctil de notas y silencios con figuras normales y tresillos, dos voces, alturas MIDI y algunos instrumentos de batería.
- Vista simplificada de pentagrama y cuadrícula, ambas construidas desde los mismos eventos.
- Eliminación de eventos y deshacer de acciones durante la sesión.
- Persistencia dentro de la canción mediante los respaldos JSON y sincronización existentes, sin modificar reglas de Firebase.
- Caché PWA de los nuevos recursos.
- Protección básica ante la eliminación de un compás con fragmentos enlazados.
- La canción se conserva en formato antiguo hasta que el usuario pulsa «Habilitar Minieditor».

## Deliberadamente no incluido aún

- Motor de reloj unificado, reproducción de figuras, cursor continuo y sincronización precisa.
- Loop por subdivisión, anacrusas, tempo progresivo.
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

1. Diseño e integración del reloj compartido con conversión estable ticks/segundos.
2. Posición de práctica precisa, loop por intervalos exactos y seguimiento continuo.
3. Fragmentos de varios compases, edición avanzada de notas y validaciones estructurales.
4. Pruebas manuales de Safari/iPad, dispositivos Windows y sincronización con cuentas de prueba.

La publicación en main debe hacerse únicamente tras verificar CI. Las pruebas automatizadas no sustituyen a las pruebas en dispositivos reales.
