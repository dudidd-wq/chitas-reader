# Pnei Moshe batch 16 — Bava Batra (ysay)

Shipped as **1.0.177**, DATA_VERSION `c8adeeb9d35d`.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Bava_Batra/` on the live 1.0.176 tree (DATA_VERSION `9d0cf34d91cf`).
- 34 pages (`1.json`–`34.json`, lex order), nested `say` (`293` outer segments, `6` empty inner arrays at `10:2`, `18:2`, `22:4`, `22:10`, `7:7`, and `9:6`; `1,747` inner strings). All 6 empty inner arrays were preserved in place.
- Raw tokens: `47,433` = `5,000` already pointed + `42,433` bare. All 34 pages have `partial` (`15`–`72`, sum `1,715`); the field was left byte-identical.
- Companion `yer/Bava_Batra` (34/34 pages, 0 length mismatches) was used for dseg lookup only and was not written. This is not `bavli/Bava_Batra` / `bsay/Bava_Batra` (a different 350-page Bavli tractate). Hash pack: 68 SHA-256 rows (34 ysay + 34 yer, lex), verified 68/68.
- Five existing `aram4-identity` rows on `gemara/ysay/Bava_Batra/33.json`. After apply, 4 rows were refreshed (`say[0][1]`, `say[1][0]`, `say[1][1]`, `say[2][0]`; say / pass / Israeli IPA / Chabad IPA hashes) and 1 was unchanged (`say[0][0]`). 423 other fixture rows skipped. Fixture rewritten because `updated=4`. This is not a Chabad-pronunciation rework and is not an `aramLexText` production pass. No ENGINE-COV-1B identity pins.

## Build and gates

- First packet: `engine-cov-pnei-moshe-ysay-b16`. Builder: Codex CLI (`fixRound` 0), started 22 Nov 2026 09:53:22 Asia/Jerusalem, ended 09:57:28, `outcome=OK`, 34 pages. Base tooling `engine-cov-pnei-moshe-ysay-b15-fix` (`lib.mjs` then byte-identical to b15-fix, including exact-only through batch 15: `בשנתן`, `ולמי`, `שמאלו`).
- Independent validation of the first packet: 2,377 / 39,985 (`5.94%`, 1,041 forms), 43/43 tests, denylist SHA unchanged, 0 changes to `v` / non-say / already-pointed / letters / shape. Gap versus raw bare is `2,448` abbreviations/quotes (`39,985 + 2,448 = 42,433`). Reconciliation: `1,746 + 35,801 + 61 + 2,377 = 39,985` (dseg miss 3 strings / 61 tokens at `18:3:12`, `33:0:0`, `9:3:0`; rabbinic 1,744 / modern 0).
- First independent review (`engine-cov-pnei-moshe-ysay-b16-review`, `gemini-4-hydrogen-high`, 09:58:39–10:09:11 Asia/Jerusalem): **HOLD 9.0**, `harmful_error_count=2` (2 token occurrences). S1 10, S2 10, S3 9.0, S4 9.0, S5 10. Audited 650/650 samples + 2,081 controls (2,731) and a full-form scan of all 1,041 forms. Both errors were outside the sample:
  - `ליפות`→`לְיַפּוֹת` at `17:5:2:35` (should be `לְיָפוֹת`, "for finer/better ones than them", parallel to `לרעות יותר מהן`). The same form is contextually valid as `לְיַפּוֹת כחו` at `29:2:0:110` and `29:2:0:134`. Fail-closed requires all three `ליפות` tokens to return to bare. `refCount >= 10` leak. Do not exact-only `יפות`/`יפה`.
  - `שכונתו`→`שֶׁכַּוָּנָתוֹ` at `4:4:1:5` (should be `שְׁכוּנָתוֹ`, "his neighborhood", after `של` and balanced by already-pointed `לִשְׁכוּנָה אחרת`; one occurrence). Do not exact-only `שכונה`/`כונתו`/`כוונתו`.
- Fix packet: `engine-cov-pnei-moshe-ysay-b16-fix`. Builder: Codex CLI, fail-closed fix round 1 of 2, started 10:10:50, ended 10:15:01 Asia/Jerusalem. The only `lib.mjs` change versus unfixed b16 is adding exact-only `ליפות`, `שכונתו` to `UNCERTAIN_ATTESTATION_FORMS` (414→415 lines). `HEBREW_PREFIXES`, `refCount >= 10`, and denylist contents were not changed. Stems `יפות` / `יפה` / `שכונה` / `כונתו` / `כוונתו` were not added to KNOWN, `PROPER_NAME_STEMS`, or exact-only. Already-pointed neighbor `לִשְׁכוּנָה` at `4:4:1` was left unchanged.
- Independent validation of the fix: **VALIDATE_OK**, **2,373 / 39,985** (`5.93%`, `1,039` unique forms). The only token-level delta versus the unfixed dry-run is those four sites returning to the live bare strings (`17:5:2:35`, `29:2:0:110`, `29:2:0:134`, `4:4:1:5`). dseg modern `0` / rabbinic `1,744` / miss `3` (61 tokens). Denylist `1,746`; quarantine `35,805` (previous `35,801` plus the four newly exact-only tokens); `no_dseg_match` `61`.
- Reconciliation: `1,746 + 35,805 + 61 + 2,373 = 39,985`.
- gzip +6,223. Already-pointed `5,000` unchanged. `v`, key order, nested shape (including all 6 empty arrays), and `partial` preserved on all 34 pages. 0 letter/ktiv changes.
- Tests in the fix packet: 45/45 after the final LF-only SUMMARY (the unfixed packet was 43/43; this packet added regressions). Denylist SHA unchanged (`9bebef55c8aca2bc08b602378450a37955c34e71ca3ed09da087815998d5077b`). `newExactOnlyForms`: `ליפות`, `שכונתו`.
- Samples: 650 changed + 2,058 unchanged controls.

## Independent review (fix)

- Packet: `engine-cov-pnei-moshe-ysay-b16-fix-review`. Model: `gemini-4-hydrogen-high` (cross-family vs Codex). Started 10:15:50, artifacts complete 10:24:35, ended 10:24:58 Asia/Jerusalem.
- Fix review **SHIP, overall 10**, `harmful_error_count=0`.
- S1 10, S2 10, S3 10, S4 10, S5 10 (overall = min).
- Audited 650/650 changed samples + 2,058 controls (2,708) and a full-form scan of all 1,039 accepted forms (2,373 occurrences). The four previously flagged sites were confirmed bare. Fresh re-run of `pipeline.test.mjs`: 45/45. Input hashes 68/68.

## Apply

- `/tmp/apply-pnei-b16.py` on the fix pack, `EXPECTED=2373`, `partial_preserved==34`: 34/34 pages written, 2,373 changed tokens vs live 1.0.176, 5,000 already-pointed kept, `partial` preserved on 34 pages (sum 1,715). `yer/Bava_Batra`, `bavli/Bava_Batra`, and `bsay/Bava_Batra` were not written.
- `tests/fixtures/aram4-identity.json` updated for 4 of 5 `ysay/Bava_Batra/33.json` rows as above.
- VERSION bumped to 1.0.177; `node tools/data-version.mjs` set DATA_VERSION `c8adeeb9d35d`.
- `npm test`: **684/684** on the first run (271.9s).
