# Pnei Moshe batch 32 — Taanit (ysay)

Shipped as **1.0.194**, DATA_VERSION `5bf40d850438`. Built by the PC driver (local `run-pilot.mjs` + independent Gemini review). The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.193 / `55a62d9e0544` (Hayom Yom `50d8529e`) when the version was chosen; 1.0.193 was already taken, so this release is 1.0.194. Terumot b24 and Rosh_Hashanah b27 remain HOLD and were skipped.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Taanit/` on the 1.0.193 tree (DATA_VERSION `55a62d9e0544`).
- 26 pages, nested `say` (270 outer, 31 empty inner arrays; 922 inner).
- Raw tokens: 22,090 = 2,563 already pointed + 19,527 bare. Of the bare baseline, 17,761 were counted after quote/abbreviation split (`bareTokens`). `partial` on all 26 pages (values 14–48, sum 909), left byte-identical. `v` left byte-identical on all 26 pages.
- Companion `yer/Taanit` (26/26, hashes 52/52) was lookup-only. `bavli/Taanit` and `bsay/Taanit` exist and were not written.
- aram4: updated 2, unchanged 2, skipped 424. `tests/fixtures/aram4-identity.json` refreshed for two Taanit/13.json rows (hashes + Chabad/Israeli speech).
- ENGINE-COV-1B: no pin on this tractate.

## Gates

- Independent first validation: 1,220 changed / 19,527 bare (569 forms). First review (`gemini-4-hydrogen-high`): **HOLD 9.0**, harmful_error_count=6. Exact-only forms inserted in fix round 1 of 2: `מצחו`, `מכחן`, `בצלוי`, `להכשר`, `נולדה`.
- After fix 1: 1,214 / 19,527 (564 forms). Fix review 1: **HOLD 8.5**, harmful_error_count=2. Exact-only forms inserted in fix round 2 of 2: `התלמוד`, `לחזות`.
- After fix 2: 1,212 changed / 19,527 bare (562 forms), samples 650+1,644. dseg: modern 0, rabbinic 922, miss 0. Yield 6.82%.
- Independent fix2 review (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0. S1–S5 = 10.0/10.0/9.9/10.0/10.0. 896 tokens audited; 562 unique forms scanned.
- Apply: 26/26 pages, 1,212 tokens vs live 1.0.193, 2,563 already-pointed kept, 26 partial pages preserved. No `yer`/`bavli`/`bsay` writes.
- `npm test`: 708/708 in 267.62s on the Linux box after recomputing DATA_VERSION with `node tools/data-version.mjs` (count rose after Hayom Yom 1.0.193 tests).
