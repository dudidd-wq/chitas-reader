# STEINSALTZ-BATCH2 — Tamid, Horayot, Makkot speech niqqud (1.0.137)

Conservative fail-closed niqqud of the Steinsaltz biur speech sidecar for three tractates, using the shipped 1.0.135 Taanit method.

- Corpus: `site/data/gemara/bsay/{Tamid,Horayot,Makkot}/` — 88 pages (17+25+46), flat `say` string[], CC BY-NC. Display `v` and all non-`say` fields unchanged. Taanit was not modified.
- Counts: 4,173 / 52,904 bare tokens changed (1,498 forms, 7.89% yield); gzip +9,655 bytes (+2.99%). Per tractate: Tamid 1,052/10,835 (9.71%), Horayot 1,022/14,110 (7.24%), Makkot 2,099/27,959 (7.51%). Local Dicta cache only (`dseg/modern` 1,345, rabbinic 0, miss 9); no network; Stage-1 7,540-form lexicon not applied.
- Method inherited from the Taanit fix: denylist (including `סבוני`, `ממל`, Stage-1 stems), `checkOniVavGuard` (blocked `העמונית` and `הצפוני` in this batch), inherited Taanit quarantine (`ורשאי` / `האמיתי` left bare). 87 of 88 pages received at least one `say` change.
- Independent review: `engine-cov-steinsaltz-bsay-b2-review`, agy **gemini-4-hydrogen-high**, 2026-11-19 21:53 שעון ישראל (Asia/Jerusalem). Verdict **SHIP**, overall **9.7**, harmful_error_count **0**. S1 9.8, S2 9.7, S3 9.9, S4 9.8, S5 9.9. All 650 changed sample tokens audited (0 reject, 0 uncertain, 0 harmful) plus 60 controls; all 1,498 accepted forms scanned. Builder: Codex CLI in `engine-cov-steinsaltz-bsay-b2`.
- The in-app notice «לשימוש לא מסחרי בלבד» was already shipped in 1.0.135. See `verification/STEINSALTZ-PERMISSION.md`.
