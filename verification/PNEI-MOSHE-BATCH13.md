# Pnei Moshe batch 13 — Maaser Sheni (ysay)

Shipped as **1.0.174**, DATA_VERSION `625de0005f10`.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Maaser_Sheni/` on the live 1.0.173 tree (DATA_VERSION `69e4cb946ab4`).
- 33 pages (`1.json`–`33.json`, lex order), nested `say` (`272` outer segments, `22` empty inner arrays at `4:2`, `7:1`, `14:4`, `16:2`, `16:3`, `26:4`, `29:6`, `30:2`–`30:12`, `30:14` — not `30:13` — `32:2`, `32:3`, `32:4`; `1,056` inner strings). All 22 empty inner arrays were preserved in place.
- Raw tokens: `48,197` = `3,453` already pointed + `44,744` bare. All 33 pages have `partial` (`23`–`47`, sum `1,054`); the field was left byte-identical.
- Companion `yer/Maaser_Sheni` used for dseg lookup only; not written. Hash pack: 66 SHA-256 rows (33 ysay + 33 yer), verified 66/66.
- 0 existing `aram4-identity` rows on `gemara/ysay/Maaser_Sheni/`. After apply, the fixture was left untouched (`updated=0`, `unchanged=0`, `skipped=428`). This is not a Chabad-pronunciation rework and is not an `aramLexText` production pass. No ENGINE-COV-1B identity pins.

## Build and gates

- First packet: `engine-cov-pnei-moshe-ysay-b13`. Builder: Codex CLI (`fixRound` 0), started 22 Nov 2026 07:24:22 Asia/Jerusalem, ended 07:27:17, `outcome=OK`, 33 pages. Base tooling `engine-cov-pnei-moshe-ysay-b12-fix` (`lib.mjs` byte-identical to b12-fix, including exact-only through batch 12: `דתודה`, `דבדין`). No new exact-only forms.
- Independent validation (`validate_b13.py`): **VALIDATE_OK**. **2,371 / 41,417** bare candidates considered changed (`5.72%`, `851` unique forms). Gap versus raw bare is `3,327` abbreviations/quotes (`41,417 + 3,327 = 44,744`). 39/39 tests, denylist SHA unchanged (`9bebef55c8aca2bc08b602378450a37955c34e71ca3ed09da087815998d5077b`), 0 changes to `v` / non-say / already-pointed / letters / shape (already-pointed `3,453`). SUMMARY LF-only.
- dseg: modern `0` / rabbinic `1,054` / miss `2`. Denylist `2,631`; quarantine `36,096`; `no_dseg_match` `319` (the two cache-miss inner strings `Maaser_Sheni/4:1:0` with `260` bare tokens and `Maaser_Sheni/9:0:2` with `59` bare tokens; `260 + 59 = 319`), left bare.
- Reconciliation: `2,631 + 36,096 + 2,371 + 319 = 41,417`.
- gzip +6,424. Already-pointed `3,453` unchanged. `v`, key order, nested shape (including all 22 empty arrays), and `partial` preserved on all 33 pages. 0 letter/ktiv changes.
- Samples: 650 changed + 2,987 unchanged controls.

## Independent review

- Packet: `engine-cov-pnei-moshe-ysay-b13-review`. Model: `gemini-4-hydrogen-high` (cross-family vs Codex). Started 07:29:22, artifacts complete 07:36:17, tree killed 07:36:37 Asia/Jerusalem.
- First review **SHIP, overall 9.8**, `harmful_error_count=0`. No fix round.
- S1 10.0, S2 9.9, S3 9.8, S4 10.0, S5 10.0 (overall = min).
- Audited 650/650 changed samples + 350 controls (1,000) and a full-form scan of all 851 accepted forms (2,371 occurrences). 31 accepted `ד-`/initial-`ד` forms (71 occurrences) and 271 `refCount >= 10` bypass forms were scanned with 0 leaks. Inherited exact-only forms stayed bare.
- Fresh re-run of `pipeline.test.mjs`: 39/39. Input hashes 66/66. Pages with nonzero `partial` all received niqqud (min 41, max 135 changed tokens per page).

## Apply

- `/tmp/apply-pnei-b13.py` on the first packet, `EXPECTED=2371`, `partial_preserved==33`: 33/33 pages written, 2,371 changed tokens vs live 1.0.173, 3,453 already-pointed kept, `partial` preserved on 33 pages (sum 1,054).
- `tests/fixtures/aram4-identity.json` not rewritten (`updated=0`).
- `npm test` on the 1.0.174 tree after the VERSION / DATA_VERSION bump: **684/684** on the first run (266.3s).
