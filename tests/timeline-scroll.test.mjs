import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync('src/components/TimelineViewport.tsx','utf8');
const body=source.slice(source.indexOf('    const wheel ='),source.indexOf('    let initial ='));
const js=ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const viewport={clientWidth:700,scrollWidth:1400,scrollLeft:0};
const tracks={clientHeight:250,scrollHeight:600,scrollTop:0};
let zoom;
const wheel=new Function('el','scrollBox','changeZoom','scale',js+';return wheel;')(viewport,tracks,(...args)=>zoom=args,{current:1});
function event(deltaX,deltaY,extra={}){return {deltaX,deltaY,deltaMode:0,ctrlKey:false,metaKey:false,shiftKey:false,clientX:350,preventDefault(){this.prevented=true;},...extra};}
wheel(event(0,80));assert.equal(tracks.scrollTop,80);assert.equal(viewport.scrollLeft,0);
wheel(event(65,2));assert.equal(viewport.scrollLeft,65);assert.equal(tracks.scrollTop,80);
wheel(event(0,40,{shiftKey:true}));assert.equal(viewport.scrollLeft,105);
wheel(event(0,-10,{ctrlKey:true}));assert(zoom[0]>1);assert.equal(tracks.scrollTop,80);
tracks.scrollHeight=250;wheel(event(0,30));assert.equal(viewport.scrollLeft,135);
viewport.scrollWidth=700;const idle=event(0,20);wheel(idle);assert(!idle.prevented,'Do not trap scrolling when the timeline fits both axes');
console.log('Passed: scroll tracks under the pointer, horizontal swipe, Shift pan, pinch zoom, and no unnecessary scroll trapping');
