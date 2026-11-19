# STEINSALTZ-TAANIT — speech niqqud pilot (1.0.135)

Conservative fail-closed niqqud of the Steinsaltz biur speech sidecar for tractate Taanit only.

- Corpus: `site/data/gemara/bsay/Taanit/` — 59 pages (`2a.json`–`31a.json`), flat `say` string[], CC BY-NC. Display `v` unchanged.
- Counts: 2,223 / 29,099 bare tokens changed (1,022 forms, 7.64% yield); gzip +0.96%. Local Dicta cache only (`dseg/modern`); no network; Stage-1 7,540-form lexicon not applied.
- Fix 1 (after first review 8.0): `סבוני` in 13b «חומר סבוני מן הצומח» left bare (never `סַבּוּנִי`); `checkOniVavGuard` for `-וני`/`-ני`; `ורשאי` and `האמיתי` quarantined.
- Independent re-review: `engine-cov-steinsaltz-bsay-fix-review`, Claude Sonnet 5.5 Medium, 2026-11-19 17:33 Israel time. Verdict **SHIP**, overall **9.6**, harmful_error_count **0**. S1 9.7, S2 9.7, S3 9.6, S4 9.7, S5 9.6. 650 changed tokens audited + 240 controls; all 1,022 forms scanned.
- Visible in-app notice «לשימוש לא מסחרי בלבד» applied to About `#noncommercial` and the Sources row «ביאור שטיינזלץ לבבלי». See `verification/STEINSALTZ-PERMISSION.md`.
- Packets on the PC: `engine-cov-steinsaltz-bsay`, `engine-cov-steinsaltz-bsay-fix`, `engine-cov-steinsaltz-bsay-fix-review`.
- ARAM-4 ole marks on Taanit speech were preserved (same token indexes). `tests/fixtures/aram4-additions.json` base hashes were updated for 41 Taanit strings whose only change is the new niqqud (consonants unchanged).
