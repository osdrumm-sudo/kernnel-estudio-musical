const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {position} = require('../study-room-clock.js');

const playing = Object.freeze({mode: 'playing', bpm: 120, from: 17, to: 18, loop: false, startBeat: 0, startsAt: 10_350});

test('the start anchor is inclusive and preserves the target pulse while waiting', () => {
  const transport = {...playing, startBeat: 3};
  assert.deepEqual(position(transport, '4/4', 10_349),
    {measure: 17, beat: 3, index: 3, waiting: true, ended: false});
  assert.deepEqual(position(transport, '4/4', 10_350),
    {measure: 17, beat: 3, index: 3, waiting: false, ended: false});
  assert.deepEqual(position(transport, '4/4', 10_850),
    {measure: 18, beat: 0, index: 4, waiting: false, ended: false});
});

test('two calibrated local clocks locate the same pulse including late entry', () => {
  const offsetAhead = 250;
  const offsetBehind = -350;
  const leader = position(playing, '4/4', 12_405 + offsetAhead);
  const participant = position(playing, '4/4', 13_005 + offsetBehind);
  assert.deepEqual(leader, {measure: 18, beat: 0, index: 4, waiting: false, ended: false});
  assert.deepEqual(leader, participant);
});

test('paused and ready transports keep the selected position', () => {
  for (const mode of ['paused', 'ready']) {
    assert.deepEqual(position({...playing, mode, startBeat: 6}, '4/4', 100_000),
      {measure: 18, beat: 2, index: 6, waiting: false, ended: false});
  }
});

test('the finished range keeps its last pulse and a loop wraps to the first pulse', () => {
  assert.deepEqual(position(playing, '4/4', 14_349),
    {measure: 18, beat: 3, index: 7, waiting: false, ended: false});
  assert.deepEqual(position(playing, '4/4', 14_350),
    {measure: 18, beat: 3, index: 7, waiting: false, ended: true});
  assert.deepEqual(position({...playing, loop: true}, '4/4', 14_350),
    {measure: 17, beat: 0, index: 0, waiting: false, ended: false});
  assert.deepEqual(position({...playing, loop: true}, '6/8', 16_350),
    {measure: 17, beat: 0, index: 0, waiting: false, ended: false});
});

test('invalid authority snapshots and unsupported meters have no position', () => {
  assert.equal(position({...playing, from: 0}, '4/4', 0), null);
  assert.equal(position({...playing, startBeat: 8}, '4/4', 0), null);
  assert.equal(position(playing, '0/4', 0), null);
  assert.equal(position(playing, '4/4', NaN), null);
});

function browserClock() {
  const timers = new Set();
  const pulses = [];
  let now = 10_000;
  class AudioContext {
    state = 'suspended';
    destination = {};
    get currentTime() { return (now - 8_000) / 1000; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    createGain() {
      return {gain: {setValueAtTime() {}, exponentialRampToValueAtTime() {}}, connect() {}, disconnect() {}};
    }
    createOscillator() {
      const source = {
        frequency: {}, connect() {}, disconnect() {},
        start(at) { pulses.push({at, accent: source.frequency.value === 1250, source}); },
        stop(at) { if (at === undefined) source.cancelled = true; }
      };
      return source;
    }
  }

  const window = {
    AudioContext,
    setInterval: cb => (timers.add(cb), cb),
    clearInterval: cb => timers.delete(cb)
  };
  const source = readFileSync(path.join(__dirname, '..', 'study-room-clock.js'), 'utf8');
  vm.runInNewContext(source, {window, Date: {now: () => now}});
  const positions = [];
  const clock = window.KernnelRoomClock.create({tick: next => positions.push(next)});
  return {
    clock, pulses, positions, timers,
    advance(time) { now = time; for (const callback of [...timers]) callback(); }
  };
}

test('the browser schedules the shared anchor once and a pause cancels its queued click', async () => {
  const {clock, pulses, positions, timers, advance} = browserClock();
  clock.set(playing, '4/4', 250);
  assert.equal(pulses.length, 0);
  assert.equal(positions.at(-1).waiting, true);
  assert.equal(await clock.enableAudio(), true);
  assert.equal(pulses.length, 1);
  assert.equal(pulses[0].at, 2.1);
  assert.equal(pulses[0].accent, true);
  clock.set({...playing}, '4/4', 250);
  advance(10_020);
  assert.equal(pulses.length, 1);
  clock.set({...playing, mode: 'paused'}, '4/4', 250);
  assert.equal(pulses[0].source.cancelled, true);
  assert.equal(timers.size, 0);
});

test('a late browser schedules the next future pulse without replaying missed clicks', async () => {
  const {clock, pulses, positions, timers, advance} = browserClock();
  advance(11_510);
  clock.set(playing, '4/4', 250);
  assert.equal(positions.at(-1).beat, 2);
  assert.equal(await clock.enableAudio(), true);
  assert.equal(pulses.length, 1);
  assert.ok(Math.abs(pulses[0].at - 3.6) < 1e-8);
  assert.equal(pulses[0].accent, false);
  clock.stop();
  assert.equal(pulses[0].source.cancelled, true);
  assert.equal(timers.size, 0);
});
