# Pnei Moshe batch 34 — Bikkurim (ysay)

Shipped as **1.0.196**, DATA_VERSION `5661f024540d`. Built by the PC driver (local `run-pilot.mjs` + independent Gemini review). The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.195 / `58849026ff7b` (`9ea6b029`) when the version was chosen. Terumot b24 and Rosh_Hashanah b27 remain HOLD and were skipped.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Bikkurim/` on the 1.0.195 tree (DATA_VERSION `58849026ff7b`).
- 13 pages, nested `say` (155 outer, 9 empty inner arrays; 509 inner).
- Raw tokens: 18,048 = 1,567 already pointed + 16,481 bare. Of the bare baseline, 15,124 were counted after quote/abbreviation split (`bareTokens`). `partial` on all 13 pages (values 13–61, sum 509), left byte-identical. `v` left byte-identical on all 13 pages.
- Companion `yer/Bikkurim` (13/13, hashes 26/26) was lookup-only. No `bavli/Bikkurim` or `bsay/Bikkurim`.
- aram4: updated 2, unchanged 2, skipped 424. `tests/fixtures/aram4-identity.json` refreshed for `gemara/ysay/Bikkurim/7.json` `say[1][0]` and `say[1][1]`. Fixture `base` SHA `2ec6d09a` and the 428-row population were left unchanged.
- ENGINE-COV-1B: no pin on this tractate.

## Gates

- Independent first validation: 873 changed / 16,481 bare (404 forms), samples 650, controls 968. First review (`gemini-4-hydrogen-high`): **HOLD 9.2**, harmful_error_count=1. Exact-only form inserted in fix round 1 of 2: `ארוסות`.
- After fix 1: 872 changed / 16,481 bare (403 forms), samples 650, controls 969. Yield 5.77%. dseg: modern 0, rabbinic 509, miss 0.
- Independent fix review (`gemini-4-hydrogen-high`): **SHIP 9.8**, harmful_error_count=0. S1–S5 = 10.0/10.0/10.0/10.0/9.8. 650 tokens audited; 403 unique forms scanned.
- Apply: 13/13 pages, 872 tokens vs live 1.0.195, 1,567 already-pointed kept, 13 partial pages preserved. No `yer`/`bavli`/`bsay` writes.
- `npm test`: 708/708 in 290.14s on the Linux box after recomputing DATA_VERSION with `node tools/data-version.mjs`.
