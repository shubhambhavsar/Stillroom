// Keep the chosen subject inside the marker during a guided sweep.
export function analyzeView(frame, point) {
  const { width: w, height: h, data } = frame;
  let left = 0,
    right = 0,
    lc = 0,
    rc = 0,
    bright = 0,
    dark = 0,
    n = 0;
  const signature = [];
  const lum = (x, y) => {
    const i = (Math.min(h - 1, y) * w + Math.min(w - 1, x)) * 4;
    return data[i] * 0.21 + data[i + 1] * 0.72 + data[i + 2] * 0.07;
  };
  for (let y = 2; y < h; y += 4)
    for (let x = 2; x < w; x += 4) {
      const v = lum(x, y),
        dx = x / w - point.x,
        dy = y / h - point.y;
      if (Math.abs(dx) < 0.12 && Math.abs(dy) < 0.12) {
        n++;
        bright += v >= 245;
        dark += v <= 12;
      } else if (Math.abs(dy) < 0.35) {
        const edge = Math.abs(lum(x - 2, y) - v) + Math.abs(lum(x, y - 2) - v);
        if (dx < 0) {
          lc++;
          left += edge;
        } else {
          rc++;
          right += edge;
        }
      }
    }
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 8; x++)
      signature.push(
        lum(Math.floor(((x + 0.5) * w) / 8), Math.floor(((y + 0.5) * h) / 6)),
      );
  return {
    left: left / (lc || 1),
    right: right / (rc || 1),
    high: bright / (n || 1),
    low: dark / (n || 1),
    signature,
  };
}
export function proposeAngle(kind, m) {
  if (m.high > 0.16)
    return [
      "Change the reflection angle",
      "Move the phone slightly sideways. Keep the subject in the ring as the glare changes.",
    ];
  if (m.low > 0.3)
    return [
      "Find a brighter side",
      "Circle a little toward available light while keeping the subject in the ring.",
    ];
  if (kind === "Surface")
    return [
      "Try a view from above",
      "Raise the phone and point it down to show the surface pattern.",
    ];
  if (kind === "Layers")
    return [
      "Show the side profile",
      "Lower the phone toward the subject’s height so its layers separate.",
    ];
  if (Math.abs(m.left - m.right) > 3)
    return [
      m.left > m.right
        ? "Try the quieter right side"
        : "Try the quieter left side",
      "Pan toward the quieter background, then reframe your subject in the ring.",
    ];
  return [
    "Explore a small arc",
    "Keep the subject in the ring and move slowly to one side. I’ll remember the strongest view sampled.",
  ];
}
export const quality = (m) =>
  1 - 0.65 * m.high - 0.45 * m.low - 0.009 * (m.left + m.right);
export function distinct(a, b) {
  return a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0) / a.length > 7;
}
export function remember(best, m, snapshot) {
  const value = quality(m);
  if (
    !best ||
    (distinct(best.signature, m.signature) && value > best.value + 0.024)
  )
    return { value, signature: m.signature, src: snapshot() };
  return best;
}
