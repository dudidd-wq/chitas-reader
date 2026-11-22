# Pnei Moshe batch 31 — Moed Katan (ysay)

Shipped as **1.0.192**, DATA_VERSION `372d9e0657fb`. Built by the PC driver (local `run-pilot.mjs` + independent Gemini review). The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree so uncommitted files in `/workspace/chitas-reader` (including a possible concurrent Hayom Yom fix) were not touched. Origin/main was 1.0.191 / `70373dff2438` (`9df2d3b3`) when the version was chosen. Terumot b24 and Rosh_Hashanah b27 remain HOLD and were skipped.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Moed_Katan/` on the 1.0.191 tree (DATA_VERSION `70373dff2438`).
- 19 pages, nested `say` (178 outer, 14 empty inner arrays; 768 inner).
- Raw tokens: 22,049 = 2,111 already pointed + 19,938 bare. Of the bare baseline, 18,394 were counted after quote/abbreviation split (`bareTokens`). `partial` on all 19 pages (values 26–57, sum 766), left byte-identical. `v` left byte-identical on all 19 pages.
- Companion `yer/Moed_Katan` (19/19, hashes 38/38) was lookup-only. `bavli/Moed_Katan` and `bsay/Moed_Katan` exist and were not written.
- aram4: updated 2, unchanged 4, skipped 422. `tests/fixtures/aram4-identity.json` refreshed for two Moed_Katan/4.json rows (hashes + Chabad/Israeli speech).
- ENGINE-COV-1B: no pin on this tractate.

## Gates

- Independent first validation: 1,221 changed / 19,938 bare (520 forms). First review (`gemini-4-hydrogen-high`): **HOLD 9.2**, harmful_error_count=4. Exact-only forms inserted in fix round 1 of 2: `הצדים`, `סיפר`, `לקפלו`.
- After fix 1: 1,217 changed / 19,938 bare (517 forms), samples 650+1,134. dseg: modern 0, rabbinic 768, miss 0. Yield 6.62%.
- Independent fix review (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0. S1–S5 = 10.0/10.0/10.0/9.9/9.9. 1,784 tokens audited (650+1,134); 517 unique forms scanned. No second fix round.
- Apply: 19/19 pages, 1,217 tokens vs live 1.0.191, 2,111 already-pointed kept, 19 partial pages preserved. No `yer`/`bavli`/`bsay` writes.
- `npm test`: 704/704 in 283.75s on the Linux box after recomputing DATA_VERSION with `node tools/data-version.mjs`.
