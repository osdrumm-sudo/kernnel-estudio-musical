'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const catalog=require('../evaluacion/pendientes.js');
const core=require('../evaluacion/core.js');

test('catálogo de evaluación cubre Full, Inicial y controles comunes con IDs estables',()=>{
 const items=catalog.items,ids=items.map(x=>x.id);
 assert.equal(items.length,127);
 assert.equal(new Set(ids).size,items.length);
 assert.equal(catalog.forVersion('full').length,87);
 assert.equal(catalog.forVersion('initial').length,46);
 for(const x of items){
  assert.ok(x.title&&x.criteria&&x.group&&x.source);
  assert.match(x.priority,/^P[0-2]$/);
  assert.ok(['full','initial','both'].includes(x.version));
 }
});

test('decisiones BAT-01, BAT-02 y BAT-03 permanecen dentro del formulario Full',()=>{
 const full=catalog.forVersion('full').map(x=>x.id);
 for(const id of ['F-E02','F-E03','F-E05','F-E06','F-E15','F-E16','F-E17','F-S01','F-S03','F-S05'])assert.ok(full.includes(id),id);
 const initial=catalog.forVersion('initial').map(x=>x.id);
 assert.ok(initial.includes('I-C01')&&initial.includes('I-O02'));
 assert.ok(!initial.includes('F-E15'));
});

test('un usuario no designado no accede a evaluaciones',()=>{
 assert.deepEqual(core.versionsFor(null,false),[]);
 assert.deepEqual(core.versionsFor({active:false,versions:['full']},false),[]);
 assert.equal(core.canEvaluate({active:false,versions:['full']},false,'full'),false);
});

test('administrador siempre ve ambas versiones sin depender de rol cliente',()=>{
 assert.deepEqual(core.versionsFor(null,true),['full','initial']);
 assert.ok(core.canEvaluate(null,true,'initial'));
 assert.equal(core.canEvaluate(null,true,'inexistente'),false);
});

test('un evaluador designado solo accede a las versiones asignadas',()=>{
 const role={active:true,versions:['full']};
 assert.deepEqual(core.versionsFor(role,false),['full']);
 assert.equal(core.canEvaluate(role,false,'initial'),false);
 assert.deepEqual(core.versionsFor({active:true,versions:['initial','full','interna']},false),['full','initial']);
});

test('normalización rechaza otros usuarios y respuestas ajenas a la versión',()=>{
 const foreign=core.normalise({ownerUid:'otro',version:'full',answers:{'F-E03':{result:'passed'}}},'uid','full',catalog);
 assert.equal(Object.keys(foreign.answers).length,0);
 const local=core.normalise({ownerUid:'uid',version:'full',revision:3,answers:{
  'F-E03':{result:'passed',note:'Correcto'},
  'I-C01':{result:'passed',note:'No pertenece a Full'}
 }},'uid','full',catalog);
 assert.equal(local.revision,3);
 assert.equal(local.answers['F-E03'].done,true);
 assert.equal(local.answers['I-C01'],undefined);
});

test('checklist distingue aprobado, incidencia y bloqueado',()=>{
 const report=core.blank('u','full');
 core.setAnswer(report,'F-E03','passed','Bien',catalog);
 core.setAnswer(report,'F-E15','issue','No aparece confirmación',catalog);
 core.setAnswer(report,'F-S01','blocked','Aún no disponible',catalog);
 const p=core.progress(report,catalog);
 assert.equal(p.total,87);assert.equal(p.reviewed,3);
 assert.equal(p.passed,1);assert.equal(p.issue,1);assert.equal(p.blocked,1);
 assert.equal(p.pending,84);
 assert.equal(report.answers['F-E15'].done,false);
});

test('rechaza resultados inválidos y texto excesivo',()=>{
 const report=core.blank('u','initial');
 assert.throws(()=>core.setAnswer(report,'F-E03','passed','',catalog));
 assert.throws(()=>core.setAnswer(report,'I-C01','certificado','',catalog));
 core.setAnswer(report,'I-C01','issue','a'.repeat(1500),catalog);
 assert.equal(report.answers['I-C01'].note.length,1000);
});

test('borrador guardado desde otra revisión exige resolución explícita',()=>{
 assert.equal(core.resolveDraft({revision:4},{baseRevision:3,report:{}}).mode,'conflict');
 assert.equal(core.resolveDraft({revision:4},{baseRevision:4,report:{}}).mode,'draft');
 assert.equal(core.resolveDraft({revision:0},null).mode,'remote');
 assert.notEqual(core.draftKey('a','full'),core.draftKey('a','initial'));
 assert.notEqual(core.draftKey('a','full'),core.draftKey('b','full'));
});

test('página incluye elección de versión y administración de evaluadores',()=>{
 const html=read('evaluacion/index.html');
 for(const id of ['gate','choose-full','choose-initial','checklist','save-report','download-report','admin',
  'users-list','reports-summary','draft-warning','progress-bar'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/firebase-config\.js/);
 assert.match(html,/type="module" src="\.\/app\.js"/);
});

test('scripts del portal, catálogo y entrada tienen sintaxis correcta',()=>{
 for(const x of ['evaluacion/app.js','evaluacion/core.js','evaluacion/pendientes.js','evaluation-entry.js'])
  assert.doesNotThrow(()=>new vm.Script(read(x),{filename:x}),x);
});

test('Firestore es la autoridad de los roles, por UID y versión',()=>{
 const rules=read('firestore.rules');
 assert.match(rules,/match \/evaluationRoles\/\{userId\}/);
 assert.match(rules,/allow create, update: if isAdmin\(\) && validEvaluatorRole\(\)/);
 assert.match(rules,/function hasEvaluationPermission\(version\)/);
 assert.match(rules,/match \/evaluationReports\/\{reportId\}/);
 assert.match(rules,/reportId == request\.auth\.uid \+ '_' \+ d\.version/);
 assert.match(rules,/d\.answers is map/);
 assert.match(rules,/request\.resource\.data\.revision == resource\.data\.revision \+ 1/);
 assert.match(rules,/allow list: if isAdmin\(\)/);
});

test('el enlace aparece solo tras autorización y se oculta en cierre de sesión',()=>{
 const html=read('index.html'),cloud=read('cloud.js'),sw=read('sw.js'),entry=read('evaluation-entry.js');
 assert.match(html,/id="evaluation-entry"[^>]*hidden/);
 assert.match(html,/src="\.\/evaluation-entry\.js"/);
 assert.match(cloud,/KernnelEvalEntry\?\.stop\(\)/);
 assert.match(cloud,/KernnelEvalEntry\?\.start\(user,state\.sdk,state\.db,offline\)/);
 assert.match(entry,/evaluationRoles/);
 assert.match(sw,/'\.\/evaluation-entry\.js'/);
});

test('guardado en nube usa transacción con revisión comparada',()=>{
 const app=read('evaluacion/app.js');
 assert.match(app,/runTransaction\(state\.db,async tx/);
 assert.match(app,/if\(actual!==base\)/);
 assert.match(app,/ownerUid:uid,version,answers:report\.answers/);
 assert.match(app,/serverTimestamp\(\)/);
 assert.match(app,/sólo|solo|roles|evaluador/i);
});
