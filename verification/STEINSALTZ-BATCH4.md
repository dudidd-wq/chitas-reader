# STEINSALTZ-BATCH4 — Keritot, Arakhin, Temurah, Rosh Hashanah speech niqqud (1.0.140)

Conservative fail-closed niqqud of the Steinsaltz biur speech sidecar for four tractates, using the shipped 1.0.135 Taanit method, after fix round 1.

- Corpus: `site/data/gemara/bsay/{Keritot,Arakhin,Temurah,Rosh_Hashanah}/` — 251 pages (54+65+65+67), flat `say` string[], CC BY-NC. Display `v` and all non-`say` fields unchanged. Previously shipped tractates were not modified.
- Counts: 2,550 / 33,851 bare tokens changed (1,033 forms, 7.53% yield); gzip +6,351 bytes. All 2,550 changes are in Rosh Hashanah (2,550/33,402, 7.63%). Keritot, Arakhin and Temurah are already ~99.4% pointed in the live source; their outputs are byte-identical to input (0 changes). Local Dicta cache only (`dseg/modern` 4,496, rabbinic 0, miss 47); no network; Stage-1 lexicon not applied.
- Fix round 1: `נמלים` / `לנמלי` / `נמלי` on Rosh Hashanah 23a say[9] stay bare (ports/ants homograph; first review found harmful `נְמָלִים` "ants"). `אלקיך` on 5b say[3] stays bare as a ק-substituted divine name.
- Independent review of the fix: `engine-cov-steinsaltz-bsay-b4-fix-review`, agy **gemini-4-hydrogen-high**, 2026-11-20 08:42 שעון ישראל (Asia/Jerusalem). Verdict **SHIP**, overall **9.8**, harmful_error_count **0**. S1 9.9, S2 9.8, S3–S5 9.9. 650/650 changed samples audited plus a full-corpus scan of all 2,550 changes; 269 controls. Builder: Codex CLI fix round 1 in `engine-cov-steinsaltz-bsay-b4-fix` (14/14 tests).
- The in-app notice «לשימוש לא מסחרי בלבד» was already shipped in 1.0.135. See `verification/STEINSALTZ-PERMISSION.md`.
