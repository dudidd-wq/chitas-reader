# Pnei Moshe batch 12 — Sotah (ysay)

Shipped as **1.0.173**, DATA_VERSION `69e4cb946ab4`.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Sotah/` on the live 1.0.172 tree (DATA_VERSION `2d062ba0dae1`).
- 47 pages (`1.json`–`47.json`, lex order), nested `say` (`427` outer segments, `5` empty at `18:7`–`18:11`, `2,504` inner strings). The 5 empty inner arrays were preserved in place.
- Raw tokens: `54,121` = `6,514` already pointed + `47,607` bare. All 47 pages have `partial` (`17`–`87`, sum `2,485`); the field was left byte-identical.
- Companion `yer/Sotah` used for dseg lookup only; not written. Hash pack: 94 SHA-256 rows (47 ysay + 47 yer), verified 94/94.
- Six existing `aram4-identity` rows on `gemara/ysay/Sotah/22.json`. After apply, 2 rows were refreshed (`say[2][0]`, `say[2][1]`; say / pass / Israeli IPA / Chabad IPA hashes) and 4 were unchanged (`say[0][0]`, `say[0][1]`, `say[1][0]`, `say[1][1]`). 422 other fixture rows skipped. Fixture rewritten only because `updated=2`. This is not a Chabad-pronunciation rework and is not an `aramLexText` production pass. No ENGINE-COV-1B identity pins.

## Build and gates

- First packet: `engine-cov-pnei-moshe-ysay-b12`. Builder: Codex CLI (`fixRound` 0). Base tooling `engine-cov-pnei-moshe-ysay-b11-fix` (`lib.mjs` then byte-identical to b11-fix, including exact-only through batch 11).
- Independent validation of the first packet: 2,857 / 42,928 (`6.66%`, 1,199 forms), 39/39 tests, denylist SHA unchanged, 0 changes to `v` / non-say / already-pointed / letters / shape. A leftover validator flag `already-pointed count 6514 != 5394` was a stale Yoma constant, not a packet defect.
- First independent review (`engine-cov-pnei-moshe-ysay-b12-review`, `gemini-4-hydrogen-high`): **HOLD 8.8**, `harmful_error_count=2`. S1 10.0, S2 9.8, S3 8.8, S4 9.8, S5 10.0. The 650-sample had 0 harmful; the 2 errors were found in the full-form scan of all 1,199 accepted forms (one occurrence each), both from `HEBREW_PREFIXES` omitting Aramaic `ד-`:
  - `דתודה`→`דְּתוֹדָה` at `6:5:4:45` (should be `דְּתוֹדֶה` “that she confess”; bare neighbor `תודה` at `6:5:4:42` stayed bare).
  - `דבדין`→`דִּבְדִין` at `7:7:2:4` (should be `ד-` + `בַּדִּין` “branches/strands”; neighbor `בדין` at `7:7:2:5` stayed bare).
- Fix packet: `engine-cov-pnei-moshe-ysay-b12-fix`. Builder: Codex CLI, fail-closed fix round 1 of 2. The only `lib.mjs` change versus unfixed b12 is adding exact-only `דתודה`, `דבדין` to `UNCERTAIN_ATTESTATION_FORMS` (411→412 lines). `HEBREW_PREFIXES`, `refCount >= 10`, and denylist contents were not changed. Stems `תודה` / `בדין` were not added to KNOWN.
- Independent validation of the fix: **VALIDATE_OK**, **2,855 / 42,928** bare tokens considered (`6.65%`, `1,197` unique forms). The only token-level delta versus the unfixed dry-run is those two sites returning to the live bare strings. Named neighbors are byte-identical to the unfixed packet. Gap versus raw bare is `4,679` abbreviations/quotes (`42,928 + 4,679 = 47,607`).
- dseg: modern `0` / rabbinic `2,502` / miss `2`. Denylist `2,243`; quarantine `37,337` (previous `37,335` plus the two newly exact-only tokens); `no_dseg_match` `493` (the two cache-miss inner strings `20:1[12]` + `24:2[2]`).
- Reconciliation: `2,243 + 37,337 + 2,855 + 493 = 42,928`.
- gzip +6,950. Already-pointed `6,514` unchanged. `v`, key order, nested shape (including all 5 empty arrays), and `partial` preserved on all 47 pages. 0 letter/ktiv changes.
- Tests in the fix packet: 41/41 after the final LF-only SUMMARY (the unfixed packet was 39/39; this packet added regressions). Denylist SHA unchanged (`9bebef55c8aca2bc08b602378450a37955c34e71ca3ed09da087815998d5077b`). `newExactOnlyForms`: `דתודה`, `דבדין`. Inherited exact-only forms through batch 11 retained.
- Samples: 650 changed + 2,745 unchanged controls.

## Independent review (fix)

- Packet: `engine-cov-pnei-moshe-ysay-b12-fix-review`. Model: `gemini-4-hydrogen-high` (cross-family vs Codex).
- Fix review **SHIP, overall 9.8**, `harmful_error_count=0`.
- S1 10.0, S2 9.9, S3 9.8, S4 9.9, S5 10.0 (overall = min).
- Audited 650/650 changed samples + 306 controls (956) and a full-form scan of all 1,197 accepted forms (2,855 occurrences). The two repaired sites were verified bare; named neighbors kept unfixed-packet behavior.
- Fresh re-run of `pipeline.test.mjs`: 41/41. Input hashes 94/94. Pages with nonzero `partial` all received niqqud.

## Apply

- `/tmp/apply-pnei-b12.py` on the fix pack, `EXPECTED=2855`, `partial_preserved==47`: 47/47 pages written, 2,855 changed tokens vs live 1.0.172, 6,514 already-pointed kept, `partial` preserved on 47 pages (sum 2,485).
- `tests/fixtures/aram4-identity.json` updated for 2 of 6 `ysay/Sotah/22.json` rows as above.
- `npm test` on the 1.0.173 tree after the VERSION / DATA_VERSION bump: **684/684** on the first run (263.2s).
