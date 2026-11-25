import {inFrame} from "./portrait-frame.js";

const tags={
  seated:["candid","masculine","profile"],1181686:["confident","feminine","turn"],
  774909:["playful","feminine","smile"],614810:["confident","masculine","gaze"],
  1036623:["candid","feminine","chin"],2379004:["confident","masculine","fold"],
  1040945:["candid","masculine","collar"],1536619:["playful","feminine","temple"],
  1055691:["candid","feminine","step"],1043474:["confident","masculine","pocket"]
};
export function searchReferences(collection, points, {mood,style,situation,cup=false}) {
  const wrists=[15,16].filter(i=>inFrame(points?.[i])).length;
  const full=[25,26,27,28].every(i=>inFrame(points?.[i]));
  const face=points?.[0],eyes=[points?.[2],points?.[5]];
  const hasEyes=eyes.every(inFrame)&&inFrame(face);
  const turn=hasEyes?Math.abs(face.x-(eyes[0].x+eyes[1].x)/2)/Math.max(.01,Math.abs(eyes[0].x-eyes[1].x)):null;
  const pool=[];
  for(const item of collection){
    const [look,styling,gesture]=tags[item.id]||[item.mood,item.style,item.gesture];
    if(item.kind==="wide"&&!full)continue;
    if(item.kind==="hands"&&wrists<(["fold","collar","seated"].includes(gesture)?2:1))continue;
    if(gesture==="cup"&&!(cup||situation==="cup"))continue;
    if(gesture==="seated"&&situation!=="seated")continue;
    if(gesture==="step"&&situation!=="steps")continue;
    if(gesture==="collar"&&situation!=="jacket")continue;
    if(gesture==="pocket"&&situation!=="pockets")continue;
    let score=(mood===look?5:0)+(style===styling?3:0)+(item.kind==="wide"?2:item.kind==="hands"?1:0);
    if(["cup","seated","step","collar","pocket"].includes(gesture))score+=8;
    if(turn!==null && turn>.28)score+=gesture==="gaze"?3:gesture==="profile"?-4:0;
    if(turn!==null && turn<.12)score+=gesture==="profile"?2:gesture==="gaze"?-2:0;
    pool.push({item,gesture,score});
  }
  pool.sort((a,b)=>b.score-a.score);
  const result=[];
  while(pool.length){
    const used=new Set();
    for(let i=0;i<3&&pool.length;i++){
      let index=pool.findIndex(p=>!used.has(p.gesture));
      const [next]=pool.splice(Math.max(0,index),1);
      result.push(next.item);used.add(next.gesture);
    }
  }
  return result;
}
