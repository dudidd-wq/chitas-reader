# Pnei Moshe batch 10 — Gittin (ysay)

Shipped as **1.0.171**, DATA_VERSION `42c99f9633c7`.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Gittin/` on the live 1.0.170 tree (DATA_VERSION `3cf0561a540f`).
- 54 pages (`1.json`–`54.json`, lex order), nested `say` (`401` outer segments, `3` empty, `2,407` inner strings).
- Raw tokens: `61,828` = `7,020` already pointed + `54,808` bare. All 54 pages have `partial` (`22`–`70`, sum `2,377`); the field was left byte-identical.
- Companion `yer/Gittin` used for dseg lookup only; not written. Hash pack: 108 SHA-256 rows (54 ysay + 54 yer), verified 108/108.
- Six existing `aram4-identity` rows on `gemara/ysay/Gittin/43.json`. After apply, 4 rows were refreshed (`say[1][0]`, `say[1][1]`, `say[2][0]`, `say[2][1]`; say / pass / Israeli IPA / Chabad IPA hashes) and 2 were unchanged (`say[0][0]`, `say[0][1]`). 422 other fixture rows skipped. Fixture rewritten only because `updated=4`. This is not a Chabad-pronunciation rework and is not an `aramLexText` production pass. No ENGINE-COV-1B identity pins.

## Build and gates

- Packet: `engine-cov-pnei-moshe-ysay-b10`. Builder: Codex CLI (`fixRound` 0). Base tooling `engine-cov-pnei-moshe-ysay-b9` (`lib.mjs` byte-identical to b9, b8, and `b7-fix2`).
- Independent validation (`validate_b10.py`): **VALIDATE_OK**, errors 0.
- Applied: **2,939 / 49,992** bare tokens considered (`5.88%`, `1,025` unique forms). Gap versus raw bare is `4,816` abbreviations/quotes (`49,992 + 4,816 = 54,808`).
- dseg: modern `0` / rabbinic `2,405` / miss `2`. Denylist `1,821`; quarantine `45,182`; `no_dseg_match` `50`.
- Reconciliation: `1,821 + 45,182 + 2,939 + 50 = 49,992`. The 50-token remainder is the two cache-miss inner strings `Gittin/21:0:8` (24 bare tokens) and `Gittin/35:3:5` (26 bare tokens), left bare.
- gzip +7,395. Already-pointed `7,020` unchanged. `v`, key order, nested shape, and `partial` preserved on all 54 pages. 0 letter/ktiv changes.
- Tests in the packet: 38/38 after the final LF-only SUMMARY. Denylist SHA unchanged (`9bebef55c8aca2bc08b602378450a37955c34e71ca3ed09da087815998d5077b`). `newExactOnlyForms` empty. Inherited exact-only forms through batch 7 retained, including `הטיב`, `קצצתי`, `להשכיר`.
- Samples: 650 changed + 2,243 unchanged controls.

## Independent review

- Packet: `engine-cov-pnei-moshe-ysay-b10-review`. Model: `gemini-4-hydrogen-high` (cross-family vs Codex).
- First review **SHIP, overall 10.0**, `harmful_error_count=0`. No fix round.
- S1 10.0, S2 10.0, S3 10.0, S4 10.0, S5 10.0 (overall = min).
- Audited 650/650 changed samples, all 2,243 controls, and a full-form scan of all 1,025 accepted forms.
- Fresh re-run of `pipeline.test.mjs`: 38/38. Input hashes 108/108. Pages with nonzero `partial` all received niqqud.
- Two non-harmful source-text editorial observations (did not block, not added as exact-only): `והתנה`→`וְהִתְנָה` at `43:5:5` (letter-preserving past-tense reading of a Pietrkov gender-agreement slip); `נבדקה`→`נִבְדְּקָה` at `54:5:2` (standard Nifal 3fs; adjacent typo `הקינ` stayed bare).

## Apply

- `/tmp/apply-pnei-b10.py`: 54/54 pages written, 2,939 changed tokens vs live 1.0.170, 7,020 already-pointed kept, `partial` preserved on 54 pages (sum 2,377).
- `tests/fixtures/aram4-identity.json` updated for 4 of 6 `ysay/Gittin/43.json` rows as above.
- `npm test` on the 1.0.171 tree after the VERSION / DATA_VERSION bump: **684/684** on the first run.

