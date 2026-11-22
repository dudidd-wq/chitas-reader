# Pnei Moshe batch 28 — Sukkah (ysay)

Shipped as **1.0.188**, DATA_VERSION `bb8b7768d2d5`. Built by the PC driver (local `run-pilot.mjs` + independent Gemini review). The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box. Origin/main was 1.0.187 when the version was chosen (personal-Tehillim shell bump; DATA_VERSION was still `26eb189ab8b6`). Terumot b24 and Rosh_Hashanah b27 remain HOLD and were skipped.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Sukkah/` on the 1.0.187 tree (DATA_VERSION `26eb189ab8b6`).
- 26 pages, nested `say` (230 outer, 16 empty inner arrays; 907 inner).
- Raw tokens: 31,788 = 2,502 already pointed + 29,286 bare. Of the bare baseline, 26,855 were counted after quote/abbreviation split (`bareTokens`). `partial` on all 26 pages (values 15–52, sum 903), left byte-identical. `v` left byte-identical on all 26 pages.
- Companion `yer/Sukkah` (26/26, hashes 52/52) was lookup-only. `bavli/Sukkah` and `bsay/Sukkah` exist and were not written.
- aram4: updated 0, unchanged 0, skipped 428. No `aram4-identity.json` change.
- ENGINE-COV-1B: no pin on this tractate.

## Gates

- Independent first validation: 1,700 changed / 29,286 bare (710 forms). First review (`gemini-4-hydrogen-high`): **HOLD 8.8**, harmful_error_count=4. Exact-only forms inserted in fix round 1 of 2: `כלול`, `נחלתו`, `ואיתן`.
- After the fix: 1,696 changed / 29,286 bare (707 forms), samples 650+1,745. dseg: modern 0, rabbinic 906, miss 1. Yield 6.32%.
- Independent fix review (`gemini-4-hydrogen-high`): **SHIP 9.8**, harmful_error_count=0. S1–S5 = 10.0/9.9/10.0/10.0/9.8. 650 tokens audited; 707 unique forms scanned.
- Apply: 26/26 pages, 1,696 tokens vs live 1.0.187, 2,502 already-pointed kept, 26 partial pages preserved. No `yer`/`bavli`/`bsay` writes.
- `npm test`: 702/702 in 310.42s on the Linux box after recomputing DATA_VERSION with `node tools/data-version.mjs`. Passed on the first run (no pitch-192 flake). Count is 702 after the 1.0.187 personal-Tehillim tests.
