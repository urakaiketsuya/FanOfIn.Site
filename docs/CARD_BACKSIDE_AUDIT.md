# Card backside audit

Audited against the official Grand Archive card API on 2026-09-23.

- The local catalog contains 22 cards whose rules text includes `transform`.
- 21 are double-faced cards. Every current printing reports `configuration: "flip"`, a front orientation, and one valid linked back face in `edition.other_orientations`.
- `Auspicious Manifestation` is the one intentional non-DFC result: its effect transforms a Shenju ally, not itself, so its editions correctly have no alternate orientation.
- Requests using a reverse-face slug (for example `daunting-panda`) resolve to the canonical front card with the reverse face linked on its edition.
- Current official data has one alternate face per flip printing. The detail UI supports more than one so future multi-face records do not silently hide a face; compact previews intentionally show the first alternate face.

The UI must use edition orientation metadata rather than searching effect text for “transform.” This also keeps the selected printing and its matching reverse-face artwork together.

No unresolved transform/backside data cases remained at the time of the audit.
