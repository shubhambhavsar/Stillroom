import { crop } from "./coach.js";
export function frame(ctx, video, mirror) {
  const { width: w, height: h } = ctx.canvas;
  const r = crop(
    video.videoWidth || video.naturalWidth,
    video.videoHeight || video.naturalHeight,
    w / h,
  );
  ctx.save();
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, w, h);
  ctx.restore();
}
