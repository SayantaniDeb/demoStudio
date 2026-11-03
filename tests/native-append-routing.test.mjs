import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the production import handler so its append/replace decision is covered.
const file = ts.createSourceFile('App.tsx', fs.readFileSync('src/App.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'importNative') handler = node.initializer.getText(file);
  ts.forEachChild(node, visit);
}
visit(file);
assert(handler);
const code = ts.transpileModule(`globalThis.runImport = ${handler}`, {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText;
async function run({hasSource = true, append = true, temporaryFlag = false}) {
  const calls = [];
  const context = vm.createContext({
    console, Blob, File, location: {origin: 'http://127.0.0.1:19743'},
    source: hasSource ? 'blob:existing-recording' : '', duration: 38.78, settings: {},
    appendCapture: {current: temporaryFlag}, isNativeMac: () => true,
    fetch: async () => new Response(new Blob(['new recording'], {type: 'video/mp4'})),
    appendScreenBlob: async () => {calls.push('append'); return true;},
    receive: async () => {calls.push('replace'); return true;},
    navigateStudio() {}, announce() {}, setCamSource() {}, async storeAsset() {},
    setSettings() {}, cursorFocusPoints: () => [],
  });
  vm.runInContext(code, context);
  await context.runImport({detail: {url: 'http://127.0.0.1:19743/recordings/new.mp4', name: 'new.mp4', append}});
  return calls;
}
assert.deepEqual(await run({}), ['append'], 'Native capture must append even when temporary web flag is false');
assert.deepEqual(await run({hasSource: false}), ['replace'], 'The first recording must initialize an empty editor');
assert.deepEqual(await run({append: false}), ['replace'], 'Explicit library open must still load the chosen recording');
assert.deepEqual(await run({append: false, temporaryFlag: true}), ['append'], 'Legacy record-next intent must remain supported');
assert.match(fs.readFileSync('macos/Sources/App.swift', 'utf8'), /onFinished = \{ url in editor\.importRecording\(url, append: true\) \}/);
console.log('Passed: native capture appends with a cleared web flag; empty editor, library open, and legacy append routes behave correctly');
