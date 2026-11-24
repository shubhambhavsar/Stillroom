// Exposure time uses 100 microsecond units in the Image Capture specification.
function supportedValue(range, target) {
  if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max))
    return null;
  const step = range.step || 0.01;
  return Math.max(
    range.min,
    Math.min(
      range.max,
      range.min + Math.round((target - range.min) / step) * step,
    ),
  );
}
export function cameraPlan(
  caps,
  current,
  { high = 0, low = 0, moving = false, video = false },
) {
  const ev = current.exposureCompensation;
  if (
    Number.isFinite(ev) &&
    (high > 0.16 || low > 0.3) &&
    current.exposureMode !== "manual"
  ) {
    const next = supportedValue(
      caps.exposureCompensation,
      ev + (high > 0.16 ? -0.33 : 0.33),
    );
    if (next !== null && Math.abs(next - ev) > 0.01)
      return {
        values: { exposureCompensation: next },
        reason:
          high > 0.16 ? "Protecting bright detail" : "Lifting shadow detail",
      };
  }
  if (
    !video &&
    moving &&
    caps.exposureMode?.includes("manual") &&
    current.exposureMode &&
    current.exposureTime > 50 &&
    current.iso > 0
  ) {
    const time = supportedValue(caps.exposureTime, 40);
    const gain =
      time &&
      supportedValue(caps.iso, (current.iso * current.exposureTime) / time);
    if (
      time > 0 &&
      time < current.exposureTime &&
      gain > 0 &&
      gain * time >= 0.85 * current.iso * current.exposureTime
    )
      return {
        values: { exposureMode: "manual", exposureTime: time, iso: gain },
        reason: "Shorter exposure for subject motion",
      };
  }
  return null;
}
export class AutoAssist {
  constructor(track) {
    this.track = track;
    this.baseline = track.getSettings();
    this.busy = false;
    this.used = false;
    this.count = 0;
  }
  async sample(signal) {
    if (this.used || this.busy) return;
    const plan = cameraPlan(
      this.track.getCapabilities?.() || {},
      this.track.getSettings(),
      signal,
    );
    if (!plan) {
      this.count = 0;
      return;
    }
    if (plan.reason !== this.reason) {
      this.count = 0;
      this.reason = plan.reason;
    }
    if (++this.count < 3) return;
    this.used = true;
    this.busy = true;
    try {
      await this.track.applyConstraints({ advanced: [plan.values] });
      const actual = this.track.getSettings();
      const verified = Object.entries(plan.values).every(([k, v]) =>
        typeof v === "number"
          ? Math.abs(actual[k] - v) < 0.05
          : actual[k] === v,
      );
      this.changed = Object.keys(plan.values);
      if (!verified) {
        await this.restore();
        return "Camera retained its own exposure program.";
      }
      return plan.reason + " · applied to camera.";
    } catch {
      return "Camera retained its own exposure program.";
    } finally {
      this.busy = false;
    }
  }
  async restore() {
    if (!this.changed) return;
    const values = Object.fromEntries(
      this.changed
        .filter((k) => this.baseline[k] !== undefined)
        .map((k) => [k, this.baseline[k]]),
    );
    if (values.exposureMode && values.exposureMode !== "manual") {
      delete values.exposureTime;
      delete values.iso;
    }
    await this.track.applyConstraints({ advanced: [values] });
    this.changed = null;
  }
}
