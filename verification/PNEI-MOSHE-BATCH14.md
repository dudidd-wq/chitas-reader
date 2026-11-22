# Pnei Moshe batch 14 — Avodah Zarah (ysay)

Shipped as **1.0.175**, DATA_VERSION `8373d8738fc9`.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Avodah_Zarah/` on the live 1.0.174 tree (DATA_VERSION `625de0005f10`).
- 37 pages (`1.json`–`37.json`, lex order), nested `say` (`388` outer segments, `7` empty inner arrays at `13:1`, `15:2`, `18:20`, `25:10`, `26:0`, `28:7`, `36:9`; `1,955` inner strings). All 7 empty inner arrays were preserved in place.
- Raw tokens: `49,610` = `5,433` already pointed + `44,177` bare. All 37 pages have `partial` (`31`–`76`, sum `1,945`); the field was left byte-identical.
- Companion `yer/Avodah_Zarah` used for dseg lookup only; not written. Hash pack: 74 SHA-256 rows (37 ysay + 37 yer), verified 74/74.
- Six existing `aram4-identity` rows on `gemara/ysay/Avodah_Zarah/1.json`. After apply, 5 rows were refreshed (`say[0][0]`, `say[0][1]`, `say[1][0]`, `say[1][1]`, `say[2][1]`; say / pass / Israeli IPA / Chabad IPA hashes) and 1 was unchanged (`say[2][0]`). 422 other fixture rows skipped. Fixture rewritten because `updated=5`. This is not a Chabad-pronunciation rework and is not an `aramLexText` production pass. No ENGINE-COV-1B identity pins.

## Build and gates

- First packet: `engine-cov-pnei-moshe-ysay-b14`. Builder: Codex CLI (`fixRound` 0), started 22 Nov 2026 08:01:14 Asia/Jerusalem, ended 08:03:40, `outcome=OK`, 37 pages. Base tooling `engine-cov-pnei-moshe-ysay-b13` (`lib.mjs` then byte-identical to b13 / b12-fix, including exact-only through batch 12).
- Independent validation of the first packet: 2,447 / 40,765 (`6.00%`, 1,098 forms), 39/39 tests, denylist SHA unchanged, 0 changes to `v` / non-say / already-pointed / letters / shape. Gap versus raw bare is `3,412` abbreviations/quotes (`40,765 + 3,412 = 44,177`). Reconciliation: `1,674 + 36,644 + 2,447 + 0 = 40,765` (dseg miss 0).
- First independent review (`engine-cov-pnei-moshe-ysay-b14-review`, `gemini-4-hydrogen-high`): **HOLD 8.5**, `harmful_error_count=2`. S1 10.0, S2 9.8, S3 8.5, S4 9.0, S5 10.0. Audited 650/650 samples + 450 controls (1,100) and a full-form scan of all 1,098 forms:
  - `דגרר`→`דִּגְרָר` at `10:2:1:10` (in the sample): Pietrkov `ד/ר` typo for Hammat Gader (`yer` `לְחַמֲתָא דְגָדֵר`); pointed as Onkelos verb “who dragged” (`refCount=3`).
  - `הורו`→`הוֹרוּ` at `12:8:7:0` (outside the sample): Pietrkov `ו/י` variant of 3ms `הוֹרֵי` before singular `רִבִּי לָעְזָר` (`refCount=186`).
  Each form occurred once.
- Fix packet: `engine-cov-pnei-moshe-ysay-b14-fix`. Builder: Codex CLI, fail-closed fix round 1 of 2, started 08:16:42, ended 08:20:12. The only `lib.mjs` change versus unfixed b14 is adding exact-only `דגרר`, `הורו` to `UNCERTAIN_ATTESTATION_FORMS` (412→413 lines). `HEBREW_PREFIXES`, `refCount >= 10`, and denylist contents were not changed. Stems `גדר` / `גרר` / `הורי` were not added to KNOWN or `PROPER_NAME_STEMS`.
- Independent validation of the fix: **VALIDATE_OK**, **2,445 / 40,765** (`6.00%` rounded, `1,096` unique forms). The only token-level delta versus the unfixed dry-run is those two sites returning to the live bare strings. Named neighbors kept unfixed-packet behavior. dseg modern `0` / rabbinic `1,955` / miss `0`. Denylist `1,674`; quarantine `36,646` (previous `36,644` plus the two newly exact-only tokens); `no_dseg_match` `0`.
- Reconciliation: `1,674 + 36,646 + 2,445 + 0 = 40,765`.
- gzip +6,528. Already-pointed `5,433` unchanged. `v`, key order, nested shape (including all 7 empty arrays), and `partial` preserved on all 37 pages. 0 letter/ktiv changes.
- Tests in the fix packet: 42/42 after the final LF-only SUMMARY (the unfixed packet was 39/39; this packet added regressions). Denylist SHA unchanged (`9bebef55c8aca2bc08b602378450a37955c34e71ca3ed09da087815998d5077b`). `newExactOnlyForms`: `דגרר`, `הורו`.
- Samples: 650 changed + 1,968 unchanged controls.

## Independent review (fix)

- Packet: `engine-cov-pnei-moshe-ysay-b14-fix-review`. Model: `gemini-4-hydrogen-high` (cross-family vs Codex). Started 08:21:46, artifacts complete 08:27:12, tree killed 08:27:32 Asia/Jerusalem.
- Fix review **SHIP, overall 10.0**, `harmful_error_count=0`.
- S1 10.0, S2 10.0, S3 10.0, S4 10.0, S5 10.0 (overall = min).
- Audited 650/650 changed samples + 1,805 controls (2,455) and a full-form scan of all 1,096 accepted forms (2,445 occurrences). Fresh re-run of `pipeline.test.mjs`: 42/42. Input hashes 74/74.

## Apply

- `/tmp/apply-pnei-b14.py` on the fix pack, `EXPECTED=2445`, `partial_preserved==37`: 37/37 pages written, 2,445 changed tokens vs live 1.0.174, 5,433 already-pointed kept, `partial` preserved on 37 pages (sum 1,945).
- `tests/fixtures/aram4-identity.json` updated for 5 of 6 `ysay/Avodah_Zarah/1.json` rows as above.
- `npm test` on the 1.0.175 tree after the VERSION / DATA_VERSION bump: the first run hung after ~14 minutes (disk was 100% full; leftover isolated test workers sat in `ep_poll` with no output). After freeing 2.4G of stale `/tmp` leftovers (not the repo, plans, caches needed for this ship, or Chrome profiles), a retry was **684/684** (256.1s).
