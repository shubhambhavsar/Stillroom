# Evidence behind the live coach

| Input | Use in Stillroom | Limits |
|---|---|---|
| [COCO Consortium 2017 person keypoints](https://cocodataset.org/#keypoints-2017) | Normalize 17 annotated joints, filter for visible arms and upright torsos, then sample 96 distinct references. Rank by visible joint geometry, portrait crop and side-light signal. | Coordinates describe real poses. They do not rate artistic quality. |
| [InstaPose, ICCV Workshops 2025](https://openaccess.thecvf.com/content/ICCV2025W/SAUAFG/html/Ji_InstaPose_Scene-Aware_Pose_Recommendation_via_Vision_Transformers_and_Diversity-Optimized_Reranking_ICCVW_2025_paper.html) | Research precedent for retrieving scene-conditioned references. Our smaller geometric ranker runs locally. | No InstaPose images, weights or benchmark claims are used. |
| [Canon portrait posing](https://www.usa.canon.com/learning/training-articles/training-articles-list/posing-tips-for-successful-portraits) · [Nikon portrait guide](https://www.nikon.no/globalassets/digizuite/202718-en-nikon_quickstart_gb_portraits-v5B36A1F1A830.pdf) | Turn a recommended reference into a relaxed arm, shoulder or face cue; consider face lighting and eye-level framing. | Upright, single-person portraits are the first supported use case. |
| [Adobe food photography](https://www.adobe.com/in/creativecloud/photography/discover/food-photography.html) · [Reading a histogram](https://www.adobe.com/creativecloud/photography/discover/how-to-read-a-histogram.html) | Choose overhead or side-on cues from the intended subject emphasis. Score sampled viewpoints by clipping near the subject and background edge density. | User keeps the same subject inside the ring. Scores favor readable detail; users may prefer another look. |
| [Nikon on shutter speed](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/understanding-shutter-speed) · [W3C Image Capture](https://www.w3.org/TR/image-capture/) | Persistent subject-area clipping requests a small EV correction. Persistent wrist motion relative to the shoulder may request a shorter shutter and compensating ISO on compatible tracks. | 1/250 s is a pilot target for movement. Manual control requires readable values and supported ranges. Aperture stays device-managed. |

**Attribution.** Body coordinates are adapted from COCO 2017 annotations, © COCO Consortium, under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Changes include filtering, diversity sampling, normalization, rounding and rendering. Reference IDs identify the original annotations. COCO photographs are excluded. [Dataset terms](https://cocodataset.org/dataset/termsofuse.htm)

**Rebuild.** Extract person_keypoints_val2017.json from the official train/val annotation archive and run `python3 scripts/import_poses.py /path/to/person_keypoints_val2017.json`. Ranking weights, tolerances and frame scores are product heuristics, pending blind evaluation.

The seated window reference is a cropped version of [Pexels photo 842567](https://www.pexels.com/photo/842567/), used under the [Pexels License](https://www.pexels.com/license/). Close upper-body framing selects this reference. The coach cannot reliably infer sitting from a chest-up crop.

### Pose suggestions in the camera

[Huawei’s HarmonyOS instructions](https://consumer.huawei.com/cn/support/content/zh-cn16094218/) document opening the toolbox from the shutter, browsing scene recommendations, loading more resources, changing batches, importing a portrait into My poses, managing selections, and matching a guide before pressing the shutter. [Coverage of Huawei’s demonstration](https://www.androidauthority.com/huawei-pura-90-ai-posture-recommendation-3657761/) also describes brief posing instructions.

Stillroom bundles its pose catalogue and ranks body landmarks using geometry, framing and side lighting. Two photograph cards use on-device person segmentation. Illustrated cards approximate a silhouette from COCO joints. Gallery imports store a small photo and segmentation contour in this browser. Selected guides use manual capture. Real-device comparison of recommendation quality with Huawei is pending.

### Photographic guide revision

The recommended tray now uses photographic cards. The app uses precomputed person contours for these cards and aligns the selected reference to the detected nose and shoulder span in display coordinates. Only suggestions for the visible crop are eligible. When tracking drops out, the reference thumbnail remains available and the outline hides.

Reference photographs via Pexels: [photo 842567](https://www.pexels.com/photo/842567/), [photo 1181686](https://www.pexels.com/photo/1181686/), [photo 774909](https://www.pexels.com/photo/774909/), [photo 614810](https://www.pexels.com/photo/614810/), [photo 1036623](https://www.pexels.com/photo/1036623/), [photo 2379004](https://www.pexels.com/photo/2379004/), [photo 1040945](https://www.pexels.com/photo/1040945/), [photo 1536619](https://www.pexels.com/photo/1536619/), [photo 1055691](https://www.pexels.com/photo/1055691/), [photo 1043474](https://www.pexels.com/photo/1043474/).
