'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../music-core.js');

const make = (meter = '4/4', size = 3) => ({
  id: 'song-fixture', nombre: 'Prueba', notas: Array(size).fill(''), secciones: [
    { id: 'sec2', nombre: 'Puente', desde: 2, hasta: 3, color: '#138c87' }
  ], estudio: { meter }
});
test('modelo v2 mantiene intactos los campos heredados', () => {
  const song = make();
  const before = JSON.stringify(song.notas);
  const m = C.ensure(song);
  assert.equal(m.schemaVersion, 2);
  assert.equal(m.measures.length, song.notas.length);
  assert.equal(JSON.stringify(song.notas), before);
  assert.equal(C.ensure(song), m);
});
test('960 PPQ representa exactamente negras, corcheas, semicorcheas y tresillos', () => {
  assert.equal(C.PPQ / 2, 480);
  assert.equal(C.PPQ / 4, 240);
  assert.equal(C.PPQ / 3, 320);
  assert.equal(C.PPQ / 6, 160);
  assert.equal(C.durationTicks(C.parseMeter('4/4')), 3840);
  assert.equal(C.durationTicks(C.parseMeter('6/8')), 2880);
  assert.equal(C.pulseTicks(C.parseMeter('6/8')), 480);
});
test('timeline calcula posiciones absolutas y métricas heredadas', () => {
  const song = make();
  const t = C.timeline(song);
  assert.deepEqual(t.map(x => x.startTick), [0, 3840, 7680]);
  assert.equal(C.absolute(song, { measureId: t[1].id, tick: 480 }), 4320);
  assert.deepEqual(C.fromAbsolute(song, 4320), { measureId: t[1].id, tick: 480 });
});
test('editor estructurado permite batería a dos voces y acordes simultáneos', () => {
  const song = make();
  const f = C.createFragment(song, { mode: 'percussion', name: 'Groove' });
  const m = song.musica.measures[0].id;
  C.addEvent(song, f.id, { measureId: m, tick: 0, durationTicks: 960, voice: 1, instrumentId: 'hihat' });
  C.addEvent(song, f.id, { measureId: m, tick: 0, durationTicks: 960, voice: 1, instrumentId: 'kick' });
  C.addEvent(song, f.id, { measureId: m, tick: 0, durationTicks: 960, voice: 2, instrumentId: 'snare' });
  assert.equal(f.events.length, 3);
  assert.throws(() => C.addEvent(song, f.id, { measureId: m, tick: 480, durationTicks: 960, voice: 1, instrumentId: 'ride' }), /superpone/);
  assert.deepEqual(C.validate(song), []);
});
test('se impiden notas fuera del compás y duplicados en la misma voz', () => {
  const song = make('6/8');
  const f = C.createFragment(song, { mode: 'melody' });
  const m = f.start.measureId;
  C.addEvent(song, f.id, { measureId: m, tick: 0, durationTicks: 320, voice: 1, pitch: 60 });
  C.addEvent(song, f.id, { measureId: m, tick: 0, durationTicks: 320, voice: 1, pitch: 64 });
  assert.throws(() => C.addEvent(song, f.id, { measureId: m, tick: 0, durationTicks: 320, voice: 1, pitch: 60 }), /superpone/);
  assert.throws(() => C.addEvent(song, f.id, { measureId: m, tick: 2880, durationTicks: 480, voice: 1, pitch: 60 }), /inválida/);
});
test('meterEvents admite cambios al comienzo de sección y conserva ids', () => {
  const song = make('4/4');
  C.ensure(song);
  const id = song.musica.measures[1].id;
  // Se representa un cambio musical aprobado en el inicio de la segunda sección.
  song.musica.meterEvents.push({ measureId: id, numerator: 6, denominator: 8 });
  const t = C.timeline(song);
  assert.deepEqual(t.map(m => m.startTick), [0, 3840, 6720]);
  assert.deepEqual(t.map(m => m.durationTicks), [3840, 2880, 2880]);
});
test('reconciliación de compases no descarta fragmentos con referencias vivas', () => {
  const song = make();
  const f = C.createFragment(song, { measureIndex: 2 });
  song.notas.pop();
  assert.throws(() => C.ensure(song), /fragmentos/);
  assert.ok(f.id);
});
