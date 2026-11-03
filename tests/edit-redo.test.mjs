import assert from 'node:assert/strict';
import ts from 'typescript';import fs from 'node:fs';
const code=ts.transpileModule(fs.readFileSync('src/editHistory.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {editHistory}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
let state={present:0,past:[],grouping:false,captured:false};
state=editHistory(state,{type:'set',value:1});state=editHistory(state,{type:'undo'});assert.equal(state.present,0);
state=editHistory(state,{type:'redo'});assert.equal(state.present,1);
state=editHistory(state,{type:'undo'});state=editHistory(state,{type:'set',value:2});state=editHistory(state,{type:'redo'});assert.equal(state.present,2);
console.log('Redo restores undone edits; a new edit clears redo history.');
