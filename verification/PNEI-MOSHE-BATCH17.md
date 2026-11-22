# Pnei Moshe batch 17 — Kiddushin (ysay)

Shipped as **1.0.178**, DATA_VERSION `6e6d92faf16d`.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Kiddushin/` on the live 1.0.177 tree (DATA_VERSION `c8adeeb9d35d`).
- 48 pages (`1.json`–`48.json`, lex order), nested `say` (`376` outer segments, `35` empty inner arrays at `10:0`, `16:8`, `16:9`, `17:6`, `18:0`, `27:1`, `27:2`, `27:3`, `30:7`, `30:8`, `31:0`, `31:1`, `33:5`, `36:3`, `37:2`, `4:1`, `4:8`, `4:9`, `40:5`, `41:3`, `41:4`, `43:3`, `43:5`, `43:6`, `43:7`, `44:4`, `44:5`, `44:6`, `46:1`, `5:0`, `9:4`, `9:5`, `9:6`, `9:7`, and `9:8`; `1,854` inner strings). All 35 empty inner arrays were preserved in place.
- Raw tokens: `48,375` = `5,959` already pointed + `42,416` bare. All 48 pages have `partial` (`16`–`64`, sum `1,845`); the field was left byte-identical.
- Companion `yer/Kiddushin` (48/48 pages, 0 length mismatches) was used for dseg lookup only and was not written. This is not `bavli/Kiddushin` / `bsay/Kiddushin` (a different 162-page Bavli tractate). Hash pack: 96 SHA-256 rows (48 ysay + 48 yer, lex), verified 96/96.
- Three existing `aram4-identity` rows on `gemara/ysay/Kiddushin/26.json`. After apply, all 3 rows were refreshed (`say[0][0]`, `say[1][0]`, `say[2][0]`; say / pass / Israeli IPA / Chabad IPA hashes). 425 other fixture rows skipped. Fixture rewritten because `updated=3`. This is not a Chabad-pronunciation rework and is not an `aramLexText` production pass. No ENGINE-COV-1B identity pins.

## Build and gates

- First packet: `engine-cov-pnei-moshe-ysay-b17`. Builder: Codex CLI (`fixRound` 0), started 22 Nov 2026 10:42:08 Asia/Jerusalem, ended 10:46:14, `outcome=OK`, 48 pages. Base tooling `engine-cov-pnei-moshe-ysay-b16-fix` (`lib.mjs` then byte-identical to b16-fix, including exact-only through batch 16: `ליפות`, `שכונתו`).
- Independent validation of the first packet: 2,377 / 39,884 (`5.96%`, 995 forms), 45/45 tests, denylist SHA unchanged, 0 changes to `v` / non-say / already-pointed / letters / shape. Gap versus raw bare is `2,532` abbreviations/quotes (`39,884 + 2,532 = 42,416`). Reconciliation: `1,765 + 35,576 + 166 + 2,377 = 39,884` (dseg miss 3 strings / 166 tokens at `8:2:2` (83), `16:11:10` (56), `35:1:0` (27); rabbinic 1,851 / modern 0).
- First independent review (`engine-cov-pnei-moshe-ysay-b17-review`, `gemini-4-hydrogen-high`, 10:48:17–10:55:18 Asia/Jerusalem): **HOLD 8.8**, `harmful_error_count=3` (3 token occurrences, 2 unique harmful forms). S1 10.0, S2 10.0, S3 9.3, S4 8.8, S5 9.9. Audited 650/650 samples + 2,119 controls (2,769) and a full-form scan of all 995 forms. The harmful errors were inside the sample:
  - `יקבלו`→`יְקַבְּלוּ` at `11:7:0[56]` and `12:0:0[56]` (should be `יְקַבְּלוֹ`, "but he himself shall not receive it"; 3pl vs 3ms+suffix).
  - `השום`→`הַשּׁוּם` at `16:1:2[12]` (should be `הַשּׁוֹם`, "the appraisal", glossing already-pointed `שׁוֹם` / `שומא`, not "the garlic"). `refCount >= 10` leak on stem `שום`.
- Non-blocking policy leak: `דיהושע`→`דִּיהוֹשֻׁעַ` at `43:1:3[15]` (phonologically accurate, but `יהושע` is in `PROPER_NAME_STEMS` and Aramaic `ד-` is omitted from `HEBREW_PREFIXES`).
- Fix packet: `engine-cov-pnei-moshe-ysay-b17-fix`. Builder: Codex CLI, fail-closed fix round 1 of 2, started 10:57:46, ended 11:00:32 Asia/Jerusalem. The only `lib.mjs` change versus unfixed b17 is adding exact-only `יקבלו`, `השום`, `דיהושע` to `UNCERTAIN_ATTESTATION_FORMS` (415→416 lines). `HEBREW_PREFIXES`, `refCount >= 10`, and denylist contents were not changed. Stems `קבלו` / `שום` / `יהושע` were not added to KNOWN, `PROPER_NAME_STEMS`, or exact-only.
- Independent validation of the fix: **VALIDATE_OK**, **2,373 / 39,884** (`5.95%`, `992` unique forms). The only token-level delta versus the unfixed dry-run is those four sites returning to the live bare strings. dseg modern `0` / rabbinic `1,851` / miss `3` (166 tokens). Denylist `1,765`; quarantine `35,580` (previous `35,576` plus the four newly exact-only tokens); `no_dseg_match` `166`.
- Reconciliation: `1,765 + 35,580 + 166 + 2,373 = 39,884`.
- gzip +6,430. Already-pointed `5,959` unchanged. `v`, key order, nested shape (including all 35 empty arrays), and `partial` preserved on all 48 pages. 0 letter/ktiv changes.
- Tests in the fix packet: 47/47 after the final LF-only SUMMARY (the unfixed packet was 45/45; this packet added regressions). Denylist SHA unchanged (`9bebef55c8aca2bc08b602378450a37955c34e71ca3ed09da087815998d5077b`). `newExactOnlyForms`: `יקבלו`, `השום`, `דיהושע`.
- Samples: 650 changed + 2,123 unchanged controls.

## Independent review (fix)

- Packet: `engine-cov-pnei-moshe-ysay-b17-fix-review`. Model: `gemini-4-hydrogen-high` (cross-family vs Codex). Started 11:01:31, artifacts complete 11:05:26, ended 11:05:47 Asia/Jerusalem.
- Fix review **SHIP, overall 10.0**, `harmful_error_count=0`.
- S1 10.0, S2 10.0, S3 10.0, S4 10.0, S5 10.0 (overall = min).
- Audited 650/650 changed samples + 2,123 controls (2,773) and a full-form scan of all 992 accepted forms (2,373 occurrences). The four previously flagged sites were confirmed bare. Neighbors `קבלו`, `שום`, and `יהושע` had 0 delta versus unfixed b17. Fresh re-run of `pipeline.test.mjs`: 47/47. Input hashes 96/96.

## Apply

- `/tmp/apply-pnei-b17.py` on the fix pack, `EXPECTED=2373`, `partial_preserved==48`: 48/48 pages written, 2,373 changed tokens vs live 1.0.177, 5,959 already-pointed kept, `partial` preserved on 48 pages (sum 1,845). `yer/Kiddushin`, `bavli/Kiddushin`, and `bsay/Kiddushin` were not written.
- `tests/fixtures/aram4-identity.json` updated for all 3 `ysay/Kiddushin/26.json` rows as above.
- VERSION bumped to 1.0.178; `node tools/data-version.mjs` set DATA_VERSION `6e6d92faf16d`.

- `npm test`: **684/684** on the first run (261.6s).
