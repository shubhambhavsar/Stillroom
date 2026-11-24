import {goals,cues,choose,settle} from './coach.js';
import {frame,overlay} from './view.js';
const $=id=>document.getElementById(id),video=$('source'),picture=$('photo'),guide=$('guide');
const ctx=picture.getContext('2d'),ink=guide.getContext('2d'),sample=document.createElement('canvas');
const sampleCtx=sample.getContext('2d');
let session=0,stream,worker,busy=false,face='environment',mirrored=false,raf,last=0,tracking,skipPose=false,recorder,clipStream,timeout,url,ready=false,opening=false,exposureBase=null;
let stable={current:'search'};
function goal(){return $('goal').value}
function size(){const [w,h]=goals[goal()];picture.height=guide.height=960;picture.width=guide.width=960*w/h;sample.height=320;sample.width=Math.round(320*w/h);$('frame').style.aspectRatio=w+'/'+h}
function controls(){const live=!!stream, recording=recorder?.state==='recording';
 $('flip').disabled=!live||recording;$('stop').disabled=!live&&!opening;$('goal').disabled=!!recording||opening;
 $('capture').disabled=!live||!ready||(goal()==='Video'&&(!window.MediaRecorder||!picture.captureStream));
 $('capture').className=recording?'record movie':goal()==='Video'?'movie':'';
 $('capture').ariaLabel=goal()==='Video'?(recording?'Stop recording':'Record video'):'Take photo';
 $('badge').textContent=recording?'RECORDING':live?'LIVE CAMERA':'CAMERA OFF';$('start').disabled=opening;
}
function cue(){
 const key=stable.current,active=!!stream&&$('coach').checked&&tracking;
 $('heading').textContent=active?cues[key][0]:goal()+' session';
 $('hint').textContent=active?cues[key][1]:stream?'Frame your shot and tap the shutter.':'Your camera feed stays on this device.';
 $('pose').hidden=!(active&&key==='pose');
 const caps=stream?.getVideoTracks()[0]?.getCapabilities?.();
 $('expose').hidden=!(active&&key==='light'&&caps?.exposureCompensation)||exposureBase!==null;
 overlay(ink,active?tracking:null,key);
}
function clearWorker(){worker?.terminate();worker=null;tracking=null;busy=false;stable={current:'search'};cue()}
function track(){
 clearWorker();if(!stream||!$('coach').checked)return;
 let local;
 function failed(){if(worker!==local)return;clearWorker();$('health').textContent='Tracking unavailable. You can still capture or try the walkthrough.'}
 try{local=new Worker(new URL('./tracker.js',import.meta.url));worker=local;
 $('health').textContent='Loading on-device coach…';local.onerror=failed;local.onmessage=({data})=>{
 if(worker!==local)return;if(data.error){failed();return}
 if(data.ready){busy=false;$('health').textContent='On-device coaching active';return}
 busy=false;tracking=data;
 settle(stable,choose({nose:data.points?.[0],left:data.points?.[11],right:data.points?.[12],backlit:data.backlit,mirrored,skipPose}),performance.now());cue()};
 busy=true;local.postMessage({init:true})}catch{failed()}
}
async function analyze(time){const target=worker;busy=true;last=time;
 try{sampleCtx.drawImage(picture,0,0,sample.width,sample.height);const bitmap=await createImageBitmap(sample);
 if(target!==worker){bitmap.close();return}target.postMessage({bitmap,time},[bitmap])}catch{if(target===worker){clearWorker();$('health').textContent='Coaching unavailable on this browser. Camera capture is available.'}}}
function draw(time){if(!stream)return;if(video.readyState>=2&&video.videoWidth){frame(ctx,video,mirrored);
 if(!ready){ready=true;controls()}if(worker&&!busy&&time-last>=150)analyze(time)}raf=requestAnimationFrame(draw)}
