# STEINSALTZ-BATCH3 — Chagigah, Moed Katan, Megillah speech niqqud (1.0.138)

Conservative fail-closed niqqud of the Steinsaltz biur speech sidecar for three tractates, using the shipped 1.0.135 Taanit method.

- Corpus: `site/data/gemara/bsay/{Chagigah,Moed_Katan,Megillah}/` — 167 pages (51+55+61), flat `say` string[], CC BY-NC. Display `v` and all non-`say` fields unchanged. Previously shipped tractates (Taanit, Tamid, Horayot, Makkot) were not modified.
- Counts: 7,018 / 91,135 bare tokens changed (2,191 forms, 7.7% yield); gzip +16,657 bytes. Per tractate: Chagigah 1,885/24,387 (7.73%), Moed Katan 2,266/29,652 (7.64%), Megillah 2,867/37,096 (7.73%). Local Dicta cache only (`dseg/modern` 2,873, rabbinic 0, miss 91); no network; Stage-1 lexicon not applied.
- Method inherited from the Taanit fix and batch 2: denylist, `checkOniVavGuard` (1 oni-vav quarantine in this batch: `חיצונית` on Chagigah 25b), inherited Taanit quarantine (`ורשאי` / `האמיתי` left bare).
- Independent review: `engine-cov-steinsaltz-bsay-b3-review`, agy **gemini-4-hydrogen-high**, 2026-11-19 22:35 שעון ישראל (Asia/Jerusalem). Verdict **SHIP**, overall **9.8**, harmful_error_count **0**. S1–S5 all 9.8. All 650 changed sample tokens audited (649 accept, 1 non-harmful uncertain definiteness on Chagigah/5b `לְמִין`, 0 reject) plus 65 controls; all 2,191 accepted forms scanned. Builder: Codex CLI in `engine-cov-steinsaltz-bsay-b3`.
- The in-app notice «לשימוש לא מסחרי בלבד» was already shipped in 1.0.135. See `verification/STEINSALTZ-PERMISSION.md`.
