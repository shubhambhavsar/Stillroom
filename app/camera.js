import { goals, cues, choose, settle, crop } from "./coach.js";
import { measure, compare, sceneCue } from "./scout.js";
import { analyzeView, proposeAngle, remember, quality } from "./director.js";
import { AutoAssist } from "./settings.js";
import { rankPoses, poseDirection, poseSvg } from "./poses.js";
import { frame } from "./view.js";
const $ = (id) => document.getElementById(id),
  video = $("source"),
  picture = $("photo");
const ctx = picture.getContext("2d"),
  sample = document.createElement("canvas");
const sampleCtx = sample.getContext("2d");
let session = 0,
  stream,
  worker,
  busy = false,
  face = "environment",
  mirrored = false,
  raf,
  last = 0,
  tracking,
  skipPose = false,
  recorder,
  clipStream,
  timeout,
  url,
  ready = false,
  opening = false,
  exposureBase = null;
let stable = { current: "search" };
function goal() {
  return $("goal").value;
}
function size() {
  const [w, h] = goals[goal()];
  picture.height = 720;
  picture.width = Math.round((720 * w) / h);
  sample.height = 320;
  sample.width = Math.round((320 * w) / h);
  $("frame").style.aspectRatio = w + "/" + h;
  $("frame").style.setProperty("--ratio", w / h);
}
function controls() {
  const live = !!stream || !!sampleImage,
    recording = recorder?.state === "recording";
  $("flip").disabled = !stream || recording;
  $("stop").disabled = !live && !opening;
  $("goal").disabled = !!recording || opening;
  $("capture").disabled =
    !live ||
    !ready ||
    (goal() === "Video" && (!window.MediaRecorder || !picture.captureStream));
  $("capture").className = recording
    ? "record movie"
    : goal() === "Video"
      ? "movie"
      : "";
  $("capture").ariaLabel =
    goal() === "Video"
      ? recording
        ? "Stop recording"
        : "Record video"
      : "Take photo";
  $("badge").textContent = recording
    ? "RECORDING"
    : sampleImage
      ? "SAMPLE VIEW"
      : live
        ? "LIVE CAMERA"
        : "CAMERA OFF";
  $("start").disabled = opening;
}
let sampleImage = null,
  sampleIndex = 0,
  sampleVersion = 0,
  selectedPose = 0,
  subject = null,
  metrics = null,
  views = [],
  chosen = null;
let rankings = rankPoses(null, "Portrait"),
  reference = rankings[0],
  pendingPose = null,
  pendingSince = 0,
  lastPose = null,
  manuallySelected = false;
let director = null,
  bestView = null,
  showBest = false,
  assist = null,
  assistPromise = null;
