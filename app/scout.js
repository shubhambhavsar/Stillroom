// Measurements are relative to the subject the photographer selects in each view.
export function measure({ data, width, height }, point) {
  let sum = 0,
    count = 0,
    clipped = 0,
    edges = 0,
    background = 0;
  const luma = (i) =>
    0.213 * data[i] + 0.715 * data[i + 1] + 0.072 * data[i + 2];
  for (let y = 1; y < height; y += 2)
    for (let x = 1; x < width; x += 2) {
      const i = 4 * (y * width + x),
        v = luma(i);
      if (
        Math.abs(x / width - point.x) < 0.12 &&
        Math.abs(y / height - point.y) < 0.12
      ) {
        sum += v;
        count++;
        if (v > 245 || v < 12) clipped++;
      } else {
        background++;
        if (Math.abs(v - luma(i - 4)) + Math.abs(v - luma(i - 4 * width)) > 48)
          edges++;
      }
    }
  return {
    brightness: sum / Math.max(count, 1),
    clipped: clipped / Math.max(count, 1),
    clutter: edges / Math.max(background, 1),
  };
}
export function compare(a, b) {
  const light = a.clipped - b.clipped,
    edges = a.clutter - b.clutter;
  if (Math.abs(light) > 0.09)
    return {
      pick: light > 0 ? 1 : 0,
      reason: "More tonal detail around your subject.",
    };
  if (Math.abs(edges) > 0.035)
    return {
      pick: edges > 0 ? 1 : 0,
      reason: "Fewer distracting edges around the subject.",
    };
  return {
    pick: null,
    reason:
      "Similar light and background detail. Choose the framing you prefer.",
  };
}
export function sceneCue(kind, m) {
  if (m.clipped > 0.18)
    return m.brightness > 150
      ? "Angle away from the brightest reflection."
      : "Try a viewpoint with more light on the subject.";
  return kind === "Detail"
    ? "For a tabletop detail, try a higher angle."
    : "Hold the phone level and compare a second viewpoint.";
}
