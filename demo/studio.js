'use strict';
const $=id=>document.getElementById(id);
const goals={
 'Portrait':{ratio:[3,4],scale:1,place:'Leave a little space beside the subject.',pose:'Bring the chin slightly forward.'},
 'Profile photo':{ratio:[1,1],scale:1.25,place:'Centre the face inside the square.',pose:'Bring the chin slightly forward.'},
 'Social post':{ratio:[4,5],scale:1.04,place:'Leave some breathing room above the subject.',pose:'Angle the shoulders and look toward the light.'},
 'Talking head':{ratio:[9,16],scale:1,place:'Keep the eyes in the upper third.',pose:'Face the lens and relax the shoulders.'}
};
const image=new Image(), ctx=$('picture').getContext('2d');
let step=0, goal='Portrait', mode='Photo', coaching=true, grid=true, alternate=false, applied=[], recording=false, timer, started, frames=[], pending, playback, roll=[];
const active=()=>goals[mode==='Video'?'Talking head':goal];
function paint(time=0){
 const c=$('picture'),g=active(),[w,h]=g.ratio;
 if(c.width!==Math.round(820*w/h)||c.height!==820){c.width=Math.round(820*w/h);c.height=820}
 if(!image.naturalWidth)return;
 const scale=Math.max(c.width/image.width,c.height/image.height)*g.scale*(applied[2]?1:1.10)*(1+0.013*Math.sin(time));
 const width=image.width*scale,height=image.height*scale;
 ctx.filter=applied[0]?'brightness(1.04)':'brightness(.82)';
 const x=(c.width-width)*(applied[1]?.50:.46), y=(c.height-height)*.34;
 ctx.drawImage(image,x,y,width,height);
 drawGuide($('overlay'),c,{x,y,width,height},coaching&&!recording?step:4,mode==='Photo' && goal==='Social post' ? !alternate : alternate,mode);
}
function cues(){const g=active();return [
 ['Light','Turn toward the soft light.','Ask your subject to turn slightly toward the bright side of the scene. Try the movement to see the exposure change.','Try the light'],
 ['Placement',g.place,'Guide your subject into the marked area, keeping the background clear around their head.','Try the placement'],
 ['Phone position',mode==='Video'?'Hold the phone steady at eye level.':'Move the phone back a little.',mode==='Video'?'Leave room for natural movement while speaking.':'Give the shoulders and hands room inside the final crop.','Try the framing'],
 ['Pose',alternate?(g.pose.startsWith('Angle')?'Bring the chin slightly forward.':'Turn one shoulder toward the camera.'):g.pose,'Ask your subject to try the pose if it feels comfortable. The outline is a framing reference.','Use this pose'],
 ['Ready',mode==='Video'?'Ready to record.':'Ready for the shutter.',mode==='Video'?'Tap record to start the simulated clip. Tap again to stop, or let it run for 15 seconds.':'Take the photo whenever you like. Your guides stay out of the saved photo.',mode==='Video'?'Start recording':'Take photo']
]}
function btn(label,fn){let b=document.createElement('button');b.textContent=label;b.onclick=fn;$('buttons').append(b)}
function advance(apply){applied[step]=apply;step=Math.min(4,step+1);render()}
function render(){
 const g=active(),[w,h]=g.ratio,s=cues()[step];
 $('frame').style.aspectRatio=w+'/'+h;$('ratio').textContent=w+':'+h;$('goal').disabled=recording||mode==='Video';$('photo').disabled=$('video').disabled=recording;
 $('coach').disabled=recording;$('coach').textContent=coaching?'Coach on':'Coach off';$('coach').setAttribute('aria-pressed',coaching);
 $('photo').classList.toggle('active',mode==='Photo');$('video').classList.toggle('active',mode==='Video');$('grid').hidden=!grid;$('gridbtn').setAttribute('aria-pressed',grid);
 $('status').textContent=recording?'REC 00:00':'DEMO';$('title').textContent=(mode==='Video'?'Video':goal)+' session';
 $('part').textContent=recording?'Recording':coaching?s[0]:'Manual capture';$('count').textContent=recording?'15s max':coaching?(step+1)+' / 5':'';
 $('action').textContent=recording?'Recording your clip.':coaching?s[1]:'Frame it your way.';$('detail').textContent=recording?'The preview is recording a simulated movement. Stop when you have the take.':coaching?s[2]:'The shutter is ready. Turn coaching on to resume your session.';
 $('cue').replaceChildren();if(coaching&&!recording){let cue=document.createElement('span');cue.textContent=s[1];$('cue').append(cue)}
 $('shutter').className=mode==='Video'?(recording?'movie record':'movie'):'';$('shutter').setAttribute('aria-label',mode==='Photo'?'Take photo':recording?'Stop recording':'Start recording');
 $('buttons').replaceChildren();if(recording||!coaching||step===4){btn(recording?'Stop recording':mode==='Photo'?'Take photo':'Start recording',capture)}else{btn(s[3],()=>advance(true));if(step===3)btn('Another pose',()=>{alternate=!alternate;render()});btn('Skip',()=>advance(false))}
 $('progress').replaceChildren();if(coaching)for(let i=0;i<5;i++){let n=document.createElement('i');n.className=i<=step?'done':'';$('progress').append(n)}
 paint();
}
function reset(){step=0;applied=[];alternate=false;render()}
function show(item,existing=false){
 clearInterval(playback);pending=item;$('result').src=item.image;$('reviewtitle').textContent=item.frames?'Clip review':'Photo review';$('caption').textContent=item.frames?'Simulated '+item.duration+'s clip · Silent playback':'Clean preview · '+item.goal;
 $('download').hidden=!!item.frames;$('download').href=item.image;$('keep').hidden=existing;$('retake').textContent=existing?'Back to studio':'Retake';
 if(item.frames){let i=0;playback=setInterval(()=>{$('result').src=item.frames[i++%item.frames.length]},400)}
 $('review').showModal()
}
function capture(){
 if(!image.naturalWidth)return;
 if(mode==='Photo'){show({goal,image:$('picture').toDataURL('image/jpeg',.92)});return}
 if(recording){clearInterval(timer);const duration=Math.max(1,Math.round((Date.now()-started)/1000));recording=false;render();show({goal:'Talking head',image:frames[0],frames,duration});return}
 recording=true;started=Date.now();render();frames=[$('picture').toDataURL('image/jpeg',.72)];timer=setInterval(()=>{let t=(Date.now()-started)/1000;paint(t);frames.push($('picture').toDataURL('image/jpeg',.72));$('status').textContent='REC 00:'+String(Math.floor(t)).padStart(2,'0');if(t>=15)capture()},400)
}
function updateRoll(){$('total').textContent=roll.length+' saved';$('thumbs').replaceChildren();if(!roll.length){let p=document.createElement('p');p.textContent='Your kept shots appear here for this session.';$('thumbs').append(p)}
 for(const item of roll){let b=document.createElement('button'),img=document.createElement('img');img.src=item.image;img.alt='Review '+item.goal;b.append(img);b.onclick=()=>show(item,true);$('thumbs').append(b)}}
$('goal').onchange=e=>{goal=e.target.value;reset()};$('photo').onclick=()=>{mode='Photo';$('goal').value=goal;reset()};$('video').onclick=()=>{mode='Video';reset()};$('coach').onclick=()=>{coaching=!coaching;render()};$('gridbtn').onclick=()=>{grid=!grid;if(recording){$('grid').hidden=!grid;$('gridbtn').setAttribute('aria-pressed',grid)}else render()};$('shutter').onclick=capture;
$('keep').onclick=()=>{roll.unshift(pending);updateRoll();$('review').close()};$('close').onclick=$('retake').onclick=()=>$('review').close();$('review').onclose=()=>clearInterval(playback);
image.onload=()=>render();image.src='portrait.jpg';render();updateRoll();
