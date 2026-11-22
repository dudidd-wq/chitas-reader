# Pnei Moshe batch 9 — Nazir (ysay)

Shipped as **1.0.170**, DATA_VERSION `3cf0561a540f`.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Nazir/` on the live 1.0.169 tree (DATA_VERSION `eaef44e8cdb4`).
- 47 pages (`1.json`–`47.json`, lex order), nested `say` (`351` outer segments, `5` empty, `2,107` inner strings).
- Raw tokens: `63,002` = `7,227` already pointed + `55,775` bare. All 47 pages have `partial` (`21`–`78`, sum `2,089`); the field was left byte-identical.
- Companion `yer/Nazir` used for dseg lookup only; not written. Hash pack: 94 SHA-256 rows (47 ysay + 47 yer), verified 94/94.
- No `aram4-identity` rows for `ysay/Nazir` (0 updated / 428 skipped). No ENGINE-COV-1B identity pins.

## Build and gates

- Packet: `engine-cov-pnei-moshe-ysay-b9`. Builder: Codex CLI (`fixRound` 0). Base tooling `engine-cov-pnei-moshe-ysay-b8` (`lib.mjs` byte-identical; b8 itself is identical to `b7-fix2`).
- Independent validation (`validate_b9.py`): **VALIDATE_OK**, errors 0.
- Applied: **3,255 / 52,836** bare tokens considered (`6.16%`, `884` unique forms). Gap versus raw bare is `2,939` abbreviations/quotes (`52,836 + 2,939 = 55,775`).
- dseg: modern `0` / rabbinic `2,106` / miss `1`. Denylist `2,861`; quarantine `46,706`; `no_dseg_match` `14`.
- Reconciliation: `2,861 + 46,706 + 3,255 + 14 = 52,836`. The 14-token remainder is the single cache-miss inner string `Nazir/14:1:3`, left bare.
- gzip +7,038. Already-pointed `7,227` unchanged. `v`, key order, nested shape, and `partial` preserved on all 47 pages. 0 letter/ktiv changes.
- Tests in the packet: 38/38 after the final LF-only SUMMARY. Denylist SHA unchanged (`9bebef55c8aca2bc08b602378450a37955c34e71ca3ed09da087815998d5077b`). `newExactOnlyForms` empty. Inherited exact-only forms through batch 7 retained, including `הטיב`, `קצצתי`, `להשכיר`.
- Samples: 650 changed + 3,371 unchanged controls.

## Independent review

- Packet: `engine-cov-pnei-moshe-ysay-b9-review`. Model: `gemini-4-hydrogen-high` (cross-family vs Codex).
- First review **SHIP, overall 9.8**, `harmful_error_count=0`. No fix round.
- S1 10.0, S2 10.0, S3 9.9, S4 9.8, S5 10.0 (overall = min).
- Audited 650/650 changed samples, all 3,371 controls, and a full-form scan of all 884 accepted forms.
- Fresh re-run of `pipeline.test.mjs`: 38/38. Input hashes 94/94. Pages with nonzero `partial` all received niqqud (`33`–`154` tokens per page).
- Five non-harmful flags (did not block): tractate citations `דתרומות`→`דִּתְרוּמוֹת` (7 occurrences) and `דכלים`→`דְּכֵלִים` at `38:1:4:3`; section/chapter titles `רוצחים`→`רוֹצְחִים` at `24:9:5:30` / `25:0:5:30` and `הנשרפין`→`הַנִּשְׂרָפִין` at `47:1:5:18`; defective Pietrkov spelling `שכונתו`→`שֶׁכַּוָּנָתוֹ` at `1:2:5:4`. All five are contextually accurate and were not added as exact-only forms.

## Apply

- `/tmp/apply-pnei-b9.py`: 47/47 pages written, 3,255 changed tokens vs live 1.0.169, 7,227 already-pointed kept, `partial` preserved on 47 pages (sum 2,089).
- No production `aramLexText` pass. Fixture `tests/fixtures/aram4-identity.json` not rewritten (`updated=0`).
- `npm test` on the 1.0.170 tree after the VERSION / DATA_VERSION bump: first run 683/684 failed only on a flaky `voice-node` rate-duration assertion (`int8 model: a verse gives non-silent audio of plausible length; rate shortens it`), unrelated to ysay/Nazir or ENGINE-COV-1B (those passed). Retry: **684/684**.

