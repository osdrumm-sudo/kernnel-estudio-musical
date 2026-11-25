# Metriqa Free — alcance y restricciones

## Decisiones de producto
- Priorizar Free; congelar el desarrollo avanzado Full en su rama de integración, sin revertirlo.
- Free: máximo dos repertorios y cuatro canciones por repertorio.
- Free: máximo 50 caracteres por anotación de texto. Las anotaciones más largas corresponden al nivel superior de la oferta freemium (Full); su límite exacto no está definido.

## Auditoría inicial de main
- `index.html`: las anotaciones de compás se guardan en `t.notas[j]` mediante un textarea y guardado diferido; los comentarios de pulso se editan en `beat-comment` y se guardan en `tiempos` mediante `saveBeatDialog`.
- `cloud.js` y `firestore.rules`: se comprueba acceso autorizado, pero no se encontró un sistema de derechos Free/Full. No imponer el límite indistintamente a todas las cuentas.
- Los datos de sincronización se almacenan en documentos y partes de versiones. Se requiere revisar cómo validar el contenido de manera autoritativa; el contador de interfaz por sí solo no constituye control de plan.

## Criterios propuestos de aceptación
- Interpretación: 50 caracteres por anotación de compás o pulso, incluidos espacios y puntuación; no por canción.
- Contador accesible, aviso al alcanzar 50 y bloqueo de nuevas anotaciones superiores al límite en cuentas Free, incluso sin conexión.
- Conservar textos históricos de más de 50 caracteres; permitir lectura y operaciones ajenas a su edición, sin truncamiento durante carga, sincronización, migración o restauración.
- No aplicar el límite a títulos, nombres de secciones ni formularios de acceso sin una decisión explícita.
- Casos: 0/49/50/51 caracteres, pegado, caracteres Unicode y saltos de línea, edición de datos históricos, cambio de plan, guardado offline y sincronización posterior.
- Derechos de plan controlados por servidor, no editables por el cliente; diseñar el tratamiento de sesiones offline y datos históricos antes de publicar reglas.

## Pendiente
Definir derechos de cuenta, tratamiento de límites en restauración e importación, unidad Unicode de conteo y máximo del nivel superior. Implementar y probar en rama Free. No cambiar main, producción Firebase ni la rama Full hasta validar.
