# STEINSALTZ-BATCH6 — Sotah and Sukkah speech niqqud (1.0.142)

Conservative fail-closed niqqud of the Steinsaltz biur speech sidecar for two tractates, using the shipped 1.0.135 Taanit method, after fix round 1.

- Corpus: `site/data/gemara/bsay/{Sotah,Sukkah}/` — 206 pages (96+110), flat `say` string[], CC BY-NC. Display `v` and all non-`say` fields unchanged. Previously shipped tractates were not modified. Meilah, Bekhorot and Pesachim were skipped (~99% already pointed in the source). Sukkah is already about 86.9% pointed in the live source.
- Counts: 3,758 / 50,673 bare tokens changed (1,459 forms, 7.42% yield); gzip +8,939 bytes. Per tractate: Sotah 3,012/39,593 (7.61%), Sukkah 746/11,080 (6.73%). Local Dicta cache only (`dseg/modern` 2,963, rabbinic 0, miss 19); no network; Stage-1 lexicon not applied.
- Fix round 1: `תרגם` stays bare (imperative `תַּרְגֵּם` vs past `תִּרְגֵּם`; first review found harmful past pointing on Sotah 8b#8 next to `הסבר`). `שהזהירה` / `הזהירה` stay bare (3ms+3fs mappiq vs 3fs; first review found missing mappiq on Sotah 2a#1). Earlier gates (`נמלים`, `אלקיך`, `שיכפרו`, `שירשו`) retained.
- Independent review of the fix: `engine-cov-steinsaltz-bsay-b6-fix-review`, agy **gemini-4-hydrogen-high**, 2026-11-20 10:39 שעון ישראל (Asia/Jerusalem). Verdict **SHIP**, overall **9.9**, harmful_error_count **0**. S1 10.0, S2–S5 9.9. 650/650 changed samples and 240 controls audited; all 1,459 accepted forms scanned. Builder: Codex CLI fix round 1 in `engine-cov-steinsaltz-bsay-b6-fix` (17/17 tests).
- The in-app notice «לשימוש לא מסחרי בלבד» was already shipped in 1.0.135. See `verification/STEINSALTZ-PERMISSION.md`.
