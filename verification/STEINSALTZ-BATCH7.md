# STEINSALTZ-BATCH7 — Berakhot and Nazir speech niqqud (1.0.143)

Conservative fail-closed niqqud of the Steinsaltz biur speech sidecar for two tractates, using the shipped 1.0.135 Taanit method plus later denylist gates. No fix round was required.

- Corpus: `site/data/gemara/bsay/{Berakhot,Nazir}/` — 254 pages (125+129), flat `say` string[], CC BY-NC. Display `v` and all non-`say` fields unchanged. Previously shipped tractates were not modified. Meilah, Bekhorot and Pesachim were skipped (~99% already pointed in the source).
- Counts: 9,839 / 132,751 bare tokens changed (2,412 forms, 7.41% yield); gzip +23,518 bytes. Per tractate: Berakhot 6,541/82,664 (7.91%), Nazir 3,298/50,087 (6.58%). Local Dicta cache only (`dseg/modern` 3,964, rabbinic 1, miss 73); no network; Stage-1 lexicon not applied.
- Gates retained from batches 4–6: `נמלים`/`נמלי`, `אלקיך` and other ק-divine stems, `שיכפרו`, `שירשו`, `תרגם`, `הזהירה`/`שהזהירה`, `סבוני`, `ורשאי`/`האמיתי`. The builder also added `כינה` after spotting Nazir 39a "[כינה] מתה" (a louse vs the verb "nicknamed").
- Independent review: `engine-cov-steinsaltz-bsay-b7-review`, agy **gemini-4-hydrogen-high**, 2026-11-20 11:27 שעון ישראל (Asia/Jerusalem). Verdict **SHIP**, overall **9.9**, harmful_error_count **0**. S1 10.0, S2–S5 9.9. 650/650 changed samples and 324 controls audited; all 2,412 accepted forms scanned. Builder: Claude Opus via agy (`claude-opus-5-5-medium`) in `engine-cov-steinsaltz-bsay-b7` (17/17 tests). Codex was not used; Chavruta had `codex exec` workers running at the time.
- The in-app notice «לשימוש לא מסחרי בלבד» was already shipped in 1.0.135. See `verification/STEINSALTZ-PERMISSION.md`.
- After apply, ARAM-4 gained one addition-only ole on Nazir 52b say[2] `וְאִיבָּעֵית` → `וְאִיבָּעֵ֫ית`, so compiled speech stays a fixed point of the shipped lexicon. The additions fixture was updated (6,767 tokens).
