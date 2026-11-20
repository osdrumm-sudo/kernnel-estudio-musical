'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const html = read('index.html');
const sw = read('sw.js');

test('la página declara idioma español de Chile e incluye enlace al manual', () => {
  assert.match(html, /<html\s+lang="es-CL"/i);
  assert.match(html, /https:\/\/manual\.kernnel\.app\/#manual/);
  assert.match(html, /<title>Kernnel Estudio musical<\/title>/);
});

test('los recursos locales declarados en la página existen', () => {
  const links = [...html.matchAll(/\b(?:href|src)\s*=\s*["'](\.[^"']+)["']/g)].map(x=>x[1]);
  assert.ok(links.length >= 15,'no se encontraron suficientes recursos');
  for (const link of links) {
    const target = link.split(/[?#]/)[0];
    assert.ok(fs.existsSync(path.join(root,target)), 'Falta el recurso: '+link);
  }
});

test('el HTML no declara IDs duplicados', () => {
  const ids = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map(x=>x[1]);
  const seen = new Set();
  for (const id of ids) {
    assert.ok(!seen.has(id),'ID duplicado: '+id);
    seen.add(id);
  }
});

test('la caché PWA incluye todos los módulos locales cargados por la página', () => {
  const match = sw.match(/const SHELL\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(match,'No existe inventario SHELL de la PWA');
  const shell = [...match[1].matchAll(/['"](\.[^'"]+)['"]/g)].map(x=>x[1]);
  const scripts = [...html.matchAll(/<script[^>]+src=["'](\.[^"']+)["']/g)].map(x=>x[1]);
  const css = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["'](\.[^"']+)["']/g)].map(x=>x[1]);
  for (const file of [...shell,...scripts,...css]) {
    assert.ok(file==='./'||fs.existsSync(path.join(root,file)), 'Falta el archivo: '+file);
  }
  for (const file of [...scripts,...css]) {
    assert.ok(shell.includes(file), 'Recurso fuera de caché PWA: '+file);
  }
});

test('las reglas versionadas incluyen rutas nuevas de estudio y conservan aislamiento por cuenta', () => {
  const rules = read('firestore.rules');
  for (const section of ['studyNotes','studyProgress','studyRooms','syncItems','syncVersions']) {
    assert.ok(rules.includes(section),'Falta ruta Firestore: '+section);
  }
  assert.match(rules,/function isOwner\(userId\)/);
  assert.match(rules,/allow read: if isOwner\(userId\)/);
  // Revisión de referencias: NO sustituye tests con emulador Firebase ni certifica reglas publicadas.
});
