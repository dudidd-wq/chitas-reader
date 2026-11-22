# Pnei Moshe batch 15 — Shekalim Bavli (ysay)

Shipped as **1.0.176**, DATA_VERSION `9d0cf34d91cf`.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Shekalim_Bavli/` on the live 1.0.175 tree (DATA_VERSION `8373d8738fc9`).
- 42 pages with Bavli daf names (`2a.json`–`22b.json`; lex order starts at `10a.json` and ends at `9b.json`), nested `say` (`267` outer segments, `39` empty inner arrays at `14a:2`, `14a:8`, `14a:9`, `14b:0`, `15a:4`, `15a:5`, `15a:6`, `15a:7`, `15a:8`, `15a:9`, `15a:10`, `15a:11`, `15b:0`, `16a:1`, `16a:2`, `16a:3`, `16a:4`, `16a:5`, `16a:6`, `16b:0`, `16b:1`, `16b:2`, `16b:3`, `16b:4`, `21b:4`, `6b:1`, `6b:2`, `6b:3`, `6b:4`, `7a:0`, `7a:1`, `7b:1`, `8b:2`, `8b:3`, `8b:4`, `8b:5`, `8b:6`, `9a:0`, and `9a:1`; `1,148` inner strings). All 39 empty inner arrays were preserved in place.
- Raw tokens: `46,897` = `3,608` already pointed + `43,289` bare. All 42 pages have `partial` (`1`–`44`, sum `1,146`); the field was left byte-identical.
- There is no `yer/Shekalim_Bavli`. Companion `bavli/Shekalim` (42 pages, same daf names, 0 length mismatches, `segs` shaped like `yer`) was used for dseg lookup only and was not written. This is not `ysay/Shekalim` / `yer/Shekalim` (a different 33-page tractate). Hash pack: 84 SHA-256 rows (42 ysay + 42 bavli), verified 84/84.
- Six existing `aram4-identity` rows on `gemara/ysay/Shekalim_Bavli/12b.json`. After apply, 5 rows were refreshed (`say[0][0]`, `say[0][1]`, `say[1][1]`, `say[2][0]`, `say[2][1]`; say / pass / Israeli IPA / Chabad IPA hashes) and 1 was unchanged (`say[1][0]`). 422 other fixture rows skipped. Fixture rewritten because `updated=5`. This is not a Chabad-pronunciation rework and is not an `aramLexText` production pass. No ENGINE-COV-1B identity pins.

## Build and gates

- First packet: `engine-cov-pnei-moshe-ysay-b15`. Builder: Codex CLI (`fixRound` 0), started 22 Nov 2026 09:07:00 Asia/Jerusalem, ended 09:11:41, `outcome=OK`, 42 pages. Base tooling `engine-cov-pnei-moshe-ysay-b14-fix` (`lib.mjs` then byte-identical to b14-fix, including exact-only through batch 14: `דגרר`, `הורו`).
- Independent validation of the first packet: 2,816 / 40,093 (`7.02%`, 933 forms), 41/41 tests, denylist SHA unchanged, 0 changes to `v` / non-say / already-pointed / letters / shape. Gap versus raw bare is `3,196` abbreviations/quotes (`40,093 + 3,196 = 43,289`). Reconciliation: `2,222 + 35,055 + 2,816 + 0 = 40,093` (dseg miss 0; rabbinic 1,148 / modern 0).
- First independent review (`engine-cov-pnei-moshe-ysay-b15-review`, `gemini-4-hydrogen-high`, 09:13:00–09:20:37 Asia/Jerusalem): **HOLD 8.5**, `harmful_error_count=3` (4 token occurrences). S1 10, S2 10, S3 8.5, S4 8.7, S5 10. Audited 650/650 samples + 2,561 controls (3,211) and a full-form scan of all 933 forms. All three errors were outside the sample, all from `refCount >= 10` prefix-stem homograph bypasses:
  - `בשנתן`→`בְּשֶׁנָּתַן` at `8a:1:6:136` (should be `בִּשְׁנָתָן`, "in their year"; companion `בְּנֵי שְׁנָתָן`).
  - `ולמי`→`וּלְמִי` at `17a:2:8:34` and `17a:2:8:53` (should be `וּלְמֵי חטאת`).
  - `שמאלו`→`שְׂמֹאלוֹ` at `8a:2:1:19` (should be `שֶׁמֵּאֵלּוּ`, "that from these").
- Fix packet: `engine-cov-pnei-moshe-ysay-b15-fix`. Builder: Codex CLI, fail-closed fix round 1 of 2, started 09:22:46, ended 09:25:47 Asia/Jerusalem. The only `lib.mjs` change versus unfixed b15 is adding exact-only `בשנתן`, `ולמי`, `שמאלו` to `UNCERTAIN_ATTESTATION_FORMS` (413→414 lines). `HEBREW_PREFIXES`, `refCount >= 10`, and denylist contents were not changed. Stems `שנתן` / `למי` / `מאלו` / `שמאל` were not added to KNOWN or `PROPER_NAME_STEMS`. Named neighbors `שנתן`, `למי`, and `מאלו` stayed bare.
- Independent validation of the fix: **VALIDATE_OK**, **2,812 / 40,093** (`7.01%`, `930` unique forms). The only token-level delta versus the unfixed dry-run is those four sites returning to the live bare strings. dseg modern `0` / rabbinic `1,148` / miss `0`. Denylist `2,222`; quarantine `35,059` (previous `35,055` plus the four newly exact-only tokens); `no_dseg_match` `0`.
- Reconciliation: `2,222 + 35,059 + 2,812 + 0 = 40,093`.
- gzip +7,555. Already-pointed `3,608` unchanged. `v`, key order, nested shape (including all 39 empty arrays), and `partial` preserved on all 42 pages. 0 letter/ktiv changes.
- Tests in the fix packet: 43/43 after the final LF-only SUMMARY (the unfixed packet was 41/41; this packet added regressions). Denylist SHA unchanged (`9bebef55c8aca2bc08b602378450a37955c34e71ca3ed09da087815998d5077b`). `newExactOnlyForms`: `בשנתן`, `ולמי`, `שמאלו`.
- Samples: 650 changed + 2,533 unchanged controls.

## Independent review (fix)

- Packet: `engine-cov-pnei-moshe-ysay-b15-fix-review`. Model: `gemini-4-hydrogen-high` (cross-family vs Codex). Started 09:26:37, artifacts complete 09:32:18, ended 09:32:39 Asia/Jerusalem.
- Fix review **SHIP, overall 9.8**, `harmful_error_count=0`.
- S1 10, S2 10, S3 9.9, S4 9.8, S5 10 (overall = min).
- Audited 650/650 changed samples + 2,533 controls (3,183) and a full-form scan of all 930 accepted forms (2,812 occurrences). The four previously harmful sites were confirmed bare. Fresh re-run of `pipeline.test.mjs`: 43/43. Input hashes 84/84.

## Apply

- `/tmp/apply-pnei-b15.py` on the fix pack, `EXPECTED=2812`, `partial_preserved==42`: 42/42 pages written, 2,812 changed tokens vs live 1.0.175, 3,608 already-pointed kept, `partial` preserved on 42 pages (sum 1,146). `bavli/Shekalim` was not written.
- `tests/fixtures/aram4-identity.json` updated for 5 of 6 `ysay/Shekalim_Bavli/12b.json` rows as above.
- VERSION bumped to 1.0.176; `node tools/data-version.mjs` set DATA_VERSION `9d0cf34d91cf`.
