// Classic worker permits the WASM loader to import its local runtime scripts.
let model, surface, context;
async function initialize() {
  const { FilesetResolver, PoseLandmarker } = await import(
    "../vendor/vision.mjs"
  );
  const root = new URL("../vendor/", self.location.href);
  const renderCanvas = new OffscreenCanvas(2, 2);
  if (!renderCanvas.getContext("webgl2")) throw Error("WebGL2 unavailable");
  model = await PoseLandmarker.createFromOptions(
    await FilesetResolver.forVisionTasks(root + "wasm"),
    {
      canvas: renderCanvas,
      baseOptions: { modelAssetPath: root + "pose.task" },
      runningMode: "VIDEO",
      numPoses: 1,
      outputSegmentationMasks: true,
    },
  );
  surface = new OffscreenCanvas(1, 1);
  context = surface.getContext("2d", { willReadFrequently: true });
}
onmessage = async ({ data }) => {
  const bitmap = data.bitmap;
  try {
    if (!bitmap) {
      await initialize();
      postMessage({ ready: true });
      return;
    }
    surface.width = bitmap.width;
    surface.height = bitmap.height;
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(
      0,
      0,
      surface.width,
      surface.height,
    ).data;
    model.detectForVideo(surface, data.time, (result) => {
      const points = result.landmarks[0],
        mask = result.segmentationMasks?.[0];
      if (!points || !mask) {
        postMessage({ points: null });
        return;
      }
      const m = mask.getAsFloat32Array(),
        w = mask.width,
        h = mask.height;
      let face = 0,
        fc = 0,
        bg = 0,
        bc = 0;
      const nose = points[0];
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x,
            inside = m[i] > 0.55;

          if (x % 3 || y % 3) continue;
          const j =
            4 *
            (Math.floor((y / h) * surface.height) * surface.width +
              Math.floor((x / w) * surface.width));
          const lum =
            pixels[j] * 0.213 + pixels[j + 1] * 0.715 + pixels[j + 2] * 0.072;
          if (!inside) {
            bg += lum;
            bc++;
          } else if (
            Math.abs(x / w - nose.x) < 0.065 &&
            Math.abs(y / h - nose.y) < 0.055
          ) {
            face += lum;
            fc++;
          }
        }
      postMessage({
        points,
        backlit: fc > 4 && bc > 10 && bg / bc - face / fc > 52,
      });
    });
  } catch (e) {
    postMessage({ error: String(e.message || e) });
  } finally {
    bitmap?.close();
  }
};