function stop(){
 session++;opening=false;clearTimeout(timeout);if(recorder?.state==='recording')recorder.stop();cancelAnimationFrame(raf);
 stream?.getTracks().forEach(t=>t.stop());stream=null;ready=false;video.srcObject=null;clearWorker();ctx.clearRect(0,0,picture.width,picture.height);
 $('intro').hidden=false;$('health').textContent='Camera is off.';exposureBase=null;controls();
}
async function start(){
 stop();const token=session;opening=true;$('message').textContent='';controls();
 try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Open this app over HTTPS in Safari or Chrome.');
 const input=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:face},width:{ideal:1280},height:{ideal:960}}});
 if(token!==session){input.getTracks().forEach(t=>t.stop());return}
 stream=input;const t=input.getVideoTracks()[0];mirrored=(t.getSettings().facingMode||face)==='user';
 t.onended=()=>{if(token===session){stop();$('message').textContent='Camera disconnected. Start again to reconnect.'}};
 video.srcObject=input;await video.play();if(token!==session)return;
 $('intro').hidden=true;opening=false;skipPose=false;controls();track();draw(performance.now());
 }catch(e){if(token!==session)return;stop();$('message').textContent=e.name==='NotAllowedError'?'Camera access was declined. Allow camera access in your browser and tap Start camera again.':e.name==='NotFoundError'?'No camera found. Connect a camera or try the walkthrough.':e.message}
}
function review(blob,isVideo){if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);
 const el=$(isVideo?'clip':'still');$('clip').hidden=!isVideo;$('still').hidden=isVideo;el.src=url;
 $('save').href=url;$('save').download='stillroom.'+(isVideo?(blob.type.includes('mp4')?'mp4':'webm'):'jpg');$('review').showModal()}
function capture(){if(!ready)return;const token=session;
 if(goal()!=='Video'){picture.toBlob(b=>{if(b&&token===session&&!$('review').open)review(b,false)},'image/jpeg',.94);return}
 if(recorder?.state==='recording'){recorder.stop();return}
 try{clipStream=picture.captureStream(24);const output=clipStream;const rec=new MediaRecorder(output);recorder=rec;const chunks=[];
 rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
 rec.onstop=()=>{clearTimeout(timeout);output.getTracks().forEach(t=>t.stop());recorder=null;controls();if(token===session&&chunks.length)review(new Blob(chunks,{type:rec.mimeType||chunks[0].type}),true)};
 rec.start();timeout=setTimeout(()=>{if(rec.state==='recording')rec.stop()},15000);controls();
 }catch{clipStream?.getTracks().forEach(t=>t.stop());$('message').textContent='Video recording is unavailable in this browser. Choose a photo goal.'}}
$('start').onclick=start;$('flip').onclick=()=>{face=mirrored?'environment':'user';start()};$('stop').onclick=stop;$('capture').onclick=capture;
$('goal').onchange=()=>{skipPose=false;size();track();controls();$('message').textContent=goal()==='Video'?'Silent video · up to 15 seconds.':''};
$('pose').onclick=()=>{skipPose=true;stable.current='ready';cue()};$('coach').onchange=()=>{track();if(!$('coach').checked)$('health').textContent='Visual coaching paused.'};
$('expose').onclick=async()=>{const t=stream?.getVideoTracks()[0];if(!t)return;const token=session,c=t.getCapabilities().exposureCompensation,base=t.getSettings().exposureCompensation;
 if(!Number.isFinite(base))return;const target=Math.min(c.max,base+Math.max(c.step||.33,.33));
 try{await t.applyConstraints({advanced:[{exposureCompensation:target}]});if(token!==session)return;
 const applied=t.getSettings().exposureCompensation>base;exposureBase=applied?base:null;$('message').textContent=applied?'Exposure increased for this camera session.':'Camera retained its current exposure.';cue()}catch{if(token===session)$('message').textContent='This camera retained automatic exposure.'}};
$('again').onclick=()=>$('review').close();$('review').onclose=()=>{$('clip').pause();$('clip').removeAttribute('src');$('still').removeAttribute('src');URL.revokeObjectURL(url);url=null};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(stream||opening))stop()});window.addEventListener('pagehide',stop);size();controls();
