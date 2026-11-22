# Pnei Moshe batch 29 — Chagigah (ysay)

Shipped as **1.0.190**, DATA_VERSION `49d256258333`. Built by the PC driver (local `run-pilot.mjs` + independent Gemini review). The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree so a concurrent Ezra-font working tree was not touched. Origin/main was 1.0.188 when the version was chosen; a concurrent Ezra release took 1.0.189 (`e53e862f`, DATA_VERSION still `bb8b7768d2d5`), so this release is 1.0.190. Terumot b24 and Rosh_Hashanah b27 remain HOLD and were skipped.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Chagigah/` on the 1.0.188 tree (DATA_VERSION `bb8b7768d2d5`).
- 22 pages, nested `say` (169 outer, 20 empty inner arrays; 716 inner).
- Raw tokens: 25,814 = 2,002 already pointed + 23,812 bare. Of the bare baseline, 22,106 were counted after quote/abbreviation split (`bareTokens`). `partial` on all 22 pages (values 5–52, sum 715), left byte-identical. `v` left byte-identical on all 22 pages.
- Companion `yer/Chagigah` (22/22, hashes 44/44) was lookup-only. `bavli/Chagigah` and `bsay/Chagigah` exist and were not written.
- aram4: updated 0, unchanged 0, skipped 428. No `aram4-identity.json` change.
- ENGINE-COV-1B: no pin on this tractate.

## Gates

- Independent first validation: 1,344 changed / 23,812 bare (538 forms). First review (`gemini-4-hydrogen-high`): **HOLD 9.3**, harmful_error_count=1. Exact-only form inserted in fix round 1 of 2: `תיבת`.
- After fix 1: 1,343 / 23,812 (537 forms). Fix review: **HOLD 8.8**, harmful_error_count=2. Exact-only forms inserted in fix round 2 of 2: `המשתין`, `המשחה`.
- After fix 2: 1,341 changed / 23,812 bare (535 forms), samples 650+1,334. dseg: modern 0, rabbinic 715, miss 1. Yield 6.07%.
- Independent fix2 review (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0. S1–S5 = 10.0/10.0/9.9/10.0/10.0. 650 tokens audited; 535 unique forms scanned.
- Apply: 22/22 pages, 1,341 tokens vs live 1.0.188, 2,002 already-pointed kept, 22 partial pages preserved. No `yer`/`bavli`/`bsay` writes.
- `npm test`: 704/704 in 288.05s on the Linux box after rebasing onto 1.0.189 and recomputing DATA_VERSION with `node tools/data-version.mjs`.
