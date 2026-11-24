import test from 'node:test';
import assert from 'node:assert/strict';
import {crop,choose,settle} from '../app/coach.js';
const face={x:.5,y:.3,visibility:1};
test('square crop remains centred',()=>assert.deepEqual(crop(1280,720,1),{x:280,y:0,w:720,h:720}));
test('low-confidence subject clears coaching',()=>assert.equal(choose({nose:{...face,visibility:.2}}),'search'));
test('selfie directions account for mirror',()=>{for(const mirrored of [false,true])assert.equal(choose({nose:{...face,x:.2},mirrored}),mirrored?'right':'left')});
test('headroom cue precedes pose',()=>assert.equal(choose({nose:{...face,y:.1}}),'back'));
test('backlight cue precedes pose',()=>assert.equal(choose({nose:face,backlit:true}),'light'));
test('dismissed pose stays dismissed',()=>assert.equal(choose({nose:face,skipPose:true}),'ready'));
test('cue settles and clears immediately when lost',()=>{let state={current:'search'};assert.equal(settle(state,'left',0),'search');assert.equal(settle(state,'left',500),'left');assert.equal(settle(state,'search',501),'search')});

import {measure,compare} from '../app/scout.js';
test('clipping outweighs background detail',()=>assert.equal(compare({clipped:.5,clutter:0},{clipped:0,clutter:.5}).pick,1));
test('similar views give the photographer the choice',()=>assert.equal(compare({clipped:.01,clutter:.1},{clipped:.02,clutter:.12}).pick,null));
test('subject metrics work on a frame edge',()=>{const data=new Uint8ClampedArray(4*100*100).fill(255);assert.equal(measure({data,width:100,height:100},{x:0,y:0}).clipped,1)});
