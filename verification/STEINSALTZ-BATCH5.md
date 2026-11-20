# STEINSALTZ-BATCH5 — Beitzah and Shevuot speech niqqud (1.0.141)

Conservative fail-closed niqqud of the Steinsaltz biur speech sidecar for two tractates, using the shipped 1.0.135 Taanit method, after fix round 1.

- Corpus: `site/data/gemara/bsay/{Beitzah,Shevuot}/` — 174 pages (78+96), flat `say` string[], CC BY-NC. Display `v` and all non-`say` fields unchanged. Previously shipped tractates were not modified. Meilah, Bekhorot and Pesachim were skipped (~99% already pointed in the source).
- Counts: 4,886 / 71,283 bare tokens changed (1,559 forms, 6.85% yield); gzip +12,437 bytes. Per tractate: Beitzah 1,885/23,837 (7.91%), Shevuot 3,001/47,446 (6.33%). Local Dicta cache only (`dseg/modern` 2,596, rabbinic 0, miss 96); no network; Stage-1 lexicon not applied.
- Fix round 1: `שיכפרו` stays bare (Qal "deny" vs Pi'el "atone" homograph; first review found five harmful atonement readings as `שֶׁיִּכְפְּרוּ` on Shevuot 10a/10b). `שירשו` stays bare (3pl vs 3ms+suffix; first review found one harmful `שֶׁיָּרְשׁוּ` after singular `אח` on Shevuot 48b#5). Batch-4 gates (`נמלים`, `אלקיך`) retained.
- Independent review of the fix: `engine-cov-steinsaltz-bsay-b5-fix-review`, agy **gemini-4-hydrogen-high**, 2026-11-20 09:38 שעון ישראל (Asia/Jerusalem). Verdict **SHIP**, overall **9.9**, harmful_error_count **0**. S1 10.0, S2–S5 9.9. 650/650 changed samples and 240 controls audited; all 1,559 accepted forms scanned. Builder: Codex CLI fix round 1 in `engine-cov-steinsaltz-bsay-b5-fix` (16/16 tests).
- The in-app notice «לשימוש לא מסחרי בלבד» was already shipped in 1.0.135. See `verification/STEINSALTZ-PERMISSION.md`.
