# Metriqa Free — alcance y restricciones

## Decisiones de producto
- Priorizar Free; congelar el desarrollo avanzado Full en su rama de integración, sin revertirlo.
- Free: máximo dos repertorios y cuatro canciones por repertorio.
- Free: máximo 50 caracteres computables por anotación de texto, excluyendo espacios y signos. Las anotaciones más largas corresponden al nivel superior de la oferta freemium (Full); su límite exacto no está definido.

## Auditoría inicial de main
- `index.html`: las anotaciones de compás se guardan en `t.notas[j]` mediante un textarea y guardado diferido; los comentarios de pulso se editan en `beat-comment` y se guardan en `tiempos` mediante `saveBeatDialog`.
- `cloud.js` y `firestore.rules`: se comprueba acceso autorizado, pero no se encontró un sistema de derechos Free/Full. No imponer el límite indistintamente a todas las cuentas.
- Los datos de sincronización se almacenan en documentos y partes de versiones. Se requiere revisar cómo validar el contenido de manera autoritativa; el contador de interfaz por sí solo no constituye control de plan.

## Criterios de aceptación
- Interpretación: 50 caracteres por anotación de compás o pulso, sin contar espacios ni signos; no por canción. Como criterio técnico propuesto, contar letras y números, tratando las letras con tildes como una sola letra.
- Contador visible y accesible, aviso de acceso a Full al alcanzar 50, y limitador automático que impide añadir caracteres computables por encima de 50 en cuentas Free, incluso sin conexión (requisito confirmado por el titular del producto). Verificar también antes de sincronizar y al reconectar; no descartar los datos históricos ni los cambios válidos. El aviso es un elemento independiente del texto de la anotación.
- Decisión aprobada: conservar íntegramente todo el contenido creado antes de la entrada en vigor del plan Free (anotaciones de cualquier longitud, canciones y repertorios, incluso si exceden las nuevas cuotas). No eliminar, truncar ni bloquear la consulta de datos históricos durante carga, migración, sincronización o restauración. Las nuevas anotaciones Free conservan hasta 50 caracteres computables; los espacios y signos no cuentan. Las restricciones se aplican a las nuevas incorporaciones y ampliaciones, con tratamiento de edición de textos históricos que no reduzca ni pierda datos automáticamente.
- No aplicar el límite a títulos, nombres de secciones ni formularios de acceso sin una decisión explícita.
- Casos: 0/49/50/51 letras o números, espacios y signos no computables, pegado, tildes, caracteres Unicode y saltos de línea, edición de datos históricos, cambio de plan, guardado offline y sincronización posterior.
- Derechos de plan controlados por servidor, no editables por el cliente; diseñar el tratamiento de sesiones offline y datos históricos antes de publicar reglas.

## Incentivo de ampliación Free — decisión de producto
- Al alcanzar por tercera vez un límite de Free (anotaciones u otras capacidades limitadas), mostrar un cartel con una alternativa voluntaria para obtener un 10 % adicional de capacidad, acercando al usuario a Premium/Full.
- No conceder la ampliación sin la acción afirmativa del usuario. Mantener los datos previamente creados y el funcionamiento offline.
- Condiciones aprobadas: ampliación permanente, aplicable a todas las capacidades limitadas de Free, una única activación por usuario (no acumulativa). No equivale a desbloquear todas las funcionalidades Premium.
- Propuesta técnica pendiente de validación: contar tres ocasiones distintas, no tres pulsaciones consecutivas sobre el mismo límite; registrar el beneficio por cuenta, con sincronización idempotente para evitar duplicaciones. Si el porcentaje se calcula sobre el límite Free: 50 → 55 caracteres computables, 2 → 2,2 repertorios y 4 → 4,4 canciones por repertorio antes de redondear. Se recomienda redondear al entero superior para que todas las cuotas reciban una ampliación efectiva (3 repertorios y 5 canciones por repertorio); ello supera el 10 % nominal en cupos discretos y requiere aprobación. Pendiente resolver redondeo y confirmar base de cálculo antes de implementar el incentivo.

## Pendiente
Definir derechos de cuenta, mecanismo de identificación de contenido previo a Free y tratamiento de importaciones nuevas y edición de contenido histórico, unidad Unicode de conteo y máximo del nivel superior. Implementar y probar en rama Free. No cambiar main, producción Firebase ni la rama Full hasta validar.
