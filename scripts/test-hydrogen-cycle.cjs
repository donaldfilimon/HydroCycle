const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {runInNewContext}=require('node:vm');
const assert=require('node:assert/strict');
const html=readFileSync(resolve(__dirname,'../apps/web/public/hydrogen-cycle.html'),'utf8');
const source=html.match(/<script>\s*\(function\(\)\{([\s\S]*?)\/\* ---------- parameter deck/)[1];
const model=runInNewContext(source+';({simulate,defaults,presets,idxOf})');
for(const [name,preset] of Object.entries(model.presets)){
 const q=model.simulate(preset);
 assert.ok([...q.p,...q.T,...q.V,...q.tqN].every(Number.isFinite),name+' finite');
 assert.ok(Math.abs(q.resid)<Math.max(1,q.Qtot*.01),name+' energy residual');
 assert.ok(Math.abs(q.tqmean-q.Wcycle/(4*Math.PI))<.1,name+' torque/work');
 if(preset.phi===0){assert.ok([...q.xb,...q.dQc].every(v=>v===0));assert.equal(q.Qrel,0);assert.equal(q.mH2,0);}
 else {assert.ok(q.xb[model.idxOf(90)]>0.99);assert.ok(q.Qrel>0);}
 console.log(name,JSON.stringify({clearanceMm:q.hc*1000,Qrel:q.Qrel,residual:q.resid}));
}
console.log('Hydrogen cycle model regressions passed');
