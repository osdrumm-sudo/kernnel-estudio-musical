/**
 * Kernnel 2.0 / Etapa 1. Ejecutar: node --test tests/backup-contract.test.cjs
 * Usa datos ficticios. No accede a Firebase, navegador, cuentas ni datos reales.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const inline = html.match(/<script>\s*('use strict';[\s\S]*?)<\/script>/);
if (!inline) throw Error('No se encontró el código principal de Kernnel');
const code = inline[1];

function sandbox() {
  const storage = new Map(), downloads = [], elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, {textContent: '', style: {}});
      return elements.get(id);
    },
    querySelectorAll: () => []
  };
  const localStorage = {
    setItem: (key, value) => storage.set(key, String(value)),
    getItem: key => storage.get(key) ?? null
  };
  const indexedDB = {open: () => {throw Error('IndexedDB desactivada en pruebas')}};
  const injected = code + [
    'downloadJSON = (payload, filename) => downloads.push({payload: JSON.parse(JSON.stringify(payload)), filename});',
    'renderData = () => {};',
    'toast = () => {};',
    'return {fresh, normalize, backupFull, exportSong, exportRep, mergeTransfer,',
    '  setData(value) { D = value; }, getData() { return D; }};'
  ].join('\n');
  const api = new Function('window', 'document', 'localStorage', 'indexedDB', 'downloads', injected)(
    {}, document, localStorage, indexedDB, downloads
  );
  return {api, downloads, storage};
}

function example() {
  const {api} = sandbox(), data = api.fresh();
  data.temas = [
    {
      id: 'tema-demo-1', nombre: 'Tema de prueba ♫',
      notas: ['Entrada con dinámica', 'Cambiar al puente'],
      nombres: ['Intro', 'Puente'],
      tiempos: [[{txt: 'Acentuar', color: '#e5484d', img: 'data:image/png;base64,QUJD'}]],
      secciones: [{id: 'sec-demo', nombre: 'Introducción', desde: 1, hasta: 2, color: '#123abc'}],
      estudio: {
        meter: '6/8', bpm: 136, practiceBpm: 84, marcadores: [2],
        sesiones: [{id: 'sesion-demo', name: 'Lento', practiceBpm: 84}],
        last: {start: 1, end: 2, loop: true}
      }
    },
    {id: 'tema-demo-2', nombre: 'Otra canción', notas: ['Primer compás'], estudio: {meter: '4/4', bpm: 120}}
  ];
  data.repertorios = [
    {id: 'rep-demo-a', nombre: 'Ensayo', songs: ['tema-demo-1', 'tema-demo-2']},
    {id: 'rep-demo-b', nombre: 'Concierto', songs: ['tema-demo-1']}
  ];
  data.papelera = [{id: 'trash-demo', type: 'measure', songId: 'tema-demo-1', index: 0, at: 1000, value: {note: 'Nota anterior'}}];
  data.sel = 'tema-demo-1';
  data.prefs.theme = 'dark';
  data.prefs.highContrast = true;
  return data;
}

test('respaldo completo incluye canciones, compases, imágenes, repertorios, papelera y preferencias', () => {
  const {api, downloads, storage} = sandbox();
  api.setData(example());
  api.backupFull();
  assert.equal(downloads.length, 1);
  assert.match(downloads[0].filename, /^kernnel-estudio-respaldo-\d{4}-\d{2}-\d{2}\.json$/);
  const snapshot = downloads[0].payload;
  assert.equal(snapshot.temas.length, 2);
  assert.deepEqual(snapshot.repertorios[1].songs, ['tema-demo-1']);
  assert.equal(snapshot.temas[0].tiempos[0][0].img, 'data:image/png;base64,QUJD');
  assert.equal(snapshot.temas[0].estudio.practiceBpm, 84);
  assert.equal(snapshot.temas[0].secciones[0].color, '#123abc');
  assert.equal(snapshot.papelera.length, 1);
  assert.equal(snapshot.prefs.theme, 'dark');
  assert.equal(snapshot.prefs.highContrast, true);
  assert.ok(snapshot.backupAt > 0);
  assert.equal(JSON.parse(storage.get('compases-v1')).temas.length, 2);
});

test('restauración JSON conserva las referencias y los datos musicales', () => {
  const {api} = sandbox();
  const restored = api.normalize(JSON.parse(JSON.stringify(example())));
  assert.equal(restored.temas.length, 2);
  assert.deepEqual(restored.repertorios[0].songs, ['tema-demo-1', 'tema-demo-2']);
  assert.deepEqual(restored.repertorios[1].songs, ['tema-demo-1']);
  assert.deepEqual(restored.temas[0].notas, ['Entrada con dinámica', 'Cambiar al puente']);
  assert.equal(restored.temas[0].estudio.bpm, 136);
  assert.equal(restored.temas[0].estudio.practiceBpm, 84);
  assert.equal(restored.temas[0].secciones[0].color, '#123abc');
  assert.equal(restored.temas[0].tiempos[0][0].img, 'data:image/png;base64,QUJD');
  assert.equal(restored.papelera[0].type, 'measure');
});

test('exportar repertorio e importar conserva los vínculos aunque cambien IDs', () => {
  const {api, downloads} = sandbox();
  const original = example();
  api.setData(original);
  api.exportRep(original.repertorios[1]);
  const exported = downloads[0].payload;
  assert.equal(exported.format, 'compases-transfer');
  assert.equal(exported.version, 2);
  assert.equal(exported.temas.length, 1);
  assert.deepEqual(exported.repertorios[0].songs, ['tema-demo-1']);
  api.setData(api.fresh());
  assert.equal(api.mergeTransfer(exported), 1);
  const imported = api.getData();
  assert.equal(imported.temas.length, 1);
  assert.equal(imported.repertorios.length, 1);
  assert.equal(imported.repertorios[0].songs[0], imported.temas[0].id);
  assert.notEqual(imported.temas[0].id, 'tema-demo-1');
  assert.equal(imported.temas[0].tiempos[0][0].txt, 'Acentuar');
});

test('exportar canción no modifica la biblioteca', () => {
  const {api, downloads} = sandbox();
  const data = example();
  api.setData(data);
  api.exportSong(data.temas[0]);
  assert.equal(downloads[0].payload.temas.length, 1);
  assert.equal(downloads[0].payload.repertorios.length, 0);
  assert.equal(downloads[0].payload.temas[0].notas[1], 'Cambiar al puente');
  assert.equal(api.getData().temas.length, 2);
});

test('importaciones con estructuras inválidas son rechazadas', () => {
  const {api} = sandbox();
  assert.throws(() => api.normalize({temas: null}));
  assert.throws(() => api.normalize({temas: [{id:'a',nombre:'Incompleto',notas:[]}]}));
  assert.throws(() => api.normalize({temas: [{
    id:'a',nombre:'Sección inválida',notas:['uno'],
    secciones:[{id:'s',nombre:'X',desde:2,hasta:3,color:'#ff0000'}]
  }]}));
  assert.throws(() => api.normalize({temas: Array.from({length: 3001}, (_, i) => ({
    id:String(i),nombre:'Prueba',notas:['']
  }))}));
});

test('respaldo ficticio no incorpora credenciales ni contraseñas', () => {
  const {api, downloads} = sandbox();
  api.setData(example());
  api.backupFull();
  const content = JSON.stringify(downloads[0].payload);
  assert.ok(!content.includes('cloud-password'));
  assert.ok(!content.includes('apiKey'));
  assert.ok(!content.includes('accessToken'));
});

// Riesgo conocido para Etapa 3: restaurar una canción eliminada
// actualmente no restablece sus vínculos de repertorio.
