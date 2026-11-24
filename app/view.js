import {crop} from './coach.js';
export function frame(ctx,video,mirror){
 const {width:w,height:h}=ctx.canvas;
 const r=crop(video.videoWidth,video.videoHeight,w/h);
 ctx.save();if(mirror){ctx.translate(w,0);ctx.scale(-1,1)}
 ctx.drawImage(video,r.x,r.y,r.w,r.h,0,0,w,h);ctx.restore();
}
export function overlay(ctx,data,cue){
 const {width:w,height:h}=ctx.canvas;ctx.clearRect(0,0,w,h);
 if(!data?.points)return;
 if(data.edge){const edge=new OffscreenCanvas(data.width,data.height);
 edge.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data.edge),data.width,data.height),0,0);
 ctx.drawImage(edge,0,0,w,h)}
 const p=data.points[0],s=data.points[11];ctx.strokeStyle='#ddff9a';ctx.lineWidth=w*.008;ctx.lineCap='round';
 function arrow(x,y,dx,dy,curve=0){
 const cx=x+dx*.5,cy=y+dy*.5+curve,ex=x+dx,ey=y+dy,angle=Math.atan2(ey-cy,ex-cx);
 ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(cx,cy,ex,ey);ctx.stroke();
 ctx.beginPath();for(const sign of [-1,1]){ctx.moveTo(ex,ey);ctx.lineTo(ex-w*.035*Math.cos(angle+sign*.6),ey-w*.035*Math.sin(angle+sign*.6))}ctx.stroke()}
 if(cue==='pose')arrow(s.x*w,s.y*h,(.5-s.x)*w,-h*.025,h*.05);
 if(cue==='left'||cue==='right'){ctx.setLineDash([8,8]);ctx.strokeRect(.38*w,.20*h,.24*w,.33*h);ctx.setLineDash([]);arrow(p.x*w,p.y*h,(.5-p.x)*w,0)}
}
