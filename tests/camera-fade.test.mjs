import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('src/cameraFade.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {cameraFade}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
assert.equal(cameraFade(5,0,10),1);
assert.equal(cameraFade(9.95,0,10),0,'Held final frame must be fully invisible');
assert.equal(cameraFade(10,0,10),0);
assert.equal(cameraFade(5,0,10,true),0);
let previous=1;
for(let t=9.27;t<10;t+=.005){const alpha=cameraFade(t,0,10);assert(alpha<=previous+1e-10);assert(alpha>=0);previous=alpha;}
assert.equal(cameraFade(.195,0,.2),0,'Short clips settle before EOF too');
console.log('Camera exit fades monotonically to zero before the held final frame.');
