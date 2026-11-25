import {portraits} from "./portrait-catalog.js";
import {searchReferences} from "./reference-search.js";
import {inFrame, fitPortrait} from "./portrait-frame.js";
const $ = id => document.getElementById(id);
const storageKey = "stillroom.personal-poses.v1";
const jointIds = [0,2,5,7,8,11,12,13,14,15,16,23,24,25,26,27,28];
let detector;
async function imageDetector() {
  const {FilesetResolver,PoseLandmarker} = await import("../vendor/vision.mjs");
  return PoseLandmarker.createFromOptions(await FilesetResolver.forVisionTasks("./vendor/wasm"), {
    baseOptions:{modelAssetPath:"./vendor/pose.task"},runningMode:"IMAGE",numPoses:1,outputSegmentationMasks:true
  });
}
async function extractPhoto(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1,480/Math.max(bitmap.width,bitmap.height));
  canvas.width = Math.max(1,Math.round(bitmap.width*scale));
  canvas.height = Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);
  bitmap.close();
  detector ??= imageDetector().catch(error => {detector=null; throw error;});
  const result = (await detector).detect(canvas);
  try {
    const points = result.landmarks[0];
    const mask = result.segmentationMasks?.[0];
    if (!mask || !points || [0,11,12].some(i=>points[i].visibility<.5)) throw Error("Choose a portrait with one clear face and both shoulders visible.");
    const outline = document.createElement("canvas");
    const w = outline.width = mask.width, h = outline.height = mask.height;
    const ctx = outline.getContext("2d"), image = ctx.createImageData(w,h);
    const values = mask.getAsFloat32Array();
    for(let y=2;y<h-2;y++) for(let x=2;x<w-2;x++){
      const i=y*w+x;
      if(values[i]>.5 && [i-2,i+2,i-2*w,i+2*w].some(k=>values[k]<=.5)) image.data.fill(255,4*i,4*i+4);
    }
    ctx.putImageData(image,0,0);
    return {id:crypto.randomUUID(),thumb:canvas.toDataURL("image/jpeg",.7),outline:outline.toDataURL(),aspect:canvas.width/canvas.height,
      points:jointIds.map(i=>points[i].visibility>.55?[points[i].x,points[i].y]:null)};
  } finally {result.close();}
}
export function installPosePicker(context, reset) {
  let tab="recommended", offset=0, ranked=[], selected=null, managing=false, imported=[], generation=0;
  const deleted=new Set();
  try {imported=JSON.parse(localStorage.getItem(storageKey)||"[]");} catch {}
  function persist(list) {localStorage.setItem(storageKey,JSON.stringify(list));imported=list;}
  function status(text){$("poseStatus").textContent=text;}
  function clear(){
    generation++;
    selected=null;
    $("pickedGuide").replaceChildren();
    $("poseCaption").hidden=true;
    $("poseTray").hidden=true;
    $("poseOpen").setAttribute("aria-expanded","false");
    reset();
  }
  function pick(item) {
    generation++;
    selected=item;
    const layer=$("pickedGuide");
    layer.replaceChildren();
    if(item.path){
      const ns="http://www.w3.org/2000/svg";
      const svg=document.createElementNS(ns,"svg"), path=document.createElementNS(ns,"path");
      svg.setAttribute("viewBox","0 0 "+item.size.join(" "));
      path.setAttribute("d",item.path);
      path.setAttribute("fill","none"); path.setAttribute("stroke","white");
      path.setAttribute("stroke-width","2"); path.setAttribute("vector-effect","non-scaling-stroke");
      path.setAttribute("stroke-linejoin","round");
      svg.append(path);layer.append(svg);
    } else {
      const img=new Image();img.src=item.outline;img.alt="";layer.append(img);
    }
    $("poseCaption").hidden=false;
    $("poseThumbnail").src=item.thumb;
    $("poseInstruction").textContent=item.cue || "Use the photo to match the angle of your shoulders.";
    align();
    $("poseTray").hidden=true;
    $("poseOpen").setAttribute("aria-expanded","false");
    reset();
  }
  function align(){
    if(!selected)return;
    const layer=$("pickedGuide"), el=layer.firstElementChild;
    const box=fitPortrait(selected,context().points,layer.clientWidth,layer.clientHeight);
    el.style.visibility=box?"visible":"hidden";
    if(!box)return;
    Object.assign(el.style,{width:box.w+"px",height:box.h+"px",left:box.x+"px",top:box.y+"px",transform:box.flip?"scaleX(-1)":"none"});
  }
  let collection=portraits, pendingIndex, worker, heldCup=false, sceneId=0, snapshotPoints;
  function refresh(){
    ranked=searchReferences(collection,snapshotPoints,{
      mood:$("poseMood").value, style:$("poseStyle").value,
      situation:$("poseSituation").value,cup:heldCup && !$("poseSituation").value
    });
  }
  function updateFirstPage(){
    if(tab!=="recommended" || $("poseTray").hidden || offset!==0)return;
    refresh();render();
  }
  function loadIndex(){
    pendingIndex ??= fetch("./app/reference-index.json").then(r=>{
      if(!r.ok)throw Error();return r.json();
    }).then(items=>{collection=[...portraits,...items];updateFirstPage();}).catch(()=>{pendingIndex=null;});
  }
  async function readScene(){
    const id=++sceneId;
    snapshotPoints=context().points;
    heldCup=false;
    const wrists=[15,16].map(i=>snapshotPoints?.[i]).filter(inFrame);
    if(!wrists.length)return;
    try{
      worker ??= new Worker(new URL("./scene-object.js",import.meta.url));
      worker.onmessage=({data})=>{
        if(data.id!==sceneId || !data.held)return;
        heldCup=true;updateFirstPage();
      };
      const frame=await createImageBitmap($("photo"),{resizeWidth:320,resizeQuality:"low"});
      if(id!==sceneId){frame.close();return;}
      worker.postMessage({id,frame,wrists},[frame]);
    }catch{/* Crop and user-selected context remain available. */}
  }
  for(const id of ["poseMood","poseStyle","poseSituation"]){
    $(id).onchange=()=>{offset=0;refresh();render();};
  }
  function render(){
    const mine=tab==="mine";
    $("searchPrefs").hidden=mine;
    $("recTab").setAttribute("aria-pressed",String(!mine));
    $("mineTab").setAttribute("aria-pressed",String(mine));
    $("morePoses").hidden=mine||ranked.length<=3;
    $("importPose").hidden=!mine||managing;
    $("managePoses").hidden=!mine||!imported.length;
    $("managePoses").textContent=managing?"Cancel selection":"Select";
    $("deletePoses").hidden=!managing;
    $("deletePoses").disabled=!deleted.size;
    const list=mine?imported:ranked.slice(offset,offset+3);
    const cards=$("poseCards");cards.replaceChildren();
    for(const [i,item] of list.entries()){
      const b=document.createElement("button");
      if(item.thumb){const img=new Image();img.alt="";img.src=item.thumb;b.append(img);}

      const label=document.createElement("span");
      label.textContent=item.label || "My pose "+(i+1);
      b.append(label);
      b.setAttribute("aria-pressed",String(managing?deleted.has(item.id):selected?.id===item.id));
      b.onclick=()=>{if(!managing)return pick(item);if(deleted.has(item.id))deleted.delete(item.id);else deleted.add(item.id);render();};
      cards.append(b);
    }
    status(mine&&!imported.length?"Add a portrait to reuse its outline.":"");
  }
  function open(){
    generation++;
    readScene();loadIndex();refresh();offset=0;managing=false;deleted.clear();
    $("poseTray").hidden=false;$("poseOpen").setAttribute("aria-expanded","true");reset();render();
  }
  $("poseOpen").onclick=()=>{if($("poseTray").hidden)open();else $("closeTray").click();};
  $("closeTray").onclick=()=>{generation++;reset();$("poseTray").hidden=true;$("poseOpen").setAttribute("aria-expanded","false");};
  let startY;
  const deck=document.querySelector(".deck");
  deck.addEventListener("touchstart",e=>{startY=e.touches[0].clientY;},{passive:true});
  deck.addEventListener("touchend",e=>{if(startY-e.changedTouches[0].clientY>40&&!$("poseOpen").hidden)open();},{passive:true});
  $("clearPicked").onclick=clear;
  $("recTab").onclick=()=>{generation++;tab="recommended";managing=false;deleted.clear();refresh();offset=0;render();};
  $("mineTab").onclick=()=>{generation++;tab="mine";render();};
  $("morePoses").onclick=()=>{offset=offset+3>=ranked.length?0:offset+3;render();};
  $("managePoses").onclick=()=>{managing=!managing;deleted.clear();render();};
  $("deletePoses").onclick=()=>{try{persist(imported.filter(r=>!deleted.has(r.id)));if(deleted.has(selected?.id)){clear();open();}managing=false;deleted.clear();render();}catch{status("Could not update this browser’s saved poses.");}};
  $("importPose").onclick=()=>$("poseFile").click();
  $("poseFile").onchange=async e=>{
    const file=e.target.files[0];e.target.value="";if(!file)return;
    const current=generation;
    $("importPose").disabled=true;status("Finding the person’s outline…");
    try{
      const item=await extractPhoto(file);
      if(current!==generation)return;
      persist([...imported,item]);render();status("Pose added. Tap the photo to use its outline.");
    }catch(error){status(error.name==="QuotaExceededError"?"Storage is full. Delete a saved pose and try again.":error.message||"Could not analyse this picture.");}
    finally{$("importPose").disabled=false;}
  };
  return {clear, align, get active(){return !!selected;},get open(){return !$("poseTray").hidden;}};
}
