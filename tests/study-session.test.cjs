const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const navigation = fs.readFileSync(path.join(root, 'ui-v2.js'), 'utf8').replace(/initV2\(\);\s*$/, '');

function setup() {
  const recorded = { measures: [], visits: [] };
  const element = { classList: { remove() {} }, setAttribute() {} };
  const context = vm.createContext({
    setTimeout, clearTimeout, setInterval, clearInterval,
    document: { getElementById: () => element, querySelector: () => null },
    window: {
      scrollTo() {},
      KernnelStudyData: {
        recordMeasure: (...details) => recorded.measures.push(details),
        recordOpen: id => recorded.visits.push(id)
      }
    }
  });
  vm.runInContext(app, context);
  vm.runInContext(navigation, context);
  const run = code => vm.runInContext(code, context);
  run(`
    D.temas = [{id:'verso', nombre:'Verso', notas:['','','']}, {id:'coro', nombre:'Coro', notas:['']}];
    D.sel = 'verso';
    D.temas[0].studyMeasureKeys = ['1','m-nuevo','3'];
  `);
  return { recorded, run };
}

test('counts a full measure at the next boundary, only once per study session', () => {
  const { recorded, run } = setup();
  run("for(let beat=0;beat<4;beat++)trackPracticeBeat('verso',2,beat,4)");
  assert.deepEqual(recorded.measures, []);
  run("trackPracticeBeat('verso',2,0,4)");
  assert.deepEqual(recorded.measures, [['verso', 'm-nuevo']]);
  run("for(let beat=1;beat<4;beat++)trackPracticeBeat('verso',2,beat,4);finishPracticeMeasure('verso')");
  assert.deepEqual(recorded.measures, [['verso', 'm-nuevo']]);
});

test('counts the final complete measure and leaves incomplete measures uncounted', () => {
  const { recorded, run } = setup();
  run("trackPracticeBeat('verso',1,0,4);trackPracticeBeat('verso',1,2,4);trackPracticeBeat('verso',1,3,4)");
  run("for(let beat=0;beat<4;beat++)trackPracticeBeat('verso',3,beat,4);finishPracticeMeasure('verso')");
  assert.deepEqual(recorded.measures, [['verso', '3']]);
});

test('counts deliberate visits to a song in Study and ignores reopening the active view', () => {
  const { recorded, run } = setup();
  run(`
    stopMetro=()=>{};
    renderAll=()=>{};
    applyPrefs=()=>{};
    manageWake=()=>{};
    setViewV2('study');
    setViewV2('study');
    setViewV2('edit');
    setViewV2('study');
    D.sel='coro';
    setViewV2('study');
  `);
  assert.deepEqual(recorded.visits, ['verso', 'verso', 'coro']);
});

test('normalizes tracking keys without rewriting older songs', () => {
  const { run } = setup();
  assert.equal(run("JSON.stringify(activeStudyMeasureKeys(normalize(D).temas[0]))"), '["1","m-nuevo","3"]');
  assert.equal(run("JSON.stringify(activeStudyMeasureKeys(normalize(D).temas[1]))"), '["1"]');
  assert.equal(run("D.temas[0].studyMeasureKeys=['1','1','3'];JSON.stringify(activeStudyMeasureKeys(normalize(D).temas[0]))"), '["1","2","3"]');
});


test('Study Stop retains the next pulse and rewinds any queued pulse that has not sounded', () => {
  const { run } = setup();
  run(`
    visualUpdate=()=>{};
    renderTransport=()=>{};
    setPlaybackStatus=()=>{};
    ui.study=true;
    clock.ctx={currentTime:1};
    clock.playing=true;
    clock.phase='play';
    clock.cursor={measure:3,beat:0};
    clock.queuedPulse={at:1.08,phase:'play',cursor:{measure:2,beat:3}};
    stopFromTransport();
    stopFromTransport();
  `);
  assert.equal(run('clock.paused'), true);
  assert.equal(run('clock.playing'), false);
  assert.equal(run('JSON.stringify(clock.cursor)'), '{"measure":2,"beat":3}');
  assert.equal(run('clock.queuedPulse===null'), true);
});

test('Study returns to the first compás of the song even if a loop starts later', () => {
  const { run } = setup();
  run(`
    visualUpdate=()=>{};
    renderTransport=()=>{};
    setPlaybackStatus=()=>{};
    ui.study=true;
    clock.playStart=2;
    clock.playEnd=3;
    clock.loop=true;
    clock.paused=true;
    clock.visualMeasure=3;
    clock.cursor={measure:2,beat:0};
    restartStudySong();
  `);
  assert.equal(run('clock.paused'), true);
  assert.equal(run('JSON.stringify(clock.cursor)'), '{"measure":1,"beat":0,"countRemaining":0}');
  assert.equal(run('clock.loop'), true);
  assert.equal(run('clock.playStart'), 2);
});

test('Study Stop resets an active loop without starting playback', () => {
  const { run } = setup();
  run(`
    visualUpdate=()=>{};
    renderTransport=()=>{};
    setPlaybackStatus=()=>{};
    startMetro=()=>{throw new Error('Stop must not start playback')};
    ui.study=true;
    clock.playStart=2;
    clock.playEnd=3;
    clock.loop=true;
    clock.playing=true;
    clock.visualMeasure=3;
    clock.cursor={measure:3,beat:2};
    clock.queuedPulse={at:1.08,phase:'play',cursor:{measure:3,beat:1}};
    trackPracticeBeat('verso',3,0,4);
    stopFromTransport();
  `);
  assert.equal(run('clock.playing'),false);
  assert.equal(run('clock.paused'),true);
  assert.equal(run('JSON.stringify(clock.cursor)'), '{"measure":2,"beat":0,"countRemaining":0}');
  assert.equal(run('clock.visualMeasure'),2);
  assert.equal(run('clock.queuedPulse===null&&practiceMeasure===null'),true);
  assert.equal(run('clock.loop'),true);
});
