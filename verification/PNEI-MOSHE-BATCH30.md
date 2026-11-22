# Pnei Moshe batch 30 — Beitzah (ysay)

Shipped as **1.0.191**, DATA_VERSION `70373dff2438`. Built by the PC driver (local `run-pilot.mjs` + independent Gemini review). The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.190 / `49d256258333` when the version was chosen (`49a1b583` over Chagigah `7b415932`). Terumot b24 and Rosh_Hashanah b27 remain HOLD and were skipped.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Beitzah/` on the 1.0.190 tree (DATA_VERSION `49d256258333`).
- 22 pages, nested `say` (216 outer, 15 empty inner arrays; 902 inner).
- Raw tokens: 25,854 = 2,706 already pointed + 23,148 bare. Of the bare baseline, 20,832 were counted after quote/abbreviation split (`bareTokens`). `partial` on all 22 pages (values 21–68, sum 890), left byte-identical. `v` left byte-identical on all 22 pages.
- Companion `yer/Beitzah` (22/22, hashes 44/44) was lookup-only. `bavli/Beitzah` and `bsay/Beitzah` exist and were not written.
- aram4: updated 0, unchanged 0, skipped 428. No `aram4-identity.json` change.
- ENGINE-COV-1B: no pin on this tractate.

## Gates

- Independent first validation: 1,387 changed / 23,148 bare (645 forms), samples 650+1,032. dseg: modern 0, rabbinic 900, miss 2. Yield 6.66%.
- Independent first review (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0. S1–S5 = 10.0/10.0/9.9/9.9/10.0. 650 tokens audited; 645 unique forms scanned. No fix rounds.
- Apply: 22/22 pages, 1,387 tokens vs live 1.0.190, 2,706 already-pointed kept, 22 partial pages preserved. No `yer`/`bavli`/`bsay` writes.
- `npm test`: 704/704 in 276.92s on the Linux box after recomputing DATA_VERSION with `node tools/data-version.mjs`.
