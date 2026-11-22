# Pnei Moshe batch 11 — Yoma (ysay)

Shipped as **1.0.172**, DATA_VERSION `2d062ba0dae1`.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Yoma/` on the live 1.0.171 tree (DATA_VERSION `42c99f9633c7`).
- 42 pages (`1.json`–`42.json`, lex order), nested `say` (`403` outer segments, `44` empty, `1,741` inner strings). The 44 empty inner arrays were preserved in place.
- Raw tokens: `59,426` = `5,394` already pointed + `54,032` bare. All 42 pages have `partial` (`21`–`56`, sum `1,737`); the field was left byte-identical.
- Companion `yer/Yoma` used for dseg lookup only; not written. Hash pack: 84 SHA-256 rows (42 ysay + 42 yer), verified 84/84.
- 0 `aram4-identity` rows for `ysay/Yoma`. After apply, `updated=0`, `unchanged=0`, `skipped=428`; the fixture was not rewritten. No ENGINE-COV-1B identity pins.

## Build and gates

- First packet: `engine-cov-pnei-moshe-ysay-b11`. Builder: Codex CLI (`fixRound` 0). Base tooling `engine-cov-pnei-moshe-ysay-b10` (`lib.mjs` then byte-identical to b10 / b9 / b8 / `b7-fix2`).
- Independent validation of the first packet (`validate_b11.py`): **VALIDATE_OK**, 3,186 / 49,939 (`6.38%`, 1,138 forms), 38/38 tests, denylist SHA unchanged, 0 changes to `v` / non-say / already-pointed / letters / shape.
- First independent review (`engine-cov-pnei-moshe-ysay-b11-review`, `gemini-4-hydrogen-high`): **HOLD 8.4**, `harmful_error_count=4`. S1 9.9, S2 8.4, S3 8.6, S4 9.9, S5 9.6. The 650-sample had 0 harmful; the 4 errors were found in the full-form scan of all 1,138 accepted forms (one occurrence each):
  - `והודו`→`וְהוֹדוּ` at `16:2:6:18` (country name India; bare neighbor `הודו` at `16:2:6:12` stayed bare; `refCount=42` bypassed the stem-homograph check).
  - `חורו`→`חוֹרוֹ` at `19:12:1:44` (Pietrkov typo for `חָזְרוּ`; neighbors `שֶׁחָזְרוּ` ×3 and bare `חזרו:` preserved).
  - `אשכחך`→`אֶשְׁכָּחֵךְ` at `18:2:1:44` (Pietrkov typo for Aramaic `אשכחן`; genuine `אשכחן` tokens stayed bare).
  - `בשמאלה`→`בִּשְׂמֹאלָהּ` at `24:4:4:27` (Pietrkov typo for `בשמאלו` of the male Kohen Gadol; `בשמאלו`/`שמאלו` neighbors preserved).
- Fix packet: `engine-cov-pnei-moshe-ysay-b11-fix`. Builder: Codex CLI, fail-closed fix round 1 of 2. The only `lib.mjs` change versus unfixed b11 is adding exact-only `והודו`, `חורו`, `אשכחך`, `בשמאלה` to `UNCERTAIN_ATTESTATION_FORMS` (410→411 lines). `הודו` was not added to `PROPER_NAME_STEMS`. `HEBREW_PREFIXES`, `refCount >= 10`, and denylist contents were not changed.
- Independent validation of the fix: **3,182 / 49,939** bare tokens considered (`6.37%`, `1,134` unique forms). The only token-level delta versus the unfixed dry-run is those four sites returning to the live bare strings. Named neighbors are byte-identical to the unfixed packet. Gap versus raw bare is `4,093` abbreviations/quotes (`49,939 + 4,093 = 54,032`).
- dseg: modern `0` / rabbinic `1,739` / miss `2`. Denylist `2,560`; quarantine `44,153` (previous `44,149` plus the four newly exact-only tokens); `no_dseg_match` `44`.
- Reconciliation: `2,560 + 44,153 + 3,182 + 44 = 49,939`. The 44-token remainder corresponds to the 2 cache-miss inner strings and stayed bare.
- gzip +8,613. Already-pointed `5,394` unchanged. `v`, key order, nested shape (including all 44 empty arrays), and `partial` preserved on all 42 pages. 0 letter/ktiv changes.
- Tests in the fix packet: 41/41 after the final LF-only SUMMARY (the unfixed packet was 38/38; this packet added regressions for the four sites and named neighbors). Denylist SHA unchanged (`9bebef55c8aca2bc08b602378450a37955c34e71ca3ed09da087815998d5077b`). `newExactOnlyForms`: `והודו`, `חורו`, `אשכחך`, `בשמאלה`. Inherited exact-only forms through batch 7 retained.
- Samples: 650 changed + 3,019 unchanged controls. A leftover first-packet validator flag (`unexpected fixRound 1`) is not a packet defect.

## Independent review (fix)

- Packet: `engine-cov-pnei-moshe-ysay-b11-fix-review`. Model: `gemini-4-hydrogen-high` (cross-family vs Codex).
- Fix review **SHIP, overall 9.7**, `harmful_error_count=0`.
- S1 9.9, S2 9.8, S3 9.7, S4 9.9, S5 9.7 (overall = min).
- Audited 650/650 changed samples + 350 stratified controls (1,000) and a full-form scan of all 1,134 accepted forms (3,182 occurrences). The four repaired sites were verified bare; named neighbors kept unfixed-packet behavior.
- Fresh re-run of `pipeline.test.mjs`: 41/41. Input hashes 84/84. Pages with nonzero `partial` all received niqqud.

## Apply

- `/tmp/apply-pnei-b11.py` retargeted to the fix pack, `EXPECTED=3182`, `partial_preserved==42`: 42/42 pages written, 3,182 changed tokens vs live 1.0.171, 5,394 already-pointed kept, `partial` preserved on 42 pages (sum 1,737).
- `tests/fixtures/aram4-identity.json` not rewritten (`updated=0`).
- `npm test` on the 1.0.172 tree after the VERSION / DATA_VERSION bump: **684/684** on the first run (268.6s).
