# Pnei Moshe batch 18 — Bava Metzia (ysay)

Shipped as **1.0.179**, DATA_VERSION `64d6d29dd496`.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Bava_Metzia/` on the live 1.0.178 tree (DATA_VERSION `6e6d92faf16d`).
- 37 pages (`1.json`–`37.json`, lex order), nested `say` (`308` outer segments, `2` empty inner arrays at `28:4` and `34:9`; `1,623` inner strings). Both empty inner arrays were preserved in place.
- Raw tokens: `46,766` = `4,526` already pointed + `42,240` bare. All 37 pages have `partial` (`18`–`72`, sum `1,593`); the field was left byte-identical.
- Companion `yer/Bava_Metzia` (37/37 pages, 0 length mismatches) was used for dseg lookup only and was not written. This is not `bavli/Bava_Metzia` / `bsay/Bava_Metzia` (a different 235-page Bavli tractate; Steinsaltz `bsay/Bava_Metzia` already shipped as 1.0.157). Hash pack: 74 SHA-256 rows (37 ysay + 37 yer, lex), verified 74/74.
- Five existing `aram4-identity` rows on `gemara/ysay/Bava_Metzia/2.json`. After apply, 3 rows were refreshed (`say[0][0]`, `say[0][1]`, `say[2][0]`; say / pass / Israeli IPA / Chabad IPA hashes) and 2 were unchanged (`say[1][0]`, `say[1][1]`). 423 other fixture rows skipped. Fixture rewritten because `updated=3`. This is not a Chabad-pronunciation rework and is not an `aramLexText` production pass. No ENGINE-COV-1B identity pins.

## Build and gates

- First packet: `engine-cov-pnei-moshe-ysay-b18`. Builder: Codex CLI (`fixRound` 0), started 22 Nov 2026 11:24:26 Asia/Jerusalem, ended 11:28:42, `outcome=OK`, 37 pages. Base tooling `engine-cov-pnei-moshe-ysay-b17-fix` (`lib.mjs` then byte-identical to b17-fix, including exact-only through batch 17: `יקבלו`, `השום`, `דיהושע`).
- Independent validation of the first packet: 2,332 / 39,231 (`5.94%`, 980 forms), 47/47 tests, denylist SHA unchanged, 0 changes to `v` / non-say / already-pointed / letters / shape. Gap versus raw bare is `3,009` abbreviations/quotes (`39,231 + 3,009 = 42,240`). Reconciliation: `1,419 + 34,978 + 502 + 2,332 = 39,231`. dseg: rabbinic 1,601 / modern 0 / miss 22. All 502 `no_dseg_match` tokens sit inside those 22 missed segments (0 alignment misses inside the 1,601 hit segments).
- First independent review (`engine-cov-pnei-moshe-ysay-b18-review`, `gemini-4-hydrogen-high`, 11:30:25–11:38:11 Asia/Jerusalem): **HOLD 9.2**, `harmful_error_count=1` (1 token occurrence, 1 unique harmful form, found in the full-form scan, not inside the 650-sample). S1 10.0, S2 9.2, S3 9.8, S4 9.9, S5 9.4. Audited 650/650 samples + 1,692 controls and a full-form scan of all 980 forms.
  - `והשום`→`וְהַשּׁוּם` at `21:3:6[10]` (Pietrkov variant/corruption for a verb/participle reading emending `וְהִשְׁוָה עָלָיו`, not the definite noun "and the garlic" / "and the appraisal"). Inherited exact-only `השום` did not cover the `ו-` prefixed form, and `refCount = 15 >= 10` bypassed `checkStemHomographRisk` on stem `שום`.
- Non-harmful observation: `שהגביה`→`שֶׁהִגְבִּיהַּ` at `2:6:2#22` is contextually correct and was left unchanged.
- Fix packet: `engine-cov-pnei-moshe-ysay-b18-fix`. Builder: Codex CLI, fail-closed fix round 1 of 2, started 11:40:10, ended 11:42:51 Asia/Jerusalem. The only `lib.mjs` change versus unfixed b18 is adding exact-only `והשום` to `UNCERTAIN_ATTESTATION_FORMS` (416→417 lines, 18,771→18,787 bytes). `HEBREW_PREFIXES`, `refCount >= 10`, and denylist contents were not changed. Stems `שום` / `שהגביה` were not added to KNOWN, `PROPER_NAME_STEMS`, or exact-only. Inherited exact-only `השום` was not broadened into a stem.
- Independent validation of the fix: **VALIDATE_OK**, **2,331 / 39,231** (`5.94%`, `979` unique forms). The only token-level delta versus the unfixed dry-run is that one site returning to the live bare string. dseg modern `0` / rabbinic `1,601` / miss `22` (502 tokens). Denylist `1,419`; quarantine `34,979` (previous `34,978` plus the one newly exact-only token); cache/alignment misses `502`.
- Reconciliation: `1,419 + 34,979 + 502 + 2,331 = 39,231`.
- gzip +6,636. Already-pointed `4,526` unchanged. `v`, key order, nested shape (including both empty arrays), and `partial` preserved on all 37 pages. 0 letter/ktiv changes.
- Tests in the fix packet: 51/51 after the final LF-only SUMMARY (the unfixed packet was 47/47; this packet added regressions). Denylist SHA unchanged (`9bebef55c8aca2bc08b602378450a37955c34e71ca3ed09da087815998d5077b`). `newExactOnlyForms`: `והשום`.
- Samples: 650 changed + 1,693 unchanged controls.

## Independent review (fix)

- Packet: `engine-cov-pnei-moshe-ysay-b18-fix-review`. Model: `gemini-4-hydrogen-high` (cross-family vs Codex). Started 11:44:07, artifacts complete by 11:48:58 Asia/Jerusalem (agy ended 11:48:58).
- Fix review **SHIP, overall 9.8**, `harmful_error_count=0`.
- S1 10.0, S2 9.9, S3 10.0, S4 10.0, S5 9.8 (overall = min).
- Audited 650/650 changed samples + 1,693 controls and a full-form scan of all 979 accepted forms. The previously flagged `והשום` site was confirmed bare. Fresh re-run of `pipeline.test.mjs`: 51/51. Input hashes 74/74.

## Apply

- `/tmp/apply-pnei-b18.py` on the fix pack, `EXPECTED=2331`, `partial_preserved==37`: 37/37 pages written, 2,331 changed tokens vs live 1.0.178, 4,526 already-pointed kept, `partial` preserved on 37 pages (sum 1,593). `yer/Bava_Metzia`, `bavli/Bava_Metzia`, and `bsay/Bava_Metzia` were not written.
- `tests/fixtures/aram4-identity.json` updated for 3 of 5 `ysay/Bava_Metzia/2.json` rows as above (`updated=3`, `unchanged=2`, `skipped=423`).
- VERSION bumped to 1.0.179; `node tools/data-version.mjs` set DATA_VERSION `64d6d29dd496`.

- `npm test`: **684/684** on the first run (273.5s).
