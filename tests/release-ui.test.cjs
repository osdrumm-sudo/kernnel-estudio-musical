'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const file = name => fs.readFileSync(path.join(root, name), 'utf8');
const html = file('index.html');

test('el código principal de la app conserva sintaxis JavaScript válida', () => {
  const code = html.match(/<script>\s*('use strict';[\s\S]*?)<\/script>/);
  assert.ok(code, 'No se encontró el script principal');
  assert.doesNotThrow(() => new vm.Script(code[1], {filename: 'index.html'}));
});

test('Inicio muestra un aviso de novedades accesible y enlaza manual e historial', () => {
  assert.match(html, /<details class="home-whats-new" id="home-whats-new">/);
  assert.match(html, /<summary>[^\n]*Novedades de la plataforma/);
  assert.match(html, /https:\/\/manual\.kernnel\.app\/#manual/);
  assert.match(html, /\/blob\/main\/CHANGELOG\.md/);
});

test('colores por módulo respetan los modos oscuro y alto contraste', () => {
  const modules = file('ui-v2.css');
  const design = file('design-layout.css');
  assert.match(modules, /\.menu-unit\.menu-library\{--module-bg:/);
  assert.match(modules, /\.menu-unit\.menu-practice\{--module-bg:/);
  assert.match(design, /:root\[data-theme="dark"\] \.menu-unit \.accordion/);
  assert.match(design, /:root\[data-contrast="true"\] \.menu-unit \.accordion/);
});

test('la PWA incrementa versión de recursos tras cambios visuales', () => {
  assert.match(file('sw.js'), /kernnel-shell-2026-11-23-repertoires-accent-v1/);
});
