// Original, fixed pose templates. Coordinates are independent of detected landmarks.
const poses = [
  {
    name: "Three-quarter",
    tip: "Turn one shoulder toward the lens and let your near arm rest.",
    head: [51, 22, -9],
    body: "M44 32 Q37 34 33 42 L28 64 Q29 67 32 65 L40 49 L39 69 Q49 76 60 69 L61 48 L67 60 Q71 64 72 58 L64 39 Q61 33 56 32 M39 69 L36 95 M60 69 L65 95",
  },
  {
    name: "Hand at waist",
    tip: "Rest one hand at your waist and angle your elbow out.",
    head: [49, 22, 6],
    body: "M43 32 Q37 33 33 42 L22 54 Q20 57 24 60 L39 68 L42 63 L30 55 L40 45 L39 69 Q50 74 61 69 L61 46 L67 70 L72 69 L66 40 Q62 34 55 32 M39 69 L37 95 M61 69 L65 95",
  },
  {
    name: "Look back",
    tip: "Turn your body slightly away and look back over your shoulder.",
    head: [54, 23, 15],
    body: "M48 32 Q41 34 37 42 L31 62 L35 65 L43 49 L40 70 Q49 74 58 70 L60 46 L65 61 L69 59 L63 38 Q60 33 56 33 M40 70 L36 95 M58 70 L61 95",
  },
];
export const poseList = poses;
export function poseSvg(index) {
  const {
    head: [x, y, angle],
    body,
  } = poses[index];
  return (
    '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.4"><ellipse cx="' +
    x +
    '" cy="' +
    y +
    '" rx="7" ry="10" transform="rotate(' +
    angle +
    " " +
    x +
    " " +
    y +
    ')"/><path d="' +
    body +
    '"/></g></svg>'
  );
}
