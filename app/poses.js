import { references } from "./pose-data.js";
const joints = [0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
const bones = [
  [5, 6],
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10],
  [5, 11],
  [6, 12],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
];
export function rankPoses(live, goal, lightSide = 0, aspect = 0.75) {
  const seen = (i) => live?.[joints[i]]?.visibility > 0.65;
  const width =
    seen(5) && seen(6)
      ? Math.max(0.035, Math.abs(live[11].x - live[12].x) * aspect)
      : 0.25;
  return references
    .map(([id, p]) => {
      const span = Math.max(5, Math.abs(p[5][0] - p[6][0]));
      let error = 0,
        n = 0;
      for (const k of [0, 7, 8, 9, 10, 11, 12, 13, 14]) {
        if (!seen(k) || !seen(5) || !p[k]) continue;
        const v = live[joints[k]],
          base = live[11];
        const dx =
          Math.abs(((v.x - base.x) * aspect) / width) -
          Math.abs((p[k][0] - p[5][0]) / span);
        const dy = (v.y - base.y) / width - (p[k][1] - p[5][1]) / span;
        error += Math.min(4, Math.hypot(dx, dy));
        n++;
      }
      const head = (p[0][0] - (p[5][0] + p[6][0]) / 2) / span;
      const hand = Math.min(p[9][1], p[10][1]) - (p[11][1] + p[12][1]) / 2;
      const style =
        goal === "Profile"
          ? Math.abs(head) * 1.2
          : goal === "Social"
            ? Math.abs(hand + 5) * 0.014
            : Math.abs(hand) * 0.012;
      const score =
        (n ? error / n : 0) +
        style +
        (lightSide && head * lightSide < -0.12 ? 0.35 : 0);
      return { id, p, score, head, hand };
    })
    .sort((a, b) => a.score - b.score || a.id - b.id);
}
export function poseDirection(ref, goal) {
  if (goal === "Profile")
    return Math.abs(ref.head) > 0.16
      ? [
          "Turn your face slightly",
          "Match the head direction in the reference and keep your eyes toward the lens.",
        ]
      : ["Meet the lens", "Bring the camera to eye level and relax your jaw."];
  const { p } = ref;
  const high = p[9][1] < p[10][1] ? 9 : 10;
  if (p[high][1] < p[5][1] + 7)
    return [
      "Bring one hand up",
      "Follow the bent arm in the guide, keeping your fingers relaxed.",
    ];
  if (ref.hand < 5)
    return [
      "Give one arm a bend",
      "Bring one hand near your waist and relax the other shoulder.",
    ];
  return [
    "Let your arms fall naturally",
    "Ease your shoulders and match the slight turn in the guide.",
  ];
}
export function poseSvg(ref, goal) {
  const p = ref.p;
  const visible =
    goal === "Profile"
      ? [0, 5, 6]
      : goal === "Portrait"
        ? [0, 5, 6, 7, 8, 9, 10, 11, 12]
        : p.map((_, i) => i);
  const pts = visible.map((i) => p[i]).filter(Boolean),
    xs = pts.map((v) => v[0]),
    ys = pts.map((v) => v[1]);
  const minX = Math.min(...xs) - 8,
    minY = Math.min(...ys) - 11,
    w = Math.max(...xs) - minX + 8,
    h = Math.max(...ys) - minY + 9;
  const lines = bones
    .filter(([a, b]) => p[a] && p[b])
    .map(
      ([a, b]) => '<path d="M' + p[a].join(" ") + " L" + p[b].join(" ") + '"/>',
    )
    .join("");
  return (
    '<svg aria-hidden="true" viewBox="' +
    [minX, minY, w, h].join(" ") +
    '"><g fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round">' +
    lines +
    '<ellipse cx="' +
    p[0][0] +
    '" cy="' +
    (p[0][1] - 1) +
    '" rx="5" ry="7"/></g></svg>'
  );
}

// Form a continuous human contour from the catalogue's annotated body points.
export function poseOutline(ref, crop) {
  const pts = ref.p;
  const full = crop === "Space";
  const used = pts.slice(0,full?17:13).filter(Boolean);
  const xs = used.map(p=>p[0]), ys = used.map(p=>p[1]);
  const span = Math.max(8,Math.hypot(pts[5][0]-pts[6][0],pts[5][1]-pts[6][1]));
  const pad=span*.65;
  const box=[Math.min(...xs)-pad,Math.min(...ys)-pad,Math.max(...xs)-Math.min(...xs)+2*pad,Math.max(...ys)-Math.min(...ys)+2*pad];
  const body=[5,6,12,11].map(k=>pts[k].join(",")).join(" ");
  const limbs=bones.filter(([a,b])=>pts[a]&&pts[b]&&(full||b<13)).map(([a,b])=>
    '<path d="M'+pts[a].join(" ")+'L'+pts[b].join(" ")+'" stroke-width="'+span*(b>=13?.37:.25)+'"/>').join("");
  const uid="edge-"+ref.id;
  return '<svg aria-hidden="true" viewBox="'+box.join(" ")+'"><defs><filter id="'+uid+'" x="-25%" y="-25%" width="150%" height="150%"><feMorphology in="SourceAlpha" operator="dilate" radius="1.2"/><feComposite in2="SourceAlpha" operator="out" result="rim"/><feFlood flood-color="white"/><feComposite in2="rim" operator="in"/></filter></defs><g fill="white" stroke="white" stroke-linecap="round" filter="url(#'+uid+')"><polygon points="'+body+'"/>'+limbs+'<ellipse cx="'+pts[0][0]+'" cy="'+pts[0][1]+'" rx="'+span*.29+'" ry="'+span*.36+'"/></g></svg>';
}
