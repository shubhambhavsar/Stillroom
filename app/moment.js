// Compare consecutive small viewfinder frames, including motion inside the subject.
export class MomentMeter {
  reset() {
    this.previous = null;
    this.since = null;
    this.time = null;
  }
  inspect(frame, point, time, framed) {
    const {width, height, data} = frame;
    const pixels = new Uint8Array(width * height);
    let movement = 0, localMovement = 0, detail = 0, light = 0, clipped = 0, count = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const v = pixels[i] = (data[4*i]*3 + data[4*i+1]*6 + data[4*i+2])/10;
        const delta = this.previous ? Math.abs(v - this.previous[i]) : 255;
        movement += delta;
        if (x && y && Math.abs(x/width-point.x)<.16 && Math.abs(y/height-point.y)<.16) {
          count++;
          localMovement += delta;
          light += v;
          clipped += v < 10 || v > 246;
          detail += Math.abs(v-pixels[i-1]) + Math.abs(v-pixels[i-width]);
        }
      }
    }
    const steady = this.previous && time-this.time < 450 &&
      movement/pixels.length < 5 && localMovement/count < 6;
    this.previous = pixels;
    this.time = time;
    let status = "Hold steady";
    if (!framed) status = "Give the face more room";
    else if (light/count < 32 || light/count > 225 || clipped/count > .28) status = "Try softer, more even light";
    else if (detail/count < 5) status = "Aim at a detail to focus on";
    else if (steady) {
      this.since ??= time;
      return {status:"Hold this frame", progress:Math.min(1,(time-this.since)/950)};
    }
    this.since = null;
    return {status, progress:0};
  }
}
