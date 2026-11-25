// Run once per requested scene in a worker, away from shutter and preview rendering.
let model;
onmessage=async({data:{frame,wrists,id}})=>{
  try{
    if(!model){
      const {ObjectDetector,FilesetResolver}=await import("../vendor/vision.mjs");
      model=await ObjectDetector.createFromOptions(await FilesetResolver.forVisionTasks("../vendor/wasm"),{
        canvas:new OffscreenCanvas(2,2),baseOptions:{modelAssetPath:"../vendor/scene.tflite"},runningMode:"IMAGE",scoreThreshold:.4,categoryAllowlist:["cup"]
      });
    }
    const {detections}=model.detect(frame);
    const held=detections.some(({boundingBox:b})=>b&&wrists.some(p=>{
      const x=p.x*frame.width,y=p.y*frame.height;
      return x>b.originX-.07*frame.width&&x<b.originX+b.width+.07*frame.width&&y>b.originY-.07*frame.height&&y<b.originY+b.height+.07*frame.height;
    }));
    postMessage({id,held});
  }catch{postMessage({id,held:false});}
  finally{frame.close();}
};
