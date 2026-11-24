export const goals={'Space':[4,3],'Detail':[1,1],'Portrait':[3,4],'Profile':[1,1],'Social':[4,5],'Video':[9,16]};
export function crop(w,h,ratio){
 const sw=Math.min(w,h*ratio),sh=sw/ratio;
 return {x:(w-sw)/2,y:(h-sh)/2,w:sw,h:sh};
}
export const cues={
 search:['Find your subject','Frame one person with their shoulders visible.'],
 left:['Move the phone left','Bring the face into the centre guide.'],
 right:['Move the phone right','Bring the face into the centre guide.'],
 back:['Step back a little','Leave space above the head and around the shoulders.'],
 light:['Turn toward softer light','Turn slowly until the face is better lit.'],
 pose:['Angle one shoulder','Try bringing one shoulder slightly toward the lens.'],
 ready:['Hold this frame','Capture whenever the expression feels right.']
};
export function choose({nose,left,right,backlit,mirrored,skipPose}){
 if(!nose||nose.visibility<.6)return 'search';
 if(nose.y<.16||Math.abs((left?.x??0)-(right?.x??0))>.84)return 'back';
 if(backlit)return 'light';
 if(Math.abs(nose.x-.5)>.16)return ((nose.x<.5)!==mirrored)?'left':'right';
 if(!skipPose&&left?.visibility>.7&&right?.visibility>.7&&Math.abs(left.z-right.z)<.075)return 'pose';
 return 'ready';
}
export function settle(state,next,time){
 if(next!==state.pending){state.pending=next;state.since=time}
 if(next==='search'||time-state.since>=450)state.current=next;
 return state.current;
}
