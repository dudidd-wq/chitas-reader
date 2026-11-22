# Pnei Moshe batch 33 — Niddah (ysay)

Shipped as **1.0.195**, DATA_VERSION `58849026ff7b`. Built by the PC driver (local `run-pilot.mjs` + independent Gemini review). The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.194 / `5bf40d850438` (`a533602a`) when the version was chosen. Terumot b24 and Rosh_Hashanah b27 remain HOLD and were skipped.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Niddah/` on the 1.0.194 tree (DATA_VERSION `5bf40d850438`).
- 12 pages, nested `say` (109 outer, 1 empty inner array; 711 inner).
- Raw tokens: 20,066 = 2,288 already pointed + 17,778 bare. Of the bare baseline, 16,517 were counted after quote/abbreviation split (`bareTokens`). `partial` on all 12 pages (values 45–74, sum 703), left byte-identical. `v` left byte-identical on all 12 pages.
- Companion `yer/Niddah` (12/12, hashes 24/24) was lookup-only. `bavli/Niddah` and `bsay/Niddah` exist and were not written.
- aram4: updated 0, unchanged 0, skipped 428. No `aram4-identity.json` change.
- ENGINE-COV-1B: no pin on this tractate.

## Gates

- Independent first validation: 940 changed / 17,778 bare (387 forms). First review (`gemini-4-hydrogen-high`): **HOLD 9.4**, harmful_error_count=2. Exact-only form inserted in fix round 1 of 2: `ושפעת`.
- After fix 1: 938 / 17,778 (386 forms). Fix review 1: **HOLD 8.5**, harmful_error_count=5. Exact-only forms inserted in fix round 2 of 2: `שאבדה`, `עסוקה`.
- After fix 2: 926 changed / 17,778 bare (384 forms), samples 650+681. dseg: modern 0, rabbinic 710, miss 1. Yield 5.61%.
- Independent fix2 review (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0. S1–S5 = 10.0/10.0/9.9/10.0/10.0. 1,331 tokens audited (650+681); 384 unique forms scanned.
- Apply: 12/12 pages, 926 tokens vs live 1.0.194, 2,288 already-pointed kept, 12 partial pages preserved. No `yer`/`bavli`/`bsay` writes.
- `npm test`: 708/708 in 288.42s on the Linux box after recomputing DATA_VERSION with `node tools/data-version.mjs`.