function updateReference(points, light, time) {
  rankings = rankPoses(points, goal(), light, picture.width / picture.height);
  if (manuallySelected) return;
  const next = rankings[0];
  if (!lastPose || (pendingPose === next.id && time - pendingSince > 1600)) {
    if (reference.id !== next.id || !lastPose) {
      reference = next;
      renderReference();
    }
    lastPose = next.id;
  } else if (pendingPose !== next.id) {
    pendingPose = next.id;
    pendingSince = time;
  }
}
function renderReference() {
  $("poseGuide").innerHTML = poseSvg(reference, goal());
}
function updateAssist(signal) {
  const service = assist;
  if (!service || assistPromise || !$("assist").checked || !$("coach").checked)
    return;
  assistPromise = service
    .sample(signal)
    .then(async (message) => {
      if (service !== assist) return;
      if (!$("assist").checked || !$("coach").checked) {
        await service.restore();
        return;
      }
      if (message) $("hardware").textContent = message;
    })
    .catch(() => {})
    .finally(() => {
      assistPromise = null;
    });
}
async function disableAssist() {
  const service = assist;
  if (!service) return;
  await assistPromise;
  try {
    await service.restore();
    if (assist === service)
      $("hardware").textContent = "Using camera defaults.";
  } catch {
    if (assist === service)
      $("hardware").textContent = "End the session to reset camera controls.";
  }
}
$("assist").onchange = () => {
  if (!$("assist").checked) disableAssist();
  else if (stream) assist = new AutoAssist(stream.getVideoTracks()[0]);
};
const isPlace = () => ["Space", "Detail"].includes(goal());
const active = () => !!stream || !!sampleImage;
let pending = "", since = 0, offered = "", alternative = false;
const dismissed = new Set();
let lastMetrics = 0;
function resetGuidance() {
  pending = offered = "";
  alternative = false;
  dismissed.clear();
}
function cue() {
  const on = active() && ready && $("coach").checked;
  const nose = !subject && tracking?.points?.[0];
  const person = nose && nose.visibility > 0.65;
  const upperBody = person && tracking.points[11]?.visibility > .65 && tracking.points[12]?.visibility > .65;
  const closeCrop = upperBody && (tracking.points[23].y > .9 || tracking.points[23].visibility < .6);
  const referencePath = closeCrop ? "images/seated-window.jpg" : "demo/portrait.jpg";
  if ($("referencePhoto").getAttribute("src") !== referencePath) $("referencePhoto").src = referencePath;
  let next = "";
  if (person && (nose.x < .13 || nose.x > .87)) {
    const left = (nose.x < .5) !== mirrored;
    next = "Aim a little " + (left ? "left" : "right") + " to include the face.";
  } else if (person && nose.y < .12) next = "Aim a little higher to leave room above the face.";
  else if (person && tracking.backlit) next = "Turn slightly toward the light to brighten the face.";
  else if (!person && director?.high > .2) next = "Shift sideways a little to reduce the bright patch.";
  else if (alternative) next = person ? (closeCrop ? "Keep your shoulders relaxed and look just past the phone." : "Lift your chin slightly and look past the lens.") : "Step back to include more of the surroundings.";
  if (next !== pending) { pending = next; since = performance.now(); }
  offered = on && !dismissed.has(next) && (alternative || performance.now()-since >= 950) ? next : "";
  $("inframe").textContent = offered;
  $("dismiss").hidden = $("inframe").hidden = !offered;
  $("target").hidden = !on || !subject;
  $("creative").hidden = !on || !!next || alternative || (person && !upperBody);
  $("creative").textContent = person ? "Try a portrait variation" : "Include the surroundings";
  $("referencePhoto").hidden = !on || !alternative || !person;
  const earlier = director && bestView && quality(director) < bestView.value-.06;
  $("previous").hidden = !on || !(earlier || showBest);
  if (earlier) $("previous").firstElementChild.src = bestView.src;
  $("ghost").hidden = !showBest || !on;
  $("sampleNext").hidden = !sampleImage;
  $("scout").hidden = !sampleImage;
}
$("dismiss").onclick = () => { dismissed.add(offered); cue(); };
$("creative").onclick = () => { alternative = true; cue(); };
$("previous").onclick = () => $("best").click();
function clearAngles() {
  resetGuidance();
  subject = null;
  metrics = null;
  views = [];
  chosen = null;
  director = null;
  bestView = null;
  showBest = false;
  $("choices").replaceChildren();
  $("ghost").removeAttribute("src");
  cue();
}
$("best").onclick = () => {
  showBest = !showBest;
  chosen = null;
  if (showBest && bestView) $("ghost").src = bestView.src;
  cue();
};
$("intent").onchange = () => {
  bestView = null;
  showBest = false;
  metrics = readMetrics();
  cue();
};
function pickView(index) {
  showBest = false;
  chosen = index;
  $("ghost").src = views[index].src;
  [...$("choices").children].forEach((el, i) =>
    el.setAttribute("aria-pressed", i === index),
  );
  $("message").textContent =
    "Use the faint reference to return to this framing.";
  cue();
}
function readMetrics() {
  if (!ready) return null;
  sampleCtx.drawImage(picture, 0, 0, sample.width, sample.height);
  const pixels = sampleCtx.getImageData(0, 0, sample.width, sample.height);
  director = analyzeView(pixels, subject || {x:.5,y:.5});
  if (!showBest)
    bestView = remember(bestView, director, () =>
      sample.toDataURL("image/jpeg", 0.8),
    );
  return measure(pixels, subject || {x:.5,y:.5});
}
$("angle").onclick = () => {
  if (views.length >= 2 || !subject) return;
  const measured = readMetrics();
  if (!measured) return;
  views.push({ metrics: measured, src: sample.toDataURL("image/jpeg", 0.82) });
  if (views.length === 1) {
    subject = null;
    metrics = null;
    $("message").textContent =
      "Move the phone, then tap the same subject again.";
  } else {
    views.forEach(({ src }, i) => {
      const b = document.createElement("button"),
        im = new Image();
      im.src = src;
      im.alt = "";
      b.append(im, "Angle " + "AB"[i]);
      b.onclick = () => pickView(i);
      $("choices").append(b);
    });
    $("message").textContent = "Choose a thumbnail to overlay its framing.";
  }
  cue();
};
function setSubject(x, y) {
  const alreadyDismissed = [...dismissed];
  clearAngles();
  alreadyDismissed.forEach(key => dismissed.add(key));
  subject = { x, y };
  $("target").style.left = x * 100 + "%";
  $("target").style.top = y * 100 + "%";
  metrics = readMetrics();
  cue();
}
picture.tabIndex = 0;
picture.setAttribute(
  "aria-label",
  "Viewfinder. Tap a subject or press Enter to select the centre.",
);
picture.onclick = (e) => {
  if (active()) {
    const r = picture.getBoundingClientRect();
    setSubject((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  }
};
picture.onkeydown = (e) => {
  if (e.key === "Enter" && active()) setSubject(0.5, 0.5);
};
$("clearAngles").onclick = () => {
  clearAngles();
  $("message").textContent = "";
};
$("nextPose").onclick = () => {
  const top = rankings.slice(0, 12);
  selectedPose =
    (Math.max(
      -1,
      top.findIndex((p) => p.id === reference.id),
    ) +
      1) %
    top.length;
  reference = top[selectedPose];
  manuallySelected = true;
  skipPose = false;
  renderReference();
  cue();
};
async function practice() {
  const version = ++sampleVersion,
    token = session,
    im = new Image();
  im.src = isPlace()
    ? "images/cafe-" + sampleIndex + ".jpg"
    : "demo/portrait.jpg";
  try {
    await im.decode();
  } catch {
    if (version === sampleVersion)
      $("message").textContent = "Sample could not load. Try the camera.";
    return;
  }
  if (token !== session || version !== sampleVersion || stream) return;
  sampleImage = im;
  ready = true;
  frame(ctx, im, false);
  $("intro").hidden = true;
  $("health").textContent = "Practice session with a sample photograph.";
  metrics = readMetrics();
  controls();
  cue();
  setTimeout(cue, 1000);
}
$("practice").onclick = () => {
  stop();
  practice();
};
$("sampleNext").onclick = () => {
  sampleIndex = 1 - sampleIndex;
  subject = null;
  metrics = null;
  practice();
};
function clearWorker() {
  worker?.terminate();
  worker = null;
  tracking = null;
  busy = false;
  stable = { current: "search" };
  cue();
}
function track() {
  clearWorker();
  if (!stream || !$("coach").checked) return;
  let local;
  function failed() {
    if (worker !== local) return;
    clearWorker();
    $("health").textContent =
      "Tracking unavailable. You can still capture or try the walkthrough.";
  }
  try {
    local = new Worker(new URL("./tracker.js", import.meta.url));
    worker = local;
    $("health").textContent = "Loading on-device coach…";
    local.onerror = failed;
    local.onmessage = ({ data }) => {
      if (worker !== local) return;
      if (data.error) {
        failed();
        return;
      }
      if (data.ready) {
        busy = false;
        $("health").textContent = "On-device coaching active";
        return;
      }
      busy = false;
      tracking = data;
      if (data.points && !subject) {
        updateAssist({
          low: data.backlit ? 0.36 : 0,
          moving: data.moving,
          video: goal() === "Video",
        });
      }
      settle(
        stable,
        choose({
          nose: data.points?.[0],
          left: data.points?.[11],
          right: data.points?.[12],
          backlit: data.backlit,
          mirrored,
          skipPose,
        }),
        performance.now(),
      );
      cue();
    };
    busy = true;
    local.postMessage({ init: true });
  } catch {
    failed();
  }
}
async function analyze(time) {
  const target = worker;
  busy = true;
  last = time;
  try {
    sampleCtx.drawImage(picture, 0, 0, sample.width, sample.height);
    const bitmap = await createImageBitmap(sample);
    if (target !== worker) {
      bitmap.close();
      return;
    }
    target.postMessage({ bitmap, time }, [bitmap]);
  } catch {
    if (target === worker) {
      clearWorker();
      $("health").textContent =
        "Coaching unavailable on this browser. Camera capture is available.";
    }
  }
}
function draw(time) {
  if (!stream) return;
  if (video.readyState >= 2 && video.videoWidth) {
    frame(ctx, video, mirrored);
    if (!ready) {
      ready = true;
      controls();
    }
    if (worker && !busy && time - last >= 150) analyze(time);
    if ($("coach").checked && time - lastMetrics >= 500) {
      lastMetrics = time;
      metrics = readMetrics();
      if (director && (subject || !tracking?.points)) updateAssist(director);
      cue();
    }
  }
  raf = requestAnimationFrame(draw);
}
function stop() {
  session++;
  assist = null;
  lastPose = null;
  manuallySelected = false;
  $("hardware").textContent = "";
  sampleVersion++;
  sampleImage = null;
  clearAngles();
  opening = false;
  clearTimeout(timeout);
  if (recorder?.state === "recording") recorder.stop();
  cancelAnimationFrame(raf);
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  ready = false;
  video.srcObject = null;
  clearWorker();
  ctx.clearRect(0, 0, picture.width, picture.height);
  $("intro").hidden = false;
  $("health").textContent = "Camera is off.";
  exposureBase = null;
  cue();
  controls();
}
async function start() {
  stop();
  const token = session;
  opening = true;
  $("message").textContent = "";
  controls();
  try {
    if (!navigator.mediaDevices?.getUserMedia)
      throw Error("Open this app over HTTPS in Safari or Chrome.");
    const input = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: face },
        width: { ideal: 3840 },
        height: { ideal: 2160 },
      },
    });
    if (token !== session) {
      input.getTracks().forEach((t) => t.stop());
      return;
    }
    stream = input;
    const t = input.getVideoTracks()[0];
    assist = new AutoAssist(t);
    $("hardware").textContent =
      "Camera auto exposure · watching available controls.";
    mirrored = (t.getSettings().facingMode || face) === "user";
    t.onended = () => {
      if (token === session) {
        stop();
        $("message").textContent =
          "Camera disconnected. Start again to reconnect.";
      }
    };
    video.srcObject = input;
    await video.play();
    if (token !== session) return;
    $("intro").hidden = true;
    opening = false;
    skipPose = false;
    controls();
    track();
    draw(performance.now());
  } catch (e) {
    if (token !== session) return;
    stop();
    $("message").textContent =
      e.name === "NotAllowedError"
        ? "Camera access was declined. Allow camera access in your browser and tap Start camera again."
        : e.name === "NotFoundError"
          ? "No camera found. Connect a camera or try the walkthrough."
          : e.message;
  }
}
function review(blob, isVideo) {
  $("tryAlternative").hidden = isVideo || !!pending;
  if (url) URL.revokeObjectURL(url);
  url = URL.createObjectURL(blob);
  if (isVideo) $("dimensions").textContent = "Silent clip";
  const el = $(isVideo ? "clip" : "still");
  $("clip").hidden = !isVideo;
  $("still").hidden = isVideo;
  el.src = url;
  $("save").href = url;
  $("save").download =
    "stillroom." +
    (isVideo ? (blob.type.includes("mp4") ? "mp4" : "webm") : "jpg");
  $("review").showModal();
}
function capture() {
  resetGuidance();
  if (!ready) return;
  const token = session;
  if (goal() !== "Video") {
    const source = sampleImage || video;
    const r = crop(
      source.naturalWidth || source.videoWidth,
      source.naturalHeight || source.videoHeight,
      picture.width / picture.height,
    );
    const full = document.createElement("canvas");
    full.width = Math.max(1, Math.round(r.w));
    full.height = Math.max(1, Math.round(r.h));
    frame(full.getContext("2d"), source, !!stream && mirrored);
    $("dimensions").textContent = full.width + " × " + full.height + " px";
    full.toBlob(
      (b) => {
        if (b && token === session && !$("review").open) review(b, false);
      },
      "image/jpeg",
      0.94,
    );
    return;
  }
  if (sampleImage) {
    $("message").textContent = "Start a live camera session to record video.";
    return;
  }
  if (recorder?.state === "recording") {
    recorder.stop();
    return;
  }
  try {
    clipStream = picture.captureStream(24);
    const output = clipStream;
    const rec = new MediaRecorder(output);
    recorder = rec;
    const chunks = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      clearTimeout(timeout);
      output.getTracks().forEach((t) => t.stop());
      recorder = null;
      controls();
      if (token === session && chunks.length)
        review(
          new Blob(chunks, { type: rec.mimeType || chunks[0].type }),
          true,
        );
    };
    rec.start();
    timeout = setTimeout(() => {
      if (rec.state === "recording") rec.stop();
    }, 15000);
    controls();
  } catch {
    clipStream?.getTracks().forEach((t) => t.stop());
    $("message").textContent =
      "Video recording is unavailable in this browser. Choose a photo goal.";
  }
}
$("start").onclick = start;
$("flip").onclick = () => {
  face = mirrored ? "environment" : "user";
  start();
};
$("stop").onclick = stop;
$("capture").onclick = capture;
$("goal").onchange = () => {
  skipPose = false;
  manuallySelected = false;
  lastPose = null;
  pendingPose = null;
  rankings = rankPoses(null, goal());
  reference = rankings[0];
  renderReference();
  clearAngles();
  size();
  if (sampleImage) practice();
  track();
  controls();
  $("message").textContent =
    goal() === "Video" ? "Silent video · up to 15 seconds." : "";
};
$("pose").onclick = () => {
  skipPose = !skipPose;
  cue();
};
$("coach").onchange = () => {
  track();
  if (!$("coach").checked) {
    disableAssist();
    $("health").textContent = "Visual coaching paused.";
  }
};
$("expose").onclick = async () => {
  const t = stream?.getVideoTracks()[0];
  if (!t) return;
  const token = session,
    c = t.getCapabilities().exposureCompensation,
    base = t.getSettings().exposureCompensation;
  if (!Number.isFinite(base)) return;
  const reset = exposureBase !== null,
    dir = Number($("expose").dataset.direction);
  const steps = Math.max(1, Math.round(0.33 / (c.step || 0.33)));
  const target = reset
    ? exposureBase
    : Math.min(c.max, Math.max(c.min, base + dir * steps * (c.step || 0.33)));
  try {
    await t.applyConstraints({ advanced: [{ exposureCompensation: target }] });
    if (token !== session) return;
    const value = t.getSettings().exposureCompensation;
    if (Math.abs(value - target) < 0.06 && value !== base) {
      exposureBase = reset ? null : base;
      $("message").textContent = reset
        ? "Original exposure restored."
        : "Exposure adjusted.";
    } else $("message").textContent = "Camera retained its current exposure.";
    cue();
  } catch {
    if (token === session)
      $("message").textContent = "Exposure adjustment unavailable.";
  }
};
$("again").onclick = () => $("review").close();
$("review").onclose = () => {
  $("clip").pause();
  $("clip").removeAttribute("src");
  $("still").removeAttribute("src");
  URL.revokeObjectURL(url);
  url = null;
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden && (stream || opening)) stop();
});
window.addEventListener("pagehide", stop);
size();
controls();
renderReference();
cue();

start();

$("tryAlternative").onclick = () => { $("review").close(); alternative = true; cue(); };
