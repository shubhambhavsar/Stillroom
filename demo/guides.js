// Authored in the demo photograph's coordinate system. Capture and coaching use separate canvases.
const portraitContour=new Path2D('M178 321 Q149 294 151 240 Q151 205 170 161 Q173 147 185 140 L205 125 Q177 127 182 102 Q180 87 187 77 Q190 44 211 38 Q231 28 252 42 Q271 47 277 68 Q288 85 276 98 Q289 111 264 114 L252 119 L252 130 Q270 139 281 161 L299 235 L313 301 L309 322 Z');
function drawGuide(canvas,photo,rect,step,shoulder,mode){
 const {width,height}=photo;
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
 const g=canvas.getContext('2d');
 g.clearRect(0,0,width,height);
 if(step===4)return;
 g.save();g.translate(rect.x,rect.y);g.scale(rect.width/480,rect.height/320);
 g.lineJoin='round';g.lineCap='round';g.shadowColor='#132317';g.shadowBlur=3;
 g.strokeStyle='#f6ffef';g.lineWidth=1.35;g.stroke(portraitContour);
 const lime='#d9ff83';g.strokeStyle=lime;g.fillStyle=lime;
 function arrow(x,y,cx,cy,ex,ey){
  g.lineWidth=2.8;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(cx,cy,ex,ey);g.stroke();
  const angle=Math.atan2(ey-cy,ex-cx);g.save();g.translate(ex,ey);g.rotate(angle);
  g.beginPath();g.moveTo(0,0);g.lineTo(-8,-4);g.lineTo(-8,4);g.closePath();g.fill();g.restore();
 }
 function anchor(x,y){g.beginPath();g.arc(x,y,4,0,2*Math.PI);g.fill();g.strokeStyle='#263322';g.lineWidth=1;g.stroke();g.strokeStyle=lime}
 if(step===0){anchor(240,85);arrow(251,83,267,80,275,75)}
 if(step===1){
  const offset=(rect.width-width)*.04*480/rect.width;
  g.save();g.translate(-offset,0);g.setLineDash([4,3]);g.lineWidth=2;g.stroke(portraitContour);g.restore();
  arrow(218,142,218-offset/2,134,218-offset,142)
 }
 if(step===2){
  g.restore();g.save();g.strokeStyle=lime;g.fillStyle=lime;g.shadowColor='#19271c';g.shadowBlur=4;
  g.translate(width*.5,height*.65);const size=width*.09;g.scale(size/40,size/40);g.lineWidth=2.8;
  g.strokeRect(-10,-15,20,30);
  if(mode==='Video'){g.beginPath();g.moveTo(-36,0);g.lineTo(-14,0);g.moveTo(14,0);g.lineTo(36,0);g.stroke()}
  else{arrow(15,-8,23,-13,32,-22);arrow(-15,8,-23,13,-32,22)}
 }
 if(step===3){if(shoulder){anchor(189,147);arrow(190,152,222,171,252,143)}
 else if(mode==='Video'){anchor(235,84);g.beginPath();g.arc(235,84,13,0,2*Math.PI);g.stroke()}
 else{anchor(245,105);arrow(252,105,264,104,271,100)}}
 g.restore()
}
