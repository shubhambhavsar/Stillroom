export function inFrame(point) {
  return point?.visibility > .65 && point.x > .02 && point.x < .98 && point.y > .02 && point.y < .98;
}
export function availablePoses(catalog, points) {
  const hands = [15,16].every(i=>inFrame(points?.[i]));
  const wide = hands && [25,26,27,28].every(i=>inFrame(points?.[i]));
  const groups = wide ? ["wide","hands","head"] : hands ? ["hands","head"] : ["head"];
  return groups.flatMap(kind=>catalog.filter(item=>item.kind===kind));
}
// Mapping the reference nose onto the visible nose keeps the head in place.
// Shoulder separation supplies scale in display pixels; photo aspect is preserved.
export function fitPortrait(item, points, width, height) {
  if (!width || !height || ![0,11,12].every(i=>inFrame(points?.[i]))) return null;
  const [nose,,,,,left,right]=item.points;
  if(!nose||!left||!right)return null;
  const aspect=item.aspect || item.size[0]/item.size[1];
  const refSpan=Math.hypot(left[0]-right[0],(left[1]-right[1])/aspect);
  const span=Math.hypot((points[11].x-points[12].x)*width,(points[11].y-points[12].y)*height);
  if(refSpan<.045 || span<width*.05)return null;
  const w=span/refSpan, h=w/aspect;
  const flip=(points[11].x-points[12].x)*(left[0]-right[0])<0;
  return {w,h,flip,x:points[0].x*width-(flip?1-nose[0]:nose[0])*w,y:points[0].y*height-nose[1]*h};
}
