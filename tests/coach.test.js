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
import {rankPoses,poseSvg} from '../app/poses.js';
import {cameraPlan,AutoAssist} from '../app/settings.js';
import {proposeAngle,remember} from '../app/director.js';
test('ranking retrieves unique annotated references and changes with subject geometry',()=>{
 const a=rankPoses(null,'Portrait');assert.equal(new Set(a.map(x=>x.id)).size,96);
 function fromPose(ref){const mapped=[];[0,2,5,7,8,11,12,13,14,15,16,23,24,25,26,27,28].forEach((n,i)=>{if(ref.p[i])mapped[n]={x:ref.p[i][0]/100,y:ref.p[i][1]/100,visibility:1}});return mapped}
 const winners=new Set(a.slice(0,25).map(x=>rankPoses(fromPose(x),'Portrait',0,1)[0].id));assert.ok(winners.size>5);
 assert.match(poseSvg(a[0],'Profile'),/ellipse/);
});
test('subject intent changes camera height guidance',()=>{const m={high:0,low:0,right:2,left:2};assert.notEqual(proposeAngle('Layers',m)[0],proposeAngle('Surface',m)[0])});
test('retain better distinct viewpoints',()=>{const m={left:6,right:6,low:0,high:.3,signature:[10,12]};let best=remember(null,m,()=>'A');best=remember(best,{...m,high:0,signature:[100,120]},()=>'B');assert.equal(best.src,'B');assert.equal(remember(best,m,()=>'A'),best)});
test('motion exposure requires a compatible shutter and adequate ISO range',()=>{
 const c={exposureMode:['manual'],exposureTime:{min:1,max:3000,step:1},iso:{min:50,max:3200,step:1}},s={exposureMode:'continuous',exposureTime:160,iso:100};
 assert.deepEqual(cameraPlan(c,s,{moving:true}).values,{exposureMode:'manual',exposureTime:40,iso:400});assert.equal(cameraPlan({},s,{moving:true}),null);assert.equal(cameraPlan(c,s,{moving:true,video:true}),null)
});
test('auto exposure debounces, verifies and restores',async()=>{
 const s={exposureCompensation:0},calls=[];const service=new AutoAssist({getCapabilities:()=>({exposureCompensation:{min:-2,max:2,step:.5}}),getSettings:()=>({...s}),applyConstraints:async({advanced})=>{Object.assign(s,advanced[0]);calls.push(1)}});
 for(let i=0;i<6;i++)await service.sample({high:.5});assert.equal(calls.length,1);assert.equal(s.exposureCompensation,-.5);await service.restore();assert.equal(s.exposureCompensation,0)
});

import { MomentMeter } from "../app/moment.js";
test("auto-capture requires sustained detail, framing and stability", () => {
  const meter = new MomentMeter();
  const width=80, height=60, data=new Uint8Array(width*height*4);
  const point={x:.5,y:.5};
  for(let i=0;i<width*height;i++) data.fill(i%2 ? 150 : 80,i*4,i*4+3);
  const read=(t,framed=true)=>meter.inspect({data,width,height},point,t,framed).progress;
  for(let t=0;t<1100;t+=150) assert.ok(read(t)<1);
  assert.equal(read(1200),1);
  assert.equal(read(1350,false),0);
  assert.equal(read(2500),0);
  data.fill(255);
  for(let t=2650;t<4400;t+=150) assert.equal(read(t),0);
});

import { poseOutline } from "../app/poses.js";
test("all catalogue poses produce finite guides for either camera crop",()=>{
  const catalogue = rankPoses(null,"Portrait");
  for(const ref of catalogue) for(const crop of ["Space","Portrait"]){
    const guide=poseOutline(ref,crop);
    assert.match(guide,/<polygon/);
    assert.doesNotMatch(guide,/undefined|NaN|Infinity/);
  }
});

import { availablePoses,fitPortrait } from "../app/portrait-frame.js";
import { portraits } from "../app/portrait-catalog.js";
test("a chest-up crop receives head and shoulder photographs; the overlay maps the reference nose to the live face",()=>{
  const p=[];
  p[0]={x:.31,y:.39,visibility:1};
  p[11]={x:.51,y:.6,visibility:1};
  p[12]={x:.16,y:.61,visibility:1};
  p[15]={x:.4,y:.8,visibility:.8};
  const options=availablePoses(portraits,p);
  assert.ok(options.length>=3);
  assert.ok(options.every(r=>r.kind==="head"&&r.thumb&&r.path));
  for(const ref of options){
    const fit=fitPortrait(ref,p,504,370);
    const [x,y]=ref.points[0];
    assert.ok(Math.abs(fit.x+(fit.flip?1-x:x)*fit.w-.31*504)<.001);
    assert.ok(Math.abs(fit.y+y*fit.h-.39*370)<.001);
  }
  assert.equal(fitPortrait(options[0],null,504,370),null);
});
