# Stillroom
An on-device camera coach for choosing where to stand, how to frame a subject and which camera settings suit the shot. The live pilot supports places, details, one-person portraits and short videos.

**[Open the camera](https://stillroom-portrait-studio.vastperch24.chatgpt.site)** · [Design walkthrough](https://stillroom-portrait-studio.vastperch24.chatgpt.site/demo/)

| Delivered | Validate on phones | Later |
|---|---|---|
| Tap a subject, compare two observed angles, fixed selectable pose templates, exposure assist with reset on supporting cameras, source-frame photo export and silent video | Tracking delay, cue direction, exposure compensation, export, heat | Audio, pose catalogue, native camera controls |

**Flow**  
Choose Space or Detail → start camera or practice with café samples → tap the same subject in two viewpoints → compare → capture. In Portrait, Profile or Social, select a fixed pose card.

| Module | Responsibility |
|---|---|
| app/camera.js | Permissions, capture, controls, lifecycle |
| app/tracker.js | On-device landmark and light measurements for people |
| app/coach.js | Lighting and framing rules; stable cue selection |
| app/view.js | Shared preview geometry and overlays |
| app/scout.js · app/poses.js | Subject-region measurements, viewpoint comparison and original pose templates |
| demo/ | Original simulated experience |

### Proposed photo roadmap

| Milestone | First experience | Test before expanding |
|---|---|---|
| Place and detail photography | Tap the subject and choose Space, Detail or Person here. Optionally compare two nearby angles. Show one cue for viewpoint, phone angle or a supported setting. Begin with a café interior and a cup at a window. | Keep the tapped subject visible. Compare only observed views. Check whether beginners can return to the preferred frame and capture the intended mood. |
| Beach and lake scenery | Rotate the phone horizontally, choose Sky, Shore or Reflection, then align a horizon guide. Check important highlights for clipping. | Correct tilted waterlines. Stay quiet on diagonal shores, waves and hills. Match the preview crop in export. |
| Person in a place | Tap the landmark to keep. Choose one of two original poses suited to subject size, crop and visible joints. Show a phone movement or body arrow, one at a time. | Both person and landmark remain in frame. Beginners follow the cue without explanation. |
| Finishing and broader scenery | Preview optional straighten, crop and tonal adjustments beside the original. Test cityscapes and trails as separate scene types. | Compare full-size exports with the phone camera. Keep original available. |

For a location scout, retain temporary thumbnails of sampled views on-device. Compare subject visibility, edge distractions, structural alignment and exposure around the subject. Use the user's chosen emphasis; show both options when scores are close. Verify supported camera adjustments against the resulting frame and allow reset.

Run scene measurements locally on sampled frames. Load the pose model only when people matter. Stabilize recommendations across frames and suppress uncertain cues. Prioritize full-resolution still capture where supported and label fallback dimensions.

**Field trial:** Six beginners, three assignments each (café interior or tabletop detail, waterfront, and person in a place), guided and default camera in alternating order. Blind-rate the 18 pairs. Proposed pilot gate: guided preferred in at least 12 pairs, with no recurring wrong-direction cues on either phone platform. Record ties, capture time and saved resolution.

**Huawei references:** [Pose recommendations and imported references](https://consumer.huawei.com/cn/support/content/zh-cn16094218/) · [Live composition guidance](https://consumer.huawei.com/ph/support/content/en-us16107528/) · [Beach and scenery recognition](https://consumer.huawei.com/ca/support/content/en-us15927544/)

### Run
Node 22+, npm, curl and Python 3. Browser tests also require ffmpeg. Run `npm ci && npm run build`, then `npm start`. Open localhost:8080. Phone camera access requires HTTPS. The build verifies the model checksum and bundles the pinned runtime. During use, frames stay on the device. The first session downloads the model and runtime.

### Release checks
Run `npm test`. With Chromium installed, run `npm run test:browser` after building. Set CHROMIUM_PATH for a custom executable. For each release, update the status table and these checks in the same change.

| On-phone check | Pass when |
|---|---|
| Portrait, profile, social | Preview and exported crop match |
| Select a pose, move, leave and return | Fixed pose reference stays in place; written guidance responds |
| Compare two café angles | Retap the subject in each view, select a reference and export a guide-free photo at the displayed dimensions |
| Stand before a bright window | Persistent backlight prompts a turn; optional exposure assist respects device support |
| Switch camera | Selfie cues align with mirrored preview |
| Record and stop a short clip | Silent clip plays and downloads on a supporting browser |
| Deny permission; exit session | Recovery message appears; camera indicator clears after exit |

Physical iPhone and Android results are pending. Compare a guided photo with the phone camera before expanding automatic controls.
