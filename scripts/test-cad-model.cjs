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

test('section orientation is backward compatible, bounded and changes cut surfaces',()=>{
  const old={...M.defaults};delete old.sectionAngle;
  assert.equal(M.validate(old).sectionAngle,0);
  assert.throws(()=>M.validate({...M.defaults,sectionAngle:361}));
  assert.notDeepEqual(M.buildScene({...M.defaults,sectionAngle:90}).meshes[2].vertices,M.buildScene(M.defaults).meshes[2].vertices);
});
test('hierarchy names mesh components and symbols remain static during crank motion',()=>{
  const a=M.buildScene(M.defaults),b=M.buildScene({...M.defaults,angle:180});
  assert.ok(a.meshes.every(m=>typeof m.name==='string'&&m.name.length>0));
  assert.deepEqual(a.meshes.filter(m=>m.decorative),b.meshes.filter(m=>m.decorative));
  assert.ok(a.meshes.some(m=>m.name==='Wrist pin'));
});
test('real model result is a read-only motored trace, never a fabricated pressure curve',()=>{
  const raw=JSON.parse(readFileSync(resolve(__dirname,'fixtures/cad-model-result.json'),'utf8'));
  const result=M.parseResult(JSON.stringify(raw));
  assert.deepEqual(result.trace.pressure_pa,raw.motored_baseline.pressure_pa);
  assert.equal(result.id,raw.result_id);
  assert.equal(result.metadata.random_seed,raw.reproducibility.random_seed);
  const bad=structuredClone(raw);bad.motored_baseline.volume_m3.pop();
  assert.throws(()=>M.parseResult(JSON.stringify(bad)));
  bad.motored_baseline=raw.motored_baseline;bad.gate.passed=false;bad.proposed_cycle={};
  assert.throws(()=>M.parseResult(JSON.stringify(bad)));
  assert.throws(()=>M.parseResult('{"result_id":"unproven"}'));
});

test('piston crown and wrist pin agree with the volume geometry across crank positions',()=>{
  for(const angle of [0,90,180,270]){
    const s=M.buildScene({...M.defaults,angle}),piston=s.meshes.find(m=>m.name==='Piston');
    const ys=piston.vertices.filter((_,i)=>i%6===1);
    assert.ok(Math.abs(Math.max(...ys)-(67+s.geometry.pistonY+9))<1e-9);
    const pin=s.meshes.find(m=>m.name==='Wrist pin');
    const py=pin.vertices.filter((_,i)=>i%6===1);
    assert.ok(Math.abs((Math.min(...py)+Math.max(...py))/2-(67+s.geometry.pistonY))<1e-9);
  }
});
test('result nulls stay null, zero stays zero, unsupported metadata and numeric strings reject',()=>{
  const raw=JSON.parse(readFileSync(resolve(__dirname,'fixtures/cad-model-result.json'),'utf8'));
  raw.gate.mass_balance.initial_h2_mg_per_cycle=null;
  raw.gate.mass_balance.retained_h2_mg_per_cycle=0;
  const r=M.parseResult(JSON.stringify(raw));
  assert.equal(r.mass.initial_h2_mg_per_cycle,null);
  assert.equal(r.mass.retained_h2_mg_per_cycle,0);
  raw.gate.mass_balance.initial_h2_mg_per_cycle='2';
  assert.throws(()=>M.parseResult(JSON.stringify(raw)));
  raw.gate.mass_balance.initial_h2_mg_per_cycle=null;
  raw.reproducibility.schema_version='2.0.0';
  assert.throws(()=>M.parseResult(JSON.stringify(raw)));
});
test('animation-only rebuild returns the exact engine without rebuilding static stages',()=>{
  const p={...M.defaults,angle:130,exploded:.8};
  const full=M.buildScene(p),motion=M.buildScene(p,true);
  assert.ok(JSON.stringify(motion.meshes)===JSON.stringify(full.meshes.filter(m=>m.id==='ENG-601')), 'Animation meshes must match the full-scene engine exactly');
  assert.deepEqual(motion.geometry,full.geometry);
});
