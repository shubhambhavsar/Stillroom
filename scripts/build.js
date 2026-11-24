import {mkdir,cp,copyFile,readFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const model='.cache/pose.task';
const checksum='59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a';
const valid=async()=>createHash('sha256').update(await readFile(model)).digest('hex')===checksum;
await mkdir('.cache',{recursive:true});
if(!await valid().catch(()=>false)){
 execFileSync('curl',['-fsSL','--retry','2','-o',model,'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task']);
 if(!await valid())throw Error('Model checksum mismatch');
}
await rm('dist',{recursive:true,force:true});await mkdir('dist/vendor',{recursive:true});
for(const f of ['index.html','studio.css','demo','app'])await cp(f,'dist/'+f,{recursive:true});
await cp('node_modules/@mediapipe/tasks-vision/wasm','dist/vendor/wasm',{recursive:true});
await copyFile('node_modules/@mediapipe/tasks-vision/vision_bundle.mjs','dist/vendor/vision.mjs');
await copyFile(model,'dist/vendor/pose.task');
