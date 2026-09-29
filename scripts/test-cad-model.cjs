const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const Module = require('node:module');
const filename = resolve(__dirname, '../apps/web/public/hydrocycle-cad.html');
const html = readFileSync(filename, 'utf8');
const source = /<script id="hydrocycle-model-source">([\s\S]*?)<\/script>/.exec(html)?.[1];
if (!source) throw new Error('Published document is missing its geometry model.');
const compiled = new Module(filename);
compiled._compile(source, filename);
const M = compiled.exports;

test('P0 geometry preserves displacement and compression ratio', () => {
  const g = M.kinematics(M.defaults, 0);
  assert.ok(Math.abs(g.strokeMm - 86.076226659) < 1e-6);
  assert.ok(Math.abs(g.volumeCc - 55.555555556) < 1e-6);
  assert.ok(Math.abs(M.kinematics(M.defaults, 180).volumeCc - 555.555555556) < 1e-6);
});
test('P0 minus ten degree checkpoint is not forced to legacy value', () => {
  const v = M.kinematics(M.defaults, -10).volumeCc;
  assert.ok(v > 60.430 && v < 60.432);
  assert.ok(v - 59.354 > 1.07);
});
test('angle is geometric, periodic and mirror symmetric', () => {
  for (const a of [0, 10, 53, 121, 180]) {
    assert.ok(Math.abs(M.kinematics(M.defaults,a).volumeCc - M.kinematics(M.defaults,-a).volumeCc) < 1e-8);
    assert.ok(Math.abs(M.kinematics(M.defaults,a).volumeCc - M.kinematics(M.defaults,a+360).volumeCc) < 1e-8);
  }
});
test('nonfinite and impossible inputs are rejected', () => {
  for (const patch of [{boreMm:NaN},{rodRatio:0.5},{compressionRatio:1},{fill:2},{bubbleNm:-1},{exploded:Infinity}]) {
    assert.throws(() => M.validate({...M.defaults,...patch}));
  }
});
test('empty strings and strings are not silently interpreted as numbers', () => {
  assert.throws(() => M.validate({...M.defaults,boreMm:''}));
  assert.throws(() => M.validate({...M.defaults,boreMm:'86'}));
});
test('model contains separately named research stages', () => {
  const s = M.buildScene(M.defaults);
  for (const id of ['RSV-101','PMP-103','NBG-104','CND-105','USC-401','MTR-106','ENG-601','CON-702']) {
    assert.ok(s.parts.some(p=>p.id===id));
  }
});
test('all mesh vertices and normals are finite', () => {
  for (const mesh of M.buildScene(M.defaults).meshes) {
    assert.equal(mesh.vertices.length % 18, 0);
    assert.ok(mesh.vertices.every(Number.isFinite));
  }
});
test('cutaway changes geometry, not only UI', () => {
  const count = p => M.buildScene(p).meshes.reduce((n,m)=>n+m.vertices.length,0);
  assert.ok(count({...M.defaults,cutaway:true}) < count({...M.defaults,cutaway:false}));
});
test('exploded view changes assembly coordinates', () => {
  const a = M.buildScene({...M.defaults,exploded:0});
  const b = M.buildScene({...M.defaults,exploded:1});
  assert.notDeepEqual(a.parts.map(x=>x.center),b.parts.map(x=>x.center));
});
test('changing bubble assumption never fabricates fuel or thermal data', () => {
  const p = {...M.defaults,bubbleNm:400,bubbleCount:1e8};
  const doc = M.document(p);
  assert.equal(doc.physics.hydrogenMassMg,null);
  assert.equal(doc.physics.waterVaporFraction,null);
  assert.equal(doc.physics.shaftPowerW,null);
  assert.equal(doc.validation,'UNVALIDATED_CONCEPT');
});
test('JSON round-trip preserves inputs and rejects incompatible documents', () => {
  const params = {...M.defaults,boreMm:90,angle:128,exploded:0.4};
  assert.deepEqual(M.parseDocument(JSON.stringify(M.document(params))),params);
  assert.throws(()=>M.parseDocument('{"schema":"other"}'));
  assert.throws(()=>M.parseDocument('{bad'));
});
test('OBJ export includes real vertices, faces, mm units and exclusions', () => {
  const text = M.toOBJ(M.buildScene(M.defaults));
  assert.match(text,/# units: millimeters/);
  assert.match(text,/o RSV-101/);
  assert.match(text,/^v /m);
  assert.match(text,/^f /m);
  assert.match(text,/NOT FOR FABRICATION/);
  assert.doesNotMatch(text,/o bubble-symbol/);
});
test('OBJ visibility filter is honored', () => {
  const text = M.toOBJ(M.buildScene(M.defaults),new Set(['ENG-601']));
  assert.match(text,/o ENG-601/);
  assert.doesNotMatch(text,/o RSV-101/);
});
test('input limits keep generated geometry finite at both extremes',()=>{
  for (const p of [{...M.defaults,boreMm:65,displacementCc:100,rodRatio:2},{...M.defaults,boreMm:110,displacementCc:800,rodRatio:5,angle:180}]) {
    assert.ok(M.buildScene(p).meshes.every(m=>m.vertices.every(Number.isFinite)));
  }
});
