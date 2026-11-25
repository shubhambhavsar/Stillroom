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
for(const f of ['index.html','studio.css','demo','app','images'])await cp(f,'dist/'+f,{recursive:true});
await cp('node_modules/@mediapipe/tasks-vision/wasm','dist/vendor/wasm',{recursive:true});
await copyFile('node_modules/@mediapipe/tasks-vision/vision_bundle.mjs','dist/vendor/vision.mjs');
await copyFile(model,'dist/vendor/pose.task');
const sceneFile='.cache/scene.tflite';
const sceneHash=async()=>createHash('sha256').update(await readFile(sceneFile)).digest('hex');
const expectedScene='0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb';
if(await sceneHash().catch(()=>'')!==expectedScene){
 execFileSync('curl',['-fsSL','--retry','2','-o',sceneFile,'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite']);
 if(await sceneHash()!==expectedScene)throw Error('Scene model checksum mismatch');
}
await copyFile(sceneFile,'dist/vendor/scene.tflite');
const {readdir,writeFile}=await import('node:fs/promises');
const core=['index.html','studio.css','demo/portrait.jpg'];
for(const dir of ['app','images']){
 for(const f of await readdir('dist/'+dir,{recursive:true,withFileTypes:true})){
   if(f.isFile() && !f.name.endsWith('.md') && f.name!=='offline-template.js')core.push((f.parentPath+'/'+f.name).replace(/^dist\//,''));
 }
}
const template=await readFile('app/offline-template.js','utf8');
const digest=createHash('sha256').update(template).update(checksum).update(expectedScene);
for(const path of core.sort())digest.update(await readFile('dist/'+path));
await writeFile('dist/offline.js','const BUILD_ID='+JSON.stringify(digest.digest('hex').slice(0,16))+';\nconst CORE_FILES='+JSON.stringify(core)+';\n'+template);
await rm('dist/app/offline-template.js');
