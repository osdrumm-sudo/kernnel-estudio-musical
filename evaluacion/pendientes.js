/* Metriqa QA · catálogo derivado de hoja de ruta y PR abiertos. */
(function(root){'use strict';
const items=[
  {
    "id": "F-M01",
    "version": "full",
    "group": "Motor musical y estructura",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/21",
    "title": "Integridad del modelo musical v2",
    "criteria": "Evitar IDs duplicados, referencias huérfanas y solapamientos incompatibles."
  },
  {
    "id": "F-M02",
    "version": "full",
    "group": "Motor musical y estructura",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/21",
    "title": "Integración de correcciones PR #21",
    "criteria": "Revisar diferencias y regresión al fusionar sin romper canciones."
  },
  {
    "id": "F-M03",
    "version": "full",
    "group": "Motor musical y estructura",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/21",
    "title": "Reloj musical único",
    "criteria": "Comprobar metrónomo, cursor visual y transporte sincronizados."
  },
  {
    "id": "F-M04",
    "version": "full",
    "group": "Motor musical y estructura",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/21",
    "title": "Métricas 3/4, 4/4 y 6/8",
    "criteria": "Revisar cambios de métrica, pulso compuesto y acentos."
  },
  {
    "id": "F-M05",
    "version": "full",
    "group": "Motor musical y estructura",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/21",
    "title": "BPM original y BPM de práctica",
    "criteria": "La velocidad de práctica no altera la original ni salta tiempos."
  },
  {
    "id": "F-M06",
    "version": "full",
    "group": "Motor musical y estructura",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/21",
    "title": "Pausa, reanudación y búsqueda",
    "criteria": "Sin clics residuales ni pulsos duplicados."
  },
  {
    "id": "F-M07",
    "version": "full",
    "group": "Motor musical y estructura",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/21",
    "title": "Loop exacto por subdivisión",
    "criteria": "Inicio y término rítmicos exactos, incluso tras muchas vueltas."
  },
  {
    "id": "F-M08",
    "version": "full",
    "group": "Motor musical y estructura",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/21",
    "title": "Mover o eliminar compases",
    "criteria": "Conservar eventos, fragmentos y referencias."
  },
  {
    "id": "F-M09",
    "version": "full",
    "group": "Motor musical y estructura",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/21",
    "title": "Compatibilidad con canciones antiguas",
    "criteria": "Abrir y guardar canciones previas sin perder su estructura."
  },
  {
    "id": "F-M10",
    "version": "full",
    "group": "Motor musical y estructura",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/21",
    "title": "Fragmentos musicales independientes",
    "criteria": "Conservar identificadores, voces, rangos y vínculo a la canción."
  },
  {
    "id": "F-E01",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Integrar pentagrama liviano",
    "criteria": "Sustituir editor simplificado dentro de Edición."
  },
  {
    "id": "F-E02",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Dos compases sobre cinco líneas",
    "criteria": "Dos compases consecutivos en un mismo pentagrama con barra."
  },
  {
    "id": "F-E03",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Ventana 1–2, 2–3, 3–4",
    "criteria": "Avanza un compás por paso, sin duplicar ni perder notas."
  },
  {
    "id": "F-E04",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Límites primero y último",
    "criteria": "Evitar índices inválidos al inicio o fin."
  },
  {
    "id": "F-E05",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Nombres completos de piezas",
    "criteria": "Crash, Ride, Hi-hat, Tom, Caja, Tom de piso y Bombo."
  },
  {
    "id": "F-E06",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Notación estándar de batería",
    "criteria": "Posiciones, cabezas X/ovaladas y plicas coherentes."
  },
  {
    "id": "F-E07",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Arrastrar figuras musicales",
    "criteria": "Soltar con mouse o toque en instrumento y tiempo correctos."
  },
  {
    "id": "F-E08",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Seleccionar figura y tocar",
    "criteria": "Alternativa táctil al arrastre."
  },
  {
    "id": "F-E09",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Figuras y silencios",
    "criteria": "Redonda, blanca, negra, corchea, semicorchea, tresillos y silencios."
  },
  {
    "id": "F-E10",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Imán de subdivisión",
    "criteria": "Ajuste rítmico sin redondear al compás equivocado."
  },
  {
    "id": "F-E11",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Golpes simultáneos y voces",
    "criteria": "Bombo y platillo simultáneos sin sobrescritura."
  },
  {
    "id": "F-E12",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Mover notas entre compases",
    "criteria": "Conservar instrumento, duración y tiempo de cada evento."
  },
  {
    "id": "F-E13",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Modificar y borrar notas",
    "criteria": "Cambiar duración e instrumento o quitar figura."
  },
  {
    "id": "F-E14",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Deshacer y rehacer",
    "criteria": "Recuperar cambios sin afectar otros fragmentos."
  },
  {
    "id": "F-E15",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Limpiar todo el fragmento",
    "criteria": "Confirmación advierte alcance completo, incluso compases no visibles."
  },
  {
    "id": "F-E16",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Cancelar limpieza",
    "criteria": "Cancelar conserva todas las notas."
  },
  {
    "id": "F-E17",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Deshacer limpieza",
    "criteria": "Recuperar cada evento del fragmento eliminado."
  },
  {
    "id": "F-E18",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Guardado del fragmento",
    "criteria": "Reabrir canción sin perder voz, ticks o instrumentos."
  },
  {
    "id": "F-E19",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Rango multicompás",
    "criteria": "Cambiar límites sin destruir figuras fuera de ventana."
  },
  {
    "id": "F-E20",
    "version": "full",
    "group": "Minieditor de batería",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Lectura segura en Estudio",
    "criteria": "Evitar modificaciones accidentales al practicar."
  },
  {
    "id": "F-S01",
    "version": "full",
    "group": "Vista Estudio y navegación",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Vista anticipada",
    "criteria": "Al entrar al compás 6 mostrar también la partitura preparada para el 7."
  },
  {
    "id": "F-S02",
    "version": "full",
    "group": "Vista Estudio y navegación",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Adjuntos y contenido anticipado",
    "criteria": "Mostrar imagen o minieditor del próximo compás en su panel."
  },
  {
    "id": "F-S03",
    "version": "full",
    "group": "Vista Estudio y navegación",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Barra estructural con una sección",
    "criteria": "Ocultar la barra redundante si solo existe una sección."
  },
  {
    "id": "F-S04",
    "version": "full",
    "group": "Vista Estudio y navegación",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Estructura con varias secciones",
    "criteria": "Mostrar barra compacta dividida proporcionalmente."
  },
  {
    "id": "F-S05",
    "version": "full",
    "group": "Vista Estudio y navegación",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Seleccionar sección y loop",
    "criteria": "Saltar a sección y preparar práctica de su rango."
  },
  {
    "id": "F-S06",
    "version": "full",
    "group": "Vista Estudio y navegación",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Contador y pulso compactos",
    "criteria": "Reducir ambas tarjetas sin perder legibilidad."
  },
  {
    "id": "F-S07",
    "version": "full",
    "group": "Vista Estudio y navegación",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Herramientas en lateral izquierdo",
    "criteria": "Expandir opciones sobre navegación y revertir al cerrar."
  },
  {
    "id": "F-S08",
    "version": "full",
    "group": "Vista Estudio y navegación",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Regresar a repertorio",
    "criteria": "Mantener canción y cambios guardados al salir de Estudio."
  },
  {
    "id": "F-S09",
    "version": "full",
    "group": "Vista Estudio y navegación",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Comentarios por pulso",
    "criteria": "Consultar anotaciones e imágenes asociadas al compás correcto."
  },
  {
    "id": "F-S10",
    "version": "full",
    "group": "Vista Estudio y navegación",
    "priority": "P1",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Loop del fragmento",
    "criteria": "Sincronía de cursor, BPM y metrónomo."
  },
  {
    "id": "F-R01",
    "version": "full",
    "group": "Inicio y repertorios",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/26",
    "title": "Crear repertorio",
    "criteria": "Repertorio nuevo disponible desde Inicio."
  },
  {
    "id": "F-R02",
    "version": "full",
    "group": "Inicio y repertorios",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/26",
    "title": "Crear tema desde una tarjeta",
    "criteria": "Botón contextual abre formulario existente con destino obligatorio."
  },
  {
    "id": "F-R03",
    "version": "full",
    "group": "Inicio y repertorios",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/26",
    "title": "Retorno tras guardar tema",
    "criteria": "La canción aparece en la tarjeta del repertorio de origen."
  },
  {
    "id": "F-R04",
    "version": "full",
    "group": "Inicio y repertorios",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/26",
    "title": "Varios repertorios por canción",
    "criteria": "Asociación adicional sin perder el repertorio original."
  },
  {
    "id": "F-R05",
    "version": "full",
    "group": "Inicio y repertorios",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/26",
    "title": "Papelera y restauración",
    "criteria": "Recuperar canción con contenido y pertenencias."
  },
  {
    "id": "F-R06",
    "version": "full",
    "group": "Inicio y repertorios",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/26",
    "title": "Duplicados por conflicto",
    "criteria": "Preservar ambas versiones y mostrar fechas e identificador."
  },
  {
    "id": "F-R07",
    "version": "full",
    "group": "Inicio y repertorios",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/26",
    "title": "Comparación de conflictos",
    "criteria": "Revisar diferencias antes de eliminar o fusionar."
  },
  {
    "id": "F-D01",
    "version": "full",
    "group": "Datos, Firebase y offline",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/blob/main/docs/validacion-prepublicacion.md",
    "title": "Firebase con usuarios reales",
    "criteria": "Guardar y abrir con cuentas de prueba autorizadas."
  },
  {
    "id": "F-D02",
    "version": "full",
    "group": "Datos, Firebase y offline",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/blob/main/docs/validacion-prepublicacion.md",
    "title": "Aislamiento de bibliotecas",
    "criteria": "Dos cuentas no pueden leer canciones ni reportes ajenos."
  },
  {
    "id": "F-D03",
    "version": "full",
    "group": "Datos, Firebase y offline",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/blob/main/docs/validacion-prepublicacion.md",
    "title": "Google y revocación",
    "criteria": "Comprobar autorización, cierre de sesión y revocación."
  },
  {
    "id": "F-D04",
    "version": "full",
    "group": "Datos, Firebase y offline",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/blob/main/docs/validacion-prepublicacion.md",
    "title": "Guardado sin conexión",
    "criteria": "Mostrar aviso y conservar trabajo en equipo de origen."
  },
  {
    "id": "F-D05",
    "version": "full",
    "group": "Datos, Firebase y offline",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/blob/main/docs/validacion-prepublicacion.md",
    "title": "Reconexion y sincronización",
    "criteria": "Sin pérdida ni duplicación de cambios locales."
  },
  {
    "id": "F-D06",
    "version": "full",
    "group": "Datos, Firebase y offline",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/blob/main/docs/validacion-prepublicacion.md",
    "title": "Conflictos entre equipos",
    "criteria": "Evitar sobrescritura silenciosa y conservar versiones."
  },
  {
    "id": "F-D07",
    "version": "full",
    "group": "Datos, Firebase y offline",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/blob/main/docs/validacion-prepublicacion.md",
    "title": "Respaldo JSON externo",
    "criteria": "Exportar e importar canciones y repertorios íntegros."
  },
  {
    "id": "F-D08",
    "version": "full",
    "group": "Datos, Firebase y offline",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/blob/main/docs/validacion-prepublicacion.md",
    "title": "Restauración efectiva",
    "criteria": "Recuperar código y datos desde copia con procedimiento probado."
  },
  {
    "id": "F-D09",
    "version": "full",
    "group": "Datos, Firebase y offline",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/blob/main/docs/validacion-prepublicacion.md",
    "title": "PWA y caché versionada",
    "criteria": "Actualizar recursos y validar arranque offline."
  },
  {
    "id": "F-D10",
    "version": "full",
    "group": "Datos, Firebase y offline",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/blob/main/docs/validacion-prepublicacion.md",
    "title": "Límites de almacenamiento",
    "criteria": "Advertir y recuperarse cuando falla guardado local."
  },
  {
    "id": "F-L01",
    "version": "full",
    "group": "Privacidad y cumplimiento",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Términos y condiciones",
    "criteria": "Mostrar texto versionado y registrar aceptación."
  },
  {
    "id": "F-L02",
    "version": "full",
    "group": "Privacidad y cumplimiento",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Política de privacidad",
    "criteria": "Finalidad, conservación, destinatarios y derechos claros."
  },
  {
    "id": "F-L03",
    "version": "full",
    "group": "Privacidad y cumplimiento",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Eliminar cuenta",
    "criteria": "Proceso verificable de borrado según obligaciones aplicables."
  },
  {
    "id": "F-L04",
    "version": "full",
    "group": "Privacidad y cumplimiento",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Eliminar datos musicales",
    "criteria": "Diferenciar papelera, borrado definitivo y retención histórica."
  },
  {
    "id": "F-L05",
    "version": "full",
    "group": "Privacidad y cumplimiento",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Selección de país",
    "criteria": "Aplicar restricciones reales, sin falsa promesa de residencia."
  },
  {
    "id": "F-L06",
    "version": "full",
    "group": "Privacidad y cumplimiento",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Transferencia internacional",
    "criteria": "Revisar proveedores, regiones y garantías."
  },
  {
    "id": "F-L07",
    "version": "full",
    "group": "Privacidad y cumplimiento",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Incidentes de seguridad",
    "criteria": "Responsables, avisos y respuesta documentados."
  },
  {
    "id": "F-L08",
    "version": "full",
    "group": "Privacidad y cumplimiento",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Derechos de autor",
    "criteria": "No distribuir partituras protegidas sin permiso."
  },
  {
    "id": "F-L09",
    "version": "full",
    "group": "Privacidad y cumplimiento",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Licencias de gráficos y sonidos",
    "criteria": "Comprobar licencias de símbolos, fuentes y muestras."
  },
  {
    "id": "F-L10",
    "version": "full",
    "group": "Privacidad y cumplimiento",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Accesibilidad WCAG 2.2 AA",
    "criteria": "Teclado, contraste, lectores y control táctil."
  },
  {
    "id": "F-T01",
    "version": "full",
    "group": "Pruebas y publicación",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "CI de la versión candidata",
    "criteria": "Todas las pruebas automatizadas pasan."
  },
  {
    "id": "F-T02",
    "version": "full",
    "group": "Pruebas y publicación",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Windows Chrome y Firefox",
    "criteria": "Navegación, teclado, datos y metrónomo."
  },
  {
    "id": "F-T03",
    "version": "full",
    "group": "Pruebas y publicación",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "iPad Safari real",
    "criteria": "Arrastre, toque, suspensión, reanudación y audio."
  },
  {
    "id": "F-T04",
    "version": "full",
    "group": "Pruebas y publicación",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Vista móvil",
    "criteria": "Orientación, scroll y botones legibles."
  },
  {
    "id": "F-T05",
    "version": "full",
    "group": "Pruebas y publicación",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Reglas Firebase reales",
    "criteria": "Acceso permitido y denegación indebida verificables."
  },
  {
    "id": "F-T06",
    "version": "full",
    "group": "Pruebas y publicación",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Prueba de rollback",
    "criteria": "Recuperación documentada sin pérdida de datos."
  },
  {
    "id": "F-T07",
    "version": "full",
    "group": "Pruebas y publicación",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Smoke test de producción",
    "criteria": "HTTPS, rutas, carga, sesión, datos."
  },
  {
    "id": "F-T08",
    "version": "full",
    "group": "Pruebas y publicación",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Sin incidencias críticas",
    "criteria": "Bloqueos y defectos graves resueltos antes de publicar."
  },
  {
    "id": "F-A01",
    "version": "full",
    "group": "Funciones avanzadas futuras",
    "priority": "P2",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Síntesis opcional de las notas",
    "criteria": "Audio de notas no interfiere con click."
  },
  {
    "id": "F-A02",
    "version": "full",
    "group": "Funciones avanzadas futuras",
    "priority": "P2",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "MusicXML editable",
    "criteria": "Importar, validar y reexportar partitura."
  },
  {
    "id": "F-A03",
    "version": "full",
    "group": "Funciones avanzadas futuras",
    "priority": "P2",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Exportar PNG y PDF",
    "criteria": "Salida correcta y legítima de material propio."
  },
  {
    "id": "F-A04",
    "version": "full",
    "group": "Funciones avanzadas futuras",
    "priority": "P2",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Compartir archivos",
    "criteria": "Permisos explícitos para archivos compartidos."
  },
  {
    "id": "F-A05",
    "version": "full",
    "group": "Funciones avanzadas futuras",
    "priority": "P2",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Reproductor musical personal",
    "criteria": "Evaluar audio propio, almacenamiento y loop A/B."
  },
  {
    "id": "F-A06",
    "version": "full",
    "group": "Funciones avanzadas futuras",
    "priority": "P2",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Salas compartidas y progreso",
    "criteria": "Validar aislamiento y colaboración antes de retomar PR #12."
  },
  {
    "id": "I-A01",
    "version": "initial",
    "group": "Acceso y experiencia Inicial",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Google y acceso autorizado",
    "criteria": "Ingreso y cierre sin mezclas entre usuarios."
  },
  {
    "id": "I-A02",
    "version": "initial",
    "group": "Acceso y experiencia Inicial",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Selector de versión",
    "criteria": "Elegir Full e Inicial con estado inequívoco."
  },
  {
    "id": "I-A03",
    "version": "initial",
    "group": "Acceso y experiencia Inicial",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Interfaz Inicial diferenciada",
    "criteria": "No presentar herramientas Full como disponibles."
  },
  {
    "id": "I-A04",
    "version": "initial",
    "group": "Acceso y experiencia Inicial",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Primer repertorio",
    "criteria": "Creación intuitiva desde Inicio."
  },
  {
    "id": "I-A05",
    "version": "initial",
    "group": "Acceso y experiencia Inicial",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Nuevo tema en repertorio",
    "criteria": "Formularios contextuales y destino confirmado."
  },
  {
    "id": "I-A06",
    "version": "initial",
    "group": "Acceso y experiencia Inicial",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Contenido previo preservado",
    "criteria": "No truncar anotaciones históricas."
  },
  {
    "id": "I-A07",
    "version": "initial",
    "group": "Acceso y experiencia Inicial",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Accesibilidad móvil",
    "criteria": "Táctil, foco y tamaños en pantalla pequeña."
  },
  {
    "id": "I-A08",
    "version": "initial",
    "group": "Acceso y experiencia Inicial",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Disponibilidad real visible",
    "criteria": "No afirmar que Inicial se publicó si está en desarrollo."
  },
  {
    "id": "I-C01",
    "version": "initial",
    "group": "Cuotas e incentivo de Free",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Máximo 2 repertorios",
    "criteria": "Se aplica límite Inicial de dos repertorios."
  },
  {
    "id": "I-C02",
    "version": "initial",
    "group": "Cuotas e incentivo de Free",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Máximo 4 canciones",
    "criteria": "Se admiten cuatro por repertorio."
  },
  {
    "id": "I-C03",
    "version": "initial",
    "group": "Cuotas e incentivo de Free",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Límite de texto 50",
    "criteria": "Validar longitud en campo acordado."
  },
  {
    "id": "I-C04",
    "version": "initial",
    "group": "Cuotas e incentivo de Free",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Conteo Unicode seguro",
    "criteria": "No cortar caracteres combinados."
  },
  {
    "id": "I-C05",
    "version": "initial",
    "group": "Cuotas e incentivo de Free",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Contador de cupos",
    "criteria": "Mostrar límites y consumo actual."
  },
  {
    "id": "I-C06",
    "version": "initial",
    "group": "Cuotas e incentivo de Free",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Validación de cupos en servidor",
    "criteria": "No basta esconder controles en HTML."
  },
  {
    "id": "I-C07",
    "version": "initial",
    "group": "Cuotas e incentivo de Free",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Tres encuentros distintos",
    "criteria": "No se cuentan encuentros repetidos."
  },
  {
    "id": "I-C08",
    "version": "initial",
    "group": "Cuotas e incentivo de Free",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Activación explícita del beneficio",
    "criteria": "Aceptación una sola vez."
  },
  {
    "id": "I-C09",
    "version": "initial",
    "group": "Cuotas e incentivo de Free",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Ampliar a 3 repertorios y 5 canciones",
    "criteria": "Beneficio permanente y correcto."
  },
  {
    "id": "I-C10",
    "version": "initial",
    "group": "Cuotas e incentivo de Free",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Ampliación de texto a 55",
    "criteria": "Ampliar límite sin perder contenido."
  },
  {
    "id": "I-C11",
    "version": "initial",
    "group": "Cuotas e incentivo de Free",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Incentivo por identidad",
    "criteria": "Se conserva al cambiar de dispositivo."
  },
  {
    "id": "I-C12",
    "version": "initial",
    "group": "Cuotas e incentivo de Free",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "No eliminar datos por reducción",
    "criteria": "Canciones y notas no se pierden al cambiar cupo."
  },
  {
    "id": "I-C13",
    "version": "initial",
    "group": "Cuotas e incentivo de Free",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "No duplicar beneficios",
    "criteria": "Reintentos no entregan créditos repetidos."
  },
  {
    "id": "I-C14",
    "version": "initial",
    "group": "Cuotas e incentivo de Free",
    "priority": "P1",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/24",
    "title": "Avisos de límite",
    "criteria": "Mensajes claros en intentos excedidos."
  },
  {
    "id": "I-O01",
    "version": "initial",
    "group": "Trabajo sin conexión y dispositivo",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/25",
    "title": "Aviso offline",
    "criteria": "Informar dónde queda trabajo guardado."
  },
  {
    "id": "I-O02",
    "version": "initial",
    "group": "Trabajo sin conexión y dispositivo",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/25",
    "title": "Continuar en mismo equipo",
    "criteria": "Reanudar y reconectar donde se inició offline."
  },
  {
    "id": "I-O03",
    "version": "initial",
    "group": "Trabajo sin conexión y dispositivo",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/25",
    "title": "Borrador local persistente",
    "criteria": "Recarga no pierde ediciones."
  },
  {
    "id": "I-O04",
    "version": "initial",
    "group": "Trabajo sin conexión y dispositivo",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/25",
    "title": "Reserva de dispositivo",
    "criteria": "Evitar doble sincronización activa."
  },
  {
    "id": "I-O05",
    "version": "initial",
    "group": "Trabajo sin conexión y dispositivo",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/25",
    "title": "Liberación tras guardado",
    "criteria": "Reserva se libera solo después de confirmar."
  },
  {
    "id": "I-O06",
    "version": "initial",
    "group": "Trabajo sin conexión y dispositivo",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/25",
    "title": "Cambios concurrentes",
    "criteria": "Bloquear sobrescritura destructiva."
  },
  {
    "id": "I-O07",
    "version": "initial",
    "group": "Trabajo sin conexión y dispositivo",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/25",
    "title": "Recuperar reserva caducada",
    "criteria": "Cierre inesperado no bloquea para siempre."
  },
  {
    "id": "I-O08",
    "version": "initial",
    "group": "Trabajo sin conexión y dispositivo",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/25",
    "title": "Resolver borradores",
    "criteria": "Conservar y comparar tras reconexión."
  },
  {
    "id": "I-O09",
    "version": "initial",
    "group": "Trabajo sin conexión y dispositivo",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/25",
    "title": "Pruebas Firebase Emulator",
    "criteria": "Reglas y transacciones con usuarios ficticios."
  },
  {
    "id": "I-O10",
    "version": "initial",
    "group": "Trabajo sin conexión y dispositivo",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical/pull/25",
    "title": "Prueba en dispositivos reales",
    "criteria": "Windows, iPad y Android con desconexión."
  },
  {
    "id": "I-L01",
    "version": "initial",
    "group": "Privacidad y salida Inicial",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Aceptación de términos",
    "criteria": "Términos y privacidad de versión Inicial."
  },
  {
    "id": "I-L02",
    "version": "initial",
    "group": "Privacidad y salida Inicial",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Eliminación de cuenta y datos",
    "criteria": "Procedimiento probado antes de lanzamiento."
  },
  {
    "id": "I-L03",
    "version": "initial",
    "group": "Privacidad y salida Inicial",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "País y procesamiento",
    "criteria": "Requisitos por región y transferencias."
  },
  {
    "id": "I-L04",
    "version": "initial",
    "group": "Privacidad y salida Inicial",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Protección de derechos de autor",
    "criteria": "Sin distribución no autorizada de partituras."
  },
  {
    "id": "I-L05",
    "version": "initial",
    "group": "Privacidad y salida Inicial",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Cuotas y reglas de acceso",
    "criteria": "No elevar rol ni cuotas desde el navegador."
  },
  {
    "id": "I-L06",
    "version": "initial",
    "group": "Privacidad y salida Inicial",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Revocación y expiración",
    "criteria": "Sesiones revocadas pierden acceso."
  },
  {
    "id": "I-L07",
    "version": "initial",
    "group": "Privacidad y salida Inicial",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "QA, backup y rollback",
    "criteria": "Pruebas antes de publicar Inicial."
  },
  {
    "id": "I-L08",
    "version": "initial",
    "group": "Privacidad y salida Inicial",
    "priority": "P0",
    "source": "https://chatgpt.com/space/page_c1b79e094d208191a272233d60fd01ab",
    "title": "Dominio de versión Inicial",
    "criteria": "URL, HTTPS y separación aprobados."
  },
  {
    "id": "Q-01",
    "version": "both",
    "group": "Portal de evaluación",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical",
    "title": "Acceso por rol real",
    "criteria": "No evaluadores no leen ni guardan reportes."
  },
  {
    "id": "Q-02",
    "version": "both",
    "group": "Portal de evaluación",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical",
    "title": "Selector Full / Inicial",
    "criteria": "Solo versiones autorizadas por rol."
  },
  {
    "id": "Q-03",
    "version": "both",
    "group": "Portal de evaluación",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical",
    "title": "Guardar checklist",
    "criteria": "Persistir respuestas por UID y versión."
  },
  {
    "id": "Q-04",
    "version": "both",
    "group": "Portal de evaluación",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical",
    "title": "Conflicto de borradores",
    "criteria": "No sobrescribir silenciosamente cambios de otros equipos."
  },
  {
    "id": "Q-05",
    "version": "both",
    "group": "Portal de evaluación",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical",
    "title": "Revocar rol",
    "criteria": "Bloquear guardado tras quitar permiso."
  },
  {
    "id": "Q-06",
    "version": "both",
    "group": "Portal de evaluación",
    "priority": "P0",
    "source": "https://github.com/osdrumm-sudo/kernnel-estudio-musical",
    "title": "Resumen de administración",
    "criteria": "Consultar progreso sin entrar en bibliotecas privadas."
  }
];
const api=Object.freeze({versionNames:Object.freeze({full:'Metriqa Full',initial:'Metriqa Inicial / Free'}),versions:Object.freeze(['full','initial']),items:Object.freeze(items.map(x=>Object.freeze(x))),forVersion(v){return items.filter(x=>x.version===v||x.version==='both');},get(id){return items.find(x=>x.id===id)||null;}});
root.KernnelEvalCatalog=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='undefined'?window:globalThis);
