# Verificación antes de integrar o publicar Kernnel / Metriqa

Actualizado: 20 de noviembre de 2026. Las casillas se mantienen **pendientes** hasta contar con evidencia real.

## 1. Código, enlaces y pruebas

- [ ] Confirmar que el PR incluye las funciones del 19/11 (nombre de perfil, notas, avance y salas).
- [ ] Conservar un respaldo JSON externo y verificado antes de pruebas de importación o borrado.
- [ ] Revisar el diff completo; comprobar que no hay contraseñas, claves de servicio ni datos reales.
- [ ] GitHub Actions: `node --test tests/*.test.cjs` y revisión de sintaxis sin fallos.
- [ ] Comprobar los recursos internos HTML/PWA y enlaces `kernnel.app`, `manual.kernnel.app/#manual` y `www.kernnel.app`. Las comprobaciones automáticas de HTTP requieren confirmación del redireccionamiento real.
- [ ] Revisar los textos en español de Chile y los términos Inicio, Edición, Estudio, repertorio, notas, progreso, director, participante y sala.

## 2. Firebase y autorización real

- [ ] Comparar la versión **publicada** de Firestore con `firestore.rules` en GitHub. No son equivalentes por defecto.
- [ ] Probar en emulador el cierre por defecto y el aislamiento por UID.
- [ ] Usuario no autorizado: no puede leer, editar ni sincronizar notas, progreso o repertorios.
- [ ] Administrador: acceso al panel; usuario invitado: acceso sólo después de aprobación; revocación efectiva al reconectar.
- [ ] Comprobar restricciones de formato de adjuntos y tamaño; archivos PDF o imagen con datos ficticios.
- [ ] Director: crea sala, invita correos y cambia partitura/tempo/tramo; participante: sólo puede leer una sala a la que está invitado.
- [ ] Cuenta ajena: no accede a sala ni a partituras/fragmentos; la sala cerrada no permite seguir leyendo contenido.
- [ ] Validar sincronización del reloj de la sala y comportamiento bajo latencia móvil; el metrónomo se genera localmente, no se transmite audio.
- [ ] Verificar que la lista de invitados no admite revocación individual: definir política antes de ofrecer salas comerciales.

## 3. Persistencia y dispositivos

- [ ] PC y iPhone/iPad: la misma cuenta recibe canción/repertorio y notas sin reemplazo destructivo.
- [ ] Progreso de estudio persistente después de cerrar/abrir la aplicación y cambiar de dispositivo.
- [ ] Cambios offline se guardan localmente y sincronizan después.
- [ ] Conflictos entre versiones de canciones preservan ambas revisiones.
- [ ] Cambiar de cuenta no mezcla bibliotecas ni adjuntos.
- [ ] Actualizar PWA sin borrar datos del navegador.

## 4. Publicación y documentación

- [ ] Verificar GitHub Pages desde `main` y revisar HTTP/TLS de los dominios.
- [ ] Confirmar que `www.kernnel.app` redirige correctamente; si falla, corregir DNS/Cloudflare por separado.
- [ ] Actualizar manual independiente para nuevas funciones.
- [ ] Revisar cuotas y limpieza de fragmentos/adjuntos en Firestore.
- [ ] Tras publicar las reglas reales compatibles, probar de nuevo acceso y salas.
- [ ] Registrar la aprobación del propietario y los resultados de verificación.

**Importante:** las pruebas Node usan datos ficticios y dobles de Firestore. Una prueba local o un PR fusionado **no certifican** las reglas de producción, el DNS o la compatibilidad de iPad/Safari.
