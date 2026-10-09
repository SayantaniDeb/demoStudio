import {test} from 'node:test';
import assert from 'node:assert/strict';
import {removeIconBackground} from '../shared/iconBackground.mjs';
const make=(w,h)=>{const p=new Uint8ClampedArray(w*h*4);p.fill(255);return p};
const set=(p,w,x,y,c)=>p.set(c,(y*w+x)*4);
test('removes connected white border but preserves enclosed white logo artwork',()=>{
 const p=make(7,7);for(let y=1;y<6;y++)for(let x=1;x<6;x++)set(p,7,x,y,[220,40,140,255]);set(p,7,3,3,[255,255,255,255]);
 const result=removeIconBackground(p,7,7);assert.equal(result[3],0);assert.deepEqual([...result.slice((3*7+3)*4,(3*7+3)*4+4)],[255,255,255,255]);assert.equal(result[(1*7+1)*4+3],255);assert.equal(p[3],255);
});
test('softens gray-white outer fringe without altering colored artwork',()=>{
 const p=make(5,5);for(let y=1;y<4;y++)for(let x=1;x<4;x++)set(p,5,x,y,[80,40,180,255]);set(p,5,0,2,[220,220,220,255]);
 const r=removeIconBackground(p,5,5);assert.ok(r[(2*5)*4+3]>0&&r[(2*5)*4+3]<255);assert.deepEqual([...r.slice(24,28)],[80,40,180,255]);
});
test('retains existing transparency and refuses to erase an all-white icon',()=>{
 const p=make(3,3);assert.deepEqual(removeIconBackground(p,3,3),p);p.fill(0);set(p,3,1,1,[20,70,160,128]);assert.deepEqual(removeIconBackground(p,3,3),p);
});
